import type { DatabaseSync } from "node:sqlite";
import { getArticleDatabase } from "./content-store.ts";

export type ProjectStatus =
  | "active"
  | "maintained"
  | "experiment"
  | "archived";

export interface ProjectInput {
  slug: string;
  githubFullName: string;
  title: string;
  summary: string;
  repoUrl: string;
  demoUrl: string | null;
  language: string;
  status: ProjectStatus;
  featured: boolean;
  displayOrder?: number | null;
  publishedAt: string;
  updatedAt: string;
}

export interface StoredProject extends Omit<ProjectInput, "displayOrder"> {
  id: number;
  displayOrder: number | null;
  createdAt: string;
  modifiedAt: string;
}

interface ProjectRow {
  id: number;
  slug: string;
  githubFullName: string;
  title: string;
  summary: string;
  repoUrl: string;
  demoUrl: string | null;
  language: string;
  status: ProjectStatus;
  featured: number;
  displayOrder: number | null;
  publishedAt: string;
  updatedAt: string;
  createdAt: string;
  modifiedAt: string;
}

const projectSchema = `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE
      CHECK (slug GLOB '[a-z0-9]*' AND length(trim(slug)) > 0),
    github_full_name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
    summary TEXT NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 300),
    repo_url TEXT NOT NULL UNIQUE,
    demo_url TEXT,
    language TEXT NOT NULL CHECK (length(trim(language)) BETWEEN 1 AND 40),
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'maintained', 'experiment', 'archived')),
    featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
    display_order INTEGER
      CHECK (display_order IS NULL OR display_order BETWEEN 1 AND 100000),
    published_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_projects_publication
    ON projects(status, featured DESC, updated_at DESC, id DESC);
`;

const projectDisplayOrderIndex = `
  CREATE INDEX IF NOT EXISTS idx_projects_display_order
    ON projects(
      status,
      (display_order IS NULL),
      display_order,
      featured DESC,
      updated_at DESC,
      id DESC
    );
`;

function ensureProjectSchema(database: DatabaseSync): void {
  database.exec(projectSchema);
  const columns = database
    .prepare("PRAGMA table_info(projects)")
    .all() as unknown as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "display_order")) {
    database.exec(`
      ALTER TABLE projects
      ADD COLUMN display_order INTEGER
        CHECK (display_order IS NULL OR display_order BETWEEN 1 AND 100000)
    `);
  }
  database.exec(projectDisplayOrderIndex);
}

function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError(
      "Project slug must use lowercase ASCII letters, numbers, and single hyphens.",
    );
  }
  return slug;
}

function normalizeDate(value: string, label: string): string {
  const date = value.trim();
  if (Number.isNaN(new Date(date).valueOf())) {
    throw new TypeError(`Project ${label} must be a valid date.`);
  }
  return date;
}

function validateProject(input: ProjectInput): ProjectInput {
  const githubFullName = input.githubFullName.trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(githubFullName)) {
    throw new TypeError("Project githubFullName must be owner/repository.");
  }

  const repoUrl = input.repoUrl.trim().replace(/\/$/, "");
  if (repoUrl !== `https://github.com/${githubFullName}`) {
    throw new TypeError("Project repoUrl must match githubFullName.");
  }

  const title = input.title.trim();
  const summary = input.summary.trim();
  const language = input.language.trim();
  if (title.length < 1 || title.length > 100) {
    throw new TypeError("Project title must contain between 1 and 100 characters.");
  }
  if (summary.length < 1 || summary.length > 300) {
    throw new TypeError(
      "Project summary must contain between 1 and 300 characters.",
    );
  }
  if (language.length < 1 || language.length > 40) {
    throw new TypeError(
      "Project language must contain between 1 and 40 characters.",
    );
  }
  if (!["active", "maintained", "experiment", "archived"].includes(input.status)) {
    throw new TypeError("Project status is invalid.");
  }
  const hasDisplayOrder = Object.prototype.hasOwnProperty.call(
    input,
    "displayOrder",
  );
  if (
    hasDisplayOrder &&
    input.displayOrder !== null &&
    (!Number.isInteger(input.displayOrder) ||
      (input.displayOrder as number) < 1 ||
      (input.displayOrder as number) > 100000)
  ) {
    throw new TypeError(
      "Project displayOrder must be null or an integer from 1 to 100000.",
    );
  }

  return {
    ...input,
    slug: normalizeSlug(input.slug),
    githubFullName,
    title,
    summary,
    repoUrl,
    demoUrl: input.demoUrl?.trim().replace(/\/$/, "") || null,
    language,
    publishedAt: normalizeDate(input.publishedAt, "publishedAt"),
    updatedAt: normalizeDate(input.updatedAt, "updatedAt"),
  };
}

