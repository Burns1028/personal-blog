// Native source pixels, packed without resizing into one transparent video atlas.
export const homeCelestialRegions = {
  width: 1200,
  height: 800,
  subjects: {
    projects: { source: [192, 96, 496, 496], region: [0, 0, 496, 496] },
    ideas: { source: [800, 128, 704, 384], region: [496, 0, 704, 384] },
    writing: { source: [880, 704, 416, 416], region: [496, 384, 416, 416] },
  },
} as const;
