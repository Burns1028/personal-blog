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
    throw new Error("--repo must be a GitHub owner/repository");
  }
  return { fullName, url: `https://github.com/${fullName}` };
}

const options = parseArguments(process.argv.slice(2));
const repo = repository(required(options, "repo"));
const occurredAt = required(options, "occurred-at");
const slug = options.slug?.trim() || repo.fullName.split("/")[1]
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const baseProject = {
  slug,
  githubFullName: repo.fullName,
  title: required(options, "project-title"),
  summary: required(options, "project-summary"),
  repoUrl: repo.url,
  demoUrl: options["demo-url"]?.trim() || null,
  language: required(options, "language"),
  status: required(options, "project-status"),
  featured: options.featured,
  publishedAt: options["project-published-at"]?.trim() || occurredAt.slice(0, 10),
  updatedAt: options["project-updated-at"]?.trim() || occurredAt,
};
const payload = {
  project: applyDisplayOrder(baseProject, options["display-order"]),
  activity: {
    source: "github",
    sourceKey: required(options, "source-key"),
    occurredAt,
    projectSlug: slug,
    kind: required(options, "kind"),
    title: required(options, "activity-title"),
    summary: required(options, "activity-summary"),
    url: options["activity-url"]?.trim() || repo.url,
  },
};

const result = await signedPublishRequest(
  options.validate
    ? "/api/publish/projects/progress/validate"
    : "/api/publish/projects/progress",
  { method: options.validate ? "POST" : "PUT", body: payload },
);
if (options.validate) {
  if (result.data?.projectSlug !== slug || result.data?.sourceKey !== payload.activity.sourceKey) {
    throw new Error("Project progress validation response does not match");
  }
} else if (
  result.data?.project?.slug !== slug ||
  result.data?.activity?.sourceKey !== payload.activity.sourceKey
) {
  throw new Error("Project progress response does not match");
}
console.log(JSON.stringify(result, null, 2));
