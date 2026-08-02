import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import { getStoredProjectBySlug } from "../src/lib/server/project-store.ts";
import { listActivityDays } from "../src/lib/server/activity-store.ts";

const repositoryRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

function runScript(script: string, args: string[]) {
  return spawnSync(process.execPath, [join(repositoryRoot, script), ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

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
