# Three.js Orrery Streams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the stretched homepage connection artwork with a responsive Three.js particle system in which the Moon, Earth, and black hole each connect to one visible central hub.

**Architecture:** Preserve every existing celestial DOM layer and its desktop/mobile geometry. Measure the live Moon, Earth, and black-hole ring rectangles, convert them to stage-local ellipses, and derive three independent cubic Bézier arms that share a central hub. A dynamically imported Three.js renderer draws instanced atlas sprites and narrow ribbons; a Canvas 2D renderer uses the same geometry when WebGL or texture loading fails. The old pre-cut connection image and affine transform are removed from runtime markup.

**Tech Stack:** Astro 7, TypeScript 6, Three.js, WebGL shaders, Canvas 2D, ImageMagick 7, Node test runner

## Global Constraints

- Do not move or resize the existing Moon, Earth, black hole, satellite, navigation, or desktop composition.
- Do not add query flags, gray rollout logic, or alternate production routes.
- Do not deploy in this plan. Finish and visually verify locally, then wait for explicit user confirmation.
- The central hub must be visibly separate from all three bodies. Three independent arms terminate at the exact same hub; no body is a transit node.
- Never restore the old `home-orrery-connection-base` artwork, including in `<noscript>` or error fallback.
- Use test-driven development for each behavior change.

---

## Task 1: Add Three.js and define the shared three-arm geometry

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/home-orrery-geometry.ts`
- Create: `tests/home-orrery-geometry.test.ts`

### Step 1: Write failing geometry tests

Cover these contracts with representative desktop and phone rectangles:

```ts
const geometry = createOrreryHubGeometry({ moon, earth, blackHole }, stage);
assert.ok(geometry);
assert.deepEqual(geometry.paths.moon.end, geometry.hub);
assert.deepEqual(geometry.paths.earth.end, geometry.hub);
assert.deepEqual(geometry.paths.blackHole.end, geometry.hub);
assert.ok(Math.abs(ellipseEquation(moon, geometry.paths.moon.start) - 1) < 0.01);
assert.ok(!pointInsideEllipse(earth, geometry.hub));
assert.ok(distance(geometry.paths.earth.start, geometry.hub) >= earth.rx * 0.25);
```

Also assert that zero-size, non-finite, and severely overlapping layouts return `null`, and that sampling all paths across stage widths from `320` through `1600` stays within the stage plus a two-pixel antialiasing tolerance.

### Step 2: Run the focused test and confirm failure

Run: `node --test tests/home-orrery-geometry.test.ts`

Expected: FAIL because `home-orrery-geometry.ts` does not exist.

### Step 3: Install Three.js

Run: `npm install three`

Expected: `three` is recorded in dependencies and the lockfile changes only for the new package.

### Step 4: Implement the geometry module

Export explicit data structures and pure helpers:

```ts
export type Point = { x: number; y: number };
export type Ellipse = Point & { rx: number; ry: number };
export type CubicPath = { start: Point; controlA: Point; controlB: Point; end: Point };
export type OrreryHubGeometry = {
  hub: Point;
  bodies: OrreryBodies;
  paths: Record<"moon" | "earth" | "black-hole", CubicPath>;
};

