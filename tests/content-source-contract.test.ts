import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

test("Writing reads only from the SQLite catalog", () => {
  const catalog = source("src/lib/server/writing-catalog.ts");
  const detail = source("src/pages/writing/[...slug].astro");

  assert.doesNotMatch(catalog, /astro:content|getCollection|CollectionEntry/);
  assert.doesNotMatch(detail, /astro:content|render\(post\.contentEntry\)/);
  assert.match(catalog, /listPublishedArticles/);
  assert.match(detail, /getStoredArticleBySlug/);
});

test("Ideas and Projects pages read their SQLite stores", () => {
  const ideas = source("src/pages/ideas/index.astro");
  const projects = source("src/pages/projects/index.astro");

  assert.match(ideas, /listPublishedIdeas/);
  assert.doesNotMatch(ideas, /data\/ideas|import\s+\{\s*ideas\s*\}/);
  assert.match(projects, /listPublishedProjects/);
  assert.doesNotMatch(projects, /getCollection\("projects"\)|astro:content/);
});

test("homepage navigation does not depend on mock content records", () => {
  const homepage = source("src/pages/index.astro");
  const orrery = source("src/components/HomeOrrery.astro");

  assert.doesNotMatch(homepage, /getCollection|data\/ideas|featuredProject|featuredIdea/);
  assert.match(homepage, /<HomeOrrery\s*\/>/);
  assert.match(orrery, /href="\/projects"[\s\S]*?aria-label="进入 Projects"/);
  assert.match(orrery, /href="\/writing"[\s\S]*?aria-label="进入 Writing"/);
  assert.match(orrery, /href="\/ideas"[\s\S]*?aria-label="进入 Ideas"/);
});

test("homepage redesign preserves each destination's signature visual", () => {
  const projectsEarth = source("src/components/projects/RotatingEarth.astro");
  const writing = source("src/pages/writing/index.astro");
  const ideas = source("src/components/IdeasSingularity.astro");

  assert.match(projectsEarth, /data-projects-earth-motion/);
  assert.match(writing, /archiveAssets\.writing\.atlas/);
  assert.match(ideas, /ideas-journal__singularity/);
});

test("runtime content directories contain no mock Writing or Projects records", () => {
  const writingDirectory = resolve(root, "src/content/writing");
  const projectsDirectory = resolve(root, "src/content/projects");
  const ideasModule = resolve(root, "src/data/ideas.ts");

  const contentFiles = (directory: string) =>
    existsSync(directory)
      ? readdirSync(directory).filter((name) => /\.(?:md|mdx)$/i.test(name))
      : [];

  assert.deepEqual(contentFiles(writingDirectory), []);
  assert.deepEqual(contentFiles(projectsDirectory), []);
  assert.equal(existsSync(ideasModule), false);
});

test("runtime content and credentials stay outside Git", () => {
  const ignore = source(".gitignore");

  assert.match(ignore, /^data\/\*\.sqlite$/m);
  assert.match(ignore, /^public\/media\/$/m);
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\*\.key$/m);
});
