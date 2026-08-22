import assert from "node:assert/strict";
import test from "node:test";
import { Texture } from "three";

import {
  atlasCellForParticle,
  createOrreryThreeStreamController,
  createParticleInstances,
  selectOrreryQuality,
} from "../src/lib/home-orrery-streams-three.ts";
import { createOrreryHubGeometry } from "../src/lib/home-orrery-geometry.ts";

test("quality profiles cap density, frame rate, and DPR by environment", () => {
  assert.deepEqual(
    selectOrreryQuality(1440, { dpr: 3, saveData: false, hardwareConcurrency: 10 }),
    { particleCount: 1800, fps: 45, dpr: 2 },
  );
  assert.deepEqual(
    selectOrreryQuality(393, { dpr: 3, saveData: false, hardwareConcurrency: 8 }),
    { particleCount: 900, fps: 30, dpr: 1.5 },
  );
  assert.deepEqual(
    selectOrreryQuality(340, { dpr: 2, saveData: false, hardwareConcurrency: 8 }),
    { particleCount: 420, fps: 24, dpr: 1.5 },
  );
  assert.deepEqual(
    selectOrreryQuality(1440, { dpr: 2, saveData: true, hardwareConcurrency: 10 }),
    { particleCount: 420, fps: 24, dpr: 1.5 },
  );
});

test("particle instances are deterministic and populate all three arms", () => {
  const first = createParticleInstances(900, 1028);
  const second = createParticleInstances(900, 1028);
  assert.deepEqual(first, second);
  assert.equal(first.length, 900);
  for (const stream of ["moon", "earth", "black-hole"] as const) {
    assert.ok(first.filter((particle) => particle.stream === stream).length > 180);
  }
  assert.ok(first.every((particle) => particle.atlasCell >= 0 && particle.atlasCell < 16));
});

test("atlas roles move each arm toward blue-white at the shared hub", () => {
  assert.ok(atlasCellForParticle("moon", 0.1, 0) < 8);
  assert.ok(atlasCellForParticle("black-hole", 0.1, 0) < 8);
  assert.ok(atlasCellForParticle("earth", 0.1, 0) >= 8);
  assert.ok(atlasCellForParticle("moon", 0.9, 0) >= 8);
  assert.ok(atlasCellForParticle("black-hole", 0.9, 0) >= 8);
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
  const renderer = {
    setPixelRatio: () => calls.push("pixelRatio"),
    setSize: () => calls.push("size"),
    setClearColor: () => calls.push("clearColor"),
    render: () => calls.push("render"),
    dispose: () => calls.push("rendererDispose"),
    forceContextLoss: () => calls.push("forceContextLoss"),
  };
  const texture = new Texture();
  const originalTextureDispose = texture.dispose.bind(texture);
  texture.dispose = () => {
    calls.push("textureDispose");
    originalTextureDispose();
  };
  return { canvas, calls, renderer, texture, listeners };
};

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
  controller.setGeometry({ geometry, width: 440, height: 366, dpr: 1.5 });
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
