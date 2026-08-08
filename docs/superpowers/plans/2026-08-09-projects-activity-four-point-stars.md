# Projects Activity Four-Point Stars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Projects activity orbit's CSS ring markers with generated four-point star assets while preserving the existing activity archive interactions.

**Architecture:** Generate two visually matched transparent PNG assets—cyan for ordinary activity and amber for the latest activity—then consume them as decorative CSS backgrounds inside the existing `.activity-orbit__dot` element. Keep the current Astro markup, trigger hit area, activity data, and event handling unchanged; verify assets structurally and enforce visual behavior through presentation-contract tests.

**Tech Stack:** ImageGen built-in tool, PNG alpha post-processing, Astro 7, CSS, Node.js test runner, Sharp metadata inspection.

## Global Constraints

- Use a bright core, short four-point rays, and a restrained circular glow; do not use a ring, orbit, text, planet, or emoji-like treatment.
- Save final assets as `public/assets/projects-activity-star-cyan.png` and `public/assets/projects-activity-star-amber.png`.
- Final PNG files must be square, 128 × 128 px, contain an alpha channel, and have transparent corners.
- Render ordinary markers at 18 px and the latest marker at 20 px inside the existing 28 × 28 px trigger.
- Preserve all pointer, focus, touch, outside-click, `Escape`, and satellite-location behavior.
- Do not move the orbit curve or activity node coordinates.
- Disable star scaling and pulse animation under `prefers-reduced-motion: reduce`.

---

### Task 1: Generate and validate the two transparent star assets

**Files:**
- Create: `public/assets/projects-activity-star-cyan.png`
- Create: `public/assets/projects-activity-star-amber.png`
- Modify: `tests/presentation-contract.test.ts`
- Reference: `docs/superpowers/specs/2026-08-09-projects-activity-four-point-stars-design.md`

**Interfaces:**
- Consumes: the approved visual constraints and the Projects screenshot as a style reference.
- Produces: two 128 × 128 px RGBA PNG files at the exact public asset paths used by Task 2.

- [ ] **Step 1: Write the failing asset contract test**

Add a Sharp import and this test to `tests/presentation-contract.test.ts`:

```ts
import sharp from "sharp";

test("Projects activity stars are transparent high-density generated assets", async () => {
  const assetPaths = [
    "public/assets/projects-activity-star-cyan.png",
    "public/assets/projects-activity-star-amber.png",
  ];

  for (const relativePath of assetPaths) {
    const assetPath = resolve(projectRoot, relativePath);
    assert.ok(existsSync(assetPath), `${relativePath} must exist`);
    const metadata = await sharp(assetPath).metadata();
    assert.equal(metadata.width, 128);
    assert.equal(metadata.height, 128);
    assert.equal(metadata.hasAlpha, true);
  }
});
```

- [ ] **Step 2: Run the target test and verify it fails**

Run:

```bash
node --test --test-name-pattern="Projects activity stars" tests/presentation-contract.test.ts
```

Expected: FAIL because `projects-activity-star-cyan.png` and `projects-activity-star-amber.png` do not exist.

- [ ] **Step 3: Generate the cyan source asset with ImageGen**

Use the existing Projects screenshot only as a style reference and submit this prompt through the built-in ImageGen tool:

```text
Use case: stylized-concept
Asset type: tiny activity marker for a premium deep-space personal website
Input image: Projects page screenshot, style reference only; do not edit or reproduce the page
Primary request: create one centered four-point stellar flare with a brilliant cool white core, slightly longer vertical rays, shorter horizontal rays, and a restrained pale cyan atmospheric glow
Style/medium: refined astrophotography-inspired UI asset, delicate optical diffraction, elegant and understated
Composition/framing: one isolated star centered in a square canvas, symmetric visual weight, generous padding, no cropping
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal
Constraints: background is one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; crisp separated edges; do not use #00ff00 in the subject; no cast shadow; no text; no watermark; no ring; no orbit; no planet; no background stars; no emoji or cartoon styling
```

Copy the generated source to `tmp/imagegen/projects-activity-star-cyan-source.png`.

- [ ] **Step 4: Generate the amber source asset with ImageGen**

Submit a separate built-in ImageGen call with the same composition, changing only the color direction:

