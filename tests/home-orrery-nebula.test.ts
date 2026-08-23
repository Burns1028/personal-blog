import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrreryNebulaParticles,
  nebulaOpacity,
  nebulaSpread,
  nebulaStreamCounts,
  nebulaStreamWeights,
  nebulaVisualGain,
} from "../src/lib/home-orrery-nebula.ts";
import { createOrreryHubGeometry } from "../src/lib/home-orrery-geometry.ts";

const geometryFixtures = [
  createOrreryHubGeometry(
    {
      moon: { x: 286, y: 150, rx: 82, ry: 82 },
      earth: { x: 746, y: 292, rx: 150, ry: 150 },
      blackHole: { x: 194, y: 596, rx: 78, ry: 78 },
    },
    { width: 881, height: 732 },
  ),
  createOrreryHubGeometry(
    {
      moon: { x: 103, y: 80, rx: 33, ry: 33 },
      earth: { x: 337, y: 162, rx: 66, ry: 66 },
      blackHole: { x: 93, y: 300, rx: 32, ry: 32 },
    },
    { width: 440, height: 366 },
  ),
];

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

test("arm quotas follow measured curve mass instead of equal thirds", () => {
  for (const geometry of geometryFixtures) {
    assert.ok(geometry);
    const weights = nebulaStreamWeights(geometry);
    const counts = nebulaStreamCounts(3200, weights);

    assert.ok(counts.earth < counts.moon);
    assert.ok(counts.moon < counts["black-hole"]);
    const effective = (["moon", "earth", "black-hole"] as const).map(
      (stream) => counts[stream] / weights[stream],
    );
    assert.ok(Math.max(...effective) / Math.min(...effective) < 1.08);
    assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 3200);
  }
});

test("shared visual gains restrain Earth and reinforce the longer warm arms", () => {
  assert.ok(nebulaVisualGain("earth").opacity < 1);
  assert.ok(
    nebulaVisualGain("moon").opacity > nebulaVisualGain("earth").opacity,
  );
  assert.ok(
    nebulaVisualGain("black-hole").size >= nebulaVisualGain("moon").size,
  );
});

test("weighted particle fields remain deterministic and satisfy exact quotas", () => {
  const geometry = geometryFixtures[0];
  assert.ok(geometry);
  const weights = nebulaStreamWeights(geometry);
  const counts = nebulaStreamCounts(3200, weights);
  const first = createOrreryNebulaParticles(3200, 1028, weights);

  assert.deepEqual(first, createOrreryNebulaParticles(3200, 1028, weights));
  for (const stream of ["hub", "moon", "earth", "black-hole"] as const) {
    assert.equal(
      first.filter((particle) => particle.stream === stream).length,
      counts[stream],
    );
  }
});
