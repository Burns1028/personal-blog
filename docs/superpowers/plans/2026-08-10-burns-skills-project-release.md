# Burns Skills Project Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Burns Skills immediately after Any Hark on the Projects page and record one verified public-release activity.

**Architecture:** Reuse the production signed HTTPS publishing clients already owned by `burns-update-github-progress`. Keep Any Hark first with its existing `featured` field, then publish Burns Skills and its curated release activity atomically; verify the public read APIs afterward.

**Tech Stack:** Node.js, GitHub REST API metadata, Burns signed publishing API, SQLite-backed production content APIs

## Global Constraints

- Do not modify the Projects page, database schema, pagination, or activity presentation.
- Do not write production SQLite directly.
- Preserve GitHub's verified creation and update timestamps.
- Use `burns-skill:2026-08-09:public-release` for every validation, publication, or correction of this one activity.
- The final public project order must begin with `anyhark`, then `burns-skill`.
- The activity must be a single `release` event linked to `https://github.com/Burns1028/burns-skill`.

---

### Task 1: Validate the complete production payload

**Files:**
- Use: `skills/burns-update-github-progress/scripts/register-project.mjs`
- Use: `skills/burns-update-github-progress/scripts/upload.mjs`
- Verify against: `docs/superpowers/specs/2026-08-10-burns-skills-project-release-design.md`

**Interfaces:**
- Consumes: GitHub repository metadata, `BURNS_PUBLISH_URL`, `BURNS_PUBLISH_KEY_ID`, and Keychain service `burns-blog-publisher`.
- Produces: Two successful read-only validation responses for project slugs `anyhark` and `burns-skill`, without changing production data.

- [ ] **Step 1: Validate the Any Hark featured-project update**

```bash
BURNS_PUBLISH_URL=https://burnsgao.me \
BURNS_PUBLISH_KEY_ID=primary \
node skills/burns-update-github-progress/scripts/register-project.mjs \
  --repo https://github.com/Burns1028/anyhark \
  --featured \
  --validate
```

Expected: HTTP success JSON with `data.validated: true` and `data.projectSlug: "anyhark"`. The command must not create or update a project or activity.

- [ ] **Step 2: Validate the Burns Skills project and release activity**

```bash
BURNS_PUBLISH_URL=https://burnsgao.me \
BURNS_PUBLISH_KEY_ID=primary \
node skills/burns-update-github-progress/scripts/upload.mjs \
  --repo Burns1028/burns-skill \
  --slug burns-skill \
  --project-title "Burns Skills" \
  --project-summary "一套从真实工作流中长出来的个人 Skill 集合，覆盖写作、阅读、思考、可视化与内容发布。" \
  --language HTML \
  --project-status active \
  --project-published-at 2026-08-09T15:16:57Z \
  --project-updated-at 2026-08-09T16:10:51Z \
  --source-key burns-skill:2026-08-09:public-release \
  --occurred-at 2026-08-09T16:10:51Z \
  --kind release \
  --activity-title "公开 Burns Skills" \
  --activity-summary "把写作、阅读、思考、可视化与内容发布的方法沉淀为可复用的个人 Skill，并以开源仓库正式发布。" \
  --activity-url https://github.com/Burns1028/burns-skill \
  --validate
```

Expected: HTTP success JSON with `data.validated: true`, `data.projectSlug: "burns-skill"`, and `data.sourceKey: "burns-skill:2026-08-09:public-release"`. The command must not create or update a project or activity.

### Task 2: Publish both idempotent updates

**Files:**
- Use: `skills/burns-update-github-progress/scripts/register-project.mjs`
- Use: `skills/burns-update-github-progress/scripts/upload.mjs`

**Interfaces:**
- Consumes: The exact payloads that passed Task 1.
- Produces: An updated `anyhark` project, a new or updated `burns-skill` project, and one release activity with the approved stable key.

- [ ] **Step 1: Publish Any Hark as featured**

```bash
BURNS_PUBLISH_URL=https://burnsgao.me \
BURNS_PUBLISH_KEY_ID=primary \
node skills/burns-update-github-progress/scripts/register-project.mjs \
  --repo https://github.com/Burns1028/anyhark \
  --featured
```

