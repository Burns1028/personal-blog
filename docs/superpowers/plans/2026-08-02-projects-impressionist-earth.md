# Projects Impressionist Earth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Projects archive's photoreal satellite-map Earth with a painterly deep-blue Earth while preserving its 12-frame, 20-second rotation and every surrounding page element.

**Architecture:** Use the current equirectangular Earth map and approved Projects mockup as ImageGen references, generate three painterly surface candidates, and select the deep-blue oil-paint direction. Normalize that 2:1 surface, blend the horizontal seam, then reuse the existing CPU projection pipeline to produce versioned transparent WebP frames. Only the asset manifest changes at runtime; the Canvas animation component remains intact.

**Tech Stack:** Astro, TypeScript, Node.js, Sharp, Node test runner, built-in ImageGen, Canvas 2D.

## Global Constraints

- Preserve the existing 12-frame Canvas interpolation and 20-second rotation duration.
- Preserve the Projects layout, search, pagination, activity orbit, satellite, star field, navigation, and homepage Projects planet.
- Preserve static fallback behavior for widths at or below 620px, reduced-motion users, and save-data connections.
- Produce `public/assets/projects-earth-v3/earth-00.webp` through `earth-11.webp` and `public/assets/projects-earth-v3-mobile.webp`.
- Keep each desktop frame at 256×1152 with alpha and at most 140,000 bytes; keep the complete frame set at or below 1.6 MB.
- Do not modify Writing or Ideas visuals.

---

## File Structure

- Create `design-source/archive-v2/projects/earth-impressionist/prompts.md`: exact ImageGen prompts and source roles.
- Create `design-source/archive-v2/projects/earth-impressionist/candidate-{oil,atlas,pastel}.png`: retained candidate outputs.
- Create `design-source/archive-v2/projects/earth-impressionist/earth-oil-master.png`: normalized seamless production texture.
- Create `public/assets/projects-earth-v3/earth-00.webp` through `earth-11.webp`: desktop rotation frames.
- Create `public/assets/projects-earth-v3-mobile.webp`: constrained-device fallback.
- Modify `scripts/build-project-assets.mjs`: read the v3 master and emit versioned frames without changing legacy outputs.
- Modify `src/data/archive-assets.ts`: point the runtime manifest at v3.
- Modify `tests/archive-assets.test.ts`: enforce v3 paths, dimensions, transparency, byte budgets, and non-identical rotation frames.

### Task 1: Lock the v3 asset contract with a failing test

**Files:**
- Modify: `tests/archive-assets.test.ts`
- Test: `tests/archive-assets.test.ts`

**Interfaces:**
- Consumes: `archiveAssets.projects.earth` from `src/data/archive-assets.ts`.
- Produces: a contract requiring the v3 manifest and 12 valid transparent frames.

- [ ] **Step 1: Write the failing manifest and asset assertions**

Replace the v2 expectations with v3 and add a frame-content assertion:

```ts
assert.equal(
  archiveAssets.projects.earth.fallback,
  "/assets/projects-earth-v3/earth-00.webp",
);
assert.equal(
  archiveAssets.projects.earth.mobile,
  "/assets/projects-earth-v3-mobile.webp",
);

const frameDigests = new Set<string>();
for (let index = 0; index < archiveAssets.projects.earth.frameCount; index += 1) {
  const suffix = String(index).padStart(2, "0");
  const path = `public/assets/projects-earth-v3/earth-${suffix}.webp`;
  const absolute = resolve(root, path);
  const metadata = await sharp(absolute).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 1152);
  assert.equal(metadata.hasAlpha, true);
  const bytes = statSync(absolute).size;
  assert.ok(bytes <= 140_000, `${path} exceeds 140000`);
  frameDigests.add(
    await sharp(absolute).resize({ width: 16, height: 72 }).raw().toBuffer().then((data) => data.toString("base64")),
  );
  earthFrameBytes += bytes;
}
assert.ok(frameDigests.size >= 10, "Earth rotation frames are not visually distinct");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/archive-assets.test.ts`

Expected: FAIL because the manifest still names v2 and v3 assets do not exist.

- [ ] **Step 3: Commit the contract test**

```bash
git add tests/archive-assets.test.ts
git commit -m "test: require painterly project earth assets"
```

