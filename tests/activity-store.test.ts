import assert from "node:assert/strict";
import test from "node:test";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import {
  listActivityDays,
  upsertActivity,
} from "../src/lib/server/activity-store.ts";

test("activities aggregate by Shanghai calendar day newest first", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertActivity(
      {
        source: "manual",
        sourceKey: "a",
        occurredAt: "2026-08-02T09:00:00+08:00",
        projectSlug: "project-alpha",
        kind: "progress",
        title: "延迟回退",
        summary: "补齐降级路径",
        url: null,
      },
      database,
    );
    upsertActivity(
      {
        source: "manual",
        sourceKey: "b",
        occurredAt: "2026-08-02T18:00:00+08:00",
        projectSlug: "project-beta",
        kind: "fix",
        title: "失败分类",
        summary: "归并错误类别",
        url: null,
      },
      database,
    );
    upsertActivity(
      {
        source: "manual",
        sourceKey: "c",
        occurredAt: "2026-08-01T23:40:00+08:00",
        projectSlug: null,
        kind: "research",
        title: "资料整理",
        summary: "补充观察样本",
        url: null,
      },
      database,
    );

    const days = listActivityDays(6, database);
    assert.equal(days[0]?.date, "2026-08-02");
    assert.equal(days[0]?.count, 2);
    assert.equal(days[0]?.items.length, 2);
    assert.equal(days[1]?.date, "2026-08-01");
  } finally {
    database.close();
  }
});

test("source and source key make manual updates idempotent", () => {
  const database = createArticleDatabase(":memory:");

  try {
    const base = {
      source: "manual" as const,
      sourceKey: "same",
      occurredAt: "2026-08-02T09:00:00+08:00",
      projectSlug: null,
      kind: "progress" as const,
      title: "第一版",
      summary: "摘要",
      url: null,
    };

    upsertActivity(base, database);
    upsertActivity({ ...base, title: "修订版" }, database);

    const days = listActivityDays(6, database);
    assert.equal(days[0]?.count, 1);
    assert.equal(days[0]?.items[0]?.title, "修订版");
  } finally {
    database.close();
  }
});

test("an empty activity store returns an empty list", () => {
  const database = createArticleDatabase(":memory:");

  try {
    assert.deepEqual(listActivityDays(6, database), []);
  } finally {
    database.close();
  }
});
