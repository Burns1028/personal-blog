# Personal Blog Mobile Responsive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task by task.

**Goal:** Rebuild the phone layouts of Home, Projects, and Ideas so they are attractive, information-dense, and naturally scrollable without changing the approved desktop presentation at `768px` and above.

**Architecture:** Keep the existing Astro markup, routes, data, assets, and desktop CSS as the source of truth. Add route-scoped phone overrides inside explicit `@media (max-width: 767px)` blocks, using normal document flow instead of viewport-height clipping or nested scrolling. Make one minimal semantic markup addition—a mobile-only “近期活动” heading in `ActivityOrbit.astro`—and protect the desktop baseline with contract tests before changing production styles.

**Tech Stack:** Astro 7, TypeScript, CSS media queries, Node's built-in test runner, existing static presentation-contract tests, existing responsive image/canvas assets.

**Approved design:** `docs/superpowers/specs/2026-08-21-mobile-responsive-redesign-design.md`

## Non-negotiable constraints

- All new layout behavior is limited to `max-width: 767px`; desktop selectors and values remain unchanged.
- Home, Projects, and Ideas use the browser's main document scroll on phones. No list or card grid may create a nested vertical scrollbar.
- Phone touch targets are at least `44px` high/wide where practical.
- No route duplication, JavaScript device sniffing, new image assets, database changes, API changes, or content changes.
- Writing content layout is out of scope. Shared phone navigation may affect Writing, but its desktop layout may not change.
- Preserve all existing semantic links, `data-route-artifact` transitions, project activity behavior, and SQLite-authored line breaks.
- Verify at `360×800`, `390×844`, and `430×932`; regress desktop at `1440×900` and `2048×928`.

---

## Task 1: Establish a green, desktop-locked baseline

**Files:**

- Modify: `tests/article-figure-grid.test.ts`
- Modify: `tests/ideas-journal.test.ts`
- Modify: `tests/presentation-contract.test.ts`
- Test: `tests/*.test.ts`

The pulled branch currently has three stale presentation assertions even though the production CSS is the approved desktop baseline. Correct the tests before phone work so later failures are attributable to this change.

### Step 1: Reproduce and record the known failures

Run:

```bash
npm run test:content
```

Expected: exactly the existing presentation mismatches fail:

- the article image-row test expects the wrapper itself to be flex, while `.image-row__imgs` owns the flex layout;
- the Ideas test expects a relative search bar, while the approved desktop search bar is fixed;
- the Projects test expects a hard-coded three-column declaration, while the approved desktop CSS uses `repeat(auto-fill, minmax(300px, 1fr))`.

### Step 2: Update the article image-row contract without touching CSS

Replace the desktop/mobile assertions with the actual DOM-owned layout:

```ts
test("image-row uses a flex image rail on desktop and stacks it on narrow screens", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(
    css,
    /\.article-shell--writing \.prose \.image-row__imgs\s*\{[^}]*display:\s*flex/s,
  );
  assert.match(
    css,
    /@media \(max-width:\s*640px\)[\s\S]*?\.article-shell--writing \.prose \.image-row__imgs\s*\{[^}]*flex-direction:\s*column/s,
  );
});
```

### Step 3: Update the Ideas desktop contract

Keep the fixed-backdrop and fixed-header assertions. Change only the search positioning assertion:

```ts
assert.match(
  css,
  /\.ideas-journal__search\s*\{[^}]*position:\s*fixed/,
);
assert.match(
  css,
  /\.ideas-journal__search\s*\{[^}]*top:\s*var\(--ideas-search-top\)/,
);
assert.doesNotMatch(
  css,
  /\.ideas-journal__search\s*\{[^}]*position:\s*sticky/,
);
```

Remove the stale `position: relative` and “no top property” assertions. Do not weaken the remaining background, singularity, typography, and reduced-motion checks.

### Step 4: Update the Projects desktop grid contract

Replace the stale grid assertion with the approved desktop declaration:

```ts
assert.match(
  css,
  /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(300px,\s*1fr\)\)/,
);
```

Keep all other desktop dimensions—workbench width, top padding, card height, orbit height, and satellite position—unchanged and asserted.

### Step 5: Verify the baseline

Run:

```bash
npm run test:content
npm run build
```

