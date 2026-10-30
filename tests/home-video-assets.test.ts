import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { homeCelestialRegions as atlas } from "../src/data/home-celestial-regions.ts";

const root = resolve(import.meta.dirname, "..");
const asset = (name: string) => resolve(root, "public/assets/home-celestials-v8", name);

test("native-size subject posters retain dark interiors without green fringes or clipped edges", async () => {
  for (const [name, { region: [, , width, height], source }] of Object.entries(atlas.subjects)) {
    const path = asset(`${name}-${width}.webp`);
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, width);
    assert.equal(info.height, height);
    assert.equal(width, source[2], "source detail is not downscaled");
    const alpha = (x: number, y: number) => data[(y * width + x) * 4 + 3];
    assert.ok(alpha(width / 2, height / 2) > 250, `${name} dark center stays opaque`);
    for (let x = 0; x < width; x++) { assert.ok(alpha(x, 0) < 4); assert.ok(alpha(x, height - 1) < 4); }
    for (let y = 0; y < height; y++) { assert.ok(alpha(0, y) < 4); assert.ok(alpha(width - 1, y) < 4); }
    let green = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 30 && data[i + 1] > Math.max(data[i], data[i + 2]) + 50) green++;
    assert.ok(green < 20, `${name} has ${green} visible green pixels`);
    assert.ok(statSync(path).size < 150_000);
  }
});

test("packed subject regions stay inside the atlas without overlapping", () => {
  const regions = Object.values(atlas.subjects).map(({ region }) => region);
  for (const [i, [x, y, width, height]] of regions.entries()) {
    assert.ok(x >= 0 && y >= 0 && x + width <= atlas.width && y + height <= atlas.height);
    for (const [otherX, otherY, otherWidth, otherHeight] of regions.slice(i + 1)) {
      assert.ok(x + width <= otherX || otherX + otherWidth <= x || y + height <= otherY || otherY + otherHeight <= y);
    }
  }
});

test("homepage playback is a bounded H.264 asset with a fast-start header", () => {
  const data = readFileSync(asset("scene-alpha-packed.mp4"));
  assert.ok(data.length < 3_200_000, `video uses ${data.length} bytes`);
  assert.ok(data.indexOf(Buffer.from("moov")) < data.indexOf(Buffer.from("mdat")));
});
