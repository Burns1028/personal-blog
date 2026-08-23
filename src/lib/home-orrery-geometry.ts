export type Point = { x: number; y: number };

export type Ellipse = Point & {
  rx: number;
  ry: number;
};

export type CubicPath = {
  start: Point;
  controlA: Point;
  controlB: Point;
  end: Point;
};

export type OrreryBodies = {
  moon: Ellipse;
  earth: Ellipse;
  blackHole: Ellipse;
};

export type OrreryStream = "moon" | "earth" | "black-hole";

export type OrreryStreamOrigins = {
  earth?: Point;
};

export type OrreryHubGeometry = {
  hub: Point;
  bodies: OrreryBodies;
  paths: Record<OrreryStream, CubicPath>;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const finitePoint = (point: Point) =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

const usableEllipse = (ellipse: Ellipse) =>
  finitePoint(ellipse) &&
  Number.isFinite(ellipse.rx) &&
  Number.isFinite(ellipse.ry) &&
  ellipse.rx > 0 &&
  ellipse.ry > 0;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const ellipseEquation = (ellipse: Ellipse, point: Point) =>
  ((point.x - ellipse.x) / ellipse.rx) ** 2 +
  ((point.y - ellipse.y) / ellipse.ry) ** 2;

export const pointInsideEllipse = (ellipse: Ellipse, point: Point) =>
  ellipseEquation(ellipse, point) < 1;

export const ellipseBoundaryToward = (
  ellipse: Ellipse,
  target: Point,
): Point => {
  const dx = target.x - ellipse.x;
  const dy = target.y - ellipse.y;
  const denominator = Math.sqrt(
    (dx * dx) / (ellipse.rx * ellipse.rx) +
      (dy * dy) / (ellipse.ry * ellipse.ry),
  );
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return { x: Number.NaN, y: Number.NaN };
  }
  return {
    x: ellipse.x + dx / denominator,
    y: ellipse.y + dy / denominator,
  };
};

const ellipseTangentPointToward = (
  ellipse: Ellipse,
  target: Point,
): Point => {
  const targetX = (target.x - ellipse.x) / ellipse.rx;
  const targetY = (target.y - ellipse.y) / ellipse.ry;
  const distanceSquared = targetX ** 2 + targetY ** 2;
  if (!Number.isFinite(distanceSquared) || distanceSquared <= 1) {
    return { x: Number.NaN, y: Number.NaN };
  }

  const tangentScale = Math.sqrt(distanceSquared - 1) / distanceSquared;
  const radialScale = 1 / distanceSquared;
  const candidates = [1, -1].map((direction) => ({
    x:
      ellipse.x +
      ellipse.rx *
        (targetX * radialScale - direction * targetY * tangentScale),
    y:
      ellipse.y +
      ellipse.ry *
        (targetY * radialScale + direction * targetX * tangentScale),
  }));

  const rightUpCandidates = candidates.filter(
    (point) => target.x > point.x && target.y < point.y,
  );
  const available = rightUpCandidates.length > 0 ? rightUpCandidates : candidates;
  return available.reduce((rightmost, point) =>
    point.x > rightmost.x ? point : rightmost,
  );
};

export const sampleCubic = (path: CubicPath, progress: number): Point => {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * path.start.x +
      3 * inverse ** 2 * t * path.controlA.x +
      3 * inverse * t ** 2 * path.controlB.x +
      t ** 3 * path.end.x,
    y:
      inverse ** 3 * path.start.y +
      3 * inverse ** 2 * t * path.controlA.y +
      3 * inverse * t ** 2 * path.controlB.y +
      t ** 3 * path.end.y,
  };
};

export const tangentCubic = (path: CubicPath, progress: number): Point => {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  return {
    x:
      3 * inverse ** 2 * (path.controlA.x - path.start.x) +
      6 * inverse * t * (path.controlB.x - path.controlA.x) +
      3 * t ** 2 * (path.end.x - path.controlB.x),
    y:
      3 * inverse ** 2 * (path.controlA.y - path.start.y) +
      6 * inverse * t * (path.controlB.y - path.controlA.y) +
      3 * t ** 2 * (path.end.y - path.controlB.y),
  };
};

const curvedPath = (
  start: Point,
  end: Point,
  bendRatio: number,
): CubicPath => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  return {
    start,
    controlA: {
      x: start.x + dx * 0.31 + normal.x * length * bendRatio,
      y: start.y + dy * 0.31 + normal.y * length * bendRatio,
    },
    controlB: {
      x: start.x + dx * 0.74 + normal.x * length * bendRatio * 0.38,
      y: start.y + dy * 0.74 + normal.y * length * bendRatio * 0.38,
    },
    end,
  };
};

