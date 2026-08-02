import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ArticleStatus = "draft" | "published" | "archived";

export interface ArticleAssetInput {
  storageKey: string;
  publicUrl: string;
  sourcePath: string | null;
  mediaType: string;
  width: number | null;
  height: number | null;
  byteSize: number;
  sha256: string;
  altText: string;
  caption: string | null;
  sortOrder: number;
}

export interface ArticleInput {
  sourceDocumentId: string | null;
  slug: string;
  title: string;
  summary: string;
  deck: string | null;
  bodyMarkdown: string;
  tags: string[];
  featured: boolean;
  status: ArticleStatus;
  number: string;
  readingMinutes: number;
  publishedAt: string | null;
  updatedAt: string | null;
  sourcePath: string | null;
  sourceSha256: string;
  contentSha256: string;
}

export interface StoredArticleSummary {
  id: number;
  slug: string;
  title: string;
  summary: string;
  deck: string | null;
  tags: string[];
  featured: boolean;
  status: ArticleStatus;
  number: string;
  readingMinutes: number;
  publishedAt: string | null;
  updatedAt: string | null;
  revision: number;
}

export interface StoredArticle extends StoredArticleSummary {
  sourceDocumentId: string | null;
  bodyMarkdown: string;
  sourcePath: string | null;
  sourceSha256: string;
  contentSha256: string;
  importedAt: string;
  createdAt: string;
  modifiedAt: string;
}

export interface StoredArticleAsset {
  id: number;
  articleId: number;
  storageKey: string;
  publicUrl: string;
  mediaType: string;
  width: number | null;
  height: number | null;
  byteSize: number;
  sha256: string;
  altText: string;
  caption: string | null;
  sortOrder: number;
}

interface ArticleRow {
  id: number;
  source_document_id: string | null;
  slug: string;
  title: string;
  summary: string;
  deck: string | null;
  body_markdown: string;
  tags_json: string;
  featured: number;
  status: ArticleStatus;
  number: string;
  reading_minutes: number;
  published_at: string | null;
  updated_at: string | null;
  source_path: string | null;
  source_sha256: string;
  content_sha256: string;
  revision: number;
  imported_at: string;
  created_at: string;
  modified_at: string;
}

interface AssetRow {
  id: number;
  article_id: number;
  storage_key: string;
  public_url: string;
  media_type: string;
  width: number | null;
  height: number | null;
  byte_size: number;
  sha256: string;
  alt_text: string;
  caption: string | null;
  sort_order: number;
}

