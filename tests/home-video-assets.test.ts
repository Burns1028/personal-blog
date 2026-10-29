import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const asset = (name: string) => resolve(root, "public/assets/home-celestials-v6", name);

test("video poster removes the green screen while keeping dark planet interiors opaque", async () => {
  const { data, info } = await sharp(asset("scene-1200.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x: number, y: number) => {
    const offset = (Math.round(y * (info.height - 1)) * info.width + Math.round(x * (info.width - 1))) * 4;
    return [...data.subarray(offset, offset + 4)];
  };
  for (const [x, y] of [[0.02, 0.02], [0.5, 0.5], [0.2, 0.8]]) assert.equal(pixel(x, y)[3], 0);
  for (const [x, y] of [[0.27, 0.27], [0.71, 0.27], [0.67, 0.72]]) assert.ok(pixel(x, y)[3] > 250);
  let greenPixels = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 30 && data[i + 1] > Math.max(data[i], data[i + 2]) + 50) greenPixels++;
  assert.ok(greenPixels < 20, `${greenPixels} visible green pixels`);
  assert.ok(statSync(asset("scene-1200.webp")).size < 180_000);
});

test("homepage playback is a bounded H.264 asset with a fast-start header", () => {
  const data = readFileSync(asset("scene-alpha-packed.mp4"));
  assert.ok(data.length < 2_000_000, `video uses ${data.length} bytes`);
  assert.ok(data.indexOf(Buffer.from("moov")) < data.indexOf(Buffer.from("mdat")));
});