const tangentEarthPath = (
  earth: Ellipse,
  start: Point,
  hub: Point,
): CubicPath => {
  const normal = {
    x: (start.x - earth.x) / earth.rx ** 2,
    y: (start.y - earth.y) / earth.ry ** 2,
  };
  const tangentA = { x: -normal.y, y: normal.x };
  const towardHub = { x: hub.x - start.x, y: hub.y - start.y };
  const tangent =
    tangentA.x * towardHub.x + tangentA.y * towardHub.y >= 0
      ? tangentA
      : { x: -tangentA.x, y: -tangentA.y };
  const tangentLength = Math.hypot(tangent.x, tangent.y);
  const chordLength = Math.hypot(towardHub.x, towardHub.y);
  const direction = {
    x: tangent.x / tangentLength,
    y: tangent.y / tangentLength,
  };
  return {
    start,
    controlA: {
      x: start.x + direction.x * chordLength * 0.38,
      y: start.y + direction.y * chordLength * 0.38,
    },
    controlB: {
      x: start.x + towardHub.x * 0.74,
      y: start.y + towardHub.y * 0.74,
    },
    end: hub,
  };
};

const blackHolePath = (start: Point, hub: Point): CubicPath => {
  const dx = hub.x - start.x;
  const dy = hub.y - start.y;
  const length = Math.hypot(dx, dy);
  return {
    start,
    controlA: {
      x: start.x + dx * 0.24,
      y: start.y + dy * 0.24,
    },
    controlB: {
      x: hub.x - dx * 0.24,
      y: hub.y + length * 0.05,
    },
    end: hub,
  };
};

const pathWithinStage = (
  path: CubicPath,
  stage: { width: number; height: number },
) => {
  for (let step = 0; step <= 48; step += 1) {
    const point = sampleCubic(path, step / 48);
    if (
      !finitePoint(point) ||
      point.x < -2 ||
      point.y < -2 ||
      point.x > stage.width + 2 ||
      point.y > stage.height + 2
    ) {
      return false;
    }
  }
  return true;
};

export const createOrreryHubGeometry = (
  bodies: OrreryBodies,
  stage: { width: number; height: number },
  origins: OrreryStreamOrigins = {},
): OrreryHubGeometry | null => {
  if (
    !Number.isFinite(stage.width) ||
    !Number.isFinite(stage.height) ||
    stage.width <= 0 ||
    stage.height <= 0 ||
    !Object.values(bodies).every(usableEllipse)
  ) {
    return null;
  }

  const bodyList = [bodies.moon, bodies.earth, bodies.blackHole];
  for (let first = 0; first < bodyList.length; first += 1) {
    for (let second = first + 1; second < bodyList.length; second += 1) {
      if (
        distance(bodyList[first], bodyList[second]) <=
        Math.min(bodyList[first].rx, bodyList[second].rx) * 0.25
      ) {
        return null;
      }
    }
  }

  const narrowFactor = clamp((900 - stage.width) / 580, 0, 1);
  const earthOffset = 1.35 + narrowFactor * 0.2;
  const margin = Math.max(4, Math.min(stage.width, stage.height) * 0.01);
  const hub: Point = {
    x: clamp(
      bodies.earth.x - bodies.earth.rx * earthOffset,
      margin,
      stage.width - margin,
    ),
    y: clamp(
      bodies.moon.y * 0.3 +
        bodies.earth.y * 0.36 +
        bodies.blackHole.y * 0.34,
      margin,
      stage.height - margin,
    ),
  };

  if (bodyList.some((body) => pointInsideEllipse(body, hub))) return null;

  const moonStart = ellipseBoundaryToward(bodies.moon, hub);
  const earthStart = origins.earth ?? ellipseBoundaryToward(bodies.earth, hub);
  const blackHoleStart = ellipseTangentPointToward(bodies.blackHole, hub);
  if (![moonStart, earthStart, blackHoleStart].every(finitePoint)) return null;
  if (origins.earth && Math.abs(ellipseEquation(bodies.earth, earthStart) - 1) > 0.04) {
    return null;
  }
  if (distance(earthStart, hub) < bodies.earth.rx * 0.25) return null;

  const paths: OrreryHubGeometry["paths"] = {
    moon: curvedPath(moonStart, hub, 0.075),
    earth: origins.earth
      ? tangentEarthPath(bodies.earth, earthStart, hub)
      : curvedPath(earthStart, hub, -0.025),
    "black-hole": blackHolePath(blackHoleStart, hub),
  };

  if (!Object.values(paths).every((path) => pathWithinStage(path, stage))) {
    return null;
  }

  return { hub, bodies, paths };
};
