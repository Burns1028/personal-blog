import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, posix } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import sharp from "sharp";
import {
  upsertArticle,
  type ArticleAssetInput,
  type ArticleStatus,
  type StoredArticle,
} from "./content-store.ts";

export interface ArticlePackageAsset {
  sourcePath: string;
  mediaType: string;
  contentBase64: string;
}

export interface ArticlePublishPackage {
  slug: string;
  status: ArticleStatus;
  sourceName: string;
  markdown: string;
  assets: ArticlePackageAsset[];
}

export interface ArticlePublishOptions {
  database: DatabaseSync;
  mediaRoot: string;
  validateOnly: boolean;
}

interface PublishedAsset {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

interface PreparedAsset extends PublishedAsset {
  outputName: string;
  sourcePath: string;
  sourceSha256: string;
  buffer: Buffer;
  altText: string;
  sortOrder: number;
}

export interface ArticlePublishResult {
  validated: boolean;
  article: Pick<StoredArticle, "slug" | "status" | "revision">;
  assets: PublishedAsset[];
}

const imagePattern =
  /!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["']([^"']*)["'])?\)/g;
const MAX_ASSETS = 40;
const MAX_ASSET_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 32 * 1024 * 1024;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function dateValue(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  return stringValue(value);
}

function normalizeDate(value: string | undefined, label: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new TypeError(`${label} is invalid.`);
  return value.length === 10 ? value : parsed.toISOString();
}

function validateSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new TypeError("Article slug is invalid.");
  }
  return slug;
}

function normalizeAssetPath(value: string): string {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\0")
  ) {
    throw new TypeError(`Article asset path is unsafe: ${value}`);
  }

  const normalized = posix.normalize(value);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    throw new TypeError(`Article asset path is unsafe: ${value}`);
  }
  return normalized.replace(/^\.\//, "");
}

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveSummary(markdown: string): string {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map(stripMarkdown)
    .find((candidate) => candidate.length >= 18) ?? "一篇尚未补充摘要的文章。";
  return paragraph.length > 92 ? `${paragraph.slice(0, 91)}…` : paragraph;
}

