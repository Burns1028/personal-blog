import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { InstancedBufferGeometry, Mesh, type Scene, Texture } from "three";

import {
  atlasCellForParticle,
  createOrreryThreeStreamController,
  selectOrreryQuality,
} from "../src/lib/home-orrery-streams-three.ts";
import { createOrreryHubGeometry } from "../src/lib/home-orrery-geometry.ts";
import {
  createOrreryNebulaParticles,
  nebulaStreamCounts,
  nebulaStreamWeights,
  nebulaVisualGain,
} from "../src/lib/home-orrery-nebula.ts";

test("quality profiles cap density, frame rate, and DPR by environment", () => {
  assert.deepEqual(
    selectOrreryQuality(1440, { dpr: 3, saveData: false, hardwareConcurrency: 10 }),
    { particleCount: 3200, fps: 45, dpr: 2 },
  );
  assert.deepEqual(
    selectOrreryQuality(393, { dpr: 3, saveData: false, hardwareConcurrency: 8 }),
    { particleCount: 1500, fps: 30, dpr: 1.5 },
  );
  assert.deepEqual(
    selectOrreryQuality(340, { dpr: 2, saveData: false, hardwareConcurrency: 8 }),
    { particleCount: 720, fps: 24, dpr: 1.5 },
  );
  assert.deepEqual(
    selectOrreryQuality(1440, { dpr: 2, saveData: true, hardwareConcurrency: 10 }),
    { particleCount: 720, fps: 24, dpr: 1.5 },
  );
});

test("quality profiles allocate enough particles for traceable static arms", () => {
  assert.ok(
    selectOrreryQuality(393, { dpr: 3, saveData: false, hardwareConcurrency: 8 })
      .particleCount >= 1400,
  );
  assert.ok(
    selectOrreryQuality(1440, { dpr: 2, saveData: false, hardwareConcurrency: 10 })
      .particleCount >= 3000,
  );
});

test("atlas roles move each arm toward blue-white at the shared hub", () => {
  assert.ok(atlasCellForParticle("moon", 0.1, 0) < 8);
  assert.ok(atlasCellForParticle("black-hole", 0.1, 0) < 8);
  assert.ok(atlasCellForParticle("earth", 0.1, 0) >= 8);
  assert.ok(atlasCellForParticle("moon", 0.9, 0) >= 8);
  assert.ok(atlasCellForParticle("black-hole", 0.9, 0) >= 8);
});

test("particle shader packs instance data below the WebGL attribute floor", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/lib/home-orrery-streams-three.ts"),
    "utf8",
  );
  const attributes = [...source.matchAll(/setInstancedAttribute\(result,\s*"([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(attributes.includes("iMotion"));
  assert.ok(attributes.includes("iStyle"));
  assert.ok(attributes.length <= 10, `uses ${attributes.length} instanced attributes`);
  assert.doesNotMatch(source, /attribute float iStream/);
});

test("Three streams contain no continuous ribbon mesh", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/lib/home-orrery-streams-three.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /createRibbonGeometry|ribbonGeometry|ribbonMaterial/);
  assert.doesNotMatch(source, /new MeshBasicMaterial/);
  assert.doesNotMatch(source, /index\s*%\s*streams\.length/);
  assert.match(source, /createOrreryNebulaParticles/);
  assert.match(source, /smoothstep\(0\.68, 0\.94, progress\)/);
  for (const color of ["0xf4cf83", "0xb9d9ea", "0x4698d1", "0xa8d8ee", "0xf09a3a", "0xc5c2ad"]) {
    assert.match(source, new RegExp(color));
  }
});

test("hub particles share the instanced draw without exceeding the WebGL attribute floor", () => {
  const particles = createOrreryNebulaParticles(900, 1028);
  assert.ok(particles.filter((particle) => particle.stream === "hub").length >= 60);
  assert.ok(
    particles.filter((particle) => particle.layer === "spark").length <
      particles.filter((particle) => particle.layer === "dust").length,
  );
});

test("arm particles fade at fract endpoints while hub particles stay visible", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/lib/home-orrery-streams-three.ts"),
    "utf8",
  );
  assert.match(
    source,
    /float edgeFade = min\(1\.0, min\(progress \/ 0\.02, \(1\.0 - progress\) \/ 0\.012\)\);/,
  );
  assert.match(
    source,
    /vAlpha = iStyle\.z > 2\.5 \? iStyle\.y : iStyle\.y \* max\(0\.0, edgeFade\);/,
  );
});

