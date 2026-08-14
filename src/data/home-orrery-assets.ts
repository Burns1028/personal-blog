const starfieldRoot = "/assets/home-cosmic-system-v3";
const layerRoot = "/assets/home-cosmic-system-v2";
const matchedLayerRoot = "/assets/home-cosmic-system-v4";

export const homeOrreryAssets = {
  connectionBase: {
    standard: `${matchedLayerRoot}/home-orrery-connection-base-v4-881.webp`,
    retina: `${matchedLayerRoot}/home-orrery-connection-base-v4-1762.webp`,
  },
  background: {
    starfield: {
      mobile: `${starfieldRoot}/home-cosmos-starfield-v3-1280.webp`,
      desktop: `${starfieldRoot}/home-cosmos-starfield-v3-2048.webp`,
    },
  },
  writing: {
    moon: {
      standard: `${matchedLayerRoot}/home-orrery-writing-moon-v4-480.webp`,
      retina: `${matchedLayerRoot}/home-orrery-writing-moon-v4-960.webp`,
    },
    motion: {
      texture: `${matchedLayerRoot}/home-orrery-writing-moon-surface-v7-1024.webp`,
      durationMs: 180_000,
      initialRotation: 0,
      ambientLight: 0.76,
      diffuseLight: 0.38,
    },
  },
  projects: {
    earth: {
      standard: `${matchedLayerRoot}/home-orrery-projects-earth-v4-480.webp`,
      retina: `${matchedLayerRoot}/home-orrery-projects-earth-v4-960.webp`,
    },
    earthGlow: {
      standard: `${matchedLayerRoot}/home-orrery-projects-earth-glow-v4-480.webp`,
      retina: `${matchedLayerRoot}/home-orrery-projects-earth-glow-v4-960.webp`,
    },
    motion: {
      texture: `${matchedLayerRoot}/home-orrery-projects-earth-surface-v9-1024.webp`,
      durationMs: 150_000,
      initialRotation: 1.15,
      ambientLight: 0.82,
      diffuseLight: 0.32,
    },
    satellite: {
      standard: `${layerRoot}/home-cosmos-satellite-v2-320.webp`,
      retina: `${layerRoot}/home-cosmos-satellite-v2-640.webp`,
    },
  },
  ideas: {
    core: {
      standard: `${matchedLayerRoot}/home-orrery-ideas-core-v4-480.webp`,
      retina: `${matchedLayerRoot}/home-orrery-ideas-core-v4-960.webp`,
    },
    rotor: {
      standard: `${matchedLayerRoot}/home-orrery-ideas-rotor-v5-480.webp`,
      retina: `${matchedLayerRoot}/home-orrery-ideas-rotor-v5-960.webp`,
    },
    field: {
      standard: `${matchedLayerRoot}/home-orrery-ideas-field-v4-960.webp`,
      retina: `${matchedLayerRoot}/home-orrery-ideas-field-v4-1600.webp`,
    },
  },
} as const;
