import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const modulePath = resolve(
  import.meta.dirname,
  "../src/lib/home-orrery-particles.ts",
);

test("two responsive particle streams use live anchors and converge on Earth", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { createOrreryPathGeometry, sampleOrreryPath } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  const anchors = {
    blackHole: { x: 180, y: 600 },
    moon: { x: 250, y: 160 },
    earth: { x: 640, y: 280 },
  };
  const geometry = createOrreryPathGeometry(anchors, {
    width: 900,
    height: 700,
  });

  assert.deepEqual(sampleOrreryPath(geometry, "black-hole", 0), anchors.blackHole);
  assert.deepEqual(sampleOrreryPath(geometry, "moon", 0), anchors.moon);
  assert.deepEqual(sampleOrreryPath(geometry, "black-hole", 1), anchors.earth);
  assert.deepEqual(sampleOrreryPath(geometry, "moon", 1), anchors.earth);

  const blackMidpoint = sampleOrreryPath(geometry, "black-hole", 0.5);
  const moonMidpoint = sampleOrreryPath(geometry, "moon", 0.5);
  assert.ok(blackMidpoint.y > moonMidpoint.y + 90);
  assert.ok(blackMidpoint.x < 500);
  assert.ok(moonMidpoint.x > 380);
});

test("anchor centers convert from viewport coordinates into canvas pixels", async () => {
  const { pointRelativeToRect } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.deepEqual(
    pointRelativeToRect(
      { left: 225, top: 140, width: 2, height: 2 },
      { left: 25, top: 40, width: 900, height: 700 },
    ),
    { x: 201, y: 101 },
  );
});

test("mobile anchor movement changes only the measured endpoints", async () => {
  const { createOrreryPathGeometry, sampleOrreryPath } = await import(
    "../src/lib/home-orrery-particles.ts"
  );
  const anchors = {
    blackHole: { x: 86, y: 378 },
    moon: { x: 94, y: 105 },
    earth: { x: 309, y: 204 },
  };
  const geometry = createOrreryPathGeometry(anchors, {
    width: 436,
    height: 480,
  });

  assert.deepEqual(sampleOrreryPath(geometry, "moon", 0), anchors.moon);
  assert.deepEqual(sampleOrreryPath(geometry, "moon", 1), anchors.earth);
  assert.deepEqual(sampleOrreryPath(geometry, "black-hole", 0), anchors.blackHole);
  assert.deepEqual(sampleOrreryPath(geometry, "black-hole", 1), anchors.earth);
});

test("each stream keeps its mother-image palette while converging to blue", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { sampleStreamColor } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.deepEqual(sampleStreamColor("black-hole", 0), [226, 165, 65]);
  assert.deepEqual(sampleStreamColor("moon", 0), [232, 224, 203]);
  assert.deepEqual(sampleStreamColor("black-hole", 1), [112, 190, 238]);
  assert.deepEqual(sampleStreamColor("moon", 1), [112, 190, 238]);
});

test("particle density is bounded for desktop and mobile", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { particleCountForWidth } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.equal(particleCountForWidth(1440), 28);
  assert.equal(particleCountForWidth(760), 12);
});

test("the two static currents use different strand densities", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { baseStrandCountForWidth } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.deepEqual(baseStrandCountForWidth(1440), { blackHole: 7, moon: 4 });
  assert.deepEqual(baseStrandCountForWidth(760), { blackHole: 4, moon: 2 });
});

test("connection currents have a clearly perceptible but restrained dash velocity", async () => {
  const { streamDashPixelsPerSecond } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.equal(streamDashPixelsPerSecond("black-hole"), 11);
  assert.equal(streamDashPixelsPerSecond("moon"), 13);
});
