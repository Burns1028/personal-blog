import {
  createArticleDatabase,
  resolveBlogDatabasePath,
} from "../src/lib/server/content-store.ts";
import {
  upsertIdea,
  getStoredIdeaBySourceKey,
  listIdeas,
  deleteIdea,
  type IdeaStatus,
} from "../src/lib/server/idea-store.ts";

interface CliOptions {
  action?: string;
  sourceKey?: string;
  text?: string;
  theme?: string;
  capturedAt?: string;
  status?: string;
  database?: string;
  featured?: boolean;
}

function parseArguments(argv: string[]): CliOptions {
  const options: CliOptions = {};

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

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "action":
        options.action = value;
        break;
      case "source-key":
        options.sourceKey = value;
        break;
      case "text":
        options.text = value;
        break;
      case "theme":
        options.theme = value;
        break;
      case "captured-at":
        options.capturedAt = value;
        break;
      case "status":
        options.status = value;
        break;
      case "database":
        options.database = value;
        break;
      default:
        throw new Error(`Unknown option --${key}`);
    }
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

function printUsage(): void {
  console.log(`
Manage ideas in the Burns blog SQLite database.

Usage:
  # Upsert (default)
  npm run idea:upload -- \\
    --source-key observation-2026-08-02 \\
    --text "灵感正文" \\
    --theme "系统" \\
    --captured-at 2026-08-02T20:30:00+08:00 \\
    --status published

  # List
  npm run idea:upload -- --action list [--status published|draft|archived|all]

  # Get one
  npm run idea:upload -- --action get --source-key observation-2026-08-02

  # Delete
  npm run idea:upload -- --action delete --source-key observation-2026-08-02

Options:
  --database ./data/blog.sqlite
  --featured
  `);
}

function main(): void {
  const options = parseArguments(process.argv.slice(2));
  const action = options.action ?? "upsert";

  if (!["upsert", "list", "get", "delete"].includes(action)) {
    throw new Error(`Invalid action: ${action}. Must be upsert, list, get, or delete.`);
  }

  const databasePath = resolveBlogDatabasePath(options.database);
  const database = createArticleDatabase(databasePath);

  try {
    switch (action) {
      case "list": {
        const status = options.status;
        if (status && !["published", "draft", "archived", "all"].includes(status)) {
          throw new Error(
            `Invalid status filter: ${status}. Use published, draft, archived, or all.`,
          );
        }
        const ideas = listIdeas(
          (status as IdeaStatus | "all" | undefined) ?? "published",
          database,
        );
        console.log(JSON.stringify({ ideas, count: ideas.length }, null, 2));
        break;
      }

      case "get": {
        const sourceKey = requireOption(options.sourceKey, "source-key");
        const idea = getStoredIdeaBySourceKey(sourceKey, database);
        if (!idea) {
          console.log(JSON.stringify({ found: false, sourceKey }, null, 2));
          process.exitCode = 1;
        } else {
          console.log(JSON.stringify(idea, null, 2));
        }
        break;
      }

      case "delete": {
        const sourceKey = requireOption(options.sourceKey, "source-key");
        const deleted = deleteIdea(sourceKey, database);
        console.log(
          JSON.stringify({ deleted, sourceKey }, null, 2),
        );
        if (!deleted) {
          process.exitCode = 1;
        }
        break;
      }

      case "upsert":
      default: {
        const status = requireOption(options.status, "status");
        if (!["draft", "published", "archived"].includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }

        const idea = upsertIdea(
          {
            sourceKey: requireOption(options.sourceKey, "source-key"),
            text: requireOption(options.text, "text"),
            theme: requireOption(options.theme, "theme"),
            capturedAt: requireOption(options.capturedAt, "captured-at"),
            status: status as IdeaStatus,
            featured: options.featured ?? false,
          },
          database,
        );

        console.log(
          JSON.stringify(
            {
              database: databasePath,
              idea: {
                id: idea.id,
                sourceKey: idea.sourceKey,
                status: idea.status,
                capturedAt: idea.capturedAt,
              },
            },
            null,
            2,
          ),
        );
        break;
      }
    }
  } finally {
    database.close();
  }
}

main();
