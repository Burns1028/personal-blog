# Writing and Projects Archive Redesign Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not begin implementation until the user approves this plan.

**Goal:** Rebuild the approved Writing and Projects archive pages with production ImageGen assets, real search and pagination, publication-date lunar phases, a SQLite-backed aggregated activity orbit, and restrained accessible animation.

**Architecture:** Keep Astro server rendering and native cross-document View Transitions. Store pictorial masters under `design-source/archive-v2/`, derive responsive WebP files with Sharp, and keep controls, orbit geometry, masks, and typography code-native. Add small pure libraries for lunar phases and query pagination, plus an isolated SQLite activity store and protected manual API.

**Tech Stack:** Astro 7, TypeScript 6, Node 24 `node:sqlite`, Sharp 0.35, native HTML forms, SVG, CSS View Transitions, Node test runner.

## Global Constraints

- Scope is only `/writing` and `/projects`; Home remains frozen and Ideas remains on hold.
- The approved references are `docs/superpowers/specs/assets/writing-centered-search-pagination-approved.png` and `docs/superpowers/specs/assets/projects-activity-search-pagination-approved.png`.
- Every pictorial bitmap must originate from built-in ImageGen and be committed as a source master before Sharp derives production variants.
- Search boxes, pagination, text, GitHub Octocat, lunar masks, orbit curves, nodes, and signal waves remain code-native; never bake them into generated bitmaps.
- Writing stays centered. Search, moon strip, article list, and pagination share one center axis.
- Projects activity is source-agnostic and aggregated by day. Public output never exposes raw SHA, branch, HEAD, or every commit.
- Do not introduce a client router or animation dependency.
- The existing Projects Earth rotation is a locked design invariant and the only continuous Canvas animation in scope: 12 progressively decoded frames, a 20-second rotation, a 24fps paint cap, and the existing visibility, `Save-Data`, reduced-motion, mobile, and page-settled guards must remain.
- All motion other than the rotating Earth uses `transform`, `opacity`, and SVG `stroke-dashoffset`; no continuous particles or secondary runtime star field is allowed.
- `prefers-reduced-motion`, `Save-Data`, keyboard access, and page visibility pauses are mandatory.
- Do not stage, overwrite, or revert unrelated dirty-worktree changes.

---

### Task 1: Lock the asset contract and approved references

**Files:**
- Create: `src/data/archive-assets.ts`
- Create: `tests/archive-assets.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `archiveAssets` with exact source and public paths used by build scripts and Astro templates.
- Consumes: the two approved mockups already stored under `docs/superpowers/specs/assets/`.

- [ ] **Step 1: Write the failing asset-manifest test**

```ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { archiveAssets } from "../src/data/archive-assets.ts";

const root = resolve(import.meta.dirname, "..");

test("approved archive mockups remain in the repository", () => {
  assert.ok(existsSync(resolve(root, archiveAssets.references.writing)));
  assert.ok(existsSync(resolve(root, archiveAssets.references.projects)));
});

test("archive asset manifest names every production output", () => {
  assert.equal(archiveAssets.writing.phases.length, 8);
  assert.equal(archiveAssets.writing.atlas.desktop2x, "/assets/writing-atlas-v2-2560.webp");
  assert.equal(archiveAssets.projects.earth.frameCount, 12);
  assert.equal(archiveAssets.projects.earth.fallback, "/assets/projects-earth-v2/earth-00.webp");
  assert.equal(archiveAssets.projects.satellite, "/assets/projects-satellite-v2.webp");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/archive-assets.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/data/archive-assets.ts`.

- [ ] **Step 3: Create the typed asset manifest**

```ts
const phaseNames = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
] as const;

export const archiveAssets = {
  references: {
    writing:
      "docs/superpowers/specs/assets/writing-centered-search-pagination-approved.png",
    projects:
      "docs/superpowers/specs/assets/projects-activity-search-pagination-approved.png",
  },
  writing: {
    atlas: {
      desktop: "/assets/writing-atlas-v2-1600.webp",
      desktop2x: "/assets/writing-atlas-v2-2560.webp",
      mobile: "/assets/writing-atlas-v2-mobile-900.webp",
    },
    phases: phaseNames.map(
      (name, index) => `/assets/writing-phase-v2-${index}-${name}.webp`,
    ),
  },
  projects: {
    space: {
      desktop: "/assets/projects-space-v2-1600.webp",
      desktop2x: "/assets/projects-space-v2-2560.webp",
      mobile: "/assets/projects-space-v2-mobile-900.webp",
    },
    earth: {
      framePrefix: "/assets/projects-earth-v2/earth-",
      frameCount: 12,
      fallback: "/assets/projects-earth-v2/earth-00.webp",
      mobile: "/assets/projects-earth-v2-mobile.webp",
    },
    satellite: "/assets/projects-satellite-v2.webp",
  },
} as const;
```

- [ ] **Step 4: Add a dedicated asset verification script**

Add to `package.json`:

```json
"test:assets": "node --test tests/archive-assets.test.ts"
```

- [ ] **Step 5: Run the manifest test**

Run: `npm run test:assets`

Expected: PASS for the reference checks and manifest shape. Production file existence is added after generation in Tasks 2 and 6.

- [ ] **Step 6: Commit**

```bash
git add src/data/archive-assets.ts tests/archive-assets.test.ts package.json
git commit -m "test: define archive asset contract"
```

---

### Task 2: Generate and build the Writing pictorial assets

**Files:**
- Create: `design-source/archive-v2/writing/atlas-master.png`
- Create: `design-source/archive-v2/writing/moon-master-chroma.png`
- Create: `design-source/archive-v2/writing/moon-master.png`
- Modify: `scripts/build-writing-assets.mjs`
- Create: `public/assets/writing-atlas-v2-1600.webp`
- Create: `public/assets/writing-atlas-v2-2560.webp`
- Create: `public/assets/writing-atlas-v2-mobile-900.webp`
- Create: `public/assets/writing-phase-v2-0-new.webp` through `public/assets/writing-phase-v2-7-waning-crescent.webp`
- Modify: `tests/archive-assets.test.ts`

**Interfaces:**
- Consumes: approved Writing mockup as composition reference.
- Produces: a full-bleed responsive atlas and eight complete phase images referenced by `archiveAssets.writing`.

- [ ] **Step 1: Add failing metadata and byte-budget assertions**

Append to `tests/archive-assets.test.ts`:

```ts
import { statSync } from "node:fs";
import sharp from "sharp";

test("Writing production assets meet dimensions and byte budgets", async () => {
  const expected = [
    ["public/assets/writing-atlas-v2-1600.webp", 1600, 550_000],
    ["public/assets/writing-atlas-v2-2560.webp", 2560, 750_000],
    ["public/assets/writing-atlas-v2-mobile-900.webp", 900, 280_000],
  ] as const;

  for (const [path, width, budget] of expected) {
    const absolute = resolve(root, path);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, width);
    assert.ok(statSync(absolute).size <= budget, `${path} exceeds ${budget}`);
  }

  for (const phase of archiveAssets.writing.phases) {
    const absolute = resolve(root, `public${phase}`);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, 256);
    assert.equal(metadata.height, 256);
    assert.ok(metadata.hasAlpha, `${phase} must preserve transparency`);
    assert.ok(statSync(absolute).size <= 28_000, `${phase} exceeds 28KB`);
  }
});
```

- [ ] **Step 2: Run the test and confirm missing-asset failure**

Run: `npm run test:assets`

Expected: FAIL with `Input file is missing` for `writing-atlas-v2-1600.webp`.

- [ ] **Step 3: Generate the atlas master with built-in ImageGen**

Use case: `precise-object-edit` with the approved Writing mockup as the reference image. Generate a clean background-only master with this prompt:

```text
Asset type: full-bleed desktop website background master, 3840×2160.
Primary request: preserve the approved antique celestial atlas composition, radial star chart, constellation labels, warm ivory paper, engraved line quality, and calm negative space. Remove every interface element, logo, moon strip, article, date, search field, and pagination. The result is only a seamless background world.
Composition: the radial chart remains centered slightly right of the canvas so a centered 980px reading column can sit over a quieter feathered region without becoming left aligned.
Palette: warm ivory, smoke gray, faint umber; no blue, no gold glow.
Constraints: no text except faint historical constellation labels inherent to the atlas; no modern UI; no moon; no watermark; no hard rectangular reading panel.
```

Save the selected output as `design-source/archive-v2/writing/atlas-master.png` while preserving the original generated file.

- [ ] **Step 4: Generate the moon master with built-in ImageGen**

Use case: `background-extraction`. Generate on a perfectly flat `#00ff00` background:

