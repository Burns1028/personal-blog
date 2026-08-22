# Orrery Nebula Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage’s visible three-prong linework with three layered, organic particle streams that merge into a small asymmetric gold-blue nebula.

**Architecture:** Keep the existing responsive Bézier geometry as an invisible motion skeleton. Move deterministic visual distribution into a renderer-independent model consumed by both the Three.js renderer and the 2D fallback; remove the Three.js ribbon mesh and all 2D stroked paths. Render the hub as a bounded cloud of particles plus a soft, non-circular core.

**Tech Stack:** Astro 7, TypeScript, Three.js 0.185, WebGL instancing, Canvas 2D, Node test runner.

## Global Constraints

- Do not change the CSS positions or sizes of the Moon, Earth, black hole, satellite, navigation, or desktop composition.
- Keep one exact logical hub and three independent Moon, Earth, and black-hole paths.
- Never render a continuous visible line from a body to the hub.
- Keep the current 4×4 transparent particle atlas; do not add a mother-band bitmap.
- Use deterministic seeded particle distributions so resize and lifecycle recovery do not teleport the field.
- Preserve the shared-geometry 2D fallback for particle-atlas failure, WebGL initialization failure, and context loss.
- Reduced-motion, data-saver, paused-page, and constrained-device modes must retain a static or lower-quality three-stream nebula instead of hiding the connection.
- Validate `360×800`, `393×852`, `430×932`, and `1440×900` in a real browser before handoff.
- Do not deploy to Alibaba Cloud until the user approves the local screenshots.

---

### Task 1: Renderer-independent nebula distribution

**Files:**
- Create: `src/lib/home-orrery-nebula.ts`
- Create: `tests/home-orrery-nebula.test.ts`

**Interfaces:**
- Consumes: `OrreryStream` from `src/lib/home-orrery-geometry.ts`.
- Produces: `OrreryNebulaParticle`, `createOrreryNebulaParticles(count, seed)`, `nebulaSpread(stream, layer, progress, stageShortEdge)`, and `nebulaOpacity(layer, progress)`.

- [ ] **Step 1: Write the failing deterministic-distribution tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrreryNebulaParticles,
  nebulaOpacity,
  nebulaSpread,
} from "../src/lib/home-orrery-nebula.ts";

test("nebula particles are deterministic and include three visual layers plus hub dust", () => {
  const first = createOrreryNebulaParticles(900, 1028);
  assert.deepEqual(first, createOrreryNebulaParticles(900, 1028));
  assert.ok(["mist", "dust", "spark"].every((layer) => first.some((p) => p.layer === layer)));
  assert.ok(first.some((p) => p.stream === "hub"));
  assert.ok(["moon", "earth", "black-hole"].every((stream) => first.some((p) => p.stream === stream)));
});

