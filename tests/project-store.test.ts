import assert from "node:assert/strict";
import test from "node:test";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import {
  getStoredProjectBySlug,
  listPublishedProjects,
  upsertProject,
  type ProjectInput,
} from "../src/lib/server/project-store.ts";

function makeProject(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    slug: "burns-blog",
    githubFullName: "Burns1028/personal-blog",
    title: "Burns Blog",
    summary: "个人写作、项目与灵感的长期档案。",
    repoUrl: "https://github.com/Burns1028/personal-blog",
    demoUrl: null,
    language: "TypeScript",
    status: "active",
    featured: false,
    publishedAt: "2026-08-02",
    updatedAt: "2026-08-02T20:00:00+08:00",
    ...overrides,
  };
}

test("project upserts are idempotent by slug", () => {
  const database = createArticleDatabase(":memory:");

  try {
    const first = upsertProject(makeProject(), database);
    const updated = upsertProject(
      makeProject({ summary: "修订后的项目说明。", status: "maintained" }),
      database,
    );

    assert.equal(first.id, updated.id);
    assert.equal(
      getStoredProjectBySlug("burns-blog", database)?.summary,
      "修订后的项目说明。",
    );
    assert.equal(listPublishedProjects(database).length, 1);
  } finally {
    database.close();
  }
});

test("published projects sort featured first and exclude archived records", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertProject(
      makeProject({
        slug: "older-featured",
        githubFullName: "Burns1028/older-featured",
        repoUrl: "https://github.com/Burns1028/older-featured",
        featured: true,
        updatedAt: "2026-07-01",
      }),
      database,
    );
    upsertProject(
      makeProject({
        slug: "newer",
        githubFullName: "Burns1028/newer",
        repoUrl: "https://github.com/Burns1028/newer",
        updatedAt: "2026-08-01",
      }),
      database,
    );
    upsertProject(
      makeProject({
        slug: "archived",
        githubFullName: "Burns1028/archived",
        repoUrl: "https://github.com/Burns1028/archived",
        status: "archived",
      }),
      database,
    );

    assert.deepEqual(
      listPublishedProjects(database).map((project) => project.slug),
      ["older-featured", "newer"],
    );
  } finally {
    database.close();
  }
});

test("project input validation requires a matching GitHub repository URL", () => {
  const database = createArticleDatabase(":memory:");

  try {
    assert.throws(
      () =>
        upsertProject(
          makeProject({ repoUrl: "https://github.com/Burns1028/another" }),
          database,
        ),
      /repoUrl/,
    );
    assert.throws(
      () => upsertProject(makeProject({ githubFullName: "Burns1028" }), database),
      /githubFullName/,
    );
  } finally {
    database.close();
  }
});

test("project schema migrates legacy tables with display order", () => {
  const database = createArticleDatabase(":memory:");

  try {
    database.exec(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        github_full_name TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        repo_url TEXT NOT NULL UNIQUE,
        demo_url TEXT,
        language TEXT NOT NULL,
        status TEXT NOT NULL,
        featured INTEGER NOT NULL,
        published_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        modified_at TEXT NOT NULL
      ) STRICT
    `);

    upsertProject(makeProject({ displayOrder: 20 }), database);

    const columns = database
      .prepare("PRAGMA table_info(projects)")
      .all() as Array<{ name: string }>;
    assert.equal(
      columns.some((column) => column.name === "display_order"),
      true,
    );
    assert.equal(
      getStoredProjectBySlug("burns-blog", database)?.displayOrder,
      20,
    );
  } finally {
    database.close();
  }
});

test("manual project order precedes the existing fallback order", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertProject(
      makeProject({
        slug: "akka",
        githubFullName: "Burns1028/akka",
        repoUrl: "https://github.com/Burns1028/akka",
        displayOrder: 30,
        updatedAt: "2026-03-10",
      }),
      database,
    );
    upsertProject(
      makeProject({
        slug: "anyhark",
        githubFullName: "Burns1028/anyhark",
        repoUrl: "https://github.com/Burns1028/anyhark",
        displayOrder: 10,
        updatedAt: "2026-08-08",
      }),
      database,
    );
    upsertProject(
      makeProject({
        slug: "burns-skill",
        githubFullName: "Burns1028/burns-skill",
        repoUrl: "https://github.com/Burns1028/burns-skill",
        displayOrder: 20,
        updatedAt: "2026-08-09",
      }),
      database,
    );
    upsertProject(
      makeProject({
        slug: "newest",
        githubFullName: "Burns1028/newest",
        repoUrl: "https://github.com/Burns1028/newest",
        updatedAt: "2026-08-10",
      }),
      database,
    );

    assert.deepEqual(
      listPublishedProjects(database).map((project) => project.slug),
      ["anyhark", "burns-skill", "akka", "newest"],
    );
  } finally {
    database.close();
  }
});

test("omitted display order preserves it and explicit null clears it", () => {
  const database = createArticleDatabase(":memory:");

  try {
    upsertProject(makeProject({ displayOrder: 10 }), database);
    upsertProject(makeProject({ summary: "Metadata-only update" }), database);
    assert.equal(
      getStoredProjectBySlug("burns-blog", database)?.displayOrder,
      10,
    );

    upsertProject(makeProject({ displayOrder: null }), database);
    assert.equal(
      getStoredProjectBySlug("burns-blog", database)?.displayOrder,
      null,
    );
  } finally {
    database.close();
  }
});

test("display order rejects non-integers and out-of-range values", () => {
  const database = createArticleDatabase(":memory:");

  try {
    assert.throws(
      () => upsertProject(makeProject({ displayOrder: 0 }), database),
      /displayOrder/,
    );
    assert.throws(
      () => upsertProject(makeProject({ displayOrder: 1.5 }), database),
      /displayOrder/,
    );
    assert.throws(
      () => upsertProject(makeProject({ displayOrder: 100001 }), database),
      /displayOrder/,
    );
  } finally {
    database.close();
  }
});