test("the asymmetric hub haze is scaled and bright enough to bridge arm endpoints", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/lib/home-orrery-streams-three.ts"),
    "utf8",
  );
  assert.match(source, /const hubSize = clamp\(stageShortEdge \* 0\.075, 48, 68\);/);
  assert.match(source, /new PlaneGeometry\(hubSize, hubSize\)/);
  assert.match(source, /haze \* 0\.3 \+ core \* 0\.66/);
  assert.match(source, /vec2 point = vUv - vec2\(0\.47, 0\.53\)/);
});

test("screen-space quads remain visible with the downward CSS-pixel camera", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/lib/home-orrery-streams-three.ts"),
    "utf8",
  );
  assert.ok(
    (source.match(/side:\s*DoubleSide/g) ?? []).length >= 2,
    "particle and hub quads must not be culled by the inverted Y projection",
  );
});

const geometry = createOrreryHubGeometry(
  {
    moon: { x: 105, y: 82, rx: 34, ry: 34 },
    earth: { x: 338, y: 164, rx: 66, ry: 66 },
    blackHole: { x: 92, y: 302, rx: 32, ry: 32 },
  },
  { width: 440, height: 366 },
);
assert.ok(geometry);

const makeHarness = () => {
  const listeners = new Map<string, EventListener>();
  const canvas = {
    addEventListener(name: string, listener: EventListener) {
      listeners.set(name, listener);
    },
    removeEventListener(name: string) {
      listeners.delete(name);
    },
  } as unknown as HTMLCanvasElement;
  const calls: string[] = [];
  const pixelRatios: number[] = [];
  const scenes: Scene[] = [];
  const renderer = {
    setPixelRatio: (value: number) => {
      calls.push("pixelRatio");
      pixelRatios.push(value);
    },
    setSize: () => calls.push("size"),
    setClearColor: () => calls.push("clearColor"),
    render: (scene: Scene) => {
      calls.push("render");
      scenes.push(scene);
    },
    dispose: () => calls.push("rendererDispose"),
    forceContextLoss: () => calls.push("forceContextLoss"),
  };
  const texture = new Texture();
  const originalTextureDispose = texture.dispose.bind(texture);
  texture.dispose = () => {
    calls.push("textureDispose");
    originalTextureDispose();
  };
  return { canvas, calls, pixelRatios, renderer, scenes, texture, listeners };
};

test("Three controller selects constrained density from viewport rather than wider stage", async () => {
  const harness = makeHarness();
  const queued: FrameRequestCallback[] = [];
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: async () => harness.texture,
      requestFrame: (callback) => {
        queued.push(callback);
        return queued.length;
      },
      cancelFrame: () => undefined,
      now: () => 100,
      environment: { dpr: 2, saveData: false, hardwareConcurrency: 8 },
    },
  );
  controller.setGeometry({
    geometry,
    width: 380.8,
    height: 366,
    viewportWidth: 340,
    dpr: 1,
  });
  assert.equal(await controller.prepare(), true);
  const particleMesh = harness.scenes.at(-1)?.children.find(
    (child) => child instanceof Mesh && child.geometry instanceof InstancedBufferGeometry,
  ) as Mesh<InstancedBufferGeometry> | undefined;
  assert.equal(particleMesh?.geometry.instanceCount, 720);
  const rendersBeforeAnimation = harness.calls.filter((call) => call === "render").length;
  controller.setRunning(true);
  queued[0]?.(41);
  assert.equal(harness.calls.filter((call) => call === "render").length, rendersBeforeAnimation);
  queued[1]?.(42);
  assert.equal(harness.calls.filter((call) => call === "render").length, rendersBeforeAnimation + 1);
  controller.destroy();
});

