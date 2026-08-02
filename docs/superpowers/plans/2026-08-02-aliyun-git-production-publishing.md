# Aliyun Git Production Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the current Burns Blog through a private GitHub repository to `https://burnsgao.me`, expose signed remote-only article and idea publishing APIs, and migrate the explicitly selected real article and ideas into the production SQLite database.

**Architecture:** GitHub is the code synchronization source; ECS checks out an explicit commit into a versioned release and runs Astro behind Nginx and systemd. Production SQLite and article media live outside releases. The two upload Skills construct Edits locally but only write through an HTTPS HMAC-signed API; no Skill may write a local SQLite database.

**Tech Stack:** Astro 7, Node.js 24.15, TypeScript, Node `DatabaseSync`, Nginx, systemd, GitHub private repository and Deploy Key, Alibaba Cloud ECS/Cloud Assistant/AliDNS, Let's Encrypt, HMAC-SHA256.

## Global Constraints

- Canonical site URL is `https://burnsgao.me`; `https://www.burnsgao.me` redirects to it.
- ECS instance is `i-bp1bcc626i6ygsbfg71k` in `cn-hangzhou` and remains single-instance while SQLite is the runtime store.
- Node.js must be version 24.15.0 or newer; the pinned bootstrap version is 24.15.0.
- Preserve all current visual behavior, including the homepage orrery, Writing star atlas and lunar phases, Projects rotating Earth and satellite interaction, and Ideas black hole.
- Create private repository `Burns1028/personal-blog`; ECS receives read-only access to this repository only.
- Deploy a named commit SHA; pushing `main` alone does not deploy.
- Keep `data/*.sqlite`, runtime media, secrets, certificates, `node_modules`, and `dist` out of Git.
- `burns-upload-article` and `burns-upload-idea` are remote-only; missing production URL or credentials is a hard failure.
- All private writes require HTTPS, signed timestamps, unique nonces, body hashes, constant-time comparison, and rate limiting.
- Production data paths are `/var/lib/burns-blog/blog.sqlite` and `/var/lib/burns-blog/media/articles`.
- Git contains code only. The ignored migration selection contains exactly 1 real article (`taste-is-all-you-need`) and 3 current ideas. The other 4 local article rows are historical/test data and are excluded without being deleted.
- Do not commit or print credentials. Store the local signing secret in macOS Keychain and the server copy in `/etc/burns-blog/app.env`.
- Existing unrelated working-tree changes belong to the user and must be preserved.

## File Responsibility Map

- `src/lib/server/publish-auth.ts`: canonical request construction, HMAC verification, timestamp validation and nonce persistence.
- `src/lib/server/article-publisher.ts`: validate and publish an article package with transaction-safe media handling.
- `src/lib/server/publish-response.ts`: consistent private API success and error responses.
- `src/pages/api/publish/articles/[slug].ts`: authenticated article upsert endpoint.
- `src/pages/api/publish/articles/[slug]/validate.ts`: authenticated article validation endpoint.
- `src/pages/api/publish/ideas/index.ts`: authenticated idea management list.
- `src/pages/api/publish/ideas/[sourceKey].ts`: authenticated idea get/upsert/delete endpoint.
- `src/pages/api/publish/ideas/[sourceKey]/validate.ts`: authenticated idea validation endpoint.
- `src/pages/api/health.ts`: non-sensitive production health response.
- `skills/_shared/publish-client.mjs`: Keychain lookup, request hashing, signing and HTTP transport.
- `skills/burns-upload-article/scripts/upload.mjs`: remote article package creation and response verification.
- `skills/burns-upload-idea/scripts/upload.mjs`: remote idea CRUD and response verification.
- `scripts/migrate-local-content.ts`: selection-driven, read-only local export and remote migration orchestration.
- `ops/nginx/burnsgao.me.conf`: HTTPS reverse proxy, persistent media alias, limits and redirects.
- `ops/systemd/burns-blog.service`: application process contract.
- `ops/systemd/burns-blog-backup.service`: one-shot SQLite backup.
- `ops/systemd/burns-blog-backup.timer`: daily backup schedule.
- `ops/bootstrap-ecs.sh`: idempotent package, user and directory initialization.
- `ops/deploy-release.sh`: commit-pinned build, health check, atomic switch and rollback.
- `tests/publish-auth.test.ts`: signing and replay protection.
- `tests/article-publisher.test.ts`: article package, media and revision behavior.
- `tests/private-article-api.test.ts`: article endpoint authorization and validation semantics.
- `tests/private-idea-api.test.ts`: idea endpoint authorization and CRUD semantics.
- `tests/remote-skill-client.test.ts`: remote-only Skill requests and failure cases.
- `tests/production-ops-contract.test.ts`: deployment configuration invariants.
- `tests/local-content-migration.test.ts`: SQLite export, media reconstruction and dry-run behavior.

