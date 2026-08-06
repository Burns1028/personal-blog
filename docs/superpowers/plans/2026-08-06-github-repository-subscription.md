# GitHub Repository Subscription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically mirror Burns1028's public, non-fork GitHub repositories into the SQLite-backed Projects directory every hour while keeping the activity timeline entirely manual.

**Architecture:** A small GitHub REST client returns a validated, paginated repository snapshot plus conditional-request metadata. A repository sync service converts that snapshot into a pure change plan and applies it atomically through project-store-specific persistence functions. A Node CLI is the only automated entry point, and a systemd oneshot/timer invokes it hourly on ECS. The sync code has no dependency on the activity store.

**Tech Stack:** TypeScript, Node.js 24 built-in `fetch` and `node:sqlite`, Astro, Node test runner, Bash, systemd.

---

## Task 1: Lock the HTTP contract with failing tests

**Files:**
- Create: `tests/github-repository-client.test.ts`
- Create: `src/lib/server/github-repository-client.ts`

- [ ] **Step 1: Write failing pagination, filtering-input, ETag, 304, and rate-limit tests**

  Build an injectable `fetchImpl` fixture and assert:

  ```ts
  const result = await fetchGitHubRepositorySnapshot({
    owner: "Burns1028",
    fetchImpl,
    etag: '"known"',
  });

  assert.equal(result.kind, "snapshot");
  assert.equal(result.repositories.length, 101);
  assert.equal(requests[0].headers.get("if-none-match"), '"known"');
  ```

  Cover a first-page `304`, sequential pagination, malformed repository objects, and `403`/`429` errors that include reset/retry metadata without exposing the token.

- [ ] **Step 2: Run the focused test and confirm RED**

  Run: `node --test tests/github-repository-client.test.ts`

  Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement the minimal GitHub REST client**

  Export validated DTOs and:

  ```ts
  export async function fetchGitHubRepositorySnapshot(
    options: GitHubRepositoryClientOptions,
  ): Promise<GitHubRepositoryFetchResult>;
  ```

  Requirements:

  - request `/users/{owner}/repos` with `type=owner`, `sort=updated`, `direction=desc`, `per_page=100`;
  - send `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2026-03-10`;
  - optionally send `Authorization: Bearer ...` and `If-None-Match`;
  - fetch pages sequentially until a short page;
  - return `not-modified` only for the first response;
  - fail the entire fetch on any invalid or incomplete page.

- [ ] **Step 4: Run the focused test and confirm GREEN**

  Run: `node --test tests/github-repository-client.test.ts`

  Expected: PASS.

## Task 2: Add durable GitHub identity and sync provenance

**Files:**
- Modify: `src/lib/server/project-store.ts`
- Modify: `tests/project-store.test.ts`

- [ ] **Step 1: Write failing schema migration and lookup tests**

  Assert that old rows become `syncSource: "manual"`, synchronized rows can store a stable `githubId`, and a repository can be retrieved by GitHub ID or full name.

  ```ts
  assert.equal(stored.syncSource, "manual");
  assert.equal(getStoredProjectByGitHubIdentity(123, "Burns1028/renamed", db)?.id, stored.id);
  ```

- [ ] **Step 2: Run project-store tests and confirm RED**

  Run: `node --test tests/project-store.test.ts`

- [ ] **Step 3: Implement an idempotent migration and sync-only persistence API**

  Add nullable `github_id` and non-null `sync_source` (`manual` or `github-profile`) to old and new schemas. Keep the public manual `ProjectInput` API compatible.

  Export a transaction-oriented sync surface:

  ```ts
  export function listStoredProjects(database?: DatabaseSync): StoredProject[];
  export function upsertGitHubSynchronizedProject(input, database): StoredProject;
  export function archiveMissingGitHubProjects(remoteIds, now, database): number;
  export function getGitHubSyncState(owner, database): GitHubSyncState | undefined;
  export function setGitHubSyncState(state, database): void;
  ```

  `upsertGitHubSynchronizedProject` locates rows by stable GitHub ID first, then full name, preserves `featured` and manual status, and updates the slug safely on repository rename.

- [ ] **Step 4: Run project-store tests and confirm GREEN**

  Run: `node --test tests/project-store.test.ts`

  Expected: existing behavior and new migration tests pass.

## Task 3: Implement pure planning and atomic repository synchronization

**Files:**
- Create: `src/lib/server/github-repository-sync.ts`
- Create: `tests/github-repository-sync.test.ts`
- Modify: `src/lib/server/project-store.ts`

- [ ] **Step 1: Write failing mapping and boundary tests**

  Cover:

  - owner/public/non-fork filtering;
  - description and language fallbacks;
  - stable rename without duplicate rows;
  - default `active`/not-featured behavior;
  - preservation of `featured` and manually selected status;
  - GitHub archived/disabled forcing `archived`;
  - local archived remaining archived after GitHub reactivation;
  - missing auto-synced rows archived only after a complete snapshot;
  - manual rows never archived;
  - second identical sync producing zero changes;
  - activity count unchanged before and after sync.

- [ ] **Step 2: Run focused tests and confirm RED**

  Run: `node --test tests/github-repository-sync.test.ts`

