# Homepage Orrery Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage celestial field so the live page matches the approved black-hole → Moon → Earth master composition, with refined generated assets, one continuous animated particle stream, convincing celestial rotation, and the existing route-opening behavior intact.

**Architecture:** Keep the current Astro/CSS layered composition and add one dependency-free Canvas particle controller. Generated v3 texture masters are processed through Sharp into bounded WebP outputs; CSS masks and fixed lighting turn the lunar and terrestrial panoramas into slowly rotating spheres, while the black-hole core and warp remain independent counter-rotating layers.

**Tech Stack:** Astro 7, TypeScript, CSS compositor animations, Canvas 2D, Sharp, Node test runner, built-in ImageGen.

## Global Constraints

- Preserve the left profile, current deep-space background, navigation, route-opening animations, and Earth rotation behavior.
- Keep one open S-shaped connection from black hole to Moon to Earth; never restore a broad Saturn ring, closed main orbit, or crossing tracks.
- Keep non-active celestial opacity at or above `0.82`; do not add a selected circular outline.
- Respect `prefers-reduced-motion`, `navigator.connection.saveData`, page visibility, stage intersection, and navigation pause.
- Cap the particle renderer at 30fps and device pixel ratio `1.5`; use 28 particles on desktop and 12 on mobile.
- Add no third-party runtime dependency.
- Desktop v3 visual assets must stay within 550KB; mobile v3 visual assets must stay within 260KB.

---

### Task 1: Lock the v3 asset and composition contract

**Files:**
- Modify: `tests/home-orrery.test.ts`
- Modify: `src/data/home-orrery-assets.ts`
- Modify: `scripts/build-home-orrery-assets.mjs`
- Create: `design-source/home-orrery-v3/README.md`

**Interfaces:**
- Produces: `homeOrreryAssetsV3` paths for the component and one deterministic Sharp build command.
- Consumes: image masters added in Task 2.

- [ ] **Step 1: Write the failing manifest and asset-build test**

Add assertions requiring `home-cosmic-system-v3`, lunar and Earth surface panoramas, black-hole core/warp, and particle-river base. Require the build script to emit 960/1600 river images, 1024/2048 surface images, 480/960 core images, and 960/1600 warp images.

```ts
test("v3 orrery manifest describes the approved connected system", () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");
  for (const asset of [
    "home-cosmos-particle-river-v3",
    "home-cosmos-writing-moon-surface-v3",
    "home-cosmos-projects-earth-surface-v3",
    "home-cosmos-ideas-core-v3",
    "home-cosmos-ideas-warp-v3",
  ]) assert.match(manifest, new RegExp(asset));
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/home-orrery.test.ts`

Expected: FAIL because no v3 manifest entries or build outputs exist.

- [ ] **Step 3: Add the exact v3 manifest and Sharp outputs**

Define one `/assets/home-cosmic-system-v3` root. Extend the asset build script with named jobs rather than introducing a second pipeline. Record every source and output in `design-source/home-orrery-v3/README.md`, including the final ImageGen prompts and the approved visual master link.

- [ ] **Step 4: Keep the test RED until the generated masters exist**

Run: `node --test tests/home-orrery.test.ts`

Expected: FAIL on missing output files, proving Task 2 supplies real assets rather than placeholders.

### Task 2: Generate and validate refined production assets

**Files:**
- Create: `design-source/home-orrery-v3/moon-surface-master.png`
- Create: `design-source/home-orrery-v3/earth-surface-master.png`
- Create: `design-source/home-orrery-v3/black-hole-core-master.png`
- Create: `design-source/home-orrery-v3/black-hole-warp-master.png`
- Create: `design-source/home-orrery-v3/particle-river-master.png`
- Create: `public/assets/home-cosmic-system-v3/*.webp`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Produces: opaque seamless surface panoramas and black-background screen-blend layers with the exact dimensions expected by Task 1.
- Consumes: approved master `docs/superpowers/specs/assets/home-orrery-motion-approved-v1.webp` as the visual reference.

- [ ] **Step 1: Generate five masters with built-in ImageGen**

Use one targeted call per master. Moon and Earth prompts require seamless equirectangular 2:1 textures with no sphere edge, text, labels, or hard lighting. Black-hole and particle prompts require pure black backgrounds so `mix-blend-mode: screen` removes the rectangle without fragile alpha extraction.

- [ ] **Step 2: Inspect every master before processing**

Check that the Moon has fine crater relief, Earth has restrained ultramarine painterly detail, the black-hole dark core remains clean, and the particle path visibly touches all three approved anchor regions.

- [ ] **Step 3: Build the v3 WebP family**

Run: `npm run assets:home:orrery`

Expected: the script prints every v3 output path and exits `0`.

- [ ] **Step 4: Extend byte/dimension tests and verify GREEN**

Require exact dimensions, `hasAlpha === false` for panoramas and screen-blend layers, and the global mobile/desktop budgets from this plan.

Run: `node --test tests/home-orrery.test.ts`

Expected: PASS for manifest and asset tests.

### Task 3: Implement the single particle renderer with lifecycle control

**Files:**
- Create: `src/lib/home-orrery-particles.ts`
- Create: `tests/home-orrery-particles.test.ts`
- Modify: `src/components/HomeOrrery.astro`

**Interfaces:**
- Produces: `createOrreryParticleController(canvas, options)` returning `{ setRunning(running), setActiveArtifact(kind), resize(), destroy() }`.
- Consumes: normalized stage coordinates and the existing motion lifecycle.

- [ ] **Step 1: Write failing pure-path tests**

