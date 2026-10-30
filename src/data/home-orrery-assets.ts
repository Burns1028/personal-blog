const root = "/assets/home-celestials-v7";
export const homeOrreryAssets = {
  background: {
    starfield: {
      mobile: "/assets/home-cosmic-system-v3/home-cosmos-starfield-v3-1280.webp",
      desktop: "/assets/home-cosmic-system-v3/home-cosmos-starfield-v3-2048.webp",
    },
  },
  scene: {
    poster: {
      standard: `${root}/scene-1200.webp`,
      retina: `${root}/scene-1600.webp`,
    },
    video: `${root}/scene-alpha-packed.mp4`,
    sizes: "(max-width: 767px) calc(100vw - 32px), 55vw",
  },
} as const;
