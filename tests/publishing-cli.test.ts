import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  createArticleDatabase,
  getStoredArticleBySlug,
  listArticleAssets,
} from "../src/lib/server/content-store.ts";
import { getStoredIdeaBySourceKey } from "../src/lib/server/idea-store.ts";
import { getStoredProjectBySlug } from "../src/lib/server/project-store.ts";
import { listActivityDays } from "../src/lib/server/activity-store.ts";

const repositoryRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function runScript(script: string, args: string[]) {
  return spawnSync(process.execPath, [join(repositoryRoot, script), ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

test("article upload imports Markdown and a local image into SQLite", () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-article-cli-"));
  const databasePath = join(directory, "blog.sqlite");
  const mediaDirectory = join(directory, "media");
  const imagePath = join(directory, "moon.png");
  const markdownPath = join(directory, "article.md");

  try {
    writeFileSync(
      imagePath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    writeFileSync(
      markdownPath,
      `---\ntitle: 测试文章\nsummary: 一篇用于验证发布链的文章。\npublishedAt: 2026-08-02\n---\n\n这是正文。\n\n![完整月相](./moon.png)\n`,
    );

    const result = runScript("scripts/import-article.ts", [
      "--file",
      markdownPath,
      "--slug",
      "verified-article",
      "--status",
      "published",
      "--number",
      "WR—TEST—001",
      "--database",
      databasePath,
      "--media-dir",
      mediaDirectory,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const database = createArticleDatabase(databasePath);
    const article = getStoredArticleBySlug("verified-article", { database });
    assert.ok(article);
    assert.equal(article.publishedAt, "2026-08-02");
    const assets = listArticleAssets(article.id, database);
    assert.equal(assets.length, 1);
    assert.equal(assets[0]?.mediaType, "image/webp");
    assert.match(article.bodyMarkdown, /\/media\/articles\/verified-article\//);
    assert.equal(existsSync(join(mediaDirectory, "verified-article")), true);
    database.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("idea upload is idempotent by source key", () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-idea-cli-"));
  const databasePath = join(directory, "blog.sqlite");

  try {
    const baseArgs = [
      "--source-key",
      "verified-observation",
      "--theme",
      "系统",
      "--captured-at",
      "2026-08-02T20:30:00+08:00",
      "--status",
      "published",
      "--database",
      databasePath,
    ];
    const first = runScript("scripts/import-idea.ts", [
      ...baseArgs,
      "--text",
      "第一版观察。",
    ]);
    const second = runScript("scripts/import-idea.ts", [
      ...baseArgs,
      "--text",
      "修订后的观察。",
      "--featured",
    ]);

    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const database = createArticleDatabase(databasePath);
    const idea = getStoredIdeaBySourceKey("verified-observation", database);
    assert.equal(idea?.text, "修订后的观察。");
    assert.equal(idea?.featured, true);
    assert.equal(
      database.prepare("SELECT COUNT(*) AS count FROM ideas").get()?.count,
      1,
    );
    database.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("GitHub progress upload writes one project and one idempotent activity", () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-github-cli-"));
  const databasePath = join(directory, "blog.sqlite");
  const args = [
    "--repo",
    "Burns1028/personal-blog",
    "--slug",
    "burns-blog",
    "--project-title",
    "Burns Blog",
    "--project-summary",
    "个人写作、项目与灵感的长期档案。",
    "--language",
    "TypeScript",
    "--project-status",
    "active",
    "--source-key",
    "personal-blog:2026-08-02:sqlite-content",
    "--occurred-at",
    "2026-08-02T21:00:00+08:00",
    "--kind",
    "progress",
    "--activity-title",
    "统一内容后端",
    "--activity-summary",
    "文章、灵感和项目进度统一写入 SQLite。",
    "--database",
    databasePath,
  ];

  try {
    const first = runScript("scripts/import-github-progress.ts", args);
    const second = runScript("scripts/import-github-progress.ts", [
      ...args,
      "--activity-summary",
      "文章、灵感和项目进度已统一写入 SQLite。",
    ]);

    assert.equal(first.status, 0, first.stderr || first.stdout);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const database = createArticleDatabase(databasePath);
    assert.equal(getStoredProjectBySlug("burns-blog", database)?.language, "TypeScript");
    const days = listActivityDays(6, database);
    assert.equal(days.length, 1);
    assert.equal(days[0]?.count, 1);
    assert.equal(
      days[0]?.items[0]?.summary,
      "文章、灵感和项目进度已统一写入 SQLite。",
    );
    database.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("GitHub progress upload fails instead of inventing missing project facts", () => {
  const result = runScript("scripts/import-github-progress.ts", [
    "--repo",
    "Burns1028/personal-blog",
    "--source-key",
    "missing-fields",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project-title|Missing required/i);
});
