import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const controllerPath = resolve(root, "src/lib/home-celestial-sphere.ts");

test("sphere renderer samples one seamless texture and rotates longitude continuously", () => {
  assert.ok(existsSync(controllerPath), "sphere controller must exist");
  const source = readFileSync(controllerPath, "utf8");

  assert.match(source, /uniform sampler2D uTexture/);
  assert.match(source, /uniform float uRotation/);
  assert.match(source, /texture2D\(uTexture, uv\)/);
  assert.match(source, /elapsedMs \/ options\.durationMs \* Math\.PI \* 2/);
  assert.doesNotMatch(source, /globalAlpha|drawImage|Math\.sin\(|nextIndex|mix/);
});

test("sphere renderer preserves a fixed limb and falls back atomically", () => {
  assert.ok(existsSync(controllerPath), "sphere controller must exist");
  const source = readFileSync(controllerPath, "utf8");

  assert.match(source, /smoothstep\(0\.965, 0\.998, sqrt\(r2\)\)/);
  assert.match(source, /classList\.add\("is-motion-ready"\)/);
  assert.match(source, /classList\.remove\("is-motion-ready"\)/);
  assert.match(source, /webglcontextlost/);
});

test("sphere renderer keeps directional light fixed while only surface longitude rotates", () => {
  assert.ok(existsSync(controllerPath), "sphere controller must exist");
  const source = readFileSync(controllerPath, "utf8");

  assert.match(source, /uniform float uAmbientLight/);
  assert.match(source, /uniform float uDiffuseLight/);
  assert.match(
    source,
    /vec3 lightDirection = normalize\(vec3\(-0\.62, 0\.58, 0\.72\)\)/,
  );
  assert.match(source, /dot\(normal, lightDirection\)/);
});

test("sphere renderer uses repeatable mipmapped texture sampling", () => {
  assert.ok(existsSync(controllerPath), "sphere controller must exist");
  const source = readFileSync(controllerPath, "utf8");

  assert.match(source, /gl\.REPEAT/);
  assert.doesNotMatch(
    source,
    /fract\(longitude \/ \(2\.0 \* PI\) \+ 0\.5\)/,
    "continuous longitude must reach the repeat sampler without a derivative-breaking fract seam",
  );
  assert.match(source, /longitude \/ \(2\.0 \* PI\) \+ 0\.5/);
  assert.match(source, /gl\.LINEAR_MIPMAP_LINEAR/);
  assert.match(source, /gl\.generateMipmap/);
  assert.match(
    source,
    /Math\.min\([\s\S]*?window\.devicePixelRatio \|\| 1,[\s\S]*?options\.maxDevicePixelRatio/,
  );
});
