import assert from "node:assert/strict";
import test from "node:test";

import type { CubicPath, OrreryStream } from "../src/lib/home-orrery-geometry.ts";
import { createNebulaRibbon } from "../src/lib/home-orrery-nebula-ribbon.ts";

const path: CubicPath = {
  start: { x: 40, y: 90 },
  controlA: { x: 150, y: 10 },
  controlB: { x: 260, y: 230 },
  end: { x: 380, y: 120 },
};

const pointAt = (positions: Float32Array, vertex: number) => ({
  x: positions[vertex * 3],
  y: positions[vertex * 3 + 1],
  z: positions[vertex * 3 + 2],
});

const pairWidthAt = (positions: Float32Array, sample: number) => {
  const first = pointAt(positions, sample * 2);
  const second = pointAt(positions, sample * 2 + 1);
  return Math.hypot(second.x - first.x, second.y - first.y);
};

const centerlineAt = (positions: Float32Array, sample: number) => {
  const first = pointAt(positions, sample * 2);
  const second = pointAt(positions, sample * 2 + 1);
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
};

const triangleArea = (
  positions: Float32Array,
  firstIndex: number,
  secondIndex: number,
  thirdIndex: number,
) => {
  const first = pointAt(positions, firstIndex);
  const second = pointAt(positions, secondIndex);
  const third = pointAt(positions, thirdIndex);
  return Math.abs(
    (second.x - first.x) * (third.y - first.y) -
      (second.y - first.y) * (third.x - first.x),
  ) / 2;
};

test("ribbon samples two vertices per path point with exact centerline endpoints and endpoint coverage", () => {
  const segments = 12;
  const ribbon = createNebulaRibbon(path, "earth", 366, segments);

  assert.ok(ribbon.positions instanceof Float32Array);
  assert.ok(ribbon.uvs instanceof Float32Array);
  assert.ok(ribbon.indices instanceof Uint32Array);
  assert.equal(ribbon.positions.length, (segments + 1) * 2 * 3);
  assert.equal(ribbon.uvs.length, (segments + 1) * 2 * 2);
  assert.equal(ribbon.indices.length, segments * 6);
  assert.deepEqual(centerlineAt(ribbon.positions, 0), path.start);
  assert.deepEqual(centerlineAt(ribbon.positions, segments), path.end);
  assert.ok(pairWidthAt(ribbon.positions, 0) > 0);
  assert.ok(pairWidthAt(ribbon.positions, segments) > 0);
});

test("ribbon provides finite coordinates, progress UVs, and deterministic triangle order", () => {
  const ribbon = createNebulaRibbon(path, "moon", 732, 4);

  assert.ok(Array.from(ribbon.positions).every(Number.isFinite));
  assert.deepEqual(Array.from(ribbon.uvs.slice(0, 4)), [0, 0, 0, 1]);
  assert.deepEqual(Array.from(ribbon.uvs.slice(-4)), [1, 0, 1, 1]);
  assert.deepEqual(Array.from(ribbon.indices), [
    0, 1, 2, 2, 1, 3,
    2, 3, 4, 4, 3, 5,
    4, 5, 6, 6, 5, 7,
    6, 7, 8, 8, 7, 9,
  ]);
  assert.deepEqual(ribbon, createNebulaRibbon(path, "moon", 732, 4));
});

test("ribbon narrows at its source and shared hub while remaining broad through the arm", () => {
  const ribbon = createNebulaRibbon(path, "black-hole", 366, 16);
  const source = pairWidthAt(ribbon.positions, 2);
  const middle = pairWidthAt(ribbon.positions, 8);
  const hub = pairWidthAt(ribbon.positions, 14);

  assert.ok(pairWidthAt(ribbon.positions, 0) > 0);
  assert.ok(pairWidthAt(ribbon.positions, 16) > 0);
  assert.ok(source < middle * 0.7);
  assert.ok(hub < middle * 0.7);
});

test("every generated triangle retains nonzero area at every permitted segment count", () => {
  for (const stream of ["moon", "earth", "black-hole"] as const) {
    for (const segments of [1, 2, 16]) {
      const ribbon = createNebulaRibbon(path, stream, 366, segments);
      for (let index = 0; index < ribbon.indices.length; index += 3) {
        assert.ok(
          triangleArea(
            ribbon.positions,
            ribbon.indices[index],
            ribbon.indices[index + 1],
            ribbon.indices[index + 2],
          ) > 0,
          `${stream} segment count ${segments}, triangle ${index / 3}`,
        );
      }
    }
  }
});

test("stream widths stay balanced and scale with the responsive short edge", () => {
  const streams: OrreryStream[] = ["moon", "earth", "black-hole"];
  const widths = streams.map((stream) =>
    pairWidthAt(createNebulaRibbon(path, stream, 366, 16).positions, 8),
  );
  const small = pairWidthAt(createNebulaRibbon(path, "moon", 366, 16).positions, 8);
  const large = pairWidthAt(createNebulaRibbon(path, "moon", 732, 16).positions, 8);

  assert.ok(Math.max(...widths) / Math.min(...widths) < 1.2);
  assert.ok(Math.abs(large / small - 2) < 1e-5);
});
