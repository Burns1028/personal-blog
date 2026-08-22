import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrreryHubGeometry,
  ellipseEquation,
  pointInsideEllipse,
  sampleCubic,
  type Ellipse,
} from "../src/lib/home-orrery-geometry.ts";

const desktopBodies = {
  moon: { x: 286, y: 150, rx: 82, ry: 82 },
  earth: { x: 746, y: 292, rx: 150, ry: 150 },
  blackHole: { x: 194, y: 596, rx: 78, ry: 78 },
} satisfies Record<string, Ellipse>;

const phoneBodies = {
  moon: { x: 103, y: 80, rx: 33, ry: 33 },
  earth: { x: 337, y: 162, rx: 66, ry: 66 },
  blackHole: { x: 93, y: 300, rx: 32, ry: 32 },
} satisfies Record<string, Ellipse>;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

for (const [name, bodies, stage] of [
  ["desktop", desktopBodies, { width: 881, height: 732 }],
  ["phone", phoneBodies, { width: 440, height: 366 }],
] as const) {
  test(`${name} geometry connects three real outlines to one visible hub`, () => {
    const geometry = createOrreryHubGeometry(bodies, stage);
    assert.ok(geometry);

    for (const stream of ["moon", "earth", "black-hole"] as const) {
      const path = geometry.paths[stream];
      assert.deepEqual(path.end, geometry.hub);
      assert.ok(
        Math.abs(ellipseEquation(bodies[stream === "black-hole" ? "blackHole" : stream], path.start) - 1) <= 0.01,
      );
    }

    assert.equal(pointInsideEllipse(bodies.moon, geometry.hub), false);
    assert.equal(pointInsideEllipse(bodies.earth, geometry.hub), false);
    assert.equal(pointInsideEllipse(bodies.blackHole, geometry.hub), false);
    assert.ok(
      distance(geometry.paths.earth.start, geometry.hub) >= bodies.earth.rx * 0.25,
    );
  });
}

test("sampled responsive arms remain within the stage", () => {
  for (const width of [320, 360, 393, 430, 768, 1100, 1600]) {
    const scale = width / 881;
    const stage = { width, height: 732 * scale };
    const bodies = Object.fromEntries(
      Object.entries(desktopBodies).map(([key, body]) => [
        key,
        {
          x: body.x * scale,
          y: body.y * scale,
          rx: body.rx * scale,
          ry: body.ry * scale,
        },
      ]),
    ) as typeof desktopBodies;
    const geometry = createOrreryHubGeometry(bodies, stage);
    assert.ok(geometry);
    for (const path of Object.values(geometry.paths)) {
      for (let step = 0; step <= 100; step += 1) {
        const point = sampleCubic(path, step / 100);
        assert.ok(point.x >= -2 && point.x <= stage.width + 2);
        assert.ok(point.y >= -2 && point.y <= stage.height + 2);
      }
    }
  }
});

test("invalid or unusably collapsed layouts fail closed", () => {
  assert.equal(
    createOrreryHubGeometry(
      { ...desktopBodies, moon: { ...desktopBodies.moon, rx: 0 } },
      { width: 881, height: 732 },
    ),
    null,
  );
  assert.equal(
    createOrreryHubGeometry(
      { ...desktopBodies, earth: { ...desktopBodies.earth, x: Number.NaN } },
      { width: 881, height: 732 },
    ),
    null,
  );
  const same = { x: 100, y: 100, rx: 40, ry: 40 };
  assert.equal(
    createOrreryHubGeometry(
      { moon: same, earth: same, blackHole: same },
      { width: 320, height: 260 },
    ),
    null,
  );
});
