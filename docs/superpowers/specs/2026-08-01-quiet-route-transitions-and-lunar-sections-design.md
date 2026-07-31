# Quiet Route Transitions and Lunar Sections

## Goal

Make the three archive destinations quieter while preserving the homepage artifacts as an entrance gesture, and give the six sections of the current long-form article a restrained lunar chapter rhythm.

## Approved visual behavior

### Homepage to archive transition

- The repository, manuscript, and sketch remain visible and clickable on the homepage.
- Only the selected artifact participates in the outgoing transition.
- The selected artifact lifts, opens slightly, and dissolves while the destination page appears.
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
- Generate six small WebP phase assets through `scripts/build-writing-assets.mjs` from the existing source artwork.
- Add final, route-specific CSS overrides after the existing archive styles so legacy artifact rules become inert without a risky stylesheet rewrite.

## Verification

- Automated contract tests confirm the three archive templates no longer import or render `ArtifactRouteStage`.
- Content tests confirm the long article exposes exactly six level-two headings and no level-three headings.
- Asset tests confirm all six lunar phase files exist.
- `astro check`, the complete build, HTTP smoke tests, and desktop/mobile screenshots must pass before restarting the local service.
