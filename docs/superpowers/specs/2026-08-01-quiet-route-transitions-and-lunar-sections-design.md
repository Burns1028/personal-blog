# Quiet Route Transitions and Lunar Sections

## Goal

Make the three archive destinations quieter while preserving the homepage artifacts as an entrance gesture, and give the six sections of the current long-form article a restrained lunar chapter rhythm.

## Approved visual behavior

### Homepage to archive transition

- The repository, manuscript, and sketch remain visible and clickable on the homepage.
- Only the selected artifact participates in the outgoing transition.
- The selected artifact first lifts away from the desk, then opens decisively and expands across the viewport before the destination page appears.
- Each object keeps its own physical gesture: the Writing manuscript turns around its left binding edge, the Projects screen expands outward like an opened workspace, and the Ideas sketch unfolds from a slightly tilted sheet.
- The outgoing motion lasts roughly `900–1050ms` and reaches about `1.35–1.55×` scale. It must read as an opening action, not as a hover-scale effect.
- The destination page fades in during the final third of the artifact motion so the object feels like the threshold into the next page.
- `/projects`, `/writing`, and `/ideas` do not render the persistent three-artifact stack.
- Destination layouts keep their existing background worlds and content hierarchy, with deliberate quiet negative space to the right of the content column.
- With reduced motion enabled, navigation happens immediately without the opening animation.

### Article chapter ornaments

- The article contains exactly six level-two chapters and no level-three chapters.
- Every chapter begins with a centered ornament: a fine horizontal rule, one lunar phase beside the chapter number, and a matching fine rule.
- Chapter numbers are `1` through `6`, not zero-padded.
- The chapter title is centered below the ornament, followed by normal body copy.
- Six lunar phases are cropped from the existing transparent moon-phase artwork so the ornaments remain consistent with the Writing visual system. No new generated imagery is needed.

## Implementation boundaries

- Keep `ArtifactRouteStage.astro` available for now, but remove it from the three archive pages. This minimizes unrelated cleanup in a heavily edited stylesheet.
- Extend the existing native cross-document View Transition behavior; do not introduce a client router or animation dependency.
- Keep the three object-specific keyframes separate so their transform origins and 3D rotations remain legible and independently tunable.
- Generate six small WebP phase assets through `scripts/build-writing-assets.mjs` from the existing source artwork.
- Add final, route-specific CSS overrides after the existing archive styles so legacy artifact rules become inert without a risky stylesheet rewrite.

## Verification

- Automated contract tests confirm the three archive templates no longer import or render `ArtifactRouteStage`.
- Content tests confirm the long article exposes exactly six level-two headings and no level-three headings.
- Asset tests confirm all six lunar phase files exist.
- `astro check`, the complete build, HTTP smoke tests, and desktop/mobile screenshots must pass before restarting the local service.
