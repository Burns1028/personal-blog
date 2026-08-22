export type OrreryArtifact = "none" | "document" | "repo" | "idea";
export type OrreryStream = "black-hole" | "moon";

export type Point = { x: number; y: number };
export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export type OrreryAnchorPoints = {
  moon: Point;
  earth: Point;
  blackHole: Point;
};
export type CubicPath = {
  start: Point;
  controlA: Point;
  controlB: Point;
  end: Point;
};
export type OrreryPathGeometry = Record<OrreryStream, CubicPath>;
export type OrreryParticleAtlasRole = "gold" | "pearl" | "transition" | "blue";
export type OrreryParticleAtlasSources = Readonly<
  Record<
    OrreryParticleAtlasRole,
    { readonly standard: string; readonly retina: string }
  >
>;
export type OrreryParticleStamp = {
  stream: OrreryStream;
  role: OrreryParticleAtlasRole;
  progress: number;
  center: Point;
  angle: number;
  width: number;
  alpha: number;
};
export type AffineTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};
type Color = [number, number, number];

const CONNECTION_BASE_ANCHORS: OrreryAnchorPoints = {
  moon: { x: 0.295 * 881, y: 0.205 * 732 },
  earth: { x: 0.68 * 881, y: 0.37 * 732 },
  blackHole: { x: 0.225 * 881, y: 0.81 * 732 },
};

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

export const pointRelativeToRect = (
  pointRect: RectLike,
  stageRect: RectLike,
): Point => ({
  x: pointRect.left + pointRect.width / 2 - stageRect.left,
  y: pointRect.top + pointRect.height / 2 - stageRect.top,
});

export const isUsableAnchorRect = (rect: RectLike) =>
  rect.width > 0 &&
  rect.height > 0 &&
  [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite);

export const createAffineTransform = (
  source: OrreryAnchorPoints,
  target: OrreryAnchorPoints,
): AffineTransform | null => {
  const stableTriangleDeterminant = (
    anchors: OrreryAnchorPoints,
  ): number | null => {
    const moonToEarth = {
      x: anchors.earth.x - anchors.moon.x,
      y: anchors.earth.y - anchors.moon.y,
    };
    const moonToBlackHole = {
      x: anchors.blackHole.x - anchors.moon.x,
      y: anchors.blackHole.y - anchors.moon.y,
    };
    const earthToBlackHole = {
      x: anchors.blackHole.x - anchors.earth.x,
      y: anchors.blackHole.y - anchors.earth.y,
    };
    const determinant =
      moonToEarth.x * moonToBlackHole.y -
      moonToBlackHole.x * moonToEarth.y;
    const maximumEdgeSquared = Math.max(
      moonToEarth.x ** 2 + moonToEarth.y ** 2,
      moonToBlackHole.x ** 2 + moonToBlackHole.y ** 2,
      earthToBlackHole.x ** 2 + earthToBlackHole.y ** 2,
    );

    if (
      !Number.isFinite(determinant) ||
      !Number.isFinite(maximumEdgeSquared) ||
      maximumEdgeSquared <= 0 ||
      Math.abs(determinant) <= maximumEdgeSquared * 1e-4
    ) {
      return null;
    }

    return determinant;
  };

  const sourceDeterminant = stableTriangleDeterminant(source);
  if (sourceDeterminant === null || stableTriangleDeterminant(target) === null) {
    return null;
  }

  const sourceMoonToEarth = {
    x: source.earth.x - source.moon.x,
    y: source.earth.y - source.moon.y,
  };
  const sourceMoonToBlackHole = {
    x: source.blackHole.x - source.moon.x,
    y: source.blackHole.y - source.moon.y,
  };
  const targetMoonToEarth = {
    x: target.earth.x - target.moon.x,
    y: target.earth.y - target.moon.y,
  };
  const targetMoonToBlackHole = {
    x: target.blackHole.x - target.moon.x,
    y: target.blackHole.y - target.moon.y,
  };
  const a =
    (targetMoonToEarth.x * sourceMoonToBlackHole.y -
      targetMoonToBlackHole.x * sourceMoonToEarth.y) /
    sourceDeterminant;
  const c =
    (-targetMoonToEarth.x * sourceMoonToBlackHole.x +
      targetMoonToBlackHole.x * sourceMoonToEarth.x) /
    sourceDeterminant;
  const b =
    (targetMoonToEarth.y * sourceMoonToBlackHole.y -
      targetMoonToBlackHole.y * sourceMoonToEarth.y) /
    sourceDeterminant;
  const d =
    (-targetMoonToEarth.y * sourceMoonToBlackHole.x +
      targetMoonToBlackHole.y * sourceMoonToEarth.x) /
    sourceDeterminant;
  const e = target.moon.x - a * source.moon.x - c * source.moon.y;
  const f = target.moon.y - b * source.moon.x - d * source.moon.y;
  const transform = { a, b, c, d, e, f };
  return Object.values(transform).every(Number.isFinite) ? transform : null;
};

