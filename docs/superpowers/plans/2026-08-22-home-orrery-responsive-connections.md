# Home Orrery Responsive Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both homepage particle streams attach to the real Moon, Earth, and black-hole positions at every responsive width without changing the desktop celestial layout.

**Architecture:** Replace desktop-normalized path constants with pixel-space Bézier geometry derived from live DOM anchor centers. Use the existing particle canvas as the single renderer for glow, strands, and particles, and remove the independently scaled connection bitmap.

**Tech Stack:** Astro 7, TypeScript 6, Canvas 2D, CSS, Node test runner

## Global Constraints

- Preserve current desktop celestial positions, sizes, hover/focus behavior, and view transitions.
- Do not add runtime dependencies or alter routes/content data.
- Recompute geometry only when layout changes; animation frames must not read layout.
- Cap Canvas backing resolution at device pixel ratio 2.
- Reduced-motion and data-saver modes keep a static connection image drawn by the same Canvas path geometry.
- Do not deploy until desktop and mobile browser screenshots pass visual review.

---

### Task 1: Live-anchor path geometry

**Files:**
- Modify: `src/lib/home-orrery-particles.ts`
- Test: `tests/home-orrery-particles.test.ts`

**Interfaces:**
- Produces: `Point`, `RectLike`, `OrreryAnchorPoints`, `OrreryPathGeometry`, `pointRelativeToRect()`, `createOrreryPathGeometry()`, and `sampleOrreryPath()`.
- Consumes: anchor centers measured in viewport coordinates and the Canvas viewport rectangle.

- [ ] **Step 1: Replace fixed-coordinate assertions with failing live-geometry tests**

```ts
const anchors = {
  blackHole: { x: 180, y: 600 },
  moon: { x: 250, y: 160 },
  earth: { x: 640, y: 280 },
};
const geometry = createOrreryPathGeometry(anchors, { width: 900, height: 700 });
assert.deepEqual(sampleOrreryPath(geometry, "moon", 0), anchors.moon);
assert.deepEqual(sampleOrreryPath(geometry, "moon", 1), anchors.earth);
assert.deepEqual(sampleOrreryPath(geometry, "black-hole", 0), anchors.blackHole);
assert.deepEqual(sampleOrreryPath(geometry, "black-hole", 1), anchors.earth);
assert.deepEqual(
  pointRelativeToRect(
    { left: 225, top: 140, width: 2, height: 2 },
    { left: 25, top: 40, width: 900, height: 700 },
  ),
  { x: 201, y: 101 },
);
```

- [ ] **Step 2: Run the focused test and verify the new exports are missing**

Run: `node --test tests/home-orrery-particles.test.ts`

Expected: FAIL because live path geometry APIs are not exported.

- [ ] **Step 3: Implement pixel-space geometry and relative Bézier controls**

```ts
export type Point = { x: number; y: number };
export type OrreryAnchorPoints = { moon: Point; earth: Point; blackHole: Point };
export type CubicPath = { start: Point; controlA: Point; controlB: Point; end: Point };
export type OrreryPathGeometry = Record<OrreryStream, CubicPath>;

export const sampleOrreryPath = (
  geometry: OrreryPathGeometry,
  stream: OrreryStream,
  progress: number,
) => {
  const path = geometry[stream];
  return cubicPoint(path.start, path.controlA, path.controlB, path.end, progress);
};
```

Generate control points from endpoint deltas. Preserve the current shallow Moon curve and deep black-hole sweep while allowing every endpoint to move independently.

- [ ] **Step 4: Run the focused tests**

Run: `node --test tests/home-orrery-particles.test.ts`

Expected: all particle geometry and palette tests PASS.

- [ ] **Step 5: Commit the geometry change**

```bash
git add src/lib/home-orrery-particles.ts tests/home-orrery-particles.test.ts
git commit -m "fix: derive orrery paths from live anchors"
```

### Task 2: Single responsive connection renderer

