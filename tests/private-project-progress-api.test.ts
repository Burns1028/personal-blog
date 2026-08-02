import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PUT } from "../src/pages/api/publish/projects/progress.ts";
import { POST as VALIDATE } from "../src/pages/api/publish/projects/progress/validate.ts";
import { canonicalPublishRequest } from "../src/lib/server/publish-auth.ts";
import { closeArticleDatabase, createArticleDatabase } from "../src/lib/server/content-store.ts";

const secret = "66".repeat(32);
let nonce = 0;

function signedRequest(method: string, path: string, body: unknown): Request {
  const url = new URL(path, "https://burnsgao.me");
  const serialized = JSON.stringify(body);
  const timestamp = new Date().toISOString();
  const requestNonce = `project-nonce-${++nonce}`;
  const bodyHash = createHash("sha256").update(serialized).digest("hex");
  const signature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(canonicalPublishRequest(method, url, timestamp, requestNonce, bodyHash))
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
  project: {
    slug: "personal-blog",
    githubFullName: "Burns1028/personal-blog",
    title: "Burns Blog",
    summary: "个人写作、项目与灵感的长期档案。",
    repoUrl: "https://github.com/Burns1028/personal-blog",
    demoUrl: "https://burnsgao.me",
    language: "TypeScript",
    status: "active",
    featured: true,
    publishedAt: "2026-08-02",
    updatedAt: "2026-08-02T21:00:00+08:00",
  },
  activity: {
    source: "github",
    sourceKey: "personal-blog:2026-08-02:deploy",
    occurredAt: "2026-08-02T21:00:00+08:00",
    projectSlug: "personal-blog",
    kind: "progress",
    title: "部署生产发布链",
    summary: "代码与内容数据已分离。",
    url: "https://github.com/Burns1028/personal-blog",
  },
};

test("project progress validation is read-only and publish is idempotent", async () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-project-api-"));
  process.env.BLOG_DB_PATH = join(directory, "blog.sqlite");
  process.env.BURNS_PUBLISH_KEYS = `primary:${secret}`;
  try {
    const validated = await VALIDATE({
      request: signedRequest("POST", "/api/publish/projects/progress/validate", payload),
    } as never);
    assert.equal(validated.status, 200);
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
        request: signedRequest("PUT", "/api/publish/projects/progress", payload),
      } as never);
      assert.equal(response.status, 200);
      const data = (await response.json()).data;
      assert.equal(data.project.slug, "personal-blog");
      assert.equal(data.activity.sourceKey, "personal-blog:2026-08-02:deploy");
    }
    const after = createArticleDatabase(process.env.BLOG_DB_PATH);
    assert.equal((after.prepare("SELECT count(*) AS count FROM projects").get() as { count: number }).count, 1);
    assert.equal((after.prepare("SELECT count(*) AS count FROM activities").get() as { count: number }).count, 1);
    after.close();
  } finally {
    closeArticleDatabase();
    delete process.env.BLOG_DB_PATH;
    delete process.env.BURNS_PUBLISH_KEYS;
    rmSync(directory, { recursive: true, force: true });
  }
});