```text
Use case: stylized-concept
Asset type: latest-activity marker for a premium deep-space personal website
Input image: Projects page screenshot, style reference only; do not edit or reproduce the page
Primary request: create one centered four-point stellar flare with a brilliant warm white core, slightly longer vertical rays, shorter horizontal rays, and a restrained amber-gold atmospheric glow
Style/medium: refined astrophotography-inspired UI asset, delicate optical diffraction, elegant and understated
Composition/framing: one isolated star centered in a square canvas, identical proportions to the cyan companion asset, generous padding, no cropping
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal
Constraints: background is one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation; crisp separated edges; do not use #00ff00 in the subject; no cast shadow; no text; no watermark; no ring; no orbit; no planet; no background stars; no emoji or cartoon styling
```

Copy the generated source to `tmp/imagegen/projects-activity-star-amber-source.png`.

- [ ] **Step 5: Remove chroma key and create the final 128 px assets**

Run the installed helper on each source, then resize the alpha outputs:

```bash
python "$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input tmp/imagegen/projects-activity-star-cyan-source.png \
  --out tmp/imagegen/projects-activity-star-cyan-alpha.png \
  --auto-key border --soft-matte --transparent-threshold 12 \
  --opaque-threshold 220 --despill

python "$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input tmp/imagegen/projects-activity-star-amber-source.png \
  --out tmp/imagegen/projects-activity-star-amber-alpha.png \
  --auto-key border --soft-matte --transparent-threshold 12 \
  --opaque-threshold 220 --despill

sips -z 128 128 tmp/imagegen/projects-activity-star-cyan-alpha.png \
  --out public/assets/projects-activity-star-cyan.png
sips -z 128 128 tmp/imagegen/projects-activity-star-amber-alpha.png \
  --out public/assets/projects-activity-star-amber.png
```

If an edge has a visible green fringe, rerun only that helper command with `--edge-contract 1` before resizing.

- [ ] **Step 6: Inspect the final assets and validate transparency**

Open both final PNG files at original detail and confirm: one centered star per file, no green fringe, no ring, matching proportions, transparent corners, cyan/amber color distinction, and visible rays when downscaled.

Run:

```bash
node --test --test-name-pattern="Projects activity stars" tests/presentation-contract.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the generated asset pair and contract**

```bash
git add tests/presentation-contract.test.ts \
  public/assets/projects-activity-star-cyan.png \
  public/assets/projects-activity-star-amber.png
