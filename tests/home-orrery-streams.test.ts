import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrreryStreamController,
  createOrrerySnapshot,
  ellipseFromRect,
} from "../src/lib/home-orrery-streams.ts";
import type {
  OrreryArtifact,
  OrreryRenderSnapshot,
  OrreryStreamController,
} from "../src/lib/home-orrery-streams-2d.ts";

const createRecordingController = (
  prepare: () => Promise<boolean> = async () => true,
) => {
  const geometries: OrreryRenderSnapshot[] = [];
  const artifacts: OrreryArtifact[] = [];
  const running: boolean[] = [];
  let destroyCount = 0;
  const controller: OrreryStreamController = {
    prepare,
    setGeometry: (snapshot) => geometries.push(snapshot),
    setActiveArtifact: (artifact) => artifacts.push(artifact),
    setRunning: (next) => running.push(next),
    destroy: () => {
      destroyCount += 1;
    },
  };
  return {
    controller,
    geometries,
    artifacts,
    running,
    get destroyCount() {
      return destroyCount;
    },
  };
};

const installFacadeBrowser = () => {
  let nextFrame = 1;
  const stage = {
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 440,
      height: 366,
    }),
  };
  const makeCanvas = () => {
    const canvas = {
      parentElement: stage,
      dataset: {} as Record<string, string>,
      style: {} as Record<string, string>,
      removeAttribute: () => {},
      replaceWith(replacement: unknown) {
        lastReplacement = replacement;
      },
      cloneNode: () => makeCanvas(),
    };
    return canvas;
  };
  let lastReplacement: unknown = null;
  class MockResizeObserver {
    observe() {}
    disconnect() {}
  }
  Reflect.set(globalThis, "window", {
    devicePixelRatio: 2,
    requestAnimationFrame: () => nextFrame++,
    cancelAnimationFrame: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  Reflect.set(globalThis, "document", {});
  Reflect.set(globalThis, "ResizeObserver", MockResizeObserver);
  const body = (left: number, top: number, width: number, height: number) => ({
    getBoundingClientRect: () => ({ left, top, width, height }),
  });
  return {
    canvas: makeCanvas(),
    bodies: {
      moon: body(81, 68, 68, 68),
      earth: body(282, 118, 132, 132),
      blackHole: body(70, 290, 64, 64),
    },
    get lastReplacement() {
      return lastReplacement;
    },
    cleanup() {
      Reflect.deleteProperty(globalThis, "window");
      Reflect.deleteProperty(globalThis, "document");
      Reflect.deleteProperty(globalThis, "ResizeObserver");
    },
  };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("live celestial rectangles become stage-local ellipses", () => {
  assert.deepEqual(
    ellipseFromRect(
      { left: 30, top: 40, width: 100, height: 80 },
      { left: 10, top: 20, width: 440, height: 366 },
    ),
    { x: 70, y: 60, rx: 50, ry: 40 },
  );
});

test("a render snapshot measures visible bodies instead of legacy center anchors", () => {
  const snapshot = createOrrerySnapshot(
    { left: 10, top: 20, width: 440, height: 366 },
    {
      moon: { left: 81, top: 68, width: 68, height: 68 },
      earth: { left: 282, top: 118, width: 132, height: 132 },
      blackHole: { left: 70, top: 290, width: 64, height: 64 },
    },
    3,
  );
  assert.equal(snapshot.width, 440);
  assert.equal(snapshot.height, 366);
  assert.equal(snapshot.dpr, 2);
  assert.ok(snapshot.geometry);
  assert.deepEqual(snapshot.geometry.paths.moon.end, snapshot.geometry.hub);
  assert.deepEqual(snapshot.geometry.paths.earth.end, snapshot.geometry.hub);
  assert.deepEqual(snapshot.geometry.paths["black-hole"].end, snapshot.geometry.hub);
});

test("invalid stage measurements return a cleared snapshot", () => {
  const snapshot = createOrrerySnapshot(
    { left: 0, top: 0, width: 0, height: 366 },
    {
      moon: { left: 0, top: 0, width: 10, height: 10 },
      earth: { left: 20, top: 20, width: 10, height: 10 },
      blackHole: { left: 40, top: 40, width: 10, height: 10 },
    },
    1,
  );
  assert.equal(snapshot.geometry, null);
});

test("facade replaces the canvas and preserves state when Three import fails", async (t) => {
  const browser = installFacadeBrowser();
  t.after(browser.cleanup);
  const fallback = createRecordingController();
  const facade = createOrreryStreamController(
    browser.canvas as never,
    browser.bodies as never,
    { standard: "/atlas.webp", retina: "/atlas@2x.webp" },
    {
      loadThree: async () => {
        throw new Error("import failed");
      },
      create2D: (canvas) => {
        assert.equal(canvas, browser.lastReplacement);
        return fallback.controller;
      },
    },
  );
  facade.setRunning(true);
  facade.setActiveArtifact("repo");

  assert.equal(await facade.prepare(), true);
  assert.ok(browser.lastReplacement);
  assert.equal(fallback.geometries.at(-1)?.geometry !== null, true);
  assert.equal(fallback.running.at(-1), true);
  assert.equal(fallback.artifacts.at(-1), "repo");
  assert.equal((browser.lastReplacement as { dataset: Record<string, string> }).dataset.renderer, "2d");
  facade.destroy();
  assert.equal(fallback.destroyCount, 1);
});

test("facade falls back after prepare failure and runtime context loss", async (t) => {
  const browser = installFacadeBrowser();
  t.after(browser.cleanup);
  const failedThree = createRecordingController(async () => false);
  const firstFallback = createRecordingController();
  let create2DCount = 0;
  const prepareFailureFacade = createOrreryStreamController(
    browser.canvas as never,
    browser.bodies as never,
    { standard: "/atlas.webp", retina: "/atlas@2x.webp" },
    {
      loadThree: async () => ({
        createOrreryThreeStreamController: () => failedThree.controller,
      }) as never,
      create2D: () => {
        create2DCount += 1;
        return firstFallback.controller;
      },
    },
  );
  assert.equal(await prepareFailureFacade.prepare(), true);
  assert.equal(failedThree.destroyCount, 1);
  assert.equal(create2DCount, 1);
  prepareFailureFacade.destroy();

  const runtimeBrowser = installFacadeBrowser();
  t.after(runtimeBrowser.cleanup);
  const liveThree = createRecordingController();
  const runtimeFallback = createRecordingController();
  let onFailure: (() => void) | undefined;
  const runtimeFacade = createOrreryStreamController(
    runtimeBrowser.canvas as never,
    runtimeBrowser.bodies as never,
    { standard: "/atlas.webp", retina: "/atlas@2x.webp" },
    {
      loadThree: async () => ({
        createOrreryThreeStreamController: (
          _canvas: unknown,
          _source: string,
          callbacks: { onFailure: () => void },
        ) => {
          onFailure = callbacks.onFailure;
          return liveThree.controller;
        },
      }) as never,
      create2D: () => runtimeFallback.controller,
    },
  );
  runtimeFacade.setRunning(true);
  runtimeFacade.setActiveArtifact("idea");
  assert.equal(await runtimeFacade.prepare(), true);
  onFailure?.();
  await flushPromises();
  assert.equal(liveThree.destroyCount, 1);
  assert.equal(runtimeFallback.running.at(-1), true);
  assert.equal(runtimeFallback.artifacts.at(-1), "idea");
  assert.equal(
    (runtimeBrowser.lastReplacement as { dataset: Record<string, string> }).dataset.renderer,
    "2d",
  );
  runtimeFacade.destroy();
});

test("destroy during async fallback preparation disposes each backend once", async (t) => {
  const browser = installFacadeBrowser();
  t.after(browser.cleanup);
  let finishFallback: ((ready: boolean) => void) | undefined;
  const fallback = createRecordingController(
    () => new Promise<boolean>((resolve) => {
      finishFallback = resolve;
    }),
  );
  const facade = createOrreryStreamController(
    browser.canvas as never,
    browser.bodies as never,
    { standard: "/atlas.webp", retina: "/atlas@2x.webp" },
    {
      loadThree: async () => {
        throw new Error("import failed");
      },
      create2D: () => fallback.controller,
    },
  );
  const preparing = facade.prepare();
  await flushPromises();
  facade.destroy();
  finishFallback?.(true);
  assert.equal(await preparing, false);
  assert.equal(fallback.destroyCount, 1);
});
