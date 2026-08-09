import assert from "node:assert/strict";
import test from "node:test";
import { selectTopLevelArticleHeadings } from "../src/lib/article-headings.ts";

test("selects only the shallowest heading level present in the article body", () => {
  const headings = [
    { depth: 2, slug: "internship", text: "实习" },
    { depth: 3, slug: "first-project", text: "第一个项目" },
    { depth: 2, slug: "full-time", text: "正式入职" },
  ];

  assert.deepEqual(
    selectTopLevelArticleHeadings(headings).map(({ slug }) => slug),
    ["internship", "full-time"],
  );
});

test("uses a deeper level when it is the shallowest level in that article", () => {
  const headings = [
    { depth: 3, slug: "part-one", text: "第一部分" },
    { depth: 4, slug: "detail", text: "细节" },
    { depth: 3, slug: "part-two", text: "第二部分" },
  ];

  assert.deepEqual(
    selectTopLevelArticleHeadings(headings).map(({ slug }) => slug),
    ["part-one", "part-two"],
  );
});

test("ignores generated footnote headings and returns an empty list without content headings", () => {
  assert.deepEqual(
    selectTopLevelArticleHeadings([
      { depth: 2, slug: "footnote-label", text: "Footnotes" },
    ]),
    [],
  );
  assert.deepEqual(selectTopLevelArticleHeadings([]), []);
});