```text
Asset type: canonical lunar texture master for an eight-phase UI system.
Primary request: one complete full moon, centered, perfectly circular, highly refined antique astronomical photogravure with realistic maria and crater detail, matching the warm smoke-gray ink of an old celestial atlas.
Composition: square canvas, moon occupies 72% of the width, generous uniform padding, no crop.
Constraints: one moon only; no shadow outside the disk; no halo; no stars; no labels; no watermark; do not use #00ff00 in the moon.
Background: perfectly flat #00ff00 with no texture, gradient, reflection, or shadow.
```

Save as `design-source/archive-v2/writing/moon-master-chroma.png`, then run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input design-source/archive-v2/writing/moon-master-chroma.png \
  --out design-source/archive-v2/writing/moon-master.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

If the edge contains a green fringe, repeat once with `--edge-contract 1`. Do not switch to the CLI transparency fallback without explicit user approval.

- [ ] **Step 5: Replace the Writing asset builder with deterministic variants**

Keep the existing section-ornament outputs, but add the following constants and phase builder to `scripts/build-writing-assets.mjs`:

```js
const atlasV2Source = resolve(
  projectRoot,
  "design-source/archive-v2/writing/atlas-master.png",
);
const moonV2Source = resolve(
  projectRoot,
  "design-source/archive-v2/writing/moon-master.png",
);
const phaseNames = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

function phaseVisibility(index, x, y, size) {
  const nx = (x + 0.5 - size / 2) / (size / 2);
  const ny = (y + 0.5 - size / 2) / (size / 2);
  const radiusSquared = nx * nx + ny * ny;
  if (radiusSquared > 1) return 0;

  const z = Math.sqrt(Math.max(0, 1 - radiusSquared));
  const angle = (index / 8) * Math.PI * 2;
  const light = nx * Math.sin(angle) - z * Math.cos(angle);
  return smoothstep((light + 0.035) / 0.07);
}

async function buildV2Phases() {
  const size = 512;
  const { data, info } = await sharp(moonV2Source)
    .resize(size, size, { fit: "contain" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let phase = 0; phase < 8; phase += 1) {
    const output = Buffer.from(data);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * info.channels;
        const visibility = phaseVisibility(phase, x, y, size);
        const shade = 0.12 + visibility * 0.88;
        output[offset] = Math.round(output[offset] * shade);
        output[offset + 1] = Math.round(output[offset + 1] * shade);
        output[offset + 2] = Math.round(output[offset + 2] * shade);
      }
    }

    await sharp(output, { raw: { width: size, height: size, channels: 4 } })
      .resize(256, 256)
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(
        outputPath(
          `public/assets/writing-phase-v2-${phase}-${phaseNames[phase]}.webp`,
        ),
      );
  }
}
```

Add these atlas builds before the existing ornament build:

```js
await writeWebp(atlasV2Source, "public/assets/writing-atlas-v2-1600.webp", 1600, 82);
await writeWebp(atlasV2Source, "public/assets/writing-atlas-v2-2560.webp", 2560, 84);

const mobileAtlas = await sharp(atlasV2Source)
  .resize({ width: 900, height: 1200, fit: "cover", position: "centre" })
  .toBuffer();
await writeWebp(mobileAtlas, "public/assets/writing-atlas-v2-mobile-900.webp", 900, 80);
await buildV2Phases();
```

- [ ] **Step 6: Build and visually inspect**

Run:

```bash
npm run assets:writing
npm run test:assets
```

Expected: all asset tests PASS. Inspect the three atlas variants and all eight phase images. Reject the batch if any moon is cropped, mixed with another moon, inconsistent in diameter, or less refined than the approved reference.

- [ ] **Step 7: Commit**

```bash
git add design-source/archive-v2/writing scripts/build-writing-assets.mjs public/assets/writing-atlas-v2-*.webp public/assets/writing-phase-v2-*.webp tests/archive-assets.test.ts
git commit -m "feat: build refined writing archive assets"
```

---

### Task 3: Add deterministic lunar-phase calculation

**Files:**
- Create: `src/lib/lunar-phase.ts`
- Create: `tests/lunar-phase.test.ts`

**Interfaces:**
- Produces: `getLunarPhase(date: Date): LunarPhase` and `getLunarPhaseAsset(index: LunarPhaseIndex): string`.
- Consumes: `archiveAssets.writing.phases` from Task 1.

- [ ] **Step 1: Write known-date and boundary tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getLunarPhase, getLunarPhaseAsset } from "../src/lib/lunar-phase.ts";

test("the reference new moon maps to phase zero", () => {
  assert.equal(getLunarPhase(new Date("2000-01-06T18:14:00Z")).index, 0);
});

test("a date half a synodic month later maps to full moon", () => {
  assert.equal(getLunarPhase(new Date("2000-01-21T12:36:00Z")).index, 4);
});

