# Mobile responsive redesign verification

Verified across 2026-08-21 and 2026-08-22 (Asia/Shanghai).

## Revision and evidence setup

- Base commit under test: `04499af42eb71e4e0b4cf0ec88e3bbc39630900b`.
- The verified Task 7 working-tree patch contains the two polish files listed below and this record; the final commit packages that exact state after the final gate.
- Production preview: `BLOG_DB_PATH=.superpowers/sdd/task-7-qa.sqlite npm run preview -- --host 127.0.0.1` at `http://127.0.0.1:4321`.
- The worktree's default preview database had no project records, so the visual pass used that ignored representative QA database with five projects, six activity days, and five Ideas records. This exposed full cards, pagination, expanded activity details, and typical Chinese paragraphs without changing tracked runtime content.
- Tested viewports: `360×800`, `390×844`, `430×932`, `1440×900`, and `2048×928`.

### Authoritative final-capture manifest

Only the following post-fix files are authoritative screenshot evidence for this verification. Home uses paired top/lower captures at 360 and 430 so the PKU row and complete orrery are both represented; its 390 capture is the required viewport reference.

| Route | Viewport | Exact final filename(s) |
| --- | --- | --- |
| Home | `360×800` | `.superpowers/sdd/task-7-screenshots/home-360x800-top-patched.png`; `.superpowers/sdd/task-7-screenshots/home-360x800-bottom-patched.png` |
| Home | `390×844` | `.superpowers/sdd/task-7-screenshots/home-390x844-viewport.png` |
| Home | `430×932` | `.superpowers/sdd/task-7-screenshots/home-430x932-top-patched.png`; `.superpowers/sdd/task-7-screenshots/home-430x932-bottom-patched.png` |
| Projects | `390×844` | `.superpowers/sdd/task-7-screenshots/projects-390x844-viewport.png` |
| Ideas | `390×844` | `.superpowers/sdd/task-7-screenshots/ideas-390x844-viewport.png` |
| Home | `1440×900` | `.superpowers/sdd/task-7-screenshots/home-1440x900-viewport.png` |
| Projects | `1440×900` | `.superpowers/sdd/task-7-screenshots/projects-1440x900-viewport.png` |
| Ideas | `1440×900` | `.superpowers/sdd/task-7-screenshots/ideas-1440x900-viewport.png` |

The older `.superpowers/sdd/task-7-screenshots/home-360x800-full.png`, `.superpowers/sdd/task-7-screenshots/home-390x844-full.png`, `.superpowers/sdd/task-7-screenshots/home-430x932-full.png`, `.superpowers/sdd/task-7-screenshots/home-430x932-viewport.png`, and `.superpowers/sdd/task-7-screenshots/home-430x932-bottom.png` are pre-fix, non-authoritative captures retained only as visual history. They must not be used to judge the final PKU-row result.

The `.superpowers/sdd/task-7-screenshots/home-2048x928-viewport.png`, `.superpowers/sdd/task-7-screenshots/projects-2048x928-viewport.png`, and `.superpowers/sdd/task-7-screenshots/ideas-2048x928-viewport.png` files are supplemental, encoder-capped captures with a physical width of 1873 px, not authoritative `2048×928` screenshot evidence. At the `2048×928` override, the browser console confirmed `window.innerWidth === 2048` and supplied the geometry recorded below; the required authoritative desktop comparisons are the exact-size `1440×900` files in the manifest.

## Automated gate

Final gate:

- `npm run test:content`: 151 tests, 151 passed, 0 failed, 0 skipped.
- `npm run build`: Astro checked 112 files with 0 errors, 0 warnings, and 0 hints; production build exited 0.
- `git diff --check`: exited 0 with no output.

Astro also prints its existing `markdown.remarkPlugins` / `rehypePlugins` deprecation notice before the zero-diagnostic result; Task 7 did not change that configuration.

## Phone matrix

The browser console checklist returned `horizontalOverflow: false` and `nestedVerticalScrollers: []` for every route and phone viewport. A rendered-target audit (excluding the intentional 1 px `.sr-only` control) found no target smaller than 44 px in both dimensions.

