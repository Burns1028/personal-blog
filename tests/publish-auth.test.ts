import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import test from "node:test";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import {
  canonicalPublishRequest,
  verifyPublishRequest,
} from "../src/lib/server/publish-auth.ts";

const secret = "11".repeat(32);
const now = new Date("2026-08-02T16:00:00.000Z");

function signedRequest(
  body: string,
  options: {
    nonce?: string;
    timestamp?: string;
    keyId?: string;
    url?: string;
  } = {},
): Request {
  const url = options.url ?? "https://burnsgao.me/api/publish/ideas/observation";
  const timestamp = options.timestamp ?? now.toISOString();
  const nonce = options.nonce ?? "nonce-0001";
  const keyId = options.keyId ?? "primary";
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = canonicalPublishRequest(
    "PUT",
    new URL(url),
    timestamp,
    nonce,
    bodyHash,
  );
  const signature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(canonical)
    .digest("hex");

  return new Request(url, {
    method: "PUT",
    body,
    headers: {
      "content-type": "application/json",
      "x-burns-key-id": keyId,
      "x-burns-timestamp": timestamp,
      "x-burns-nonce": nonce,
      "x-burns-content-sha256": bodyHash,
      "x-burns-signature": signature,
    },
  });
}

test("accepts one valid request and rejects a replay", async () => {
  const database = createArticleDatabase(":memory:");
  try {
    const body = JSON.stringify({ text: "真实观察。" });
    const first = await verifyPublishRequest(
      signedRequest(body),
      database,
      { primary: secret },
      now,
    );
    assert.equal(first.keyId, "primary");
    await assert.rejects(
      verifyPublishRequest(
        signedRequest(body),
        database,
        { primary: secret },
        now,
      ),
      /nonce/i,
    );
  } finally {
    database.close();
  }
});

test("rejects expired timestamps, body changes and unknown keys", async () => {
  const database = createArticleDatabase(":memory:");
  try {
    await assert.rejects(
      verifyPublishRequest(
        signedRequest("{}", {
          nonce: "nonce-expired",
          timestamp: "2026-08-02T15:00:00.000Z",
        }),
        database,
        { primary: secret },
        now,
      ),
      /timestamp/i,
    );

    const original = signedRequest(JSON.stringify({ text: "原文" }), {
      nonce: "nonce-changed",
    });
    const changed = new Request(original.url, {
      method: original.method,
      body: JSON.stringify({ text: "篡改" }),
      headers: original.headers,
    });
    await assert.rejects(
      verifyPublishRequest(changed, database, { primary: secret }, now),
      /hash|signature/i,
    );

    await assert.rejects(
      verifyPublishRequest(
        signedRequest("{}", { nonce: "nonce-unknown", keyId: "unknown" }),
        database,
        { primary: secret },
        now,
      ),
      /key/i,
    );
  } finally {
    database.close();
  }
});
