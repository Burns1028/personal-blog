import type { OrreryStream } from "./home-orrery-geometry.ts";

export type OrreryNebulaLayer = "mist" | "dust" | "spark";
export type OrreryNebulaSource = OrreryStream | "hub";

export type OrreryNebulaParticle = {
  stream: OrreryNebulaSource;
  layer: OrreryNebulaLayer;
  phase: number;
  speed: number;
  lateralSeed: number;
  clusterSeed: number;
  size: number;
  rotation: number;
  alpha: number;
  atlasCell: number;
};

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const layerFor = (value: number): OrreryNebulaLayer =>
  value < 0.22 ? "mist" : value < 0.91 ? "dust" : "spark";

const atlasCellFor = (
  stream: OrreryNebulaSource,
  phase: number,
  index: number,
) => {
  const variant = Math.abs(index) % 4;
  if (stream === "hub" || stream === "earth" || phase >= 0.72) {
    return 8 + variant;
  }
  return stream === "moon" ? 4 + variant : variant;
};

export const nebulaSpread = (
  stream: OrreryStream,
  layer: OrreryNebulaLayer,
  progress: number,
  stageShortEdge: number,
) => {
  const streamScale = stream === "black-hole" ? 1.32 : stream === "earth" ? 0.78 : 1;
  const layerScale = layer === "mist" ? 1.7 : layer === "spark" ? 1.18 : 1;
  const convergence = 0.18 + Math.sin(Math.PI * progress) * 0.82;
  return stageShortEdge * 0.028 * streamScale * layerScale * convergence;
};

export const nebulaFade = (progress: number) => {
  const edgeFade = Math.min(1, progress / 0.02, (1 - progress) / 0.012);
  return Math.max(0, edgeFade);
};

export const nebulaOpacity = (layer: OrreryNebulaLayer, progress: number) => {
  const base = layer === "mist" ? 0.22 : layer === "dust" ? 0.55 : 0.82;
  return base * nebulaFade(progress);
};

export const createOrreryNebulaParticles = (count: number, seed = 1028) => {
  const random = seededRandom(seed);
  const total = Math.max(0, Math.floor(count));
  const hubCount = Math.round(total * 0.09);
  const arms = ["moon", "earth", "black-hole"] as const;
  return Array.from({ length: total }, (_, index): OrreryNebulaParticle => {
    const stream = index < hubCount ? "hub" : arms[(index - hubCount) % 3];
    const layer = layerFor(random());
    const phase = random();
    const sizeRange = layer === "mist" ? [3.8, 7.4] : layer === "dust" ? [1.1, 4.1] : [1.6, 4.8];
    const alphaRange = layer === "mist" ? [0.14, 0.3] : layer === "dust" ? [0.36, 0.72] : [0.62, 0.96];
    return {
      stream,
      layer,
      phase,
      speed: 0.012 + random() * 0.031,
      lateralSeed: random() * 2 - 1,
      clusterSeed: random(),
      size: sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]),
      rotation: (random() - 0.5) * Math.PI,
      alpha: alphaRange[0] + random() * (alphaRange[1] - alphaRange[0]),
      atlasCell: atlasCellFor(stream, phase, index),
    };
  });
};
