# Home Orrery Particle Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic ImageMagick-generated orange, pearl, blue, and transition particle textures that locally bridge the responsive Moon–Earth and black-hole–Earth light bands without changing the desktop celestial composition.

**Architecture:** A new offline generator creates small transparent WebP particle strips with ImageMagick. The existing Canvas renderer loads those assets once and places short, locally rotated stamps along the same live Bézier geometry already used by the vector strands and moving particles; the restored mother light band remains a low-level structural layer.

**Tech Stack:** Astro 7, TypeScript 6, Canvas 2D, Node.js 24, ImageMagick 7, Node test runner

## Global Constraints

- Keep the existing 881 × 732 mother-band coordinate system and all desktop celestial geometry unchanged.
- Generate every atlas asset deterministically from fixed seeds and explicit ImageMagick commands.
- Ship only transparent WebP particle strips; no planet pixels, black rectangles, or full-scene bitmap.
- Use the existing live anchor measurements and Bézier paths as the only runtime geometry source.
- Keep Canvas DPR capped at 2 and bound the number of texture stamps on mobile.
- Preserve a useful static connection in reduced-motion mode and degrade to the current vector currents if atlas decoding fails.
- Browser-verify 1440px desktop and 360px phone layouts before deployment.

---

### Task 1: Deterministic ImageMagick particle assets

**Files:**
- Create: `scripts/build-home-orrery-particle-atlas.mjs`
- Modify: `scripts/build-home-orrery-assets.mjs`
- Modify: `package.json`
- Modify: `src/data/home-orrery-assets.ts`
- Modify: `tests/home-orrery.test.ts`
- Create outputs: `public/assets/home-cosmic-system-v4/home-orrery-particles-{gold,pearl,transition,blue}-{256,512}.webp`

**Interfaces:**
- Produces: `homeOrreryAssets.connectionParticles.{gold,pearl,transition,blue}.{standard,retina}`.
- Consumes: local `magick` binary from ImageMagick 7; no runtime package dependency.

- [ ] **Step 1: Write failing asset and manifest contracts**

Add the eight expected files to the existing v4 asset budget test and assert each file has transparent alpha, exact `256 × 96` or `512 × 192` dimensions, and stays below 36 KB. Assert the manifest exposes all four roles and the main asset builder imports the dedicated atlas builder.

```ts
for (const role of ["gold", "pearl", "transition", "blue"] as const) {
  assert.match(assetManifest, new RegExp(`connectionParticles:[\\s\\S]*?${role}:`));
  expectedTransparentAssets.push([
    `home-orrery-particles-${role}-256.webp`, 256, 96, true,
  ]);
  expectedTransparentAssets.push([
    `home-orrery-particles-${role}-512.webp`, 512, 192, true,
  ]);
}
assert.match(assetBuilder, /build-home-orrery-particle-atlas\.mjs/);
```

- [ ] **Step 2: Run the focused contract and verify RED**

Run: `node --test --experimental-strip-types tests/home-orrery.test.ts`

Expected: FAIL because the particle atlas outputs and manifest entries do not exist.

- [ ] **Step 3: Install and verify the required local ImageMagick binary**

Run: `brew install imagemagick && magick -version`

Expected: ImageMagick 7 reports its version and WebP appears in the delegates list. This is an offline asset-build dependency only; the production server does not regenerate these files.

- [ ] **Step 4: Implement the ImageMagick generator**

Use a fixed-seed Node PRNG only to emit deterministic MVG drawing commands. Call `magick` through `execFile`; create a transparent `256 × 96` canvas, draw 46–62 soft circles with role-specific RGB colors and a tapered vertical spread, apply a restrained `0x0.7` blur, and encode WebP with alpha. Generate Retina files by replaying the same normalized drawing at 2× coordinates, not by enlarging the standard file.

```js
const roles = {
  gold: { seed: 1028, color: "rgb(230,160,58)", count: 62 },
  pearl: { seed: 2048, color: "rgb(236,226,202)", count: 46 },
  transition: { seed: 4096, color: "rgb(164,191,194)", count: 52 },
  blue: { seed: 8192, color: "rgb(88,181,239)", count: 58 },
};

await execFileAsync("magick", [
  "-size", `${width}x${height}`,
  "xc:none",
  "-draw", drawCommands,
  "-channel", "RGBA",
  "-blur", `0x${0.7 * scale}`,
  "-define", "webp:lossless=false",
  "-quality", "88",
  output,
]);
```

Fail with a direct installation message when `magick` is unavailable. Add `"assets:home:orrery:particles": "node scripts/build-home-orrery-particle-atlas.mjs"` to `package.json`, import this generator at the end of `build-home-orrery-assets.mjs`, and add all URLs to `home-orrery-assets.ts`.

- [ ] **Step 5: Generate assets and verify GREEN**

Run: `npm run assets:home:orrery:particles && node --test --experimental-strip-types tests/home-orrery.test.ts`

Expected: all homepage orrery asset contracts PASS and each new file meets its size, alpha, and byte budget.

- [ ] **Step 6: Commit the deterministic asset layer**