test("every phase resolves to one independent asset", () => {
  assert.equal(new Set(Array.from({ length: 8 }, (_, i) => getLunarPhaseAsset(i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7))).size, 8);
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test tests/lunar-phase.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the lunar library**

```ts
import { archiveAssets } from "../data/archive-assets";

export type LunarPhaseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LunarPhase {
  index: LunarPhaseIndex;
  name: string;
  ageDays: number;
  illumination: number;
}

const SYNODIC_MONTH = 29.530588853;
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const DAY = 86_400_000;
const names = [
  "新月",
  "娥眉月",
  "上弦月",
  "盈凸月",
  "满月",
  "亏凸月",
  "下弦月",
  "残月",
] as const;

export function getLunarPhase(date: Date): LunarPhase {
  const elapsedDays = (date.valueOf() - REFERENCE_NEW_MOON) / DAY;
  const ageDays = ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const fraction = ageDays / SYNODIC_MONTH;
  const index = (Math.round(fraction * 8) % 8) as LunarPhaseIndex;
  const illumination = Math.round(
    ((1 - Math.cos(fraction * Math.PI * 2)) / 2) * 100,
  );

  return { index, name: names[index], ageDays, illumination };
}

export function getLunarPhaseAsset(index: LunarPhaseIndex): string {
  return archiveAssets.writing.phases[index];
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/lunar-phase.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lunar-phase.ts tests/lunar-phase.test.ts
git commit -m "feat: calculate publication lunar phases"
```

---

### Task 4: Add shared archive search and truthful pagination

**Files:**
- Create: `src/lib/archive-query.ts`
- Create: `tests/archive-query.test.ts`

**Interfaces:**
- Produces: `normalizeSearch`, `matchesSearch`, `paginate`, and `pageHref` for both archive pages.
- Consumes: strings supplied by each page; no Astro dependency.

- [ ] **Step 1: Write search and pagination tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { matchesSearch, pageHref, paginate } from "../src/lib/archive-query.ts";

test("search ignores case and surrounding whitespace", () => {
  assert.equal(matchesSearch(["Astro", "智能体系统"], "  astro "), true);
});

test("pagination clamps invalid pages and never invents pages", () => {
  assert.deepEqual(paginate([1, 2, 3], 99, 2), {
    items: [3],
    page: 2,
    pageCount: 2,
    total: 3,
  });
});

test("page links retain the search query", () => {
  assert.equal(pageHref("/writing", 2, "AI 审美"), "/writing?q=AI+%E5%AE%A1%E7%BE%8E&page=2");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/archive-query.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the pure helpers**

```ts
export function normalizeSearch(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function matchesSearch(fields: Array<string | undefined>, raw: string): boolean {
  const query = normalizeSearch(raw).toLocaleLowerCase("zh-CN");
  if (!query) return true;
  return fields
    .filter((field): field is string => Boolean(field))
    .join("\n")
    .toLocaleLowerCase("zh-CN")
    .includes(query);
}

export function paginate<T>(items: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageCount, total: items.length };
}

export function pageHref(pathname: string, page: number, query: string): string {
  const params = new URLSearchParams();
  if (normalizeSearch(query)) params.set("q", normalizeSearch(query));
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/archive-query.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/archive-query.ts tests/archive-query.test.ts
git commit -m "feat: add archive search and pagination helpers"
```

---

### Task 5: Build the centered Writing archive

**Files:**
- Create: `src/components/writing/LunarPhase.astro`
- Create: `src/components/archive/ArchivePagination.astro`
- Create: `src/styles/writing-archive-v2.css`
- Modify: `src/pages/writing/index.astro`
- Modify: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: `getWritingCatalog`, `getLunarPhase`, `getLunarPhaseAsset`, `matchesSearch`, `paginate`, and `pageHref`.
- Produces: server-rendered `/writing?q=&page=` with a centered 4-row desktop archive and complete per-entry lunar phases.

- [ ] **Step 1: Write presentation contract tests**

Append to `tests/presentation-contract.test.ts`:

```ts
test("Writing archive keeps search, pagination, and lunar phases on one centered axis", () => {
  const page = readFileSync(resolve(projectRoot, "src/pages/writing/index.astro"), "utf8");
  const css = readFileSync(resolve(projectRoot, "src/styles/writing-archive-v2.css"), "utf8");
  assert.match(page, /name="q"/);
  assert.match(page, /ArchivePagination/);
  assert.match(page, /<LunarPhase/);
  assert.match(css, /--writing-column:\s*min\(980px/);
  assert.match(css, /margin-inline:\s*auto/);
  assert.doesNotMatch(css, /grid-template-columns:\s*minmax\(0,\s*62%\)/);
});
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test tests/presentation-contract.test.ts`

Expected: FAIL because `writing-archive-v2.css` does not exist.

- [ ] **Step 3: Create the lunar component**

```astro
---
import type { LunarPhase } from "../../lib/lunar-phase";
import { getLunarPhaseAsset } from "../../lib/lunar-phase";

interface Props {
  phase: LunarPhase;
  size?: number;
}

const { phase, size = 56 } = Astro.props;
---

<img
  class="lunar-phase"
  src={getLunarPhaseAsset(phase.index)}
  width={size}
  height={size}
  alt={`${phase.name}，照明度约 ${phase.illumination}%`}
  loading="lazy"
  decoding="async"
/>
```

- [ ] **Step 4: Create truthful pagination markup**

```astro
---
interface Props {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  label: string;
}
const { page, pageCount, hrefFor, label } = Astro.props;
const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
---

<nav class="archive-pagination" aria-label={label}>
  {page > 1 ? <a href={hrefFor(page - 1)}>← <span>上一页</span></a> : <span aria-disabled="true">← <span>上一页</span></span>}
  <ol>
    {pages.map((number) => (
      <li>
        {number === page ? (
          <span aria-current="page">{String(number).padStart(2, "0")}</span>
        ) : (
          <a href={hrefFor(number)}>{String(number).padStart(2, "0")}</a>
        )}
      </li>
    ))}
  </ol>
  {page < pageCount ? <a href={hrefFor(page + 1)}><span>下一页</span> →</a> : <span aria-disabled="true"><span>下一页</span> →</span>}
</nav>
```

- [ ] **Step 5: Rebuild the Writing route around one centered column**

In the frontmatter of `src/pages/writing/index.astro`, calculate query state:

```ts
import ArchivePagination from "../../components/archive/ArchivePagination.astro";
import LunarPhase from "../../components/writing/LunarPhase.astro";
import { matchesSearch, pageHref, paginate } from "../../lib/archive-query";
import { getLunarPhase } from "../../lib/lunar-phase";
import { archiveAssets } from "../../data/archive-assets";
import "../../styles/writing-archive-v2.css";

const query = Astro.url.searchParams.get("q")?.trim() ?? "";
const requestedPage = Number(Astro.url.searchParams.get("page") ?? 1);
const entries = (await getWritingCatalog()).filter((entry) =>
  matchesSearch(
    [entry.data.title, entry.data.summary, entry.data.deck, ...entry.data.tags],
    query,
  ),
);
const result = paginate(entries, requestedPage, 4);
const hrefFor = (page: number) => pageHref("/writing", page, query);
const currentPhase = getLunarPhase(new Date());
```

Replace the existing split lead/history layout with this structure:

```astro
<section class="writing-v2" data-writing-archive>
  <picture class="writing-v2__atlas" aria-hidden="true">
    <source media="(max-width: 767px)" srcset={archiveAssets.writing.atlas.mobile} />
    <source srcset={`${archiveAssets.writing.atlas.desktop} 1x, ${archiveAssets.writing.atlas.desktop2x} 2x`} />
    <img src={archiveAssets.writing.atlas.desktop} alt="" width="1600" height="900" fetchpriority="high" decoding="async" />
  </picture>

  <div class="writing-v2__column">
    <h1 class="sr-only">Writing</h1>
    <div class="writing-v2__phase-strip" aria-label="月相序列">
      {archiveAssets.writing.phases.map((src, index) => (
        <img
          class:list={{ "is-current": index === currentPhase.index }}
          src={src}
          alt=""
          width="58"
          height="58"
          decoding="async"
          title={index === currentPhase.index ? `当前月相：${currentPhase.name}` : undefined}
        />
      ))}
    </div>

    <form class="archive-search archive-search--writing" method="get" action="/writing" role="search">
      <span aria-hidden="true">⌕</span>
      <input id="writing-search" type="search" name="q" value={query} placeholder="搜索文章、主题或关键词" autocomplete="off" />
      <kbd>⌘ K</kbd>
    </form>

    {result.items.length > 0 ? (
      <ol class="writing-v2__list" data-archive-results>
        {result.items.map((entry, index) => {
          const phase = getLunarPhase(entry.data.publishedAt);
          return (
            <li style={`--entry-index:${index}`}>
              <a href={`/writing/${entry.id}`}>
                <div><h2>{entry.data.title}</h2><p>{entry.data.deck ?? entry.data.summary}</p></div>
                <div class="writing-v2__meta">
                  <span><time datetime={entry.data.publishedAt.toISOString()}>{formatDate(entry.data.publishedAt)}</time><small>{entry.data.readingTime}阅读</small></span>
                  <LunarPhase phase={phase} />
                </div>
              </a>
            </li>
          );
        })}
      </ol>
    ) : (
      <div class="archive-empty"><p>这一片星图里暂时没有对应的记录。</p><a href="/writing">清空搜索</a></div>
    )}

    <ArchivePagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} label="文章分页" />
  </div>
</section>
```

- [ ] **Step 6: Implement the centered visual system and interactions**

Create `src/styles/writing-archive-v2.css` with the exact layout foundation below. Use `#2a241b` for titles, `#6d665b` for summaries, `rgba(79, 67, 50, .16)` for rules, `16px/1.7` summary typography, and `24–28px/1.25` titles. At `max-width: 767px`, set `--writing-column: calc(100vw - 32px)`, reduce the phase images to `42px`, stack metadata below the title, and keep the pagination on one horizontally scrollable line:

```css
.writing-v2 {
  --writing-column: min(980px, calc(100vw - 64px));
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  background: #f1eadf;
  isolation: isolate;
}

.writing-v2__atlas {
  position: absolute;
  z-index: -2;
  inset: 0;
}

.writing-v2__atlas img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.74;
}

.writing-v2::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  content: "";
  background: radial-gradient(ellipse 42% 94% at 50% 54%, rgba(248, 243, 234, 0.9) 0 54%, rgba(248, 243, 234, 0.45) 72%, transparent 100%);
  pointer-events: none;
}

.writing-v2__column {
  width: var(--writing-column);
  margin-inline: auto;
  padding: clamp(126px, 15vh, 162px) 0 54px;
}

.writing-v2__phase-strip,
.archive-search--writing,
.writing-v2__list,
.writing-v2 .archive-pagination {
  width: 100%;
  margin-inline: auto;
}

.writing-v2__list { view-transition-name: writing-results; }

@media (prefers-reduced-motion: no-preference) {
  html[data-page-settled="true"] .writing-v2__phase-strip { animation: writing-arrive 360ms ease-out both; }
  html[data-page-settled="true"] .archive-search--writing { animation: writing-arrive 220ms 80ms ease-out both; }
  html[data-page-settled="true"] .writing-v2__list > li { animation: writing-arrive 260ms calc(130ms + var(--entry-index) * 45ms) ease-out both; }
}

@keyframes writing-arrive {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Add an inline script to focus the search field without hijacking browser shortcuts:

```js
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    const input = document.querySelector("#writing-search");
    if (input instanceof HTMLInputElement) {
      event.preventDefault();
      input.focus();
    }
  }
});
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm run test:content
npm run check
npm run build
```

Expected: all commands PASS. Verify `/writing`, `/writing?q=AI`, `/writing?page=99`, and an empty-result query.

- [ ] **Step 8: Commit**

```bash
git add src/components/archive/ArchivePagination.astro src/components/writing/LunarPhase.astro src/pages/writing/index.astro src/styles/writing-archive-v2.css tests/presentation-contract.test.ts
git commit -m "feat: center the searchable writing archive"
```

---

### Task 6: Generate and build the Projects pictorial assets

**Files:**
- Create: `design-source/archive-v2/projects/space-master.png`
- Create: `design-source/archive-v2/projects/earth-surface-master.png`
- Create: `design-source/archive-v2/projects/satellite-master-chroma.png`
- Create: `design-source/archive-v2/projects/satellite-master.png`
- Modify: `scripts/build-project-assets.mjs`
- Create: `public/assets/projects-space-v2-1600.webp`
- Create: `public/assets/projects-space-v2-2560.webp`
- Create: `public/assets/projects-space-v2-mobile-900.webp`
- Create: `public/assets/projects-earth-v2/earth-00.webp` through `public/assets/projects-earth-v2/earth-11.webp`
- Create: `public/assets/projects-earth-v2-mobile.webp`
- Create: `public/assets/projects-satellite-v2.webp`
- Modify: `tests/archive-assets.test.ts`

**Interfaces:**
- Consumes: approved Projects mockup.
- Produces: a static deep-space background, one transparent satellite, and 12 coherent Earth rotation frames derived from a single ImageGen surface master.
- Preserves: the current 12-frame Canvas blend, 20-second rotation, 24fps paint cap, sequential decode, and every existing runtime pause/fallback guard.

- [ ] **Step 1: Add failing Projects asset assertions**

```ts
test("Projects production assets meet dimensions and byte budgets", async () => {
  const expected = [
    ["public/assets/projects-space-v2-1600.webp", 1600, 450_000, false],
    ["public/assets/projects-space-v2-2560.webp", 2560, 650_000, false],
    ["public/assets/projects-space-v2-mobile-900.webp", 900, 260_000, false],
    ["public/assets/projects-earth-v2-mobile.webp", 180, 110_000, true],
    ["public/assets/projects-satellite-v2.webp", 640, 120_000, true],
  ] as const;
  for (const [path, width, budget, alpha] of expected) {
    const absolute = resolve(root, path);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, width);
    assert.equal(Boolean(metadata.hasAlpha), alpha);
    assert.ok(statSync(absolute).size <= budget, `${path} exceeds ${budget}`);
  }

  let earthFrameBytes = 0;
  for (let index = 0; index < archiveAssets.projects.earth.frameCount; index += 1) {
    const suffix = String(index).padStart(2, "0");
    const path = `public/assets/projects-earth-v2/earth-${suffix}.webp`;
    const absolute = resolve(root, path);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, 256);
    assert.equal(metadata.height, 1152);
    assert.equal(metadata.hasAlpha, true);
    const bytes = statSync(absolute).size;
    assert.ok(bytes <= 140_000, `${path} exceeds 140000`);
    earthFrameBytes += bytes;
  }
  assert.ok(earthFrameBytes <= 1_600_000, "Earth frame set exceeds 1.6 MB");
});
```

- [ ] **Step 2: Generate the deep-space master**

Use built-in ImageGen with the approved Projects mockup as reference:

```text
Asset type: full-bleed desktop website background master, 3840×2160.
Primary request: preserve the approved nearly black deep-space mood, very sparse small stars, subtle cold blue-gray haze, and vast negative space. Remove Earth, satellite, orbit, nodes, cards, navigation, text, and every UI element.
Composition: slightly more star density at the outer edges; the central 60% remains calm enough for project cards.
Constraints: no nebula spectacle, no Milky Way band, no planets, no lens flare, no text, no watermark, no bright star behind the card region.
```

Save as `design-source/archive-v2/projects/space-master.png`.

- [ ] **Step 3: Generate one canonical Earth surface master**

Use built-in ImageGen to create a seamless equirectangular source texture rather than 12 independently generated globes:

```text
Asset type: seamless 2:1 equirectangular Earth surface texture, 2048×1024.
Primary request: a refined realistic blue Earth surface matching the approved Projects mockup: deep cobalt oceans, restrained cloud systems, recognizable but not map-labeled land masses, premium orbital-photography detail.
Projection: exact full-planet equirectangular map; left and right edges must join seamlessly; poles must remain continuous.
Lighting: neutral albedo texture only, evenly lit from the camera; no day/night terminator, no atmospheric rim, no cast shadow. Lighting and atmosphere will be applied deterministically during sphere projection.
Constraints: no outer-space background, no globe outline, no text, no borders, no labels, no satellite, no watermark.
```

Save as `design-source/archive-v2/projects/earth-surface-master.png`. Before accepting it, make a temporary left/right seam preview with Sharp; reject the generation if continents, clouds, or ocean color jump at the seam.

- [ ] **Step 4: Generate the satellite cutout**

Use built-in ImageGen on flat `#00ff00`:

