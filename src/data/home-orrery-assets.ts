const assetRoot = "/assets/home-cosmic-system-v2";

export const homeOrreryAssets = {
  stardust: {
    main: {
      mobile: `${assetRoot}/home-cosmos-stardust-main-v2-960.webp`,
      desktop: `${assetRoot}/home-cosmos-stardust-main-v2-1600.webp`,
    },
    near: {
      mobile: `${assetRoot}/home-cosmos-dust-near-v2-960.webp`,
      desktop: `${assetRoot}/home-cosmos-dust-near-v2-1600.webp`,
    },
  },
  writing: {
    moon: {
      standard: `${assetRoot}/home-cosmos-writing-moon-v2-480.webp`,
      retina: `${assetRoot}/home-cosmos-writing-moon-v2-960.webp`,
    },
  },
  projects: {
    earthSurface: `${assetRoot}/home-cosmos-projects-earth-surface-v2-1024.webp`,
    earthAtmosphere: {
      standard: `${assetRoot}/home-cosmos-projects-earth-atmosphere-v2-480.webp`,
      retina: `${assetRoot}/home-cosmos-projects-earth-atmosphere-v2-960.webp`,
    },
    satellite: {
      standard: `${assetRoot}/home-cosmos-satellite-v2-320.webp`,
      retina: `${assetRoot}/home-cosmos-satellite-v2-640.webp`,
    },
  },
  ideas: {
    core: {
      standard: `${assetRoot}/home-cosmos-ideas-core-v2-480.webp`,
      retina: `${assetRoot}/home-cosmos-ideas-core-v2-960.webp`,
    },
    warp: {
      standard: `${assetRoot}/home-cosmos-ideas-warp-v2-960.webp`,
      wide: `${assetRoot}/home-cosmos-ideas-warp-v2-1600.webp`,
    },
  },
} as const;
