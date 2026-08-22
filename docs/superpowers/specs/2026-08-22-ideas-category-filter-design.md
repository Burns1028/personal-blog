# Ideas Category Filter Design

## Goal

Turn each Ideas theme into a useful navigation path and upgrade the archive filter without sacrificing the paper-journal composition on desktop or the compact reading flow on phones.

The live archive currently contains 37 published ideas across 12 themes. The four most-used themes account for about 73% of the archive, while the remaining themes form a long tail. The design therefore exposes the most useful categories directly on wide screens and keeps the full taxonomy available without rendering a dense tag cloud.

## Shared Filtering Model

- Add one single-select `theme` filter alongside the existing `q` and `date` filters.
- Search, theme, and date combine with AND semantics.
- Every filter state is represented in the URL so refresh, history navigation, and shared links reproduce the same result.
- Theme matching is exact after trimming. An unknown theme value is treated as no active theme rather than producing a misleading permanent empty state.
- Theme counts describe the complete published Ideas archive and do not fluctuate when a keyword or date is active.
- Selecting a theme, including from an entry's metadata, preserves the current keyword and date. Clearing the theme preserves the other two filters.
- The empty state names the active constraints when practical and provides one action that clears all filters.

## Theme Ordering

Themes are derived from published ideas rather than maintained in a second taxonomy file. They are ordered by:

1. descending published idea count;
2. most recent published occurrence when counts tie;
3. locale-aware theme name as the final stable tie-breaker.

The desktop quick index shows the four leading themes. The complete menu contains every theme and its total count.

## Desktop and Tablet Layout

At widths of 768px and above, the fixed archive filter becomes a two-level catalogue rail.

The first 50px row preserves a generous keyword field and the existing date control. It must not compress the search field to make room for twelve categories.

The second row is a compact theme index:

`分类索引  全部 37 | 人生感悟 8 | 系统 7 | 自省 7 | 文学 5 | 更多 8 类`

- `全部` and the four leading themes are direct filter controls.
- `更多` opens a two-column paper-toned catalogue containing the remaining themes and counts.
- When a long-tail theme is active, it is inserted into the visible index before `更多`, and the remaining-theme count adjusts. The active state is therefore never hidden behind the menu.
- Selection uses the existing ochre ink, a small diamond, and a short underline. It does not use filled pills or unrelated colors.
- The rail is constrained to the Ideas content/timeline width and does not expand across or relocate the right-side singularity artwork.
- The timeline and fixed top mask move down by the exact height of the new second row. The first entry must remain fully visible and unobscured.
- Keyboard focus receives a visible ink-colored outline or underline equivalent to hover.

At tablet widths, the same two-level information hierarchy remains. Horizontal gaps and labels may tighten, but the controls must not overflow or become horizontally scrollable.

## Phone Layout

At 767px and below, the fixed filter uses two rows:

- first row: full-width keyword search;
- second row: equal-width theme and date controls separated by a quiet vertical rule.

The theme control opens a two-column catalogue headed by `全部分类`. The menu has a viewport-relative maximum height and internal vertical scrolling only when necessary. The main page must never gain horizontal overflow.

All interactive phone targets are at least 44px high. The filter height, content top padding, top mask, timeline scroll margin, and singularity offset are updated together so fixed controls never cover content.

## Entry Theme Links

The theme label in every timeline entry becomes a link to that theme filter.

- It preserves the current keyword and date.
- On pointer devices it gains a restrained underline/diamond hover treatment.
- On phones the invisible hit area reaches the 44px target requirement without visually enlarging the metadata typography.
- The link has an accessible label such as `查看“系统”分类的灵感`.
- Existing sequence number, date, timeline node, entry text, and desktop geometry remain unchanged.

## Interaction Details

- Choosing a direct theme index item navigates immediately to the resulting URL.
- Choosing a theme or date from a menu closes all open filter menus before navigation.
- Opening one menu closes the other.
- Escape closes the open menu and returns focus to its summary control.
- Clicking outside closes any open menu.
- Search submits on Enter and retains both hidden filter values.
- Browser back and forward restore the server-rendered selected states without client-only state reconciliation.

## Accessibility

- Menus use native `details`/`summary` disclosure semantics and real links or buttons for options.
- The selected category is exposed with `aria-current="page"`.
- Counts are readable but visually subordinate; labels remain understandable without counts.
- Decorative icons and diamonds are hidden from assistive technology.
- Exactly one version of each responsive control is exposed to the accessibility tree at a time.

## Scope Boundaries

- No multi-select themes.
- No visitor analytics, popularity ranking, or personalized suggestions.
- No changes to the Ideas data schema or publishing API.
- No changes to Writing, Projects, home, navigation, the desktop singularity geometry, or Ideas entry content.
- No general-purpose component refactor unless required to keep the Ideas filter implementation internally coherent.

## Verification

- Unit tests cover theme derivation, ordering, exact matching, invalid theme normalization, and combined query/theme/date filtering.
- Route/markup contract tests cover query-preserving URLs, visible leading-theme index items, active long-tail visibility, menu counts, accessible current state, and clickable entry themes.
- Responsive contract tests cover the two-level desktop/tablet rail, the two-row phone rail, 44px phone targets, menu height bounds, timeline offset, and absence of horizontal scrolling.
- Run the complete automated test suite and production build.
- Inspect the live-equivalent page in a browser at 1440px, 980px, 768px, 430px, 390px, and 360px.
- Browser verification covers default state, a leading theme, a long-tail theme, theme plus search, theme plus date, empty results, menu interactions, entry-theme navigation, keyboard dismissal, overflow, and preservation of the desktop background composition.