---

### Task 1: Capture the Current Site Baseline Safely

**Files:**
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `README.md`
- Test: `tests/content-source-contract.test.ts`

**Interfaces:**
- Consumes: the current dirty working tree and `data/blog.sqlite`.
- Produces: a tested baseline commit whose ignored runtime files cannot enter Git.

- [ ] **Step 1: Extend the ignore contract before staging anything**

Add these exact entries to `.gitignore` while keeping all existing rules:

```gitignore
public/media/
*.pem
*.key
.deploy/
```

Keep `.env.example` tracked. Do not ignore `public/assets`, `design-source`, `skills`, `ops`, or the approved design documents.

- [ ] **Step 2: Lock runtime exclusions with a test**

Append this test to `tests/content-source-contract.test.ts`:

```ts
test("runtime content and credentials stay outside Git", () => {
  const ignore = readFileSync(resolve(root, ".gitignore"), "utf8");
  assert.match(ignore, /^data\/\*\.sqlite$/m);
  assert.match(ignore, /^public\/media\/$/m);
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^\*\.key$/m);
});
```

- [ ] **Step 3: Run the baseline test and full current verification**

Run:

```bash
node --test tests/content-source-contract.test.ts
npm run test:content
npm run build
```

Expected: all tests pass and Astro produces `dist/server/entry.mjs`. Fix only failures caused by the current intended site state; do not remove visual features to make the build pass.

- [ ] **Step 4: Audit staged content for secrets and oversized files**

Run:

```bash
git add --all
git diff --cached --check
git diff --cached --name-only
git grep --cached -n -I -E 'AccessKeySecret|BURNS_PUBLISH_SECRET=.+|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY' -- . ':!docs/superpowers/plans/*'
git diff --cached --numstat | sort -nr | head -30
```

Expected: the secret scan returns no matches; no staged file is larger than 100 MB; `data/blog.sqlite` and `public/media` are absent from the staged list.

- [ ] **Step 5: Commit the approved current site baseline**

Run:

```bash
git commit -m "feat: finalize cosmic archive site"
```

Expected: the working site state, source assets, Skills and tests are committed without runtime content or secrets.

### Task 2: Create the Private GitHub Code Source

**Files:**
- Modify: local Git remote configuration only.

**Interfaces:**
- Consumes: the clean baseline commit from Task 1.
- Produces: private repository `Burns1028/personal-blog`, local `origin`, and remote `main`.

- [ ] **Step 1: Install and authenticate GitHub CLI**

Run:

```bash
brew install gh
gh auth login --hostname github.com --git-protocol https --web
gh auth status --hostname github.com
```

Expected: the browser OAuth flow completes as `Burns1028`; no token is printed.

- [ ] **Step 2: Remove the invalid empty origin and create the private repository**

Run:

```bash
git remote remove origin
gh repo create Burns1028/personal-blog --private --source=. --remote=origin --description "Burns' writing, projects and ideas archive"
git remote -v
```

Expected: `origin` points to `github.com:Burns1028/personal-blog.git` and `gh repo view Burns1028/personal-blog --json visibility` reports `PRIVATE`.

- [ ] **Step 3: Publish the reviewed baseline as main**

Run:

```bash
git push --set-upstream origin HEAD:main
gh repo edit Burns1028/personal-blog --default-branch main
git ls-remote --heads origin main
```

Expected: the remote `main` SHA equals local `HEAD`.

### Task 3: Implement Signed Request Authentication

**Files:**
- Create: `src/lib/server/publish-auth.ts`
- Modify: `src/lib/server/content-store.ts`
- Create: `tests/publish-auth.test.ts`

**Interfaces:**
- Consumes: `Request`, `DatabaseSync`, `BURNS_PUBLISH_KEYS` formatted as `keyId:hexSecret` pairs separated by commas.
- Produces: `canonicalPublishRequest()`, `verifyPublishRequest()` and `PublishPrincipal`.

- [ ] **Step 1: Write the failing signing and replay tests**

Create `tests/publish-auth.test.ts` with a deterministic clock and secret:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createHmac, createHash } from "node:crypto";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import { canonicalPublishRequest, verifyPublishRequest } from "../src/lib/server/publish-auth.ts";

const secret = "11".repeat(32);
const now = new Date("2026-08-02T16:00:00.000Z");

