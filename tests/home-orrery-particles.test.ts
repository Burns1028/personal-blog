import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const modulePath = resolve(
  import.meta.dirname,
  "../src/lib/home-orrery-particles.ts",
);

test("particle path connects black hole through Moon to Earth", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { sampleOrreryPath } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.deepEqual(sampleOrreryPath(0), { x: 0.225, y: 0.81 });
  const moon = sampleOrreryPath(0.5);
  assert.ok(moon.x >= 0.28 && moon.x <= 0.42);
  assert.ok(moon.y >= 0.18 && moon.y <= 0.34);
  assert.deepEqual(sampleOrreryPath(1), { x: 0.68, y: 0.37 });
});

test("particle palette changes from gold through pearl to blue", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { sampleOrreryColor } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.deepEqual(sampleOrreryColor(0), [226, 165, 65]);
  assert.deepEqual(sampleOrreryColor(0.5), [232, 224, 203]);
  assert.deepEqual(sampleOrreryColor(1), [112, 190, 238]);
});

test("particle density is bounded for desktop and mobile", async () => {
  assert.ok(existsSync(modulePath), "particle controller module must exist");
  const { particleCountForWidth } = await import(
    "../src/lib/home-orrery-particles.ts"
  );

  assert.equal(particleCountForWidth(1440), 28);
  assert.equal(particleCountForWidth(760), 12);
});
