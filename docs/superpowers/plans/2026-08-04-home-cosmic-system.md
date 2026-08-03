# Home Cosmic System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's three disconnected planet icons with the approved unified moon–Earth–singularity system while preserving the current homepage background, left biography, semantic links, destination-page visuals, and motion safety.

**Architecture:** The approved scene remains a visual reference. ImageGen produces eight versioned source layers that are post-processed into responsive WebP assets; `HomeOrrery.astro` composes those layers with SVG paths and semantic anchors, while `home-orrery.css` supplies compositor-only idle, hover, and View Transition motion. Existing page-level visibility and reduced-motion controls remain the single switch for continuous animation.

**Tech Stack:** Astro 7, TypeScript, CSS transforms/View Transitions, SVG, Sharp, Node test runner, built-in ImageGen plus local chroma-key removal.

## Global Constraints

- Preserve the current homepage black background, sparse stars, left biography, navigation, contacts, and layout.
- Preserve the Projects page rotating Earth, Writing page star atlas and lunar phases, and Ideas page black hole unchanged.
- Use `design-source/home-cosmic-system/approved-scene-v1.png` as the sole visual reference.
- Generate project-bound raster sources with built-in ImageGen; transparent sources use flat chroma-key backgrounds followed by the installed removal helper.
- Keep `/writing`, `/projects`, and `/ideas` as real accessible links with existing artifact identities `document`, `repo`, and `idea`.
- Continuous motion changes only `transform` and `opacity`; pause it for hidden pages, offscreen content, navigation, reduced motion, and save-data conditions.
- Keep the existing 880ms View Transition duration.
- Desktop generated image transfer budget is at most 700 KB; mobile generated image transfer budget is at most 360 KB.
- Do not stage or modify the user's unrelated deleted `assets/image_*.png` files or current `src/styles/global.css` change.

---

### Task 1: Lock the new asset contract with failing tests

**Files:**
- Modify: `tests/home-orrery.test.ts`
- Modify: `tests/content-source-contract.test.ts`

**Interfaces:**
- Consumes: approved design requirements and current homepage route contracts.
- Produces: executable expectations for `homeCosmicAssets`, semantic celestial markup, asset alpha/dimensions/budgets, motion names, and unchanged destination components.

- [ ] **Step 1: Replace the old three-planet manifest expectations with the unified scene contract**

Add assertions that `src/data/home-orrery-assets.ts` contains these exact public asset families:

```ts
for (const asset of [
  "home-cosmos-stardust-main-v2",
  "home-cosmos-dust-near-v2",
  "home-cosmos-writing-moon-v2",
  "home-cosmos-projects-earth-surface-v2",
  "home-cosmos-projects-earth-atmosphere-v2",
  "home-cosmos-ideas-core-v2",
  "home-cosmos-ideas-warp-v2",
  "home-cosmos-satellite-v2",
]) {
  assert.match(manifest, new RegExp(asset));
}
```

- [ ] **Step 2: Assert the new composition and semantic links**

Require `HomeOrrery.astro` to contain `home-cosmos__stardust`, `home-cosmos__earth-track`, `home-cosmos__singularity-inner`, and three `home-celestial` anchors mapped to the existing destinations. Assert that the component does not reference `home-planet-writing-v1`, `home-planet-projects-v1`, or `home-planet-ideas-v1`.

- [ ] **Step 3: Assert animation and safety contracts**

Require CSS names `home-stardust-drift`, `home-near-dust-drift`, `home-earth-surface-turn`, `home-moon-breathe`, `home-satellite-drift`, `home-singularity-inner`, and `home-singularity-outer`; retain assertions for `data-motion-running`, navigation pause, reduced motion, and all three 880ms route openings. Assert that the continuous keyframe section contains no animated `filter`, `background-position`, or `box-shadow`.

- [ ] **Step 4: Assert destination visuals are not replaced**

In `tests/content-source-contract.test.ts`, read `src/components/projects/RotatingEarth.astro`, `src/pages/writing/index.astro`, and `src/components/IdeasSingularity.astro`; assert the Projects component still contains `data-projects-earth-motion`, Writing still renders the archive star atlas, and Ideas still renders `ideas-gravity-orbit`.

- [ ] **Step 5: Run the tests and verify RED**

Run:

```bash
node --test tests/home-orrery.test.ts tests/content-source-contract.test.ts
```

Expected: FAIL because the v2 asset manifest, unified composition classes, and new motion keyframes do not exist.

### Task 2: Generate, extract, and build the approved raster layers

