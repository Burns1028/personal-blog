# Navigation Celestial Icons Design

## Goal

Give the shared `Writing`, `Projects`, and `Ideas` navigation a clear celestial identity without changing the existing page architecture: a miniature Moon precedes Writing, a miniature Earth precedes Projects, and a miniature black hole precedes Ideas. The result must feel like a reduced, precise continuation of the approved home orrery, not a separate icon set.

## Selected approach

Generate three dedicated miniature celestial assets with ImageGen, using the approved home orrery as the strict style reference. Each object is rendered specifically for navigation scale rather than extracted from a larger scene.

- `Writing`: a complete warm ivory-gold Moon with painterly crater texture.
- `Projects`: a complete deep-navy Earth with restrained antique-gold details and asymmetric blue rim light.
- `Ideas`: a complete black-hole phenomenon with a pure-black core, thin photon ring, asymmetric accretion flow, and short particle sweep.

The three generated sources were created against a flat chroma-key background, then cleaned locally into transparent masters. This approach avoids the two weaker alternatives:

1. Cropping the complete visual master would carry starfield, connection-line, or rectangular background pixels into the icons.
2. Shrinking the existing large-object layers would preserve detail meant for hundreds of pixels and turn the black hole into a hard-edged gold disc at navigation scale.

## Structure

The shared navigation remains data-driven. Each navigation item gains an explicit celestial kind (`moon`, `earth`, or `black-hole`) in `src/data/site.ts`. `BaseLayout.astro` renders an accessible text label plus a decorative, `aria-hidden` icon container.

The Moon and Earth use fixed square containers. The black hole uses a slightly wider container so its asymmetric accretion flow remains complete. Each link remains a single interactive element, and decorative images never receive their own focus or pointer events.

## Visual specification

### Desktop

- Moon and Earth icon box: `22px` square.
- Black-hole icon box: `27px` wide by `22px` high.
- Gap between icon and label: `8px`.
- Gap between navigation items: responsive `28px` to `44px`.
- Link padding becomes compact and consistent so the added inter-item gap creates actual breathing room rather than making the entire navigation oversized.
- Icons use their native transparent silhouettes; no circular border, selection ring, badge, or boxed background is allowed.
- Inactive icon opacity remains legible at approximately `0.82`; active and hovered icons rise to full opacity with a restrained brightness increase.
- The text, icon, and current-page underline behave as one visual unit.

### Compact and mobile

- Icon box scales to `17px`–`18px`.
- Icon-to-label gap scales to `6px`.
- Inter-item gap reduces enough to keep all three destinations on one row.
- Labels are never hidden because the celestial marks supplement navigation text rather than replace it.

### Light pages

The same assets remain visible on paper/ochre backgrounds through a small contrast adjustment applied at the icon wrapper level. The adjustment must not recolor the objects into flat monochrome glyphs or erase the Earth’s blue and black hole’s gold.

## Motion and interaction

The miniature celestial objects are static. Hover and current-page states only adjust opacity, brightness, and a very soft drop shadow. They do not translate, scale, rotate, or introduce continuous animation. This preserves the nav’s precision and avoids competing with the moving home orrery.

Keyboard focus stays on the full link using the existing focus treatment. The icons are decorative and do not change the accessible name.

## Asset handling

Use the dedicated transparent assets below:

- `/assets/navigation-celestials/nav-writing-moon-v1-64.webp` with a `128px` retina derivative
- `/assets/navigation-celestials/nav-projects-earth-v1-64.webp` with a `128px` retina derivative
- `/assets/navigation-celestials/nav-ideas-black-hole-v2-80.webp` with a `160px` retina derivative

Their transparent masters remain in `design-source/navigation-celestials/` for future controlled regeneration. The implementation must not modify, regenerate, or overwrite any current home-orbit source or output asset.

## Verification

1. Structural test: every shared navigation link renders exactly one celestial wrapper and the expected kind.
2. Accessibility test: links retain the names `Writing`, `Projects`, and `Ideas`; celestial layers are hidden from assistive technology.
3. CSS/static test: no icon hover rule contains translation, scale, or rotation; desktop and mobile size tokens exist.
4. Build verification: the Astro production build succeeds without missing asset references.
5. Visual smoke check at desktop and mobile widths on both the night home page and one light page confirms:
   - Moon, Earth, and black hole are recognizable and aligned.
   - No rectangular background or selection circle appears.
   - The three destinations have more breathing room.
   - The navigation does not wrap or overflow.

## Scope

This change affects only the shared navigation iconography and spacing. It does not alter the home orrery, route transitions, page-specific backgrounds, navigation labels, or content data.
