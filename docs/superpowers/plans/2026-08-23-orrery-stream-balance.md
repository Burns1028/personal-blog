# Orrery Stream Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Moon, Earth, and black-hole particle streams equally legible while preserving distinct colors, and move the Earth stream origin to the existing upper-left blue-white glint.

**Architecture:** Keep the current Three.js and Canvas 2D renderers, central hub, responsive stage, and celestial placement. Add one invisible live marker aligned to the Earth glow asset; pass that measured point into shared geometry; allocate arm particles deterministically from measured cubic length multiplied by stream spread; apply shared per-stream size and opacity gains in both renderers.

**Tech Stack:** Astro, TypeScript, Three.js instanced geometry, Canvas 2D, Node test runner, ImageMagick for reference-coordinate evidence, in-app browser for visual verification.

## Global Constraints

- Do not change the visible position or size of the Moon, Earth, black hole, satellite, navigation, or homepage text.
- Preserve three independent paths that terminate at one shared hub; never create Moon → Earth → black-hole serial topology.
- Do not introduce a ribbon, `Line`, Canvas stroke, mother-band bitmap, or continuous one-pixel spine.
- Earth must start at the existing glow asset's upper-left blue-white glint, measured at `17.36% / 39.58%` inside the Projects celestial box.
- Earth must leave that point along the down-left ellipse tangent before curving to the hub.
- Allocate arm particles from actual cubic arc length multiplied by the stream spread factor; do not divide the arm budget equally.
- Moon remains warm gold into silver-blue; Earth remains blue but loses the overexposed white wedge; black hole remains orange-gold and complete through its middle.
- Three.js and 2D fallback must use the same deterministic arm allocation, opacity gain, and size gain.
- Keep the current responsive quality profiles, live viewport/DPR behavior, lifecycle handling, and fail-closed fallback.
- Keep the local preview running; do not merge, push, or deploy to Alibaba Cloud before explicit user approval.

---

### Task 1: Anchor the Earth stream to the visible glint

**Files:**
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`
- Modify: `src/lib/home-orrery-streams.ts`
- Modify: `src/lib/home-orrery-geometry.ts`
- Test: `tests/home-orrery-geometry.test.ts`
- Test: `tests/home-orrery-streams.test.ts`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: live Projects celestial box, Earth ellipse rectangle, stage rectangle.
- Produces: `OrreryStreamOrigins`, `createOrreryHubGeometry(bodies, stage, origins)`, and a measured `earthOrigin` point used only by the Earth path.

- [ ] **Step 1: Write failing geometry and DOM-contract tests**

Add tests that require an explicit glint point to become the exact Earth path start and require its initial derivative to be tangent to the Earth ellipse:

```ts
const earthOrigin = { x: 292.8, y: 186.4 };
const geometry = createOrreryHubGeometry(bodies, stage, { earth: earthOrigin });
assert.ok(geometry);
assert.deepEqual(geometry.paths.earth.start, earthOrigin);

const tangent = {
  x: geometry.paths.earth.controlA.x - earthOrigin.x,
  y: geometry.paths.earth.controlA.y - earthOrigin.y,
};
const normal = {
  x: (earthOrigin.x - bodies.earth.x) / (bodies.earth.rx ** 2),
  y: (earthOrigin.y - bodies.earth.y) / (bodies.earth.ry ** 2),
};
assert.ok(Math.abs(tangent.x * normal.x + tangent.y * normal.y) < 1e-6);
assert.ok(tangent.x < 0 && tangent.y > 0);
```

Add a facade test proving that the marker rectangle is converted to a stage-local point, plus a source contract requiring `data-orrery-earth-stream-origin` and the `17.36% / 39.58%` CSS coordinates.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test tests/home-orrery-geometry.test.ts tests/home-orrery-streams.test.ts tests/home-orrery.test.ts
```

Expected: FAIL because the geometry has no explicit origin argument and the DOM has no glow marker.

- [ ] **Step 3: Add the live marker and measured origin**

Inside `.home-celestial__motion--projects`, add:

```astro
<span
  class="home-cosmos__earth-stream-origin"
  data-orrery-earth-stream-origin
  aria-hidden="true"
></span>
```

Add an invisible marker whose coordinate matches the ImageMagick-measured glint centroid:

```css
.home-cosmos__earth-stream-origin {
  position: absolute;
  left: 17.36%;
  top: 39.58%;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
```

Extend `OrreryBodyElements` with `earthOrigin: HTMLElement`. During `measure()`, convert the marker rectangle center into stage coordinates and pass it to geometry:

