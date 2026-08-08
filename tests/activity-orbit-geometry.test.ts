import assert from "node:assert/strict";
import test from "node:test";
import {
  activityOrbitPath,
  activityOrbitPointAtX,
} from "../src/lib/activity-orbit-geometry.ts";

test("activity orbit exposes one canonical cubic path", () => {
  assert.equal(activityOrbitPath, "M0 44 C210 190 560 198 1000 38");
});

test("activity nodes are solved from the canonical cubic", () => {
  const expected = [
    [13, 42.481],
    [25, 54.636],
    [43, 59.868],
    [61, 54.043],
    [78, 40.81],
    [91, 26.462],
  ];

  for (const [left, top] of expected) {
    const point = activityOrbitPointAtX(left);
    assert.equal(point.left, left);
    assert.ok(Math.abs(point.top - top) < 0.001);
  }
});