**Files:**
- Create: `design-source/home-cosmic-system/main-stardust-chroma-v2.png`
- Create: `design-source/home-cosmic-system/main-stardust-v2.png`
- Create: `design-source/home-cosmic-system/near-dust-chroma-v2.png`
- Create: `design-source/home-cosmic-system/near-dust-v2.png`
- Create: `design-source/home-cosmic-system/writing-moon-chroma-v2.png`
- Create: `design-source/home-cosmic-system/writing-moon-v2.png`
- Create: `design-source/home-cosmic-system/projects-earth-surface-v2.png`
- Create: `design-source/home-cosmic-system/projects-earth-atmosphere-chroma-v2.png`
- Create: `design-source/home-cosmic-system/projects-earth-atmosphere-v2.png`
- Create: `design-source/home-cosmic-system/ideas-core-chroma-v2.png`
- Create: `design-source/home-cosmic-system/ideas-core-v2.png`
- Create: `design-source/home-cosmic-system/ideas-warp-chroma-v2.png`
- Create: `design-source/home-cosmic-system/ideas-warp-v2.png`
- Create: `design-source/home-cosmic-system/satellite-chroma-v2.png`
- Create: `design-source/home-cosmic-system/satellite-v2.png`
- Create: `scripts/build-home-cosmic-system-assets.mjs`
- Create: versioned WebPs under `public/assets/home-cosmic-system-v2/`

**Interfaces:**
- Consumes: `approved-scene-v1.png` as image reference; chroma-key remover; Sharp.
- Produces: responsive public assets consumed by `homeCosmicAssets` in Task 3.

- [ ] **Step 1: Generate the eight sources with built-in ImageGen**

Use one call per source. Every prompt identifies the approved scene as a style/light/composition reference, forbids text and UI, and asks for exactly one production layer. Use flat `#00ff00` for gold/ivory/blue opaque cutouts and flat `#ff00ff` for any layer containing green-sensitive content. The Earth surface is a non-transparent 2:1 painterly seamless strip.

- [ ] **Step 2: Remove chroma key from the seven transparent sources**

For each chroma source run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input design-source/home-cosmic-system/<name>-chroma-v2.png \
  --out design-source/home-cosmic-system/<name>-v2.png \
  --auto-key border --soft-matte \
  --transparent-threshold 12 --opaque-threshold 220 --despill
```

Validate alpha, transparent corners, no key-colored fringe, and subject coverage with Sharp before using the result.

- [ ] **Step 3: Add the deterministic Sharp build script**

The script reads the eight final masters and emits:

```text
stardust-main-{960,1600}.webp
dust-near-{960,1600}.webp
writing-moon-{480,960}.webp
projects-earth-surface-2048.webp
projects-earth-atmosphere-{480,960}.webp
ideas-core-{480,960}.webp
ideas-warp-{960,1600}.webp
satellite-{320,640}.webp
```

Transparent layers use `alphaQuality: 100`; the Earth strip uses a lossy quality that preserves paint texture. The script exits non-zero when a required master is missing.

- [ ] **Step 4: Build and inspect all assets**

Run:

```bash
node scripts/build-home-cosmic-system-assets.mjs
```

Expected: all sixteen WebPs are created with logged dimensions. Inspect the 1600px desktop composite on the current homepage background before connecting code.

- [ ] **Step 5: Add asset metadata and byte-budget assertions to the failing test**

Use Sharp to assert exact dimensions, alpha on all non-Earth assets, transparent corners, and total desktop/mobile byte budgets of 700 KB/360 KB.

- [ ] **Step 6: Run the asset portion of the test**

Run:

```bash
node --test --test-name-pattern="unified cosmic assets" tests/home-orrery.test.ts
```

Expected: asset checks PASS; component/manifest checks remain RED until Task 3.

- [ ] **Step 7: Commit the generated source and build pipeline**

```bash
git add design-source/home-cosmic-system scripts/build-home-cosmic-system-assets.mjs public/assets/home-cosmic-system-v2 tests/home-orrery.test.ts tests/content-source-contract.test.ts
git commit -m "feat: generate unified homepage cosmic assets"
```

### Task 3: Compose the unified celestial system

**Files:**
- Modify: `src/data/home-orrery-assets.ts`
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`

**Interfaces:**
- Consumes: public WebPs from Task 2 and existing homepage `data-artifact-stage` behavior.
- Produces: one layered cosmic system with three semantic anchors and existing View Transition names.

- [ ] **Step 1: Implement the versioned asset manifest**

Export `homeCosmicAssets` with nested `stardust`, `writing`, `projects`, and `ideas` objects. Each responsive picture path must be explicit; `projects.surface` points to the 2048px seamless strip.

- [ ] **Step 2: Replace the three isolated planet pictures with layered scene markup**

Keep the section's data attributes. Add two decorative dust pictures, one SVG path layer, and three anchors:

```astro
<a class="home-celestial home-celestial--writing" href="/writing" data-artifact="document">
  <span class="home-celestial__motion"><img class="home-cosmos__moon" /></span>
</a>
<a class="home-celestial home-celestial--projects" href="/projects" data-artifact="repo">
  <span class="home-cosmos__earth-mask">
    <span class="home-cosmos__earth-track"><img /><img /></span>
    <img class="home-cosmos__earth-atmosphere" />
  </span>
  <span class="home-cosmos__satellite"><img /></span>
</a>
<a class="home-celestial home-celestial--ideas" href="/ideas" data-artifact="idea">
  <img class="home-cosmos__singularity-outer" />
  <img class="home-cosmos__singularity-inner" />
</a>
```

