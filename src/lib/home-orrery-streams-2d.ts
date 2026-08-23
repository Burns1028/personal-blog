import {
  sampleCubic,
  tangentCubic,
  type OrreryHubGeometry,
  type OrreryStream,
} from "./home-orrery-geometry.ts";
import {
  createOrreryNebulaParticles,
  nebulaFade,
  nebulaSpread,
  nebulaStreamCounts,
  nebulaStreamWeights,
  nebulaVisualGain,
  type OrreryNebulaLayer,
  type OrreryNebulaParticle,
  type OrreryNebulaSource,
} from "./home-orrery-nebula.ts";

export type OrreryArtifact = "none" | "document" | "repo" | "idea";

export type OrreryRenderSnapshot = {
  geometry: OrreryHubGeometry | null;
  width: number;
  height: number;
  viewportWidth: number;
  dpr: number;
};

export type OrreryStreamController = {
  prepare: () => Promise<boolean>;
  setRunning: (running: boolean) => void;
  setActiveArtifact: (artifact: OrreryArtifact) => void;
  setGeometry: (snapshot: OrreryRenderSnapshot) => void;
  destroy: () => void;
};

type FrameDependencies = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frame: number) => void;
  now: () => number;
  environment: Orrery2DEnvironment;
  particleFactory: typeof createOrreryNebulaParticles;
};

export type Orrery2DEnvironment = {
  saveData: boolean;
  hardwareConcurrency: number;
};

export type Orrery2DQuality = {
  particleCount: number;
  fps: number;
  dpr: number;
};

export const selectOrrery2DQuality = (
  viewportWidth: number,
  requestedDpr: number,
  environment: Orrery2DEnvironment,
): Orrery2DQuality => {
  const constrained =
    viewportWidth < 360 || environment.saveData || environment.hardwareConcurrency <= 4;
  if (constrained) {
    return {
      particleCount: 540,
      fps: 20,
      dpr: Math.min(1.25, Math.max(1, requestedDpr || 1)),
    };
  }
  if (viewportWidth <= 767) {
    return {
      particleCount: 720,
      fps: 24,
      dpr: Math.min(1.5, Math.max(1, requestedDpr || 1)),
    };
  }
  return {
    particleCount: 960,
    fps: 30,
    dpr: Math.min(2, Math.max(1, requestedDpr || 1)),
  };
};

const particleCacheKey = (
  count: number,
  geometry: OrreryHubGeometry,
) => {
  const weights = nebulaStreamWeights(geometry);
  const counts = nebulaStreamCounts(count, weights);
  return {
    key: `${count}:${counts.hub}:${counts.moon}:${counts.earth}:${counts["black-hole"]}`,
    weights,
  };
};

const sharedParticleCache = new Map<string, OrreryNebulaParticle[]>();

const sharedParticles = (count: number, geometry: OrreryHubGeometry) => {
  const request = particleCacheKey(count, geometry);
  let particles = sharedParticleCache.get(request.key);
  if (!particles) {
    particles = createOrreryNebulaParticles(count, 1028, request.weights);
    sharedParticleCache.set(request.key, particles);
  }
  return particles;
};

const particleColors: Record<OrreryNebulaSource, Record<OrreryNebulaLayer, string>> = {
  hub: {
    mist: "rgba(117, 196, 255, 0.7)",
    dust: "rgba(221, 242, 255, 0.9)",
    spark: "rgba(255, 227, 160, 1)",
  },
  moon: {
    mist: "rgba(185, 217, 234, 0.62)",
    dust: "rgba(244, 207, 131, 0.82)",
    spark: "rgba(226, 239, 245, 1)",
  },
  earth: {
    mist: "rgba(70, 152, 209, 0.65)",
    dust: "rgba(112, 190, 226, 0.86)",
    spark: "rgba(168, 216, 238, 1)",
  },
  "black-hole": {
    mist: "rgba(240, 154, 58, 0.6)",
    dust: "rgba(225, 171, 91, 0.84)",
    spark: "rgba(197, 194, 173, 1)",
  },
};

const artifactStream: Partial<Record<OrreryArtifact, OrreryStream>> = {
  document: "moon",
  repo: "earth",
  idea: "black-hole",
};

