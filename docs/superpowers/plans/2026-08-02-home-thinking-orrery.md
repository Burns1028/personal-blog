# Homepage Thinking Orrery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage artifact collage with a performant, accessible three-planet orrery whose planet clicks expand into Writing, Projects, and Ideas.

**Architecture:** A focused Astro component renders three stable route anchors over the existing star field and Saturn ring. Generated transparent planet assets provide texture; deterministic SVG/CSS provides the orbital instrument and all motion. Existing `data-artifact` and cross-document View Transition plumbing remains the shared interaction interface.

**Tech Stack:** Astro 7, TypeScript 6, CSS View Transitions, Node test runner, Sharp, built-in ImageGen plus local chroma-key removal.

## Global Constraints

- Preserve the left biography column, existing star field, Saturn-ring asset, destination rotating Earth, Writing star map and lunar phases, and Ideas black hole.
- Render exactly three complete non-overlapping planets linked to `/writing`, `/projects`, and `/ideas`.
- Use no new runtime dependency, particle engine, WebGL, animated blur, or full-screen filter.
- Pause continuous motion during route navigation and honor `prefers-reduced-motion`.
- Keep all planet hit areas fixed while idle and hovering.

---

### Task 1: Lock the homepage orrery contract

**Files:**
- Create: `tests/home-orrery.test.ts`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: homepage source, global layout source, orrery stylesheet, and generated assets.
- Produces: executable structure, accessibility, motion, and asset contracts for every later task.

- [ ] **Step 1: Write failing structure and asset tests**

Create Node tests that assert:

```ts
assert.match(homepage, /import HomeOrrery/);
assert.match(homepage, /<HomeOrrery\s*\/>/);
assert.doesNotMatch(homepage, /home-github-cutout|home-manuscript-cutout|home-sketch-cutout/);
assert.equal((orrery.match(/class="home-planet home-planet--/g) ?? []).length, 3);
assert.match(orrery, /href="\/writing"[\s\S]*data-artifact="document"/);
assert.match(orrery, /href="\/projects"[\s\S]*data-artifact="repo"/);
assert.match(orrery, /href="\/ideas"[\s\S]*data-artifact="idea"/);
```

Add Sharp checks for each 960px WebP: alpha channel present, four corners transparent, width 960, and file size below 500 KB. Add stylesheet checks for 78s dust flow, 48s Projects rotation, 18s satellite orbit, 88s Ideas rotation, reduced-motion rules, navigation pause rules, and absence of `filter:` inside planet transition keyframes.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/home-orrery.test.ts`

Expected: FAIL because `HomeOrrery.astro`, its stylesheet, manifest, and the planet assets do not exist.

### Task 2: Generate and build the three production planets

**Files:**
- Create: `design-source/home-orrery/writing-planet-chroma.png`
- Create: `design-source/home-orrery/projects-planet-chroma.png`
- Create: `design-source/home-orrery/ideas-planet-chroma.png`
- Create: `design-source/home-orrery/writing-planet-master.png`
- Create: `design-source/home-orrery/projects-planet-master.png`
- Create: `design-source/home-orrery/ideas-planet-master.png`
- Create: `scripts/build-home-orrery-assets.mjs`
- Create: `src/data/home-orrery-assets.ts`
- Create: `public/assets/home-planet-writing-v1-480.webp`
- Create: `public/assets/home-planet-writing-v1-960.webp`
- Create: `public/assets/home-planet-projects-v1-480.webp`
- Create: `public/assets/home-planet-projects-v1-960.webp`
- Create: `public/assets/home-planet-ideas-v1-480.webp`
- Create: `public/assets/home-planet-ideas-v1-960.webp`
- Modify: `package.json`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: three ImageGen chroma sources and the installed chroma-key removal helper.
- Produces: `homeOrreryAssets` with `writing`, `projects`, `ideas`, and `satellite` paths.

- [ ] **Step 1: Generate the three chroma-key source images**

Use one built-in ImageGen call per planet. Each prompt requires a single complete centered sphere on perfectly flat `#00ff00`, no cast shadow, no satellite, no rings, no text, and no green in the subject. Use the approved mockup and corresponding destination artwork only as style references.

- [ ] **Step 2: Remove chroma key and inspect alpha masters**

Run the installed helper for each source:

```bash
python /Users/misery/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input design-source/home-orrery/writing-planet-chroma.png \
  --out design-source/home-orrery/writing-planet-master.png \
  --auto-key border --soft-matte --transparent-threshold 12 \
  --opaque-threshold 220 --despill
```

Repeat for Projects and Ideas. Inspect every master for complete spherical edges, transparent corners, plausible subject coverage, and no green fringe.

- [ ] **Step 3: Add the deterministic Sharp build and manifest**

The build script loops over `writing`, `projects`, and `ideas`, trims transparent padding to a common square canvas, and writes 480px and 960px alpha WebP variants with quality 88, alphaQuality 100, and effort 6. The manifest exposes:

```ts
export const homeOrreryAssets = {
  writing: { standard: "/assets/home-planet-writing-v1-480.webp", retina: "/assets/home-planet-writing-v1-960.webp" },
  projects: { standard: "/assets/home-planet-projects-v1-480.webp", retina: "/assets/home-planet-projects-v1-960.webp" },
  ideas: { standard: "/assets/home-planet-ideas-v1-480.webp", retina: "/assets/home-planet-ideas-v1-960.webp" },
  satellite: "/assets/projects-satellite-v2.webp",
} as const;
```