```text
Asset type: transparent satellite illustration for the activity-orbit endpoint.
Primary request: one compact observational satellite, three-quarter view, refined cold-silver technical etching with thin line work, small dish antenna, and restrained solar panels, matching the approved premium editorial astronomy style.
Composition: centered, facing toward the lower-left incoming orbit, generous padding, no crop.
Constraints: no signal waves, no stars, no labels, no glow, no watermark; do not use #00ff00 in the subject.
Background: perfectly flat #00ff00.
```

Save and remove chroma to `satellite-master.png`. Signal waves remain CSS/SVG, not part of the bitmap.

- [ ] **Step 5: Add deterministic Earth projection to the project asset builder**

Keep the existing legacy outputs untouched. Add a separate v2 build path to `scripts/build-project-assets.mjs` with these constants and sampling helper:

```js
const v2Space = resolve(projectRoot, "design-source/archive-v2/projects/space-master.png");
const v2EarthSurface = resolve(projectRoot, "design-source/archive-v2/projects/earth-surface-master.png");
const v2Satellite = resolve(projectRoot, "design-source/archive-v2/projects/satellite-master.png");
const v2EarthFrameCount = 12;
const v2EarthFrame = { width: 256, height: 1152, sphereDiameter: 1152 };

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function bilinearSample(data, width, height, channels, u, v, target, offset) {
  const wrappedU = ((u % 1) + 1) % 1;
  const clampedV = clamp01(v);
  const sourceX = wrappedU * (width - 1);
  const sourceY = clampedV * (height - 1);
  const x0 = Math.floor(sourceX);
  const y0 = Math.floor(sourceY);
  const x1 = (x0 + 1) % width;
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = sourceX - x0;
  const ty = sourceY - y0;
  for (let channel = 0; channel < 3; channel += 1) {
    const top = data[(y0 * width + x0) * channels + channel] * (1 - tx)
      + data[(y0 * width + x1) * channels + channel] * tx;
    const bottom = data[(y1 * width + x0) * channels + channel] * (1 - tx)
      + data[(y1 * width + x1) * channels + channel] * tx;
    target[offset + channel] = Math.round(top * (1 - ty) + bottom * ty);
  }
}
```

Implement `projectEarthFrame(surface, rotation, dimensions)` with inverse orthographic projection. For every output pixel recover its coordinate in the full sphere: `sphereX = x + sphereDiameter - width`, `nx = (sphereX - radius) / radius`, `ny = (y - radius) / radius`, and `z = sqrt(1 - nx² - ny²)`. Pixels outside the sphere stay transparent. Map visible pixels to `latitude = asin(-ny)` and `longitude = atan2(nx, z) + rotation`, then sample the master at `u = longitude / (2π) + 0.5`, `v = 0.5 - latitude / π` with `bilinearSample`.

Apply exactly the same lighting to every frame so only longitude changes: `light = 0.34 + 0.66 * clamp01(z * 0.78 + nx * 0.48 - ny * 0.08)`. Add a restrained blue atmospheric rim where `z < 0.18`, and feather alpha over the final `0.8%` of the limb. Add `writeRawWebp(rgba, width, height, path, quality)` using Sharp raw RGBA input with `alphaQuality: 100`, `effort: 6`, and `smartSubsample: true`.

Generate frames sequentially so build-time memory remains bounded:

```js
const surface = await sharp(v2EarthSurface)
  .resize({ width: 2048, height: 1024, fit: "fill" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let index = 0; index < v2EarthFrameCount; index += 1) {
  const rotation = (index / v2EarthFrameCount) * Math.PI * 2;
  const rgba = projectEarthFrame(surface, rotation, v2EarthFrame);
  await writeRawWebp(
    rgba,
    v2EarthFrame.width,
    v2EarthFrame.height,
    `public/assets/projects-earth-v2/earth-${String(index).padStart(2, "0")}.webp`,
    90,
  );
}

const mobileFrame = projectEarthFrame(surface, 0, {
  width: 180,
  height: 760,
  sphereDiameter: 760,
});
await writeRawWebp(mobileFrame, 180, 760, "public/assets/projects-earth-v2-mobile.webp", 88);
```

