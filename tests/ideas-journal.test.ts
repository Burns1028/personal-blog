import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  filterIdeas,
  ideaDateKey,
  listIdeaDates,
} from "../src/lib/idea-archive.ts";

const projectRoot = resolve(import.meta.dirname, "..");

test("Ideas journal exposes a pure archive filtering module", () => {
  assert.ok(
    existsSync(resolve(projectRoot, "src/lib/idea-archive.ts")),
    "src/lib/idea-archive.ts must exist",
  );
});

const ideas = [
  {
    sourceKey: "poem-night",
    text: "不要温顺地走进那良夜。",
    theme: "文学",
    capturedAt: "2026-08-07T08:10:00+08:00",
  },
  {
    sourceKey: "learning-fast",
    text: "临摹才是最快的学习方法。",
    theme: "学习",
    capturedAt: "2026-08-02T23:30:00+08:00",
  },
  {
    sourceKey: "small-ego",
    text: "Speak loudly and carry a small ego.",
    theme: "处事",
    capturedAt: "2026-08-02T12:30:00+08:00",
  },
];

test("Ideas journal preserves the recorded calendar date", () => {
  assert.equal(ideaDateKey(ideas[0].capturedAt), "2026-08-07");
  assert.equal(ideaDateKey("not-a-date"), "");
  assert.equal(ideaDateKey("2026-02-30"), "");
  assert.equal(ideaDateKey("2026-08-02T25:00:00+08:00"), "");
});

test("Ideas journal combines keyword and exact date filtering in stable order", () => {
  assert.deepEqual(
    filterIdeas(ideas, "  学习  ", "2026-08-02").map(
      ({ sourceKey }) => sourceKey,
    ),
    ["learning-fast"],
  );
  assert.deepEqual(
    filterIdeas(ideas, "", "2026-08-02").map(({ sourceKey }) => sourceKey),
    ["learning-fast", "small-ego"],
  );
  assert.deepEqual(
    filterIdeas(ideas, "EGO", "").map(({ sourceKey }) => sourceKey),
    ["small-ego"],
  );
});

test("Ideas journal exposes unique dates newest first", () => {
  assert.deepEqual(listIdeaDates(ideas), ["2026-08-07", "2026-08-02"]);
});

test("Ideas page renders URL-backed search and an unboxed timeline journal", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );

  assert.match(page, /filterIdeas/);
  assert.match(page, /Astro\.url\.searchParams\.get\("q"\)/);
  assert.match(page, /Astro\.url\.searchParams\.get\("date"\)/);
  assert.match(page, /name="q"/);
  assert.match(page, /name="date"/);
  assert.match(page, /搜索灵感或关键词/);
  assert.match(page, /全部日期/);
  assert.match(page, /data-ideas-journal/);
  assert.match(page, /data-ideas-timeline/);
  assert.match(page, /data-idea-node/);
  assert.match(page, /<li[\s\S]*?id=\{idea\.sourceKey\}/);
  assert.match(page, /white-space|idea\.text/);
  assert.doesNotMatch(page, /signal-card-grid/);
  assert.doesNotMatch(page, /signal-card__permalink/);
});

test("Ideas date filtering uses a custom archive index instead of the native select popup", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );
  const css = readFileSync(
    resolve(projectRoot, "src/styles/ideas-journal.css"),
    "utf8",
  );

  assert.doesNotMatch(page, /<select\b/);
  assert.match(page, /<details[\s\S]*?data-ideas-date-filter/);
  assert.match(page, /<input[\s\S]*?type="hidden"[\s\S]*?name="date"[\s\S]*?data-ideas-date-value/);
  assert.match(page, /data-ideas-date-option/);
  assert.match(page, /dateValue\.value = option\.dataset\.dateValue \?\? ""/);
  assert.match(page, /searchForm\?\.requestSubmit\(\)/);
  assert.match(page, /aria-current=\{!selectedDate \? "page" : undefined\}/);
  assert.match(page, /aria-current=\{date === selectedDate \? "page" : undefined\}/);
  assert.doesNotMatch(page, /日期索引/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(css, /\.ideas-journal__date-filter\s*>\s*summary/);
  assert.match(css, /\.ideas-journal__date-menu\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /\.ideas-journal__date-menu\s*\{[^}]*background:\s*linear-gradient/);
  assert.match(
    css,
    /\.ideas-journal__date-filter\s*>\s*summary:focus-visible\s*\{[^}]*outline:\s*0/,
  );
  assert.match(css, /\.ideas-journal__date-option\[aria-current="page"\]::before/);
  assert.doesNotMatch(css, /\.ideas-journal__date-menu-title/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{0,2}4096ff|dodgerblue/);
});

