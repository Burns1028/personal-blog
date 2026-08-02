#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import { signedPublishRequest } from "../../_shared/publish-client.mjs";

function parseArguments(argv) {
  const options = { action: "upsert", status: "draft", featured: false, validate: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--featured" || argument === "--validate") {
      options[argument.slice(2)] = true;
      continue;
    }
    if (!argument.startsWith("--")) throw new Error(`Unknown argument: ${argument}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[argument.slice(2)] = value;
  }
  return options;
}

function setFrontmatterValue(source, key, value) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("Article Markdown must begin with frontmatter");
  const line = `${key}: ${value}`;
  const pattern = new RegExp(`^${key}\\s*:.*$`, "m");
  const frontmatter = pattern.test(match[1])
    ? match[1].replace(pattern, line)
    : `${match[1]}\n${line}`;
  return source.replace(match[0], `---\n${frontmatter}\n---`);
}

function mediaType(path) {
  switch (extname(path).toLowerCase()) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".avif": return "image/avif";
    default: throw new Error(`Unsupported local image type: ${path}`);
  }
}

function packageLocalImages(markdown, sourceFile) {
  const pattern = /!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["']([^"']*)["'])?\)/g;
  const matches = [...markdown.matchAll(pattern)];
  const replacements = new Map();
  const assets = [];
  const byFile = new Map();

  for (const [index, match] of matches.entries()) {
    if (match.index === undefined) continue;
    const rawUrl = match[2] ?? match[3];
    if (!rawUrl || /^(?:https?:)?\/\//.test(rawUrl) || rawUrl.startsWith("data:") || rawUrl.startsWith("/media/")) continue;
    const decoded = decodeURIComponent(rawUrl);
    const file = isAbsolute(decoded) ? decoded : resolve(dirname(sourceFile), decoded);
    if (!existsSync(file)) throw new Error(`Local article image does not exist: ${file}`);
    let sourcePath = byFile.get(file);
    if (!sourcePath) {
      sourcePath = `assets/${String(index + 1).padStart(2, "0")}-${basename(file)}`;
      byFile.set(file, sourcePath);
      assets.push({
        sourcePath,
        mediaType: mediaType(file),
        contentBase64: readFileSync(file).toString("base64"),
      });
    }
    replacements.set(match.index, `![${match[1]}](${sourcePath})`);
  }

  if (replacements.size === 0) return { markdown, assets };
  let cursor = 0;
  let rewritten = "";
  for (const match of matches) {
    if (match.index === undefined) continue;
    const replacement = replacements.get(match.index);
    if (!replacement) continue;
    rewritten += markdown.slice(cursor, match.index) + replacement;
    cursor = match.index + match[0].length;
  }
  return { markdown: rewritten + markdown.slice(cursor), assets };
}

const options = parseArguments(process.argv.slice(2));
if (!options.slug) throw new Error("Missing value for --slug");
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) throw new Error("Article slug is invalid");
if (!["upsert", "delete"].includes(options.action)) throw new Error("Article action is invalid");
if (!["draft", "published", "archived"].includes(options.status)) throw new Error("Article status is invalid");

let result;
if (options.action === "delete") {
  if (options.validate) throw new Error("Article deletion cannot use --validate");
  if (options["confirm-delete"] !== options.slug) {
    throw new Error(`Deletion requires --confirm-delete ${options.slug}`);
  }
  result = await signedPublishRequest(
    `/api/publish/articles/${encodeURIComponent(options.slug)}`,
    {
      method: "DELETE",
      headers: { "x-burns-confirm-delete": options.slug },
      body: {},
    },
  );
  if (result.data?.slug !== options.slug || typeof result.data?.deleted !== "boolean") {
    throw new Error("Article deletion response is incomplete");
  }
} else {
  if (!options.file) throw new Error("Missing value for --file");
  const sourceFile = resolve(options.file);
  if (!existsSync(sourceFile)) throw new Error(`Article Markdown does not exist: ${sourceFile}`);
  let markdown = readFileSync(sourceFile, "utf8");
  if (options.number) markdown = setFrontmatterValue(markdown, "number", JSON.stringify(options.number));
  if (options.featured) markdown = setFrontmatterValue(markdown, "featured", "true");
  const packaged = packageLocalImages(markdown, sourceFile);
  const path = options.validate
    ? `/api/publish/articles/${encodeURIComponent(options.slug)}/validate`
    : `/api/publish/articles/${encodeURIComponent(options.slug)}`;
  result = await signedPublishRequest(path, {
    method: options.validate ? "POST" : "PUT",
    body: {
      slug: options.slug,
      status: options.status,
      sourceName: basename(sourceFile),
      markdown: packaged.markdown,
      assets: packaged.assets,
    },
  });

  if (result.data?.slug !== options.slug) throw new Error("Publishing response slug does not match");
  if (result.data?.status !== options.status) throw new Error("Publishing response status does not match");
  if (!options.validate && (!Number.isInteger(result.data?.revision) || !Array.isArray(result.data?.assets))) {
    throw new Error("Publishing response is incomplete");
  }
}
console.log(JSON.stringify(result, null, 2));
