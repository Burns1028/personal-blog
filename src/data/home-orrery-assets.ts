import { homeCelestialRegions } from "./home-celestial-regions";
const root = "/assets/home-celestials-v8";
const subject = (name: keyof typeof homeCelestialRegions.subjects, sizes: string) => {
  const { region } = homeCelestialRegions.subjects[name];
  return {
    region,
    width: region[2],
    height: region[3],
    standardWidth: region[2] / 2,
    poster: { standard: `${root}/${name}-${region[2] / 2}.webp`, retina: `${root}/${name}-${region[2]}.webp` },
    sizes,
  };
};
export const homeOrreryAssets = {
  background: {
    starfield: {
      mobile: "/assets/home-cosmic-system-v3/home-cosmos-starfield-v3-1280.webp",
      desktop: "/assets/home-cosmic-system-v3/home-cosmos-starfield-v3-2048.webp",
    },
  },
  scene: {
    subjects: {
      projects: subject("projects", "(max-width: 767px) 34vw, (max-width: 1380px) 18vw, 248px"),
      ideas: subject("ideas", "(max-width: 767px) 48vw, (max-width: 1380px) 25vw, 348px"),
      writing: subject("writing", "(max-width: 767px) 29vw, (max-width: 1380px) 15vw, 208px"),
    },
    video: `${root}/scene-alpha-packed.mp4`,
  },
} as const;
