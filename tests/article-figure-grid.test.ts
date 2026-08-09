import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { renderArticleMarkdown } from "../src/lib/server/markdown.ts";

const projectRoot = resolve(import.meta.dirname, "..");

test("article figure grids keep two captioned images together", async () => {
  const markdown = [
    '<div class="article-figure-grid">',
    "",
    "![项目分享现场](/media/talk.webp)",
    "",
    "*图 1：项目分享现场。*",
    "",
    "![比赛合影](/media/team.webp)",
    "",
    "*图 2：比赛现场留影。*",
    "",
    "</div>",
  ].join("\n");

  const rendered = await renderArticleMarkdown(markdown);

  assert.match(rendered.html, /<div class="article-figure-grid">/);
  assert.equal(
    (rendered.html.match(/<figure class="article-figure">/g) ?? []).length,
    2,
  );
  assert.match(rendered.html, /<figcaption>图 1：项目分享现场。<\/figcaption>/);
  assert.match(rendered.html, /<figcaption>图 2：比赛现场留影。<\/figcaption>/);
});

test("article figure grids use two desktop columns and stack on phones", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(
    css,
    /\.article-shell--writing \.prose \.article-figure-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(
    css,
    /@media \(max-width:\s*620px\)[\s\S]*?\.article-shell--writing \.prose \.article-figure-grid\s*\{[^}]*grid-template-columns:\s*1fr/s,
  );
});
