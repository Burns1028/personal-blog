import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PUT } from "../src/pages/api/publish/articles/[slug].ts";
import { POST as VALIDATE } from "../src/pages/api/publish/articles/[slug]/validate.ts";
import {
  canonicalPublishRequest,
} from "../src/lib/server/publish-auth.ts";
import {
  closeArticleDatabase,
  createArticleDatabase,
} from "../src/lib/server/content-store.ts";

const secret = "33".repeat(32);
let nonce = 0;

function request(method: string, path: string, body: unknown, signed = true): Request {
  const url = new URL(path, "https://burnsgao.me");
  const serialized = JSON.stringify(body);
  const headers = new Headers({ "content-type": "application/json" });
  if (signed) {
    const timestamp = new Date().toISOString();
    const requestNonce = `article-nonce-${++nonce}`;
    const bodyHash = createHash("sha256").update(serialized).digest("hex");
    const canonical = canonicalPublishRequest(
      method,
      url,
      timestamp,
      requestNonce,
      bodyHash,
    );
    headers.set("x-burns-key-id", "primary");
    headers.set("x-burns-timestamp", timestamp);
    headers.set("x-burns-nonce", requestNonce);
    headers.set("x-burns-content-sha256", bodyHash);
    headers.set(
      "x-burns-signature",
      createHmac("sha256", Buffer.from(secret, "hex"))
        .update(canonical)
        .digest("hex"),
    );
  }
  return new Request(url, { method, body: serialized, headers });
}

const payload = {
  slug: "verified-article",
  status: "published",
  sourceName: "article.md",
  markdown:
    "---\ntitle: 验证文章\nsummary: 生产发布验证。\npublishedAt: 2026-08-02\nnumber: WR—API\n---\n\n正文。",
  assets: [],
};

test("article publishing requires authentication and validation is read-only", async () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-private-article-"));
  process.env.BLOG_DB_PATH = join(directory, "blog.sqlite");
  process.env.BLOG_MEDIA_PATH = join(directory, "media");
  process.env.BURNS_PUBLISH_KEYS = `primary:${secret}`;

  try {
    const unsigned = await PUT({
      request: request("PUT", "/api/publish/articles/verified-article", payload, false),
      params: { slug: "verified-article" },
    } as never);
    assert.equal(unsigned.status, 401);
    assert.deepEqual(await unsigned.json(), {
      error: { code: "PUBLISH_AUTH_REQUIRED", message: "发布凭据无效。" },
    });

    const validated = await VALIDATE({
      request: request(
        "POST",
        "/api/publish/articles/verified-article/validate",
        payload,
      ),
      params: { slug: "verified-article" },
    } as never);
    assert.equal(validated.status, 200);
    assert.equal((await validated.json()).data.validated, true);

    const databaseBefore = createArticleDatabase(process.env.BLOG_DB_PATH);
    assert.equal(
      (databaseBefore.prepare("SELECT count(*) AS count FROM articles").get() as { count: number }).count,
      0,
    );
    databaseBefore.close();

    const published = await PUT({
      request: request("PUT", "/api/publish/articles/verified-article", payload),
      params: { slug: "verified-article" },
    } as never);
    assert.equal(published.status, 200);
    const result = (await published.json()).data;
    assert.equal(result.slug, "verified-article");
    assert.equal(result.status, "published");
    assert.equal(result.revision, 1);
    assert.equal(result.url, "/writing/verified-article");
    assert.deepEqual(result.assets, []);
  } finally {
    closeArticleDatabase();
    delete process.env.BLOG_DB_PATH;
    delete process.env.BLOG_MEDIA_PATH;
    delete process.env.BURNS_PUBLISH_KEYS;
    rmSync(directory, { recursive: true, force: true });
  }
});