Add `"assets:home:orrery": "node scripts/build-home-orrery-assets.mjs"` to `package.json`.

- [ ] **Step 4: Build assets and verify the asset portion becomes GREEN**

Run: `npm run assets:home:orrery && node --test tests/home-orrery.test.ts`

Expected: asset assertions pass; component and stylesheet assertions still fail.

### Task 3: Replace the collage with the semantic orrery

**Files:**
- Create: `src/components/HomeOrrery.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: `homeOrreryAssets`, existing `data-artifact` values, and existing `burns:artifact-navigation-start` event.
- Produces: `[data-home-orrery]`, `[data-artifact-stage]`, and exactly three stable planet anchors.

- [ ] **Step 1: Implement the component markup**

Render an SVG orbit plate and three anchors. Each anchor contains a responsive `<picture>`, an accessible route name, and decorative halo elements. The Projects anchor additionally contains the existing satellite asset in a dedicated orbit wrapper. Use `aria-label` values `进入 Writing`, `进入 Projects`, and `进入 Ideas`.

- [ ] **Step 2: Add visibility and navigation pausing**

Use one `IntersectionObserver` to toggle `data-motion-running`. Listen for `visibilitychange` and `burns:artifact-navigation-start`; do not create a `requestAnimationFrame` loop.

- [ ] **Step 3: Replace only the old homepage right-side markup**

Import `HomeOrrery` and replace the entire `.artifact-stage` collage with `<HomeOrrery />`. Keep the biography, action row, contact section, and existing active-artifact JavaScript behavior intact.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/home-orrery.test.ts`

Expected: structure assertions pass; stylesheet assertions remain red until Task 4.

### Task 4: Implement ambient motion and interaction styling

**Files:**
- Create: `src/styles/home-orrery.css`
- Modify: `src/layouts/BaseLayout.astro`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: the component class names, `data-active-artifact`, `data-motion-running`, and `data-artifact-navigating`.
- Produces: desktop/mobile layout, stable hit areas, synchronized focus states, and compositor-only ambient animation.

- [ ] **Step 1: Import the stylesheet globally after `global.css`**

Add `import "../styles/home-orrery.css";` to `BaseLayout.astro` so the source and destination documents share View Transition rules.

- [ ] **Step 2: Add desktop and responsive composition**

Position Writing upper-middle, Projects far right, and Ideas lower-middle. Use media queries at 1100px and 760px. On mobile, stack the orrery beneath the biography and keep each hit area at least 72px.

- [ ] **Step 3: Add ambient and interaction motion**

Implement `home-dust-orbit` at 78s, `home-projects-turn` at 48s, `home-satellite-orbit` at 18s, `home-ideas-turn` at 88s reverse, `home-ideas-breathe` at 9s, and `home-writing-breathe` at 12s. Apply animation only when `data-motion-running="true"`. Active planets scale no more than 1.065; sibling planets recede using opacity only.

- [ ] **Step 4: Add motion guards**

Pause every home orrery animation under `html[data-artifact-navigating]`, when the running attribute is absent, and under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/home-orrery.test.ts`

Expected: PASS.

### Task 5: Replace paper-opening transitions with planetary expansion

**Files:**
- Modify: `src/styles/home-orrery.css`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: `artifact-repo`, `artifact-document`, `artifact-idea` View Transition names and `data-artifact-intent`.
- Produces: three 880ms route-specific planet transitions with root destination reveal.

- [ ] **Step 1: Extend the failing motion contract**

Assert that the stylesheet maps each planet to its existing View Transition name, disables names on non-selected planets, and defines `planet-open-writing`, `planet-open-projects`, and `planet-open-ideas` at 880ms. Slice the keyframe section and assert it contains no `filter`, `blur`, or `drop-shadow` declarations.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/home-orrery.test.ts`

Expected: FAIL because planetary transition keyframes are not present.

- [ ] **Step 3: Add the three route transitions**

Writing compresses and expands into a parchment-toned circular field. Projects advances left and expands into a cobalt horizon. Ideas contracts, then expands as a dark aperture. Animate only transform and opacity in transition keyframes; static pseudo-element backgrounds may provide route color.

- [ ] **Step 4: Verify GREEN and run the full content test suite**

Run: `node --test tests/home-orrery.test.ts && npm run test:content`

Expected: all tests pass with zero failures.

### Task 6: Build and visual acceptance

**Files:**
- Modify only if verification exposes a regression in files already listed above.

**Interfaces:**
- Consumes: the completed homepage and all existing destination pages.
- Produces: verified production output at desktop and mobile widths.

- [ ] **Step 1: Run static checks and production build**

Run: `npm run check && npm run build`

Expected: both commands exit 0 with no Astro or TypeScript errors.

- [ ] **Step 2: Inspect desktop homepage**

At 2048×943, confirm the left biography is unchanged, exactly three complete planets are visible, the granular ring remains visible, planet hit areas do not overlap, and no old artifact image is requested.

- [ ] **Step 3: Inspect interaction and destination continuity**

Activate planets and left actions with pointer and keyboard. Confirm matching highlights. Open each route and confirm Writing atlas/phases, Projects rotating Earth/satellite, and Ideas black hole remain present after the transition.

- [ ] **Step 4: Inspect mobile and reduced motion**

At 390×844, confirm planets sit below copy, remain fully clickable, and do not cover text. Emulate reduced motion and confirm the orrery is static while navigation still works.

- [ ] **Step 5: Re-run fresh verification after any visual fixes**

Run: `npm run test:content && npm run check && npm run build`

Expected: all commands exit 0.
