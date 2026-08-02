#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function isBlogRoot(directory) {
  const packagePath = join(directory, "package.json");
  if (!existsSync(packagePath)) return false;
  try {
    return JSON.parse(readFileSync(packagePath, "utf8")).name === "burns-personal-blog";
  } catch {
    return false;
  }
}

function findBlogRoot(start) {
  let current = resolve(start);
  while (true) {
    if (isBlogRoot(current)) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--project-root");
let configuredRoot;
if (rootIndex >= 0) {
  configuredRoot = args[rootIndex + 1];
  if (!configuredRoot || configuredRoot.startsWith("--")) {
    throw new Error("Missing value for --project-root");
  }
  args.splice(rootIndex, 2);
}

const projectRoot = configuredRoot
  ? resolve(configuredRoot)
  : process.env.BURNS_BLOG_ROOT
    ? resolve(process.env.BURNS_BLOG_ROOT)
    : findBlogRoot(process.cwd());

if (!projectRoot || !isBlogRoot(projectRoot)) {
  throw new Error(
    "Cannot locate burns-personal-blog. Run inside the repository, set BURNS_BLOG_ROOT, or pass --project-root.",
  );
}

const result = spawnSync(
  process.execPath,
  [join(projectRoot, "scripts/import-article.ts"), ...args],
  { cwd: projectRoot, env: process.env, stdio: "inherit" },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