function signedRequest(body: string, nonce = "nonce-0001") {
  const url = "https://burnsgao.me/api/publish/ideas/observation";
  const timestamp = now.toISOString();
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const canonical = canonicalPublishRequest("PUT", new URL(url), timestamp, nonce, bodyHash);
  const signature = createHmac("sha256", Buffer.from(secret, "hex")).update(canonical).digest("hex");
  return new Request(url, { method: "PUT", body, headers: {
    "content-type": "application/json",
    "x-burns-key-id": "primary",
    "x-burns-timestamp": timestamp,
    "x-burns-nonce": nonce,
    "x-burns-content-sha256": bodyHash,
    "x-burns-signature": signature,
  }});
}

test("accepts one valid request and rejects a replay", async () => {
  const database = createArticleDatabase(":memory:");
  const body = JSON.stringify({ text: "真实观察。" });
  const first = await verifyPublishRequest(signedRequest(body), database, { primary: secret }, now);
  assert.equal(first.keyId, "primary");
  await assert.rejects(
    verifyPublishRequest(signedRequest(body), database, { primary: secret }, now),
    /nonce/i,
  );
  database.close();
});

test("rejects expired timestamps, body changes and unknown keys", async () => {
  const database = createArticleDatabase(":memory:");
  const request = signedRequest(JSON.stringify({ text: "原文" }), "nonce-0002");
  const changed = new Request(request, { body: JSON.stringify({ text: "篡改" }) });
  await assert.rejects(verifyPublishRequest(changed, database, { primary: secret }, now), /hash|signature/i);
  database.close();
});
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run: `node --test tests/publish-auth.test.ts`

Expected: FAIL because `publish-auth.ts` does not exist.

- [ ] **Step 3: Add nonce persistence to the SQLite schema**

Add this table and index to the schema in `content-store.ts`:

```sql
CREATE TABLE IF NOT EXISTS publish_nonces (
  key_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  used_at TEXT NOT NULL,
  PRIMARY KEY (key_id, nonce)
);
CREATE INDEX IF NOT EXISTS idx_publish_nonces_used_at
  ON publish_nonces(used_at);
```

- [ ] **Step 4: Implement the verifier**

Create `publish-auth.ts` with these public signatures:

```ts
export interface PublishPrincipal { keyId: string }

export function canonicalPublishRequest(
  method: string,
  url: URL,
  timestamp: string,
  nonce: string,
  bodySha256: string,
): string;

export async function verifyPublishRequest(
  request: Request,
  database: DatabaseSync,
  keyring?: Record<string, string>,
  now?: Date,
): Promise<PublishPrincipal>;
```

Implementation requirements: read the body through `request.clone()`, compare SHA-256 and HMAC with `timingSafeEqual`, enforce a 300-second clock window, validate lowercase hex strings, delete nonce rows older than 10 minutes, then insert the new `(key_id, nonce)` inside a transaction. Build the default keyring from `BURNS_PUBLISH_KEYS`; an empty keyring must reject every request.

- [ ] **Step 5: Run the authentication tests and commit**

Run:

```bash
node --test tests/publish-auth.test.ts
git add src/lib/server/publish-auth.ts src/lib/server/content-store.ts tests/publish-auth.test.ts
git commit -m "feat: authenticate private publishing requests"
git push origin HEAD:main
```

Expected: tests pass and the commit reaches remote `main`.

### Task 4: Extract a Transactional Article Package Publisher

**Files:**
- Create: `src/lib/server/article-publisher.ts`
- Modify: `scripts/import-article.ts`
- Modify: `src/lib/server/content-store.ts`
- Create: `tests/article-publisher.test.ts`

**Interfaces:**
- Consumes: `ArticlePublishPackage`, a target `DatabaseSync`, persistent media root and `validateOnly`.
- Produces: `publishArticlePackage()` returning article metadata and imported asset metadata.

- [ ] **Step 1: Write failing package tests**

Create a test using one Markdown image, a one-pixel PNG Base64 payload and a temporary media root. Assert:

```ts
const result = await publishArticlePackage({
  slug: "verified-article",
  status: "published",
  sourceName: "article.md",
  markdown: "---\ntitle: 验证文章\nsummary: 生产发布验证。\npublishedAt: 2026-08-02\n---\n\n正文。\n\n![月相](images/moon.png)",
  assets: [{
    sourcePath: "images/moon.png",
    mediaType: "image/png",
    contentBase64: ONE_PIXEL_PNG,
  }],
}, { database, mediaRoot, validateOnly: false });
assert.equal(result.article.slug, "verified-article");
assert.equal(result.assets.length, 1);
assert.match(result.assets[0].url, /^\/media\/articles\/verified-article\//);
```

Also assert that `validateOnly: true` leaves article count and media directory unchanged, unsafe paths such as `../secret.png` fail, over 40 assets fail, and unchanged repeated content preserves the revision.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/article-publisher.test.ts`

Expected: FAIL because `publishArticlePackage` is missing.

- [ ] **Step 3: Implement focused publisher types**

Create these exported types and function:

```ts
export interface ArticlePackageAsset {
  sourcePath: string;
  mediaType: string;
  contentBase64: string;
}

