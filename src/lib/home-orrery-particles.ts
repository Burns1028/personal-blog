export type OrreryArtifact = "none" | "document" | "repo" | "idea";

type Point = { x: number; y: number };
type Color = [number, number, number];

const START: Point = { x: 0.225, y: 0.81 };
const MOON: Point = { x: 0.295, y: 0.205 };
const END: Point = { x: 0.68, y: 0.37 };

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
  const inverse = 1 - t;
  return (
    inverse ** 3 * a +
    3 * inverse ** 2 * t * b +
    3 * inverse * t ** 2 * c +
    t ** 3 * d
  );
};

export const sampleOrreryPath = (progress: number): Point => {
  const t = Math.min(1, Math.max(0, progress));
  if (t === 0) return { ...START };
  if (t === 1) return { ...END };

  if (t <= 0.5) {
    const local = t * 2;
    return {
      x: cubic(START.x, 0.08, 0.12, MOON.x, local),
      y: cubic(START.y, 0.67, 0.39, MOON.y, local),
    };
  }

  const local = (t - 0.5) * 2;
  return {
    x: cubic(MOON.x, 0.43, 0.56, END.x, local),
    y: cubic(MOON.y, 0.18, 0.3, END.y, local),
  };
};

const mixColor = (from: Color, to: Color, amount: number): Color =>
  from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * amount),
  ) as Color;

export const sampleOrreryColor = (progress: number): Color => {
  const t = Math.min(1, Math.max(0, progress));
  const gold: Color = [226, 165, 65];
  const pearl: Color = [232, 224, 203];
  const blue: Color = [112, 190, 238];
  return t <= 0.5
    ? mixColor(gold, pearl, t * 2)
    : mixColor(pearl, blue, (t - 0.5) * 2);
};

export const particleCountForWidth = (width: number) =>
  width <= 760 ? 12 : 28;

type Particle = {
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
    particles = Array.from({ length: particleCountForWidth(width) }, () => ({
      phase: random(),
      duration: 14 + random() * 8,
      radius: 0.7 + random() * 1.25,
      normalOffset: (random() - 0.5) * Math.min(width, height) * 0.017,
      alpha: 0.34 + random() * 0.52,
    }));
  };

  const segmentEmphasis = (artifact: OrreryArtifact, progress: number) => {
    if (artifact === "none") return 1;
    if (artifact === "idea") return progress < 0.34 ? 1.42 : 0.78;
    if (artifact === "document") return progress >= 0.3 && progress <= 0.68 ? 1.42 : 0.78;
    return progress > 0.64 ? 1.42 : 0.78;
  };

  const draw = (time: number) => {
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "lighter";

    for (const particle of particles) {
      const progress = (particle.phase + elapsed / (particle.duration * 1000)) % 1;
      const point = sampleOrreryPath(progress);
      const before = sampleOrreryPath(Math.max(0, progress - 0.002));
      const after = sampleOrreryPath(Math.min(1, progress + 0.002));
      const tangentX = (after.x - before.x) * width;
      const tangentY = (after.y - before.y) * height;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const jitter = Math.sin(progress * Math.PI * 13 + particle.phase * 8) * 1.8;
      const normal = particle.normalOffset + jitter;
      const x = point.x * width + (-tangentY / tangentLength) * normal;
      const y = point.y * height + (tangentX / tangentLength) * normal;
      const [red, green, blue] = sampleOrreryColor(progress);
      const pulse = 0.7 + Math.sin(time / 760 + particle.phase * 9) * 0.22;
      const emphasis = segmentEmphasis(active, progress);

      const tail = sampleOrreryPath(Math.max(0, progress - 0.008));
      context.beginPath();
      context.moveTo(tail.x * width, tail.y * height);
      context.lineTo(x, y);
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(0.46, particle.alpha * pulse * emphasis * 0.44)})`;
      context.lineWidth = Math.max(0.55, particle.radius * 0.78);
      context.stroke();

      context.beginPath();
      context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(0.96, particle.alpha * pulse * emphasis)})`;
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
