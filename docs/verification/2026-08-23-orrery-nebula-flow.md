# Homepage orrery nebula flow verification

- Date: 2026-08-23 (Asia/Shanghai)
- Production source commit under test: `4ba645e2fe4503389bc14970c5c985a20d90ebbf`
- Scope: local contract, test, build, and browser verification only

## Source contract

`tests/home-orrery.test.ts` now rejects the former continuous-line APIs in both shipped renderers and requires both renderers to consume `createOrreryNebulaParticles`.

The new contract passed on its first run because the production implementation from Tasks 2 and 3 was already present at the source commit under test. No artificial production rollback was made, and no production renderer source was changed during this task.

## Automated gates

| Gate | Exact result |
| --- | --- |
| `node --test tests/home-orrery.test.ts` | 21 passed, 0 failed |
| Focused five-file suite | 44 passed, 0 failed |
| `npm run test:content` | 185 passed, 0 failed |
| `npm run build` | exit 0; Astro check: 121 files, 0 errors, 0 warnings, 0 hints; server build complete |
| `git diff --check` | exit 0, no output |

The successful build still prints the repository's existing Markdown configuration deprecation notice and Vite's chunk-size advisory; neither is an Astro diagnostic or build failure.

## Real-browser verification

The homepage was loaded from `http://127.0.0.1:4322/` in the Codex in-app browser. Each capture was taken only after the stream canvas reported `data-renderer="three"` and the orrery reported `data-scene-state="ready"`. Narrow captures were scrolled to the orrery stage so all bodies and streams were visible. PNG dimensions were independently checked with `sips`.

| Viewport | Renderer / scene | Document width | Console warn/error | Screenshot |
| --- | --- | --- | --- | --- |
| 360×800 | `three` / `ready` | 360 = `innerWidth` | 0 / 0 | `/tmp/burns-orrery-nebula/orrery-nebula-360x800-stage.png` |
| 393×852 | `three` / `ready` | 393 = `innerWidth` | 0 / 0 | `/tmp/burns-orrery-nebula/orrery-nebula-393x852-stage.png` |
| 430×932 | `three` / `ready` | 430 = `innerWidth` | 0 / 0 | `/tmp/burns-orrery-nebula/orrery-nebula-430x932-stage.png` |
| 1440×900 | `three` / `ready` | 1440 = `innerWidth` | 0 / 0 | `/tmp/burns-orrery-nebula/orrery-nebula-1440x900.png` |

Original-resolution inspection of all four captures found:

- no visible continuous line spine;
- no sharp Y intersection, cross, or circular weld point;
- all three diffuse particle arms remain traceable to their associated Moon, Earth, and black-hole bodies;
- the Moon, Earth, black hole, satellite, and navigation remain present and correctly placed.

Measured element rectangles provide an auditable position record. Values are `x / documentY / width×height` in CSS pixels:

| Viewport | Moon | Earth | Black hole | Satellite | Navigation |
| --- | --- | --- | --- | --- | --- |
| 360×800 | 40.88 / 855.80 / 87.86×87.86 | 198.30 / 886.22 / 153.76×153.76 | 26.23 / 1023.10 / 98.84×98.84 | 205.22 / 1000.26 / 28.85×28.85 | 16.56 / 48.00 / 326.88×44.00 |
| 393×852 | 44.62 / 865.59 / 95.91×95.91 | 216.48 / 898.79 / 167.85×167.85 | 28.64 / 1048.23 / 107.91×107.91 | 228.09 / 1027.30 / 32.93×32.93 | 18.08 / 48.00 / 356.84×44.00 |
| 430×932 | 48.82 / 873.99 / 104.95×104.95 | 236.86 / 910.33 / 183.66×183.66 | 31.33 / 1073.82 / 118.06×118.06 | 249.57 / 1050.94 / 36.03×36.03 | 19.78 / 48.00 / 390.44×44.00 |
| 1440×900 | 717.41 / 41.38 / 187.13×187.13 | 1053.89 / 89.96 / 377.86×377.86 | 640.04 / 418.35 / 230.31×230.31 | 1080.05 / 379.26 / 74.14×74.14 | 161.23 / 0.00 / 299.88×106.25 |

The production nebula commits do not change `src/components/HomeOrrery.astro`, `src/styles/home-orrery.css`, `src/components/SiteNav.astro`, or `src/styles/navigation.css` relative to baseline commit `468daa6a54341e1f7a7422e1b28a4c9e01134dcd`; the desktop layout and body-position sources are unchanged.

## Deployment boundary

The work remained local. Production was not deployed or modified, and Alibaba Cloud was not queried or touched in any way.
