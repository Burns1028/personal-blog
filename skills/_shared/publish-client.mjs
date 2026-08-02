import { createHash, createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

export function canonicalPublishRequest(
  method,
  url,
  timestamp,
  nonce,
  bodySha256,
) {
  return [
    method.toUpperCase(),
    `${url.pathname}${url.search}`,
    timestamp,
    nonce,
    bodySha256,
  ].join("\n");
}

export function loadPublishConfiguration(env = process.env) {
  const configuredUrl = env.BURNS_PUBLISH_URL?.trim();
  if (!configuredUrl) throw new Error("Missing BURNS_PUBLISH_URL");
  const keyId = env.BURNS_PUBLISH_KEY_ID?.trim();
  if (!keyId) throw new Error("Missing BURNS_PUBLISH_KEY_ID");

  const url = new URL(configuredUrl);
  const allowLocalHttp =
    url.protocol === "http:" &&
    url.hostname === "127.0.0.1" &&
    env.BURNS_PUBLISH_ALLOW_HTTP === "127.0.0.1";
  if (url.protocol !== "https:" && !allowLocalHttp) {
    throw new Error("BURNS_PUBLISH_URL must use HTTPS");
  }

  let secret = env.BURNS_PUBLISH_SECRET?.trim();
  if (
    !secret &&
    !env.BURNS_PUBLISH_DISABLE_KEYCHAIN &&
    process.platform === "darwin"
  ) {
    try {
      secret = execFileSync(
        "/usr/bin/security",
        [
          "find-generic-password",
          "-a",
          "Burns",
          "-s",
          "burns-blog-publisher",
          "-w",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
    } catch {
      secret = undefined;
    }
  }
  if (!secret) throw new Error("No publishing secret found");
  if (!/^[a-f0-9]{64,}$/i.test(secret) || secret.length % 2 !== 0) {
    throw new Error("Publishing secret must be a hexadecimal value of at least 32 bytes");
  }
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) {
    throw new Error("BURNS_PUBLISH_KEY_ID is invalid");
  }

  url.pathname = url.pathname.replace(/\/$/, "");
  return { url, keyId, secret: secret.toLowerCase() };
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, headers?: HeadersInit, env?: NodeJS.ProcessEnv }} [options]
 */
export async function signedPublishRequest(
  path,
  { method = "GET", body, headers = {}, env = process.env } = {},
) {
  const configuration = loadPublishConfiguration(env);
  const requestUrl = new URL(path, `${configuration.url.href}/`);
  if (requestUrl.origin !== configuration.url.origin) {
    throw new Error("Publishing path must stay on the configured origin");
  }

  const serializedBody = body === undefined ? "" : JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const nonce = randomBytes(16).toString("hex");
  const bodySha256 = createHash("sha256").update(serializedBody).digest("hex");
  const signature = createHmac(
    "sha256",
    Buffer.from(configuration.secret, "hex"),
  )
    .update(
      canonicalPublishRequest(
        method,
        requestUrl,
        timestamp,
        nonce,
        bodySha256,
      ),
    )
    .digest("hex");

  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set("content-type", "application/json");
  requestHeaders.set("accept", "application/json");
  requestHeaders.set("x-burns-key-id", configuration.keyId);
  requestHeaders.set("x-burns-timestamp", timestamp);
  requestHeaders.set("x-burns-nonce", nonce);
  requestHeaders.set("x-burns-content-sha256", bodySha256);
  requestHeaders.set("x-burns-signature", signature);

  const response = await fetch(requestUrl, {
    method,
    body: body === undefined ? undefined : serializedBody,
    headers: requestHeaders,
    redirect: "error",
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Publishing server returned invalid JSON (${response.status})`);
  }
  if (!response.ok) {
    const message = payload?.error?.message ?? `Publishing request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}
