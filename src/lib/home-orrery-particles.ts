export type OrreryArtifact = "none" | "document" | "repo" | "idea";
export type OrreryStream = "black-hole" | "moon";

type Point = { x: number; y: number };
type Color = [number, number, number];

const BLACK_HOLE: Point = { x: 0.225, y: 0.81 };
const MOON: Point = { x: 0.295, y: 0.205 };
const EARTH: Point = { x: 0.68, y: 0.37 };

const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress));

const cubicPoint = (
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
  progress: number,
): Point => {
  const t = clampProgress(progress);
  if (t === 0) return { ...start };
  if (t === 1) return { ...end };
  const inverse = 1 - t;
  const sample = (key: keyof Point) =>
    inverse ** 3 * start[key] +
    3 * inverse ** 2 * t * controlA[key] +
    3 * inverse * t ** 2 * controlB[key] +
    t ** 3 * end[key];
  return { x: sample("x"), y: sample("y") };
};

export const sampleBlackHoleToEarthPath = (progress: number): Point =>
  cubicPoint(
    BLACK_HOLE,
    { x: 0.035, y: 0.69 },
    { x: 0.31, y: 0.37 },
    EARTH,
    progress,
  );

export const sampleMoonToEarthPath = (progress: number): Point =>
  cubicPoint(
    MOON,
    { x: 0.43, y: 0.2 },
    { x: 0.57, y: 0.245 },
    EARTH,
    progress,
  );

const mixColor = (from: Color, to: Color, amount: number): Color =>
  from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  ) as Color;

export const sampleStreamColor = (
  stream: OrreryStream,
  progress: number,
): Color => {
  const t = clampProgress(progress);
  const gold: Color = [226, 165, 65];
  const pearl: Color = [232, 224, 203];
  const blue: Color = [112, 190, 238];
  return mixColor(stream === "black-hole" ? gold : pearl, blue, t);
};

export const particleCountForWidth = (width: number) =>
  width <= 760 ? 12 : 28;

export const baseStrandCountForWidth = (width: number) =>
  width <= 760
    ? { blackHole: 4, moon: 2 }
    : { blackHole: 7, moon: 4 };

export const streamDashPixelsPerSecond = (stream: OrreryStream) =>
  stream === "black-hole" ? 11 : 13;

type Particle = {
  stream: OrreryStream;
  phase: number;
  duration: number;
  radius: number;
  normalOffset: number;
  alpha: number;
};

export type OrreryParticleController = {
  setRunning: (running: boolean) => void;
  setActiveArtifact: (artifact: OrreryArtifact) => void;
  resize: () => void;
  destroy: () => void;
};

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const samplePath = (stream: OrreryStream, progress: number) =>
  stream === "black-hole"
    ? sampleBlackHoleToEarthPath(progress)
    : sampleMoonToEarthPath(progress);