function mapProjectRow(row: ProjectRow): StoredProject {
  return {
    id: row.id,
    slug: row.slug,
    githubFullName: row.githubFullName,
    title: row.title,
    summary: row.summary,
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    language: row.language,
    status: row.status,
    featured: row.featured === 1,
    displayOrder: row.displayOrder,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    modifiedAt: row.modifiedAt,
  };
}

const projectSelect = `
  SELECT
    id,
    slug,
    github_full_name AS githubFullName,
    title,
    summary,
    repo_url AS repoUrl,
    demo_url AS demoUrl,
    language,
    status,
    featured,
    display_order AS displayOrder,
    published_at AS publishedAt,
    updated_at AS updatedAt,
    created_at AS createdAt,
    modified_at AS modifiedAt
  FROM projects
`;

export function upsertProject(
  input: ProjectInput,
  database: DatabaseSync = getArticleDatabase(),
): StoredProject {
  ensureProjectSchema(database);
  const normalized = validateProject(input);
  const hasDisplayOrder = Object.prototype.hasOwnProperty.call(
    normalized,
    "displayOrder",
  );
  const now = new Date().toISOString();

  database
    .prepare(
      `
        INSERT INTO projects (
          slug, github_full_name, title, summary, repo_url, demo_url, language,
          status, featured, display_order, published_at, updated_at, created_at,
          modified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          github_full_name = excluded.github_full_name,
          title = excluded.title,
          summary = excluded.summary,
          repo_url = excluded.repo_url,
          demo_url = excluded.demo_url,
          language = excluded.language,
          status = excluded.status,
          featured = excluded.featured,
          display_order = CASE
            WHEN ? = 1 THEN excluded.display_order
            ELSE projects.display_order
          END,
          published_at = excluded.published_at,
          updated_at = excluded.updated_at,
          modified_at = excluded.modified_at
      `,
    )
    .run(
      normalized.slug,
      normalized.githubFullName,
      normalized.title,
      normalized.summary,
      normalized.repoUrl,
      normalized.demoUrl,
      normalized.language,
      normalized.status,
      normalized.featured ? 1 : 0,
      normalized.displayOrder ?? null,
      normalized.publishedAt,
      normalized.updatedAt,
      now,
      now,
      hasDisplayOrder ? 1 : 0,
    );

  const stored = getStoredProjectBySlug(normalized.slug, database);
  if (!stored) {
    throw new Error("Project disappeared after a successful upsert.");
  }
  return stored;
}

export function getStoredProjectBySlug(
  slug: string,
  database: DatabaseSync = getArticleDatabase(),
): StoredProject | undefined {
  ensureProjectSchema(database);
  const row = database
    .prepare(`${projectSelect} WHERE slug = ? LIMIT 1`)
    .get(slug) as unknown as ProjectRow | undefined;
  return row ? mapProjectRow(row) : undefined;
}

export function listPublishedProjects(
  database: DatabaseSync = getArticleDatabase(),
): StoredProject[] {
  ensureProjectSchema(database);
  const rows = database
    .prepare(
      `${projectSelect}
       WHERE status != 'archived'
       ORDER BY
         display_order IS NULL,
         display_order ASC,
         featured DESC,
         updated_at DESC,
         id DESC`,
    )
    .all() as unknown as ProjectRow[];
  return rows.map(mapProjectRow);
}
