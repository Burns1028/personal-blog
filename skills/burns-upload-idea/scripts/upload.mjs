#!/usr/bin/env node
import { signedPublishRequest } from "../../_shared/publish-client.mjs";

function parseArguments(argv) {
  const options = { action: "upsert", featured: false, validate: false };
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

function requireOption(options, key) {
  const value = options[key];
  if (!value) throw new Error(`Missing required --${key.replaceAll("_", "-")}`);
  return value;
}

const options = parseArguments(process.argv.slice(2));
if (!["upsert", "list", "get", "delete"].includes(options.action)) throw new Error("Idea action is invalid");
let result;

if (options.action === "list") {
  const status = options.status ?? "published";
  result = await signedPublishRequest(`/api/publish/ideas?status=${encodeURIComponent(status)}`);
} else {
  const sourceKey = requireOption(options, "source-key");
  const endpoint = `/api/publish/ideas/${encodeURIComponent(sourceKey)}`;
  if (options.action === "get") {
    result = await signedPublishRequest(endpoint);
  } else if (options.action === "delete") {
    if (options["confirm-delete"] !== sourceKey) {
      throw new Error(`Deletion requires --confirm-delete ${sourceKey}`);
    }
    result = await signedPublishRequest(endpoint, {
      method: "DELETE",
      headers: { "x-burns-confirm-delete": sourceKey },
    });
  } else {
    const payload = {
      sourceKey,
      text: requireOption(options, "text"),
      theme: requireOption(options, "theme"),
      capturedAt: requireOption(options, "captured-at"),
      status: options.status ?? "draft",
      featured: options.featured,
    };
    result = await signedPublishRequest(
      options.validate ? `${endpoint}/validate` : endpoint,
      { method: options.validate ? "POST" : "PUT", body: payload },
    );
    if (result.data?.sourceKey !== sourceKey) throw new Error("Publishing response sourceKey does not match");
  }
}

console.log(JSON.stringify(result, null, 2));