export const mapPointWithAffine = (
  point: Point,
  transform: AffineTransform,
): Point => ({
  x: transform.a * point.x + transform.c * point.y + transform.e,
  y: transform.b * point.x + transform.d * point.y + transform.f,
});

export const createOrreryPathGeometry = (
  anchors: OrreryAnchorPoints,
  viewport: { width: number; height: number },
): OrreryPathGeometry => {
  const moonDelta = {
    x: anchors.earth.x - anchors.moon.x,
    y: anchors.earth.y - anchors.moon.y,
  };
  const blackHoleDelta = {
    x: anchors.earth.x - anchors.blackHole.x,
    y: anchors.earth.y - anchors.blackHole.y,
  };

  return {
    moon: {
      start: { ...anchors.moon },
      controlA: {
        x: anchors.moon.x + moonDelta.x * 0.35,
        y: anchors.moon.y + moonDelta.y * -0.05,
      },
      controlB: {
        x: anchors.moon.x + moonDelta.x * 0.72,
        y: anchors.moon.y + moonDelta.y * 0.24,
      },
      end: { ...anchors.earth },
    },
    "black-hole": {
      start: { ...anchors.blackHole },
      controlA: {
        x: Math.max(
          viewport.width * 0.02,
          anchors.blackHole.x - blackHoleDelta.x * 0.42,
        ),
        y: anchors.blackHole.y + blackHoleDelta.y * 0.28,
      },
      controlB: {
        x: anchors.blackHole.x + blackHoleDelta.x * 0.2,
        y: anchors.earth.y,
      },
      end: { ...anchors.earth },
    },
  };
};

export const sampleOrreryPath = (
  geometry: OrreryPathGeometry,
  stream: OrreryStream,
  progress: number,
): Point => {
  const path = geometry[stream];
  return cubicPoint(
    path.start,
    path.controlA,
    path.controlB,
    path.end,
    progress,
  );
};

type ParticleStampTemplate = Pick<
  OrreryParticleStamp,
  "stream" | "role" | "progress" | "alpha"
> & { widthRatio: number };

const PARTICLE_STAMP_TEMPLATES: readonly ParticleStampTemplate[] = [
  { stream: "black-hole", role: "gold", progress: 0.08, widthRatio: 0.15, alpha: 0.62 },
  { stream: "black-hole", role: "gold", progress: 0.2, widthRatio: 0.18, alpha: 0.56 },
  { stream: "black-hole", role: "transition", progress: 0.38, widthRatio: 0.19, alpha: 0.42 },
  { stream: "black-hole", role: "transition", progress: 0.58, widthRatio: 0.18, alpha: 0.38 },
  { stream: "black-hole", role: "blue", progress: 0.79, widthRatio: 0.16, alpha: 0.46 },
  { stream: "black-hole", role: "blue", progress: 0.93, widthRatio: 0.14, alpha: 0.54 },
  { stream: "moon", role: "pearl", progress: 0.1, widthRatio: 0.12, alpha: 0.5 },
  { stream: "moon", role: "pearl", progress: 0.28, widthRatio: 0.13, alpha: 0.44 },
  { stream: "moon", role: "transition", progress: 0.5, widthRatio: 0.14, alpha: 0.34 },
  { stream: "moon", role: "blue", progress: 0.8, widthRatio: 0.14, alpha: 0.42 },
  { stream: "moon", role: "blue", progress: 0.93, widthRatio: 0.13, alpha: 0.5 },
];

