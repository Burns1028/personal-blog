import assert from "node:assert/strict";
import test from "node:test";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import {
  getStoredIdeaBySourceKey,
  listPublishedIdeas,
  upsertIdea,
  type IdeaInput,
} from "../src/lib/server/idea-store.ts";

function makeIdea(overrides: Partial<IdeaInput> = {}): IdeaInput {
  return {
    sourceKey: "observation-2026-08-02",
    text: "把判断依据留下来，下一次修复才有入口。",
    theme: "系统",
    capturedAt: "2026-08-02T20:30:00+08:00",
    status: "published",
    featured: false,
    ...overrides,
  };
}

test("idea upserts are idempotent by source key", () => {
  const database = createArticleDatabase(":memory:");

  try {
    const first = upsertIdea(makeIdea(), database);
    const updated = upsertIdea(
      makeIdea({ text: "修订后的真实观察。", featured: true }),
      database,
    );

    assert.equal(first.id, updated.id);
    assert.equal(
      getStoredIdeaBySourceKey("observation-2026-08-02", database)?.text,
      "修订后的真实观察。",
    );
    assert.equal(listPublishedIdeas(database).length, 1);
  } finally {
    database.close();
  }
});

test("published ideas sort featured first then newest and exclude drafts", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertIdea(
      makeIdea({ sourceKey: "older", capturedAt: "2026-07-01", featured: true }),
      database,
    );
    upsertIdea(
      makeIdea({ sourceKey: "newer", capturedAt: "2026-08-01", featured: false }),
      database,
    );
    upsertIdea(
      makeIdea({
        sourceKey: "draft",
        capturedAt: "2026-08-02",
        status: "draft",
      }),
      database,
    );

    assert.deepEqual(
      listPublishedIdeas(database).map((idea) => idea.sourceKey),
      ["older", "newer"],
    );
  } finally {
    database.close();
  }
});

test("idea input validation rejects unstable keys and empty text", () => {
  const database = createArticleDatabase(":memory:");

  try {
    assert.throws(
      () => upsertIdea(makeIdea({ sourceKey: "Not Stable" }), database),
      /sourceKey/,
    );
    assert.throws(
      () => upsertIdea(makeIdea({ text: "   " }), database),
      /text/,
    );
  } finally {
    database.close();
  }
});
