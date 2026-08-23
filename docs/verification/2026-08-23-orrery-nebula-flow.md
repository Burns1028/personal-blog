# Homepage orrery nebula flow verification

- Date: 2026-08-23 (Asia/Shanghai)
- Critical visual rework commit under test: `8f64e04595580e19dd17237d902a05a549fc265b`
- Final responsive performance fix: `b3ca2539b9e6f5dcaa92994356830ce597054c60`
- Earth glint anchor: `d9e5dfb`
- Geometry-weighted particle allocation: `55a5bbc`
- Shared Three/2D balance baseline: `7811603`
- Scope: local contract, test, build, and real-browser release verification only

## Strengthened no-line source contract

`tests/home-orrery.test.ts` now prevents continuous-line primitives from returning through either production renderer:

- Three.js rejects `createRibbonGeometry`, `ribbonGeometry`, `ribbonMaterial`, `LineBasicMaterial`, `LineSegments`, and `TubeGeometry`.
- The 2D fallback rejects `stroke(` with optional whitespace, `bezierCurveTo`, `lineTo`, and `Path2D`.
- Both renderers must contain an active `createOrreryNebulaParticles(` call.

The strengthened contract passed on first execution because the critical visual rework already satisfied it. No renderer, celestial layout, or CSS source was changed during this verification closeout.

## Automated gates

| Gate | Exact result |
| --- | --- |
| Final renderer/facade focused suite | 63 passed, 0 failed, exit 0 |
| `npm run test:content` | 200 passed, 0 failed, exit 0 |
| `npm run build` | exit 0; Astro check: 121 files, 0 errors, 0 warnings, 0 hints; server build complete |
| `git diff --check` | exit 0, no output |

The successful build retains the repository's existing Markdown configuration deprecation notice and Vite chunk-size advisory. Neither is an Astro diagnostic or build failure.

## Critical visual rework browser gate

The main controller verified the reworked homepage in a real local browser. All four PNGs were captured at their exact named viewport after the homepage stream canvas reported `data-renderer="three"`.

| Exact viewport | Renderer | Horizontal overflow | Console warn/error | Screenshot |
| --- | --- | --- | --- | --- |
| 360×800 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-balanced-final/orrery-balanced-360x800.png` |
| 393×852 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-balanced-final/orrery-balanced-393x852.png` |
| 430×932 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-balanced-final/orrery-balanced-430x932.png` |
| 1440×900 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-balanced-final/orrery-balanced-1440x900.png` |

Independent `sips` checks confirmed that every PNG exactly matches its named viewport. Original-resolution inspection of the four approved captures confirms:

- Earth starts at the measured upper-left blue-white glint, leaves along the down-left tangent, and no longer uses the former lower-left nearest-hub attachment;
- the Moon arm is a continuous warm-gold to silver-blue particle flow rather than sparse green dots;
- the Earth arm remains blue without becoming the only thick or overexposed arm;
- the black-hole arm remains continuous orange-gold through its middle and keeps the widest dust halo;
- all three particle arms are statically traceable from their celestial bodies to the shared hub;
- a small blue-white-gold asymmetric hub is clearly visible;
- there is no continuous line spine, hard Y junction, cross, or circular weld point;
- the Moon, Earth, black hole, satellite, navigation, and overall celestial layout are unchanged.

Commit `8f64e04595580e19dd17237d902a05a549fc265b` changes only nebula renderer/model sources and their focused tests. It has no diff from the prior verification commit in `src/components/HomeOrrery.astro`, `src/styles/home-orrery.css`, `src/components/SiteNav.astro`, or `src/styles/navigation.css`.

## Final responsive performance review

The final branch review found that the rendered stage can be wider than the real viewport on phones and that the original 2D fallback did not share the constrained-device budget. Commit `b3ca2539b9e6f5dcaa92994356830ce597054c60` closes both issues without changing celestial geometry, shaders, colors, or CSS:

- Three.js selects quality from the live viewport width and reapplies the latest measured DPR after resize or display changes.
- A `340 px` viewport with a `380.8 px` stage now enters the constrained Three profile instead of the regular mobile profile.
- The 2D fallback uses deterministic cached profiles: `960 / 30 fps / DPR 2` on desktop, `720 / 24 fps / DPR 1.5` on phones, and `540 / 20 fps / DPR 1.25` for narrow, data-saver, or low-core devices.
- Controller-level tests verify particle instance counts, frame throttling, backing-canvas DPR, cache reuse, and live renderer pixel-ratio calls.
- The final independent re-review reported no Critical, Important, or Minor findings and marked the branch ready.

## Deployment boundary

This work remained local. Production was not deployed or modified, and Alibaba Cloud was not queried or touched in any way.