test("mist is broad, sparks are sparse, and all arms converge without a one-pixel spine", () => {
  assert.ok(nebulaSpread("black-hole", "mist", 0.45, 366) > nebulaSpread("black-hole", "dust", 0.45, 366));
  assert.ok(nebulaSpread("moon", "dust", 0.98, 366) > 0);
  assert.ok(nebulaSpread("moon", "dust", 0.98, 366) < nebulaSpread("moon", "dust", 0.5, 366));
  assert.ok(nebulaOpacity("mist", 0.5) < nebulaOpacity("dust", 0.5));
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run: `node --test tests/home-orrery-nebula.test.ts`

Expected: FAIL because `src/lib/home-orrery-nebula.ts` does not exist.

- [ ] **Step 3: Implement the deterministic visual model**

```ts
import type { OrreryStream } from "./home-orrery-geometry.ts";

export type OrreryNebulaLayer = "mist" | "dust" | "spark";
export type OrreryNebulaSource = OrreryStream | "hub";

export type OrreryNebulaParticle = {
  stream: OrreryNebulaSource;
  layer: OrreryNebulaLayer;
  phase: number;
  speed: number;
  lateralSeed: number;
  clusterSeed: number;
  size: number;
  rotation: number;
  alpha: number;
  atlasCell: number;
};

const layerFor = (value: number): OrreryNebulaLayer =>
  value < 0.22 ? "mist" : value < 0.91 ? "dust" : "spark";

export const nebulaSpread = (
  stream: OrreryStream,
  layer: OrreryNebulaLayer,
  progress: number,
  stageShortEdge: number,
) => {
  const streamScale = stream === "black-hole" ? 1.32 : stream === "earth" ? 0.78 : 1;
  const layerScale = layer === "mist" ? 1.7 : layer === "spark" ? 1.18 : 1;
  const convergence = 0.18 + Math.sin(Math.PI * progress) * 0.82;
  return stageShortEdge * 0.028 * streamScale * layerScale * convergence;
};
```

Use this deterministic allocation: the first 9% of indices are `stream: "hub"`; remaining indices rotate through `moon`, `earth`, and `black-hole`. Draw the layer from `layerFor(random())`. Use `mist: size 2.8–6.4, alpha 0.05–0.16`, `dust: size 0.7–3.1, alpha 0.16–0.58`, and `spark: size 1.2–3.8, alpha 0.48–0.88`. Compute `atlasCell` as `0–3` for black-hole starts, `4–7` for Moon starts, and `8–15` for Earth, hub, and any arm particle with `phase >= 0.72`.

```ts
export const nebulaOpacity = (layer: OrreryNebulaLayer, progress: number) => {
  const edgeFade = Math.min(1, progress / 0.08, (1 - progress) / 0.06);
  const base = layer === "mist" ? 0.12 : layer === "dust" ? 0.46 : 0.78;
  return Math.max(0, base * edgeFade);
};

export const createOrreryNebulaParticles = (count: number, seed = 1028) => {
  const random = seededRandom(seed);
  const total = Math.max(0, Math.floor(count));
  const hubCount = Math.round(total * 0.09);
  const arms = ["moon", "earth", "black-hole"] as const;
  return Array.from({ length: total }, (_, index): OrreryNebulaParticle => {
    const stream = index < hubCount ? "hub" : arms[(index - hubCount) % 3];
    const layer = layerFor(random());
    const phase = random();
    const sizeRange = layer === "mist" ? [2.8, 6.4] : layer === "dust" ? [0.7, 3.1] : [1.2, 3.8];
    const alphaRange = layer === "mist" ? [0.05, 0.16] : layer === "dust" ? [0.16, 0.58] : [0.48, 0.88];
    return {
      stream,
      layer,
      phase,
      speed: 0.012 + random() * 0.031,
      lateralSeed: random() * 2 - 1,
      clusterSeed: random(),
      size: sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]),
      rotation: (random() - 0.5) * Math.PI,
      alpha: alphaRange[0] + random() * (alphaRange[1] - alphaRange[0]),
      atlasCell: atlasCellFor(stream, phase, index),
    };
  });
};
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test tests/home-orrery-nebula.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit the model**

```bash
git add src/lib/home-orrery-nebula.ts tests/home-orrery-nebula.test.ts
git commit -m "feat: model layered orrery nebula particles"
```

---

### Task 2: Three.js layered streams without ribbon lines

**Files:**
- Modify: `src/lib/home-orrery-streams-three.ts`
- Modify: `tests/home-orrery-streams-three.test.ts`

**Interfaces:**
- Consumes: `createOrreryNebulaParticles()`, `nebulaSpread()`, and `nebulaOpacity()` from Task 1; existing `OrreryHubGeometry` snapshots.
- Produces: the existing `createOrreryThreeStreamController()` interface with particle-only arms and an asymmetric hub cloud.

- [ ] **Step 1: Add failing source and behavior assertions**

```ts
test("Three streams contain no continuous ribbon mesh", () => {
  const source = readFileSync(resolve(import.meta.dirname, "../src/lib/home-orrery-streams-three.ts"), "utf8");
  assert.doesNotMatch(source, /createRibbonGeometry|ribbonGeometry|ribbonMaterial/);
  assert.doesNotMatch(source, /new MeshBasicMaterial/);
  assert.match(source, /createOrreryNebulaParticles/);
});

test("hub particles share the instanced draw without exceeding the WebGL attribute floor", () => {
  const particles = createOrreryNebulaParticles(900, 1028);
  assert.ok(particles.filter((particle) => particle.stream === "hub").length >= 60);
  assert.ok(particles.filter((particle) => particle.layer === "spark").length < particles.filter((particle) => particle.layer === "dust").length);
});
```

- [ ] **Step 2: Run the Three.js tests and verify the ribbon assertion fails**

Run: `node --test tests/home-orrery-nebula.test.ts tests/home-orrery-streams-three.test.ts`

Expected: FAIL because `createRibbonGeometry`, `ribbonGeometry`, and `ribbonMaterial` still exist.

- [ ] **Step 3: Replace ribbon geometry with layered particle data**

Import the Task 1 model. Remove the complete `createRibbonGeometry()` declaration, the `ribbonGeometry` and `ribbonMaterial` controller fields, both ribbon disposal calls, and the `scene.add(new Mesh(ribbonGeometry, ribbonMaterial))` block. In `createParticleGeometry()`, use the following branch so arm particles receive signed spread and hub particles receive the exact hub with `sourceIndex === 3`:

```ts
const sourceIndex = particle.stream === "hub" ? 3 : streamIndex(particle.stream);
const path = particle.stream === "hub" ? null : geometry.paths[particle.stream];
const start = path?.start ?? geometry.hub;
const controlA = path?.controlA ?? geometry.hub;
const controlB = path?.controlB ?? geometry.hub;
const end = path?.end ?? geometry.hub;
const spread = particle.stream === "hub"
  ? stageShortEdge * (0.008 + particle.clusterSeed * 0.026)
  : nebulaSpread(particle.stream, particle.layer, particle.phase, stageShortEdge) * particle.lateralSeed;
```

Pack layer behavior into existing attributes without increasing the instanced-attribute count:

```ts
motions.push(particle.phase, particle.speed, signedSpread, particle.size);
styles.push(particle.rotation, particle.alpha, sourceIndex, particle.atlasCell);
```

In the vertex shader, keep cubic motion for `vStream < 2.5`. For hub particles, orbit within a bounded asymmetric cloud around `iStart`:

```glsl
if (iStyle.z > 2.5) {
  float angle = iMotion.x * 6.2831853 + uTime * iMotion.y;
  center = iStart + vec2(cos(angle), sin(angle) * 0.58) * abs(iMotion.z);
} else {
  center += normal * iMotion.z;
}
```

Replace the circular hub fragment with this offset elliptical haze, which cannot draw a hard ring or cross:

```glsl
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 point = vUv - vec2(0.47, 0.53);
  float ellipse = length(vec2(point.x * 0.78, point.y * 1.18)) * 2.0;
  float breath = 0.97 + sin(uTime * 0.73) * 0.03;
  float haze = smoothstep(1.0, 0.08, ellipse / breath);
  float core = smoothstep(0.31, 0.0, length(point * vec2(1.05, 1.32)) * 2.0);
  vec3 cool = vec3(0.24, 0.62, 0.91);
  vec3 warm = vec3(0.88, 0.58, 0.24);
  vec3 color = mix(warm, cool, smoothstep(-0.18, 0.24, point.x + point.y));
  color = mix(color, vec3(0.92, 0.98, 1.0), core * 0.72);
  gl_FragColor = vec4(color, haze * 0.17 + core * 0.46);
}
```

Keep `DoubleSide`, additive blending, `depthWrite: false`, and `depthTest: false`.

- [ ] **Step 4: Run the Three.js tests**

Run: `node --test tests/home-orrery-nebula.test.ts tests/home-orrery-streams-three.test.ts`

Expected: all tests PASS; instanced attributes remain at or below 10.

- [ ] **Step 5: Commit the Three.js renderer**

```bash
git add src/lib/home-orrery-streams-three.ts tests/home-orrery-streams-three.test.ts
git commit -m "feat: render organic orrery nebula streams"
```

---

### Task 3: Particle-only 2D fallback

**Files:**
- Modify: `src/lib/home-orrery-streams-2d.ts`
- Modify: `tests/home-orrery-streams-2d.test.ts`

**Interfaces:**
- Consumes: the Task 1 deterministic particle model and the existing `OrreryRenderSnapshot`.
- Produces: unchanged `drawOrreryStreams2D()` and `createOrrery2DStreamController()` interfaces.

- [ ] **Step 1: Replace the old path-stroke test with failing particle-only assertions**

```ts
test("the 2D fallback draws particle clouds without a continuous path stroke", () => {
  const { context, calls } = recordingContext();
  drawOrreryStreams2D(context, snapshot, 1200, "none");
  assert.equal(calls.filter((call) => call.name === "stroke").length, 0);
  assert.equal(calls.filter((call) => call.name === "bezierCurveTo").length, 0);
  assert.ok(calls.filter((call) => call.name === "arc").length > 100);
  assert.ok(calls.filter((call) => call.name === "radialGradient").length >= 2);
});
```

- [ ] **Step 2: Run the 2D test and verify it fails on existing strokes**

Run: `node --test tests/home-orrery-nebula.test.ts tests/home-orrery-streams-2d.test.ts`

Expected: FAIL because the current fallback calls `stroke()` six times.

- [ ] **Step 3: Draw the shared deterministic particle field**

Delete both Bézier stroke passes from `drawArm()`. Create one cached `fallbackParticles = createOrreryNebulaParticles(540, 1028)` and draw each particle with this sampling structure:

```ts
const progress = (particle.phase + time * particle.speed * 0.001) % 1;
const path = geometry.paths[particle.stream];
const point = sampleCubic(path, progress);
const tangent = tangentCubic(path, progress);
const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
const spread = nebulaSpread(
  particle.stream,
  particle.layer,
  progress,
  Math.min(snapshot.width, snapshot.height),
) * particle.lateralSeed;
const x = point.x + (-tangent.y / tangentLength) * spread;
const y = point.y + (tangent.x / tangentLength) * spread;
context.globalAlpha = particle.alpha * nebulaOpacity(particle.layer, progress) * emphasis;
context.beginPath();
context.arc(x, y, particle.size * 0.52, 0, Math.PI * 2);
context.fill();
```

For `stream: "hub"`, position each particle on an ellipse around `geometry.hub` using `angle = phase * Math.PI * 2 + time * speed * 0.001`, radius `shortEdge * (0.008 + clusterSeed * 0.026)`, and vertical scale `0.58`. Draw hub particles first, then add two offset radial gradients: a `14 px` blue-white core at `(hub.x - 1, hub.y + 1)` and a `24 px` gold-blue haze at `(hub.x + 3, hub.y - 2)`.

Do not mutate the controller lifecycle. Keep `clearRect()` first, preserve `globalCompositeOperation = "lighter"` only inside `save()`/`restore()`, and reset alpha and composite mode after drawing.

- [ ] **Step 4: Run all nebula and fallback tests**

Run: `node --test tests/home-orrery-nebula.test.ts tests/home-orrery-streams-2d.test.ts tests/home-orrery-streams.test.ts`

Expected: all tests PASS, including controller destruction and runtime fallback state transfer.

- [ ] **Step 5: Commit the fallback**

```bash
git add src/lib/home-orrery-streams-2d.ts tests/home-orrery-streams-2d.test.ts
git commit -m "feat: match 2d fallback to nebula streams"
```

---

### Task 4: Contract, browser, and release-gate verification

**Files:**
- Modify: `tests/home-orrery.test.ts`
- Create: `docs/verification/2026-08-23-orrery-nebula-flow.md`

**Interfaces:**
- Consumes: the final Three.js and 2D implementations from Tasks 2 and 3.
- Produces: an automated source contract and a local visual verification record; no production deployment.

- [ ] **Step 1: Add the no-line production contract**

```ts
test("homepage nebula streams do not ship a continuous connection line", () => {
  const three = readExisting("src/lib/home-orrery-streams-three.ts");
  const fallback = readExisting("src/lib/home-orrery-streams-2d.ts");
  assert.doesNotMatch(three, /createRibbonGeometry|ribbonMaterial/);
  assert.doesNotMatch(fallback, /\.stroke\(\)|bezierCurveTo/);
  assert.match(three, /createOrreryNebulaParticles/);
  assert.match(fallback, /createOrreryNebulaParticles/);
});
```

- [ ] **Step 2: Run focused tests, then the full suite and build**

Run:

```bash
node --test tests/home-orrery-nebula.test.ts tests/home-orrery-streams-2d.test.ts tests/home-orrery-streams-three.test.ts tests/home-orrery-streams.test.ts tests/home-orrery.test.ts
npm run test:content
npm run build
git diff --check
```

Expected: every test passes; Astro reports 0 errors; the build completes; `git diff --check` emits no output.

- [ ] **Step 3: Inspect the four required browser viewports**

Start `npm run dev -- --host 127.0.0.1 --port 4322`. In the in-app browser, capture `360×800`, `393×852`, `430×932`, and `1440×900` after the Three renderer reports ready.

For each viewport record:

- renderer is `three`;
- `document.documentElement.scrollWidth === window.innerWidth`;
- no console errors or warnings;
- no visible continuous line spine;
- no sharp `Y` intersection, cross, or circular weld point;
- all three particle streams remain traceable to their bodies;
- the Moon, Earth, black hole, satellite, navigation, and desktop body positions are unchanged.

- [ ] **Step 4: Write the verification record**

Create `docs/verification/2026-08-23-orrery-nebula-flow.md` with the exact commit, test counts, build result, viewport metrics, screenshot paths, and a statement that Alibaba Cloud was not touched.

- [ ] **Step 5: Commit the contract and evidence**

```bash
git add tests/home-orrery.test.ts docs/verification/2026-08-23-orrery-nebula-flow.md
git commit -m "test: verify organic orrery nebula streams"
```

- [ ] **Step 6: Run the final clean-tree gate**

Run:

```bash
npm run test:content
npm run build
git diff --check
test -z "$(git status --porcelain)"
```

Expected: the full suite and build pass, no diff whitespace errors exist, and the feature worktree is clean.
