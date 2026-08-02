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