export function ellipseBoundaryToward(ellipse: Ellipse, target: Point): Point;
export function sampleCubic(path: CubicPath, progress: number): Point;
export function tangentCubic(path: CubicPath, progress: number): Point;
export function createOrreryHubGeometry(
  bodies: OrreryBodies,
  stage: { width: number; height: number },
): OrreryHubGeometry | null;
```

Place the hub `1.25–1.55` Earth horizontal radii left of the Earth center, use the three body centers to keep its vertical position inside their triangle, and clamp it to the stage. Obtain each celestial endpoint with `ellipseBoundaryToward(body, hub)`. Shape Moon and Earth arms with restrained curvature; shape the black-hole arm so it leaves the ring along an upper-right tangent before turning toward the hub. Reject invalid geometry before returning it.

### Step 5: Run tests

Run: `node --test tests/home-orrery-geometry.test.ts`

Expected: PASS.

### Step 6: Commit

```bash
git add package.json package-lock.json src/lib/home-orrery-geometry.ts tests/home-orrery-geometry.test.ts
git commit -m "feat: define three-arm orrery geometry"
```

---

## Task 2: Generate reusable particle sprites instead of path-shaped strips

**Files:**

- Modify: `scripts/build-home-orrery-particle-atlas.mjs`
- Modify: `src/data/home-orrery-assets.ts`
- Modify: `tests/home-orrery.test.ts`
- Create: `public/assets/home-cosmic-system-v4/home-orrery-particle-atlas-256.webp`
- Create: `public/assets/home-cosmic-system-v4/home-orrery-particle-atlas-512.webp`

### Step 1: Replace strip-oriented asset assertions with atlas assertions

Require a `4 × 4` transparent sprite atlas containing gold, orange, warm-white, transition, blue, and blue-white hub sprites. Assert dimensions, alpha coverage, visible non-black pixels, standard/Retina normalized coverage, and deterministic output from two temporary build directories.

### Step 2: Run the focused asset tests and confirm failure

Run: `node --test --test-name-pattern="particle atlas" tests/home-orrery.test.ts`

Expected: FAIL because the single atlas assets and manifest entries do not exist.

### Step 3: Update the ImageMagick builder

Keep `--output-root`, ImageMagick 7 detection, WebP delegate validation, and the fixed seeded RNG. Generate each sprite in its own atlas cell with transparent padding so WebGL texture sampling cannot bleed across cells. Generate 1× and 2× assets natively; do not scale a rasterized 1× output.

### Step 4: Generate and inspect the assets

Run: `npm run assets:home:orrery:particles`

Run: `magick identify -verbose public/assets/home-cosmic-system-v4/home-orrery-particle-atlas-256.webp | rg "Geometry|Alpha|min|max"`

Expected: `256x256`, alpha channel present, transparent corners, and colored non-black pixels.

### Step 5: Update the asset manifest and pass tests

Expose one `connectionParticleAtlas` standard/Retina pair and remove the four runtime strip roles from the manifest.

Run: `node --test --test-name-pattern="particle atlas" tests/home-orrery.test.ts`

Expected: PASS.

### Step 6: Commit

```bash
git add scripts/build-home-orrery-particle-atlas.mjs src/data/home-orrery-assets.ts tests/home-orrery.test.ts public/assets/home-cosmic-system-v4/home-orrery-particle-atlas-*.webp
git commit -m "feat: build reusable orrery particle atlas"
```

---

## Task 3: Build the shared Canvas 2D fallback

**Files:**

- Create: `src/lib/home-orrery-streams-2d.ts`
- Create: `tests/home-orrery-streams-2d.test.ts`

### Step 1: Write failing renderer tests

Use a recording canvas context to verify that a static render:

- draws all three Bézier arms from their body endpoints to the shared hub;
- draws the blue-white hub core and outer halo after the arms;
- uses `lighter` composition without painting an opaque background;
- clears and draws nothing for `null` geometry;
- stops scheduling and drawing after `destroy()`;
- honors reduced-motion by rendering one stable frame.

### Step 2: Run the focused test and confirm failure

Run: `node --test tests/home-orrery-streams-2d.test.ts`

Expected: FAIL because the fallback module does not exist.

### Step 3: Implement the fallback renderer

Export a controller with the same lifecycle the Three.js facade will use:

```ts
export type OrreryStreamController = {
  prepare(): Promise<boolean>;
  setRunning(running: boolean): void;
  setActiveArtifact(artifact: OrreryArtifact): void;
  resize(): void;
  destroy(): void;
};
```

Use narrow layered strokes, procedural particles, and a radial-gradient hub. Every point comes from `OrreryHubGeometry`; do not contain any source-image anchors, affine matrix, or connection-base dependency.

### Step 4: Run tests and commit

Run: `node --test tests/home-orrery-streams-2d.test.ts`

Expected: PASS.

```bash
git add src/lib/home-orrery-streams-2d.ts tests/home-orrery-streams-2d.test.ts
git commit -m "feat: add resilient orrery stream fallback"
```

---

## Task 4: Build the Three.js instanced stream renderer

**Files:**

- Create: `src/lib/home-orrery-streams-three.ts`
- Create: `tests/home-orrery-streams-three.test.ts`

### Step 1: Write failing pure-data and lifecycle tests

Test quality selection, DPR caps, deterministic particle instances, atlas UV-cell selection, and the three stream distributions. With injectable renderer/texture factories, test successful prepare, texture rejection, WebGL creation failure, context loss, pause/resume, resize, and disposal. Late async success after `destroy()` must not render.

### Step 2: Run the focused test and confirm failure

Run: `node --test tests/home-orrery-streams-three.test.ts`

Expected: FAIL because the Three.js renderer module does not exist.

### Step 3: Implement instanced quad particles

Use one `InstancedBufferGeometry` containing a unit quad and per-instance path, phase, speed, normal offset, size, rotation, color, alpha, and atlas-cell attributes. Use `ShaderMaterial` with additive blending and `depthWrite: false`. Sample the cubic path and tangent in the vertex shader, orient each quad to the path, and sample the atlas cell in the fragment shader.

Implement approximately `1800 / 900 / 420` particles for desktop/mobile/constrained quality, with `45 / 30 / 24 fps` caps and DPR limits `2 / 1.5`. Add up to three narrow ribbon meshes plus one hub sprite/halo, keeping total draw calls at or below six.

### Step 4: Implement lifecycle and failure semantics

Use an orthographic camera whose coordinates match CSS pixels. Rebuild geometry only after `ResizeObserver`-driven layout changes. Return `false` from `prepare()` on renderer or texture failure so the facade can start 2D. On context loss, prevent default, dispose safely, and notify the facade. On destroy, cancel frames and dispose renderer, texture, materials, and geometries exactly once.

### Step 5: Run tests and commit

Run: `node --test tests/home-orrery-streams-three.test.ts`

Expected: PASS.

```bash
git add src/lib/home-orrery-streams-three.ts tests/home-orrery-streams-three.test.ts
git commit -m "feat: render orrery streams with Three.js"
```

---

## Task 5: Integrate the renderer without changing celestial layout

**Files:**

- Create: `src/lib/home-orrery-streams.ts`
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/styles/home-orrery.css`
- Modify: `tests/home-orrery.test.ts`
- Modify: `tests/mobile-responsive-contract.test.ts`

