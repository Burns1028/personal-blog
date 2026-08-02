import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import sharp from "sharp";
import {
  createArticleDatabase,
  resolveBlogDatabasePath,
  upsertArticle,
  type ArticleAssetInput,
  type ArticleStatus,
} from "../src/lib/server/content-store.ts";

interface CliOptions {
  file?: string;
  slug?: string;
  summary?: string;
  deck?: string;
  tags?: string;
  status?: string;
  number?: string;
  readingMinutes?: string;
  publishedAt?: string;
  updatedAt?: string;
  database?: string;
  mediaDir?: string;
  featured?: boolean;
}

interface ImportedMedia {
  markdown: string;
  assets: ArticleAssetInput[];
}

const imagePattern =
  /!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["']([^"']*)["'])?\)/g;

function parseArguments(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith("--")) {
      options.file ??= argument;
      continue;
    }

    const key = argument.slice(2);
    if (key === "featured") {
      options.featured = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "file":
        options.file = value;
        break;
      case "slug":
        options.slug = value;
        break;
      case "summary":
        options.summary = value;
        break;
      case "deck":
        options.deck = value;
        break;
      case "tags":
        options.tags = value;
        break;
      case "status":
        options.status = value;
        break;
      case "number":
        options.number = value;
        break;
      case "reading-minutes":
        options.readingMinutes = value;
        break;
      case "published-at":
        options.publishedAt = value;
        break;
      case "updated-at":
        options.updatedAt = value;
        break;
      case "database":
        options.database = value;
        break;
      case "media-dir":
        options.mediaDir = value;
        break;
      default:
        throw new Error(`Unknown option --${key}`);
    }
  }

  return options;
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

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map(stripMarkdown)
    .filter((paragraph) => paragraph.length >= 18);
  const firstParagraph = paragraphs[0] ?? "一篇尚未补充摘要的文章。";

  return firstParagraph.length > 92
    ? `${firstParagraph.slice(0, 91)}…`
    : firstParagraph;
}

function calculateReadingMinutes(markdown: string): number {
  const readableText = stripMarkdown(markdown);
  const hanCharacters = readableText.match(/[\p{Script=Han}]/gu)?.length ?? 0;
  const latinWords =
    readableText.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;

  return Math.max(1, Math.ceil(hanCharacters / 420 + latinWords / 220));
}

function validateSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `Invalid slug "${value}". Use lowercase ASCII letters, numbers, and single hyphens.`,
    );
  }
  return slug;
}

function deriveSlug(
  sourcePath: string,
  frontmatter: Record<string, unknown>,
): string {
  const explicit = stringValue(frontmatter.slug);
  if (explicit) return validateSlug(explicit);

  const parentDirectory = basename(dirname(sourcePath));
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parentDirectory)) {
    return parentDirectory;
  }

  const documentId = stringValue(frontmatter.document_id);
  if (documentId) {
    return `article-${documentId.slice(-8).toLowerCase()}`;
  }

  return `article-${sha256(sourcePath).slice(0, 10)}`;
}

function normalizeDate(value: string | undefined, label: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return value.length === 10 ? value : date.toISOString();
}

function captionAfter(markdown: string, imageEnd: number): string | null {
  const afterImage = markdown.slice(imageEnd);
  const nextParagraph = afterImage.match(/^\s*\n\s*\n([^\n]+)(?:\n\s*\n|$)/);
  if (!nextParagraph) return null;

  const candidate = nextParagraph[1].trim();
  if (
    !(
      /^\*[\s\S]+\*$/.test(candidate) ||
      /^(?:图\s*[:：]|第[一二三四五六七八九十]+版\s*[:：])/.test(candidate)
    )
  ) {
    return null;
  }

  return stripMarkdown(candidate);
}

function markdownAlt(value: string): string {
  return value.replace(/[[\]\\]/g, "\\$&").replace(/\s+/g, " ").trim();
}

async function importMedia(
  markdown: string,
  sourcePath: string,
  slug: string,
  configuredMediaDirectory?: string,
): Promise<ImportedMedia> {
  const mediaRoot = resolve(
    process.cwd(),
    configuredMediaDirectory ?? "public/media/articles",
  );
  const outputDirectory = join(mediaRoot, slug);
  mkdirSync(outputDirectory, { recursive: true });

  const matches = [...markdown.matchAll(imagePattern)];
  const assets: ArticleAssetInput[] = [];
  const replacements = new Map<number, string>();
  const importedBySource = new Map<
    string,
    { publicUrl: string; asset: ArticleAssetInput }
  >();

  for (const [index, match] of matches.entries()) {
    if (match.index === undefined) continue;

    const originalAlt = match[1];
    const url = match[2] ?? match[3];
    if (!url || /^(?:https?:)?\/\//.test(url) || url.startsWith("data:")) {
      continue;
    }

    const candidatePath = isAbsolute(url)
      ? url
      : resolve(dirname(sourcePath), url);

    if (!existsSync(candidatePath)) {
      if (url.startsWith("/Users/") || url.startsWith("/home/")) {
        throw new Error(`Local image does not exist: ${candidatePath}`);
      }
      continue;
    }

    const cached = importedBySource.get(candidatePath);
    if (cached) {
      replacements.set(
        match.index,
        `![${markdownAlt(originalAlt || cached.asset.altText)}](${cached.publicUrl})`,
      );
      continue;
    }

    const sourceBuffer = readFileSync(candidatePath);
    const sourceHash = sha256(sourceBuffer);
    const outputName = `${String(index + 1).padStart(2, "0")}-${sourceHash.slice(0, 12)}.webp`;
    const outputPath = join(outputDirectory, outputName);
    const outputInfo = await sharp(sourceBuffer)
      .rotate()
      .resize({
        width: 1_600,
        withoutEnlargement: true,
      })
      .webp({
        quality: 86,
        effort: 5,
        smartSubsample: true,
      })
      .toFile(outputPath);

    const publicUrl = `/media/articles/${slug}/${outputName}`;
    const caption = captionAfter(markdown, match.index + match[0].length);
    const altText =
      originalAlt.trim().toLowerCase() === "image" || !originalAlt.trim()
        ? caption ?? `文章配图 ${index + 1}`
        : originalAlt.trim();
    const storageKey = relative(resolve(process.cwd(), "public"), outputPath);
    const asset: ArticleAssetInput = {
      storageKey,
      publicUrl,
      sourcePath: candidatePath,
      mediaType: "image/webp",
      width: outputInfo.width,
      height: outputInfo.height,
      byteSize: outputInfo.size,
      sha256: sourceHash,
      altText,
      caption,
      sortOrder: index,
    };

    assets.push(asset);
    importedBySource.set(candidatePath, { publicUrl, asset });
    replacements.set(
      match.index,
      `![${markdownAlt(altText)}](${publicUrl})`,
    );
  }

  if (replacements.size === 0) {
    return { markdown, assets };
  }

  let cursor = 0;
  let rewritten = "";

  for (const match of matches) {
    if (match.index === undefined) continue;
    const replacement = replacements.get(match.index);
    if (!replacement) continue;

    rewritten += markdown.slice(cursor, match.index);
    rewritten += replacement;
    cursor = match.index + match[0].length;
  }

  rewritten += markdown.slice(cursor);

  return { markdown: rewritten, assets };
}