const emphasisFor = (artifact: OrreryArtifact, stream: OrreryStream) =>
  artifact === "none" || artifactStream[artifact] === stream ? 1 : 0.68;

const drawArm = (
  context: CanvasRenderingContext2D,
  geometry: OrreryHubGeometry,
  stream: OrreryStream,
  time: number,
  artifact: OrreryArtifact,
  shortEdge: number,
  particles: OrreryNebulaParticle[],
) => {
  const path = geometry.paths[stream];
  const emphasis = emphasisFor(artifact, stream);
  const gain = nebulaVisualGain(stream);

  for (const particle of particles) {
    if (particle.stream !== stream) continue;
    const progress = (particle.phase + time * particle.speed * 0.001) % 1;
    const point = sampleCubic(path, progress);
    const tangent = tangentCubic(path, progress);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const spread = nebulaSpread(
      stream,
      particle.layer,
      progress,
      shortEdge,
    ) * particle.lateralSeed;
    const x = point.x + (-tangent.y / tangentLength) * spread;
    const y = point.y + (tangent.x / tangentLength) * spread;
    context.globalAlpha =
      particle.alpha * gain.opacity * nebulaFade(progress) * emphasis;
    context.fillStyle = particleColors[stream][particle.layer];
    context.beginPath();
    context.arc(x, y, particle.size * gain.size * 0.52, 0, Math.PI * 2);
    context.fill();
  }
};