Build the backgrounds and satellite with the existing `writeWebp` helper. Update that helper to preserve alpha and accept an asset-specific quality defaulting to `86`:

```js
await writeWebp(v2Space, "public/assets/projects-space-v2-1600.webp", { width: 1600, withoutEnlargement: true });
await writeWebp(v2Space, "public/assets/projects-space-v2-2560.webp", { width: 2560, withoutEnlargement: true });
await writeWebp(
  await sharp(v2Space).resize({ width: 900, height: 1200, fit: "cover", position: "centre" }).toBuffer(),
  "public/assets/projects-space-v2-mobile-900.webp",
  { width: 900, withoutEnlargement: true },
);
await writeWebp(v2Satellite, "public/assets/projects-satellite-v2.webp", { width: 640, withoutEnlargement: true });
```

- [ ] **Step 6: Build, test, and inspect**

Run:

```bash
npm run assets:projects
npm run test:assets
```

Expected: PASS. Inspect the desktop and mobile composites against the approved reference. Reject if the satellite is generic, Earth contains a hard matte, or the center field is too noisy for cards. Also make a local contact sheet of all 12 Earth frames and reject the set if the limb, lighting, cloud scale, or globe position jumps; longitude must be the only changing property.

- [ ] **Step 7: Commit**

```bash
git add design-source/archive-v2/projects scripts/build-project-assets.mjs public/assets/projects-space-v2-*.webp public/assets/projects-earth-v2 public/assets/projects-earth-v2-mobile.webp public/assets/projects-satellite-v2.webp tests/archive-assets.test.ts
git commit -m "feat: build projects orbit assets"
```

---

### Task 7: Add the SQLite activity store and daily aggregation

**Files:**
- Create: `src/lib/server/activity-store.ts`
- Create: `tests/activity-store.test.ts`

**Interfaces:**
- Consumes: `DatabaseSync`, defaulting to `getArticleDatabase()` so activities share `BLOG_DB_PATH`.
- Produces: `upsertActivity(input, database?)`, `listActivityDays(limit, database?)`, and `ActivityDay`.

- [ ] **Step 1: Write aggregation, idempotency, and empty-state tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createArticleDatabase } from "../src/lib/server/content-store.ts";
import { listActivityDays, upsertActivity } from "../src/lib/server/activity-store.ts";

test("activities aggregate by local calendar day newest first", () => {
  const database = createArticleDatabase(":memory:");
  try {
    upsertActivity({ source: "manual", sourceKey: "a", occurredAt: "2026-08-02T09:00:00+08:00", projectSlug: "router-observatory", kind: "progress", title: "延迟回退", summary: "补齐降级路径", url: null }, database);
    upsertActivity({ source: "manual", sourceKey: "b", occurredAt: "2026-08-02T18:00:00+08:00", projectSlug: "eval-ledger", kind: "fix", title: "失败分类", summary: "归并错误类别", url: null }, database);
    const [day] = listActivityDays(6, database);
    assert.equal(day.date, "2026-08-02");
    assert.equal(day.count, 2);
    assert.equal(day.items.length, 2);
  } finally { database.close(); }
});

test("source and source key make manual updates idempotent", () => {
  const database = createArticleDatabase(":memory:");
  try {
    const base = { source: "manual" as const, sourceKey: "same", occurredAt: "2026-08-02T09:00:00+08:00", projectSlug: null, kind: "progress" as const, title: "第一版", summary: "摘要", url: null };
    upsertActivity(base, database);
    upsertActivity({ ...base, title: "修订版" }, database);
    assert.equal(listActivityDays(6, database)[0]?.items[0]?.title, "修订版");
  } finally { database.close(); }
});

test("an empty activity store returns an empty list", () => {
  const database = createArticleDatabase(":memory:");
  try { assert.deepEqual(listActivityDays(6, database), []); }
  finally { database.close(); }
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/activity-store.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement an isolated strict table and typed API**

```ts
import type { DatabaseSync } from "node:sqlite";
import { getArticleDatabase } from "./content-store";

export type ActivityKind = "progress" | "fix" | "release" | "research" | "maintenance";
export interface ActivityInput {
  source: "manual" | "github" | "writing";
  sourceKey: string;
  occurredAt: string;
  projectSlug: string | null;
  kind: ActivityKind;
  title: string;
  summary: string;
  url: string | null;
}
export interface StoredActivity extends ActivityInput { id: number; }
export interface ActivityDay { date: string; count: number; items: StoredActivity[]; }

function shanghaiDay(value: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

const activitySchema = `
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('manual','github','writing')),
    source_key TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    activity_day TEXT NOT NULL CHECK (activity_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    project_slug TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('progress','fix','release','research','maintenance')),
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 80),
    summary TEXT NOT NULL CHECK (length(trim(summary)) BETWEEN 1 AND 180),
    url TEXT,
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    UNIQUE(source, source_key)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS idx_activities_occurred ON activities(activity_day DESC, occurred_at DESC, id DESC);
`;

function ensureActivitySchema(database: DatabaseSync) { database.exec(activitySchema); }

export function upsertActivity(input: ActivityInput, database: DatabaseSync = getArticleDatabase()): StoredActivity {
  ensureActivitySchema(database);
  const now = new Date().toISOString();
  const activityDay = shanghaiDay(input.occurredAt);
  database.prepare(`
    INSERT INTO activities (source, source_key, occurred_at, activity_day, project_slug, kind, title, summary, url, created_at, modified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, source_key) DO UPDATE SET
      occurred_at = excluded.occurred_at,
      activity_day = excluded.activity_day,
      project_slug = excluded.project_slug,
      kind = excluded.kind,
      title = excluded.title,
      summary = excluded.summary,
      url = excluded.url,
      modified_at = excluded.modified_at
  `).run(input.source, input.sourceKey, input.occurredAt, activityDay, input.projectSlug, input.kind, input.title.trim(), input.summary.trim(), input.url, now, now);
  return database.prepare("SELECT id, source, source_key AS sourceKey, occurred_at AS occurredAt, project_slug AS projectSlug, kind, title, summary, url FROM activities WHERE source = ? AND source_key = ?").get(input.source, input.sourceKey) as unknown as StoredActivity;
}

export function listActivityDays(limit = 6, database: DatabaseSync = getArticleDatabase()): ActivityDay[] {
  ensureActivitySchema(database);
  const rows = database.prepare(`
    SELECT id, source, source_key AS sourceKey, occurred_at AS occurredAt, activity_day AS activityDay, project_slug AS projectSlug, kind, title, summary, url
    FROM activities ORDER BY activity_day DESC, occurred_at DESC, id DESC
  `).all() as unknown as Array<StoredActivity & { activityDay: string }>;
  const byDay = new Map<string, StoredActivity[]>();
  for (const row of rows) {
    const date = row.activityDay;
    const items = byDay.get(date) ?? [];
    items.push(row);
    byDay.set(date, items);
  }
  return [...byDay.entries()].slice(0, Math.max(0, limit)).map(([date, items]) => ({ date, count: items.length, items }));
}
```

- [ ] **Step 4: Run store tests**

Run: `node --test tests/activity-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/activity-store.ts tests/activity-store.test.ts
git commit -m "feat: store aggregated project activities"
```

---

### Task 8: Add the protected manual activity API

**Files:**
- Create: `src/lib/server/api-auth.ts`
- Create: `src/lib/server/activity-input.ts`
- Create: `src/pages/api/activities/index.ts`
- Create: `tests/activity-api.test.ts`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Produces: public `GET /api/activities?days=6` and token-protected `POST /api/activities`.
- Consumes: `ACTIVITY_WRITE_TOKEN` and Task 7 store functions.

- [ ] **Step 1: Write API authentication and validation tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { isBearerAuthorized } from "../src/lib/server/api-auth.ts";
import { parseActivityInput } from "../src/lib/server/activity-input.ts";

test("activity writes require an exact bearer token", () => {
  assert.equal(isBearerAuthorized(new Request("http://test", { headers: { authorization: "Bearer secret" } }), "secret"), true);
  assert.equal(isBearerAuthorized(new Request("http://test", { headers: { authorization: "Bearer wrong" } }), "secret"), false);
  assert.equal(isBearerAuthorized(new Request("http://test"), "secret"), false);
});

test("activity input rejects non-objects, oversized fields, and unsafe URLs", () => {
  assert.equal(parseActivityInput("not an object"), null);
  assert.equal(parseActivityInput({ source: "manual", sourceKey: "a", occurredAt: "2026-08-02", kind: "progress", title: "x".repeat(81), summary: "ok" }), null);
  assert.equal(parseActivityInput({ source: "manual", sourceKey: "a", occurredAt: "2026-08-02", kind: "progress", title: "ok", summary: "ok", url: "javascript:alert(1)" }), null);
});