const schema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS content_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT;

  INSERT OR IGNORE INTO content_meta (key, value)
  VALUES ('schema_version', '1');

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY,
    source_document_id TEXT UNIQUE,
    slug TEXT NOT NULL UNIQUE
      CHECK (slug GLOB '[a-z0-9]*' AND length(trim(slug)) > 0),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    summary TEXT NOT NULL DEFAULT '',
    deck TEXT,
    body_markdown TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
    featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'published', 'archived')),
    number TEXT NOT NULL UNIQUE,
    reading_minutes INTEGER NOT NULL DEFAULT 1 CHECK (reading_minutes > 0),
    published_at TEXT,
    updated_at TEXT,
    source_path TEXT,
    source_sha256 TEXT NOT NULL,
    content_sha256 TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    imported_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS article_assets (
    id INTEGER PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    source_path TEXT,
    media_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    sha256 TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_articles_publication
    ON articles(status, published_at DESC, id DESC);

  CREATE INDEX IF NOT EXISTS idx_article_assets_article
    ON article_assets(article_id, sort_order, id);

  CREATE TABLE IF NOT EXISTS publish_nonces (
    key_id TEXT NOT NULL,
    nonce TEXT NOT NULL,
    used_at TEXT NOT NULL,
    PRIMARY KEY (key_id, nonce)
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_publish_nonces_used_at
    ON publish_nonces(used_at);
`;

let sharedDatabase: DatabaseSync | undefined;
let sharedDatabasePath: string | undefined;

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

function normalizeTags(tags: string[]): string[] {
  return [
    ...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
  ];
}

function mapSummaryRow(row: ArticleRow): StoredArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    deck: row.deck,
    tags: parseTags(row.tags_json),
    featured: row.featured === 1,
    status: row.status,
    number: row.number,
    readingMinutes: row.reading_minutes,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    revision: row.revision,
  };
}

function mapArticleRow(row: ArticleRow): StoredArticle {
  return {
    ...mapSummaryRow(row),
    sourceDocumentId: row.source_document_id,
    bodyMarkdown: row.body_markdown,
    sourcePath: row.source_path,
    sourceSha256: row.source_sha256,
    contentSha256: row.content_sha256,
    importedAt: row.imported_at,
    createdAt: row.created_at,
    modifiedAt: row.modified_at,
  };
}

function mapAssetRow(row: AssetRow): StoredArticleAsset {
  return {
    id: row.id,
    articleId: row.article_id,
    storageKey: row.storage_key,
    publicUrl: row.public_url,
    mediaType: row.media_type,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    sha256: row.sha256,
    altText: row.alt_text,
    caption: row.caption,
    sortOrder: row.sort_order,
  };
}

export function resolveBlogDatabasePath(databasePath?: string): string {
  const configuredPath =
    databasePath ?? process.env.BLOG_DB_PATH ?? "./data/blog.sqlite";

  if (configuredPath === ":memory:" || configuredPath.startsWith("file:")) {
    return configuredPath;
  }

  return isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), configuredPath);
}

export function createArticleDatabase(databasePath?: string): DatabaseSync {
  const resolvedPath = resolveBlogDatabasePath(databasePath);

  if (resolvedPath !== ":memory:" && !resolvedPath.startsWith("file:")) {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const database = new DatabaseSync(resolvedPath, {
    timeout: 5_000,
    enableForeignKeyConstraints: true,
  });

  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA synchronous = NORMAL;");
  database.exec(schema);

  return database;
}

export function getArticleDatabase(): DatabaseSync {
  const databasePath = resolveBlogDatabasePath();

  if (!sharedDatabase || sharedDatabasePath !== databasePath) {
    sharedDatabase?.close();
    sharedDatabase = createArticleDatabase(databasePath);
    sharedDatabasePath = databasePath;
  }

  return sharedDatabase;
}

export function closeArticleDatabase(): void {
  sharedDatabase?.close();
  sharedDatabase = undefined;
  sharedDatabasePath = undefined;
}

export function listPublishedArticles(
  database: DatabaseSync = getArticleDatabase(),
): StoredArticleSummary[] {
  const rows = database
    .prepare(
      `
        SELECT *
        FROM articles
        WHERE status = 'published' AND published_at IS NOT NULL
        ORDER BY published_at DESC, id DESC
      `,
    )
    .all() as unknown as ArticleRow[];

  return rows.map(mapSummaryRow);
}

export function getStoredArticleBySlug(
  slug: string,
  options: {
    publishedOnly?: boolean;
    database?: DatabaseSync;
  } = {},
): StoredArticle | undefined {
  const { publishedOnly = true, database = getArticleDatabase() } = options;
  const row = database
    .prepare(
      `
        SELECT *
        FROM articles
        WHERE slug = ?
          ${publishedOnly ? "AND status = 'published' AND published_at IS NOT NULL" : ""}
        LIMIT 1
      `,
    )
    .get(slug) as unknown as ArticleRow | undefined;

  return row ? mapArticleRow(row) : undefined;
}

export function listArticleAssets(
  articleId: number,
  database: DatabaseSync = getArticleDatabase(),
): StoredArticleAsset[] {
  const rows = database
    .prepare(
      `
        SELECT
          id,
          article_id,
          storage_key,
          public_url,
          media_type,
          width,
          height,
          byte_size,
          sha256,
          alt_text,
          caption,
          sort_order
        FROM article_assets
        WHERE article_id = ?
        ORDER BY sort_order ASC, id ASC
      `,
    )
    .all(articleId) as unknown as AssetRow[];

  return rows.map(mapAssetRow);
}

export function deleteArticle(
  slug: string,
  database: DatabaseSync = getArticleDatabase(),
): boolean {
  return database.prepare("DELETE FROM articles WHERE slug = ?").run(slug).changes > 0;
}

export function upsertArticle(
  input: ArticleInput,
  assets: ArticleAssetInput[],
  database: DatabaseSync = getArticleDatabase(),
): StoredArticle {
  const now = new Date().toISOString();
  const tagsJson = JSON.stringify(normalizeTags(input.tags));

  database.exec("BEGIN IMMEDIATE;");

  try {
    const existing = database
      .prepare(
        `
          SELECT id, content_sha256, revision
          FROM articles
          WHERE
            (source_document_id IS NOT NULL AND source_document_id = ?)
            OR slug = ?
          ORDER BY CASE WHEN source_document_id = ? THEN 0 ELSE 1 END
          LIMIT 1
        `,
      )
      .get(input.sourceDocumentId, input.slug, input.sourceDocumentId) as
      | { id: number; content_sha256: string; revision: number }
      | undefined;

    let articleId: number;

    if (existing) {
      const revision =
        existing.content_sha256 === input.contentSha256
          ? existing.revision
          : existing.revision + 1;

      database
        .prepare(
          `
            UPDATE articles
            SET
              source_document_id = ?,
              slug = ?,
              title = ?,
              summary = ?,
              deck = ?,
              body_markdown = ?,
              tags_json = ?,
              featured = ?,
              status = ?,
              number = ?,
              reading_minutes = ?,
              published_at = ?,
              updated_at = ?,
              source_path = ?,
              source_sha256 = ?,
              content_sha256 = ?,
              revision = ?,
              imported_at = ?,
              modified_at = ?
            WHERE id = ?
          `,
        )
        .run(
          input.sourceDocumentId,
          input.slug,
          input.title,
          input.summary,
          input.deck,
          input.bodyMarkdown,
          tagsJson,
          input.featured ? 1 : 0,
          input.status,
          input.number,
          input.readingMinutes,
          input.publishedAt,
          input.updatedAt,
          input.sourcePath,
          input.sourceSha256,
          input.contentSha256,
          revision,
          now,
          now,
          existing.id,
        );

      articleId = existing.id;
    } else {
      const result = database
        .prepare(
          `
            INSERT INTO articles (
              source_document_id,
              slug,
              title,
              summary,
              deck,
              body_markdown,
              tags_json,
              featured,
              status,
              number,
              reading_minutes,
              published_at,
              updated_at,
              source_path,
              source_sha256,
              content_sha256,
              revision,
              imported_at,
              created_at,
              modified_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
          `,
        )
        .run(
          input.sourceDocumentId,
          input.slug,
          input.title,
          input.summary,
          input.deck,
          input.bodyMarkdown,
          tagsJson,
          input.featured ? 1 : 0,
          input.status,
          input.number,
          input.readingMinutes,
          input.publishedAt,
          input.updatedAt,
          input.sourcePath,
          input.sourceSha256,
          input.contentSha256,
          now,
          now,
          now,
        );

      articleId = Number(result.lastInsertRowid);
    }

    database
      .prepare("DELETE FROM article_assets WHERE article_id = ?")
      .run(articleId);

    const insertAsset = database.prepare(
      `
        INSERT INTO article_assets (
          article_id,
          storage_key,
          public_url,
          source_path,
          media_type,
          width,
          height,
          byte_size,
          sha256,
          alt_text,
          caption,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    for (const asset of assets) {
      insertAsset.run(
        articleId,
        asset.storageKey,
        asset.publicUrl,
        asset.sourcePath,
        asset.mediaType,
        asset.width,
        asset.height,
        asset.byteSize,
        asset.sha256,
        asset.altText,
        asset.caption,
        asset.sortOrder,
      );
    }

    database.exec("COMMIT;");

    const stored = database
      .prepare("SELECT * FROM articles WHERE id = ? LIMIT 1")
      .get(articleId) as unknown as ArticleRow | undefined;

    if (!stored) {
      throw new Error("Article disappeared after a successful transaction.");
    }

    return mapArticleRow(stored);
  } catch (error) {
    if (database.isTransaction) {
      database.exec("ROLLBACK;");
    }
    throw error;
  }
}
