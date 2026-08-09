import { matchesSearch, normalizeSearch } from "./archive-query.ts";

export interface IdeaArchiveEntry {
  sourceKey: string;
  text: string;
  theme: string;
  capturedAt: string;
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
): T[] {
  const query = normalizeSearch(rawQuery);
  const date = ideaDateKey(rawDate);

  return ideas.filter(
    (idea) =>
      (!date || ideaDateKey(idea.capturedAt) === date) &&
      matchesSearch([idea.text, idea.theme, idea.sourceKey], query),
  );
}

export function listIdeaDates<T extends IdeaArchiveEntry>(ideas: T[]): string[] {
  return [
    ...new Set(ideas.map(({ capturedAt }) => ideaDateKey(capturedAt)).filter(Boolean)),
  ].sort((left, right) => right.localeCompare(left));
}