test("activity input normalizes a valid manual event", () => {
  const parsed = parseActivityInput({ source: "manual", sourceKey: " event-1 ", occurredAt: "2026-08-02T18:00:00+08:00", projectSlug: " router-observatory ", kind: "progress", title: " 延迟回退 ", summary: " 补齐降级路径 ", url: "https://github.com/Burns1028" });
  assert.equal(parsed?.sourceKey, "event-1");
  assert.equal(parsed?.occurredAt, "2026-08-02T10:00:00.000Z");
  assert.equal(parsed?.title, "延迟回退");
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node --test tests/activity-api.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement constant-time bearer authorization and strict input parsing**

```ts
import { timingSafeEqual } from "node:crypto";

export function isBearerAuthorized(request: Request, expected: string): boolean {
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
```

Create `src/lib/server/activity-input.ts`:

```ts
import type { ActivityInput } from "./activity-store";

const sources = new Set<ActivityInput["source"]>(["manual", "github", "writing"]);
const kinds = new Set<ActivityInput["kind"]>(["progress", "fix", "release", "research", "maintenance"]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function parseActivityInput(value: unknown): ActivityInput | null {
  if (!isRecord(value)) return null;
  const source = text(value.source) as ActivityInput["source"];
  const sourceKey = text(value.sourceKey);
  const occurred = new Date(text(value.occurredAt));
  const projectSlug = text(value.projectSlug) || null;
  const kind = text(value.kind) as ActivityInput["kind"];
  const title = text(value.title);
  const summary = text(value.summary);
  const rawUrl = text(value.url);
  let url: string | null = null;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      url = parsed.toString();
    } catch { return null; }
  }
  if (!sources.has(source) || !kinds.has(kind) || !sourceKey || sourceKey.length > 120 || Number.isNaN(occurred.valueOf()) || projectSlug && projectSlug.length > 80 || title.length < 1 || title.length > 80 || summary.length < 1 || summary.length > 180) return null;
  return { source, sourceKey, occurredAt: occurred.toISOString(), projectSlug, kind, title, summary, url };
}
```

- [ ] **Step 4: Implement GET and POST**

```ts
import type { APIContext } from "astro";
import { listActivityDays, upsertActivity } from "../../../lib/server/activity-store";
import { parseActivityInput } from "../../../lib/server/activity-input";
import { isBearerAuthorized } from "../../../lib/server/api-auth";

export const prerender = false;

export function GET({ url }: APIContext): Response {
  const requested = Number(url.searchParams.get("days") ?? 6);
  const days = Math.min(12, Math.max(1, Number.isFinite(requested) ? Math.trunc(requested) : 6));
  return Response.json({ data: listActivityDays(days), meta: { days, storage: "sqlite" } }, { headers: { "Cache-Control": "private, no-cache" } });
}

export async function POST({ request }: APIContext): Promise<Response> {
  const token = process.env.ACTIVITY_WRITE_TOKEN;
  if (!token) return Response.json({ error: { code: "ACTIVITY_WRITE_DISABLED", message: "未配置活动写入令牌。" } }, { status: 503 });
  if (!isBearerAuthorized(request, token)) return Response.json({ error: { code: "ACTIVITY_UNAUTHORIZED", message: "无权写入活动。" } }, { status: 401 });

  const body = parseActivityInput(await request.json().catch(() => null));
  if (!body) {
    return Response.json({ error: { code: "ACTIVITY_INVALID", message: "活动字段不完整或格式错误。" } }, { status: 400 });
  }
  const stored = upsertActivity(body);
  return Response.json({ data: stored }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 5: Document the environment variable and manual call**

Append to `.env.example`:

```dotenv
# Required only for POST /api/activities.
ACTIVITY_WRITE_TOKEN=replace-with-a-long-random-token
```

Add this concrete example to `README.md`:

```bash
curl -X POST http://localhost:4321/api/activities \
  -H "Authorization: Bearer $ACTIVITY_WRITE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual","sourceKey":"2026-08-02-router-fallback","occurredAt":"2026-08-02T18:00:00+08:00","projectSlug":"router-observatory","kind":"progress","title":"延迟回退","summary":"补齐模型路由的降级路径","url":"https://github.com/Burns1028"}'
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --test tests/activity-api.test.ts tests/activity-store.test.ts
npm run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/api-auth.ts src/lib/server/activity-input.ts src/pages/api/activities/index.ts tests/activity-api.test.ts .env.example README.md
git commit -m "feat: add manual project activity API"
```

---

### Task 9: Build the project activity orbit and satellite interaction

**Files:**
- Create: `src/components/projects/ActivityOrbit.astro`
- Create: `src/components/projects/ProjectCard.astro`
- Create: `src/components/projects/RotatingEarth.astro`
- Create: `src/components/projects/SatelliteControl.astro`
- Create: `src/styles/projects-archive-v2.css`
- Modify: `src/pages/projects/index.astro`
- Modify: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: `ActivityDay[]`, ImageGen project assets, archive query helpers, and existing project content entries.
- Produces: searchable/paginated project cards plus an always-visible six-day orbit and accessible “latest activity” satellite control.

- [ ] **Step 1: Write Projects contract tests**

```ts
test("Projects renders search, truthful pagination, an activity orbit, and satellite control", () => {
  const page = readFileSync(resolve(projectRoot, "src/pages/projects/index.astro"), "utf8");
  const orbit = readFileSync(resolve(projectRoot, "src/components/projects/ActivityOrbit.astro"), "utf8");
  const earth = readFileSync(resolve(projectRoot, "src/components/projects/RotatingEarth.astro"), "utf8");
  assert.match(page, /name="q"/);
  assert.match(page, /ArchivePagination/);
  assert.match(page, /listActivityDays\(6\)/);
  assert.match(page, /<ActivityOrbit/);
  assert.match(page, /<RotatingEarth/);
  assert.match(orbit, /data-satellite-control/);
  assert.match(earth, /data-projects-earth-motion/);
  assert.match(earth, /rotationDuration = 20_000/);
  assert.match(earth, /paintInterval = 1000 \/ 24/);
  assert.match(earth, /burns:page-settled/);
  assert.doesNotMatch(earth, /Promise\.all/);
  assert.doesNotMatch(page, /<CosmicField/);
});
```

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test tests/presentation-contract.test.ts`

Expected: FAIL because `ActivityOrbit.astro` does not exist.

- [ ] **Step 3: Extract and preserve the rotating Earth**

Move the entire current `[data-projects-earth]` DOM block and its inline script from `src/pages/projects/index.astro` into `src/components/projects/RotatingEarth.astro`. Do not redesign the animation algorithm. The component frontmatter and DOM contract are:

```astro
---
import { archiveAssets } from "../../data/archive-assets";
const earth = archiveAssets.projects.earth;
---

<div
  class="projects-v2__earth projects-earth"
  aria-hidden="true"
  data-projects-earth
  data-earth-frame-count={earth.frameCount}
  data-earth-frame-prefix={earth.framePrefix}
>
  <canvas
    class="projects-earth__motion"
    width="256"
    height="1152"
    data-projects-earth-motion
  ></canvas>
  <picture>
    <source media="(max-width: 620px)" srcset={earth.mobile} />
    <img
      class="projects-earth__fallback"
      src={earth.fallback}
      alt=""
      width="256"
      height="1152"
      loading="eager"
      decoding="async"
      fetchpriority="high"
    />
  </picture>
</div>
```

Paste the current inline Earth script below that markup without changing its sequencing or timing. Preserve all of these exact behaviors in the extracted component:

```text
Reject duplicate initialization with data-animated.
Use the static fallback for reduced motion, Save-Data, and widths <= 620px.
Decode frames one at a time in a for loop after burns:page-settled; never Promise.all.
Use rotationDuration = 20_000 and paintInterval = 1000 / 24.
Crossfade current and next keyframes on the 256×1152 canvas.
Pause requestAnimationFrame when document.hidden or the Earth is outside IntersectionObserver.
Cancel on pagehide and render frame zero when reduced motion becomes active.
Fall back to the image by adding has-static-earth if decoding fails.
```

The only allowed script changes are the manifest-backed prefix/count, the component extraction, and cleanup of listeners when the page hides. This preserves the rotating Earth the user explicitly approved.

- [ ] **Step 4: Extract the complete GitHub project card**

Create `src/components/projects/ProjectCard.astro` so the route never contains an abbreviated card or a substitute icon:

```astro
---
import type { CollectionEntry } from "astro:content";
import { projectStatusLabels } from "../../data/labels";
interface Props { entry: CollectionEntry<"projects">; }
const { entry } = Astro.props;
---

<a
  class="project-card"
  href={entry.data.repo}
  target="_blank"
  rel="noreferrer"
  aria-label={`在 GitHub 打开 ${entry.data.title}`}
>
  <header class="project-card__title">
    <svg class="project-card__github-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
    <div><h2>{entry.data.title}</h2><span>/{entry.id}</span></div>
  </header>
  <p>{entry.data.summary}</p>
  <footer>
    <span>{entry.data.language}</span>
    <span>{projectStatusLabels[entry.data.status] ?? entry.data.status}</span>
    <i aria-hidden="true">↗</i>
  </footer>
</a>
```

- [ ] **Step 5: Create the satellite control**

```astro
---
import { archiveAssets } from "../../data/archive-assets";
---

<button class="projects-satellite" type="button" data-satellite-control aria-label="定位到最新活动">
  <img src={archiveAssets.projects.satellite} alt="" width="640" height="640" decoding="async" />
  <svg viewBox="0 0 120 70" aria-hidden="true">
    <path class="projects-satellite__signal projects-satellite__signal--one" d="M18 54 Q46 24 76 18" />
    <path class="projects-satellite__signal projects-satellite__signal--two" d="M8 66 Q46 14 94 8" />
  </svg>
</button>
```

- [ ] **Step 6: Create the responsive SVG orbit**

```astro
---
import type { ActivityDay } from "../../lib/server/activity-store";
import SatelliteControl from "./SatelliteControl.astro";
interface Props { days: ActivityDay[]; }
const { days } = Astro.props;
const positions = [
  [8, 30], [25, 60], [43, 72], [61, 65], [78, 48], [91, 24],
] as const;
const chronological = days.slice(0, 6).reverse();
const positionOffset = positions.length - chronological.length;
---

<section class="activity-orbit" aria-label="近期活动">
  <svg class="activity-orbit__line" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
    <path data-orbit-path d="M0 38 C180 240 520 260 1000 32" pathLength="1" />
  </svg>
  {days.length ? (
    <ol>
      {chronological.map((day, index) => {
        const [left, top] = positions[index + positionOffset];
        const featured = day.items[0];
        const isLatest = index === chronological.length - 1;
        return (
          <li class:list={{ "is-current": isLatest }} style={`--node-left:${left}%;--node-top:${top}%;--node-index:${index}`} tabindex={isLatest ? -1 : undefined} data-latest-activity={isLatest ? "true" : undefined}>
            <span class="activity-orbit__dot" aria-hidden="true"></span>
            <time datetime={day.date}>{day.date.slice(5).replace("-", ".")}</time>
            <strong>{day.count} 项活动</strong>
            <small>{featured?.projectSlug ? `${featured.projectSlug}：` : ""}{featured?.title}</small>
          </li>
        );
      })}
    </ol>
  ) : (
    <p class="activity-orbit__empty">等待下一次信号</p>
  )}
  <SatelliteControl />
</section>
```

- [ ] **Step 7: Rebuild the Projects route with real search, pagination, and activity data**

Add to the frontmatter:

```ts
import ActivityOrbit from "../../components/projects/ActivityOrbit.astro";
import ArchivePagination from "../../components/archive/ArchivePagination.astro";
import ProjectCard from "../../components/projects/ProjectCard.astro";
import RotatingEarth from "../../components/projects/RotatingEarth.astro";
import { archiveAssets } from "../../data/archive-assets";
import { matchesSearch, pageHref, paginate } from "../../lib/archive-query";
import { listActivityDays } from "../../lib/server/activity-store";
import "../../styles/projects-archive-v2.css";

const query = Astro.url.searchParams.get("q")?.trim() ?? "";
const requestedPage = Number(Astro.url.searchParams.get("page") ?? 1);
const filtered = entries.filter((entry) =>
  matchesSearch([entry.data.title, entry.id, entry.data.summary, entry.data.language, entry.data.status, ...entry.data.tags], query),
);
const result = paginate(filtered, requestedPage, 3);
const hrefFor = (page: number) => pageHref("/projects", page, query);
const activityDays = listActivityDays(6);
```

Remove only `CosmicField` and its runtime star field. Replace the route-local Earth markup/script with `<RotatingEarth />`; this is an extraction, not removal of the animation. Render this complete structure:

```astro
<section class="projects-v2" data-projects-archive>
  <picture class="projects-v2__space" aria-hidden="true">
    <source media="(max-width: 767px)" srcset={archiveAssets.projects.space.mobile} />
    <source srcset={`${archiveAssets.projects.space.desktop} 1x, ${archiveAssets.projects.space.desktop2x} 2x`} />
    <img src={archiveAssets.projects.space.desktop} alt="" width="1600" height="900" fetchpriority="high" decoding="async" />
  </picture>
  <RotatingEarth />

  <div class="projects-v2__workbench">
    <header><h1><span aria-hidden="true">&gt;</span> ls ./projects</h1><span>近期活动</span></header>
    <form class="archive-search archive-search--projects" method="get" action="/projects" role="search">
      <span aria-hidden="true">⌕</span><input id="projects-search" type="search" name="q" value={query} placeholder="搜索项目、技术或状态" autocomplete="off" /><kbd>⌘ K</kbd>
    </form>
    {result.items.length ? (
      <div class="project-card-grid" data-archive-results>
        {result.items.map((entry) => <ProjectCard entry={entry} />)}
      </div>
    ) : (
      <div class="archive-empty"><p>暂时没有匹配的探索项目。</p><a href="/projects">清空搜索</a></div>
    )}
    <ArchivePagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} label="项目分页" />
  </div>
  <ActivityOrbit days={activityDays} />
</section>
```

- [ ] **Step 8: Implement the satellite’s meaningful two-bob interaction**

Add an inline script to `src/pages/projects/index.astro`:

```js
const satellite = document.querySelector("[data-satellite-control]");
const latest = document.querySelector("[data-latest-activity='true']");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (satellite instanceof HTMLButtonElement) {
  satellite.addEventListener("click", () => {
    satellite.classList.remove("is-signaling");
    void satellite.offsetWidth;
    satellite.classList.add("is-signaling");
    latest?.classList.remove("is-located");
    void latest?.getBoundingClientRect();
    latest?.classList.add("is-located");
    if (latest instanceof HTMLElement) {
      latest.focus({ preventScroll: true });
      if (window.innerWidth < 768 && !reducedMotion.matches) {
        latest.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  });
  satellite.addEventListener("animationend", () => satellite.classList.remove("is-signaling"));
}
```

- [ ] **Step 9: Implement orbit drawing, two-bob keyframes, and reduced motion**

Create `src/styles/projects-archive-v2.css` with the approved layout, then include these exact motion contracts:

```css
.projects-v2 { position: relative; min-height: 100svh; overflow: hidden; isolation: isolate; background: #030404; }
.projects-v2__space { position: absolute; z-index: -3; inset: 0; }
.projects-v2__space img { width: 100%; height: 100%; object-fit: cover; }
.projects-v2__earth { position: absolute; z-index: -1; top: clamp(182px, 20svh, 258px); left: 0; width: auto; height: calc(100svh - clamp(182px, 20svh, 258px)); aspect-ratio: 256 / 1152; opacity: .9; filter: saturate(.92) brightness(.9); pointer-events: none; }
.projects-earth__fallback, .projects-earth__motion { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; transform: translateZ(0); }
.projects-earth__motion { z-index: 2; opacity: 0; will-change: opacity; }
.projects-earth__fallback { z-index: 1; opacity: 1; }
.projects-earth.is-motion-ready .projects-earth__motion { opacity: 1; }
.projects-earth.is-motion-ready .projects-earth__fallback { opacity: 0; }
.projects-v2__workbench { width: min(1120px, calc(100vw - 120px)); margin: 0 auto; padding: clamp(150px, 17vh, 184px) 0 330px; }
.projects-v2__workbench > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; color: #a8c4ce; }
.archive-search--projects { width: min(360px, 100%); margin: 0 0 22px auto; }
.project-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.project-card { min-height: 210px; border: 1px solid rgba(150, 172, 180, .17); background: rgba(4, 6, 7, .66); backdrop-filter: blur(8px); }
.projects-v2 .archive-pagination { width: max-content; max-width: 100%; margin: 28px auto 0; }
.activity-orbit { position: absolute; right: 0; bottom: 0; left: 0; height: 320px; }
.activity-orbit__line path { fill: none; stroke: rgba(173, 190, 196, .55); stroke-width: 1; stroke-dasharray: 1; stroke-dashoffset: 1; }

html[data-page-settled="true"] .activity-orbit__line path { animation: orbit-draw 760ms ease-out forwards; }
html[data-page-settled="true"] .activity-orbit li { animation: orbit-node-in 240ms calc(300ms + var(--node-index, 0) * 70ms) ease-out both; }

.projects-satellite.is-signaling img { animation: satellite-double-bob 720ms cubic-bezier(.22,.8,.28,1); }
.projects-satellite.is-signaling .projects-satellite__signal--one { animation: satellite-signal 420ms ease-out both; }
.projects-satellite.is-signaling .projects-satellite__signal--two { animation: satellite-signal 420ms 120ms ease-out both; }
.activity-orbit li.is-located .activity-orbit__dot { animation: latest-activity-pulse 620ms ease-out; }

@keyframes orbit-draw { to { stroke-dashoffset: 0; } }
@keyframes orbit-node-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes satellite-double-bob {
  0%, 100% { transform: translateY(0); }
  24% { transform: translateY(-8px); }
  48% { transform: translateY(0); }
  70% { transform: translateY(-4px); }
  88% { transform: translateY(0); }
}
@keyframes satellite-signal { from { opacity: .7; stroke-dashoffset: 1; } to { opacity: 0; stroke-dashoffset: 0; } }
@keyframes latest-activity-pulse { 0% { box-shadow: 0 0 0 0 rgba(185,133,49,.55); } 100% { box-shadow: 0 0 0 14px transparent; } }

@media (prefers-reduced-motion: reduce) {
  .activity-orbit__line path { stroke-dashoffset: 0; }
  .activity-orbit li, .projects-satellite img, .projects-satellite__signal, .activity-orbit__dot { animation: none !important; }
  .activity-orbit li.is-located .activity-orbit__dot { outline: 2px solid #b98531; outline-offset: 4px; }
}

@media (max-width: 1199px) {
  .projects-v2__workbench { width: min(760px, calc(100vw - 64px)); padding-bottom: 360px; }
  .project-card-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 767px) {
  .projects-v2 { overflow-x: clip; overflow-y: visible; }
  .projects-v2__workbench { width: calc(100vw - 32px); padding: 112px 0 48px; }
  .projects-v2__workbench > header { align-items: flex-start; gap: 12px; }
  .archive-search--projects { width: 100%; margin-inline: 0; }
  .project-card { min-height: 176px; }
  .projects-v2__earth { top: 104px; height: min(68svh, 760px); opacity: .38; }
  .activity-orbit { position: relative; height: auto; margin: 24px 16px 0 42px; padding: 12px 0 56px 28px; }
  .activity-orbit__line { display: none; }
  .activity-orbit ol { display: grid; gap: 28px; border-left: 1px solid rgba(173, 190, 196, .42); }
  .activity-orbit li { position: relative; inset: auto; padding-left: 22px; }
  .projects-satellite { position: relative; width: 132px; margin: 34px 0 0 auto; }
}
```

The mobile rules above are mandatory: the timeline is normal flow, the satellite follows the last node, and the static mobile Earth source is selected by `<picture>`. Confirm the page has no horizontal overflow at `390px`.

- [ ] **Step 10: Run tests and build**

Run:

```bash
npm run test:content
npm run check
npm run build
```

Expected: PASS. Verify `/projects`, `/projects?q=python`, `/projects?page=99`, and the no-activity database state.

- [ ] **Step 11: Commit**

```bash
git add src/components/projects src/pages/projects/index.astro src/styles/projects-archive-v2.css tests/presentation-contract.test.ts
git commit -m "feat: add the project activity orbit"
```

---

### Task 10: Complete performance, animation, and visual regression verification

**Files:**
- Modify: `tests/presentation-contract.test.ts`
- Modify: `tests/published-content.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: both completed pages and all production assets.
- Produces: a verified release candidate with documented maintenance commands.

- [ ] **Step 1: Add performance and motion regression contracts**

```ts
test("Writing does not introduce continuous canvas rendering", () => {
  const source = readFileSync(resolve(projectRoot, "src/pages/writing/index.astro"), "utf8");
  assert.doesNotMatch(source, /requestAnimationFrame/);
  assert.doesNotMatch(source, /<canvas/);
});

test("Projects retains one guarded rotating Earth and no secondary runtime star field", () => {
  const page = readFileSync(resolve(projectRoot, "src/pages/projects/index.astro"), "utf8");
  const earth = readFileSync(resolve(projectRoot, "src/components/projects/RotatingEarth.astro"), "utf8");
  assert.equal(earth.match(/<canvas/g)?.length, 1);
  assert.match(earth, /requestAnimationFrame/);
  assert.match(earth, /IntersectionObserver/);
  assert.match(earth, /visibilitychange/);
  assert.match(earth, /connection\?\.saveData/);
  assert.match(earth, /window\.innerWidth <= 620/);
  assert.match(earth, /burns:page-settled/);
  assert.match(earth, /rotationDuration = 20_000/);
  assert.match(earth, /paintInterval = 1000 \/ 24/);
  assert.doesNotMatch(earth, /Promise\.all/);
  assert.doesNotMatch(page, /<CosmicField/);
});

test("satellite motion is interaction-only and reduced-motion safe", () => {
  const css = readFileSync(resolve(projectRoot, "src/styles/projects-archive-v2.css"), "utf8");
  assert.match(css, /\.projects-satellite\.is-signaling/);
  assert.match(css, /@keyframes satellite-double-bob/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /animation:\s*satellite-double-bob[^;]*infinite/);
});
```

- [ ] **Step 2: Run every automated check**

Run:

```bash
npm run test:assets
npm run test:content
npm run check
npm run build
```

Expected: all PASS with no Astro diagnostics.

- [ ] **Step 3: Run HTTP smoke tests against the production server**

Run:

```bash
npm run start
curl -I http://localhost:4321/writing
curl -I 'http://localhost:4321/writing?q=AI&page=1'
curl -I http://localhost:4321/projects
curl -s http://localhost:4321/api/activities?days=6
```

Expected: page requests return `200`; activity API returns JSON with `data` and `meta.storage: "sqlite"`.

- [ ] **Step 4: Perform visual QA at the required viewports**

Capture and compare `/writing` and `/projects` at:

```text
1440×900
1024×768
390×844
```

Acceptance checklist:

```text
Writing column is centered at desktop widths.
Search, phase strip, list, and pagination share one center axis.
Every lunar phase is a single complete disk with no neighboring phase contamination.
Star-map contrast is quiet under text and visible in the margins.
Projects Earth, cards, orbit, and satellite match the approved spatial relationship.
On a capable desktop, the Earth completes a smooth 20-second rotation without limb or texture jumps.
Reduced-motion, Save-Data, <=620px, hidden-page, and offscreen states show or pause on a stable Earth frame.
Project pages show only real page numbers.
Orbit labels contain aggregated summaries and no SHA/HEAD/branch text.
Satellite click bobs twice, pulses two signal arcs, and focuses the latest node.
Reduced-motion produces no translation animation.
No horizontal scroll exists at 390px.
```

- [ ] **Step 5: Record source prompts and maintenance commands**

Add to `README.md`:

```markdown
### Archive v2 assets

- Approved visual references live in `docs/superpowers/specs/assets/`.
- ImageGen masters live in `design-source/archive-v2/`.
- Rebuild Writing assets with `npm run assets:writing`.
- Rebuild Projects assets with `npm run assets:projects`.
- Verify byte budgets and alpha with `npm run test:assets`.
- Do not regenerate UI text, search controls, pagination, orbit paths, nodes, or the GitHub mark as bitmap assets.
```

- [ ] **Step 6: Commit**

```bash
git add tests/presentation-contract.test.ts tests/published-content.test.ts README.md
git commit -m "test: verify archive redesign behavior"
```

---

## Execution order and checkpoints

1. Tasks 1–5 deliver a complete, independently testable Writing redesign.
2. Stop for a desktop/mobile visual checkpoint before starting Projects.
3. Tasks 6–9 deliver a complete, independently testable Projects redesign and manual activity interface.
4. Task 10 is the release gate. Do not deploy or restart production before every check passes.

## Explicitly deferred

- Ideas redesign and black-hole/card restructuring.
- Automatic GitHub ingestion, webhooks, contribution graphs, or raw commit timelines.
- Home visual changes.
- Star particles, satellite idle loops, or any additional continuous animation without semantic meaning. The approved rotating Earth is explicitly retained and is not deferred.
