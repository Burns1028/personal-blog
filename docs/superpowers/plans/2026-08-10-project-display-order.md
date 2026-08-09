# Project Display Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add truthful manual project ordering and publish `anyhark`, `burns-skill`, and `akka` as the first three Projects entries in that order.

**Architecture:** Add an optional `display_order` column through an idempotent SQLite migration and expose it as the tri-state `ProjectInput.displayOrder?: number | null`. Repository publishing clients send the field only when explicitly requested, while the public listing sorts ranked projects first and preserves the existing featured/update ordering for all unranked projects.

**Tech Stack:** TypeScript, Node.js 24, SQLite `node:sqlite`, Astro API routes, Node CLI publishing clients, Aliyun commit-pinned deployment

## Global Constraints

- `displayOrder` accepts only integers from `1` through `100000`, or explicit `null`.
- An omitted `displayOrder` preserves an existing value and inserts `null` for a new project.
- `--display-order none` explicitly clears the stored value; an omitted flag sends no field.
- Ranked projects sort before unranked projects by ascending `displayOrder`.
- Unranked and tied projects retain `featured DESC, updated_at DESC, id DESC` ordering.
- Do not modify project cards, activity ordering, GitHub timestamps, or create a new activity.
- Final production order must begin `anyhark`, `burns-skill`, `akka`.

---

### Task 1: Add the database migration and tri-state store behavior

**Files:**
- Modify: `src/lib/server/project-store.ts`
- Modify: `tests/project-store.test.ts`

**Interfaces:**
- Consumes: existing `ProjectInput` payloads that may omit `displayOrder`.
- Produces: `ProjectInput.displayOrder?: number | null`, `StoredProject.displayOrder: number | null`, idempotent legacy-schema migration, and manual-first listing order.

- [ ] **Step 1: Add failing migration, ordering, preservation, clearing, and validation tests**

Extend `tests/project-store.test.ts` with tests equivalent to:

```ts
test("project schema migrates legacy tables with display order", () => {
  const database = createArticleDatabase(":memory:");
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

  const columns = database.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  assert.equal(columns.some((column) => column.name === "display_order"), true);
  assert.equal(getStoredProjectBySlug("burns-blog", database)?.displayOrder, 20);
  database.close();
});

test("manual project order precedes the existing fallback order", () => {
  const database = createArticleDatabase(":memory:");
  upsertProject(makeProject({ slug: "akka", githubFullName: "Burns1028/akka", repoUrl: "https://github.com/Burns1028/akka", displayOrder: 30, updatedAt: "2026-03-10" }), database);
  upsertProject(makeProject({ slug: "anyhark", githubFullName: "Burns1028/anyhark", repoUrl: "https://github.com/Burns1028/anyhark", displayOrder: 10, updatedAt: "2026-08-08" }), database);
  upsertProject(makeProject({ slug: "burns-skill", githubFullName: "Burns1028/burns-skill", repoUrl: "https://github.com/Burns1028/burns-skill", displayOrder: 20, updatedAt: "2026-08-09" }), database);
  upsertProject(makeProject({ slug: "newest", githubFullName: "Burns1028/newest", repoUrl: "https://github.com/Burns1028/newest", updatedAt: "2026-08-10" }), database);

  assert.deepEqual(listPublishedProjects(database).map((project) => project.slug), [
    "anyhark", "burns-skill", "akka", "newest",
  ]);
  database.close();
});

test("omitted display order preserves it and explicit null clears it", () => {
  const database = createArticleDatabase(":memory:");
  upsertProject(makeProject({ displayOrder: 10 }), database);
  upsertProject(makeProject({ summary: "Metadata-only update" }), database);
  assert.equal(getStoredProjectBySlug("burns-blog", database)?.displayOrder, 10);
  upsertProject(makeProject({ displayOrder: null }), database);
  assert.equal(getStoredProjectBySlug("burns-blog", database)?.displayOrder, null);
  database.close();
});

test("display order rejects non-integers and out-of-range values", () => {
  const database = createArticleDatabase(":memory:");
  assert.throws(() => upsertProject(makeProject({ displayOrder: 0 }), database), /displayOrder/);
  assert.throws(() => upsertProject(makeProject({ displayOrder: 1.5 }), database), /displayOrder/);
  assert.throws(() => upsertProject(makeProject({ displayOrder: 100001 }), database), /displayOrder/);
  database.close();
});
```

- [ ] **Step 2: Run the focused test and confirm the new expectations fail**

Run: `node --test tests/project-store.test.ts`

Expected: FAIL because `displayOrder` is not stored, migrated, or used for ordering.