**Files:**
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`
- Modify: `src/lib/home-orrery-particles.ts`
- Modify: `tests/home-orrery.test.ts`
- Test: `tests/home-orrery-particles.test.ts`

**Interfaces:**
- Consumes: `createOrreryParticleController(canvas, anchorElements)` and the geometry APIs from Task 1.
- Produces: three `[data-stream-anchor]` DOM points and one Canvas-rendered connection system.

- [ ] **Step 1: Write failing component contract tests**

```ts
assert.doesNotMatch(component, /home-cosmos__connection-base/);
assert.doesNotMatch(component, /homeOrreryAssets\.connectionBase/);
assert.equal((component.match(/data-stream-anchor=/g) ?? []).length, 3);
assert.match(component, /createOrreryParticleController\(canvas,\s*anchorElements\)/);
assert.match(css, /\.home-cosmos__stream-anchor/);
```

Also assert that the controller observes the Canvas and all three anchors, limits DPR to 2, and draws once while motion is paused.

- [ ] **Step 2: Run the focused contracts and verify failure**

Run: `node --test tests/home-orrery.test.ts tests/home-orrery-particles.test.ts`

Expected: FAIL because the fixed connection picture still exists and anchors are absent.

- [ ] **Step 3: Add stable anchor elements without changing celestial layout**

```astro
<span class="home-cosmos__stream-anchor home-cosmos__stream-anchor--moon" data-stream-anchor="moon" aria-hidden="true"></span>
<span class="home-cosmos__stream-anchor home-cosmos__stream-anchor--earth" data-stream-anchor="earth" aria-hidden="true"></span>
<span class="home-cosmos__stream-anchor home-cosmos__stream-anchor--black-hole" data-stream-anchor="black-hole" aria-hidden="true"></span>
```

Place each anchor inside its existing celestial link but outside continuously animated child layers. Position it over the visible Moon center, Earth center, and dark-core center so the planet layer occludes the path seam.

- [ ] **Step 4: Remove the connection bitmap and initialize the Canvas before animation preparation**

Build `anchorElements` from the three data attributes, construct the particle controller as soon as the component binds, and leave it paused for reduced-motion/data-saver scenes. The paused renderer must still draw its base glow and strands.

- [ ] **Step 5: Measure anchors only during resize and render all connection layers from one geometry**

```ts
const stageRect = canvas.getBoundingClientRect();
const nextAnchors = {
  moon: pointRelativeToRect(anchors.moon.getBoundingClientRect(), stageRect),
  earth: pointRelativeToRect(anchors.earth.getBoundingClientRect(), stageRect),
  blackHole: pointRelativeToRect(anchors.blackHole.getBoundingClientRect(), stageRect),
};
geometry = createOrreryPathGeometry(nextAnchors, { width, height });
```

Use the same sampled paths for a soft wide glow, a narrow color-transition current, dashed strands, and moving particles. Do not read element geometry inside `tick()`.

- [ ] **Step 6: Run focused and responsive contracts**

Run: `node --test tests/home-orrery.test.ts tests/home-orrery-particles.test.ts tests/mobile-responsive-contract.test.ts`

Expected: all tests PASS.

- [ ] **Step 7: Commit the integrated renderer**

```bash
git add src/components/HomeOrrery.astro src/styles/home-orrery.css src/lib/home-orrery-particles.ts tests/home-orrery.test.ts tests/home-orrery-particles.test.ts
git commit -m "fix: keep home orrery streams attached responsively"
```

### Task 3: Regression, visual acceptance, and deployment

**Files:**
- Modify only if visual acceptance identifies a scoped geometry/style defect.

**Interfaces:**
- Consumes: production build and browser-rendered homepage.
- Produces: verified release on Alibaba Cloud.

- [ ] **Step 1: Run the complete test and production build suite**

Run: `npm run test:content && npm run build`

Expected: all tests PASS, Astro check reports zero errors, and the production build succeeds.

- [ ] **Step 2: Start the local production-equivalent preview and inspect all target widths**

Inspect 1440, 1280, 1024, 767, 430, 390, 375, and 360 pixel widths. Verify both stream endpoints visually meet their celestial bodies, no double path remains, navigation still works, and desktop geometry is unchanged.

- [ ] **Step 3: Verify resize and reduced-motion behavior**

Resize a live page across the 767px breakpoint and emulate `prefers-reduced-motion: reduce`. Confirm anchors remeasure without stale coordinates and the paused scene retains static currents.

- [ ] **Step 4: Review the final scoped diff and repository status**

Run: `git diff HEAD~2 --check && git status --short`

Expected: no whitespace errors and no unrelated or uncommitted changes.

- [ ] **Step 5: Deploy using the Burns blog deployment procedure and run post-deploy health checks**

Follow `burns-deploy-blog` exactly. Confirm the deployed commit, HTTPS response, homepage asset load, and browser rendering at `https://burnsgao.me/`.
