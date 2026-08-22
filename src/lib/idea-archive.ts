import { matchesSearch, normalizeSearch } from "./archive-query.ts";

export interface IdeaArchiveEntry {
  sourceKey: string;
  text: string;
  theme: string;
  capturedAt: string;
}

export interface IdeaThemeFacet {
  name: string;
  count: number;
  latestAt: string;
}

export interface IdeaArchiveFilters {
  query?: string;
  date?: string;
  theme?: string;
}

function ideaInstant(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function ideaDateKey(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return "";

  const [year, month, day] = match[0].split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  const isRealCalendarDate =
    calendarDate.getUTCFullYear() === year &&
    calendarDate.getUTCMonth() === month - 1 &&
    calendarDate.getUTCDate() === day;
  const hasValidTimestamp =
    value.length === match[0].length || !Number.isNaN(Date.parse(value));

  return isRealCalendarDate && hasValidTimestamp ? match[0] : "";
}

export function filterIdeas<T extends IdeaArchiveEntry>(
  ideas: T[],
  rawQuery: string,
  rawDate: string,
  rawTheme = "",
): T[] {
  const query = normalizeSearch(rawQuery);
  const date = ideaDateKey(rawDate);
  const theme = rawTheme.trim();

  return ideas.filter(
    (idea) =>
      (!date || ideaDateKey(idea.capturedAt) === date) &&
      (!theme || idea.theme.trim() === theme) &&
      matchesSearch([idea.text, idea.theme, idea.sourceKey], query),
  );
}

export function listIdeaDates<T extends IdeaArchiveEntry>(ideas: T[]): string[] {
  return [
    ...new Set(ideas.map(({ capturedAt }) => ideaDateKey(capturedAt)).filter(Boolean)),
  ].sort((left, right) => right.localeCompare(left));
}

export function listIdeaThemes<T extends IdeaArchiveEntry>(
  ideas: T[],
): IdeaThemeFacet[] {
  const facets = new Map<string, IdeaThemeFacet>();

  ideas.forEach(({ theme: rawTheme, capturedAt }) => {
    const name = rawTheme.trim();
    if (!name) return;

    const current = facets.get(name);
    facets.set(name, {
      name,
      count: (current?.count ?? 0) + 1,
      latestAt:
        !current || ideaInstant(capturedAt) > ideaInstant(current.latestAt)
          ? capturedAt
          : current.latestAt,
    });
  });

  return [...facets.values()].sort(
    (left, right) =>
      right.count - left.count ||
      ideaInstant(right.latestAt) - ideaInstant(left.latestAt) ||
      left.name.localeCompare(right.name, "zh-CN"),
  );
}

export function normalizeIdeaTheme(
  value: string | null | undefined,
  themes: IdeaThemeFacet[],
): string {
  const normalized = value?.trim() ?? "";
  return themes.some(({ name }) => name === normalized) ? normalized : "";
}

export function ideaArchiveHref({
  query,
  date,
  theme,
}: IdeaArchiveFilters): string {
  const params = new URLSearchParams();
  const normalizedQuery = normalizeSearch(query);
  const normalizedTheme = theme?.trim() ?? "";
  const normalizedDate = ideaDateKey(date ?? "");

  if (normalizedQuery) params.set("q", normalizedQuery);
  if (normalizedTheme) params.set("theme", normalizedTheme);
  if (normalizedDate) params.set("date", normalizedDate);

  const suffix = params.toString();
  return suffix ? `/ideas?${suffix}` : "/ideas";
}

export function ideaEmptyMessage({
  query,
  date,
  theme,
}: IdeaArchiveFilters): string {
  const normalizedQuery = normalizeSearch(query);
  const normalizedTheme = theme?.trim() ?? "";
  const normalizedDate = ideaDateKey(date ?? "");
  const constraints = [
    normalizedQuery ? `关键词“${normalizedQuery}”` : "",
    normalizedTheme ? `分类“${normalizedTheme}”` : "",
    normalizedDate ? `日期 ${normalizedDate}` : "",
  ].filter(Boolean);

  return constraints.length > 0
    ? `没有找到与${constraints.join("、")} 匹配的灵感。`
    : "当前没有可显示的灵感。";
}