- [ ] **Step 3: Implement schema migration, mapping, validation, tri-state upsert, and ordering**

In `src/lib/server/project-store.ts`:

```ts
export interface ProjectInput {
  slug: string;
  githubFullName: string;
  title: string;
  summary: string;
  repoUrl: string;
  demoUrl: string | null;
  language: string;
  status: ProjectStatus;
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
  displayOrder?: number | null;
}

export interface StoredProject extends Omit<ProjectInput, "displayOrder"> {
  id: number;
  displayOrder: number | null;
  createdAt: string;
  modifiedAt: string;
}
```

Add `display_order INTEGER CHECK (display_order IS NULL OR display_order BETWEEN 1 AND 100000)` to the create-table schema. After the table creation, inspect `PRAGMA table_info(projects)` and add the same nullable column only when missing. Add a new `idx_projects_display_order` index over `status`, `(display_order IS NULL)`, `display_order`, `featured DESC`, `updated_at DESC`, and `id DESC`.

Validate a provided value with:

```ts
const hasDisplayOrder = Object.prototype.hasOwnProperty.call(input, "displayOrder");
if (
  hasDisplayOrder &&
  input.displayOrder !== null &&
  (!Number.isInteger(input.displayOrder) || input.displayOrder < 1 || input.displayOrder > 100000)
) {
  throw new TypeError("Project displayOrder must be null or an integer from 1 to 100000.");
}
```

Include `display_order AS displayOrder` in `projectSelect`. Add `display_order` to the insert and update it only when the field was present:

```sql
display_order = CASE
  WHEN ? = 1 THEN excluded.display_order
  ELSE projects.display_order
END
```

Use this listing order:

```sql
ORDER BY
  display_order IS NULL,
  display_order ASC,
  featured DESC,
  updated_at DESC,
  id DESC
```

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/project-store.test.ts`

Expected: all project-store tests pass.

- [ ] **Step 5: Commit the store behavior**

```bash
git add src/lib/server/project-store.ts tests/project-store.test.ts
git commit -m "feat: add manual project display order"
```

### Task 2: Expose and preserve display order through project APIs

**Files:**
- Modify: `src/pages/api/projects/index.ts`
- Modify: `tests/public-content-api.test.ts`
- Modify: `tests/private-project-api.test.ts`
- Modify: `tests/private-project-progress-api.test.ts`

**Interfaces:**
- Consumes: `StoredProject.displayOrder` from Task 1 and signed project payloads with omitted, integer, or null values.
- Produces: `GET /api/projects` responses with `displayOrder` and verified private publishing behavior for both project-only and project-progress routes.

- [ ] **Step 1: Add failing API assertions**

Set `displayOrder: 40` in the public API test project and assert:

```ts
assert.equal(projects.data[0].displayOrder, 40);
```

Set `displayOrder: 10` in the project-only private payload, assert the published response contains `10`, then send a copy with the field omitted and assert the public listing still contains `10`.

Set `displayOrder: 20` in the progress payload and assert `data.project.displayOrder === 20` while activity idempotency remains unchanged.

- [ ] **Step 2: Run the API tests and confirm the public response assertion fails**

Run:

```bash
node --test \
  tests/public-content-api.test.ts \
  tests/private-project-api.test.ts \
  tests/private-project-progress-api.test.ts
```

Expected: FAIL because the public API omits `displayOrder`.

- [ ] **Step 3: Add the field to the public API response**

In `src/pages/api/projects/index.ts`, add:

```ts
displayOrder: project.displayOrder,
```

The private APIs require no route-specific branching; their existing publishers return the `StoredProject` produced by Task 1.

- [ ] **Step 4: Run the API tests**

Run:

```bash
node --test \
  tests/public-content-api.test.ts \
  tests/private-project-api.test.ts \
  tests/private-project-progress-api.test.ts
```

Expected: all selected API tests pass.

- [ ] **Step 5: Commit the API contract**

```bash
git add src/pages/api/projects/index.ts tests/public-content-api.test.ts tests/private-project-api.test.ts tests/private-project-progress-api.test.ts
git commit -m "feat: expose project display order"
```

### Task 3: Add safe display-order arguments to both publishing clients

**Files:**
- Create: `skills/burns-update-github-progress/scripts/project-options.mjs`
- Modify: `skills/burns-update-github-progress/scripts/register-project.mjs`
- Modify: `skills/burns-update-github-progress/scripts/upload.mjs`
- Modify: `skills/burns-update-github-progress/SKILL.md`
- Create: `tests/github-project-options.test.ts`
- Modify: `tests/github-project-runner.test.ts`
- Modify: `tests/skill-contract.test.ts`

**Interfaces:**
- Consumes: optional CLI value `--display-order <integer|none>`.
- Produces: a payload with `displayOrder: number`, `displayOrder: null`, or no `displayOrder` property.

- [ ] **Step 1: Add failing parser and runner tests**

Create `tests/github-project-options.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { applyDisplayOrder } from "../skills/burns-update-github-progress/scripts/project-options.mjs";

