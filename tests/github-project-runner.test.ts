import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";

test("repository registration resolves one GitHub URL into a project-only payload", async () => {
  let published: Record<string, unknown> | undefined;
  const server = createServer((request, response) => {
    if (request.url === "/repos/Burns1028/personal-blog") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          name: "personal-blog",
          full_name: "Burns1028/personal-blog",
          html_url: "https://github.com/Burns1028/personal-blog",
          description: "Burns 的个人网站与长期内容档案。",
          homepage: "https://burnsgao.me",
          language: "TypeScript",
          archived: false,
          disabled: false,
          created_at: "2026-08-02T00:00:00Z",
          updated_at: "2026-08-05T00:00:00Z",
          pushed_at: "2026-08-06T08:00:00Z",
        }),
      );
      return;
    }

    if (request.url === "/api/publish/projects/validate") {
      const chunks: Buffer[] = [];
      request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      request.on("end", () => {
        published = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ data: { validated: true, projectSlug: "personal-blog" } }));
      });
      return;
    }

    response.statusCode = 404;
    response.end();
  });

  await new Promise<void>((resolveListen) =>
    server.listen(0, "127.0.0.1", resolveListen),
  );
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    const runner = resolve(
      import.meta.dirname,
      "../skills/burns-update-github-progress/scripts/register-project.mjs",
    );
    const child = spawn(
      process.execPath,
      [
        runner,
        "--repo",
        "https://github.com/Burns1028/personal-blog",
        "--display-order",
        "20",
        "--validate",
      ],
      {
        env: {
          ...process.env,
          GITHUB_API_BASE_URL: origin,
          BURNS_PUBLISH_URL: origin,
          BURNS_PUBLISH_ALLOW_HTTP: "127.0.0.1",
          BURNS_PUBLISH_KEY_ID: "primary",
          BURNS_PUBLISH_SECRET: "88".repeat(32),
          BURNS_PUBLISH_DISABLE_KEYCHAIN: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const exitCode = await new Promise<number | null>((resolveExit) =>
      child.on("close", resolveExit),
    );

    assert.equal(exitCode, 0, stderr);
    assert.deepEqual(published, {
      slug: "personal-blog",
      githubFullName: "Burns1028/personal-blog",
      title: "personal-blog",
      summary: "Burns 的个人网站与长期内容档案。",
      repoUrl: "https://github.com/Burns1028/personal-blog",
      demoUrl: "https://burnsgao.me",
      language: "TypeScript",
      status: "active",
      featured: false,
      displayOrder: 20,
      publishedAt: "2026-08-02T00:00:00Z",
      updatedAt: "2026-08-06T08:00:00Z",
    });
    assert.equal("activity" in (published ?? {}), false);
  } finally {
    await new Promise<void>((resolveClose, rejectClose) =>
      server.close((error) => (error ? rejectClose(error) : resolveClose())),
    );
  }
});