Retain empty-alt decorative images, descriptive anchor `aria-label`s, and the `artifact-document`, `artifact-repo`, and `artifact-idea` View Transition names.

- [ ] **Step 3: Implement approved desktop composition and responsive crops**

Use the approved scene's asymmetric hierarchy: moon upper-middle, Earth largest at far right, dark core lower-middle, and satellite near Earth. Keep all generated layers within the right-hand stage and transform the mobile layout into one horizontal celestial tableau below the biography.

- [ ] **Step 4: Run the composition tests and verify GREEN**

Run:

```bash
node --test tests/home-orrery.test.ts tests/content-source-contract.test.ts
```

Expected: all tests in both files PASS.

- [ ] **Step 5: Commit the static composition**

```bash
git add src/data/home-orrery-assets.ts src/components/HomeOrrery.astro src/styles/home-orrery.css tests/home-orrery.test.ts tests/content-source-contract.test.ts
git commit -m "feat: compose unified homepage cosmic system"
```

### Task 4: Add layered idle, interaction, and transition motion

**Files:**
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: `data-motion-running`, `data-active-artifact`, and route intent attributes.
- Produces: pausable compositor-only animation and route-specific 880ms openings.

- [ ] **Step 1: Add a failing save-data and motion-state assertion**

Require the component to treat `navigator.connection?.saveData` as a no-motion condition and to remove `data-motion-running` on navigation, visibility loss, or reduced-motion changes.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test --test-name-pattern="ambient motion" tests/home-orrery.test.ts
```

Expected: FAIL because save-data is not yet part of the motion gate and the new keyframes are absent.

- [ ] **Step 3: Implement the idle motion table**

Apply the approved timings: main dust 54s, near dust 38s, Earth surface 108s, moon 12s, satellite 18s, singularity inner 38s, singularity outer 60s. Use nested elements so hover/parallax transforms do not overwrite idle transforms.

- [ ] **Step 4: Implement hover and focus states**

The active anchor scales no more than 1.03, its connected SVG path segment brightens, and the other two anchors reduce to 0.75 opacity. Keep enlarged hit regions and visible gold focus arcs without labels or cards.

- [ ] **Step 5: Implement route-specific openings**

Keep 880ms View Transitions. Writing expands an ivory lunar field, Projects performs a 720ms satellite double-bob before the Earth expansion, and Ideas contracts dust before the aperture expansion. Pause ambient motion as soon as the navigation event fires.

- [ ] **Step 6: Implement constrained-motion fallbacks**

Under reduced motion or save-data, render the approved static composition; allow only a 160–180ms opacity response and normal navigation. Do not load the near-dust desktop source in the mobile picture source.

- [ ] **Step 7: Run focused and full tests**

```bash
node --test tests/home-orrery.test.ts tests/content-source-contract.test.ts
npm run test:content
```

Expected: all tests PASS with zero failures.

- [ ] **Step 8: Commit the motion system**

```bash
git add src/components/HomeOrrery.astro src/styles/home-orrery.css tests/home-orrery.test.ts
git commit -m "feat: animate homepage cosmic system"
```

### Task 5: Visual, performance, and production verification

**Files:**
- Modify only if a regression is found: `src/components/HomeOrrery.astro`, `src/styles/home-orrery.css`, `scripts/build-home-cosmic-system-assets.mjs`, `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: complete homepage scene.
- Produces: verified build and browser evidence.

- [ ] **Step 1: Run complete automated verification**

```bash
npm run test:content
npm run check
npm run build
git diff --check
```

Expected: every command exits 0 with no test failures or type/build errors.

- [ ] **Step 2: Start the production preview and inspect four viewports**

Run `npm run preview -- --host 127.0.0.1` and inspect desktop 1840×854, desktop 1440×900, tablet 1024×768, and mobile 390×844. Confirm the left biography remains unchanged, the existing background remains visible, and all three destinations are clickable.

- [ ] **Step 3: Verify motion and navigation behavior**

Record or inspect idle motion for at least one Earth texture loop sample, then click each body in separate reloads. Confirm no white flash, no route delay caused by the satellite animation, destination-page visuals remain intact, and reduced-motion mode is static.

- [ ] **Step 4: Verify transfer size and runtime stability**

Use the asset test totals and browser network panel to confirm desktop/mobile budgets. Confirm no animation continues when the page is hidden and no console errors occur during navigation.

- [ ] **Step 5: Commit any verification corrections**

If corrections were required, rerun Step 1 and commit only the corrected files:

```bash
git add src/components/HomeOrrery.astro src/styles/home-orrery.css scripts/build-home-cosmic-system-assets.mjs tests/home-orrery.test.ts
git commit -m "fix: polish homepage cosmic system"
```
