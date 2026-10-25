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

export interface WritingTypeFacet {
  id: WritingTypeId;
  label: string;
  count: number;
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
  for (const entry of entries) {
    const id = writingTypeFor(entry);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return writingTypes
    .map(({ id, label }) => ({ id, label, count: counts.get(id) ?? 0 }))
    .filter(({ count }) => count > 0);
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
): T[] {
  return entries.filter((entry) =>
    (!type || writingTypeFor(entry) === type) &&
    matchesSearch(
      [entry.data.title, entry.data.summary, entry.data.deck, ...entry.data.tags],
      query,
    ),
  );
}

export function writingArchiveHref({
  type,
  query,
  page,
}: {
  type?: string;
  query?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  const normalizedQuery = normalizeSearch(query);
  const validType = writingTypes.find(({ id }) => id === type)?.id;
  if (validType) params.set("type", validType);
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (page && Number.isFinite(page) && page > 1) params.set("page", String(Math.trunc(page)));
  const suffix = params.toString();
  return suffix ? `/writing?${suffix}` : "/writing";
}
