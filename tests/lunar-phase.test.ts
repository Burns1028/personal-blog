import assert from "node:assert/strict";
import test from "node:test";
import {
  getLunarPhase,
  getLunarPhaseAsset,
} from "../src/lib/lunar-phase.ts";

test("the reference new moon maps to phase zero", () => {
  assert.equal(getLunarPhase(new Date("2000-01-06T18:14:00Z")).index, 0);
});

test("a date half a synodic month later maps to full moon", () => {
  assert.equal(getLunarPhase(new Date("2000-01-21T12:36:00Z")).index, 4);
});

test("every phase resolves to one independent asset", () => {
  const assets = Array.from({ length: 8 }, (_, index) =>
    getLunarPhaseAsset(index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7),
  );
  assert.equal(new Set(assets).size, 8);
});
