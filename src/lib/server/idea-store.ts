import type { DatabaseSync } from "node:sqlite";
import { getArticleDatabase } from "./content-store.ts";

export type IdeaStatus = "draft" | "published" | "archived";

export interface IdeaInput {
  sourceKey: string;
  text: string;
  theme: string;
  capturedAt: string;
  status: IdeaStatus;
  featured: boolean;
}

export interface StoredIdea extends IdeaInput {
  id: number;
  createdAt: string;
  modifiedAt: string;
}

interface IdeaRow {
  id: number;
  sourceKey: string;
  text: string;
  theme: string;
  capturedAt: string;
  status: IdeaStatus;
  featured: number;
  createdAt: string;
  modifiedAt: string;
}

const ideaSchema = `
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE
      CHECK (source_key GLOB '[a-z0-9]*' AND length(trim(source_key)) > 0),
    text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 500),
    theme TEXT NOT NULL CHECK (length(trim(theme)) BETWEEN 1 AND 40),
    captured_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),
    featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_ideas_publication
    ON ideas(status, featured DESC, captured_at DESC, id DESC);
`;

function ensureIdeaSchema(database: DatabaseSync): void {
  database.exec(ideaSchema);
}

function normalizeSourceKey(value: string): string {
  const sourceKey = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceKey)) {
    throw new TypeError(
      "Idea sourceKey must use lowercase ASCII letters, numbers, and single hyphens.",
    );
  }
  return sourceKey;
}

function normalizeDate(value: string): string {
  const capturedAt = value.trim();
  if (Number.isNaN(new Date(capturedAt).valueOf())) {
    throw new TypeError("Idea capturedAt must be a valid date.");
  }
  return capturedAt;
}

function validateIdea(input: IdeaInput): IdeaInput {
  const text = input.text.trim();
  const theme = input.theme.trim();

  if (text.length < 1 || text.length > 500) {
    throw new TypeError("Idea text must contain between 1 and 500 characters.");
  }
  if (theme.length < 1 || theme.length > 40) {
    throw new TypeError("Idea theme must contain between 1 and 40 characters.");
  }
  if (!["draft", "published", "archived"].includes(input.status)) {
    throw new TypeError("Idea status is invalid.");
  }

  return {
    ...input,
    sourceKey: normalizeSourceKey(input.sourceKey),
    text,
    theme,
    capturedAt: normalizeDate(input.capturedAt),
  };
}

function mapIdeaRow(row: IdeaRow): StoredIdea {
  return {
    id: row.id,
    sourceKey: row.sourceKey,
    text: row.text,
    theme: row.theme,
    capturedAt: row.capturedAt,
    status: row.status,
    featured: row.featured === 1,
    createdAt: row.createdAt,
    modifiedAt: row.modifiedAt,
  };
}

const ideaSelect = `
  SELECT
    id,
    source_key AS sourceKey,
    text,
    theme,
    captured_at AS capturedAt,
    status,
    featured,
    created_at AS createdAt,
    modified_at AS modifiedAt
  FROM ideas
`;

export function upsertIdea(
  input: IdeaInput,
  database: DatabaseSync = getArticleDatabase(),
): StoredIdea {
  ensureIdeaSchema(database);
  const normalized = validateIdea(input);
  const now = new Date().toISOString();

  database
    .prepare(
      `
        INSERT INTO ideas (
          source_key, text, theme, captured_at, status, featured, created_at, modified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_key) DO UPDATE SET
          text = excluded.text,
          theme = excluded.theme,
          captured_at = excluded.captured_at,
          status = excluded.status,
          featured = excluded.featured,
          modified_at = excluded.modified_at
      `,
    )
    .run(
      normalized.sourceKey,
      normalized.text,
      normalized.theme,
      normalized.capturedAt,
      normalized.status,
      normalized.featured ? 1 : 0,
      now,
      now,
    );

  const stored = getStoredIdeaBySourceKey(normalized.sourceKey, database);
  if (!stored) {
    throw new Error("Idea disappeared after a successful upsert.");
  }
  return stored;
}

export function getStoredIdeaBySourceKey(
  sourceKey: string,
  database: DatabaseSync = getArticleDatabase(),
): StoredIdea | undefined {
  ensureIdeaSchema(database);
  const row = database
    .prepare(`${ideaSelect} WHERE source_key = ? LIMIT 1`)
    .get(sourceKey) as unknown as IdeaRow | undefined;
  return row ? mapIdeaRow(row) : undefined;
}

export function listPublishedIdeas(
  database: DatabaseSync = getArticleDatabase(),
): StoredIdea[] {
  ensureIdeaSchema(database);
  const rows = database
    .prepare(
      `${ideaSelect}
       WHERE status = 'published'
       ORDER BY featured DESC, captured_at DESC, id DESC`,
    )
    .all() as unknown as IdeaRow[];
  return rows.map(mapIdeaRow);
}

export function listIdeas(
  status?: IdeaStatus | "all",
  database: DatabaseSync = getArticleDatabase(),
): StoredIdea[] {
  ensureIdeaSchema(database);
  let query = `${ideaSelect}`;
  const params: string[] = [];

  if (status && status !== "all") {
    query += " WHERE status = ?";
    params.push(status);
  }

  query += " ORDER BY featured DESC, captured_at DESC, id DESC";

  const statement = database.prepare(query);
  const rows = (
    params.length > 0 ? statement.all(...params) : statement.all()
  ) as unknown as IdeaRow[];
  return rows.map(mapIdeaRow);
}

export function deleteIdea(
  sourceKey: string,
  database: DatabaseSync = getArticleDatabase(),
): boolean {
  ensureIdeaSchema(database);
  const normalized = normalizeSourceKey(sourceKey);
  const result = database
    .prepare("DELETE FROM ideas WHERE source_key = ?")
    .run(normalized);
  return result.changes > 0;
}
