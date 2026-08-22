# Ideas Category Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-backed theme filtering to Ideas with a visible desktop/tablet category index, a compact phone category menu, and clickable theme labels in every timeline entry.

**Architecture:** Keep filtering and facet derivation in the pure `idea-archive.ts` module, then have the server-rendered Astro page derive the validated active theme and all filter URLs. Restructure the existing fixed filter into nested query/control/index regions so one semantic structure can render as a two-level catalogue rail on desktop/tablet and a two-row query/theme/date control on phones. Preserve the current date disclosure and timeline implementation.

**Tech Stack:** Astro 7, TypeScript 6, CSS media queries, Node test runner, existing SQLite-backed Ideas store.

## Global Constraints

- Search, theme, and date combine with AND semantics and remain represented in the URL.
- Themes are single-select and derived from published ideas; no schema or publishing API changes.
- Desktop/tablet expose `全部` plus the four leading themes and a two-column `更多` catalogue.
- An active long-tail theme must remain visible in the desktop/tablet index.
- Phones use a full-width search row above equal-width theme and date controls; every phone target is at least 44px high.
- Entry theme links preserve keyword and date filters.
- No changes to Writing, Projects, home, navigation, Ideas content, or the desktop singularity geometry.

---

### Task 1: Pure Theme Facets, Validation, Filtering, and URLs

**Files:**
- Modify: `src/lib/idea-archive.ts`
- Test: `tests/ideas-journal.test.ts`

**Interfaces:**
- Produces: `IdeaThemeFacet { name: string; count: number; latestAt: string }`
- Produces: `listIdeaThemes<T extends IdeaArchiveEntry>(ideas: T[]): IdeaThemeFacet[]`
- Produces: `normalizeIdeaTheme(value: string | null | undefined, themes: IdeaThemeFacet[]): string`
- Changes: `filterIdeas<T>(ideas, rawQuery, rawDate, rawTheme?): T[]`
- Produces: `ideaArchiveHref({ query?, date?, theme? }): string`

- [ ] **Step 1: Write failing facet and combined-filter tests**

Add imports for `ideaArchiveHref`, `listIdeaThemes`, and `normalizeIdeaTheme`, then add tests using repeated themes and tied counts:

```ts
test("Ideas themes are counted and ordered by count then recency", () => {
  const facets = listIdeaThemes([
    ...ideas,
    { sourceKey: "learning-again", text: "再学一次", theme: "学习", capturedAt: "2026-08-08T00:00:00+08:00" },
    { sourceKey: "literature-again", text: "再读一次", theme: "文学", capturedAt: "2026-08-06T00:00:00+08:00" },
  ]);
  assert.deepEqual(facets.map(({ name, count }) => ({ name, count })), [
    { name: "学习", count: 2 },
    { name: "文学", count: 2 },
    { name: "处事", count: 1 },
  ]);
});

test("Ideas validates exact themes and combines all filters", () => {
  const facets = listIdeaThemes(ideas);
  assert.equal(normalizeIdeaTheme(" 文学 ", facets), "文学");
  assert.equal(normalizeIdeaTheme("不存在", facets), "");
  assert.deepEqual(
    filterIdeas(ideas, "良夜", "2026-08-07", "文学").map(({ sourceKey }) => sourceKey),
    ["poem-night"],
  );
  assert.deepEqual(filterIdeas(ideas, "", "", "学习").map(({ sourceKey }) => sourceKey), ["learning-fast"]);
});

test("Ideas filter URLs preserve and clear independent constraints", () => {
  assert.equal(ideaArchiveHref({ query: " Agent ", date: "2026-08-21", theme: "系统" }), "/ideas?q=Agent&theme=%E7%B3%BB%E7%BB%9F&date=2026-08-21");
  assert.equal(ideaArchiveHref({ query: "Agent", date: "2026-08-21", theme: "" }), "/ideas?q=Agent&date=2026-08-21");
  assert.equal(ideaArchiveHref({}), "/ideas");
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/ideas-journal.test.ts`

Expected: FAIL because the three new exports do not exist and `filterIdeas` does not accept a theme.

- [ ] **Step 3: Implement the pure helpers**

Add the facet interface and pure helpers:

