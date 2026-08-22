import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrrerySnapshot,
  ellipseFromRect,
} from "../src/lib/home-orrery-streams.ts";

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
