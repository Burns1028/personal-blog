#!/usr/bin/env node
import { signedPublishRequest } from "../../_shared/publish-client.mjs";
import { applyDisplayOrder } from "./project-options.mjs";

function parseArguments(argv) {
  const options = { featured: false, validate: false };
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

function required(options, key) {
  const value = options[key]?.trim();
  if (!value) throw new Error(`Missing required --${key}`);
  return value;
}

function repository(value) {
  const fullName = value
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) {
    throw new Error("--repo must be a GitHub owner/repository or repository URL");
  }
  return { fullName, url: `https://github.com/${fullName}` };
}

async function fetchRepository(fullName) {
  const apiBase = (process.env.GITHUB_API_BASE_URL || "https://api.github.com").replace(/\/$/, "");
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "burns-blog-project-publisher",
    "x-github-api-version": "2026-03-10",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(`${apiBase}/repos/${fullName}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub repository lookup failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.name !== "string" ||
    typeof data.full_name !== "string" ||
    typeof data.html_url !== "string" ||
    typeof data.created_at !== "string" ||
    typeof data.updated_at !== "string"
  ) {
    throw new Error("GitHub repository response is incomplete");
  }
  if (data.full_name.toLowerCase() !== fullName.toLowerCase()) {
    throw new Error("GitHub repository response does not match --repo");
  }
  return data;
}

const options = parseArguments(process.argv.slice(2));
const repo = repository(required(options, "repo"));
const metadata = await fetchRepository(repo.fullName);
const slug = (options.slug?.trim() || metadata.name)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const baseProject = {
  slug,
  githubFullName: metadata.full_name,
  title: options["project-title"]?.trim() || metadata.name,
  summary:
    options["project-summary"]?.trim() ||
    metadata.description?.trim() ||
    `${metadata.full_name} 的开源项目。`,
  repoUrl: metadata.html_url.replace(/\/$/, ""),
  demoUrl: options["demo-url"]?.trim() || metadata.homepage?.trim() || null,
  language: options.language?.trim() || metadata.language?.trim() || "未标注",
  status:
    options["project-status"]?.trim() ||
    (metadata.archived || metadata.disabled ? "archived" : "active"),
  featured: options.featured,
  publishedAt: options["project-published-at"]?.trim() || metadata.created_at,
  updatedAt:
    options["project-updated-at"]?.trim() ||
    metadata.pushed_at ||
    metadata.updated_at,
};
const project = applyDisplayOrder(baseProject, options["display-order"]);

const result = await signedPublishRequest(
  options.validate ? "/api/publish/projects/validate" : "/api/publish/projects",
  { method: options.validate ? "POST" : "PUT", body: project },
);
if (options.validate) {
  if (result.data?.projectSlug !== slug) {
    throw new Error("Project validation response does not match");
  }
} else if (result.data?.project?.slug !== slug) {
  throw new Error("Project publication response does not match");
}
console.log(JSON.stringify(result, null, 2));
