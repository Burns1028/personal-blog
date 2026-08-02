import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import {
  canonicalPublishRequest,
  loadPublishConfiguration,
  signedPublishRequest,
} from "../skills/_shared/publish-client.mjs";

test("remote client fails closed when production configuration is missing", () => {
  assert.throws(() => loadPublishConfiguration({}), /Missing BURNS_PUBLISH_URL/);
  assert.throws(
    () => loadPublishConfiguration({ BURNS_PUBLISH_URL: "https://burnsgao.me" }),
    /Missing BURNS_PUBLISH_KEY_ID/,
  );
  assert.throws(
    () =>
      loadPublishConfiguration({
        BURNS_PUBLISH_URL: "https://burnsgao.me",
        BURNS_PUBLISH_KEY_ID: "primary",
        BURNS_PUBLISH_DISABLE_KEYCHAIN: "1",
      }),
    /No publishing secret found/,
  );
});

test("remote client signs the exact method, path and body", async () => {
  const secret = "55".repeat(32);
  let captured:
    | { method: string; path: string; body: string; headers: Record<string, string | string[] | undefined> }
    | undefined;
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      captured = {
        method: request.method ?? "",
        path: request.url ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
      };
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ data: { ok: true } }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const result = await signedPublishRequest("/api/publish/test?mode=verify", {
      method: "PUT",
      body: { text: "真实观察。" },
      env: {
        BURNS_PUBLISH_URL: `http://127.0.0.1:${address.port}`,
        BURNS_PUBLISH_KEY_ID: "primary",
        BURNS_PUBLISH_SECRET: secret,
        BURNS_PUBLISH_ALLOW_HTTP: "127.0.0.1",
      },
    });
    assert.deepEqual(result.data, { ok: true });
    assert.ok(captured);
    assert.equal(captured.method, "PUT");
    assert.equal(captured.path, "/api/publish/test?mode=verify");

    const timestamp = String(captured.headers["x-burns-timestamp"]);
    const nonce = String(captured.headers["x-burns-nonce"]);
    const bodyHash = createHash("sha256").update(captured.body).digest("hex");
    assert.equal(captured.headers["x-burns-content-sha256"], bodyHash);
    const expected = createHmac("sha256", Buffer.from(secret, "hex"))
      .update(
        canonicalPublishRequest(
          "PUT",
          new URL(`http://127.0.0.1:${address.port}${captured.path}`),
          timestamp,
          nonce,
          bodyHash,
        ),
      )
      .digest("hex");
    assert.equal(captured.headers["x-burns-signature"], expected);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
