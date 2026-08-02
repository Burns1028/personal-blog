import assert from "node:assert/strict";
import test from "node:test";
import {
  createArticleDatabase,
  getStoredArticleBySlug,
  upsertArticle,
} from "../src/lib/server/content-store.ts";
import { renderArticleMarkdown } from "../src/lib/server/markdown.ts";

test("long published articles expose real section headings", async () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertArticle(
      {
        sourceDocumentId: "heading-fixture",
        slug: "heading-fixture",
        title: "结构测试",
        summary: "测试文章结构，不依赖本地内容数据。",
        deck: null,
        bodyMarkdown: [
          "这是一段没有标题的文章引子，用来建立正文的阅读节奏。",
          "",
          "## 第一节",
          "",
          "第一节正文。".repeat(300),
          "",
          "## 第二节",
          "",
          "第二节正文。",
        ].join("\n"),
        tags: ["测试"],
        featured: false,
        status: "published",
        number: "WR—TEST—001",
        readingMinutes: 3,
        publishedAt: "2026-08-02",
        updatedAt: null,
        sourcePath: null,
        sourceSha256: "heading-fixture-source",
        contentSha256: "heading-fixture-content",
      },
      [],
      database,
    );

    const article = getStoredArticleBySlug("heading-fixture", { database });
    assert.ok(article);

    const firstBlock = article.bodyMarkdown.trimStart().split(/\n\s*\n/, 1)[0];
    assert.doesNotMatch(firstBlock, /^#{1,6}\s+/);

    const rendered = await renderArticleMarkdown(article.bodyMarkdown);
    const tocHeadings = rendered.headings.filter(
      ({ depth, slug }) =>
        depth >= 2 && depth <= 3 && slug !== "footnote-label",
    );

    assert.deepEqual(
      tocHeadings.map(({ depth, text }) => ({ depth, text })),
      [
        { depth: 2, text: "第一节" },
        { depth: 2, text: "第二节" },
      ],
    );
  } finally {
    database.close();
  }
});
