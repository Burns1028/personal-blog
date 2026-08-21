import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { renderArticleMarkdown } from "../src/lib/server/markdown.ts";

const projectRoot = resolve(import.meta.dirname, "..");

test("consecutive images auto-group into an image-row without any wrapper syntax", async () => {
  const markdown = [
    "![项目分享现场](/media/talk.webp)",
    "",
    "![比赛合影](/media/team.webp)",
    "",
    "*图 1：项目分享现场，图 2：比赛现场留影。*",
  ].join("\n");

  const rendered = await renderArticleMarkdown(markdown);

  assert.match(rendered.html, /<figure class="image-row">/);
  assert.match(rendered.html, /<figcaption>/);
  assert.equal(
    (rendered.html.match(/<img /g) ?? []).length,
    2,
  );
});

test("single images remain as article-figure", async () => {
  const markdown = [
    "![单张图片](/media/single.webp)",
    "",
    "*图 1：单张配图。*",
  ].join("\n");

  const rendered = await renderArticleMarkdown(markdown);

  assert.match(rendered.html, /<figure class="article-figure">/);
  assert.equal(
    (rendered.html.match(/<img /g) ?? []).length,
    1,
  );
});

test("image-row uses a flex image rail on desktop and stacks it on narrow screens", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(
    css,
    /\.article-shell--writing \.prose \.image-row__imgs\s*\{[^}]*display:\s*flex/s,
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)[\s\S]*?\.article-shell--writing \.prose \.image-row__imgs\s*\{[^}]*flex-direction:\s*column/s,
  );
});