### Task 2: Generate and select the painterly surface

**Files:**
- Create: `design-source/archive-v2/projects/earth-impressionist/prompts.md`
- Create: `design-source/archive-v2/projects/earth-impressionist/candidate-oil.png`
- Create: `design-source/archive-v2/projects/earth-impressionist/candidate-atlas.png`
- Create: `design-source/archive-v2/projects/earth-impressionist/candidate-pastel.png`
- Create: `design-source/archive-v2/projects/earth-impressionist/earth-oil-master.png`

**Interfaces:**
- Consumes: `design-source/archive-v2/projects/earth-surface-master.png` as geographic reference and `docs/superpowers/specs/assets/projects-activity-search-pagination-approved.png` as mood reference.
- Produces: a 2048×1024 seamless RGB surface at `earth-oil-master.png`.

- [ ] **Step 1: Save the exact prompt set**

Create `prompts.md` with the shared constraints and three media variants:

```markdown
Shared constraints: Preserve the equirectangular world-map layout, recognizable continent placement, 2:1 coverage, and horizontal wrap. Output only the flat planetary surface. No sphere, space, stars, rim light, labels, borders, grid, text, watermark, or satellite-photo microdetail.

Oil: Translate the surface into restrained impressionist oil painting: cobalt, ultramarine and ink-blue oceans; muted ochre, grey-green and ivory land; visible dry-brush marks; loose white-grey cloud strokes; low microdetail; museum-quality matte pigment.

Atlas: Translate the same surface into a deep-blue celestial-atlas painting with ivory cloud bands and very subtle copperplate texture; restrained and non-photographic.

Pastel: Translate the same surface into luminous night pastel with soft blue-white bloom, granular pigment and softened coastlines; keep geography readable.
```

- [ ] **Step 2: Generate three built-in ImageGen style-transfer candidates**

Issue one built-in ImageGen call per variant using both local reference images. Save every result under the exact candidate filename above.

- [ ] **Step 3: Inspect all three candidates and select Oil**

Use image inspection to reject outputs with photographic texture, illegible continents, embedded globe shading, text, stars, or hard left/right edges. If Oil fails one of these criteria, regenerate Oil once with only the failed property tightened.

- [ ] **Step 4: Normalize and make the Oil texture horizontally seamless**

Add a Sharp helper inside `scripts/build-project-assets.mjs` that:

```js
async function prepareImpressionistEarthSurface(sourcePath) {
  const normalized = await sharp(sourcePath)
    .resize({ width: 2048, height: 1024, fit: "cover", position: "centre" })
    .removeAlpha()
    .modulate({ brightness: 0.86, saturation: 0.9 })
    .png()
    .toBuffer();

  const seamWidth = 128;
  const centreWidth = 2048 - seamWidth * 2;
  const centre = await sharp(normalized)
    .extract({ left: seamWidth, top: 0, width: centreWidth, height: 1024 })
    .toBuffer();
  const left = await sharp(normalized)
    .extract({ left: 0, top: 0, width: seamWidth, height: 1024 })
    .linear(0.5)
    .toBuffer();
  const right = await sharp(normalized)
    .extract({ left: 2048 - seamWidth, top: 0, width: seamWidth, height: 1024 })
    .linear(0.5)
    .toBuffer();

  return sharp({
    create: { width: 2048, height: 1024, channels: 3, background: "#07111f" },
  })
    .composite([
      { input: right, left: 0, top: 0, blend: "screen" },
      { input: centre, left: seamWidth, top: 0 },
      { input: left, left: 2048 - seamWidth, top: 0, blend: "screen" },
    ])
    .png()
    .toFile(resolve(earthImpressionistDirectory, "earth-oil-master.png"));
}
```

If the seam preview still shows a vertical line, replace the screen blend with a 128px alpha-gradient composite and rerun before proceeding.

- [ ] **Step 5: Inspect the normalized master**

Expected: 2048×1024, recognizable geography, painterly pigment, no globe shading, no visible vertical seam.

- [ ] **Step 6: Commit the retained design sources**

```bash
git add design-source/archive-v2/projects/earth-impressionist scripts/build-project-assets.mjs
git commit -m "art: generate impressionist earth surface"
```

### Task 3: Build v3 rotation frames and switch the manifest

