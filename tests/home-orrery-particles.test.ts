import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const modulePath = resolve(
  import.meta.dirname,
  "../src/lib/home-orrery-particles.ts",
);

test("two asymmetric particle streams converge on Earth without serially crossing the Moon", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { sampleBlackHoleToEarthPath, sampleMoonToEarthPath } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.deepEqual(sampleBlackHoleToEarthPath(0), { x: 0.225, y: 0.81 });
  assert.deepEqual(sampleMoonToEarthPath(0), { x: 0.295, y: 0.205 });
  assert.deepEqual(sampleBlackHoleToEarthPath(1), { x: 0.68, y: 0.37 });
  assert.deepEqual(sampleMoonToEarthPath(1), { x: 0.68, y: 0.37 });

  const blackMidpoint = sampleBlackHoleToEarthPath(0.5);
  const moonMidpoint = sampleMoonToEarthPath(0.5);
  assert.ok(blackMidpoint.y > moonMidpoint.y + 0.12);
  assert.ok(blackMidpoint.x < 0.55);
  assert.ok(moonMidpoint.x > 0.4);
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