test("display order is omitted, set, or explicitly cleared", () => {
  assert.deepEqual(applyDisplayOrder({ slug: "akka" }, undefined), { slug: "akka" });
  assert.deepEqual(applyDisplayOrder({ slug: "akka" }, "30"), { slug: "akka", displayOrder: 30 });
  assert.deepEqual(applyDisplayOrder({ slug: "akka" }, "none"), { slug: "akka", displayOrder: null });
});

test("display order rejects invalid CLI values", () => {
  for (const value of ["0", "1.5", "100001", "latest"]) {
    assert.throws(() => applyDisplayOrder({}, value), /display-order/);
  }
});
```

Update `tests/github-project-runner.test.ts` to invoke the registration runner with `--display-order`, `20` and expect `displayOrder: 20` in the captured payload. Add a Skill contract assertion that both instructions and scripts mention `display-order`.

- [ ] **Step 2: Run the client tests and confirm they fail**

Run:

```bash
node --test \
  tests/github-project-options.test.ts \
  tests/github-project-runner.test.ts \
  tests/skill-contract.test.ts
```

Expected: FAIL because `project-options.mjs` and `--display-order` support do not exist.

- [ ] **Step 3: Implement the shared parser and apply it in both runners**

Create `project-options.mjs`:

```js
export function applyDisplayOrder(project, rawValue) {
  if (rawValue === undefined) return project;
  const value = rawValue.trim().toLowerCase();
  if (value === "none") return { ...project, displayOrder: null };
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error("--display-order must be an integer from 1 to 100000 or none");
  }
  const displayOrder = Number(value);
  if (!Number.isSafeInteger(displayOrder) || displayOrder > 100000) {
    throw new Error("--display-order must be an integer from 1 to 100000 or none");
  }
  return { ...project, displayOrder };
}
```

Import it from both runners. In `register-project.mjs`, rename the current project object to `baseProject`, then apply the option:

```js
const project = applyDisplayOrder(baseProject, options["display-order"]);
```

In `upload.mjs`, extract the current nested project fields as `baseProject` before `payload`:

```js
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
```

Document the integer, `none`, and omission semantics in `SKILL.md`.

- [ ] **Step 4: Run the client tests**

Run:

```bash
node --test \
  tests/github-project-options.test.ts \
  tests/github-project-runner.test.ts \
  tests/skill-contract.test.ts