Expected: all existing tests pass with `# fail 0`; Astro check reports `0 errors`; the production build exits `0`.

### Step 6: Commit

```bash
git add tests/article-figure-grid.test.ts tests/ideas-journal.test.ts tests/presentation-contract.test.ts
git commit -m "test: lock approved desktop presentation"
```

---

## Task 2: Add failing phone-layout contracts

**Files:**

- Create: `tests/mobile-responsive-contract.test.ts`
- Test: `tests/mobile-responsive-contract.test.ts`

Write contracts before production CSS. Use a balanced-brace helper so assertions are scoped to the exact mobile block instead of accidentally matching desktop rules.

### Step 1: Add the CSS media-block helper

Create the test file with:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

function mobileBlockContaining(css: string, marker: string) {
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing mobile marker: ${marker}`);
  const mediaIndex = css.lastIndexOf("@media", markerIndex);
  const openingBrace = css.indexOf("{", mediaIndex);
  assert.match(css.slice(mediaIndex, openingBrace), /max-width:\s*767px/);

  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`unterminated mobile block: ${marker}`);
}
```

### Step 2: Add the shared shell and Home flow test

```ts
test("the shared shell and Home use a phone-only normal document flow", () => {
  const css = read("src/styles/global.css");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: shared shell and Home",
  );

  assert.match(mobile, /body\[data-route="\/"\] \.home-hero__inner[\s\S]*?display:\s*block/);
  assert.match(mobile, /body\[data-route="\/"\] \.hero-actions[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /body\[data-route="\/"\] \.hero-actions a[\s\S]*?min-height:\s*52px/);
  assert.match(mobile, /body\[data-route="\/"\] \.contact-strip[\s\S]*?min-height:\s*44px/);
  assert.doesNotMatch(mobile, /max-height:\s*100(?:s|d)?vh/);
});
```

### Step 3: Add the Home orrery composition test

```ts
test("the Home orrery fits every destination into a finite phone stage", () => {
  const css = read("src/styles/home-orrery.css");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Home orrery",
  );

  assert.match(mobile, /\.home-orrery[\s\S]*?height:\s*clamp\(420px,\s*118vw,\s*480px\)/);
  assert.match(mobile, /\.home-orrery[\s\S]*?min-height:\s*0/);
  assert.match(mobile, /\.home-cosmos__stage[\s\S]*?left:\s*50%/);
  assert.match(mobile, /\.home-cosmos__stage[\s\S]*?transform:\s*translateX\(-50%\)/);
  assert.match(mobile, /\.home-cosmos__artifact--writing/);
  assert.match(mobile, /\.home-cosmos__artifact--projects/);
  assert.match(mobile, /\.home-cosmos__artifact--ideas/);
});
```

### Step 4: Add Projects normal-flow and density tests

```ts
test("Projects becomes one continuous, touchable phone document", () => {
  const css = read("src/styles/projects-archive-v2.css");
  const orbit = read("src/components/projects/ActivityOrbit.astro");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Projects",
  );

  assert.match(mobile, /\.projects-v2 \.project-card-grid[\s\S]*?max-height:\s*none/);
  assert.match(mobile, /\.projects-v2 \.project-card-grid[\s\S]*?overflow:\s*visible/);
  assert.match(mobile, /\.projects-v2__header[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.archive-search--projects[\s\S]*?min-height:\s*44px/);
  assert.match(mobile, /\.activity-orbit__trigger[\s\S]*?min-height:\s*44px/);
  assert.match(mobile, /\.activity-orbit__heading[\s\S]*?display:\s*block/);
  assert.match(orbit, /<h2 class="activity-orbit__heading">近期活动<\/h2>/);
});
```

### Step 5: Add Ideas single-column tests

```ts
test("Ideas turns each phone entry into a full-width single-column record", () => {
  const css = read("src/styles/ideas-journal.css");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Ideas",
  );

  assert.match(mobile, /\.ideas-journal__entry article[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.ideas-journal__meta[\s\S]*?display:\s*flex/);
  assert.match(mobile, /\.ideas-journal__node[\s\S]*?position:\s*absolute/);
  assert.match(mobile, /\.ideas-journal__entry h2[\s\S]*?font-size:\s*16px/);
  assert.match(mobile, /\.ideas-journal__entry h2[\s\S]*?line-height:\s*1\.68/);
});
```

### Step 6: Prove the contracts fail for the missing behavior

Run:

```bash
node --test tests/mobile-responsive-contract.test.ts
```

Expected: the new tests fail because the named mobile markers and phone overrides do not exist yet.

### Step 7: Commit the red tests

```bash
git add tests/mobile-responsive-contract.test.ts
git commit -m "test: define mobile responsive contracts"
```

---

## Task 3: Rebuild the shared phone shell and Home information flow

**Files:**

- Modify: `src/styles/global.css`
- Test: `tests/mobile-responsive-contract.test.ts`
- Test: `tests/presentation-contract.test.ts`

Append one final override block after the existing Home `max-width: 430px` and `max-width: 360px` rules. Later source order is intentional: it consolidates the conflicting `960/680/430/360px` legacy phone rules while leaving desktop untouched.

### Step 1: Add the phone-only route shell

Use this structure and keep all selectors route-scoped where possible:

```css
@media (max-width: 767px) {
  /* Mobile responsive contract: shared shell and Home */
  :root {
    --mobile-page-gutter: clamp(16px, 4.6vw, 20px);
    --mobile-header-height: calc(92px + env(safe-area-inset-top, 0px));
  }

  .site-header__inner {
    width: calc(100vw - (2 * var(--mobile-page-gutter)));
  }

  .site-header a,
  .site-header button {
    min-height: 44px;
  }

  body[data-route="/"] .home-hero__inner {
    display: block;
    width: calc(100vw - (2 * var(--mobile-page-gutter)));
    min-height: 0;
  }

  body[data-route="/"] .home-hero__copy {
    min-height: 0;
    padding: calc(var(--mobile-header-height) + 22px) 0 22px;
  }

  body[data-route="/"] .hero-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  body[data-route="/"] .hero-actions a {
    min-height: 52px;
    padding-inline: 12px;
    grid-template-columns: 24px minmax(0, 1fr) auto;
  }

  body[data-route="/"] .contact-strip {
    min-height: 44px;
    align-items: center;
  }

  body[data-route="/"] .contact-strip a,
  body[data-route="/"] .contact-strip button {
    width: 44px;
    height: 44px;
  }
}
```

Adapt the exact header child selector names to the existing DOM, but keep the values and the marker stable for the contract. Do not edit the desktop declarations above it.

### Step 2: Preserve information density

Within the same block:

- keep the identity heading and profile facts visible—do not hide content;
- use `clamp()` to keep the name readable without causing one-word-per-line wrapping;
- set invitation/action spacing to `16–20px`, not a full viewport section;
- keep three artifact entry rows visually distinct with the existing gold divider language;
- keep contact icons in one compact row with 44px hit areas;
- remove only phone-side `artifact-stage` minimum-height inheritance when it creates blank space.

### Step 3: Run focused tests

```bash
node --test tests/mobile-responsive-contract.test.ts tests/presentation-contract.test.ts
```

Expected: the shared/Home-flow contract passes; the orrery, Projects, and Ideas contracts remain red. All desktop presentation tests pass.

### Step 4: Commit

```bash
git add src/styles/global.css
git commit -m "feat: rebuild home phone content flow"
```

---

## Task 4: Recompose the Home orrery for phones

**Files:**

- Modify: `src/styles/home-orrery.css`
- Test: `tests/mobile-responsive-contract.test.ts`
- Test: `tests/home-orrery.test.ts`

Replace the current `max-width: 760px` oversized-stage behavior and the `max-width: 430px` `550px` minimum height with a finite phone composition. Preserve all base/desktop planet positions.

### Step 1: Add the finite mobile scene

```css
@media (max-width: 767px) {
  /* Mobile responsive contract: Home orrery */
  .home-orrery {
    width: 100%;
    height: clamp(420px, 118vw, 480px);
    min-height: 0;
    overflow: clip;
  }

  .home-cosmos__stage {
    left: 50%;
    width: min(112%, 480px);
    transform: translateX(-50%);
  }

  .home-cosmos__artifact--writing {
    top: 7%;
    left: 12%;
    width: 24%;
  }

  .home-cosmos__artifact--projects {
    top: 17%;
    left: 55%;
    width: 42%;
  }

  .home-cosmos__artifact--ideas {
    top: 62%;
    left: 8%;
    width: 27%;
  }

  .home-cosmos__particle-canvas {
    opacity: 0.52;
  }
}
```

Confirm the three artifact class names against `HomeOrrery.astro`; if the source uses destination data attributes instead, target those exact existing attributes without changing link semantics.

### Step 2: Protect the complete composition

- The moon/Writing control must not cross the left or top edge.
- Earth/Projects plus its glow may not exceed the right edge.
- Black-hole/Ideas plus its asymmetric field may not exceed the bottom edge.
- The satellite remains visible and does not enlarge the scene's scroll width.
- All artifact anchors retain their existing view-transition name and at least a 44px interaction area.

### Step 3: Verify focused tests and build

```bash
node --test tests/mobile-responsive-contract.test.ts tests/home-orrery.test.ts
npm run build
```

Expected: Home mobile contracts and existing asset/performance contracts pass; Astro reports `0 errors`; build exits `0`.

### Step 4: Commit

```bash
git add src/styles/home-orrery.css
git commit -m "feat: fit home orrery to phone viewports"
```

---

## Task 5: Turn Projects into a continuous mobile page

**Files:**

- Modify: `src/styles/projects-archive-v2.css`
- Modify: `src/components/projects/ActivityOrbit.astro`
- Test: `tests/mobile-responsive-contract.test.ts`
- Test: `tests/presentation-contract.test.ts`

### Step 1: Add the semantic activity heading

Immediately inside `<section class="activity-orbit">`, before the orbit SVG, add:

```astro
<h2 class="activity-orbit__heading">近期活动</h2>
```

Set it to `display: none` in the base desktop CSS so the desktop composition is pixel-stable. Show it only in the mobile contract block.

### Step 2: Replace the current Projects mobile block

Consolidate the existing `max-width: 767px` declarations under the stable marker and include:

```css
.activity-orbit__heading {
  display: none;
}

@media (max-width: 767px) {
  /* Mobile responsive contract: Projects */
  .projects-v2__workbench {
    width: calc(100vw - 32px);
    padding: 112px 0 32px;
  }

  .projects-v2__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
    gap: 10px;
  }

  .projects-v2__header-actions,
  .archive-search--projects {
    width: 100%;
  }

  .archive-search--projects {
    min-height: 44px;
  }

  .projects-v2 .project-card-grid {
    grid-template-columns: minmax(0, 1fr);
    max-height: none;
    overflow: visible;
    gap: 10px;
  }

  .projects-v2 .project-card {
    min-height: 0;
    padding: 16px;
  }

  .projects-v2 .projects-v2__earth {
    height: min(52svh, 440px);
    opacity: 0.22;
  }

  .activity-orbit {
    position: relative;
    height: auto;
    margin: 22px 0 0 18px;
    padding: 0 0 38px 20px;
  }

  .activity-orbit__heading {
    display: block;
    margin: 0 0 16px -18px;
  }

  .activity-orbit__days {
    position: relative;
    display: grid;
    gap: 18px;
  }

  .activity-orbit__trigger {
    min-height: 44px;
  }

  .activity-orbit__satellite {
    width: 96px;
    margin: 22px 0 0 auto;
  }
}
```

Retain the existing mobile conversion from absolute orbit nodes to a relative vertical timeline, but tighten it to the values above. Keep expanded activity details in normal flow with `max-height: none`.

### Step 3: Make pagination touch-safe and compact

Inside the same mobile block:

- keep pagination immediately after `.project-card-grid`;
- give pagination links and page-number controls a minimum `44px` hit area;
- keep all visible page labels inside the viewport at 360px;
- retain the existing `max-width: 480px` label-shortening behavior;
- do not introduce fixed or sticky pagination.

### Step 4: Verify behavior contracts

```bash
node --test tests/mobile-responsive-contract.test.ts tests/presentation-contract.test.ts
npm run build
```

Expected: Projects mobile and desktop contracts pass. The page build retains server rendering and project/activity data access with no type errors.

### Step 5: Commit

```bash
git add src/styles/projects-archive-v2.css src/components/projects/ActivityOrbit.astro
git commit -m "feat: rebuild projects mobile document flow"
```

---

## Task 6: Turn Ideas records into readable single-column entries

**Files:**

- Modify: `src/styles/ideas-journal.css`
- Test: `tests/mobile-responsive-contract.test.ts`
- Test: `tests/ideas-journal.test.ts`

Add a `max-width: 767px` mobile contract after the existing tablet block, then remove or rewrite the conflicting three-column declarations from the old `max-width: 619px` block. The final source order must leave a single phone layout, not two competing layouts.

### Step 1: Add the single-column record structure

```css
@media (max-width: 767px) {
  /* Mobile responsive contract: Ideas */
  body[data-route="/ideas"] {
    --ideas-search-top: 96px;
    --ideas-search-height: 48px;
    --ideas-timeline-gap: 14px;
    --ideas-content-width: calc(100vw - 28px);
    --ideas-content-left: 14px;
    --ideas-search-width: var(--ideas-content-width);
  }

  .ideas-journal__entry {
    position: relative;
    padding-left: 16px;
  }

  .ideas-journal__entry article {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }

  .ideas-journal__meta {
    display: flex;
    width: 100%;
    padding: 12px 0 0;
    gap: 12px;
    justify-self: stretch;
  }

  .ideas-journal__meta > span {
    display: inline-flex;
  }

  .ideas-journal__node {
    position: absolute;
    top: 16px;
    left: 0;
  }

  .ideas-journal__entry h2 {
    max-width: none;
    padding: 8px 0 18px;
    font-size: 16px;
    line-height: 1.68;
  }

  .ideas-journal__singularity {
    opacity: 0.1;
  }
}
```

Keep `white-space: pre-line` inherited from the desktop declaration so intentional database line breaks survive.

### Step 2: Keep search dense without squeezing content

At `381–767px`, use a one-line search/date layout with a `48px` control height. Add a narrow fallback:

```css
@media (max-width: 380px) {
  .ideas-journal__search {
    height: 88px;
    grid-template-columns: 20px minmax(0, 1fr);
    grid-template-rows: 44px 44px;
  }

  .ideas-journal__search-divider {
    display: none;
  }

  .ideas-journal__date-filter {
    grid-column: 1 / -1;
    min-height: 44px;
  }
}
```

Adjust `.ideas-journal__content` top padding in the 380px fallback to use the taller search variable so the first entry is never covered.

### Step 3: Simplify the phone timeline decoration

- hide the desktop SVG track if it competes with the single-column content, or reduce it to a subtle vertical rule at the left marker;
- keep the active/current node state visible;
- preserve anchor focus styles and `scroll-margin-top` beneath the fixed header/search;
- keep the map and singularity as low-contrast backgrounds with `pointer-events: none`;
- do not alter desktop fixed-search, timeline, or singularity values.

### Step 4: Verify focused contracts and build

```bash
node --test tests/mobile-responsive-contract.test.ts tests/ideas-journal.test.ts
npm run build
```

Expected: all Ideas contracts pass; fixed desktop search/background assertions stay green; Astro reports `0 errors`.

### Step 5: Commit

```bash
git add src/styles/ideas-journal.css
git commit -m "feat: make ideas readable on phones"
```

---

## Task 7: Integrated visual QA and density polish

**Files:**

- Modify if needed: `src/styles/global.css`
- Modify if needed: `src/styles/home-orrery.css`
- Modify if needed: `src/styles/projects-archive-v2.css`
- Modify if needed: `src/styles/ideas-journal.css`
- Create: `docs/superpowers/verification/2026-08-21-mobile-responsive-redesign.md`
- Test: `tests/*.test.ts`

### Step 1: Run the full automated gate

```bash
npm run test:content
npm run build
git diff --check
```

Expected: test runner reports `# fail 0`; Astro reports `0 errors`; build exits `0`; `git diff --check` prints nothing.

### Step 2: Start the production preview

```bash
npm run preview -- --host 127.0.0.1
```

Open `/`, `/projects`, and `/ideas` at each required viewport. Use the browser's responsive mode and preserve one screenshot per route at `390×844`, plus desktop comparison screenshots at `1440×900`.

### Step 3: Execute the phone checklist at 360×800, 390×844, and 430×932

For every route, run in the browser console:

```js
({
  viewport: [window.innerWidth, window.innerHeight],
  scrollWidth: document.documentElement.scrollWidth,
  horizontalOverflow:
    document.documentElement.scrollWidth !== window.innerWidth,
  nestedVerticalScrollers: [...document.querySelectorAll("body *")]
    .filter((element) => {
      const style = getComputedStyle(element);
      return /(auto|scroll)/.test(style.overflowY)
        && element.scrollHeight > element.clientHeight + 1;
    })
    .map((element) => element.className),
})
```

Expected on all three pages:

- `horizontalOverflow: false`;
- `nestedVerticalScrollers: []` for the redesigned content regions;
- no content is covered by the fixed header or Ideas search bar;
- every visible primary target is at least 44px in one touch dimension;
- no text clipping, orphaned arrow, cropped card, or blank viewport-sized gap.

Route-specific visual acceptance:

- Home: profile → three entry rows → contacts → complete 420–480px orrery; all three destinations and satellite are visible.
- Projects: title/search → complete cards → pagination → “近期活动” timeline; cards and expanded activity details are never internally scrolled.
- Ideas: date/category metadata reads as one compact row; body copy uses the full record width; a typical Chinese paragraph does not collapse into a narrow vertical strip.

### Step 4: Execute the desktop non-regression checklist at 1440×900 and 2048×928

Expected:

- Home remains a two-column hero with the original planet sizes, positions, motion, and transitions.
- Projects retains the approved desktop workbench, adaptive three-card composition, rotating Earth, absolute activity orbit, and satellite position.
- Ideas retains the original three-column timeline, fixed search, fixed backdrop, and singularity composition.
- Header, footer, typography, content density, hover/focus states, and route transitions are visually unchanged.

Any polish discovered here must be added only inside the relevant `max-width: 767px` block, followed by rerunning Step 1 and both affected viewports.

### Step 5: Write the verification record

Record:

- the commit under test;
- all five viewport sizes;
- per-route overflow and nested-scroll results;
- the full test/build outcomes;
- the exact files changed during visual polish;
- confirmation that desktop screenshots match the approved baseline.

### Step 6: Commit the verified result

```bash
git add src/styles/global.css src/styles/home-orrery.css src/styles/projects-archive-v2.css src/styles/ideas-journal.css docs/superpowers/verification/2026-08-21-mobile-responsive-redesign.md
git commit -m "fix: polish responsive layouts across phone sizes"
```

If visual QA requires no additional CSS changes, commit only the verification record with `docs:` instead of creating an empty polish commit.

---

## Task 8: Deploy and verify production

**Files:**

- Read before deployment: `/Users/misery/.agents/skills/burns-deploy-blog/SKILL.md`
- No source changes expected

### Step 1: Confirm the release diff is scoped

```bash
git status --short
git log --oneline --decorate -8
git diff origin/main...HEAD -- src tests docs/superpowers
```

Expected: only the test baseline, phone contracts, four scoped style/component changes, and design/verification docs are present. No content, API, database, or asset files changed.

### Step 2: Follow the Burns deployment skill exactly

Use `burns-deploy-blog` to push the verified commits and deploy the Personal Blog. Do not invent an alternate server workflow.

### Step 3: Verify the public site

On `https://burnsgao.me`, repeat the `390×844` checks for `/`, `/projects`, and `/ideas`, then spot-check Home and Projects at `1440×900`.

Expected:

- HTTPS loads without the WeChat warning;
- deployed commit matches local HEAD;
- no horizontal overflow or nested content scroll on phone;
- desktop composition remains unchanged;
- all three artifact links, project links, search/date controls, pagination, activity details, and contact links work.

### Step 4: Final repository check

```bash
git status --short
git rev-parse HEAD
git rev-parse origin/main
```

Expected: clean worktree; local HEAD equals `origin/main`.

---

## Final self-review checklist

- Every requirement in the approved design has a corresponding implementation task and acceptance check.
- All proposed selectors refer to existing route/component structures except the explicitly added `.activity-orbit__heading`.
- No placeholder paths, pseudo-commands, or undecided layout branches remain.
- Tests first lock the current desktop truth, then fail for missing phone behavior, then turn green task by task.
- All mobile layout behavior is bounded to `max-width: 767px`; no desktop production declaration is edited as part of the redesign.
- The plan covers aesthetics and information density, not only overflow removal.
- Production deployment happens only after automated, phone, and desktop verification pass.