export const createOrreryParticleController = (
  canvas: HTMLCanvasElement,
): OrreryParticleController => {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    return {
      setRunning: () => undefined,
      setActiveArtifact: () => undefined,
      resize: () => undefined,
      destroy: () => undefined,
    };
  }

  const random = seededRandom(1028);
  let width = 1;
  let height = 1;
  let dpr = 1;
  let particles: Particle[] = [];
  let running = false;
  let destroyed = false;
  let active: OrreryArtifact = "none";
  let frame = 0;
  let lastFrame = 0;
  let elapsed = 0;

  const makeParticles = () => {
    const count = particleCountForWidth(width);
    particles = Array.from({ length: count }, (_, index) => {
      const stream: OrreryStream = index < Math.ceil(count * 0.68)
        ? "black-hole"
        : "moon";
      return {
        stream,
        phase: random(),
        duration: (stream === "black-hole" ? 13 : 11) + random() * 8,
        radius: 0.6 + random() * 1.1,
        normalOffset:
          (random() - 0.5) *
          Math.min(width, height) *
          (stream === "black-hole" ? 0.025 : 0.012),
        alpha: 0.28 + random() * 0.48,
      };
    });
  };

  const emphasisFor = (
    artifact: OrreryArtifact,
    stream: OrreryStream,
    progress: number,
  ) => {
    if (artifact === "none") return 1;
    if (artifact === "idea") {
      return stream === "black-hole" && progress < 0.3 ? 1.45 : 0.78;
    }
    if (artifact === "document") {
      return stream === "moon" && progress < 0.38 ? 1.45 : 0.78;
    }
    return progress > 0.67 ? 1.4 : 0.8;
  };

  const strokePath = (
    stream: OrreryStream,
    normalOffset: number,
    alpha: number,
    lineWidth: number,
  ) => {
    context.beginPath();
    for (let step = 0; step <= 96; step += 1) {
      const progress = step / 96;
      const point = samplePath(stream, progress);
      const before = samplePath(stream, Math.max(0, progress - 0.003));
      const after = samplePath(stream, Math.min(1, progress + 0.003));
      const tangentX = (after.x - before.x) * width;
      const tangentY = (after.y - before.y) * height;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const taper = Math.sin(progress * Math.PI) * 0.72 + 0.28;
      const x = point.x * width + (-tangentY / tangentLength) * normalOffset * taper;
      const y = point.y * height + (tangentX / tangentLength) * normalOffset * taper;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    const start = stream === "black-hole" ? "226, 165, 65" : "232, 224, 203";
    context.strokeStyle = `rgba(${start}, ${alpha})`;
    context.lineWidth = lineWidth;
    context.stroke();
  };

  const drawBaseCurrents = () => {
    const strands = baseStrandCountForWidth(width);
    for (const [stream, count] of [
      ["black-hole", strands.blackHole],
      ["moon", strands.moon],
    ] as const) {
      const spread = Math.min(width, height) * (stream === "black-hole" ? 0.006 : 0.0032);
      for (let strand = 0; strand < count; strand += 1) {
        const offset = (strand - (count - 1) / 2) * spread;
        context.setLineDash(strand % 2 === 0 ? [0.8, 5.2] : [1.2, 7]);
        context.lineDashOffset =
          -(elapsed / 1000) * streamDashPixelsPerSecond(stream) + strand * 2.1;
        strokePath(stream, offset, stream === "black-hole" ? 0.19 : 0.16, strand === 0 ? 0.9 : 0.58);
      }
    }
    context.setLineDash([]);
  };

  const draw = (time: number) => {
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "lighter";
    drawBaseCurrents();

    for (const particle of particles) {
      const progress = (particle.phase + elapsed / (particle.duration * 1000)) % 1;
      const point = samplePath(particle.stream, progress);
      const before = samplePath(particle.stream, Math.max(0, progress - 0.002));
      const after = samplePath(particle.stream, Math.min(1, progress + 0.002));
      const tangentX = (after.x - before.x) * width;
      const tangentY = (after.y - before.y) * height;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const jitter = Math.sin(progress * Math.PI * 13 + particle.phase * 8) * 1.35;
      const normal = particle.normalOffset + jitter;
      const x = point.x * width + (-tangentY / tangentLength) * normal;
      const y = point.y * height + (tangentX / tangentLength) * normal;
      const [red, green, blue] = sampleStreamColor(particle.stream, progress);
      const pulse = 0.72 + Math.sin(time / 760 + particle.phase * 9) * 0.2;
      const emphasis = emphasisFor(active, particle.stream, progress);
      const tail = samplePath(particle.stream, Math.max(0, progress - 0.009));

      context.beginPath();
      context.moveTo(tail.x * width, tail.y * height);
      context.lineTo(x, y);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(0.36, particle.alpha * pulse * emphasis * 0.38)})`;
      context.lineWidth = Math.max(0.5, particle.radius * 0.72);
      context.stroke();

      context.beginPath();
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(0.88, particle.alpha * pulse * emphasis)})`;
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  };

  const tick = (time: number) => {
    if (!running || destroyed) return;
    if (time - lastFrame >= 1000 / 30) {
      elapsed += lastFrame === 0 ? 0 : time - lastFrame;
      lastFrame = time;
      draw(time);
    }
    frame = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
    draw(performance.now());
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  return {
    setRunning(next) {
      if (destroyed || running === next) return;
      running = next;
      if (running) {
        lastFrame = 0;
        frame = window.requestAnimationFrame(tick);
      } else {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    setActiveArtifact(artifact) {
      active = artifact;
      if (!running) draw(performance.now());
    },
    resize,
    destroy() {
      destroyed = true;
      running = false;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      context.clearRect(0, 0, width, height);
    },
  };
};
