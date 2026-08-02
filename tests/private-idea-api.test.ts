import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { GET as LIST } from "../src/pages/api/publish/ideas/index.ts";
import {
  DELETE,
  GET,
  PUT,
} from "../src/pages/api/publish/ideas/[sourceKey].ts";
import { POST as VALIDATE } from "../src/pages/api/publish/ideas/[sourceKey]/validate.ts";
import { canonicalPublishRequest } from "../src/lib/server/publish-auth.ts";
import { closeArticleDatabase } from "../src/lib/server/content-store.ts";

const secret = "44".repeat(32);
let nonce = 0;

function request(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
  signed = true,
): Request {
  const url = new URL(path, "https://burnsgao.me");
  const serialized = body === undefined ? "" : JSON.stringify(body);
  const headers = new Headers(extraHeaders);
  if (body !== undefined) headers.set("content-type", "application/json");
  if (signed) {
    const timestamp = new Date().toISOString();
    const requestNonce = `idea-nonce-${++nonce}`;
    const bodyHash = createHash("sha256").update(serialized).digest("hex");
    const signature = createHmac("sha256", Buffer.from(secret, "hex"))
      .update(canonicalPublishRequest(method, url, timestamp, requestNonce, bodyHash))
      .digest("hex");
    headers.set("x-burns-key-id", "primary");
    headers.set("x-burns-timestamp", timestamp);
    headers.set("x-burns-nonce", requestNonce);
    headers.set("x-burns-content-sha256", bodyHash);
    headers.set("x-burns-signature", signature);
  }
  return new Request(url, {
    method,
    body: serialized.length > 0 ? serialized : undefined,
    headers,
  });
}

const payload = {
  sourceKey: "verified-observation",
  text: "真实观察。",
  theme: "系统",
  capturedAt: "2026-08-02T20:30:00+08:00",
  status: "published",
  featured: false,
};

test("idea private API supports signed validation and CRUD", async () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-private-idea-"));
  process.env.BLOG_DB_PATH = join(directory, "blog.sqlite");
  process.env.BURNS_PUBLISH_KEYS = `primary:${secret}`;

  try {
    const unsigned = await PUT({
      request: request(
        "PUT",
        "/api/publish/ideas/verified-observation",
        payload,
        {},
        false,
      ),
      params: { sourceKey: "verified-observation" },
    } as never);
    assert.equal(unsigned.status, 401);

    const validation = await VALIDATE({
      request: request(
        "POST",
        "/api/publish/ideas/verified-observation/validate",
        payload,
      ),
      params: { sourceKey: "verified-observation" },
    } as never);
    assert.equal(validation.status, 200);
    assert.equal((await validation.json()).data.validated, true);

    const upsertResponse = await PUT({
      request: request("PUT", "/api/publish/ideas/verified-observation", payload),
      params: { sourceKey: "verified-observation" },
    } as never);
    assert.equal(upsertResponse.status, 200);
    assert.equal((await upsertResponse.json()).data.sourceKey, "verified-observation");

    const getResponse = await GET({
      request: request("GET", "/api/publish/ideas/verified-observation"),
      params: { sourceKey: "verified-observation" },
    } as never);
    assert.equal((await getResponse.json()).data.text, "真实观察。");

    const listResponse = await LIST({
      request: request("GET", "/api/publish/ideas"),
    } as never);
    assert.equal((await listResponse.json()).meta.count, 1);

    const deleteWithoutConfirmation = await DELETE({
      request: request("DELETE", "/api/publish/ideas/verified-observation"),
      params: { sourceKey: "verified-observation" },
    } as never);
    assert.equal(deleteWithoutConfirmation.status, 400);

    const deleteWithConfirmation = await DELETE({
      request: request(
        "DELETE",
        "/api/publish/ideas/verified-observation",
        undefined,
        { "x-burns-confirm-delete": "verified-observation" },
      ),
      params: { sourceKey: "verified-observation" },
    } as never);
    assert.equal(deleteWithConfirmation.status, 200);
  } finally {
    closeArticleDatabase();
    delete process.env.BLOG_DB_PATH;
    delete process.env.BURNS_PUBLISH_KEYS;
    rmSync(directory, { recursive: true, force: true });
  }
});
