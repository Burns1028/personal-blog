# Homepage orrery nebula flow verification

- Date: 2026-08-23 (Asia/Shanghai)
- Critical visual rework commit under test: `8f64e04595580e19dd17237d902a05a549fc265b`
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
| Focused five-file suite | 49 passed, 0 failed, exit 0 |
| `npm run test:content` | 190 passed, 0 failed, exit 0 |
| `npm run build` | exit 0; Astro check: 121 files, 0 errors, 0 warnings, 0 hints; server build complete |
| `git diff --check` | exit 0, no output |

The successful build retains the repository's existing Markdown configuration deprecation notice and Vite chunk-size advisory. Neither is an Astro diagnostic or build failure.

## Critical visual rework browser gate

The main controller verified the reworked homepage in a real local browser. All four PNGs were captured at their exact named viewport after the homepage stream canvas reported `data-renderer="three"`.

| Exact viewport | Renderer | Horizontal overflow | Console warn/error | Screenshot |
| --- | --- | --- | --- | --- |
| 360×800 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-nebula-final/orrery-nebula-360x800.png` |
| 393×852 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-nebula-final/orrery-nebula-393x852.png` |
| 430×932 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-nebula-final/orrery-nebula-430x932.png` |
| 1440×900 | `data-renderer="three"` | `scrollWidth === innerWidth` | `[]` | `/tmp/burns-orrery-nebula-final/orrery-nebula-1440x900.png` |

Independent `sips` checks confirmed that every PNG exactly matches its named viewport. Original-resolution inspection of the four approved captures confirms:

- all three particle arms are statically traceable from their celestial bodies to the shared hub;
- a small blue-white-gold asymmetric hub is clearly visible;
- there is no continuous line spine, hard Y junction, cross, or circular weld point;
- the Moon, Earth, black hole, satellite, navigation, and overall celestial layout are unchanged.

Commit `8f64e04595580e19dd17237d902a05a549fc265b` changes only nebula renderer/model sources and their focused tests. It has no diff from the prior verification commit in `src/components/HomeOrrery.astro`, `src/styles/home-orrery.css`, `src/components/SiteNav.astro`, or `src/styles/navigation.css`.

## Deployment boundary

This work remained local. Production was not deployed or modified, and Alibaba Cloud was not queried or touched in any way.
