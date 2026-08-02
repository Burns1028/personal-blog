import {
  createArticleDatabase,
  resolveBlogDatabasePath,
} from "../src/lib/server/content-store.ts";
import {
  upsertProject,
  type ProjectStatus,
} from "../src/lib/server/project-store.ts";
import {
  upsertActivity,
  type ActivityKind,
} from "../src/lib/server/activity-store.ts";

interface CliOptions {
  repo?: string;
  slug?: string;
  projectTitle?: string;
  projectSummary?: string;
  language?: string;
  projectStatus?: string;
  projectPublishedAt?: string;
  projectUpdatedAt?: string;
  demoUrl?: string;
  sourceKey?: string;
  occurredAt?: string;
  kind?: string;
  activityTitle?: string;
  activitySummary?: string;
  activityUrl?: string;
  database?: string;
  featured?: boolean;
}

function parseArguments(argv: string[]): CliOptions {
  const options: CliOptions = {};
  const names: Record<string, keyof CliOptions> = {
    repo: "repo",
    slug: "slug",
    "project-title": "projectTitle",
    "project-summary": "projectSummary",
    language: "language",
    "project-status": "projectStatus",
    "project-published-at": "projectPublishedAt",
    "project-updated-at": "projectUpdatedAt",
    "demo-url": "demoUrl",
    "source-key": "sourceKey",
    "occurred-at": "occurredAt",
    kind: "kind",
    "activity-title": "activityTitle",
    "activity-summary": "activitySummary",
    "activity-url": "activityUrl",
    database: "database",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const key = argument.slice(2);

    if (key === "featured") {
      options.featured = true;
      continue;
    }

    const property = names[key];
    if (!property) {
      throw new Error(`Unknown option --${key}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;
    (options[property] as string | undefined) = value;
  }

  return options;
}

function requireOption(
  value: string | undefined,
  optionName: string,
): string {
  if (!value?.trim()) {
    throw new Error(`Missing required option --${optionName}`);
  }
  return value.trim();
}

function normalizeRepository(value: string): {
  fullName: string;
  repoUrl: string;
} {
  const normalized = value
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw new Error("--repo must be a GitHub owner/repository or repository URL.");
  }

  return {
    fullName: normalized,
    repoUrl: `https://github.com/${normalized}`,
  };
}

function deriveSlug(fullName: string): string {
  const name = fullName.split("/")[1] ?? "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function assertEnum<T extends string>(
  value: string,
  optionName: string,
  allowed: readonly T[],
): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid --${optionName}: ${value}`);
  }
  return value as T;
}

function printUsage(): void {
  console.log(`
Publish verified GitHub project metadata and one progress event.

Usage:
  npm run github:progress -- \\
    --repo Burns1028/personal-blog \\
    --project-title "Burns Blog" \\
    --project-summary "真实项目说明" \\
    --language TypeScript \\
    --project-status active \\
    --source-key personal-blog:2026-08-02:sqlite-content \\
    --occurred-at 2026-08-02T21:00:00+08:00 \\
    --kind progress \\
    --activity-title "统一内容后端" \\
    --activity-summary "真实进度说明"

Options:
  --slug burns-blog
  --project-published-at 2026-08-02
  --project-updated-at 2026-08-02T21:00:00+08:00
  --demo-url https://example.com
  --activity-url https://github.com/owner/repo/commit/hash
  --database ./data/blog.sqlite
  --featured
  `);
}

function main(): void {
  const options = parseArguments(process.argv.slice(2));
  if (process.argv.length <= 2) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const repository = normalizeRepository(requireOption(options.repo, "repo"));
  const occurredAt = requireOption(options.occurredAt, "occurred-at");
  const projectStatus = assertEnum(
    requireOption(options.projectStatus, "project-status"),
    "project-status",
    ["active", "maintained", "experiment", "archived"] as const,
  ) as ProjectStatus;
  const kind = assertEnum(
    requireOption(options.kind, "kind"),
    "kind",
    ["progress", "fix", "release", "research", "maintenance"] as const,
  ) as ActivityKind;
  const databasePath = resolveBlogDatabasePath(options.database);
  const database = createArticleDatabase(databasePath);

  database.exec("BEGIN IMMEDIATE;");
  try {
    const project = upsertProject(
      {
        slug: options.slug?.trim() || deriveSlug(repository.fullName),
        githubFullName: repository.fullName,
        title: requireOption(options.projectTitle, "project-title"),
        summary: requireOption(options.projectSummary, "project-summary"),
        repoUrl: repository.repoUrl,
        demoUrl: options.demoUrl?.trim() || null,
        language: requireOption(options.language, "language"),
        status: projectStatus,
        featured: options.featured ?? false,
        publishedAt:
          options.projectPublishedAt?.trim() || occurredAt.slice(0, 10),
        updatedAt: options.projectUpdatedAt?.trim() || occurredAt,
      },
      database,
    );
    const activity = upsertActivity(
      {
        source: "github",
        sourceKey: requireOption(options.sourceKey, "source-key"),
        occurredAt,
        projectSlug: project.slug,
        kind,
        title: requireOption(options.activityTitle, "activity-title"),
        summary: requireOption(options.activitySummary, "activity-summary"),
        url: options.activityUrl?.trim() || project.repoUrl,
      },
      database,
    );
    database.exec("COMMIT;");

    console.log(
      JSON.stringify(
        {
          database: databasePath,
          project: {
            id: project.id,
            slug: project.slug,
            repository: project.githubFullName,
          },
          activity: {
            id: activity.id,
            sourceKey: activity.sourceKey,
            occurredAt: activity.occurredAt,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (database.isTransaction) {
      database.exec("ROLLBACK;");
    }
    throw error;
  } finally {
    database.close();
  }
}

main();