### Step 1: Write failing integration contracts

Assert that `HomeOrrery.astro` contains one transparent `data-orrery-stream-canvas`, measures `.home-cosmos__sphere--moon`, `.home-cosmos__sphere--earth`, and `.home-cosmos__black-hole-core`, dynamically imports the Three.js renderer, and does not contain `data-connection-base`, `home-cosmos__connection-base`, or `data-stream-anchor` markup. Assert existing celestial positioning rules remain byte-for-byte unchanged.

### Step 2: Run focused tests and confirm failure

Run: `node --test tests/home-orrery.test.ts tests/mobile-responsive-contract.test.ts`

Expected: FAIL on the new stream integration assertions.

### Step 3: Implement the facade

The facade owns live body measurement and shared geometry. It starts with a transparent canvas, dynamically imports `home-orrery-streams-three.ts`, and reveals it only after a successful prepared frame. If import, WebGL, atlas decode, or context restore fails, it replaces the backend with `home-orrery-streams-2d.ts` on the same canvas.

Forward `setRunning`, `setActiveArtifact`, `resize`, and `destroy` calls so the existing page visibility, navigation, bfcache, and hover emphasis logic remains intact.

### Step 4: Replace the component wiring and CSS

Remove the pre-cut `<picture>`, 2px anchors, old affine controller import, and connection-base asset reference. Keep the celestial DOM and all `top`, `left`, and `width` declarations unchanged. Put the new canvas above the starfield and below the bodies. Remove the mobile-only `opacity: 0.52` workaround; shader/fallback alpha must be correct at every viewport. Keep the stage clipping/overflow contract.

### Step 5: Run focused tests and commit

Run: `node --test tests/home-orrery.test.ts tests/mobile-responsive-contract.test.ts`

Expected: PASS.

```bash
git add src/lib/home-orrery-streams.ts src/components/HomeOrrery.astro src/styles/home-orrery.css tests/home-orrery.test.ts tests/mobile-responsive-contract.test.ts
git commit -m "feat: connect homepage bodies through central hub"
```