test("Three instances use geometry quotas and apply each stream gain exactly once", async () => {
  const harness = makeHarness();
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: async () => harness.texture,
      requestFrame: () => 1,
      cancelFrame: () => undefined,
      now: () => 100,
      environment: { dpr: 2, saveData: false, hardwareConcurrency: 8 },
    },
  );
  controller.setGeometry({
    geometry,
    width: 440,
    height: 366,
    viewportWidth: 393,
    dpr: 1.5,
  });
  assert.equal(await controller.prepare(), true);

  const particleMesh = harness.scenes.at(-1)?.children.find(
    (child) => child instanceof Mesh && child.geometry instanceof InstancedBufferGeometry,
  ) as Mesh<InstancedBufferGeometry> | undefined;
  assert.ok(particleMesh);
  const style = particleMesh.geometry.getAttribute("iStyle");
  const motion = particleMesh.geometry.getAttribute("iMotion");
  const weights = nebulaStreamWeights(geometry);
  const expectedCounts = nebulaStreamCounts(1500, weights);
  const expectedParticles = createOrreryNebulaParticles(1500, 1028, weights);
  const sourceCounts = { moon: 0, earth: 0, "black-hole": 0, hub: 0 };

  for (let index = 0; index < expectedParticles.length; index += 1) {
    const particle = expectedParticles[index];
    sourceCounts[particle.stream] += 1;
    const gain = nebulaVisualGain(particle.stream);
    assert.ok(Math.abs(motion.getW(index) - particle.size * gain.size) < 1e-5);
    assert.ok(Math.abs(style.getY(index) - particle.alpha * gain.opacity) < 1e-5);
  }
  assert.deepEqual(sourceCounts, expectedCounts);
  assert.ok(sourceCounts.earth < sourceCounts.moon);
  assert.ok(sourceCounts.moon < sourceCounts["black-hole"]);
  controller.destroy();
});

test("Three controller reapplies live snapshot DPR on the same renderer", async () => {
  const harness = makeHarness();
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: async () => harness.texture,
      requestFrame: () => 1,
      cancelFrame: () => undefined,
      now: () => 100,
      environment: { dpr: 3, saveData: false, hardwareConcurrency: 8 },
    },
  );
  controller.setGeometry({
    geometry,
    width: 440,
    height: 366,
    viewportWidth: 1440,
    dpr: 1,
  });
  assert.equal(await controller.prepare(), true);
  controller.setGeometry({
    geometry,
    width: 440,
    height: 366,
    viewportWidth: 1440,
    dpr: 2,
  });
  assert.deepEqual(harness.pixelRatios.slice(-2), [1, 2]);
  controller.destroy();
});

test("Three.js controller prepares, renders shared geometry, and disposes once", async () => {
  const harness = makeHarness();
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: async () => harness.texture,
      requestFrame: () => 1,
      cancelFrame: () => undefined,
      now: () => 100,
      environment: { dpr: 2, saveData: false, hardwareConcurrency: 8 },
    },
  );
  controller.setGeometry({ geometry, width: 440, height: 366, viewportWidth: 440, dpr: 1.5 });
  assert.equal(await controller.prepare(), true);
  assert.ok(harness.calls.includes("render"));
  controller.destroy();
  controller.destroy();
  assert.equal(harness.calls.filter((call) => call === "rendererDispose").length, 1);
  assert.equal(harness.calls.filter((call) => call === "textureDispose").length, 1);
});

test("Three.js controller fails closed on texture rejection", async () => {
  const harness = makeHarness();
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: async () => {
        throw new Error("decode failed");
      },
      requestFrame: () => 1,
      cancelFrame: () => undefined,
      now: () => 100,
      environment: { dpr: 1, saveData: false, hardwareConcurrency: 8 },
    },
  );
  assert.equal(await controller.prepare(), false);
  assert.equal(harness.calls.filter((call) => call === "rendererDispose").length, 1);
});

test("destroyed controller disposes a texture that resolves late", async () => {
  const harness = makeHarness();
  let resolveTexture!: (texture: Texture) => void;
  const texturePromise = new Promise<Texture>((resolve) => {
    resolveTexture = resolve;
  });
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: () => texturePromise,
      requestFrame: () => 1,
      cancelFrame: () => undefined,
      now: () => 100,
      environment: { dpr: 1, saveData: false, hardwareConcurrency: 8 },
    },
  );
  const preparing = controller.prepare();
  controller.destroy();
  resolveTexture(harness.texture);
  assert.equal(await preparing, false);
  assert.equal(harness.calls.filter((call) => call === "textureDispose").length, 1);
  assert.equal(harness.calls.includes("render"), false);
});

test("context loss notifies the facade and prevents further animation", async () => {
  const harness = makeHarness();
  let failures = 0;
  const controller = createOrreryThreeStreamController(
    harness.canvas,
    "/atlas.webp",
    {
      rendererFactory: () => harness.renderer,
      textureLoader: async () => harness.texture,
      requestFrame: () => 1,
      cancelFrame: () => undefined,
      now: () => 100,
      onFailure: () => {
        failures += 1;
      },
      environment: { dpr: 1, saveData: false, hardwareConcurrency: 8 },
    },
  );
  assert.equal(await controller.prepare(), true);
  let prevented = false;
  harness.listeners.get("webglcontextlost")?.({
    preventDefault() {
      prevented = true;
    },
  } as Event);
  assert.equal(prevented, true);
  assert.equal(failures, 1);
});
