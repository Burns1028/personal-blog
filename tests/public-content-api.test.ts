import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  closeArticleDatabase,
  createArticleDatabase,
} from "../src/lib/server/content-store.ts";
import { upsertIdea } from "../src/lib/server/idea-store.ts";
import { upsertProject } from "../src/lib/server/project-store.ts";
import { GET as getIdeas } from "../src/pages/api/ideas/index.ts";
import { GET as getProjects } from "../src/pages/api/projects/index.ts";

test("Ideas and Projects public APIs expose SQLite metadata", async () => {
  const directory = mkdtempSync(join(tmpdir(), "burns-public-api-"));
  const databasePath = join(directory, "blog.sqlite");
  const previousPath = process.env.BLOG_DB_PATH;

  try {
    process.env.BLOG_DB_PATH = databasePath;
    closeArticleDatabase();
    const database = createArticleDatabase(databasePath);
    upsertIdea(
      {
        sourceKey: "api-observation",
        text: "API 读取真实灵感。",
        theme: "系统",
        capturedAt: "2026-08-02",
        status: "published",
        featured: false,
      },
      database,
    );
    upsertProject(
      {
        slug: "api-project",
        githubFullName: "Burns1028/api-project",
        title: "API Project",
        summary: "API 读取真实项目。",
        repoUrl: "https://github.com/Burns1028/api-project",
        demoUrl: null,
        language: "TypeScript",
        status: "active",
        featured: false,
        displayOrder: 40,
        publishedAt: "2026-08-02",
        updatedAt: "2026-08-02",
      },
      database,
    );
    database.close();

    const ideasResponse = getIdeas();
    const projectsResponse = getProjects();
    const ideas = await ideasResponse.json();
    const projects = await projectsResponse.json();

    assert.equal(ideas.meta.storage, "sqlite");
    assert.equal(ideas.data[0].sourceKey, "api-observation");
    assert.equal(projects.meta.storage, "sqlite");
    assert.equal(projects.data[0].slug, "api-project");
    assert.equal(projects.data[0].displayOrder, 40);
  } finally {
    closeArticleDatabase();
    if (previousPath === undefined) delete process.env.BLOG_DB_PATH;
    else process.env.BLOG_DB_PATH = previousPath;
    rmSync(directory, { recursive: true, force: true });
  }
});