test("Ideas singularity is a decorative fixed-background component", () => {
  const singularity = readFileSync(
    resolve(projectRoot, "src/components/IdeasSingularity.astro"),
    "utf8",
  );

  assert.match(singularity, /ideas-journal__singularity/);
  assert.match(singularity, /ideas-black-hole-overlay-v4\.webp/);
  assert.match(singularity, /aria-hidden="true"/);
  assert.doesNotMatch(singularity, /ideas-journal__singularity-core/);
  assert.doesNotMatch(singularity, /window\.addEventListener\("scroll"/);
});

test("Ideas journal restores the transparent wide black-hole asset", async () => {
  const asset = resolve(
    projectRoot,
    "public/assets/ideas-black-hole-overlay-v4.webp",
  );
  assert.ok(existsSync(asset));

  const metadata = await sharp(asset).metadata();
  assert.equal(metadata.width, 1206);
  assert.equal(metadata.height, 676);
  assert.equal(metadata.hasAlpha, true);
  assert.ok(statSync(asset).size < 600_000);
});

test("Ideas timeline uses an explicit right-pointing cursor instead of a second dot", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );

  assert.match(
    page,
    /<path[\s\S]*?class="ideas-journal__track-cursor"[\s\S]*?d="M 0 -6 L 11 0 L 0 6 Z"[\s\S]*?data-ideas-track-cursor/,
  );
  assert.match(
    page,
    /cursor\.setAttribute\(\s*"transform",\s*`translate\(\$\{cursorPoint\.x\} \$\{cursorPoint\.y\}\)`/,
  );
  assert.doesNotMatch(page, /cursor\.setAttribute\("cx"/);
  assert.doesNotMatch(page, /cursor\.setAttribute\("cy"/);
});

test("Ideas journal draws and advances its measured timeline on scroll", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );

  assert.match(page, /getBoundingClientRect/);
  assert.match(page, /getPointAtLength/);
  assert.match(page, /strokeDashoffset/);
  assert.match(page, /dataset\.current/);
  assert.match(page, /window\.addEventListener\("scroll"/);
  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /requestSubmit/);
  assert.match(page, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(page, /event\.persisted/);
});

test("Ideas journal styling fixes the background and keeps the reading controls available", () => {
  const cssPath = resolve(projectRoot, "src/styles/ideas-journal.css");
  assert.ok(existsSync(cssPath), "Ideas journal stylesheet must exist");
  const css = readFileSync(cssPath, "utf8");
  const page = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );

  assert.match(page, /styles\/ideas-journal\.css/);
  assert.match(
    css,
    /\.ideas-journal__backdrop\s*\{[^}]*position:\s*fixed/,
  );
  assert.match(
    css,
    /body\[data-route="\/ideas"\] \.site-header\s*\{[^}]*position:\s*fixed/,
  );
  assert.match(
    css,
    /\.ideas-journal__search\s*\{[^}]*position:\s*relative/,
  );
  assert.doesNotMatch(
    css,
    /\.ideas-journal__search\s*\{[^}]*position:\s*sticky/,
  );
  assert.match(
    css,
    /\.ideas-journal__search\s*\{[^}]*background:\s*transparent/,
  );
  assert.doesNotMatch(css, /\.ideas-journal__search::before/);
  assert.doesNotMatch(css, /\.ideas-journal__search\s*\{[^}]*backdrop-filter/);
  assert.match(
    css,
    /\.ideas-journal__singularity\s*\{[^}]*aspect-ratio:\s*1206\s*\/\s*676/,
  );
  assert.match(
    css,
    /\.ideas-journal__singularity\s*\{[^}]*right:\s*clamp\(24px,\s*3vw,\s*64px\)/,
  );
  assert.doesNotMatch(css, /\.ideas-journal__search\s*\{[^}]*\btop\s*:/);
  assert.match(
    css,
    /\.ideas-journal__entry h2\s*\{[^}]*font-size:\s*clamp\(15px,\s*1\.02vw,\s*17px\)/,
  );
  assert.match(css, /grid-template-columns:\s*132px 42px minmax\(0,\s*700px\)/);
  assert.match(css, /@media \(max-width:\s*980px\)/);
  assert.match(css, /@media \(max-width:\s*619px\)/);
  assert.doesNotMatch(
    css,
    /@media \(max-width:\s*619px\)[\s\S]*?\.ideas-journal__search\s*\{[^}]*top:\s*104px/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*619px\)[\s\S]*?\.ideas-journal__meta\s*\{[^}]*font-size:\s*10px/,
  );
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(css, /background-attachment:\s*fixed/);
});
