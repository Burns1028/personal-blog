import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import * as archiveQuery from "../src/lib/archive-query.ts";

type PaginationItem = number | "ellipsis";
type PaginationItems = (page: number, pageCount: number) => PaginationItem[];

const projectRoot = resolve(import.meta.dirname, "..");

test("pagination keeps a bounded truthful window near the start, middle, and end", () => {
  assert.equal(typeof archiveQuery.paginationItems, "function");
  const paginationItems = archiveQuery.paginationItems as PaginationItems;
  const cases = [
    { page: 1, pageCount: 1, expected: [1] },
    { page: 2, pageCount: 8, expected: [1, 2, 3, "ellipsis", 8] },
    { page: 4, pageCount: 8, expected: [1, "ellipsis", 4, "ellipsis", 8] },
    { page: 7, pageCount: 8, expected: [1, "ellipsis", 6, 7, 8] },
  ] satisfies Array<{
    page: number;
    pageCount: number;
    expected: PaginationItem[];
  }>;

  for (const { page, pageCount, expected } of cases) {
    const items = paginationItems(page, pageCount);
    assert.deepEqual(items, expected);
    assert.ok(items.includes(page), `current page ${page} must be present`);
    assert.equal(items[0], 1);
    assert.equal(items.at(-1), pageCount);
    assert.ok(
      items.filter((item) => typeof item === "number").length <= 4,
      "the phone layout can fit at most four 44px page controls",
    );
  }
});

test("ArchivePagination renders the bounded server-side window through truthful hrefs", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/components/archive/ArchivePagination.astro"),
    "utf8",
  );

  assert.match(source, /paginationItems\(page, pageCount\)/);
  assert.doesNotMatch(source, /Array\.from\(\{ length: pageCount \}/);
  assert.match(source, /item === "ellipsis"/);
  assert.match(source, /class="archive-pagination__ellipsis"/);
  assert.match(source, /href=\{hrefFor\(item\)\}/);
  assert.match(source, /item === page/);
});