- [ ] **Step 3: Implement deterministic mapping and change planning**

  Export:

  ```ts
  export function mapGitHubRepository(repository, owner): GitHubProjectCandidate | undefined;
  export function planGitHubRepositorySync(repositories, existing, owner): GitHubSyncPlan;
  export function synchronizeGitHubRepositories(options): GitHubSyncSummary;
  ```

  Stable identity uses the GitHub numeric repository ID. Slugs are lowercase ASCII hyphen forms, with a repository-ID suffix only when a different row already owns the base slug.

- [ ] **Step 4: Apply the plan in one SQLite transaction**

  Use `BEGIN IMMEDIATE`, apply all upserts and missing-project archives, persist ETag only after success, then `COMMIT`. On any exception, `ROLLBACK` and rethrow.

  Do not import `activity-store.ts` or write `activities` anywhere in this module.

- [ ] **Step 5: Run focused tests and confirm GREEN**

  Run: `node --test tests/github-repository-sync.test.ts tests/project-store.test.ts`

## Task 4: Add the operational CLI and dry-run contract

**Files:**
- Create: `ops/sync-github-repositories.mjs`
- Create: `tests/github-repository-sync-cli.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing CLI tests**

  Start a local HTTP fixture server, set a temporary `BLOG_DB_PATH`, and assert:

  - `--dry-run` prints add/update/archive counts without changing project rows or ETag state;
  - a real run imports repositories;
  - an identical second run is idempotent;
  - output never contains `GITHUB_TOKEN`;
  - a failed later page leaves the database unchanged.

- [ ] **Step 2: Run the CLI test and confirm RED**

  Run: `node --test tests/github-repository-sync-cli.test.ts`

- [ ] **Step 3: Implement the CLI**

  Support:

  ```text
  node ops/sync-github-repositories.mjs [--dry-run]
  ```

  Fixed defaults are `owner=Burns1028` and GitHub's public API base. A test-only `GITHUB_API_BASE_URL` override may point to a local fixture. Read `BLOG_DB_PATH` and optional `GITHUB_TOKEN` from the environment. Emit one JSON summary line containing fetched, added, updated, archived, unchanged, and notModified counts.

- [ ] **Step 4: Add the package command and confirm GREEN**

  Add `"github:sync": "node ops/sync-github-repositories.mjs"` and rerun the focused CLI test.

## Task 5: Install hourly ECS scheduling through the release workflow

**Files:**
- Create: `ops/systemd/burns-blog-github-sync.service`
- Create: `ops/systemd/burns-blog-github-sync.timer`
- Modify: `ops/deploy-release.sh`
- Modify: `tests/production-ops-contract.test.ts`

- [ ] **Step 1: Add failing operations-contract assertions**

  Assert the service runs as `burns-blog`, reads `/etc/burns-blog/app.env`, calls the current release CLI, has write access only to persistent blog data, and never invokes an activity upload command. Assert the timer contains `OnCalendar=hourly`, `Persistent=true`, and randomized delay.

- [ ] **Step 2: Run the operations contract and confirm RED**

  Run: `node --test tests/production-ops-contract.test.ts`

- [ ] **Step 3: Add systemd units and deployment installation**

  Service shape:

  ```ini
  [Service]
  Type=oneshot
  User=burns-blog
  EnvironmentFile=/etc/burns-blog/app.env
  WorkingDirectory=/opt/burns-blog/current
  ExecStart=/usr/local/bin/node /opt/burns-blog/current/ops/sync-github-repositories.mjs
  ```

  Timer shape:

  ```ini
  [Timer]
  OnCalendar=hourly
  Persistent=true
  RandomizedDelaySec=5m
  ```

  Install and enable both units in `ops/deploy-release.sh`, and start the timer only after the release symlink has switched successfully.

- [ ] **Step 4: Run the operations contract and confirm GREEN**

  Run: `node --test tests/production-ops-contract.test.ts`

## Task 6: End-to-end local verification and documentation alignment

**Files:**
- Modify if required: `skills/burns-update-github-progress/SKILL.md`
- Modify if required: `README.md`

- [ ] **Step 1: Run a live dry-run against Burns1028's public GitHub profile**

  Run with an isolated database:

  ```bash
  BLOG_DB_PATH=/tmp/burns-github-sync-verification.sqlite npm run github:sync -- --dry-run
  ```

  Expected: a non-empty fetched count and no activity rows.

- [ ] **Step 2: Run a real local sync twice**

  First run must add/update expected repositories. Second run must be `notModified` or report zero data changes. Query the SQLite database directly to confirm `projects.sync_source = 'github-profile'` and `activities` remains empty.

- [ ] **Step 3: Run the focused and full regression suites**

  Run:

  ```bash
  node --test tests/github-repository-client.test.ts tests/project-store.test.ts tests/github-repository-sync.test.ts tests/github-repository-sync-cli.test.ts tests/production-ops-contract.test.ts
  npm run check
  npm run test:content
  ```

  Expected: all pass with no new Astro or TypeScript diagnostics.

- [ ] **Step 4: Inspect the diff for the isolation boundary**

  Run:

  ```bash
  rg "activity-store|upsertActivity|/events|commits|releases" src/lib/server/github-repository-* ops/sync-github-repositories.mjs
  ```

  Expected: no matches. Confirm only the manually invoked `burns-update-github-progress` Skill writes GitHub timeline activity.

- [ ] **Step 5: Commit only the repository-subscription implementation**

  Stage the plan, new synchronization code/tests/units, and intentional project-store/package/deploy changes. Leave unrelated existing visual edits untouched.