```ts
const earthOriginRect = bodyElements.earthOrigin.getBoundingClientRect();
const earthOrigin = {
  x: earthOriginRect.left + earthOriginRect.width / 2 - stageRect.left,
  y: earthOriginRect.top + earthOriginRect.height / 2 - stageRect.top,
};
```

- [ ] **Step 4: Build a tangent Earth path**

Add an optional origin type:

```ts
export type OrreryStreamOrigins = { earth?: Point };
```

Validate that an explicit Earth point lies near the Earth ellipse. For a valid point, keep the exact start and choose the ellipse tangent whose dot product with `hub - start` is positive. Use that tangent for `controlA`; retain the shared hub as `end`. Invalid explicit origins must fail closed rather than silently attach elsewhere.

- [ ] **Step 5: Run focused tests and commit**

Run the focused command from Step 2. Expected: all PASS.

```bash
git add src/components/HomeOrrery.astro src/styles/home-orrery.css src/lib/home-orrery-streams.ts src/lib/home-orrery-geometry.ts tests/home-orrery-geometry.test.ts tests/home-orrery-streams.test.ts tests/home-orrery.test.ts
git commit -m "fix: anchor earth stream to visible glint"
```

---

### Task 2: Allocate deterministic visual mass from path geometry

**Files:**
- Modify: `src/lib/home-orrery-nebula.ts`
- Test: `tests/home-orrery-nebula.test.ts`

**Interfaces:**
- Consumes: `OrreryHubGeometry`, total quality particle count, seed `1028`.
- Produces: `nebulaStreamWeights(geometry)`, `nebulaStreamCounts(total, weights)`, `nebulaVisualGain(stream)`, and weighted `createOrreryNebulaParticles(total, seed, weights)`.

- [ ] **Step 1: Write failing allocation and gain tests**

For both desktop and phone geometry fixtures, require the effective arm density to remain balanced:

```ts
const weights = nebulaStreamWeights(geometry);
const counts = nebulaStreamCounts(3200, weights);
assert.ok(counts.earth < counts.moon);
assert.ok(counts.moon < counts["black-hole"]);

const effective = streams.map((stream) =>
  counts[stream] / weights[stream]
);
assert.ok(Math.max(...effective) / Math.min(...effective) < 1.08);
```

Require `nebulaVisualGain()` to reduce Earth exposure and gently strengthen Moon/black-hole particles:

```ts
assert.ok(nebulaVisualGain("earth").opacity < 1);
assert.ok(nebulaVisualGain("moon").opacity > nebulaVisualGain("earth").opacity);
assert.ok(nebulaVisualGain("black-hole").size >= nebulaVisualGain("moon").size);
```