export const createParticleStampLayout = (
  geometry: OrreryPathGeometry,
  viewport: { width: number; height: number },
): OrreryParticleStamp[] => {
  const localScale = Math.max(1, Math.min(viewport.width, viewport.height));
  return PARTICLE_STAMP_TEMPLATES.map((template) => {
    const before = sampleOrreryPath(
      geometry,
      template.stream,
      template.progress - 0.003,
    );
    const after = sampleOrreryPath(
      geometry,
      template.stream,
      template.progress + 0.003,
    );
    return {
      stream: template.stream,
      role: template.role,
      progress: template.progress,
      center: sampleOrreryPath(geometry, template.stream, template.progress),
      angle: Math.atan2(after.y - before.y, after.x - before.x),
      width: Math.min(82, Math.max(24, localScale * template.widthRatio)),
      alpha: template.alpha,
    };
  });
};

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
  normalOffsetRatio: number;
  alpha: number;
};

export type OrreryParticleController = {
  setRunning: (running: boolean) => void;
  setActiveArtifact: (artifact: OrreryArtifact) => void;
  resize: () => void;
  destroy: () => void;
};

export type OrreryAnchorElements = {
  moon: HTMLElement;
  earth: HTMLElement;
  blackHole: HTMLElement;
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
  anchorElements: OrreryAnchorElements,
  connectionBase: HTMLElement,
  particleAtlasSources?: OrreryParticleAtlasSources,
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
  let resizeFrame = 0;
  let elapsed = 0;
  let geometry: OrreryPathGeometry | null = null;
  const atlasImages: Partial<Record<OrreryParticleAtlasRole, HTMLImageElement>> = {};

  const samplePath = (stream: OrreryStream, progress: number) => {
    if (!geometry) return { x: 0, y: 0 };
    return sampleOrreryPath(geometry, stream, progress);
  };

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
        normalOffsetRatio:
          (random() - 0.5) * (stream === "black-hole" ? 0.025 : 0.012),
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
    strokeStyle: string | CanvasGradient,
    lineWidth: number,
  ) => {
    context.beginPath();
    for (let step = 0; step <= 96; step += 1) {
      const progress = step / 96;
      const point = samplePath(stream, progress);
      const before = samplePath(stream, Math.max(0, progress - 0.003));
      const after = samplePath(stream, Math.min(1, progress + 0.003));
      const tangentX = after.x - before.x;
      const tangentY = after.y - before.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const taper = Math.sin(progress * Math.PI) * 0.72 + 0.28;
      const x = point.x + (-tangentY / tangentLength) * normalOffset * taper;
      const y = point.y + (tangentX / tangentLength) * normalOffset * taper;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  };

  const streamGradient = (
    stream: OrreryStream,
    startAlpha: number,
    endAlpha = startAlpha,
  ) => {
    const start = samplePath(stream, 0);
    const end = samplePath(stream, 1);
    const gradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
    const [startRed, startGreen, startBlue] = sampleStreamColor(stream, 0);
    const [endRed, endGreen, endBlue] = sampleStreamColor(stream, 1);
    gradient.addColorStop(
      0,
      `rgba(${startRed}, ${startGreen}, ${startBlue}, ${startAlpha})`,
    );
    gradient.addColorStop(
      1,
      `rgba(${endRed}, ${endGreen}, ${endBlue}, ${endAlpha})`,
    );
    return gradient;
  };

  const drawConnectionGlow = () => {
    for (const stream of ["black-hole", "moon"] as const) {
      context.setLineDash([]);
      strokePath(
        stream,
        0,
        streamGradient(stream, 0.045, 0.055),
        stream === "black-hole" ? 13 : 8,
      );
      strokePath(
        stream,
        0,
        streamGradient(stream, 0.2, 0.16),
        stream === "black-hole" ? 1.35 : 1,
      );
    }
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
        strokePath(
          stream,
          offset,
          streamGradient(
            stream,
            stream === "black-hole" ? 0.19 : 0.16,
            0.13,
          ),
          strand === 0 ? 0.9 : 0.58,
        );
      }
    }
    context.setLineDash([]);
  };

  const drawParticleAtlas = () => {
    if (!geometry) return;
    for (const stamp of createParticleStampLayout(geometry, { width, height })) {
      const image = atlasImages[stamp.role];
      if (!image?.naturalWidth || !image.naturalHeight) continue;
      const stampHeight = stamp.width * (image.naturalHeight / image.naturalWidth);
      context.save();
      context.translate(stamp.center.x, stamp.center.y);
      context.rotate(stamp.angle);
      context.globalAlpha = Math.min(
        1,
        stamp.alpha * 1.2 * emphasisFor(active, stamp.stream, stamp.progress),
      );
      context.drawImage(
        image,
        -stamp.width / 2,
        -stampHeight / 2,
        stamp.width,
        stampHeight,
      );
      context.restore();
    }
  };

  const draw = (time: number) => {
    context.clearRect(0, 0, width, height);
    if (!geometry) return;
    context.save();
    context.globalCompositeOperation = "lighter";
    drawConnectionGlow();
    drawBaseCurrents();
    drawParticleAtlas();

    for (const particle of particles) {
      const progress = (particle.phase + elapsed / (particle.duration * 1000)) % 1;
      const point = samplePath(particle.stream, progress);
      const before = samplePath(particle.stream, Math.max(0, progress - 0.002));
      const after = samplePath(particle.stream, Math.min(1, progress + 0.002));
      const tangentX = after.x - before.x;
      const tangentY = after.y - before.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const jitter = Math.sin(progress * Math.PI * 13 + particle.phase * 8) * 1.35;
      const normal =
        particle.normalOffsetRatio * Math.min(width, height) + jitter;
      const x = point.x + (-tangentY / tangentLength) * normal;
      const y = point.y + (tangentX / tangentLength) * normal;
      const [red, green, blue] = sampleStreamColor(particle.stream, progress);
      const pulse = 0.72 + Math.sin(time / 760 + particle.phase * 9) * 0.2;
      const emphasis = emphasisFor(active, particle.stream, progress);
      const tail = samplePath(particle.stream, Math.max(0, progress - 0.009));

      context.beginPath();
      context.moveTo(tail.x, tail.y);
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

  const loadParticleAtlas = () => {
    if (!particleAtlasSources) return;
    const sourceKey = window.devicePixelRatio > 1.25 ? "retina" : "standard";
    for (const role of Object.keys(
      particleAtlasSources,
    ) as OrreryParticleAtlasRole[]) {
      const image = new Image();
      image.decoding = "async";
      image.src = particleAtlasSources[role][sourceKey];
      void image
        .decode()
        .then(() => {
          if (destroyed) return;
          atlasImages[role] = image;
          draw(performance.now());
        })
        .catch(() => undefined);
    }
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const anchorRects = {
      moon: anchorElements.moon.getBoundingClientRect(),
      earth: anchorElements.earth.getBoundingClientRect(),
      blackHole: anchorElements.blackHole.getBoundingClientRect(),
    };
    if (
      !isUsableAnchorRect(bounds) ||
      !Object.values(anchorRects).every(isUsableAnchorRect)
    ) {
      geometry = null;
      connectionBase.style.visibility = "hidden";
      context.clearRect(0, 0, width, height);
      return;
    }
    const nextWidth = Math.max(1, bounds.width);
    const nextHeight = Math.max(1, bounds.height);
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    const backingStoreChanged =
      width !== nextWidth || height !== nextHeight || dpr !== nextDpr;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    if (backingStoreChanged) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const anchors = {
      moon: pointRelativeToRect(anchorRects.moon, bounds),
      earth: pointRelativeToRect(anchorRects.earth, bounds),
      blackHole: pointRelativeToRect(anchorRects.blackHole, bounds),
    };
    const connectionTransform = createAffineTransform(
      CONNECTION_BASE_ANCHORS,
      anchors,
    );
    if (!connectionTransform) {
      geometry = null;
      connectionBase.style.visibility = "hidden";
      context.clearRect(0, 0, width, height);
      return;
    }
    geometry = createOrreryPathGeometry(anchors, { width, height });
    const { a, b, c, d, e, f } = connectionTransform;
    connectionBase.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
    connectionBase.style.visibility = "visible";
    const nextParticleCount = particleCountForWidth(width);
    if (particles.length !== nextParticleCount) makeParticles();
    draw(performance.now());
  };

  const scheduleResize = () => {
    if (destroyed || resizeFrame !== 0) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  };

  const resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(canvas);
  Object.values(anchorElements).forEach((anchor) =>
    resizeObserver.observe(anchor),
  );
  window.addEventListener("resize", scheduleResize, { passive: true });
  void document.fonts?.ready.then(() => {
    scheduleResize();
  });
  loadParticleAtlas();
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
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleResize);
      connectionBase.style.visibility = "hidden";
      context.clearRect(0, 0, width, height);
    },
  };
};
