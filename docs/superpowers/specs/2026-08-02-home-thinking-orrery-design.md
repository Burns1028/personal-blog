# Homepage Thinking Orrery Design

## Goal

Replace the homepage's GitHub/manuscript/sketch collage with a single coherent celestial instrument. Three complete planets represent Writing, Projects, and Ideas while the existing star field, granular Saturn-ring artwork, profile column, and destination-page signature visuals remain intact.

Approved visual reference: `docs/superpowers/specs/assets/home-thinking-orrery-approved.png`.

## Non-negotiable invariants

- Preserve the entire left biography column, its typography, links, portrait, and contact strip.
- Preserve the existing animated star field and the granular amber Saturn-ring asset.
- Render exactly three complete, separate planets. They may not overlap, merge, or crop into one another.
- Keep the three existing route meanings and URLs:
  - Writing: `/writing`, lunar world.
  - Projects: `/projects`, cobalt observation world with a satellite.
  - Ideas: `/ideas`, dark bronze gravitational world.
- Preserve the Projects page rotating Earth, the Writing page star-map background and publication-date phases, and the Ideas page black hole.
- Remove the homepage GitHub browser screenshot and paper artifacts from the rendered homepage.
- Maintain keyboard access, stable hit areas, reduced-motion behavior, and mobile readability.
- Do not add a particle engine, WebGL scene, new runtime dependency, or full-screen animated filter.

## Visual composition

The right side is a fixed astronomical orrery rather than a group of cards. The current Saturn ring remains the dominant texture beneath it. A fine SVG instrument layer adds three engraved orbital paths, sparse ticks, and two restrained cross-shaped registration stars.

The planets form an asymmetrical triangle with generous black space:

- Writing sits in the upper-middle area as an ivory cratered moon with one stable terminator.
- Projects is the largest planet on the far right, deep cobalt with a narrow blue atmospheric rim and one small satellite.
- Ideas is the smallest foreground planet near the lower-middle area, charcoal and bronze with a contained gravitational halo.

The right side contains no labels or panels. Route names remain in the existing navigation and left-side action row. Hovering either representation highlights the other.

## Motion hierarchy

### Ambient motion

The layout and pointer hit areas remain fixed. Motion happens inside the composition:

- One elliptical dust-flow layer rotates in 78 seconds above the existing static granular ring.
- The Projects planet turns once in 48 seconds; its satellite orbits in 18 seconds.
- The Ideas planet turns in reverse in 88 seconds while its halo breathes every 9 seconds.
- The Writing moon keeps its phase fixed; only its rim glow breathes over 12 seconds.
- No automatic focus carousel or simultaneous planet bouncing is allowed.

All continuous motion pauses on `visibilitychange`, when the stage is outside the viewport, and immediately when route navigation begins. CSS animations use transform and opacity only.

### Hover and keyboard focus

Hovering or focusing a planet, header navigation item, or left action sets the existing `data-active-artifact` state. The matching planet scales to at most 1.065, its orbit and halo brighten, and the other planets recede to roughly 0.58 opacity. The transition lasts 260 milliseconds and never moves the hit target.

### Route transition

The existing cross-document View Transition plumbing remains the transport layer. The old paper-specific keyframes are replaced by planet-specific opening choreography lasting 880 milliseconds:

1. The selected planet compresses slightly for 110 milliseconds.
2. It advances along its tangent and enlarges while the rest of the orrery fades.
3. It expands beyond the viewport and becomes the color/texture bridge into the destination.

Each route has a distinct ending:

- Writing expands into parchment light before the star atlas and article list appear.
- Projects travels left and enlarges into a dark blue horizon before the existing rotating Earth begins.
- Ideas contracts once, then expands as a dark aperture before the existing black hole animates.

The destination page waits for the View Transition to finish before starting its own continuous animation, preserving the existing `burns:page-settled` contract.

### Reduced motion

When `prefers-reduced-motion: reduce` is active, all orbit, planet, halo, and dust animation stops. Navigation uses a short opacity-only reveal. The same static composition and links remain available.

## Asset strategy

ImageGen produces three separate square source images on a flat chroma-key background. Each output contains one fully visible opaque planet with generous padding and no text, shadow, satellite, rings, or decorative background. The source PNGs are stored under `design-source/home-orrery/`.

The installed chroma-key removal helper creates alpha PNG masters. A Sharp build script then creates 480px and 960px transparent WebP outputs in `public/assets/`. CSS/SVG draws orbit lines and glints because those elements require deterministic geometry and animation.

The existing `projects-satellite-v2.webp`, `home-rings-composed-v5-*`, and `home-space-*` assets are reused. Reuse protects the visual continuity the user explicitly approved and avoids unnecessary duplicate downloads.

## Component boundaries

- `HomeOrrery.astro` owns semantic links, orbit markup, image selection, and a small visibility observer.
- `home-orrery-assets.ts` is the typed asset manifest.
- `home-orrery.css` owns layout, ambient motion, interaction states, responsive behavior, and cross-document transition keyframes.
- `index.astro` keeps biography/contact behavior and replaces only the old artifact markup.
- `BaseLayout.astro` continues to own route interception, transition intent, session continuity, and destination settling.

## Responsive behavior

Above 1100px, the orrery occupies the existing right column. From 761px to 1100px, the three planets contract but retain their triangular relationship. At 760px and below, the orrery becomes a separate scene beneath the biography; the golden ring is cropped farther toward the edges and the three planet hit areas remain at least 72px. The planets never overlay text.

## Acceptance criteria

- The homepage source does not reference the old GitHub/manuscript/sketch images.
- Exactly three planet links are present and point to the correct routes.
- Planet asset files have alpha channels, transparent corners, and stay within declared byte budgets.
- Hovering either the left action or a planet activates the same state.
- Continuous animation pauses during navigation and respects reduced motion.
- Cross-document transitions use only compositor-friendly transform and opacity properties.
- The site passes content tests, type checking, production build, and desktop/mobile visual inspection.
