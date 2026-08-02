import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface PublishPrincipal {
  keyId: string;
}

const MAX_CLOCK_SKEW_MS = 300_000;
const NONCE_RETENTION_MS = 600_000;
const hexPattern = /^[a-f0-9]+$/;

export function canonicalPublishRequest(
  method: string,
  url: URL,
  timestamp: string,
  nonce: string,
  bodySha256: string,
): string {
  return [
    method.toUpperCase(),
    `${url.pathname}${url.search}`,
    timestamp,
    nonce,
    bodySha256,
  ].join("\n");
}

function loadKeyring(): Record<string, string> {
  const configured = process.env.BURNS_PUBLISH_KEYS?.trim();
  if (!configured) return {};

  return Object.fromEntries(
    configured.split(",").map((entry) => {
      const separator = entry.indexOf(":");
      if (separator < 1) {
        throw new Error("BURNS_PUBLISH_KEYS contains an invalid entry.");
      }
      return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
    }),
  );
}

function requiredHeader(request: Request, name: string): string {
  const value = request.headers.get(name)?.trim();
  if (!value) throw new Error(`Missing publishing header: ${name}`);
  return value;
}

function safeHexEqual(actual: string, expected: string): boolean {
  if (
    actual.length !== expected.length ||
    actual.length % 2 !== 0 ||
    !hexPattern.test(actual) ||
    !hexPattern.test(expected)
  ) {
    return false;
  }

  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export async function verifyPublishRequest(
  request: Request,
  database: DatabaseSync,
  keyring: Record<string, string> = loadKeyring(),
  now: Date = new Date(),
): Promise<PublishPrincipal> {
  const keyId = requiredHeader(request, "x-burns-key-id");
  const timestamp = requiredHeader(request, "x-burns-timestamp");
  const nonce = requiredHeader(request, "x-burns-nonce");
  const bodySha256 = requiredHeader(request, "x-burns-content-sha256").toLowerCase();
  const signature = requiredHeader(request, "x-burns-signature").toLowerCase();

  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) {
    throw new Error("Publishing key id is invalid.");
  }
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(nonce)) {
    throw new Error("Publishing nonce is invalid.");
  }
  if (bodySha256.length !== 64 || !hexPattern.test(bodySha256)) {
    throw new Error("Publishing body hash is invalid.");
  }
  if (signature.length !== 64 || !hexPattern.test(signature)) {
    throw new Error("Publishing signature is invalid.");
  }

  const requestTime = new Date(timestamp);
  if (
    Number.isNaN(requestTime.valueOf()) ||
    Math.abs(now.valueOf() - requestTime.valueOf()) > MAX_CLOCK_SKEW_MS
  ) {
    throw new Error("Publishing timestamp is expired or invalid.");
  }

  const secretHex = keyring[keyId]?.toLowerCase();
  if (!secretHex || secretHex.length < 64 || secretHex.length % 2 !== 0 || !hexPattern.test(secretHex)) {
    throw new Error("Publishing key is unknown or invalid.");
  }

  const body = Buffer.from(await request.clone().arrayBuffer());
  const calculatedBodyHash = createHash("sha256").update(body).digest("hex");
  if (!safeHexEqual(bodySha256, calculatedBodyHash)) {
    throw new Error("Publishing body hash does not match the request.");
  }

  const canonical = canonicalPublishRequest(
    request.method,
    new URL(request.url),
    timestamp,
    nonce,
    bodySha256,
  );
  const calculatedSignature = createHmac(
    "sha256",
    Buffer.from(secretHex, "hex"),
  )
    .update(canonical)
    .digest("hex");

  if (!safeHexEqual(signature, calculatedSignature)) {
    throw new Error("Publishing signature is invalid.");
  }

  database.exec("BEGIN IMMEDIATE;");
  try {
    database
      .prepare("DELETE FROM publish_nonces WHERE used_at < ?")
      .run(new Date(now.valueOf() - NONCE_RETENTION_MS).toISOString());
    database
      .prepare(
        "INSERT INTO publish_nonces (key_id, nonce, used_at) VALUES (?, ?, ?)",
      )
      .run(keyId, nonce, now.toISOString());
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    const message = error instanceof Error ? error.message : String(error);
    if (/unique|constraint|primary/i.test(message)) {
      throw new Error("Publishing nonce has already been used.");
    }
    throw error;
  }

  return { keyId };
}
