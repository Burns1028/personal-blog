# Navigation Celestial Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add purpose-built Moon, Earth, and black-hole ImageGen assets to the left of the shared Writing, Projects, and Ideas navigation labels with more breathing room and no motion.

**Architecture:** Keep navigation content in `src/data/site.ts`, extend each item with a typed celestial descriptor, and let `BaseLayout.astro` render one decorative responsive image. Build compact WebP derivatives from the transparent ImageGen masters so the global header adds negligible page weight.

**Tech Stack:** Astro 7, TypeScript, CSS, Sharp, Node test runner.

## Global Constraints

- The mapping is fixed: Writing → Moon, Projects → Earth, Ideas → black hole.
- All three icons are dedicated ImageGen assets based on the approved home-orbit visual language; no mother-image cropping is allowed.
- Moon and Earth render at `22px × 22px` on desktop; black hole renders at `27px × 22px`.
- The icons are static: no translate, scale, rotate, or continuous animation.
- No circular selection ring, badge, boxed background, or rectangular image residue is allowed.
- Existing home-orbit assets and animation code must not be modified.
- Preserve every unrelated dirty-worktree change.

---

### Task 1: Build lightweight responsive celestial assets

**Files:**
- Create: `scripts/build-navigation-celestial-assets.mjs`
- Create: `design-source/navigation-celestials/nav-writing-moon-v1-alpha.png`
- Create: `design-source/navigation-celestials/nav-projects-earth-v1-alpha.png`
- Create: `design-source/navigation-celestials/nav-ideas-black-hole-v2-alpha.png`
- Create: `public/assets/navigation-celestials/nav-writing-moon-v1-64.webp`
- Create: `public/assets/navigation-celestials/nav-writing-moon-v1-128.webp`
- Create: `public/assets/navigation-celestials/nav-projects-earth-v1-64.webp`
- Create: `public/assets/navigation-celestials/nav-projects-earth-v1-128.webp`
- Create: `public/assets/navigation-celestials/nav-ideas-black-hole-v2-80.webp`
- Create: `public/assets/navigation-celestials/nav-ideas-black-hole-v2-160.webp`
- Create: `tests/navigation-celestials.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: transparent ImageGen alpha masters created from the approved home-orbit reference.
- Produces: two responsive WebP sizes per celestial icon and `npm run assets:navigation`.

- [x] **Step 1: Write the failing asset contract test**

Create `tests/navigation-celestials.test.ts` with tests that use Sharp to assert exact output dimensions, alpha channels, and conservative file-size budgets (`18 KB` standard and `32 KB` retina). Also assert that `package.json` exposes `assets:navigation`.

- [x] **Step 2: Run the test and verify RED**

Run: `node --test tests/navigation-celestials.test.ts`

Expected: FAIL because the responsive WebP assets and package script do not exist.

- [x] **Step 3: Preserve alpha masters and add the deterministic builder**

Copy the three locally de-keyed PNGs into `design-source/navigation-celestials/*-alpha.png`. Create a Sharp builder that trims transparent outer pixels, fits Moon and Earth into `56px` and `112px` square content areas with `4px` and `8px` transparent padding, and fits the black hole into `72×56px` and `144×112px` content areas with matching transparent padding. Encode WebP with quality `92`, alpha quality `100`, and smart subsampling.

Add this package script:

```json
"assets:navigation": "node scripts/build-navigation-celestial-assets.mjs"
```

- [x] **Step 4: Build assets and verify GREEN**

Run:

```bash
npm run assets:navigation
node --test tests/navigation-celestials.test.ts
```

Expected: all celestial asset tests PASS.

### Task 2: Render celestial marks in the shared navigation

**Files:**
- Modify: `src/data/site.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/styles/global.css`
- Modify: `tests/navigation-celestials.test.ts`

**Interfaces:**
- Consumes: the six responsive WebP assets from Task 1.
- Produces: `nav` items with a `celestial` descriptor and shared `.site-nav__celestial` markup/styles.

- [x] **Step 1: Extend the test to define markup and interaction contracts**

Assert that:

- `site.ts` maps `moon`, `earth`, and `black-hole` in route order.
- `BaseLayout.astro` renders a `site-nav__celestial` wrapper with `aria-hidden="true"`, a responsive `srcset`, explicit dimensions, and the existing text labels.
- CSS defines desktop and compact size tokens, preserves full icon opacity on current/hover state, and contains no celestial transform or animation declarations.

- [x] **Step 2: Run the test and verify RED**

Run: `node --test tests/navigation-celestials.test.ts`

Expected: FAIL because the data, markup, and styles do not yet exist.

- [x] **Step 3: Implement the minimal data and markup**

Add a typed `celestial` object to each `nav` item with `kind`, `src`, `srcset`, `width`, and `height`. In the shared layout, render the celestial `<span>` and `<img>` before the label, mark the span decorative, retain the existing route-transition attributes, and keep the link accessible name unchanged.

- [x] **Step 4: Implement shared responsive styling**

Update only the authoritative shared-navigation block in `global.css`:

- set the navigation to a responsive inter-item gap;
- make links `inline-flex` with an `8px` icon-label gap and compact horizontal padding;
- size Moon/Earth to `22px`, black hole to `27×22px`;
- set inactive icon opacity to `0.82` and hover/current opacity to `1` with a subtle brightness/drop-shadow adjustment;
- use `17px`–`18px` icons and a `6px` internal gap on mobile;
- preserve the existing underline and focus behavior without movement.

- [x] **Step 5: Verify GREEN and run the full build**

Run:

```bash
node --test tests/navigation-celestials.test.ts
npm run build
```

Expected: tests PASS and Astro build exits `0`.

- [x] **Step 6: Perform visual smoke checks**

Inspect `/`, `/writing`, `/projects`, and `/ideas` at desktop width, then `/` at mobile width. Confirm recognizable complete silhouettes, alignment with labels, larger spacing between items, no wrapping, no rectangular backgrounds, and no icon motion on hover.

- [x] **Step 7: Review the scoped diff and commit**

Run:

```bash
git diff --check
git diff -- src/data/site.ts src/layouts/BaseLayout.astro src/styles/global.css scripts/build-navigation-celestial-assets.mjs tests/navigation-celestials.test.ts package.json
```

Stage only the navigation plan, new navigation sources/outputs, builder, tests, and the intentionally edited shared files. Commit with:

```bash
git commit -m "feat: add celestial navigation icons"
```
