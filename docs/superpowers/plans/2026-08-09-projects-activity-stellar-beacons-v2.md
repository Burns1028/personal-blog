# Projects Activity Stellar Beacons V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected lens-flare markers with two refined Image 2 stellar beacons and make every activity node mathematically coincide with the orbit curve.

**Architecture:** Move the cubic Bézier definition and point calculation into a pure TypeScript geometry module, then let `ActivityOrbit.astro` consume the same data for both the SVG path and node positions. Generate two matching transparent beacon assets and use them inside the existing decorative marker span without changing activity data or interaction JavaScript.

**Tech Stack:** TypeScript, Astro 7, CSS, Node.js test runner, Sharp, built-in Image 2, PNG chroma-key removal.

## Global Constraints

- Remove all references to `projects-activity-star-cyan.png` and `projects-activity-star-amber.png`.
- Final beacon assets are 256 × 256 px transparent PNG files named `projects-activity-beacon-cyan.png` and `projects-activity-beacon-amber.png`.
- Render ordinary beacons at 22 px and the latest beacon at 24 px inside the existing 28 × 28 px trigger.
- Use one cubic Bézier data source for both the SVG path and node coordinates; desktop center error must remain below 0.5 px.
- Preserve pointer, focus, touch, outside-click, `Escape`, satellite-location, mobile, and reduced-motion behavior.

---

### Task 1: Derive all node positions from the orbit curve

**Files:**
- Create: `src/lib/activity-orbit-geometry.ts`
- Create: `tests/activity-orbit-geometry.test.ts`
- Modify: `src/components/projects/ActivityOrbit.astro`

**Interfaces:**
- Produces: `activityOrbitPath: string` and `activityOrbitPointAtX(leftPercent: number): { left: number; top: number }`.
- Consumes: six existing horizontal percentages `[13, 25, 43, 61, 78, 91]`.

- [ ] **Step 1: Write the failing geometry tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  activityOrbitPath,
  activityOrbitPointAtX,
} from "../src/lib/activity-orbit-geometry.ts";

test("activity orbit exposes one canonical cubic path", () => {
  assert.equal(activityOrbitPath, "M0 44 C210 190 560 198 1000 38");
});