Verify identical geometry/count/seed yields a deeply equal particle field.

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
node --test tests/home-orrery-nebula.test.ts
```

Expected: FAIL because the geometry-aware allocation functions do not exist.

- [ ] **Step 3: Implement arc-length weights and exact quotas**

Sample each cubic at 64 equal parameter intervals. Multiply arc length by the existing spread factor (`moon: 1`, `earth: 0.78`, `black-hole: 1.32`). Reserve 9% for hub particles. Floor each proportional arm quota, then assign remaining particles by descending fractional remainder with a stable stream-order tie break. Interleave the resulting arm quotas so seeded random values are not consumed in three large source blocks.

Use these shared visual gains:

```ts
const visualGain = {
  moon: { opacity: 1.1, size: 1.05 },
  earth: { opacity: 0.82, size: 0.92 },
  "black-hole": { opacity: 1.16, size: 1.08 },
  hub: { opacity: 1, size: 1 },
} as const;
```

- [ ] **Step 4: Run the model test and commit**

Run the command from Step 2. Expected: all PASS.

```bash
git add src/lib/home-orrery-nebula.ts tests/home-orrery-nebula.test.ts
git commit -m "feat: balance orrery particle mass"
```

---

### Task 3: Apply the same balance and palette in Three.js and 2D

**Files:**
- Modify: `src/lib/home-orrery-streams-three.ts`
- Modify: `src/lib/home-orrery-streams-2d.ts`
- Test: `tests/home-orrery-streams-three.test.ts`
- Test: `tests/home-orrery-streams-2d.test.ts`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: the Task 2 weighted particle API and visual gains.
- Produces: matching Three.js and 2D visual weighting with unchanged quality/lifecycle interfaces.

- [ ] **Step 1: Write failing renderer behavior tests**

In the Three harness, inspect the instanced `iStyle` source index and require Earth instances to be fewer than Moon and black-hole instances. Assert that Earth alpha/size attributes are lower than their source particle values while Moon and black-hole attributes are higher.

In the 2D controller harness, inject a particle factory that records the received weights or quotas. Require the same stream counts as the Three field for one geometry and quality count. Retain the existing constrained-quality cache and frame-throttle assertions.

Add a source contract that still rejects ribbons, Three line constructors, Canvas strokes, and hard-coded equal arm rotation.

- [ ] **Step 2: Run renderer tests and verify RED**

Run:

```bash
node --test tests/home-orrery-streams-three.test.ts tests/home-orrery-streams-2d.test.ts tests/home-orrery.test.ts
```

Expected: FAIL because both renderers still request equal arm allocation and do not apply stream gains.

- [ ] **Step 3: Wire weighted fields and balanced colors**

Both renderers must derive weights from the current geometry before requesting particles. Include the exact integer arm quotas in the 2D particle-cache key so a same-profile geometry change cannot reuse the wrong distribution.

Apply `nebulaVisualGain(stream)` exactly once to size and opacity in both renderers. Update the Three palette to:

```ts
moon:       { start: 0xf4cf83, end: 0xb9d9ea },
earth:      { start: 0x4698d1, end: 0xa8d8ee },
blackHole:  { start: 0xf09a3a, end: 0xc5c2ad },
```

Move the Three color transition to the final third of each arm with `smoothstep(0.68, 0.94, progress)`. Update the 2D palette to the same identities without adding per-particle strokes or a continuous fog ribbon.

- [ ] **Step 4: Run focused tests and commit**

Run the command from Step 2. Expected: all PASS.

```bash
git add src/lib/home-orrery-streams-three.ts src/lib/home-orrery-streams-2d.ts tests/home-orrery-streams-three.test.ts tests/home-orrery-streams-2d.test.ts tests/home-orrery.test.ts
git commit -m "fix: balance orrery stream color and density"
```

---

### Task 4: Verify visual fidelity against the approved judgment

**Files:**
- Modify: `docs/verification/2026-08-23-orrery-nebula-flow.md`
- Test: `tests/home-orrery-geometry.test.ts`
- Test: `tests/home-orrery-nebula.test.ts`
- Test: `tests/home-orrery-streams-three.test.ts`
- Test: `tests/home-orrery-streams-2d.test.ts`
- Test: `tests/home-orrery-streams.test.ts`
- Test: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 and the local preview at port `4321`.
- Produces: four exact-viewport screenshots and a truthful local verification record.

- [ ] **Step 1: Run focused and full automated gates**

```bash
node --test tests/home-orrery-geometry.test.ts tests/home-orrery-nebula.test.ts tests/home-orrery-streams-three.test.ts tests/home-orrery-streams-2d.test.ts tests/home-orrery-streams.test.ts tests/home-orrery.test.ts
npm run test:content
npm run build
git diff --check
```

Expected: every command exits `0`; Astro reports zero errors, warnings, and hints.

- [ ] **Step 2: Capture exact browser viewports**

Capture `360×800`, `393×852`, `430×932`, and `1440×900` from the live Three renderer. At each viewport verify `scrollWidth === innerWidth`, `data-renderer="three"`, and zero page console warnings/errors.

- [ ] **Step 3: Apply the non-negotiable visual gate**

Reject the result if any statement is false:

1. Earth particles visibly begin at the upper-left blue-white glint and initially arc down-left.
2. The old lower-left Earth attachment is absent.
3. Moon reads as a continuous gold-to-silver-blue stream, not isolated dots.
4. Earth remains blue but is not the only solid or overexposed arm.
5. Black hole reads as a continuous orange-gold stream with a wider halo but no missing middle.
6. All three streams remain separable and end in the same small blue-white-gold hub.
7. No ribbon, line spine, sharp Y, cross, weld point, hard crop, or celestial-layout movement appears.

- [ ] **Step 4: Update evidence and commit**

Record exact screenshots, measured overflow/log results, automated counts, and the final commit range in the verification document.

```bash
git add docs/verification/2026-08-23-orrery-nebula-flow.md
git commit -m "test: verify balanced orrery streams"
```

- [ ] **Step 5: Final clean-tree gate**

```bash
npm run test:content && npm run build && git diff --check && test -z "$(git status --porcelain)"
```

Expected: exit `0`. Keep `feat/threejs-orrery-hub` and its worktree intact for user testing; do not deploy.
