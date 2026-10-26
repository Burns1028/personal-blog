# Orrery Procedural Nebula Bands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cheap repeated particle arms with responsive procedural nebula bands whose shared hub is more central and whose Earth arm curves cleanly into the existing blue-white glint.

**Architecture:** Shared geometry keeps three cubic paths and moves only the hub formula. A new pure ribbon builder samples those paths into featherable meshes; Three.js renders them with a procedural noise shader, while Canvas 2D uses layered blurred strokes over the same paths. Existing lifecycle, responsive stage, celestial positions, and fallback facade remain intact.

**Tech Stack:** Astro, TypeScript, Three.js `BufferGeometry`/`ShaderMaterial`, Canvas 2D, Node test runner, in-app browser.

## Global Constraints

- Keep Moon, Earth, black-hole, satellite, navigation, and homepage text positions and sizes unchanged.
- Keep three independent paths with one exact shared hub; never serialize the bodies.
- Move the hub to the weighted body center: Moon `0.25`, Earth `0.5`, black hole `0.25`.
- Keep the Earth endpoint at the existing `17.36% / 39.58%` blue-white glint and enter it through a visible curve.
- Use warm gold, cool blue, and pale champagne for Moon, Earth, and black-hole sources; all end blue-white; no red/orange-red branch.
- Main arm mass must come from a procedural feathered field, not repeated atlas particles.
- Preserve current quality selection, live DPR, context-loss fallback, reduced-motion behavior, and local-only deployment state.

---

### Task 1: Lock the central hub and Earth turn with geometry tests

**Files:**
- Modify: `tests/home-orrery-geometry.test.ts`
- Modify: `src/lib/home-orrery-geometry.ts`

**Interfaces:**
- Consumes: `OrreryBodies`, stage dimensions, measured Earth glint.
- Produces: `createOrreryHubGeometry()` with the weighted hub and three cubic paths.

- [ ] Add failing tests requiring the exact weighted hub X coordinate, the unchanged explicit Earth glint endpoint, a down-left source tangent, and visible curve separation from the straight chord.
- [ ] Run `node --test tests/home-orrery-geometry.test.ts`; verify failure is caused by the old Earth-offset hub.
- [ ] Replace the old X offset with the weighted body center and reduce the Earth tangent handle to a restrained curve; make black-hole `controlB` approach the shared hub without the old downward offset.
- [ ] Re-run the geometry test and commit the independently green geometry change.

### Task 2: Build a deterministic ribbon model

**Files:**
- Create: `src/lib/home-orrery-nebula-ribbon.ts`
- Create: `tests/home-orrery-nebula-ribbon.test.ts`

**Interfaces:**
- Consumes: `CubicPath`, `OrreryStream`, stage short edge, segment count.
- Produces: `createNebulaRibbon(path, stream, shortEdge, segments)` returning typed positions, UVs, and indices.

- [ ] Write failing tests requiring two vertices per sample, exact endpoints, finite coordinates, a narrower hub profile, and balanced per-stream widths.
- [ ] Run `node --test tests/home-orrery-nebula-ribbon.test.ts`; verify module-not-found RED.
- [ ] Implement cubic sampling, tangent normals, endpoint taper, width profiles, and deterministic triangle indices.
- [ ] Re-run the ribbon model tests and commit.

### Task 3: Replace Three particle mass with procedural nebula meshes

**Files:**
- Modify: `src/lib/home-orrery-streams-three.ts`
- Modify: `tests/home-orrery-streams-three.test.ts`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: Task 2 ribbon arrays and existing render snapshot.
- Produces: three `BufferGeometry` meshes plus the existing hub mesh under the current controller API.

- [ ] Add failing source and behavior tests requiring three ribbon meshes, procedural `fbm`/noise feathering, pale-gold black-hole color, no instanced atlas-particle arm, and unchanged controller lifecycle.
- [ ] Run `node --test tests/home-orrery-streams-three.test.ts tests/home-orrery.test.ts`; verify expected RED.
- [ ] Build Three geometries from ribbon arrays and render broad haze, soft core, irregular noise edges, and sparse shader glints in one fragment shader. Animate only noise drift and breathing.
- [ ] Keep active-artifact emphasis, DPR/quality, context-loss, destroy, and late prepare behavior green.
- [ ] Re-run tests and commit.

### Task 4: Bring Canvas 2D fallback to the same geometry and palette

**Files:**
- Modify: `src/lib/home-orrery-streams-2d.ts`
- Modify: `tests/home-orrery-streams-2d.test.ts`

**Interfaces:**
- Consumes: unchanged `OrreryRenderSnapshot` and cubic paths.
- Produces: layered feathered Canvas paths under the unchanged fallback controller API.

- [ ] Add failing tests requiring layered Bézier strokes, no red palette literals, the exact shared geometry, clear-first behavior, and lifecycle preservation.
- [ ] Run `node --test tests/home-orrery-streams-2d.test.ts`; verify RED.
- [ ] Implement broad blurred haze, medium soft body, restrained core and sparse dust using the same three source palettes.
- [ ] Re-run tests and commit.

### Task 5: Full local visual gate

**Files:**
- Modify: `docs/verification/2026-08-23-orrery-nebula-flow.md`

- [ ] Run focused tests, `npm run test:content`, `npm run check`, `npm run build`, and `git diff --check`.
- [ ] At `http://127.0.0.1:4322/?verify=procedural-nebula`, capture `393×852` and `1440×900` screenshots from the real Three renderer.
- [ ] Reject the result unless the hub is central, the Earth band visibly curves into the blue glint, black-hole color is pale gold, no repeated fire-spark texture remains, celestial layout is unchanged, overflow is zero, and console errors are zero.
- [ ] Update the verification record, request an independent read-only review, fix any Important findings, and leave the accepted build available locally without deploying.