export interface ArticlePublishPackage {
  slug: string;
  status: "draft" | "published" | "archived";
  sourceName: string;
  markdown: string;
  assets: ArticlePackageAsset[];
}

export interface ArticlePublishOptions {
  database: DatabaseSync;
  mediaRoot: string;
  validateOnly: boolean;
}

export async function publishArticlePackage(
  input: ArticlePublishPackage,
  options: ArticlePublishOptions,
): Promise<{ article: StoredArticle; assets: Array<{ url: string; width: number; height: number; bytes: number }> }>;
```

Decode assets into a temporary sibling directory, reject absolute/traversal paths, cap decoded bytes before Sharp processing, reuse the existing frontmatter and WebP transformation rules, begin one SQLite transaction, and move the completed media directory only immediately before commit. On any error, roll back and remove only the task-created temporary directory.

- [ ] **Step 4: Make the CLI call the same publisher**

Refactor `scripts/import-article.ts` so parsing and media transformation live in `article-publisher.ts`. The CLI remains an internal migration/development command, but it is no longer referenced by either Skill.

- [ ] **Step 5: Run focused and regression tests, then commit**

Run:

```bash
node --test tests/article-publisher.test.ts tests/content-store.test.ts tests/publishing-cli.test.ts
git add src/lib/server/article-publisher.ts src/lib/server/content-store.ts scripts/import-article.ts tests/article-publisher.test.ts
git commit -m "feat: publish packaged articles transactionally"
git push origin HEAD:main
```

Expected: package and existing CLI tests pass.

### Task 5: Add Authenticated Article and Idea APIs

**Files:**
- Create: `src/lib/server/publish-response.ts`
- Create: `src/pages/api/publish/articles/[slug].ts`
- Create: `src/pages/api/publish/articles/[slug]/validate.ts`
- Create: `src/pages/api/publish/ideas/index.ts`
- Create: `src/pages/api/publish/ideas/[sourceKey].ts`
- Create: `src/pages/api/publish/ideas/[sourceKey]/validate.ts`
- Create: `tests/private-article-api.test.ts`
- Create: `tests/private-idea-api.test.ts`

**Interfaces:**
- Consumes: `verifyPublishRequest`, `publishArticlePackage`, `idea-store` CRUD functions.
- Produces: private JSON endpoints with stable error codes.

- [ ] **Step 1: Write failing endpoint tests**

For every private endpoint, assert unsigned requests return `401` with:

```json
{"error":{"code":"PUBLISH_AUTH_REQUIRED","message":"发布凭据无效。"}}
```

Article tests must assert successful `PUT` returns `200` with `slug`, `status`, `revision`, `url`, and `assets`; validation returns `200` with `validated: true` and no database change.

Idea tests must assert:

```ts
assert.equal((await upsertResponse.json()).data.sourceKey, "verified-observation");
assert.equal((await getResponse.json()).data.text, "真实观察。");
assert.equal((await listResponse.json()).meta.count, 1);
assert.equal(deleteWithoutConfirmation.status, 400);
assert.equal(deleteWithConfirmation.status, 200);
```

- [ ] **Step 2: Verify endpoint tests fail**

Run: `node --test tests/private-article-api.test.ts tests/private-idea-api.test.ts`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement consistent private responses**

Create:

```ts
export function publishError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function publishSuccess(data: unknown, status = 200): Response {
  return Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 4: Implement article routes**

Both routes set `prerender = false`, require `Content-Type: application/json`, reject bodies over 32 MB from `content-length` before parsing, verify the signed request before business logic, require the path slug to match the JSON slug, and call `publishArticlePackage` with `BLOG_MEDIA_PATH ?? "public/media/articles"`.

- [ ] **Step 5: Implement idea routes**

Use `upsertIdea`, `getStoredIdeaBySourceKey`, `listIdeas`, and `deleteIdea`. Validate source-key equality, status enums and request JSON. `DELETE` requires `X-Burns-Confirm-Delete` to equal the decoded route `sourceKey`. The validate route runs all field validation without calling `upsertIdea`.

- [ ] **Step 6: Run private and public API regressions, then commit**

Run:

```bash
node --test tests/private-article-api.test.ts tests/private-idea-api.test.ts tests/public-content-api.test.ts
git add src/lib/server/publish-response.ts src/pages/api/publish tests/private-article-api.test.ts tests/private-idea-api.test.ts
git commit -m "feat: expose private content publishing APIs"
git push origin HEAD:main
```

Expected: private tests pass and existing public APIs remain read-only.

### Task 6: Convert Both Skills to Remote-Only Clients

**Files:**
- Create: `skills/_shared/publish-client.mjs`
- Modify: `skills/burns-upload-article/SKILL.md`
- Modify: `skills/burns-upload-article/scripts/upload.mjs`
- Modify: `skills/burns-upload-idea/SKILL.md`
- Modify: `skills/burns-upload-idea/scripts/upload.mjs`
- Modify: `skills/burns-upload-article/agents/openai.yaml`
- Modify: `skills/burns-upload-idea/agents/openai.yaml`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `tests/skill-contract.test.ts`
- Create: `tests/remote-skill-client.test.ts`

**Interfaces:**
- Consumes: `BURNS_PUBLISH_URL`, `BURNS_PUBLISH_KEY_ID`, and a secret from `BURNS_PUBLISH_SECRET` or Keychain service `burns-blog-publisher`.
- Produces: `signedPublishRequest()` and two CLI entry points that only call HTTPS.

- [ ] **Step 1: Write failing remote-only contract tests**

Assert both wrappers no longer contain `import-article.ts`, `import-idea.ts`, `BURNS_BLOG_ROOT`, `--project-root`, or `BLOG_DB_PATH`. Assert they import `skills/_shared/publish-client.mjs` and that missing URL/key/secret exits non-zero with `Missing BURNS_PUBLISH_URL`, `Missing BURNS_PUBLISH_KEY_ID`, or `No publishing secret found`.

Use a local `node:http` server in `remote-skill-client.test.ts` only as a transport fixture. Capture request method, path, body and signing headers; do not expose a local SQLite publishing option.

- [ ] **Step 2: Verify the new tests fail against local wrappers**

Run: `node --test tests/skill-contract.test.ts tests/remote-skill-client.test.ts`

Expected: FAIL because the wrappers still spawn local import scripts.

- [ ] **Step 3: Implement the shared signing client**

Export:

```js
export function loadPublishConfiguration(env = process.env) {}
export function canonicalPublishRequest(method, url, timestamp, nonce, bodySha256) {}
export async function signedPublishRequest(path, { method = "GET", body, headers = {}, env = process.env } = {}) {}
```

Use `security find-generic-password -a Burns -s burns-blog-publisher -w` on macOS when the environment secret is absent. Require an `https:` URL except when `BURNS_PUBLISH_ALLOW_HTTP=127.0.0.1` is present in test processes. Generate a 16-byte random nonce and SHA-256/HMAC headers matching `publish-auth.ts`. Never print the secret or Authorization material.

- [ ] **Step 4: Implement the article wrapper**

Keep `--file`, `--slug`, `--status`, `--number`, `--featured` and add `--validate`. Parse Markdown image references. Package only existing local images; preserve HTTP images as remote references. Reject missing local paths. Send `PUT /api/publish/articles/:slug` or `POST /api/publish/articles/:slug/validate`, then verify the returned slug, status, revision and asset list before printing sanitized JSON.

- [ ] **Step 5: Implement the idea wrapper**

Keep `--action upsert|list|get|delete`. Map operations to the private endpoints. Add `--validate` for upsert validation. Only add `X-Burns-Confirm-Delete` after the CLI received an explicit `--confirm-delete "$source_key"` value matching the target.

- [ ] **Step 6: Update Skill instructions and examples**

Remove every local database command from both `SKILL.md` files. Document Keychain setup without embedding a value:

```bash
security add-generic-password -U -a Burns -s burns-blog-publisher -w
```

Document `BURNS_PUBLISH_URL=https://burnsgao.me` and the Key ID. State that a missing remote configuration is a failure, not a fallback.

- [ ] **Step 7: Run Skill tests and commit**

Run:

```bash
node --test tests/skill-contract.test.ts tests/remote-skill-client.test.ts
git add skills .env.example README.md tests/skill-contract.test.ts tests/remote-skill-client.test.ts
git commit -m "feat: publish articles and ideas remotely"
git push origin HEAD:main
```

Expected: both Skills pass transport and contract tests and have no local database path.

### Task 7: Add Production Health and Operations Files

**Files:**
- Create: `src/pages/api/health.ts`
- Create: `ops/nginx/burnsgao.me.conf`
- Create: `ops/systemd/burns-blog.service`
- Create: `ops/systemd/burns-blog-backup.service`
- Create: `ops/systemd/burns-blog-backup.timer`
- Create: `ops/bootstrap-ecs.sh`
- Create: `ops/deploy-release.sh`
- Create: `tests/production-ops-contract.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `BLOG_DB_PATH`, `BLOG_MEDIA_PATH`, `SITE_URL`, `BURNS_RELEASE_SHA`, and a Git checkout.
- Produces: health endpoint, systemd units, Nginx configuration and idempotent release deployment.

- [ ] **Step 1: Write failing operations contract tests**

Assert:

```ts
assert.match(nginx, /server_name burnsgao\.me www\.burnsgao\.me/);
assert.match(nginx, /alias \/var\/lib\/burns-blog\/media\/articles\//);
assert.match(nginx, /client_max_body_size 32m/);
assert.match(nginx, /limit_req_zone .* zone=burns_publish:10m rate=10r\/m/);
assert.match(nginx, /limit_req zone=burns_publish burst=5 nodelay/);
assert.match(service, /User=burns-blog/);
assert.match(service, /EnvironmentFile=\/etc\/burns-blog\/app\.env/);
assert.match(deploy, /git checkout --detach/);
assert.match(deploy, /npm ci/);
assert.match(deploy, /api\/health/);
assert.doesNotMatch(deploy, /git pull/);
```

- [ ] **Step 2: Verify the contract fails**

Run: `node --test tests/production-ops-contract.test.ts`

Expected: FAIL because operations files are missing.

- [ ] **Step 3: Implement the non-sensitive health endpoint**

Return status `200` only when SQLite executes `SELECT 1` and the media root exists and is writable. Response shape:

```json
{
  "status": "ok",
  "release": "unknown",
  "checks": { "database": "ok", "media": "ok" },
  "time": "2026-08-02T16:00:00.000Z"
}
```

Return `503` with failed check names but never paths, counts or exception stacks.

- [ ] **Step 4: Implement the system files**

The service runs `/usr/local/bin/node /opt/burns-blog/current/dist/server/entry.mjs`, binds `HOST=127.0.0.1` and `PORT=4321`, restarts on failure, and grants write access only to `/var/lib/burns-blog`.

The Nginx HTTP context defines `limit_req_zone $binary_remote_addr zone=burns_publish:10m rate=10r/m`. Every `/api/publish/` location applies `limit_req zone=burns_publish burst=5 nodelay`, a 32 MB body limit, a 60-second request timeout and `Cache-Control: no-store`. Public media receives immutable caching; private API responses do not receive CORS headers.

The backup service uses Node `DatabaseSync` backup semantics or SQLite `VACUUM INTO` to create a timestamped backup, runs `PRAGMA integrity_check`, and deletes backups older than 14 days. The timer runs daily at `03:20 Asia/Shanghai` with `Persistent=true`.

- [ ] **Step 5: Implement idempotent bootstrap and commit-pinned deploy**

`bootstrap-ecs.sh` verifies the Node tarball against the official `SHASUMS256.txt`, installs Node 24.15.0, Git, Nginx and certificate tools, creates the system user and persistent directories, and never changes DNS.

`deploy-release.sh "$release_sha"` validates a 40-character SHA, fetches it from origin, checks it out detached in `/opt/burns-blog/releases/$release_sha`, runs `npm ci` and `npm run build`, starts a temporary health check on port 4322, backs up SQLite, switches `current`, restarts the service and rolls back the symlink if final health fails.

- [ ] **Step 6: Run operations tests and commit**

Run:

```bash
node --test tests/production-ops-contract.test.ts
npm run build
git add src/pages/api/health.ts ops tests/production-ops-contract.test.ts package.json
git commit -m "ops: add commit-pinned aliyun deployment"
git push origin HEAD:main
```

Expected: operations contracts and build pass.

### Task 8: Build the One-Time Local Content Migration

**Files:**
- Create: `scripts/migrate-local-content.ts`
- Create: `tests/local-content-migration.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: ignored `.content-backup/selection.json`, the one selected Markdown article, read-only local `data/blog.sqlite` for the selected idea rows, local `public/media`, and the two remote Skill wrappers.
- Produces: a deterministic migration plan and explicit `--execute` path for only the selected article and ideas.

- [ ] **Step 1: Write failing export and dry-run tests**

Build a temporary selection file containing one article and one idea. Provide one Markdown article whose body references `/media/articles/source/moon.webp`, create that local media file, and assert the exporter rewrites it to `assets/moon.webp` in a temporary Markdown package. Assert default invocation prints counts and does not perform HTTP. Add four unselected article rows to the fixture and assert none of them appears in the plan.

Expected plan shape:

```json
{
  "articles": [{ "slug": "source", "status": "published", "images": 1 }],
  "ideas": [{ "sourceKey": "observation", "status": "published" }],
  "counts": { "articles": 1, "ideas": 1 },
  "executed": false
}
```

- [ ] **Step 2: Verify the migration test fails**

Run: `node --test tests/local-content-migration.test.ts`

Expected: FAIL because the migration script is missing.

- [ ] **Step 3: Implement read-only export**

Read `.content-backup/selection.json` first and reject duplicate or missing identities. Read the selected article from `.content-backup/articles/taste-is-all-you-need.md`. Open SQLite with `{ readOnly: true }` only to read the selected idea source keys and any selected article metadata fallback. Never enumerate or migrate unselected article rows. Preserve status, number, tags, feature flag, published dates, body Markdown and source keys. For every `/media/articles/...` reference, require the matching `public/media/articles/...` file, copy it to a task-owned temporary package directory, and rewrite the Markdown to a relative asset reference.

Default mode only prints a sanitized plan. `--execute` first calls both remote validate routes for every selected record. Only after every validation succeeds may it call article upsert sequentially and idea upsert sequentially. `--execute` must also require `--confirm-counts 1:3` for the current migration snapshot.

- [ ] **Step 4: Verify migration idempotency and commit**

Run:

```bash
node --test tests/local-content-migration.test.ts
npm run migrate:content -- --database data/blog.sqlite
git add scripts/migrate-local-content.ts tests/local-content-migration.test.ts package.json
git commit -m "feat: migrate local content through remote skills"
git push origin HEAD:main
```

Expected: tests pass; dry-run reports 1 article and 3 ideas; no remote request is sent and the four unselected article rows never appear.

### Task 9: Complete Local Verification and Select the Release SHA

**Files:**
- Modify only files required by failures in the preceding tasks.

**Interfaces:**
- Consumes: all implementation commits.
- Produces: one clean, pushed release SHA.

- [ ] **Step 1: Run complete verification**

Run:

```bash
npm run test:content
npm run check
npm run build
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: tests/check/build pass, working tree is clean, and local HEAD equals remote main.

- [ ] **Step 2: Tag the first production candidate**

Run:

```bash
release_tag="production-2026-08-02-01"
git tag -a "$release_tag" -m "First burnsgao.me production release"
git push origin "$release_tag"
```

Expected: the tag resolves to the verified release SHA.

### Task 10: Bootstrap ECS and Install the Read-Only Deploy Key

**Files:**
- Remote state only: `/home/burns-blog/.ssh`, `/opt/burns-blog`, `/var/lib/burns-blog`, `/etc/burns-blog`.

**Interfaces:**
- Consumes: `ops/bootstrap-ecs.sh`, Aliyun profile `burns-ecs`, and GitHub repository admin access.
- Produces: an initialized server that can read one private repository.

- [ ] **Step 1: Run the bootstrap through Cloud Assistant**

Encode `ops/bootstrap-ecs.sh` as Base64 and invoke `RunCommand` with `KeepCommand=false`, `Timeout=900`, and the target instance. Poll `DescribeInvocationResults` until `InvocationStatus=Success` and verify output reports Node 24.15.0, Git, Nginx, the `burns-blog` user and all required directories.

- [ ] **Step 2: Generate a repository-scoped deploy key on ECS**

Run through Cloud Assistant as root:

```bash
install -d -m 0700 -o burns-blog -g burns-blog /home/burns-blog/.ssh
sudo -u burns-blog ssh-keygen -t ed25519 -N '' -C 'burnsgao.me deploy' -f /home/burns-blog/.ssh/id_ed25519
cat /home/burns-blog/.ssh/id_ed25519.pub
```

Only the public key may appear in the invocation result.

- [ ] **Step 3: Add the public key to the private repository**

Write the public key to a local temporary file and run:

```bash
gh repo deploy-key add "$deploy_public_key_file" --repo Burns1028/personal-blog --title "burnsgao.me ECS"
gh api repos/Burns1028/personal-blog/keys --jq '.[] | {title,read_only}'
```

Expected: one key titled `burnsgao.me ECS` with `read_only: true`.

- [ ] **Step 4: Verify repository access from ECS**

Use Cloud Assistant to run as `burns-blog`:

```bash
ssh-keyscan github.com > /home/burns-blog/.ssh/known_hosts
chown burns-blog:burns-blog /home/burns-blog/.ssh/known_hosts
chmod 0600 /home/burns-blog/.ssh/known_hosts
git ls-remote git@github.com:Burns1028/personal-blog.git refs/heads/main
```

Expected: remote main SHA equals the selected release SHA. Security group still has no port 22 rule.

### Task 11: Configure Credentials, DNS, TLS and Deploy the Release

**Files:**
- Remote: `/etc/burns-blog/app.env`, Nginx and systemd configuration.
- Local: macOS Keychain item `burns-blog-publisher`.

**Interfaces:**
- Consumes: release SHA, ECS public address, repository deploy key, and HMAC key ID `primary`.
- Produces: `https://burnsgao.me` with a healthy application and private APIs.

- [ ] **Step 1: Enroll the HMAC secret without exposing plaintext to Cloud Assistant logs**

Generate the 32-byte secret locally and store it in Keychain without printing it. Generate an ephemeral RSA public key on ECS and return only the public key. Encrypt a small environment payload locally with that public key, send only ciphertext through Cloud Assistant, decrypt it on ECS directly into `/etc/burns-blog/app.env`, set mode `0640` and ownership `root:burns-blog`, then delete the ephemeral RSA private key.

The environment file contains:

```text
SITE_URL=https://burnsgao.me
BLOG_DB_PATH=/var/lib/burns-blog/blog.sqlite
BLOG_MEDIA_PATH=/var/lib/burns-blog/media/articles
BURNS_PUBLISH_KEYS=primary:${BURNS_PUBLISH_SECRET_HEX}
HOST=127.0.0.1
PORT=4321
```

No command output may include the value of `BURNS_PUBLISH_SECRET_HEX`.

- [ ] **Step 2: Add explicit AliDNS records without changing the wildcard**

Use `DescribeDomainRecords` to re-check current state. Add or update only:

```text
RR=@   Type=A Value=$ecs_public_ip
RR=www Type=A Value=$ecs_public_ip
```

Do not update or delete the existing `RR=*` record. Poll `dig +short A burnsgao.me` and `dig +short A www.burnsgao.me` until both return the target address.

- [ ] **Step 3: Clone and deploy the selected commit**

Through Cloud Assistant, clone the repository into `/opt/burns-blog/repository` as `burns-blog`, install the systemd units and initial HTTP Nginx configuration, then run:

```bash
/opt/burns-blog/repository/ops/deploy-release.sh "$release_sha"
curl --fail http://127.0.0.1:4321/api/health
```

Expected: health reports `status=ok` and the exact release SHA.

- [ ] **Step 4: Obtain and verify TLS**

Run the certificate client for `burnsgao.me` and `www.burnsgao.me`, install the final Nginx configuration, reload Nginx, then verify:

```bash
curl --fail --silent https://burnsgao.me/api/health
curl --head https://www.burnsgao.me
```

Expected: root health is `200`; `www` is a permanent redirect to `https://burnsgao.me`; certificate names cover both hosts.

### Task 12: Migrate the Selected Article and Ideas and Perform Production Acceptance

**Files:**
- Production SQLite and media only; no Git changes expected.

**Interfaces:**
- Consumes: the ignored 1-article/3-idea selection, local media, remote Skills and production API.
- Produces: production content parity, backups and a rollback proof.

- [ ] **Step 1: Validate every migration package remotely**

Run:

```bash
npm run migrate:content -- --database data/blog.sqlite --validate-production
```

Expected: 1 article validation and 3 idea validations pass; production article/idea counts remain zero before execution.

- [ ] **Step 2: Execute the confirmed migration**

Run:

```bash
npm run migrate:content -- --database data/blog.sqlite --execute --confirm-counts 1:3
```

Expected: the selected article and all 3 ideas succeed. Re-running the command reports an unchanged article revision and one row per idea source-key.

- [ ] **Step 3: Compare exact production identities**

Compare local SQLite slugs/source keys to:

```bash
curl --fail --silent https://burnsgao.me/api/articles
curl --fail --silent https://burnsgao.me/api/ideas
```

Expected article slug:

```text
taste-is-all-you-need
```

Expected idea source keys:

```text
2026-08-02-camus-meursault-starry-night
2026-08-02-ai-era-no-moat
2026-08-02-speak-loudly-small-ego
```

- [ ] **Step 4: Verify the visual site and persistent media**

Check desktop and mobile pages for `/`, `/writing`, `/writing/taste-is-all-you-need`, `/projects`, and `/ideas`. Confirm the homepage orrery, lunar artwork, Writing star atlas, rotating Earth, satellite interaction, Ideas black hole, search and pagination remain intact. Fetch every migrated `/media/articles/...` URL and require HTTP 200 with `image/webp`.

- [ ] **Step 5: Verify backup and code rollback without data rollback**

Start `burns-blog-backup.service`, run `PRAGMA integrity_check` on the newest backup, temporarily switch `current` to the preceding release and back, and verify the same selected article and 3 ideas remain visible after both service restarts.

- [ ] **Step 6: Final security audit**

Verify:

```text
Security group public ingress: TCP 80 and 443 only
GitHub deploy key: read-only
Nginx certificate renewal: scheduled and healthy
Private API unsigned request: 401
Private API HTTP request: redirected or rejected before credentials
Git repository secret scan: clean
Cloud Assistant output: no publishing secret
```

Expected: every condition passes before deployment is reported complete.
