# Ideas Scroll Journal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Ideas card grid with a searchable, date-filterable, dense scrolling journal whose visual timeline advances while the atlas and black hole remain fixed.

**Architecture:** Keep filtering server-rendered and URL-addressable through a small pure helper. Render the journal through the existing Astro Ideas route and a focused timeline component; draw the timeline from measured node positions in the browser so mixed-length ideas remain aligned. Put all new route-specific styling in a dedicated stylesheet loaded after the legacy global stylesheet.

**Tech Stack:** Astro 7, TypeScript 6, Node test runner, CSS, browser DOM APIs.

## Global Constraints

- Do not add dependencies.
- Do not paginate or truncate ideas.
- Preserve explicit SQLite line breaks.
- Keep the atlas and black hole fixed while the journal scrolls.
- Respect `prefers-reduced-motion`.
- Preserve query state in `GET /ideas?q=...&date=YYYY-MM-DD`.

---

### Task 1: Pure archive filtering

**Files:**
- Create: `src/lib/idea-archive.ts`
- Create: `tests/ideas-journal.test.ts`

**Interfaces:**
- Produces: `ideaDateKey(value: string): string`, `filterIdeas<T>(ideas: T[], query: string, date: string): T[]`, and `listIdeaDates<T>(ideas: T[]): string[]`.

- [ ] **Step 1: Write failing helper tests**

Test combined keyword/theme/date filtering, stable order, ISO calendar-date extraction, and unique descending date options.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/ideas-journal.test.ts`

Expected: FAIL because `src/lib/idea-archive.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

Use `normalizeSearch` and `matchesSearch` from `src/lib/archive-query.ts`; do not import the SQLite store.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node --test tests/ideas-journal.test.ts`

Expected: all helper tests pass.

### Task 2: Journal markup and fixed singularity

**Files:**
- Modify: `src/pages/ideas/index.astro`
- Modify: `src/components/IdeasSingularity.astro`
- Modify: `tests/ideas-journal.test.ts`

**Interfaces:**
- Consumes: filtering helpers from Task 1.
- Produces: `data-ideas-journal`, `data-ideas-timeline`, `data-idea-node`, `name="q"`, and `name="date"` DOM contracts.

- [ ] **Step 1: Add failing source-contract tests**

Assert URL-backed keyword/date controls, the absence of `signal-card-grid`, the continued `IdeasSingularity` asset, and the measured-node timeline hooks.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/ideas-journal.test.ts`

Expected: FAIL on the missing journal/search contracts.

- [ ] **Step 3: Replace the card grid with the journal**

Render the search form, filtered empty state, metadata/text rows, permalink IDs, track SVG, and scroll script. Simplify `IdeasSingularity.astro` to a decorative fixed-background element using the existing asset.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node --test tests/ideas-journal.test.ts`

Expected: all source-contract tests pass.

### Task 3: Pixel-matched route styling

**Files:**
- Create: `src/styles/ideas-journal.css`
- Modify: `src/pages/ideas/index.astro`
- Modify: `tests/ideas-journal.test.ts`

**Interfaces:**
- Consumes: markup contracts from Task 2.
- Produces: fixed background/header, sticky search, dense three-column rows, responsive layouts, and reduced-motion behavior.

- [ ] **Step 1: Add failing CSS contract tests**

Assert fixed backdrop, sticky search, `15–17px` text sizing, compact rows, mobile breakpoints, and reduced-motion rules.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/ideas-journal.test.ts`

Expected: FAIL because `src/styles/ideas-journal.css` does not exist.

- [ ] **Step 3: Implement route-specific CSS**

Match the approved screenshot at a `1675×938` viewport while keeping typography and gutters fluid. Override legacy Ideas body styles only within the new route stylesheet.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node --test tests/ideas-journal.test.ts`

Expected: all Ideas journal tests pass.

### Task 4: Full verification and visual correction

**Files:**
- Modify as required by observed visual differences: `src/pages/ideas/index.astro`, `src/components/IdeasSingularity.astro`, `src/styles/ideas-journal.css`

- [ ] **Step 1: Run automated verification**

Run: `npm run test:content && npm run check && npm run build`

Expected: exit code `0` for all commands.

- [ ] **Step 2: Start the production-like local page**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Astro reports a local URL.

- [ ] **Step 3: Compare the desktop page with the approved image**

At `1675×938`, verify search geometry, 7–9 visible rows, text scale, fixed black hole, and no horizontal overflow. Scroll and verify only journal content moves while the progress tracer advances.

- [ ] **Step 4: Verify mobile behavior**

At a narrow phone viewport, verify usable search controls, readable full text, reduced decoration, and no horizontal overflow.

- [ ] **Step 5: Re-run verification after visual corrections**

Run: `npm run test:content && npm run check && npm run build`

Expected: exit code `0` for all commands.