const drawHub = (
  context: CanvasRenderingContext2D,
  geometry: OrreryHubGeometry,
  time: number,
  shortEdge: number,
  particles: OrreryNebulaParticle[],
) => {
  const hubSize = Math.min(68, Math.max(48, shortEdge * 0.075));
  const coreRadius = hubSize * 0.28;
  const hazeRadius = hubSize * 0.5;

  for (const particle of particles) {
    if (particle.stream !== "hub") continue;
    const angle = particle.phase * Math.PI * 2 + time * particle.speed * 0.001;
    const radius = shortEdge * (0.008 + particle.clusterSeed * 0.026);
    context.globalAlpha = particle.alpha;
    context.fillStyle = particleColors.hub[particle.layer];
    context.beginPath();
    context.arc(
      geometry.hub.x + Math.cos(angle) * radius,
      geometry.hub.y + Math.sin(angle) * radius * 0.58,
      particle.size * 0.52,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  const core = context.createRadialGradient(
    geometry.hub.x - 1,
    geometry.hub.y + 1,
    0,
    geometry.hub.x - 1,
    geometry.hub.y + 1,
    coreRadius,
  );
  core.addColorStop(0, "rgba(255, 255, 247, 1)");
  core.addColorStop(0.24, "rgba(192, 232, 255, 1)");
  core.addColorStop(1, "rgba(90, 179, 244, 0)");
  context.globalAlpha = 1;
  context.fillStyle = core;
  context.beginPath();
  context.arc(geometry.hub.x - 1, geometry.hub.y + 1, coreRadius, 0, Math.PI * 2);
  context.fill();

  const haze = context.createRadialGradient(
    geometry.hub.x + 3,
    geometry.hub.y - 2,
    0,
    geometry.hub.x + 3,
    geometry.hub.y - 2,
    hazeRadius,
  );
  haze.addColorStop(0, "rgba(255, 201, 108, 0.58)");
  haze.addColorStop(0.35, "rgba(116, 194, 248, 0.32)");
  haze.addColorStop(1, "rgba(69, 155, 228, 0)");
  context.fillStyle = haze;
  context.beginPath();
  context.arc(geometry.hub.x + 3, geometry.hub.y - 2, hazeRadius, 0, Math.PI * 2);
  context.fill();
};

const drawParticleField = (
  context: CanvasRenderingContext2D,
  snapshot: OrreryRenderSnapshot,
  time: number,
  artifact: OrreryArtifact,
  particles: OrreryNebulaParticle[],
) => {
  context.clearRect(0, 0, snapshot.width, snapshot.height);
  if (!snapshot.geometry) return;

  context.save();
  context.globalCompositeOperation = "lighter";
  const shortEdge = Math.min(snapshot.width, snapshot.height);
  drawHub(context, snapshot.geometry, time, shortEdge, particles);
  for (const stream of ["moon", "earth", "black-hole"] as const) {
    drawArm(context, snapshot.geometry, stream, time, artifact, shortEdge, particles);
  }
  context.restore();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
};

const defaultEnvironment = (): Orrery2DEnvironment => {
  const browserNavigator = globalThis.navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return {
    saveData: browserNavigator?.connection?.saveData === true,
    hardwareConcurrency: browserNavigator?.hardwareConcurrency || 8,
  };
};

export const drawOrreryStreams2D = (
  context: CanvasRenderingContext2D,
  snapshot: OrreryRenderSnapshot,
  time: number,
  artifact: OrreryArtifact,
) => {
  const quality = selectOrrery2DQuality(
    snapshot.viewportWidth,
    snapshot.dpr,
    defaultEnvironment(),
  );
  drawParticleField(
    context,
    snapshot,
    time,
    artifact,
    snapshot.geometry
      ? sharedParticles(quality.particleCount, snapshot.geometry)
      : [],
  );
};

const browserFrames = (): FrameDependencies => ({
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (frame) => window.cancelAnimationFrame(frame),
  now: () => performance.now(),
  environment: defaultEnvironment(),
  particleFactory: createOrreryNebulaParticles,
});

const createDependencies = (
  overrides: Partial<FrameDependencies>,
): FrameDependencies => ({
  ...browserFrames(),
  ...overrides,
});

export const createOrrery2DStreamController = (
  canvas: HTMLCanvasElement,
  dependencyOverrides: Partial<FrameDependencies> = {},
): OrreryStreamController | null => {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  const dependencies = createDependencies(dependencyOverrides);

  let snapshot: OrreryRenderSnapshot = {
    geometry: null,
    width: 1,
    height: 1,
    viewportWidth: 1,
    dpr: 1,
  };
  let artifact: OrreryArtifact = "none";
  let quality = selectOrrery2DQuality(1, 1, dependencies.environment);
  let particles: OrreryNebulaParticle[] = [];
  const particleCache = new Map<string, OrreryNebulaParticle[]>();
  let running = false;
  let destroyed = false;
  let frame = 0;
  let lastFrame = 0;

  const draw = (time = dependencies.now()) => {
    if (destroyed) return;
    drawParticleField(context, snapshot, time, artifact, particles);
  };

  const tick = (time: number) => {
    if (destroyed || !running) return;
    if (time - lastFrame >= 1000 / quality.fps) {
      lastFrame = time;
      draw(time);
    }
    frame = dependencies.requestFrame(tick);
  };

  return {
    async prepare() {
      return !destroyed;
    },
    setRunning(next) {
      if (destroyed || running === next) return;
      running = next;
      if (running) {
        lastFrame = 0;
        frame = dependencies.requestFrame(tick);
      } else {
        dependencies.cancelFrame(frame);
        frame = 0;
        draw();
      }
    },
    setActiveArtifact(next) {
      if (destroyed) return;
      artifact = next;
      if (!running) draw();
    },
    setGeometry(next) {
      if (destroyed) return;
      snapshot = next;
      quality = selectOrrery2DQuality(
        next.viewportWidth,
        next.dpr,
        dependencies.environment,
      );
      if (next.geometry) {
        const request = particleCacheKey(quality.particleCount, next.geometry);
        let nextParticles = particleCache.get(request.key);
        if (!nextParticles) {
          nextParticles = dependencies.particleFactory(
            quality.particleCount,
            1028,
            request.weights,
          );
          particleCache.set(request.key, nextParticles);
        }
        particles = nextParticles;
      } else {
        particles = [];
      }
      const backingWidth = Math.max(1, Math.round(next.width * quality.dpr));
      const backingHeight = Math.max(1, Math.round(next.height * quality.dpr));
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      context.setTransform(quality.dpr, 0, 0, quality.dpr, 0, 0);
      draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      dependencies.cancelFrame(frame);
      frame = 0;
      context.clearRect(0, 0, snapshot.width, snapshot.height);
    },
  };
};
