import {
  sampleCubic,
  tangentCubic,
  type OrreryHubGeometry,
  type OrreryStream,
} from "./home-orrery-geometry.ts";
import {
  createOrreryNebulaParticles,
  nebulaOpacity,
  nebulaSpread,
  type OrreryNebulaLayer,
  type OrreryNebulaSource,
} from "./home-orrery-nebula.ts";

export type OrreryArtifact = "none" | "document" | "repo" | "idea";

export type OrreryRenderSnapshot = {
  geometry: OrreryHubGeometry | null;
  width: number;
  height: number;
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
};

const fallbackParticles = createOrreryNebulaParticles(540, 1028);

const particleColors: Record<OrreryNebulaSource, Record<OrreryNebulaLayer, string>> = {
  hub: {
    mist: "rgba(117, 196, 255, 0.7)",
    dust: "rgba(221, 242, 255, 0.9)",
    spark: "rgba(255, 227, 160, 1)",
  },
  moon: {
    mist: "rgba(166, 209, 255, 0.62)",
    dust: "rgba(246, 210, 139, 0.82)",
    spark: "rgba(220, 242, 255, 1)",
  },
  earth: {
    mist: "rgba(85, 181, 244, 0.65)",
    dust: "rgba(154, 218, 255, 0.86)",
    spark: "rgba(232, 249, 255, 1)",
  },
  "black-hole": {
    mist: "rgba(239, 142, 43, 0.6)",
    dust: "rgba(246, 181, 87, 0.84)",
    spark: "rgba(193, 229, 255, 1)",
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
) => {
  const path = geometry.paths[stream];
  const emphasis = emphasisFor(artifact, stream);

  for (const particle of fallbackParticles) {
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
    context.globalAlpha = particle.alpha * nebulaOpacity(particle.layer, progress) * emphasis;
    context.fillStyle = particleColors[stream][particle.layer];
    context.beginPath();
    context.arc(x, y, particle.size * 0.52, 0, Math.PI * 2);
    context.fill();
  }
};

const drawHub = (
  context: CanvasRenderingContext2D,
  geometry: OrreryHubGeometry,
  time: number,
  shortEdge: number,
) => {
  for (const particle of fallbackParticles) {
    if (particle.stream !== "hub") continue;
    const angle = particle.phase * Math.PI * 2 + time * particle.speed * 0.001;
    const radius = shortEdge * (0.008 + particle.clusterSeed * 0.026);
    context.globalAlpha = particle.alpha * nebulaOpacity(particle.layer, particle.phase);
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
    14,
  );
  core.addColorStop(0, "rgba(255, 255, 247, 1)");
  core.addColorStop(0.24, "rgba(192, 232, 255, 0.95)");
  core.addColorStop(1, "rgba(90, 179, 244, 0)");
  context.globalAlpha = 1;
  context.fillStyle = core;
  context.beginPath();
  context.arc(geometry.hub.x - 1, geometry.hub.y + 1, 14, 0, Math.PI * 2);
  context.fill();

  const haze = context.createRadialGradient(
    geometry.hub.x + 3,
    geometry.hub.y - 2,
    0,
    geometry.hub.x + 3,
    geometry.hub.y - 2,
    24,
  );
  haze.addColorStop(0, "rgba(255, 201, 108, 0.4)");
  haze.addColorStop(0.35, "rgba(116, 194, 248, 0.2)");
  haze.addColorStop(1, "rgba(69, 155, 228, 0)");
  context.fillStyle = haze;
  context.beginPath();
  context.arc(geometry.hub.x + 3, geometry.hub.y - 2, 24, 0, Math.PI * 2);
  context.fill();
};

export const drawOrreryStreams2D = (
  context: CanvasRenderingContext2D,
  snapshot: OrreryRenderSnapshot,
  time: number,
  artifact: OrreryArtifact,
) => {
  context.clearRect(0, 0, snapshot.width, snapshot.height);
  if (!snapshot.geometry) return;

  context.save();
  context.globalCompositeOperation = "lighter";
  const shortEdge = Math.min(snapshot.width, snapshot.height);
  drawHub(context, snapshot.geometry, time, shortEdge);
  for (const stream of ["moon", "earth", "black-hole"] as const) {
    drawArm(context, snapshot.geometry, stream, time, artifact, shortEdge);
  }
  context.restore();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
};

const browserFrames = (): FrameDependencies => ({
  requestFrame: (callback) => window.requestAnimationFrame(callback),
  cancelFrame: (frame) => window.cancelAnimationFrame(frame),
  now: () => performance.now(),
});

export const createOrrery2DStreamController = (
  canvas: HTMLCanvasElement,
  dependencies: FrameDependencies = browserFrames(),
): OrreryStreamController | null => {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;

  let snapshot: OrreryRenderSnapshot = {
    geometry: null,
    width: 1,
    height: 1,
    dpr: 1,
  };
  let artifact: OrreryArtifact = "none";
  let running = false;
  let destroyed = false;
  let frame = 0;
  let lastFrame = 0;

  const draw = (time = dependencies.now()) => {
    if (destroyed) return;
    drawOrreryStreams2D(context, snapshot, time, artifact);
  };

  const tick = (time: number) => {
    if (destroyed || !running) return;
    if (time - lastFrame >= 1000 / 30) {
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
      const backingWidth = Math.max(1, Math.round(next.width * next.dpr));
      const backingHeight = Math.max(1, Math.round(next.height * next.dpr));
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      context.setTransform(next.dpr, 0, 0, next.dpr, 0, 0);
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