```

Expected: all selected client tests pass.

- [ ] **Step 5: Commit the publishing-client support**

```bash
git add skills/burns-update-github-progress tests/github-project-options.test.ts tests/github-project-runner.test.ts tests/skill-contract.test.ts
git commit -m "feat: publish project display order"
```

### Task 4: Verify, deploy, and publish the production ordering

**Files:**
- Verify: all files changed in Tasks 1 through 3
- Use: `ops/deploy-release.sh`
- Use: `skills/burns-update-github-progress/scripts/register-project.mjs`

**Interfaces:**
- Consumes: the tested feature commit and the existing production signing key.
- Produces: a healthy commit-pinned production release and three ranked project records without creating activities.

- [ ] **Step 1: Run the complete local verification**

Run:

```bash
npm run test:content
npm run build
git diff --check
```

Expected: 0 failed tests, 0 Astro diagnostics, a successful production build, and no whitespace errors.

- [ ] **Step 2: Push the feature branch and deploy its exact commit**

```bash
git push -u origin codex/project-display-order
release_sha=$(git rev-parse HEAD)
ssh 121.41.51.134 "/opt/burns-blog/repository/ops/deploy-release.sh '$release_sha'"
curl -fsS https://burnsgao.me/api/health
```

Expected: the deploy command prints `deployed <release_sha>`, and the health response reports that exact release SHA.

- [ ] **Step 3: Validate all three ranking payloads without writing**

Run the following three commands with `--validate`:

```bash
BURNS_PUBLISH_URL=https://burnsgao.me BURNS_PUBLISH_KEY_ID=primary node skills/burns-update-github-progress/scripts/register-project.mjs --repo Burns1028/anyhark --project-title anyhark --project-summary "One Agent. Anywhere." --language Python --project-status active --project-published-at 2026-08-08T15:02:02Z --project-updated-at 2026-08-08T15:10:08Z --featured --display-order 10 --validate
BURNS_PUBLISH_URL=https://burnsgao.me BURNS_PUBLISH_KEY_ID=primary node skills/burns-update-github-progress/scripts/register-project.mjs --repo Burns1028/burns-skill --project-title "Burns Skills" --project-summary "一套从真实工作流中长出来的个人 Skill 集合，覆盖写作、阅读、思考、可视化与内容发布。" --language HTML --project-status active --project-published-at 2026-08-09T15:16:57Z --project-updated-at 2026-08-09T16:10:51Z --display-order 20 --validate
BURNS_PUBLISH_URL=https://burnsgao.me BURNS_PUBLISH_KEY_ID=primary node skills/burns-update-github-progress/scripts/register-project.mjs --repo Burns1028/akka --project-title Akka --project-summary "一个自学习、全天候运行的创作者 AI Agent。" --language Python --project-status active --project-published-at 2026-03-09T15:13:21Z --project-updated-at 2026-03-10T03:37:08Z --display-order 30 --validate
```

Expected: all three responses contain `validated: true` and the matching project slug. Public project order remains unchanged because validation rolls back.

- [ ] **Step 4: Publish the exact validated payloads**

```bash
BURNS_PUBLISH_URL=https://burnsgao.me BURNS_PUBLISH_KEY_ID=primary node skills/burns-update-github-progress/scripts/register-project.mjs --repo Burns1028/anyhark --project-title anyhark --project-summary "One Agent. Anywhere." --language Python --project-status active --project-published-at 2026-08-08T15:02:02Z --project-updated-at 2026-08-08T15:10:08Z --featured --display-order 10
BURNS_PUBLISH_URL=https://burnsgao.me BURNS_PUBLISH_KEY_ID=primary node skills/burns-update-github-progress/scripts/register-project.mjs --repo Burns1028/burns-skill --project-title "Burns Skills" --project-summary "一套从真实工作流中长出来的个人 Skill 集合，覆盖写作、阅读、思考、可视化与内容发布。" --language HTML --project-status active --project-published-at 2026-08-09T15:16:57Z --project-updated-at 2026-08-09T16:10:51Z --display-order 20
BURNS_PUBLISH_URL=https://burnsgao.me BURNS_PUBLISH_KEY_ID=primary node skills/burns-update-github-progress/scripts/register-project.mjs --repo Burns1028/akka --project-title Akka --project-summary "一个自学习、全天候运行的创作者 AI Agent。" --language Python --project-status active --project-published-at 2026-03-09T15:13:21Z --project-updated-at 2026-03-10T03:37:08Z --display-order 30
```

Expected: the responses contain `displayOrder` values `10`, `20`, and `30`; no activity is created.

- [ ] **Step 5: Verify the public API, rendered page, and unchanged activity count**

```bash
node - <<'NODE'
import assert from 'node:assert/strict';

const projectsResponse = await fetch('https://burnsgao.me/api/projects');
if (!projectsResponse.ok) throw new Error(`Projects API returned ${projectsResponse.status}`);
const projects = (await projectsResponse.json()).data;
const expected = [
  ['anyhark', 10],
  ['burns-skill', 20],
  ['akka', 30],
];
assert.deepEqual(projects.slice(0, 3).map(({ slug, displayOrder }) => [slug, displayOrder]), expected);

const activitiesResponse = await fetch('https://burnsgao.me/api/activities?days=10');
if (!activitiesResponse.ok) throw new Error(`Activities API returned ${activitiesResponse.status}`);
const activities = (await activitiesResponse.json()).data.flatMap((day) => day.items);
assert.equal(activities.filter((item) => item.projectSlug === 'akka').length, 2);

const pageResponse = await fetch('https://burnsgao.me/projects');
if (!pageResponse.ok) throw new Error(`Projects page returned ${pageResponse.status}`);
const html = (await pageResponse.text()).toLowerCase();
const positions = ['anyhark', 'burns skills', '>akka<'].map((needle) => html.indexOf(needle));
assert.equal(positions.every((position) => position >= 0), true);
assert.equal(positions[0] < positions[1] && positions[1] < positions[2], true);
console.log(JSON.stringify({ order: projects.slice(0, 3).map((project) => project.slug), positions }, null, 2));
NODE
```

Expected: exit code 0 and the reported order `anyhark`, `burns-skill`, `akka`.