```ts
export interface IdeaThemeFacet {
  name: string;
  count: number;
  latestAt: string;
}

export function listIdeaThemes<T extends IdeaArchiveEntry>(ideas: T[]): IdeaThemeFacet[] {
  const facets = new Map<string, IdeaThemeFacet>();
  ideas.forEach(({ theme: rawTheme, capturedAt }) => {
    const name = rawTheme.trim();
    if (!name) return;
    const current = facets.get(name);
    facets.set(name, {
      name,
      count: (current?.count ?? 0) + 1,
      latestAt: !current || capturedAt > current.latestAt ? capturedAt : current.latestAt,
    });
  });
  return [...facets.values()].sort(
    (left, right) =>
      right.count - left.count ||
      right.latestAt.localeCompare(left.latestAt) ||
      left.name.localeCompare(right.name, "zh-CN"),
  );
}

export function normalizeIdeaTheme(
  value: string | null | undefined,
  themes: IdeaThemeFacet[],
): string {
  const normalized = value?.trim() ?? "";
  return themes.some(({ name }) => name === normalized) ? normalized : "";
}
```

Extend the filter predicate with `(!theme || idea.theme.trim() === theme)`. Implement `ideaArchiveHref` with one `URLSearchParams`, setting normalized `q`, then `theme`, then validated `date`, and returning `/ideas` when the query string is empty.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/ideas-journal.test.ts`

Expected: all existing and new Ideas tests pass.

- [ ] **Step 5: Commit the pure filtering slice**

```bash
git add src/lib/idea-archive.ts tests/ideas-journal.test.ts
git commit -m "feat: add ideas theme filtering model"
```

---

### Task 2: Server-Rendered Category Index and Theme Navigation

**Files:**
- Modify: `src/pages/ideas/index.astro`
- Test: `tests/ideas-journal.test.ts`

**Interfaces:**
- Consumes: `listIdeaThemes`, `normalizeIdeaTheme`, `ideaArchiveHref`, and the four-argument `filterIdeas` from Task 1.
- Produces: `data-ideas-theme-index`, `data-ideas-theme-filter`, `data-ideas-theme-menu`, and accessible theme links used by Task 3 styling.

- [ ] **Step 1: Write failing markup contract tests**

Add assertions that the page:

```ts
assert.match(page, /Astro\.url\.searchParams\.get\("theme"\)/);
assert.match(page, /listIdeaThemes\(allIdeas\)/);
assert.match(page, /name="theme"/);
assert.match(page, /data-ideas-theme-index/);
assert.match(page, /data-ideas-theme-filter/);
assert.match(page, /分类索引/);
assert.match(page, /更多\s*\{moreThemes\.length\}\s*类/);
assert.match(page, /aria-current=\{theme\.name === selectedTheme \? "page" : undefined\}/);
assert.match(page, /aria-label=\{`查看“\$\{idea\.theme\}”分类的灵感`\}/);
assert.match(page, /ideaArchiveHref\(\{[\s\S]*?theme:\s*idea\.theme/);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/ideas-journal.test.ts`

Expected: FAIL because the page has no theme state, index, or theme links.

- [ ] **Step 3: Derive validated page state and theme groups**

In frontmatter:

```ts
const themes = listIdeaThemes(allIdeas);
const selectedTheme = normalizeIdeaTheme(Astro.url.searchParams.get("theme"), themes);
const ideas = filterIdeas(allIdeas, query, selectedDate, selectedTheme);
const leadingThemes = themes.slice(0, 4);
const activeLongTail = selectedTheme && !leadingThemes.some(({ name }) => name === selectedTheme)
  ? themes.find(({ name }) => name === selectedTheme)
  : undefined;
const visibleThemes = activeLongTail ? [...leadingThemes, activeLongTail] : leadingThemes;
const visibleThemeNames = new Set(visibleThemes.map(({ name }) => name));
const moreThemes = themes.filter(({ name }) => !visibleThemeNames.has(name));
const hrefForTheme = (theme: string) => ideaArchiveHref({ query, date: selectedDate, theme });
```

- [ ] **Step 4: Build the semantic filter regions**

Restructure the form into:

```astro
<form class="ideas-journal__search" ...>
  <div class="ideas-journal__query">...</div>
  <div class="ideas-journal__filter-controls">
    <input type="hidden" name="theme" value={selectedTheme} />
    <details class="ideas-journal__theme-filter" data-ideas-theme-filter>...</details>
    <span class="ideas-journal__filter-divider" aria-hidden="true"></span>
    <input type="hidden" name="date" value={selectedDate} data-ideas-date-value />
    <details class="ideas-journal__date-filter" data-ideas-date-filter>...</details>
  </div>
  <nav class="ideas-journal__theme-index" data-ideas-theme-index aria-label="按分类筛选灵感">...</nav>
  <button class="sr-only" type="submit">筛选灵感</button>
</form>
```

Render `全部 {allIdeas.length}`, each `visibleThemes` item, and a `更多 {moreThemes.length} 类` disclosure. Render the phone category disclosure with `全部分类` plus every facet. Each option is a real link from `hrefForTheme` and the selected option receives `aria-current="page"`.

- [ ] **Step 5: Make entry themes navigable and coordinate disclosures**

Replace the plain theme text with:

```astro
<a
  class="ideas-journal__entry-theme"
  href={hrefForTheme(idea.theme)}
  aria-label={`查看“${idea.theme}”分类的灵感`}
>
  {idea.theme}
</a>
```

Update the client script so `themeFilter`, `themeMore`, and `dateFilter` form one disclosure array. A `toggle` listener closes the other disclosures when one opens; outside pointer-down closes all; Escape closes the currently open disclosure and focuses its summary. Keep the existing date-button submission behavior.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run: `node --test tests/ideas-journal.test.ts`

Expected: all Ideas tests pass.

- [ ] **Step 7: Commit the route slice**

```bash
git add src/pages/ideas/index.astro tests/ideas-journal.test.ts
git commit -m "feat: add ideas category navigation"
```

---

### Task 3: Cross-Device Catalogue-Rail Styling

**Files:**
- Modify: `src/styles/ideas-journal.css`
- Test: `tests/ideas-journal.test.ts`
- Test: `tests/mobile-responsive-contract.test.ts`

**Interfaces:**
- Consumes the Task 2 class and data-attribute structure.
- Produces the 88px desktop/tablet two-level rail and 92px phone two-row rail.

- [ ] **Step 1: Write failing desktop and phone CSS contracts**

Assert the desktop base rules contain:

```ts
assert.match(css, /--ideas-search-height:\s*88px/);
assert.match(css, /\.ideas-journal__search\s*\{[^}]*grid-template-rows:\s*50px 38px/);
assert.match(css, /\.ideas-journal__theme-index\s*\{[^}]*display:\s*flex/);
assert.match(css, /\.ideas-journal__theme-menu\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
assert.match(css, /\.ideas-journal__entry-theme:is\(:hover,\s*:focus-visible\)/);
```

Update the phone contract to require:

```ts
assert.match(phone, /--ideas-search-height:\s*92px/);
assert.match(phone, /\.ideas-journal__search\s*\{[^}]*grid-template-rows:\s*48px 44px/);
assert.match(phone, /\.ideas-journal__theme-index\s*\{[^}]*display:\s*none/);
assert.match(phone, /\.ideas-journal__theme-filter\s*\{[^}]*display:\s*block/);
assert.match(phone, /\.ideas-journal__filter-controls\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 1px minmax\(0,\s*1fr\)/);
assert.match(phone, /\.ideas-journal__theme-option\s*\{[^}]*min-height:\s*44px/);
assert.match(phone, /\.ideas-journal__entry-theme\s*\{[^}]*min-height:\s*44px/);
```

Remove obsolete expectations for the old 48px single-row phone filter and the special 380px-only 88px split.

- [ ] **Step 2: Run focused contract tests and verify RED**

Run: `node --test tests/ideas-journal.test.ts tests/mobile-responsive-contract.test.ts`

Expected: FAIL on the new rail heights, responsive displays, and target sizes.

- [ ] **Step 3: Implement desktop/tablet catalogue styling**

Set `--ideas-search-height: 88px`. Make `.ideas-journal__search` a two-row grid with `50px 38px`. Style `.ideas-journal__query` and `.ideas-journal__filter-controls` as the first row, and `.ideas-journal__theme-index` as the second row with a subtle dotted top rule. Keep the date control at its existing 168–184px width.

Style quick index links as transparent text controls with mono counts, a diamond/current underline, and 34px minimum desktop height. The `更多` and phone theme catalogues reuse one paper-toned two-column menu treatment with counts aligned right and a bounded height.

Style `.ideas-journal__entry-theme` without changing the metadata font metrics; add the restrained hover/focus underline and diamond marker.

- [ ] **Step 4: Implement the phone two-row layout**

Inside the canonical `max-width: 767px` block:

```css
body[data-route="/ideas"] {
  --ideas-search-height: 92px;
}

.ideas-journal__search {
  grid-template-rows: 48px 44px;
}

.ideas-journal__query {
  grid-row: 1;
}

.ideas-journal__filter-controls {
  grid-row: 2;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  border-top: 1px dotted rgba(91, 60, 28, 0.26);
}

.ideas-journal__theme-index { display: none; }
.ideas-journal__theme-filter { display: block; }
```

Give both summaries, every menu option, and `.ideas-journal__entry-theme` at least 44px of interaction height. Bound the category menu with `max-height: min(360px, calc(100svh - var(--ideas-search-top) - var(--ideas-search-height) - 16px)); overflow-y: auto;`. Remove the obsolete `max-width: 380px` filter split while retaining any unrelated narrow-phone rules.

- [ ] **Step 5: Run focused contract tests and verify GREEN**

Run: `node --test tests/ideas-journal.test.ts tests/mobile-responsive-contract.test.ts`

Expected: all Ideas and mobile contracts pass.

- [ ] **Step 6: Commit the responsive presentation slice**

```bash
git add src/styles/ideas-journal.css tests/ideas-journal.test.ts tests/mobile-responsive-contract.test.ts
git commit -m "feat: style ideas category filters across devices"
```

---

### Task 4: Full Verification, Browser Acceptance, and Release

**Files:**
- Modify only if verification reveals an Ideas-scoped defect.
- Verify: `docs/superpowers/specs/2026-08-22-ideas-category-filter-design.md`

**Interfaces:**
- Consumes the completed feature from Tasks 1–3.
- Produces a tested commit deployed through the repository's Burns blog release workflow.

- [ ] **Step 1: Run formatting/static guards and the full suite**

Run:

```bash
git diff --check
npm run test:content
npm run build
```

Expected: no whitespace errors, all Node tests pass, Astro check reports zero errors, and the production build completes.

- [ ] **Step 2: Start a production-equivalent local server**

Run `npm run dev -- --host 127.0.0.1` in a persistent terminal session and wait until Astro reports the local URL.

- [ ] **Step 3: Inspect desktop and tablet in the browser**

At 1440×1000, 980×900, and 768×900 verify:

- two-level rail is visible with four leading themes;
- search retains useful width;
- a leading and long-tail selection remain visibly selected;
- `更多` is two-column, bounded, and keyboard dismissible;
- theme/date/search combinations produce correct entries and URLs;
- the timeline first entry and right singularity remain unobscured and unchanged;
- there is no horizontal overflow.

- [ ] **Step 4: Inspect phone layouts in the browser**

At 430×932, 390×844, and 360×800 verify:

- search occupies the first row and theme/date divide the second row evenly;
- both menus open within the viewport and do not create page-level horizontal scrolling;
- direct entry-theme taps preserve the date/query state;
- long Ideas entries retain their clear separators;
- empty results expose a clear-all action.

- [ ] **Step 5: Review and commit any verification fixes**

If an Ideas-scoped defect is found, add a regression assertion first, prove it fails, apply the smallest fix, rerun the focused tests, and commit with a specific `fix:` message. If no defect is found, make no empty commit.

- [ ] **Step 6: Deploy through the repository release skill**

Follow `burns-deploy-blog` exactly: verify the clean intended commit, run its preflight, deploy to Alibaba Cloud ECS, and retain rollback information.

- [ ] **Step 7: Run production smoke tests**

Verify `https://burnsgao.me/ideas`, one leading theme URL, one long-tail theme URL, a combined `q`/`theme`/`date` URL, and the public Ideas API. Confirm HTTP success, correct selected state, correct result set, responsive layout, and absence of browser console errors.
