import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  createOrrery2DStreamController,
  drawOrreryStreams2D,
  type OrreryRenderSnapshot,
} from "../src/lib/home-orrery-streams-2d.ts";
import { createOrreryHubGeometry } from "../src/lib/home-orrery-geometry.ts";
import { createOrreryNebulaParticles } from "../src/lib/home-orrery-nebula.ts";

const geometry = createOrreryHubGeometry(
  {
    moon: { x: 105, y: 82, rx: 34, ry: 34 },
    earth: { x: 338, y: 164, rx: 66, ry: 66 },
    blackHole: { x: 92, y: 302, rx: 32, ry: 32 },
  },
  { width: 440, height: 366 },
);
assert.ok(geometry);

const snapshot: OrreryRenderSnapshot = {
  geometry,
  width: 440,
  height: 366,
  viewportWidth: 440,
  dpr: 1,
};

const recordingContext = () => {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const gradient = { addColorStop: (...args: unknown[]) => calls.push({ name: "colorStop", args }) };
  const target: Record<string, unknown> = {
    canvas: { width: 440, height: 366 },
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
    fillStyle: "",
    lineCap: "butt",
    lineJoin: "miter",
    createLinearGradient: (...args: unknown[]) => {
      calls.push({ name: "linearGradient", args });
      return gradient;
    },
    createRadialGradient: (...args: unknown[]) => {
      calls.push({ name: "radialGradient", args });
      return gradient;
    },
  };
  for (const name of [
    "clearRect",
    "setTransform",
    "save",
    "restore",
    "beginPath",
    "moveTo",
    "bezierCurveTo",
    "stroke",
    "arc",
    "fill",
    "translate",
    "rotate",
    "scale",
    "setLineDash",
  ]) {
    target[name] = (...args: unknown[]) => calls.push({ name, args });
  }
  return { context: target as unknown as CanvasRenderingContext2D, calls, target };
};

test("the 2D fallback draws particle clouds without a continuous path stroke", () => {
  const { context, calls, target } = recordingContext();
  drawOrreryStreams2D(context, snapshot, 1200, "none");

  assert.equal(calls.filter((call) => call.name === "stroke").length, 0);
  assert.equal(calls.filter((call) => call.name === "bezierCurveTo").length, 0);
  assert.ok(calls.filter((call) => call.name === "arc").length > 100);
  assert.ok(calls.filter((call) => call.name === "radialGradient").length >= 2);
  assert.equal(target.globalCompositeOperation, "source-over");
  assert.equal(calls.at(0)?.name, "clearRect");
});

test("the 2D fallback applies the shared endpoint fade only once", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/lib/home-orrery-streams-2d.ts"),
    "utf8",
  );
  assert.match(source, /particle\.alpha \* nebulaFade\(progress\) \* emphasis/);
  assert.doesNotMatch(source, /particle\.alpha \* nebulaOpacity/);
});

test("the 2D fallback clears and draws nothing for missing geometry", () => {
  const { context, calls } = recordingContext();
  drawOrreryStreams2D(
    context,
    { geometry: null, width: 440, height: 366, viewportWidth: 440, dpr: 1 },
    0,
    "none",
  );
  assert.deepEqual(calls.map((call) => call.name), ["clearRect"]);
});

test("constrained 2D quality lowers particles, frame rate, and backing DPR", async () => {
  const { context, calls } = recordingContext();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const queued: FrameRequestCallback[] = [];
  const particleRequests: number[] = [];
  const controller = createOrrery2DStreamController(canvas, {
    requestFrame(callback) {
      queued.push(callback);
      return queued.length;
    },
    cancelFrame: () => undefined,
    now: () => 0,
    environment: { saveData: false, hardwareConcurrency: 8 },
    particleFactory(count, seed) {
      particleRequests.push(count);
      return createOrreryNebulaParticles(count, seed);
    },
  });
  assert.ok(controller);
  controller.setGeometry({
    geometry,
    width: 380.8,
    height: 366,
    viewportWidth: 340,
    dpr: 2,
  });

  assert.deepEqual(particleRequests, [540]);
  assert.equal(canvas.width, 476);
  assert.equal(canvas.height, 458);
  assert.deepEqual(calls.filter((call) => call.name === "setTransform").at(-1)?.args, [
    1.25, 0, 0, 1.25, 0, 0,
  ]);
  assert.equal(calls.filter((call) => call.name === "arc").length, 542);

  const drawsBeforeAnimation = calls.filter((call) => call.name === "clearRect").length;
  controller.setRunning(true);
  queued[0]?.(49);
  assert.equal(calls.filter((call) => call.name === "clearRect").length, drawsBeforeAnimation);
  queued[1]?.(50);
  assert.equal(calls.filter((call) => call.name === "clearRect").length, drawsBeforeAnimation + 1);

  controller.setGeometry({
    geometry,
    width: 380.8,
    height: 366,
    viewportWidth: 340,
    dpr: 1,
  });
  controller.setGeometry({
    geometry,
    width: 380.8,
    height: 366,
    viewportWidth: 393,
    dpr: 1,
  });
  controller.setGeometry({
    geometry,
    width: 380.8,
    height: 366,
    viewportWidth: 340,
    dpr: 1,
  });
  assert.deepEqual(particleRequests, [540, 720]);
  controller.destroy();
});

test("the 2D controller stops animation and ignores late frames after destroy", async () => {
  const { context, calls } = recordingContext();
  const queued = new Map<number, FrameRequestCallback>();
  let identifier = 0;
  const controller = createOrrery2DStreamController(
    {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement,
    {
      requestFrame(callback) {
        identifier += 1;
        queued.set(identifier, callback);
        return identifier;
      },
      cancelFrame(frame) {
        queued.delete(frame);
      },
      now: () => 100,
    },
  );
  assert.ok(controller);
  assert.equal(await controller.prepare(), true);
  controller.setGeometry(snapshot);
  controller.setRunning(true);
  const lateFrame = [...queued.values()][0];
  assert.ok(lateFrame);
  controller.destroy();
  const drawCount = calls.length;
  lateFrame(200);
  assert.equal(calls.length, drawCount);
});