function readingMinutes(markdown: string, configured: unknown): number {
  const parsed = Number.parseInt(String(configured ?? ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  const text = stripMarkdown(markdown);
  const han = text.match(/[\p{Script=Han}]/gu)?.length ?? 0;
  const words = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;
  return Math.max(1, Math.ceil(han / 420 + words / 220));
}

function decodeAsset(asset: ArticlePackageAsset): Buffer {
  if (!/^image\/(?:png|jpeg|webp|gif|avif)$/i.test(asset.mediaType)) {
    throw new TypeError(`Unsupported article asset media type: ${asset.mediaType}`);
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(asset.contentBase64)) {
    throw new TypeError("Article asset contains invalid Base64.");
  }
  const buffer = Buffer.from(asset.contentBase64, "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_ASSET_BYTES) {
    throw new TypeError("Article asset exceeds the allowed size.");
  }
  return buffer;
}

async function preparePackage(input: ArticlePublishPackage) {
  const slug = validateSlug(input.slug);
  if (!input.sourceName.trim() || basename(input.sourceName) !== input.sourceName) {
    throw new TypeError("Article sourceName must be a plain file name.");
  }
  if (!(["draft", "published", "archived"] as string[]).includes(input.status)) {
    throw new TypeError("Article status is invalid.");
  }
  if (input.assets.length > MAX_ASSETS) {
    throw new TypeError(`Article package may contain at most ${MAX_ASSETS} assets.`);
  }

  const parsed = parseFrontmatter(input.markdown);
  const frontmatter = parsed.frontmatter as Record<string, unknown>;
  const title = stringValue(frontmatter.title);
  if (!title) throw new TypeError("Article frontmatter requires a title.");

  const suppliedAssets = new Map<string, { input: ArticlePackageAsset; buffer: Buffer }>();
  let totalAssetBytes = 0;
  for (const asset of input.assets) {
    const sourcePath = normalizeAssetPath(asset.sourcePath);
    if (suppliedAssets.has(sourcePath)) {
      throw new TypeError(`Duplicate article asset path: ${sourcePath}`);
    }
    const buffer = decodeAsset(asset);
    totalAssetBytes += buffer.byteLength;
    if (totalAssetBytes > MAX_TOTAL_ASSET_BYTES) {
      throw new TypeError("Article package assets exceed the total size limit.");
    }
    suppliedAssets.set(sourcePath, { input: { ...asset, sourcePath }, buffer });
  }

  const matches = [...parsed.content.trimStart().matchAll(imagePattern)];
  const replacements = new Map<number, string>();
  const preparedAssets: PreparedAsset[] = [];
  const usedAssets = new Set<string>();

  for (const [sortOrder, match] of matches.entries()) {
    if (match.index === undefined) continue;
    const rawUrl = match[2] ?? match[3];
    if (!rawUrl || /^(?:https?:)?\/\//.test(rawUrl) || rawUrl.startsWith("data:") || rawUrl.startsWith("/media/")) {
      continue;
    }
    const sourcePath = normalizeAssetPath(decodeURIComponent(rawUrl));
    const supplied = suppliedAssets.get(sourcePath);
    if (!supplied) {
      throw new TypeError(`Article asset is missing from the package: ${sourcePath}`);
    }
    usedAssets.add(sourcePath);
    const sourceSha256 = sha256(supplied.buffer);
    const output = await sharp(supplied.buffer)
      .rotate()
      .resize({ width: 1_600, withoutEnlargement: true })
      .webp({ quality: 86, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    const outputName = `${String(sortOrder + 1).padStart(2, "0")}-${sourceSha256.slice(0, 12)}.webp`;
    const url = `/media/articles/${slug}/${outputName}`;
    const altText = match[1].trim() || `文章配图 ${sortOrder + 1}`;
    preparedAssets.push({
      url,
      width: output.info.width,
      height: output.info.height,
      bytes: output.info.size,
      outputName,
      sourcePath,
      sourceSha256,
      buffer: output.data,
      altText,
      sortOrder,
    });
    replacements.set(match.index, `![${altText}](${url})`);
  }

  for (const sourcePath of suppliedAssets.keys()) {
    if (!usedAssets.has(sourcePath)) {
      throw new TypeError(`Article package contains an unused asset: ${sourcePath}`);
    }
  }

  let bodyMarkdown = parsed.content.trimStart();
  if (replacements.size > 0) {
    let cursor = 0;
    let rewritten = "";
    for (const match of matches) {
      if (match.index === undefined) continue;
      const replacement = replacements.get(match.index);
      if (!replacement) continue;
      rewritten += bodyMarkdown.slice(cursor, match.index);
      rewritten += replacement;
      cursor = match.index + match[0].length;
    }
    bodyMarkdown = `${rewritten}${bodyMarkdown.slice(cursor)}`;
  }

  const summary = stringValue(frontmatter.summary) ?? deriveSummary(bodyMarkdown);
  const publishedAt = normalizeDate(
    dateValue(frontmatter.publishedAt) ?? dateValue(frontmatter.published_at),
    "Article publishedAt",
  );
  if (input.status === "published" && !publishedAt) {
    throw new TypeError("Published articles require publishedAt.");
  }
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const number = stringValue(frontmatter.number) ?? `WR—${sha256(slug).slice(0, 6).toUpperCase()}`;
  const contentSha256 = sha256(
    JSON.stringify({
      slug,
      status: input.status,
      title,
      summary,
      deck: stringValue(frontmatter.deck) ?? null,
      bodyMarkdown,
      tags,
      featured: frontmatter.featured === true,
      number,
      publishedAt,
      assets: preparedAssets.map(({ sourcePath, sourceSha256 }) => ({ sourcePath, sourceSha256 })),
    }),
  );

  return {
    slug,
    bodyMarkdown,
    preparedAssets,
    articleInput: {
      sourceDocumentId: stringValue(frontmatter.document_id) ?? stringValue(frontmatter.documentId) ?? null,
      slug,
      title,
      summary,
      deck: stringValue(frontmatter.deck) ?? summary,
      bodyMarkdown,
      tags,
      featured: frontmatter.featured === true,
      status: input.status,
      number,
      readingMinutes: readingMinutes(bodyMarkdown, frontmatter.readingMinutes ?? frontmatter.readingTime),
      publishedAt,
      updatedAt: normalizeDate(
        dateValue(frontmatter.updatedAt) ?? dateValue(frontmatter.updated_at),
        "Article updatedAt",
      ),
      sourcePath: null,
      sourceSha256: sha256(input.markdown),
      contentSha256,
    },
  };
}

export async function publishArticlePackage(
  input: ArticlePublishPackage,
  options: ArticlePublishOptions,
): Promise<ArticlePublishResult> {
  const prepared = await preparePackage(input);
  const publicAssets = prepared.preparedAssets.map(({ url, width, height, bytes }) => ({
    url,
    width,
    height,
    bytes,
  }));

  if (options.validateOnly) {
    return {
      validated: true,
      article: { slug: prepared.slug, status: input.status, revision: 0 },
      assets: publicAssets,
    };
  }

  mkdirSync(options.mediaRoot, { recursive: true });
  const stageDirectory = mkdtempSync(join(options.mediaRoot, ".publish-"));
  chmodSync(stageDirectory, 0o750);
  const finalDirectory = join(options.mediaRoot, prepared.slug);
  const backupDirectory = join(
    options.mediaRoot,
    `.backup-${prepared.slug}-${randomUUID()}`,
  );
  let backedUp = false;
  let installed = false;

  try {
    for (const asset of prepared.preparedAssets) {
      writeFileSync(join(stageDirectory, asset.outputName), asset.buffer, { mode: 0o644 });
    }
    if (existsSync(finalDirectory)) {
      renameSync(finalDirectory, backupDirectory);
      backedUp = true;
    }
    renameSync(stageDirectory, finalDirectory);
    installed = true;

    const databaseAssets: ArticleAssetInput[] = prepared.preparedAssets.map((asset) => ({
      storageKey: `media/articles/${prepared.slug}/${asset.outputName}`,
      publicUrl: asset.url,
      sourcePath: asset.sourcePath,
      mediaType: "image/webp",
      width: asset.width,
      height: asset.height,
      byteSize: asset.bytes,
      sha256: asset.sourceSha256,
      altText: asset.altText,
      caption: null,
      sortOrder: asset.sortOrder,
    }));
    const article = upsertArticle(
      prepared.articleInput,
      databaseAssets,
      options.database,
    );

    if (backedUp) rmSync(backupDirectory, { recursive: true, force: true });
    return { validated: false, article, assets: publicAssets };
  } catch (error) {
    if (installed) rmSync(finalDirectory, { recursive: true, force: true });
    if (backedUp && existsSync(backupDirectory)) {
      renameSync(backupDirectory, finalDirectory);
    }
    throw error;
  } finally {
    if (existsSync(stageDirectory)) {
      rmSync(stageDirectory, { recursive: true, force: true });
    }
  }
}
