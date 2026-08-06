import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PUT } from "../src/pages/api/publish/projects/index.ts";
import { POST as VALIDATE } from "../src/pages/api/publish/projects/validate.ts";
import { GET as LIST_PUBLIC } from "../src/pages/api/projects/index.ts";
import { canonicalPublishRequest } from "../src/lib/server/publish-auth.ts";
import {
  closeArticleDatabase,
  createArticleDatabase,
} from "../src/lib/server/content-store.ts";

const secret = "77".repeat(32);
let nonce = 0;

function signedRequest(method: string, path: string, body: unknown): Request {
  const url = new URL(path, "https://burnsgao.me");
  const serialized = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const requestNonce = `project-only-nonce-${++nonce}`;
  const bodyHash = createHash("sha256").update(serialized).digest("hex");
  const signature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(
      canonicalPublishRequest(method, url, timestamp, requestNonce, bodyHash),
    )
    .digest("hex");
  return new Request(url, {
    method,
    body: serialized,
    headers: {
      "content-type": "application/json",
      "x-burns-key-id": "primary",
      "x-burns-timestamp": timestamp,
      "x-burns-nonce": requestNonce,
      "x-burns-content-sha256": bodyHash,
      "x-burns-signature": signature,
    },
  });
}

const payload = {
  slug: "personal-blog",
  githubFullName: "Burns1028/personal-blog",
  title: "personal-blog",
  summary: "Burns 的个人网站与长期内容档案。",
  repoUrl: "https://github.com/Burns1028/personal-blog",
  demoUrl: "https://burnsgao.me",
  language: "TypeScript",
  status: "active",
  featured: true,
  publishedAt: "2026-08-02T00:00:00Z",
  updatedAt: "2026-08-06T08:00:00Z",
};

test("project-only validation is read-only and publication never creates activity", async () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-project-only-api-"));
  process.env.BLOG_DB_PATH = join(directory, "blog.sqlite");
  process.env.BURNS_PUBLISH_KEYS = `primary:${secret}`;

  try {
    const validated = await VALIDATE({
      request: signedRequest("POST", "/api/publish/projects/validate", payload),
    } as never);
    assert.equal(validated.status, 200);
    assert.deepEqual((await validated.json()).data, {
      validated: true,
      projectSlug: "personal-blog",
    });

    const before = createArticleDatabase(process.env.BLOG_DB_PATH);
    assert.equal(
      (
        before
          .prepare(
            "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('projects', 'activities')",
          )
          .get() as { count: number }
      ).count,
      0,
    );
    before.close();

    for (let index = 0; index < 2; index += 1) {
      const response = await PUT({
        request: signedRequest("PUT", "/api/publish/projects", payload),
      } as never);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).data.project.slug, "personal-blog");
    }

    const after = createArticleDatabase(process.env.BLOG_DB_PATH);
    assert.equal(
      (after.prepare("SELECT count(*) AS count FROM projects").get() as { count: number })
        .count,
      1,
    );
    assert.equal(
      (
        after
          .prepare(
            "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'activities'",
          )
          .get() as { count: number }
      ).count,
      0,
    );
    after.close();

    const listing = LIST_PUBLIC();
    assert.equal(listing.status, 200);
    const listed = await listing.json();
    assert.equal(listed.meta.storage, "sqlite");
    assert.equal(listed.meta.count, 1);
    assert.equal(listed.data[0].repoUrl, payload.repoUrl);
  } finally {
    closeArticleDatabase();
    delete process.env.BLOG_DB_PATH;
    delete process.env.BURNS_PUBLISH_KEYS;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("project-only publication requires a valid signature and JSON", async () => {
  const unauthorized = await PUT({
    request: new Request("https://burnsgao.me/api/publish/projects", {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
    }),
  } as never);
  assert.equal(unauthorized.status, 401);
});
