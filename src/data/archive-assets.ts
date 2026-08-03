const phaseNames = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
] as const;

export const archiveAssets = {
  references: {
    writing:
      "docs/superpowers/specs/assets/writing-centered-search-pagination-approved.png",
    projects:
      "docs/superpowers/specs/assets/projects-activity-search-pagination-approved.png",
  },
  writing: {
    atlas: {
      desktop: "/assets/writing-atlas-v2-1600.webp",
      desktop2x: "/assets/writing-atlas-v2-2560.webp",
      mobile: "/assets/writing-atlas-v2-mobile-900.webp",
    },
    phaseStrip: {
      desktop: "/assets/writing-moon-phases-1200.webp",
      mobile: "/assets/writing-moon-phases-640.webp",
    },
    phases: phaseNames.map(
      (name, index) =>
        `/assets/writing-phase-restored-v1-${index}-${name}.webp`,
    ),
  },
  projects: {
    space: {
      desktop: "/assets/projects-space-v2-1600.webp",
      desktop2x: "/assets/projects-space-v2-2560.webp",
      mobile: "/assets/projects-space-v2-mobile-900.webp",
    },
    earth: {
      framePrefix: "/assets/projects-earth-v3/earth-",
      frameCount: 12,
      fallback: "/assets/projects-earth-v3/earth-00.webp",
      mobile: "/assets/projects-earth-v3-mobile.webp",
    },
    satellite: "/assets/projects-satellite-v2.webp",
  },
} as const;
