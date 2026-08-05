# Homepage orrery v3 sources

The approved black-hole → Moon → Earth composition lives in
[`docs/superpowers/specs/assets/home-orrery-motion-approved-v1.webp`](../../docs/superpowers/specs/assets/home-orrery-motion-approved-v1.webp).

- `starfield-master.png`: near-black full-bleed star field with calm negative space on the left and a slightly richer stellar cluster on the right; it replaces the former Saturn-ring background while the live star canvas remains animated.

`scripts/build-home-orrery-assets.mjs` uses the approved composition as the only source for the celestial system. It preserves the complete directional light field, path, satellite, rim light, and asymmetric black-hole accretion glow in one fixed scene. Only each body's interior is removed and replaced with a small crop from the same master: Moon and Earth textures travel horizontally behind a circular mask, while the black-hole core rotates. This prevents synthetic uniform glows, duplicate silhouettes, and rectangular transition artifacts.

Run `npm run assets:home:orrery` to regenerate `public/assets/home-cosmic-system-v3/`.
