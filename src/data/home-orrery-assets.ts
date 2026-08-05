const assetRoot = "/assets/home-cosmic-system-v3";

export const homeOrreryAssets = {
  background: {
    starfield: {
      mobile: `${assetRoot}/home-cosmos-starfield-v3-1280.webp`,
      desktop: `${assetRoot}/home-cosmos-starfield-v3-2048.webp`,
    },
    approvedScene: {
      standard: `${assetRoot}/home-cosmos-approved-scene-v9-881.webp`,
      retina: `${assetRoot}/home-cosmos-approved-scene-v9-1762.webp`,
    },
  },
  writing: {
    moonSurface: {
      standard: `${assetRoot}/home-cosmos-writing-moon-inner-v11-140.webp`,
      retina: `${assetRoot}/home-cosmos-writing-moon-inner-v11-280.webp`,
    },
  },
  projects: {
    earthSurface: {
      standard: `${assetRoot}/home-cosmos-projects-earth-inner-v11-312.webp`,
      retina: `${assetRoot}/home-cosmos-projects-earth-inner-v11-624.webp`,
    },
  },
  ideas: {
    blackHole: {
      standard: `${assetRoot}/home-cosmos-ideas-inner-v11-96.webp`,
      retina: `${assetRoot}/home-cosmos-ideas-inner-v11-192.webp`,
    },
  },
} as const;
