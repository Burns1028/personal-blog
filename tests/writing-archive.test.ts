import assert from "node:assert/strict";
import test from "node:test";
import * as archive from "../src/lib/writing-archive.ts";

const article = (id: string, title: string, tags: string[]) => ({
  id,
  data: { title, tags, summary: "文章摘要" },
});
const entries = [
  article("deepinfer", "DeepInfer 小解", ["DeepSeek", "推理系统"]),
  article("agent", "一些对 Agent 的判断", ["Agent", "Reasoning"]),
  article("rsi", "模型怎样更新权重", ["RSI", "Model"]),
  article("naval", "《纳瓦尔宝典》幸福篇读书笔记", ["读书", "幸福"]),
  article("mythical", "《人月神话》读书笔记", ["软件工程", "读书笔记"]),
  article("taste", "Taste Is All You Need", ["AI", "品味", "设计"]),
  article("memoir", "云图回忆录", ["工作", "工程", "AI"]),
  article("new", "一篇新随笔", []),
];

test("existing article tags produce useful types without changing stored content", () => {
  assert.equal(typeof archive.writingTypeFor, "function");
  assert.deepEqual(entries.map(archive.writingTypeFor), [
    "ai-infra", "agents", "agents", "reading", "reading", "design", "life", "life",
  ]);
  assert.equal(
    archive.writingTypeFor(article("custom", "Agent 的产品设计", ["Agent", "产品与设计"])),
    "design",
  );
  assert.equal(
    archive.writingTypeFor(article("infra", "部署笔记", [" AI INFRA "])),
    "ai-infra",
  );
});

test("type counts cover the whole archive and ignore empty types", () => {
  assert.equal(typeof archive.listWritingTypes, "function");
  const facets = archive.listWritingTypes(entries);
  assert.deepEqual(facets.map(({ id, count }) => [id, count]), [
    ["ai-infra", 1], ["agents", 2], ["reading", 2], ["design", 1], ["life", 2],
  ]);
  assert.deepEqual(archive.listWritingTypes([]), []);
  assert.equal(archive.normalizeWritingType(" ai-infra ", facets), "ai-infra");
  assert.equal(archive.normalizeWritingType("unknown", facets), "");
  assert.equal(archive.normalizeWritingType("reading", archive.listWritingTypes([entries[0]])), "");
});

test("type and search intersect before pagination and retain article order", () => {
  assert.equal(typeof archive.filterWriting, "function");
  assert.deepEqual(archive.filterWriting(entries, "agents", "").map(({ id }) => id), ["agent", "rsi"]);
  assert.deepEqual(archive.filterWriting(entries, "agents", "模型").map(({ id }) => id), ["rsi"]);
  assert.deepEqual(archive.filterWriting(entries, "reading", "DeepInfer"), []);
  assert.deepEqual(archive.filterWriting(entries, "", "  deepinfer ").map(({ id }) => id), ["deepinfer"]);
  assert.deepEqual(archive.filterWriting(entries, "", ""), entries);
});

test("archive URLs preserve type and search while category changes reset pagination", () => {
  assert.equal(typeof archive.writingArchiveHref, "function");
  assert.equal(archive.writingArchiveHref({}), "/writing");
  const href = archive.writingArchiveHref({ type: "agents", query: " 模型   权重 ", page: 2 });
  const url = new URL(href, "https://burnsgao.me");
  assert.equal(url.searchParams.get("type"), "agents");
  assert.equal(url.searchParams.get("q"), "模型 权重");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(new URL(archive.writingArchiveHref({ type: "reading", query: "书" }), url).searchParams.has("page"), false);
  assert.equal(archive.writingArchiveHref({ type: "unknown", page: NaN }), "/writing");
});
