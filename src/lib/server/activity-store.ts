import type { DatabaseSync } from "node:sqlite";
import { getArticleDatabase } from "./content-store.ts";

export type ActivityKind =
  | "progress"
  | "fix"
  | "release"
  | "research"
  | "maintenance";

export interface ActivityInput {
  source: "manual" | "github" | "writing";
  sourceKey: string;
  occurredAt: string;
  projectSlug: string | null;
  kind: ActivityKind;
  title: string;
  summary: string;
  url: string | null;
}

export interface StoredActivity extends ActivityInput {
  id: number;
}

export interface ActivityDay {
  date: string;
  count: number;
  items: StoredActivity[];
}

interface ActivityRow extends StoredActivity {
  activityDay: string;
}

const activitySchema = `
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('manual','github','writing')),
    source_key TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    activity_day TEXT NOT NULL
      CHECK (activity_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    project_slug TEXT,
    kind TEXT NOT NULL
      CHECK (kind IN ('progress','fix','release','research','maintenance')),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 80),
    summary TEXT NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 180),
    url TEXT,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    UNIQUE(source, source_key)
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_activities_occurred
    ON activities(activity_day DESC, occurred_at DESC, id DESC);
`;

function ensureActivitySchema(database: DatabaseSync): void {
  database.exec(activitySchema);
}

function shanghaiDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError("Activity occurredAt must be a valid date.");
  }

  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function mapActivityRow(row: ActivityRow): StoredActivity {
  return {
    id: row.id,
    source: row.source,
    sourceKey: row.sourceKey,
    occurredAt: row.occurredAt,
    projectSlug: row.projectSlug,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    url: row.url,
  };
}

export function upsertActivity(
  input: ActivityInput,
  database: DatabaseSync = getArticleDatabase(),
): StoredActivity {
  ensureActivitySchema(database);
  const now = new Date().toISOString();
  const activityDay = shanghaiDay(input.occurredAt);

  database
    .prepare(
      `
        INSERT INTO activities (
          source,
          source_key,
          occurred_at,
          activity_day,
          project_slug,
          kind,
          title,
          summary,
          url,
          created_at,
          modified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_key) DO UPDATE SET
          occurred_at = excluded.occurred_at,
          activity_day = excluded.activity_day,
          project_slug = excluded.project_slug,
          kind = excluded.kind,
          title = excluded.title,
          summary = excluded.summary,
          url = excluded.url,
          modified_at = excluded.modified_at
      `,
    )
    .run(
      input.source,
      input.sourceKey,
      input.occurredAt,
      activityDay,
      input.projectSlug,
      input.kind,
      input.title.trim(),
      input.summary.trim(),
      input.url,
      now,
      now,
    );

  const stored = database
    .prepare(
      `
        SELECT
          id,
          source,
          source_key AS sourceKey,
          occurred_at AS occurredAt,
          activity_day AS activityDay,
          project_slug AS projectSlug,
          kind,
          title,
          summary,
          url
        FROM activities
        WHERE source = ? AND source_key = ?
        LIMIT 1
      `,
    )
    .get(input.source, input.sourceKey) as unknown as ActivityRow | undefined;

  if (!stored) {
    throw new Error("Activity disappeared after a successful upsert.");
  }

  return mapActivityRow(stored);
}

export function listActivityDays(
  limit = 6,
  database: DatabaseSync = getArticleDatabase(),
): ActivityDay[] {
  ensureActivitySchema(database);
  const rows = database
    .prepare(
      `
        SELECT
          id,
          source,
          source_key AS sourceKey,
          occurred_at AS occurredAt,
          activity_day AS activityDay,
          project_slug AS projectSlug,
          kind,
          title,
          summary,
          url
        FROM activities
        ORDER BY activity_day DESC, occurred_at DESC, id DESC
      `,
    )
    .all() as unknown as ActivityRow[];
  const byDay = new Map<string, StoredActivity[]>();

  for (const row of rows) {
    const items = byDay.get(row.activityDay) ?? [];
    items.push(mapActivityRow(row));
    byDay.set(row.activityDay, items);
  }

  const count = Math.max(
    0,
    Number.isFinite(limit) ? Math.trunc(limit) : 6,
  );

  return [...byDay.entries()].slice(0, count).map(([date, items]) => ({
    date,
    count: items.length,
    items,
  }));
}