function printUsage(): void {
  console.log(`
Import a trusted local Markdown article into the blog SQLite database.

Usage:
  npm run content:import -- --file /absolute/article.md [options]

Options:
  --slug ai-aesthetics
  --summary "用于列表与 SEO 的摘要"
  --deck "文章页标题下方的导语"
  --tags "AI,审美,产品设计"
  --status draft|published|archived
  --number "WR—004"
  --reading-minutes 8
  --published-at 2026-07-31
  --updated-at 2026-07-31
  --database ./data/blog.sqlite
  --media-dir public/media/articles
  --featured
  `);
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  if (!options.file) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const sourcePath = resolve(options.file);
  if (!existsSync(sourcePath)) {
    throw new Error(`Markdown file does not exist: ${sourcePath}`);
  }

  const source = readFileSync(sourcePath, "utf8");
  const parsed = parseFrontmatter(source);
  const frontmatter = parsed.frontmatter as Record<string, unknown>;
  const title = stringValue(frontmatter.title);

  if (!title) {
    throw new Error("The article frontmatter must include a non-empty title.");
  }

  const slug = validateSlug(
    options.slug ?? deriveSlug(sourcePath, frontmatter),
  );
  const statusValue =
    options.status ?? stringValue(frontmatter.status) ?? "draft";
  if (!["draft", "published", "archived"].includes(statusValue)) {
    throw new Error(`Invalid status: ${statusValue}`);
  }
  const status = statusValue as ArticleStatus;
  const importedMedia = await importMedia(
    parsed.content.trimStart(),
    sourcePath,
    slug,
    options.mediaDir,
  );
  const summary =
    options.summary ??
    stringValue(frontmatter.summary) ??
    deriveSummary(importedMedia.markdown);
  const readingMinutes =
    Number(
      options.readingMinutes ??
        frontmatter.readingMinutes ??
        frontmatter.reading_minutes,
    ) || calculateReadingMinutes(importedMedia.markdown);
  const tags = (
    options.tags
      ? options.tags.split(",")
      : Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : []
  )
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const publishedAt = normalizeDate(
    options.publishedAt ??
      dateValue(frontmatter.publishedAt) ??
      dateValue(frontmatter.published_at) ??
      (status === "published" ? today : undefined),
    "published date",
  );
  const updatedAt = normalizeDate(
    options.updatedAt ??
      dateValue(frontmatter.updatedAt) ??
      dateValue(frontmatter.updated_at),
    "updated date",
  );
  const documentId =
    stringValue(frontmatter.document_id) ??
    stringValue(frontmatter.documentId) ??
    null;
  const number =
    options.number ??
    stringValue(frontmatter.number) ??
    `WR—${documentId?.slice(-4).toUpperCase() ?? sha256(slug).slice(0, 4).toUpperCase()}`;
  const contentSha256 = sha256(importedMedia.markdown);
  const databasePath = resolveBlogDatabasePath(options.database);
  const database = createArticleDatabase(databasePath);

  try {
    const article = upsertArticle(
      {
        sourceDocumentId: documentId,
        slug,
        title,
        summary,
        deck:
          options.deck ??
          stringValue(frontmatter.deck) ??
          summary,
        bodyMarkdown: importedMedia.markdown,
        tags,
        featured:
          options.featured ??
          (typeof frontmatter.featured === "boolean"
            ? frontmatter.featured
            : false),
        status,
        number,
        readingMinutes: Math.max(1, Math.round(readingMinutes)),
        publishedAt,
        updatedAt,
        sourcePath,
        sourceSha256: sha256(source),
        contentSha256,
      },
      importedMedia.assets,
      database,
    );

    console.log(
      JSON.stringify(
        {
          database: databasePath,
          article: {
            id: article.id,
            slug: article.slug,
            status: article.status,
            revision: article.revision,
            url: `/writing/${article.slug}`,
          },
          assets: importedMedia.assets.map((asset) => ({
            url: asset.publicUrl,
            width: asset.width,
            height: asset.height,
            bytes: asset.byteSize,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    database.close();
  }
}

await main();
