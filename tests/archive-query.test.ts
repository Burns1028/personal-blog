import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesSearch,
  pageHref,
  paginate,
} from "../src/lib/archive-query.ts";

test("search ignores case and surrounding whitespace", () => {
  assert.equal(matchesSearch(["Astro", "智能体系统"], "  astro "), true);
});

test("pagination clamps invalid pages and never invents pages", () => {
  assert.deepEqual(paginate([1, 2, 3], 99, 2), {
    items: [3],
    page: 2,
    pageCount: 2,
    total: 3,
  });
});

test("page links retain the search query", () => {
  assert.equal(
    pageHref("/writing", 2, "AI 审美"),
    "/writing?q=AI+%E5%AE%A1%E7%BE%8E&page=2",
  );
});
