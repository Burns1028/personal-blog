import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

function skillFile(skill: string, path: string): string {
  const absolutePath = resolve(root, "skills", skill, path);
  assert.equal(existsSync(absolutePath), true, `${absolutePath} must exist`);
  return readFileSync(absolutePath, "utf8");
}

test("article publication Skill has one validated upload path", () => {
  const instructions = skillFile("burns-upload-article", "SKILL.md");
  const interfaceYaml = skillFile(
    "burns-upload-article",
    "agents/openai.yaml",
  );
  const runner = skillFile("burns-upload-article", "scripts/upload.mjs");
  skillFile("burns-upload-article", "assets/article-template.md");

  assert.match(instructions, /name: burns-upload-article/);
  assert.match(instructions, /description: Use when/);
  assert.match(instructions, /scripts\/upload\.mjs/);
  assert.match(interfaceYaml, /\$burns-upload-article/);
  assert.match(runner, /_shared\/publish-client\.mjs/);
  assert.match(runner, /x-burns-confirm-delete/);
  assert.match(runner, /method: "DELETE",[\s\S]*?body: \{\}/);
  assert.match(instructions, /## Delete/);
  assert.doesNotMatch(runner, /import-article|BURNS_BLOG_ROOT|project-root|BLOG_DB_PATH/);
  assert.doesNotMatch(instructions, /BURNS_BLOG_ROOT|project-root|BLOG_DB_PATH/);
});

test("idea publication Skill has one validated upload path", () => {
  const instructions = skillFile("burns-upload-idea", "SKILL.md");
  const interfaceYaml = skillFile("burns-upload-idea", "agents/openai.yaml");
  const runner = skillFile("burns-upload-idea", "scripts/upload.mjs");

  assert.match(instructions, /name: burns-upload-idea/);
  assert.match(instructions, /description: Use when/);
  assert.match(instructions, /source-key/);
  assert.match(interfaceYaml, /\$burns-upload-idea/);
  assert.match(runner, /_shared\/publish-client\.mjs/);
  assert.match(runner, /method: "DELETE",[\s\S]*?body: \{\}/);
  assert.doesNotMatch(runner, /import-idea|BURNS_BLOG_ROOT|project-root|BLOG_DB_PATH/);
  assert.doesNotMatch(instructions, /BURNS_BLOG_ROOT|project-root|BLOG_DB_PATH/);
});

test("GitHub progress Skill records verified project facts and activity", () => {
  const instructions = skillFile(
    "burns-update-github-progress",
    "SKILL.md",
  );
  const interfaceYaml = skillFile(
    "burns-update-github-progress",
    "agents/openai.yaml",
  );
  const runner = skillFile(
    "burns-update-github-progress",
    "scripts/upload.mjs",
  );
  const projectRunner = skillFile(
    "burns-update-github-progress",
    "scripts/register-project.mjs",
  );

  assert.match(instructions, /name: burns-update-github-progress/);
  assert.match(instructions, /description: Use when/);
  assert.match(instructions, /verified|核对/i);
  assert.match(instructions, /Register a repository only/);
  assert.match(instructions, /does not create an activity/i);
  assert.match(instructions, /历史日期/);
  assert.match(runner, /occurred-at/);
  assert.match(instructions, /display-order/);
  assert.match(runner, /display-order/);
  assert.match(projectRunner, /display-order/);
  assert.match(interfaceYaml, /\$burns-update-github-progress/);
  assert.match(interfaceYaml, /项目与进度/);
  assert.match(runner, /_shared\/publish-client\.mjs/);
  assert.match(projectRunner, /_shared\/publish-client\.mjs/);
  assert.match(projectRunner, /\/api\/publish\/projects/);
  assert.doesNotMatch(projectRunner, /activity|source-key|occurred-at/);
  assert.doesNotMatch(runner, /import-github-progress|BURNS_BLOG_ROOT|project-root|BLOG_DB_PATH/);
  assert.doesNotMatch(instructions, /BURNS_BLOG_ROOT|project-root|BLOG_DB_PATH/);
});
