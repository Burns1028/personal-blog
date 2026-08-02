import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createArticleDatabase,
  getStoredArticleBySlug,
  listArticleAssets,
  listPublishedArticles,
  upsertArticle,
  type ArticleInput,
} from "../src/lib/server/content-store.ts";

function makeArticle(overrides: Partial<ArticleInput> = {}): ArticleInput {
  return {
    sourceDocumentId: "source-1",
    slug: "first-article",
    title: "第一篇",
    summary: "摘要",
    deck: "导语",
    bodyMarkdown: "正文",
    tags: ["AI", "设计", "AI"],
    featured: false,
    status: "published",
    number: "WR—DB—001",
    readingMinutes: 4,
    publishedAt: "2026-07-31",
    updatedAt: null,
    sourcePath: "/tmp/article.md",
    sourceSha256: "source-hash",
    contentSha256: "content-hash",
    ...overrides,
  };
}

test("schema is idempotent and data survives reopening the SQLite file", () => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), "burns-content-store-"),
  );
  const databasePath = join(temporaryDirectory, "articles.sqlite");

  try {
    const firstConnection = createArticleDatabase(databasePath);
    upsertArticle(makeArticle(), [], firstConnection);
    firstConnection.close();

    const secondConnection = createArticleDatabase(databasePath);
    const article = getStoredArticleBySlug("first-article", {
      database: secondConnection,
    });

    assert.equal(article?.title, "第一篇");
    assert.deepEqual(article?.tags, ["AI", "设计"]);
    secondConnection.close();
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("published listing filters drafts and sorts newest first", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertArticle(
      makeArticle({
        slug: "older",
        sourceDocumentId: "older",
        number: "WR—DB—010",
        publishedAt: "2026-07-01",
      }),
      [],
      database,
    );
    upsertArticle(
      makeArticle({
        slug: "newer",
        sourceDocumentId: "newer",
        number: "WR—DB—011",
        publishedAt: "2026-07-31",
      }),
      [],
      database,
    );
    upsertArticle(
      makeArticle({
        slug: "draft",
        sourceDocumentId: "draft",
        number: "WR—DB—012",
        status: "draft",
        publishedAt: null,
      }),
      [],
      database,
    );

    assert.deepEqual(
      listPublishedArticles(database).map((article) => article.slug),
      ["newer", "older"],
    );
  } finally {
    database.close();
  }
});

test("re-importing is idempotent and increments revision only on content change", () => {
  const database = createArticleDatabase(":memory:");

  try {
    const first = upsertArticle(makeArticle(), [], database);
    const unchanged = upsertArticle(makeArticle(), [], database);
    const changed = upsertArticle(
      makeArticle({
        bodyMarkdown: "修改后的正文",
        contentSha256: "changed-content-hash",
      }),
      [],
      database,
    );

    assert.equal(first.revision, 1);
    assert.equal(unchanged.revision, 1);
    assert.equal(changed.revision, 2);
  } finally {
    database.close();
  }
});

test("article and asset writes share one transaction", () => {
  const database = createArticleDatabase(":memory:");

  try {
    const article = upsertArticle(
      makeArticle(),
      [
        {
          storageKey: "media/articles/first/image.webp",
          publicUrl: "/media/articles/first/image.webp",
          sourcePath: "/tmp/image.png",
          mediaType: "image/webp",
          width: 1200,
          height: 800,
          byteSize: 100,
          sha256: "asset-hash",
          altText: "示例图",
          caption: null,
          sortOrder: 0,
        },
      ],
      database,
    );

    assert.equal(listArticleAssets(article.id, database).length, 1);

    assert.throws(() =>
      upsertArticle(
        makeArticle({
          sourceDocumentId: "source-2",
          slug: "second-article",
        }),
        [],
        database,
      ),
    );

    assert.equal(listArticleAssets(article.id, database).length, 1);
  } finally {
    database.close();
  }
});

test("slug lookup uses parameter binding", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertArticle(makeArticle(), [], database);

    assert.equal(
      getStoredArticleBySlug("' OR 1 = 1 --", { database }),
      undefined,
    );
  } finally {
    database.close();
  }
});
