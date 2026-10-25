import { matchesSearch, normalizeSearch } from "./archive-query.ts";

export interface WritingArchiveEntry {
  id: string;
  data: {
    title: string;
    summary: string;
    deck?: string;
    tags: string[];
  };
}

const writingTypes = [
  { id: "ai-infra", label: "AI Infra", tags: ["ai infra", "ai-infra", "推理系统", "推理框架", "模型部署", "分布式训练", "inference", "deepinfer", "vllm", "sglang", "cuda", "gpu"] },
  { id: "agents", label: "Agent / RSI", tags: ["agent", "agents", "multi-agent", "rsi", "harness", "reasoning", "self-training", "self-evolving"] },
  { id: "reading", label: "读书笔记", tags: ["读书", "读书笔记", "阅读", "书评"] },
  { id: "design", label: "产品与设计", tags: ["产品", "设计", "审美", "品味", "product", "design"] },
  { id: "life", label: "工作与生活", tags: ["工作", "生活", "回忆录", "随笔"] },
] as const;

export type WritingTypeId = (typeof writingTypes)[number]["id"];

const writingTopics = [
  { id: "deepinfer", type: "ai-infra", label: "DeepInfer", pattern: /deepinfer/i },
  { id: "inference", type: "ai-infra", label: "推理与部署" },
  { id: "rsi", type: "agents", label: "RSI 综述", pattern: /\brsi\b/i },
  { id: "agent-research", type: "agents", label: "Agent 研究" },
  { id: "naval", type: "reading", label: "纳瓦尔宝典", pattern: /纳瓦尔/ },
  { id: "mythical-man-month", type: "reading", label: "人月神话", pattern: /人月神话/ },
  { id: "book-notes", type: "reading", label: "其他读书笔记" },
  { id: "product-design", type: "design", label: "产品与审美" },
  { id: "memoirs", type: "life", label: "工作回忆", pattern: /回忆录/ },
  { id: "essays", type: "life", label: "生活随笔" },
] as const;

export type WritingTopicId = (typeof writingTopics)[number]["id"];
export type WritingSort = "desc" | "asc";

export interface WritingTopicFacet {
  id: WritingTopicId;
  label: string;
  count: number;
}

export interface WritingTypeFacet {
  id: WritingTypeId;
  label: string;
  count: number;
  topics: WritingTopicFacet[];
}

export function writingTypeFor(entry: WritingArchiveEntry): WritingTypeId {
  const tags = entry.data.tags.map((tag) => tag.trim().toLowerCase());
  const explicit = writingTypes.find(({ label }) => tags.includes(label.toLowerCase()));
  if (explicit) return explicit.id;

  // Book notes stay together even when their subject is AI or product design.
  const reading = writingTypes.find(({ id }) => id === "reading")!;
  if (
    reading.tags.some((tag) => tags.includes(tag)) ||
    /读书笔记|书评/.test(entry.data.title)
  ) return "reading";

  return writingTypes.find(({ tags: keywords }) =>
    keywords.some((tag) => tags.includes(tag)),
  )?.id ?? "life";
}

export function listWritingTypes(entries: WritingArchiveEntry[]): WritingTypeFacet[] {
  const counts = new Map<WritingTypeId, number>();
  const topicCounts = new Map<WritingTopicId, number>();
  for (const entry of entries) {
    const id = writingTypeFor(entry);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    const topic = writingTopicFor(entry);
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  return writingTypes
    .map(({ id, label }) => ({
      id, label, count: counts.get(id) ?? 0,
      topics: writingTopics
        .filter((topic) => topic.type === id && topicCounts.has(topic.id))
        .map(({ id, label }) => ({ id, label, count: topicCounts.get(id)! }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN")),
    }))
    .filter(({ count }) => count > 0);
}

export function writingTopicFor(entry: WritingArchiveEntry): WritingTopicId {
  const type = writingTypeFor(entry);
  const text = [entry.data.title, ...entry.data.tags].join("\n");
  return writingTopics.find((topic) =>
    topic.type === type && (!("pattern" in topic) || topic.pattern.test(text)),
  )!.id;
}

export function normalizeWritingTopic(
  value: string | null | undefined,
  type: WritingTypeId | "",
  types: WritingTypeFacet[],
): WritingTopicId | "" {
  return types.find(({ id }) => id === type)?.topics
    .find(({ id }) => id === value?.trim())?.id ?? "";
}

export function normalizeWritingSort(value: string | null | undefined): WritingSort {
  return value === "asc" ? "asc" : "desc";
}

export function sortWriting<T extends WritingArchiveEntry & { data: { publishedAt: Date } }>(
  entries: T[],
  sort: WritingSort,
): T[] {
  const direction = sort === "asc" ? 1 : -1;
  return [...entries].sort((left, right) =>
    direction * (left.data.publishedAt.valueOf() - right.data.publishedAt.valueOf()) ||
    left.id.localeCompare(right.id),
  );
}

export function normalizeWritingType(
  value: string | null | undefined,
  types: WritingTypeFacet[],
): WritingTypeId | "" {
  const normalized = value?.trim() ?? "";
  return types.find(({ id }) => id === normalized)?.id ?? "";
}

export function filterWriting<T extends WritingArchiveEntry>(
  entries: T[],
  type: WritingTypeId | "",
  query: string,
  topic: WritingTopicId | "" = "",
): T[] {
  return entries.filter((entry) =>
    (!type || writingTypeFor(entry) === type) &&
    (!topic || writingTopicFor(entry) === topic) &&
    matchesSearch(
      [entry.data.title, entry.data.summary, entry.data.deck, ...entry.data.tags],
      query,
    ),
  );
}

export function writingArchiveHref({
  type,
  query,
  topic,
  sort,
}: {
  type?: string;
  query?: string;
  topic?: string;
  sort?: WritingSort;
}): string {
  const params = new URLSearchParams();
  const normalizedQuery = normalizeSearch(query);
  const validType = writingTypes.find(({ id }) => id === type)?.id;
  if (validType) params.set("type", validType);
  const validTopic = writingTopics.find((candidate) => candidate.id === topic && candidate.type === validType);
  if (validTopic) params.set("topic", validTopic.id);
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (sort === "asc") params.set("sort", sort);
  const suffix = params.toString();
  return suffix ? `/writing?${suffix}` : "/writing";
}
