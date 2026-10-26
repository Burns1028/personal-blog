export interface OrbitBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

export const GRAVITY = 0.7;
export const SOFTENING = 0.22;
// A weak external potential keeps this decorative simulation bound.
export const CONFINEMENT = 0.16;

export function createThreeBodies(): OrbitBody[] {
  const bodies = [
    { x: -0.62, y: -0.45, vx: 0.28, vy: -0.38, mass: 0.85 },
    { x: 0.65, y: -0.03, vx: 0.02, vy: 0.34, mass: 1.25 },
    { x: -0.42, y: 0.6, vx: -0.4, vy: -0.1, mass: 1 },
  ];
  const mass = bodies.reduce((sum, body) => sum + body.mass, 0);
  for (const key of ["x", "y", "vx", "vy"] as const) {
    const center = bodies.reduce((sum, body) => sum + body[key] * body.mass, 0) / mass;
    for (const body of bodies) body[key] -= center;
  }
  return bodies;
}

function accelerations(bodies: OrbitBody[]) {
  const result = bodies.map(body => ({ x: -CONFINEMENT * body.x, y: -CONFINEMENT * body.y }));
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const force = GRAVITY / (dx * dx + dy * dy + SOFTENING ** 2) ** 1.5;
      result[i].x += force * bodies[j].mass * dx;
      result[i].y += force * bodies[j].mass * dy;
      result[j].x -= force * bodies[i].mass * dx;
      result[j].y -= force * bodies[i].mass * dy;
    }
  }
  return result;
}

/** Velocity Verlet preserves the character of close encounters without Euler drift. */
export function stepThreeBodies(bodies: OrbitBody[], dt: number): void {
  const before = accelerations(bodies);
  bodies.forEach((body, i) => {
    body.x += body.vx * dt + before[i].x * dt * dt / 2;
    body.y += body.vy * dt + before[i].y * dt * dt / 2;
  });
  const after = accelerations(bodies);
  bodies.forEach((body, i) => {
    body.vx += (before[i].x + after[i].x) * dt / 2;
    body.vy += (before[i].y + after[i].y) * dt / 2;
  });
}

/** Fit one camera to every planet's full extent; never clamp planets independently. */
export function projectThreeBodies(bodies: OrbitBody[], width: number, height: number, radii: number[]) {
  const gutter = 8;
  let scale = Math.min(width, height) * 0.46;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const margin = radii[i] + radii[j] + gutter * 2;
      const dx = Math.abs(bodies[i].x - bodies[j].x);
      const dy = Math.abs(bodies[i].y - bodies[j].y);
      if (dx > 0) scale = Math.min(scale, (width - margin) / dx);
      if (dy > 0) scale = Math.min(scale, (height - margin) / dy);
    }
  }
  scale = Math.max(0, scale);
  const offset = (axis: "x" | "y", size: number) => {
    const low = Math.max(...bodies.map((body, i) => gutter + radii[i] - body[axis] * scale));
    const high = Math.min(...bodies.map((body, i) => size - gutter - radii[i] - body[axis] * scale));
    return Math.max(low, Math.min(high, size / 2));
  };
  const x = offset("x", width);
  const y = offset("y", height);
  return bodies.map(body => ({ x: x + body.x * scale, y: y + body.y * scale }));
}

export function createThreeBodyController(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>(".home-cosmos__stage")!;
  const planets = [...stage.querySelectorAll<HTMLElement>(".home-celestial")];
  const bodies = createThreeBodies();
  let geometry: { x: number; y: number; radius: number }[] = [];
  let width = 0;
  let height = 0;
  let inset = 0;
  let frame = 0;
  let previousTime: number | null = null;
  let accumulator = 0;
  let destroyed = false;
  const timestep = 1 / 120;

  const render = () => {
    if (!width || !height) return;
    const positions = projectThreeBodies(bodies, width, height, geometry.map(p => p.radius));
    planets.forEach((planet, i) => {
      const x = positions[i].x + inset - geometry[i].x;
      const y = positions[i].y - geometry[i].y;
      planet.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
  };

  // Read geometry only on layout changes, never in the animation loop.
  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    const clip = root.getBoundingClientRect();
    inset = Math.max(0, clip.left - bounds.left);
    width = Math.min(bounds.right, clip.right) - bounds.left - inset;
    height = Math.min(stage.clientHeight, root.clientHeight);
    geometry = planets.map(planet => ({
      x: planet.offsetLeft + planet.offsetWidth / 2,
      y: planet.offsetTop + planet.offsetHeight / 2,
      radius: planet.offsetWidth / 2,
    }));
    render();
  };

  const tick = (now: number) => {
    frame = 0;
    if (destroyed) return;
    if (previousTime !== null) accumulator += Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    while (accumulator >= timestep) {
      stepThreeBodies(bodies, timestep * 0.22);
      accumulator -= timestep;
    }
    render();
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = null;
    accumulator = 0;
    delete root.dataset.threeBodyRunning;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(root);
  observer.observe(stage);
  resize();

  return {
    setRunning(running: boolean) {
      if (destroyed) return;
      if (!running) stop();
      else if (!frame) {
        root.dataset.threeBodyRunning = "true";
        frame = requestAnimationFrame(tick);
      }
    },
    destroy() {
      destroyed = true;
      stop();
      observer.disconnect();
      for (const planet of planets) planet.style.removeProperty("transform");
    },
  };
}