| Route | Viewport | `scrollWidth` | Horizontal overflow | Nested vertical scrollers | Route evidence |
| --- | --- | ---: | --- | --- | --- |
| Home | `360×800` | 360 | false | `[]` | 424.8 px orrery; all destinations and satellite inside; PKU row 44 px |
| Home | `390×844` | 390 | false | `[]` | 460.2 px orrery; all destinations and satellite inside; PKU row 44 px |
| Home | `430×932` | 430 | false | `[]` | 480 px orrery; all destinations and satellite inside; PKU row 44 px |
| Projects | `360×800` | 360 | false | `[]` | 5 complete cards; 6 activity triggers; no card/detail internal scroll |
| Projects | `390×844` | 390 | false | `[]` | 5 complete cards; 6 activity triggers; no card/detail internal scroll |
| Projects | `430×932` | 430 | false | `[]` | 5 complete cards; 6 activity triggers; no card/detail internal scroll |
| Ideas | `360×800` | 360 | false | `[]` | 88 px two-row search; first entry clears it; 316 px body width |
| Ideas | `390×844` | 390 | false | `[]` | 48 px search; first entry clears it; 346 px body width |
| Ideas | `430×932` | 430 | false | `[]` | 48 px search; first entry clears it; 386 px body width |

Manual phone acceptance:

- Home reads profile → three destination rows → contacts → complete orrery. There is no clipped copy, orphaned arrow, cropped celestial, or viewport-sized blank gap.
- The fresh phone reference exposed one real defect: the legacy `max-width: 430px` rule stacked the PKU mark over `graduate.`. The final `max-width: 767px` contract now restores `row`, centered alignment, and `nowrap` while preserving the institution link's 44 px hit area. Screenshots at all three phone widths show the mark and note on one compact horizontal row.
- Projects forms one continuous document from title/search through all cards, pagination, and the activity timeline. Expanded details measured `325/325` px scroll/client height at 360 and `305/305` px at 390 and 430, so none is internally scrolled.
- Ideas metadata is a compact flex row, body copy uses the full record column at all three widths, intentional line breaks remain intact, and ordinary Chinese paragraphs wrap horizontally rather than collapsing into a narrow strip.

## Desktop non-regression

| Route | Viewport | Horizontal overflow | Nested vertical scrollers | Visual comparison |
| --- | --- | --- | --- | --- |
| Home | `1440×900` | false | `[]` | Two-column hero, original celestial proportions/positions, live motion, and satellite preserved |
| Home | `2048×928` | false | `[]` | Wide two-column composition remains finite and aligned |
| Projects | `1440×900` | false | `[]` | Three-column 345 px card workbench, rotating Earth, absolute orbit, and satellite preserved |
| Projects | `2048×928` | false | `[]` | Centered workbench and full-width orbit retain the approved wide-screen relationship |
| Ideas | `1440×900` | false | `[]` | Original `132px 42px 700px` timeline columns, fixed search/backdrop, and singularity preserved |
| Ideas | `2048×928` | false | `[]` | Three-column journal and wide singularity composition remain unchanged |

The `1440×900` screenshots match the approved Home and Projects references in `docs/superpowers/specs/assets/` and the approved Ideas desktop contract. Home reached `data-scene-state="ready"` with motion running; pointer hover selected `repo` without translating the celestial. Projects retained its absolute desktop detail archive, and Ideas retained its fixed reading controls and backdrop. Shell navigation, typography, content density, focus/hover treatment, and route-transition behavior show no desktop regression. The only production CSS change is inside the final `@media (max-width: 767px)` block, and all existing desktop/transition contracts passed.

## Files changed during visual polish

- `src/styles/global.css` — phone-only PKU institution row override.
- `tests/mobile-responsive-contract.test.ts` — regression contract proving the final phone cascade wins over the legacy `max-width: 430px` column rule.

No Task 7 polish was needed in `src/styles/home-orrery.css`, `src/styles/projects-archive-v2.css`, or `src/styles/ideas-journal.css`.
