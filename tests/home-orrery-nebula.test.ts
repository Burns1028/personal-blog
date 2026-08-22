import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrreryNebulaParticles,
  nebulaOpacity,
  nebulaSpread,
} from "../src/lib/home-orrery-nebula.ts";

test("nebula particles are deterministic and include three visual layers plus hub dust", () => {
  const first = createOrreryNebulaParticles(900, 1028);
  assert.deepEqual(first, createOrreryNebulaParticles(900, 1028));
  assert.ok(["mist", "dust", "spark"].every((layer) => first.some((p) => p.layer === layer)));
  assert.ok(first.some((p) => p.stream === "hub"));
  assert.ok(["moon", "earth", "black-hole"].every((stream) => first.some((p) => p.stream === stream)));
});

test("mist is broad, sparks are sparse, and all arms converge without a one-pixel spine", () => {
  assert.ok(nebulaSpread("black-hole", "mist", 0.45, 366) > nebulaSpread("black-hole", "dust", 0.45, 366));
  assert.ok(nebulaSpread("moon", "dust", 0.98, 366) > 0);
  assert.ok(nebulaSpread("moon", "dust", 0.98, 366) < nebulaSpread("moon", "dust", 0.5, 366));
  assert.ok(nebulaOpacity("mist", 0.5) < nebulaOpacity("dust", 0.5));
});

test("nebula layers carry enough size and opacity to remain traceable without ribbons", () => {
  const particles = createOrreryNebulaParticles(3200, 1028);
  const average = (layer: "mist" | "dust", property: "size" | "alpha") => {
    const matches = particles.filter((particle) => particle.layer === layer);
    return matches.reduce((sum, particle) => sum + particle[property], 0) / matches.length;
  };

  assert.ok(average("mist", "size") >= 5.2);
  assert.ok(average("mist", "alpha") >= 0.18);
  assert.ok(average("dust", "size") >= 2.4);
  assert.ok(average("dust", "alpha") >= 0.48);
});

test("endpoint fade is brief but reaches zero exactly at each arm wrap", () => {
  const midpoint = nebulaOpacity("dust", 0.5);
  assert.equal(nebulaOpacity("dust", 0), 0);
  assert.equal(nebulaOpacity("dust", 1), 0);
  assert.ok(nebulaOpacity("dust", 0.025) >= midpoint * 0.98);
  assert.ok(nebulaOpacity("dust", 0.985) >= midpoint * 0.98);
});
