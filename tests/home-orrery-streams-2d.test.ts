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
    { geometry: null, width: 440, height: 366, dpr: 1 },
    0,
    "none",
  );
  assert.deepEqual(calls.map((call) => call.name), ["clearRect"]);
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
