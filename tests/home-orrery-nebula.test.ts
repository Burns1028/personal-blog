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