test("activity nodes are solved from the canonical cubic", () => {
  const expected = [
    [13, 42.481], [25, 54.636], [43, 59.868],
    [61, 54.043], [78, 40.81], [91, 26.462],
  ];
  for (const [left, top] of expected) {
    const point = activityOrbitPointAtX(left);
    assert.equal(point.left, left);
    assert.ok(Math.abs(point.top - top) < 0.001);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run `node --test tests/activity-orbit-geometry.test.ts`.

Expected: FAIL because the geometry module does not exist.

- [ ] **Step 3: Implement the canonical curve and solver**

```ts
export const activityOrbitCurve = {
  start: [0, 44],
  control1: [210, 190],
  control2: [560, 198],
  end: [1000, 38],
  width: 1000,
  height: 260,
} as const;

export const activityOrbitPath = `M${activityOrbitCurve.start.join(" ")} C${activityOrbitCurve.control1.join(" ")} ${activityOrbitCurve.control2.join(" ")} ${activityOrbitCurve.end.join(" ")}`;

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const inverse = 1 - t;
  return inverse ** 3 * a + 3 * inverse ** 2 * t * b + 3 * inverse * t ** 2 * c + t ** 3 * d;
};

export function activityOrbitPointAtX(left: number) {
  const targetX = (left / 100) * activityOrbitCurve.width;
  let lower = 0;
  let upper = 1;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const t = (lower + upper) / 2;
    const x = cubic(0, 210, 560, 1000, t);
    if (x < targetX) lower = t;
    else upper = t;
  }
  const t = (lower + upper) / 2;
  const y = cubic(44, 190, 198, 38, t);
  return { left, top: (y / activityOrbitCurve.height) * 100 };
}
```

- [ ] **Step 4: Make the component consume the geometry module**

Import the two exports, replace the six `[left, top]` pairs with six horizontal values mapped through `activityOrbitPointAtX`, and render `d={activityOrbitPath}`.

- [ ] **Step 5: Verify GREEN and commit**

Run `node --test tests/activity-orbit-geometry.test.ts` and the Projects presentation-contract tests. Expected: PASS.

Commit with `git commit -m "fix: align project activity with orbit"`.

### Task 2: Generate and validate the two V2 beacon assets

**Files:**
- Create: `public/assets/projects-activity-beacon-cyan.png`
- Create: `public/assets/projects-activity-beacon-amber.png`
- Delete: `public/assets/projects-activity-star-cyan.png`
- Delete: `public/assets/projects-activity-star-amber.png`
- Modify: `tests/presentation-contract.test.ts`

**Interfaces:**
- Produces: two matching 256 × 256 px RGBA PNG files.

- [ ] **Step 1: Update the asset contract and verify RED**

Change the expected asset paths from `star` to `beacon`, change width and height to `256`, and assert the rejected filenames do not exist. Run the targeted test and confirm it fails because the beacon files are absent.

- [ ] **Step 2: Generate the cool-cyan silver beacon with Image 2**

Use the approved A mockup as structural direction, the homepage screenshot as material direction, and the Projects screenshot as placement context. Generate exactly one centered miniature faceted diamond star core with short four-point glints, restrained outer sparkle, cool oxidized silver and smoky cyan glass, on a uniform `#00ff00` background. Explicitly forbid long lens flares, neon, rings, planets, text, emoji, and App-icon styling.

- [ ] **Step 3: Generate the warm-gold companion**

Use the cyan output as the edit target. Preserve geometry and change only the material palette to antique gold, warm ivory, and dark bronze.

- [ ] **Step 4: Remove chroma key and resize**

Run `remove_chroma_key.py` with border auto-key, soft matte, despill, and edge contraction if required. Resize each transparent result to 256 × 256 px and save at the final public paths.

- [ ] **Step 5: Inspect and verify GREEN**

Confirm transparent corners, no green fringe, matching silhouette, visible central facet, short glints, and distinct color temperatures. Run the targeted asset test. Expected: PASS.

- [ ] **Step 6: Commit**

Commit with `git commit -m "feat: add project activity beacons"`.

### Task 3: Integrate the beacons without restoring generic light effects

**Files:**
- Modify: `src/styles/projects-archive-v2.css`
- Modify: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: the two beacon URLs and existing `.activity-orbit__dot` markup.
- Produces: ordinary, latest, hover, focus, located, mobile, and reduced-motion states.

- [ ] **Step 1: Update the failing style contract**

Require `projects-activity-beacon-cyan.png`, `22px`, `projects-activity-beacon-amber.png`, and `24px`; reject `radial-gradient` within the marker rule and reject all `projects-activity-star-` references.

- [ ] **Step 2: Verify RED**

Run the targeted four-point marker test. Expected: FAIL because CSS still references the rejected star assets.

- [ ] **Step 3: Implement minimal CSS**

Use one contained background image per state, center 22 px and 24 px markers inside the trigger, apply at most `brightness(1.12)` and `scale(1.06)` on hover/focus/open, and keep a 28 px focus outline. Remove the added radial-gradient fallback and generic bloom.

- [ ] **Step 4: Update location and reduced-motion states**

Use one short brightness/drop-shadow pulse for satellite location. Under reduced motion, disable animation, transform, and transition while retaining a static brightness increase.

- [ ] **Step 5: Verify and commit**

Run targeted Projects tests, then `npm run test:content`. Expected: zero failures.

Commit with `git commit -m "feat: use stellar project activity beacons"`.

### Task 4: Verify the real page before publication

**Files:**
- Verify only.

- [ ] **Step 1: Build**

Run `npm run build`. Expected: 0 errors, 0 warnings, 0 hints.

- [ ] **Step 2: Render real layouts**

Use representative activity data and capture 1440 × 900, 2048 × 928, and 390 × 844 views.

- [ ] **Step 3: Measure geometry and interactions**

For every desktop node, compare its center with `SVGPathElement.getPointAtLength()` at the same x coordinate and require a maximum vertical difference below 0.5 px. Verify no horizontal overflow, hover/focus/touch detail behavior, `Escape`, satellite location, and reduced motion.

- [ ] **Step 4: Show the real-page preview to the user**

Do not push or deploy until the user approves this final visual result.