---

## Task 6: Remove the legacy runtime and tighten regression coverage

**Files:**

- Delete: `src/lib/home-orrery-particles.ts`
- Delete: `tests/home-orrery-particles.test.ts`
- Modify: `tests/home-orrery.test.ts`
- Modify: `tests/mobile-responsive-contract.test.ts`

### Step 1: Add failing absence and preservation assertions

Assert that no source imports `home-orrery-particles`, no runtime source references `connectionBase`, `createAffineTransform`, or `CONNECTION_BASE_ANCHORS`, and no `<noscript>` rule revives legacy connection artwork. Keep assertions for Moon/Earth surface animation, black-hole rotor, satellite orbit, artifact navigation, and desktop celestial geometry.

### Step 2: Remove the obsolete module and test file

Delete only the now-unreferenced old controller and its superseded tests. Do not delete celestial or starfield assets. Legacy connection images may remain in `public/` as unreferenced release artifacts; they must not be in runtime HTML, CSS, JavaScript, or the asset manifest.

### Step 3: Run regression tests and commit

Run: `npm run test:content`

Expected: PASS.

```bash
git add -A src/lib/home-orrery-particles.ts tests/home-orrery-particles.test.ts tests/home-orrery.test.ts tests/mobile-responsive-contract.test.ts
git commit -m "refactor: remove stretched orrery connection runtime"
```

---

## Task 7: Full local verification and browser acceptance

**Files:**

- Modify if required by evidence: implementation and focused test files from Tasks 1–6
- Create: `artifacts/browser/home-orrery-threejs/` screenshots and notes only if this repository convention permits tracked artifacts; otherwise keep them untracked in a temporary directory and report their absolute paths.

### Step 1: Run automated verification

Run:

```bash
npm run test:content
npm run build
git diff --check
```

Expected: all tests and Astro checks pass; no whitespace errors.

### Step 2: Start the local production preview

Run: `npm run preview -- --host 127.0.0.1 --port 4322`

Expected: local homepage responds successfully; no Alibaba Cloud state changes.

### Step 3: Inspect required viewports in a real browser

Open and screenshot `/` at:

- `360 × 800`
- `393 × 852`
- `430 × 932`
- `1440 × 900`

At each viewport inspect the full constellation and close crops of the Moon exit, central hub, Earth exit, and black-hole exit. Confirm the hub is visible and separate, all three arms share it, no crescent/hard crop exists, no path enters a body center, and there is no horizontal scrollbar.

### Step 4: Exercise runtime behavior

Confirm animation pause/resume on tab visibility, reduced-motion static rendering, hover/focus emphasis for all three artifacts, bfcache restoration, and a forced WebGL initialization failure that visibly falls back to the same three-arm geometry. Check the browser console for runtime errors.

### Step 5: Compare desktop geometry

Compare the Moon, Earth, and black-hole bounding rectangles against the pre-change desktop snapshot. Center and size deviation must be no more than `1px`; only the connection layer may change.

### Step 6: Fix evidence-backed defects and repeat verification

For every defect, first add or adjust the smallest failing automated test, then patch the implementation and repeat Steps 1–5. Do not declare success from tests alone if the visual crops still fail.

### Step 7: Commit final verification fixes

```bash
git status --short
git add src/lib/home-orrery-geometry.ts src/lib/home-orrery-streams-2d.ts src/lib/home-orrery-streams-three.ts src/lib/home-orrery-streams.ts src/components/HomeOrrery.astro src/styles/home-orrery.css tests/home-orrery-geometry.test.ts tests/home-orrery-streams-2d.test.ts tests/home-orrery-streams-three.test.ts tests/home-orrery.test.ts tests/mobile-responsive-contract.test.ts
git commit -m "fix: polish responsive orrery stream joins"
```

If no fixes were required, do not create an empty commit.

### Step 8: Hand off for user confirmation

Report the local result, exact automated commands, browser viewports, screenshot paths, and any remaining limitations. Explicitly state that production has not been changed. Wait for the user to approve deployment before invoking the Alibaba Cloud deployment skill.
