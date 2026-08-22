import {
  sampleCubic,
  tangentCubic,
  type OrreryHubGeometry,
  type OrreryStream,
} from "./home-orrery-geometry.ts";

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

const palettes: Record<OrreryStream, readonly [string, string]> = {
  moon: ["rgba(246, 210, 139, 0.72)", "rgba(157, 218, 250, 0.72)"],
  earth: ["rgba(83, 181, 244, 0.78)", "rgba(207, 241, 255, 0.86)"],
  "black-hole": ["rgba(239, 142, 43, 0.76)", "rgba(126, 202, 241, 0.72)"],
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
) => {
  const path = geometry.paths[stream];
  const gradient = context.createLinearGradient(
    path.start.x,
    path.start.y,
    path.end.x,
    path.end.y,
  );
  gradient.addColorStop(0, palettes[stream][0]);
  gradient.addColorStop(1, palettes[stream][1]);
  const emphasis = emphasisFor(artifact, stream);

  context.beginPath();
  context.moveTo(path.start.x, path.start.y);
  context.bezierCurveTo(
    path.controlA.x,
    path.controlA.y,
    path.controlB.x,
    path.controlB.y,
    path.end.x,
    path.end.y,
  );
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = gradient;
  context.globalAlpha = 0.14 * emphasis;
  context.lineWidth = stream === "black-hole" ? 11 : stream === "moon" ? 8 : 7;
  context.stroke();

  context.beginPath();
  context.moveTo(path.start.x, path.start.y);
  context.bezierCurveTo(
    path.controlA.x,
    path.controlA.y,
    path.controlB.x,
    path.controlB.y,
    path.end.x,
    path.end.y,
  );
  context.strokeStyle = gradient;
  context.globalAlpha = 0.52 * emphasis;
  context.lineWidth = stream === "black-hole" ? 1.35 : 1;
  context.stroke();

  const particleCount = stream === "black-hole" ? 24 : 18;
  for (let index = 0; index < particleCount; index += 1) {
    const speed = stream === "earth" ? 0.000045 : 0.000032;
    const progress = (index / particleCount + time * speed) % 1;
    const point = sampleCubic(path, progress);
    const tangent = tangentCubic(path, progress);
    const tangentLength = Math.hypot(tangent.x, tangent.y) || 1;
    const wave = Math.sin(index * 8.71 + time * 0.0013) *
      (stream === "black-hole" ? 3.2 : 1.9);
    const x = point.x + (-tangent.y / tangentLength) * wave;
    const y = point.y + (tangent.x / tangentLength) * wave;
    context.beginPath();
    context.fillStyle = progress > 0.72 ? palettes.earth[1] : palettes[stream][0];
    context.globalAlpha = (0.2 + (index % 5) * 0.09) * emphasis;
    context.arc(x, y, 0.55 + (index % 4) * 0.3, 0, Math.PI * 2);
    context.fill();
  }
};

const drawHub = (
  context: CanvasRenderingContext2D,
  geometry: OrreryHubGeometry,
  time: number,
) => {
  const pulse = 1 + Math.sin(time / 780) * 0.06;
  const haloRadius = 15 * pulse;
  const halo = context.createRadialGradient(
    geometry.hub.x,
    geometry.hub.y,
    0,
    geometry.hub.x,
    geometry.hub.y,
    haloRadius,
  );
  halo.addColorStop(0, "rgba(232, 249, 255, 0.92)");
  halo.addColorStop(0.2, "rgba(137, 214, 255, 0.68)");
  halo.addColorStop(0.62, "rgba(100, 185, 235, 0.16)");
  halo.addColorStop(1, "rgba(220, 163, 67, 0)");
  context.globalAlpha = 1;
  context.fillStyle = halo;
  context.beginPath();
  context.arc(geometry.hub.x, geometry.hub.y, haloRadius, 0, Math.PI * 2);
  context.fill();

  const core = context.createRadialGradient(
    geometry.hub.x - 0.8,
    geometry.hub.y - 0.8,
    0,
    geometry.hub.x,
    geometry.hub.y,
    4.6,
  );
  core.addColorStop(0, "rgba(255, 255, 244, 1)");
  core.addColorStop(0.38, "rgba(188, 231, 255, 0.94)");
  core.addColorStop(1, "rgba(91, 174, 232, 0)");
  context.fillStyle = core;
  context.beginPath();
  context.arc(geometry.hub.x, geometry.hub.y, 4.6, 0, Math.PI * 2);
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
  for (const stream of ["moon", "earth", "black-hole"] as const) {
    drawArm(context, snapshot.geometry, stream, time, artifact);
  }
  drawHub(context, snapshot.geometry, time);
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
