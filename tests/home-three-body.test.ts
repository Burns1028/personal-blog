import assert from "node:assert/strict";
import test from "node:test";
import * as threeBody from "../src/lib/home-three-body.ts";

const energy = (bodies: threeBody.OrbitBody[]) => {
  let result = 0;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    result += a.mass * (a.vx ** 2 + a.vy ** 2 + threeBody.CONFINEMENT * (a.x ** 2 + a.y ** 2)) / 2;
    for (const b of bodies.slice(i + 1)) {
      result -= threeBody.GRAVITY * a.mass * b.mass / Math.hypot(a.x - b.x, a.y - b.y, threeBody.SOFTENING);
    }
  }
  return result;
};

test("all three bodies interact and the third body changes the other trajectories", () => {
  const full = threeBody.createThreeBodies();
  const pair = structuredClone(full.slice(0, 2));
  for (let i = 0; i < 120; i++) {
    threeBody.stepThreeBodies(full, 1 / 240);
    threeBody.stepThreeBodies(pair, 1 / 240);
  }
  assert.ok(Math.hypot(full[0].x - pair[0].x, full[0].y - pair[0].y) > 0.01);
  assert.ok(Math.hypot(full[1].x - pair[1].x, full[1].y - pair[1].y) > 0.01);
});

test("long-running motion remains finite and conserves the softened system's energy and center", () => {
  const bodies = threeBody.createThreeBodies();
  const initialEnergy = energy(bodies);
  let maximumError = 0;
  for (let i = 0; i < 100_000; i++) {
    threeBody.stepThreeBodies(bodies, 1 / 600);
    if (i % 100 !== 0) continue;
    maximumError = Math.max(maximumError, Math.abs(energy(bodies) - initialEnergy));
    for (const body of bodies) {
      assert.ok([body.x, body.y, body.vx, body.vy].every(Number.isFinite));
      assert.ok(Math.hypot(body.x, body.y) < 12);
    }
    const cx = bodies.reduce((sum, b) => sum + b.mass * b.x, 0);
    const cy = bodies.reduce((sum, b) => sum + b.mass * b.y, 0);
    assert.ok(Math.hypot(cx, cy) < 1e-8);
  }
  assert.ok(maximumError / Math.abs(initialEnergy) < 0.005, `energy error: ${maximumError}`);
});

test("one shared camera keeps differently sized planets inside desktop and phone stages", () => {
  const bodies = threeBody.createThreeBodies();
  for (let i = 0; i < 12_000; i++) {
    threeBody.stepThreeBodies(bodies, 1 / 240);
    if (i % 60 !== 0) continue;
    for (const [width, height] of [[700, 580], [343, 350], [300, 250]]) {
      const radii = [0.12, 0.24, 0.15].map(r => r * width);
      const positions = threeBody.projectThreeBodies(bodies, width, height, radii);
      positions.forEach((p, index) => {
        assert.ok(p.x - radii[index] >= 7.99 && p.x + radii[index] <= width - 7.99);
        assert.ok(p.y - radii[index] >= 7.99 && p.y + radii[index] <= height - 7.99);
      });
    }
  }
});