**Files:**
- Modify: `scripts/build-project-assets.mjs`
- Modify: `src/data/archive-assets.ts`
- Create: `public/assets/projects-earth-v3/earth-00.webp` through `earth-11.webp`
- Create: `public/assets/projects-earth-v3-mobile.webp`
- Test: `tests/archive-assets.test.ts`

**Interfaces:**
- Consumes: `earth-oil-master.png` and existing `projectArchiveEarth(surface, rotation, dimensions)`.
- Produces: v3 desktop/mobile files and runtime paths.

- [ ] **Step 1: Parameterize the archive frame destination**

Use the existing `writeArchiveEarthFrame` output argument and pass v3 paths:

```js
const impressionistEarthSource = resolve(
  archiveSourceDirectory,
  "earth-impressionist/earth-oil-master.png",
);
const impressionistEarthSurface = await sharp(impressionistEarthSource)
  .resize({ width: 2048, height: 1024, fit: "fill" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let index = 0; index < archiveEarthFrameCount; index += 1) {
  await writeArchiveEarthFrame(
    impressionistEarthSurface,
    index,
    { width: 256, height: 1152, sphereDiameter: 1152 },
    `public/assets/projects-earth-v3/earth-${String(index).padStart(2, "0")}.webp`,
  );
}

await writeArchiveEarthFrame(
  impressionistEarthSurface,
  0,
  { width: 180, height: 760, sphereDiameter: 760 },
  "public/assets/projects-earth-v3-mobile.webp",
);
```

- [ ] **Step 2: Switch only the Earth manifest paths**

```ts
earth: {
  framePrefix: "/assets/projects-earth-v3/earth-",
  frameCount: 12,
  fallback: "/assets/projects-earth-v3/earth-00.webp",
  mobile: "/assets/projects-earth-v3-mobile.webp",
},
```

- [ ] **Step 3: Build the project assets**

Run: `npm run assets:projects`

Expected: the command logs that 12 archive rotation frames were built and all v3 files exist.

- [ ] **Step 4: Inspect frame 00, frame 06, and the mobile fallback**

Expected: all use the same painterly medium, frame 00 and frame 06 show different longitudes, transparent corners remain clean, and the crop matches the approved mockup.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/archive-assets.test.ts`

Expected: all archive asset tests pass.

- [ ] **Step 6: Commit the production asset switch**

```bash
git add public/assets/projects-earth-v3 public/assets/projects-earth-v3-mobile.webp src/data/archive-assets.ts scripts/build-project-assets.mjs tests/archive-assets.test.ts
git commit -m "feat: restore painterly rotating project earth"
```

### Task 4: Verify motion, scope, and production output

**Files:**
- Verify: `src/components/projects/RotatingEarth.astro`
- Verify: `src/pages/projects/index.astro`
- Verify: `src/pages/index.astro`

**Interfaces:**
- Consumes: the v3 manifest and frame set.
- Produces: evidence that no surrounding behavior regressed.

- [ ] **Step 1: Run all automated checks**

Run:

```bash
npm run test:content
npm run check
npm run build
git diff --check
```

Expected: 66 or more tests pass, Astro reports zero diagnostics, production build succeeds, and `git diff --check` prints nothing.

- [ ] **Step 2: Verify the Projects page in a desktop browser**

Open `http://localhost:4321/projects`, wait for `data-animated="true"` and `.is-motion-ready`, then capture the default viewport. Confirm the Earth is painterly, left-cropped, and the satellite/search/pagination/activity orbit are unchanged.

- [ ] **Step 3: Verify motion between two observations**

Observe the rendered Canvas at least one second apart and confirm the visible continent/cloud texture changes without a flash or seam.

- [ ] **Step 4: Verify the 390×844 mobile fallback**

Apply a 390×844 viewport, reload Projects, and confirm `.has-static-earth`, no horizontal overflow, and the painterly static Earth remains readable.

- [ ] **Step 5: Verify scope isolation**

Open `/`, `/writing`, and `/ideas`. Confirm the homepage three planets, Writing atlas/moon phases, and Ideas black hole are visually unchanged.

- [ ] **Step 6: Final status check**

Run: `git status --short`

Expected: only the known pre-existing workspace changes plus this plan's versioned Earth source/output changes remain.