Expected: HTTP success JSON whose `data.project.slug` is `anyhark` and whose `data.project.featured` is `true`.

- [ ] **Step 2: Publish Burns Skills and its release activity**

```bash
BURNS_PUBLISH_URL=https://burnsgao.me \
BURNS_PUBLISH_KEY_ID=primary \
node skills/burns-update-github-progress/scripts/upload.mjs \
  --repo Burns1028/burns-skill \
  --slug burns-skill \
  --project-title "Burns Skills" \
  --project-summary "一套从真实工作流中长出来的个人 Skill 集合，覆盖写作、阅读、思考、可视化与内容发布。" \
  --language HTML \
  --project-status active \
  --project-published-at 2026-08-09T15:16:57Z \
  --project-updated-at 2026-08-09T16:10:51Z \
  --source-key burns-skill:2026-08-09:public-release \
  --occurred-at 2026-08-09T16:10:51Z \
  --kind release \
  --activity-title "公开 Burns Skills" \
  --activity-summary "把写作、阅读、思考、可视化与内容发布的方法沉淀为可复用的个人 Skill，并以开源仓库正式发布。" \
  --activity-url https://github.com/Burns1028/burns-skill
```

Expected: HTTP success JSON whose `data.project.slug` is `burns-skill` and whose `data.activity.sourceKey` is `burns-skill:2026-08-09:public-release`.

### Task 3: Verify the public Projects page data

**Files:**
- Read: `https://burnsgao.me/api/projects`
- Read: `https://burnsgao.me/api/activities?days=10`
- Read: `https://burnsgao.me/projects`

**Interfaces:**
- Consumes: Production public APIs after Task 2.
- Produces: Evidence that ordering and activity content match the approved design.

- [ ] **Step 1: Verify project ordering and facts**

```bash
node - <<'NODE'
const response = await fetch('https://burnsgao.me/api/projects');
if (!response.ok) throw new Error(`Projects API returned ${response.status}`);
const payload = await response.json();
const [first, second] = payload.data;
if (first?.slug !== 'anyhark' || second?.slug !== 'burns-skill') {
  throw new Error(`Unexpected project order: ${payload.data.map((item) => item.slug).join(', ')}`);
}
if (second.title !== 'Burns Skills' || second.repoUrl !== 'https://github.com/Burns1028/burns-skill') {
  throw new Error('Burns Skills project facts do not match the approved design');
}
console.log(JSON.stringify({ first, second }, null, 2));
NODE
```

Expected: Exit code 0, with `anyhark` first and `burns-skill` second.

- [ ] **Step 2: Verify the release activity**

```bash
node - <<'NODE'
const response = await fetch('https://burnsgao.me/api/activities?days=10');
if (!response.ok) throw new Error(`Activities API returned ${response.status}`);
const payload = await response.json();
const activities = payload.data.flatMap((day) => day.items);
const activity = activities.find((item) => item.sourceKey === 'burns-skill:2026-08-09:public-release');
if (!activity) throw new Error('Burns Skills release activity is missing');
if (
  activity.projectSlug !== 'burns-skill' ||
  activity.kind !== 'release' ||
  activity.title !== '公开 Burns Skills' ||
  activity.url !== 'https://github.com/Burns1028/burns-skill'
) {
  throw new Error('Burns Skills release activity does not match the approved design');
}
console.log(JSON.stringify(activity, null, 2));
NODE
```

Expected: Exit code 0 and exactly one matching activity object.

- [ ] **Step 3: Confirm the rendered route responds successfully**

```bash
node - <<'NODE'
const response = await fetch('https://burnsgao.me/projects');
if (!response.ok) throw new Error(`Projects page returned ${response.status}`);
const html = await response.text();
for (const text of ['anyhark', 'Burns Skills', '公开 Burns Skills']) {
  if (!html.toLowerCase().includes(text.toLowerCase())) {
    throw new Error(`Rendered Projects page is missing: ${text}`);
  }
}
console.log('Projects page contains the expected project and activity labels.');
NODE
```

Expected: Exit code 0 and a success message confirming all three labels.
