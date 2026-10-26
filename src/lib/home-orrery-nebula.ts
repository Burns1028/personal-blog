import {
  sampleCubic,
  type OrreryHubGeometry,
  type OrreryStream,
} from "./home-orrery-geometry.ts";

export type OrreryNebulaLayer = "mist" | "dust" | "spark";
export type OrreryNebulaSource = OrreryStream | "hub";

export type OrreryNebulaParticle = {
  stream: OrreryNebulaSource;
  emitter: boolean;
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

export type OrreryNebulaStreamWeights = Record<OrreryStream, number>;
export type OrreryNebulaStreamCounts = Record<OrreryNebulaSource, number>;

const streamOrder = ["moon", "earth", "black-hole"] as const;
const streamSpreadScale: Record<OrreryStream, number> = {
  moon: 1,
  earth: 0.78,
  "black-hole": 1.32,
};

const visualGain: Record<
  OrreryNebulaSource,
  { opacity: number; size: number }
> = {
  moon: { opacity: 1.45, size: 1.18 },
  earth: { opacity: 0.9, size: 0.98 },
  "black-hole": { opacity: 1.38, size: 1.22 },
  hub: { opacity: 1, size: 1 },
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
  const streamScale = streamSpreadScale[stream];
  const layerScale = layer === "mist" ? 1.7 : layer === "spark" ? 1.18 : 1;
  const convergence = 0.18 + Math.sin(Math.PI * progress) * 0.82;
  const sourceProgress = Math.min(1, Math.max(0, progress / 0.08));
  const earthSourceTaper =
    sourceProgress * sourceProgress * (3 - 2 * sourceProgress);
  const sourceTaper = stream === "earth" ? earthSourceTaper : 1;
  return (
    stageShortEdge *
    0.028 *
    streamScale *
    layerScale *
    convergence *
    sourceTaper
  );
};

const cubicLength = (geometry: OrreryHubGeometry, stream: OrreryStream) => {
  const path = geometry.paths[stream];
  let length = 0;
  let previous = sampleCubic(path, 0);
  for (let step = 1; step <= 64; step += 1) {
    const current = sampleCubic(path, step / 64);
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
    previous = current;
  }
  return length;
};

export const nebulaStreamWeights = (
  geometry: OrreryHubGeometry,
): OrreryNebulaStreamWeights => ({
  moon: cubicLength(geometry, "moon") * streamSpreadScale.moon,
  earth: cubicLength(geometry, "earth") * streamSpreadScale.earth,
  "black-hole":
    cubicLength(geometry, "black-hole") * streamSpreadScale["black-hole"],
});

export const nebulaStreamCounts = (
  count: number,
  weights: OrreryNebulaStreamWeights,
): OrreryNebulaStreamCounts => {
  const total = Math.max(0, Math.floor(count));
  const hub = Math.min(total, Math.round(total * 0.09));
  const armBudget = total - hub;
  const usableWeights = streamOrder.map((stream) =>
    Number.isFinite(weights[stream]) && weights[stream] > 0
      ? weights[stream]
      : 0,
  );
  const weightTotal = usableWeights.reduce((sum, weight) => sum + weight, 0);
  const normalized = weightTotal > 0 ? usableWeights : streamOrder.map(() => 1);
  const normalizedTotal = normalized.reduce((sum, weight) => sum + weight, 0);
  const exact = normalized.map((weight) => (armBudget * weight) / normalizedTotal);
  const quotas = exact.map(Math.floor);
  let remainder = armBudget - quotas.reduce((sum, quota) => sum + quota, 0);
  const remainderOrder = streamOrder
    .map((stream, index) => ({ stream, index, fraction: exact[index] - quotas[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) {
    quotas[remainderOrder[index].index] += 1;
  }
  return {
    hub,
    moon: quotas[0],
    earth: quotas[1],
    "black-hole": quotas[2],
  };
};

export const nebulaVisualGain = (stream: OrreryNebulaSource) =>
  visualGain[stream];

export const nebulaEmitterGain = (
  stream: OrreryStream,
  progress: number,
) => {
  if (stream !== "earth") return { opacity: 1, size: 1 };
  const normalized = Math.min(1, Math.max(0, progress / 0.56));
  const eased = normalized * normalized * (3 - 2 * normalized);
  const strength = 1 - eased;
  return {
    opacity: 1.7 + strength * 0.8,
    size: 1.18 + strength * 0.18,
  };
};

export const nebulaFade = (progress: number, stream?: OrreryStream) => {
  const sourceFade = stream === "earth" ? 1 : Math.min(1, progress / 0.02);
  const edgeFade = Math.min(sourceFade, (1 - progress) / 0.012);
  return Math.max(0, edgeFade);
};

export const nebulaOpacity = (
  layer: OrreryNebulaLayer,
  progress: number,
  stream?: OrreryStream,
) => {
  const base = layer === "mist" ? 0.22 : layer === "dust" ? 0.55 : 0.82;
  return base * nebulaFade(progress, stream);
};

const interleavedStreams = (counts: OrreryNebulaStreamCounts) => {
  const armBudget = counts.moon + counts.earth + counts["black-hole"];
  if (armBudget <= 0) return [];
  const remaining = streamOrder.map((stream) => counts[stream]);
  const accumulators = streamOrder.map(() => 0);
  const streams: OrreryStream[] = [];
  for (let index = 0; index < armBudget; index += 1) {
    for (let streamIndex = 0; streamIndex < streamOrder.length; streamIndex += 1) {
      accumulators[streamIndex] += counts[streamOrder[streamIndex]];
    }
    let selected = -1;
    for (let streamIndex = 0; streamIndex < streamOrder.length; streamIndex += 1) {
      if (
        remaining[streamIndex] > 0 &&
        (selected < 0 || accumulators[streamIndex] > accumulators[selected])
      ) {
        selected = streamIndex;
      }
    }
    streams.push(streamOrder[selected]);
    remaining[selected] -= 1;
    accumulators[selected] -= armBudget;
  }
  return streams;
};

export const createOrreryNebulaParticles = (
  count: number,
  seed = 1028,
  weights: OrreryNebulaStreamWeights = {
    moon: 1,
    earth: 1,
    "black-hole": 1,
  },
) => {
  const random = seededRandom(seed);
  const total = Math.max(0, Math.floor(count));
  const counts = nebulaStreamCounts(total, weights);
  const armStreams = interleavedStreams(counts);
  const earthEmitterCount = Math.min(
    counts.earth,
    96,
    Math.max(28, Math.round(counts.earth * 0.32)),
  );
  const movingEarthCount = counts.earth - earthEmitterCount;
  const streamOrdinals: Record<OrreryStream, number> = {
    moon: 0,
    earth: 0,
    "black-hole": 0,
  };
  return Array.from({ length: total }, (_, index): OrreryNebulaParticle => {
    const stream = index < counts.hub ? "hub" : armStreams[index - counts.hub];
    const layer = layerFor(random());
    const randomPhase = random();
    const randomSpeed = random();
    const streamOrdinal = stream === "hub" ? 0 : streamOrdinals[stream]++;
    const emitter = stream === "earth" && streamOrdinal < earthEmitterCount;
    const movingEarthOrdinal = streamOrdinal - earthEmitterCount;
    const phase =
      emitter
        ? streamOrdinal / Math.max(1, earthEmitterCount - 0.5)
        : stream === "earth" && movingEarthCount > 0
          ? (movingEarthOrdinal + 0.25 + randomPhase * 0.5) / movingEarthCount
        : randomPhase;
    const sizeRange = layer === "mist" ? [3.8, 7.4] : layer === "dust" ? [1.1, 4.1] : [1.6, 4.8];
    const alphaRange = layer === "mist" ? [0.14, 0.3] : layer === "dust" ? [0.36, 0.72] : [0.62, 0.96];
    const lateralSeed = random() * 2 - 1;
    const clusterSeed = random();
    const size = sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]);
    const rotation = (random() - 0.5) * Math.PI;
    const alpha = alphaRange[0] + random() * (alphaRange[1] - alphaRange[0]);
    return {
      stream,
      emitter,
      layer,
      phase,
      speed: emitter ? 0 : stream === "earth" ? 0.024 : 0.012 + randomSpeed * 0.031,
      lateralSeed,
      clusterSeed,
      size: emitter ? Math.max(2.6, size) : size,
      rotation,
      alpha: emitter ? Math.max(0.68, alpha) : alpha,
      atlasCell: atlasCellFor(stream, phase, index),
    };
  });
};