```bash
git add package.json scripts/build-home-orrery-particle-atlas.mjs scripts/build-home-orrery-assets.mjs src/data/home-orrery-assets.ts tests/home-orrery.test.ts public/assets/home-cosmic-system-v4/home-orrery-particles-*.webp
git commit -m "feat: generate orrery particle atlas"
```

### Task 2: Live-path particle texture stamping

**Files:**
- Modify: `src/components/HomeOrrery.astro`
- Modify: `src/lib/home-orrery-particles.ts`
- Modify: `tests/home-orrery-particles.test.ts`
- Modify: `tests/home-orrery.test.ts`

**Interfaces:**
- Consumes: `homeOrreryAssets.connectionParticles` and existing `OrreryPathGeometry`.
- Produces: `OrreryParticleAtlasSources`, `OrreryParticleStamp`, `createParticleStampLayout(geometry, viewport)` and an optional fourth argument on `createOrreryParticleController()`.

- [ ] **Step 1: Write failing placement and controller tests**

Test that mobile and desktop layouts use bounded counts, each stamp center is sampled from the live path, the blue stamps occupy the final convergence segment, and source URLs are passed from the Astro component.

```ts
const stamps = createParticleStampLayout(geometry, { width: 360, height: 800 });
assert.ok(stamps.length >= 8 && stamps.length <= 14);
assert.equal(stamps.filter((stamp) => stamp.role === "blue").length, 4);
for (const stamp of stamps) {
  assert.deepEqual(stamp.center, sampleOrreryPath(geometry, stamp.stream, stamp.progress));
  assert.ok(stamp.width >= 24 && stamp.width <= 82);
}
assert.match(component, /homeOrreryAssets\.connectionParticles/);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test --experimental-strip-types tests/home-orrery-particles.test.ts tests/home-orrery.test.ts`

Expected: FAIL because the atlas source and placement APIs do not exist.

- [ ] **Step 3: Implement deterministic stamp placement**

Create short placements at fixed progress values. Black-hole uses gold at `0.08` and `0.2`, transition at `0.38` and `0.58`, blue at `0.79`; Moon uses pearl at `0.1` and `0.28`, transition at `0.5`, blue at `0.8`. Add one shared blue convergence stamp at `0.93` for each stream. Derive center and tangent angle from `sampleOrreryPath()` at `progress ± 0.003`; clamp width against `Math.min(viewport.width, viewport.height)`.

```ts
export type OrreryParticleStamp = {
  stream: OrreryStream;
  role: "gold" | "pearl" | "transition" | "blue";
  progress: number;
  center: Point;
  angle: number;
  width: number;
  alpha: number;
};
```

- [ ] **Step 4: Load and draw the atlas without blocking the scene**

Load the standard/Retina choice once with `Image.decode()`. Before vector particles, draw each available strip with `translate(center)`, `rotate(angle)`, `drawImage(-width / 2, -height / 2, width, height)`, `globalCompositeOperation = "lighter"`, and role opacity. On load or decode failure, omit texture stamps and continue drawing the existing mother band and Canvas currents. Never measure DOM inside `draw()`.

Pass `homeOrreryAssets.connectionParticles` from `HomeOrrery.astro` into the controller. Keep the connection base below the Canvas and all celestial links above it.

- [ ] **Step 5: Run focused and responsive contracts**

Run: `node --test --experimental-strip-types tests/home-orrery-particles.test.ts tests/home-orrery.test.ts tests/mobile-responsive-contract.test.ts`

Expected: all focused tests PASS, with no increase in the mobile particle count or DPR cap.

- [ ] **Step 6: Commit the live-path compositor**

```bash
git add src/components/HomeOrrery.astro src/lib/home-orrery-particles.ts tests/home-orrery-particles.test.ts tests/home-orrery.test.ts
git commit -m "feat: bridge orrery paths with particle atlas"
```

### Task 3: Visual acceptance and production release

**Files:**
- Modify only the scoped atlas opacity, stamp width, or progress constants if visual acceptance exposes a concrete defect.

**Interfaces:**
- Consumes: the production build and browser-rendered homepage.
- Produces: one verified Alibaba Cloud release.

- [ ] **Step 1: Run the full fresh verification suite**

Run: `npm run test:content && npm run build && git diff --check`

Expected: all tests PASS, Astro reports zero errors/warnings/hints, and the production build exits 0.

- [ ] **Step 2: Browser-check desktop and phone**

Start the local app and inspect 1440 × 900 and 360 × 800. Confirm the orange and pearl starts, blue convergence, absence of horizontal overflow, no rectangular texture seams, no visible repeating strip rhythm, and unchanged desktop planet positions.

- [ ] **Step 3: Check reduced motion and failed-atlas fallback**

Verify reduced motion keeps static atlas stamps and mother-band structure. Temporarily block one atlas URL in the browser and confirm both links remain visible through the existing vector currents, with no runtime error.

- [ ] **Step 4: Review and commit any visual-only tuning**

Run: `git diff --check && git status --short`

Expected: only scoped orrery files are changed and there are no whitespace errors.

- [ ] **Step 5: Deploy and verify the exact commit**

Use `burns-deploy-blog`: preflight the current release, push or transfer the exact Git commit, deploy atomically, verify the release symlink, active service, `database: ok`, `media: ok`, empty recent error log, HTTPS 200, and the public homepage asset response.
