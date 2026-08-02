import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { publishArticlePackage } from "../src/lib/server/article-publisher.ts";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";

const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const markdown = `---
title: "验证文章"
summary: "生产发布验证。"
publishedAt: 2026-08-02
number: "WR—VERIFY"
---

正文。

![月相](images/moon.png)`;

function articlePackage() {
  return {
    slug: "verified-article",
    status: "published" as const,
    sourceName: "article.md",
    markdown,
    assets: [
      {
        sourcePath: "images/moon.png",
        mediaType: "image/png",
        contentBase64: onePixelPng,
      },
    ],
  };
}

test("publishes a packaged article and preserves an unchanged revision", async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "burns-publisher-"));
  const mediaRoot = join(temporaryDirectory, "media");
  const database = createArticleDatabase(":memory:");

  try {
    const first = await publishArticlePackage(articlePackage(), {
      database,
      mediaRoot,
      validateOnly: false,
    });
    const unchanged = await publishArticlePackage(articlePackage(), {
      database,
      mediaRoot,
      validateOnly: false,
    });

    assert.equal(first.article.slug, "verified-article");
    assert.equal(first.assets.length, 1);
    assert.match(
      first.assets[0].url,
      /^\/media\/articles\/verified-article\//,
    );
    assert.equal(unchanged.article.revision, first.article.revision);
    assert.ok(existsSync(join(mediaRoot, "verified-article")));
  } finally {
    database.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("validation changes neither SQLite nor the media directory", async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "burns-validate-"));
  const mediaRoot = join(temporaryDirectory, "media");
  const database = createArticleDatabase(":memory:");

  try {
    const result = await publishArticlePackage(articlePackage(), {
      database,
      mediaRoot,
      validateOnly: true,
    });
    const count = database.prepare("SELECT count(*) AS count FROM articles").get() as {
      count: number;
    };

    assert.equal(result.validated, true);
    assert.equal(count.count, 0);
    assert.equal(existsSync(mediaRoot), false);
  } finally {
    database.close();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("rejects unsafe paths and excessive asset counts", async () => {
  const database = createArticleDatabase(":memory:");
  try {
    await assert.rejects(
      publishArticlePackage(
        {
          ...articlePackage(),
          assets: [
            {
              sourcePath: "../secret.png",
              mediaType: "image/png",
              contentBase64: onePixelPng,
            },
          ],
        },
        { database, mediaRoot: "/unused", validateOnly: true },
      ),
      /path/i,
    );

    await assert.rejects(
      publishArticlePackage(
        {
          ...articlePackage(),
          assets: Array.from({ length: 41 }, (_, index) => ({
            sourcePath: `images/${index}.png`,
            mediaType: "image/png",
            contentBase64: onePixelPng,
          })),
        },
        { database, mediaRoot: "/unused", validateOnly: true },
      ),
      /40 assets/i,
    );
  } finally {
    database.close();
  }
});