git commit -m "feat: add project activity star assets"
```

### Task 2: Replace ring markers with the generated stars

**Files:**
- Modify: `src/styles/projects-archive-v2.css:447-482`
- Modify: `src/styles/projects-archive-v2.css:777-849`
- Modify: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: the two exact public asset URLs produced by Task 1 and the existing `.activity-orbit__dot` markup.
- Produces: ordinary, latest, interactive, located, and reduced-motion star states without changing any JavaScript interface.

- [ ] **Step 1: Write the failing presentation contract**

Add this test to `tests/presentation-contract.test.ts`:

```ts
test("Projects activity nodes use four-point stars without restoring ring markers", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/projects-archive-v2.css"),
    "utf8",
  );
  const dotRule = css.match(/\.activity-orbit__dot\s*\{[^}]*\}/)?.[0] ?? "";

  assert.match(dotRule, /projects-activity-star-cyan\.png/);
  assert.match(dotRule, /width:\s*18px/);
  assert.match(dotRule, /height:\s*18px/);
  assert.doesNotMatch(dotRule, /border:\s*2px solid/);
  assert.match(
    css,
    /\.activity-orbit__day\.is-current \.activity-orbit__dot\s*\{[^}]*projects-activity-star-amber\.png[^}]*width:\s*20px[^}]*height:\s*20px/,
  );
  assert.match(
    css,
    /\.activity-orbit__trigger:hover \.activity-orbit__dot[\s\S]*?transform:\s*scale\(1\.08\)/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.activity-orbit__dot\s*\{[^}]*transform:\s*none\s*!important/,
  );
});
```

- [ ] **Step 2: Run the target test and verify it fails**

Run:

```bash
node --test --test-name-pattern="four-point stars" tests/presentation-contract.test.ts
```

Expected: FAIL because `.activity-orbit__dot` still draws a bordered circle.

- [ ] **Step 3: Implement the ordinary and latest star states**

Replace the existing dot rules with centered background images and a CSS fallback core:

```css
.activity-orbit__dot {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 18px;
  height: 18px;
  background:
    url("/assets/projects-activity-star-cyan.png") center / contain no-repeat,
    radial-gradient(circle, #dff8ff 0 8%, rgba(100, 188, 218, 0.72) 9% 18%, transparent 40%);
  filter: brightness(0.92);
  transform-origin: center;
  transition: filter 160ms ease, transform 160ms ease;
}

.activity-orbit__day.is-current .activity-orbit__dot {
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  background:
    url("/assets/projects-activity-star-amber.png") center / contain no-repeat,
    radial-gradient(circle, #fff4d8 0 8%, rgba(215, 164, 74, 0.72) 9% 18%, transparent 40%);
}

.activity-orbit__trigger:hover .activity-orbit__dot,
.activity-orbit__trigger:focus-visible .activity-orbit__dot,
.activity-orbit__day[data-open="true"] .activity-orbit__dot {
  filter: brightness(1.14);
  transform: scale(1.08);
}

.activity-orbit__trigger:focus-visible {
  outline: 1px solid rgba(151, 208, 228, 0.9);
  outline-offset: 2px;
  border-radius: 50%;
}
```

Remove the old border, border-radius, dark fill, and ring box-shadow declarations.

- [ ] **Step 4: Move location pulse to an outer glow and honor reduced motion**

Keep the existing `latest-activity-pulse` name but animate `filter` and `transform` instead of a ring box-shadow:

```css
.activity-orbit__day.is-located .activity-orbit__dot {
  animation: latest-activity-pulse 620ms ease-out;
}

@keyframes latest-activity-pulse {
  0% {
    filter: brightness(1.5) drop-shadow(0 0 0 rgba(215, 164, 74, 0));
    transform: scale(1);
  }

  55% {
    filter: brightness(1.35) drop-shadow(0 0 8px rgba(215, 164, 74, 0.72));
    transform: scale(1.18);
  }

  100% {
    filter: brightness(0.92) drop-shadow(0 0 14px rgba(215, 164, 74, 0));
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-orbit__dot {
    animation: none !important;
    transform: none !important;
    transition: none;
  }

  .activity-orbit__day.is-located .activity-orbit__trigger {
    outline: 2px solid #b98531;
    outline-offset: 2px;
    border-radius: 50%;
  }
}
```

- [ ] **Step 5: Run target and full tests**

Run:

```bash
node --test --test-name-pattern="four-point stars|Projects activity" tests/presentation-contract.test.ts
npm run test:content
```

Expected: all selected tests pass, then the full content suite passes with zero failures.

- [ ] **Step 6: Commit the CSS integration**

```bash
git add src/styles/projects-archive-v2.css tests/presentation-contract.test.ts
git commit -m "feat: mark project activity with stars"
```

### Task 3: Verify the rendered result

**Files:**
- Verify: `public/assets/projects-activity-star-cyan.png`
- Verify: `public/assets/projects-activity-star-amber.png`
- Verify: `src/styles/projects-archive-v2.css`

**Interfaces:**
- Consumes: the production Astro page and generated star styles from Tasks 1–2.
- Produces: visual evidence that the new markers remain legible and interactive at required viewport sizes.

- [ ] **Step 1: Run type checking and the production build**

Run:

```bash
npm run build
```

Expected: Astro reports 0 errors, 0 warnings, and completes the server build.

- [ ] **Step 2: Start a production preview with representative activity data**

Run the built server with the existing test fixture database or a temporary copy that contains at least six activity days, then open `/projects`.

Expected: six star nodes appear along the unchanged continuous orbit.

- [ ] **Step 3: Verify desktop and mobile layouts**

Check 1440 × 900, 2048 × 928, and 390 × 844 viewports. Confirm both colors are visible, stars stay centered on their respective curve or vertical timeline, details remain readable, and `document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 4: Verify interactions and reduced motion**

Confirm hover opens the archive, keyboard focus exposes a visible 28 px focus target, `Escape` closes the archive and restores focus, touch/click toggles it, the satellite locates the latest amber star, and reduced-motion mode has no star scale or pulse animation.

- [ ] **Step 5: Review the working tree**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: only intentional changes are committed; the working tree is clean.