```ts
test("particle path connects black hole through Moon to Earth", () => {
  assert.deepEqual(sampleOrreryPath(0), { x: 0.42, y: 0.76 });
  const moon = sampleOrreryPath(0.5);
  assert.ok(moon.x >= 0.28 && moon.x <= 0.42);
  assert.ok(moon.y >= 0.18 && moon.y <= 0.34);
  assert.deepEqual(sampleOrreryPath(1), { x: 0.86, y: 0.32 });
});

test("particle palette changes from gold through pearl to blue", () => {
  assert.deepEqual(sampleOrreryColor(0), [226, 165, 65]);
  assert.deepEqual(sampleOrreryColor(0.5), [232, 224, 203]);
  assert.deepEqual(sampleOrreryColor(1), [112, 190, 238]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/home-orrery-particles.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure path and controller**

Use two cubic Bézier segments, normalized coordinates, seeded per-particle offsets, and one requestAnimationFrame loop throttled to 30fps. Cap DPR at `1.5`, choose 28 or 12 particles by viewport width, and perform no layout reads inside the draw loop.

- [ ] **Step 4: Connect the controller to the existing lifecycle**

Add `<canvas data-particle-river>` beneath the celestial links. Call `setRunning` from the existing `updateMotionState`, forward `data-active-artifact` changes, resize via `ResizeObserver`, and call `destroy()` on `pagehide`.

- [ ] **Step 5: Verify GREEN**

Run: `node --test tests/home-orrery-particles.test.ts tests/home-orrery.test.ts`

Expected: PASS with exactly one Canvas controller and no independent animation loop in the component.

### Task 4: Rebuild the live three-body composition

**Files:**
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: Task 1 asset manifest and Task 3 particle controller.
- Produces: the approved black-hole → Moon → Earth desktop/mobile layout.

- [ ] **Step 1: Write failing structure and motion assertions**

Require a static river picture, a particle Canvas, Moon and Earth surface tracks, fixed shade layers, independent black-hole core/warp layers, and CSS durations within the spec ranges. Assert that the old broad `home-cosmos__stardust`/`home-cosmos__dust-near` ring composition no longer controls the connection.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/home-orrery.test.ts`

Expected: FAIL on missing river, Moon track, and v3 motion selectors.

- [ ] **Step 3: Replace the visual layers**

Use the v3 static river with `mix-blend-mode: screen`; clip lunar and Earth tracks inside circular masks with fixed radial shade overlays; keep the satellite separate; layer the black-hole warp beneath its clean core.

- [ ] **Step 4: Match the approved anchor positions**

Desktop centers should resolve near black hole `(42%, 76%)`, Moon `(35%, 25%)`, and Earth `(86%, 32%)` inside the stage. Preserve the responsive crop rules while keeping the river visibly connected at 1440px, common laptop widths, and mobile.

- [ ] **Step 5: Implement the approved timing and interaction**

Moon texture: `138s`; Earth texture: `102s`; black-hole core: `36s`; black-hole warp: `62s reverse`; satellite: `21s`; Moon halo: `12s`. Active scale must remain at or below `1.04`; non-active opacity remains `0.82`; focus-visible accessibility remains intact.

- [ ] **Step 6: Verify GREEN**

Run: `node --test tests/home-orrery.test.ts`

Expected: PASS for structure, durations, selected-state, reduced-motion, and route-transition assertions.

### Task 5: Prove visual fidelity and responsive behavior

**Files:**
- Modify if required: `src/styles/home-orrery.css`
- Modify if required: `src/components/HomeOrrery.astro`
- Create: `docs/superpowers/verification/2026-08-05-home-orrery-motion.md`

**Interfaces:**
- Consumes: the complete live composition.
- Produces: screenshot evidence and a requirement-by-requirement visual audit.

- [ ] **Step 1: Start the isolated preview and capture desktop evidence**

Run the app with the real SQLite database. At a 1440px-class desktop viewport, verify the left profile is unchanged and compare the right side against `home-orrery-motion-approved-v1.webp`.

- [ ] **Step 2: Verify animation behavior**

Observe particle travel from black hole through Moon into Earth, lunar/Earth surface movement, counter-rotating black-hole layers, satellite drift, and hover feedback. Confirm no circular selection ring or broad Saturn ring appears.

- [ ] **Step 3: Capture laptop and mobile evidence**

Verify anchors, connection continuity, no text overlap, and the reduced particle count. Verify reduced-motion mode displays the static connected composition with no active Canvas loop.

- [ ] **Step 4: Record the audit**

Write the tested URLs, viewport sizes, screenshots, and every visual acceptance item to the verification document. Any visible mismatch with the approved master remains an implementation failure and must be corrected before Task 6.

### Task 6: Full verification, integration, and deployment

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Produces: a tested main-branch commit and verified production release.

- [ ] **Step 1: Run fresh verification**

```bash
npm run test:content
BLOG_DB_PATH=/Users/misery/Downloads/personal-blog/data/blog.sqlite npm run build
git diff --check
```

Expected: all tests pass, Astro reports zero diagnostics, build exits `0`, and diff check is clean.

- [ ] **Step 2: Confirm only feature files are staged**

Do not stage the user's pre-existing `src/styles/global.css` change or deleted `assets/image_*.png` files.

- [ ] **Step 3: Commit and fast-forward main**

Commit the isolated feature branch, fast-forward the main checkout without disturbing its unrelated worktree changes, and push `main`.

- [ ] **Step 4: Deploy the exact commit and verify the server**

Run `/opt/burns-blog/repository/ops/deploy-release.sh <full-sha>` through Aliyun Cloud Assistant. Verify the release path, active systemd service, `/api/health`, and homepage HTTP `200`.
