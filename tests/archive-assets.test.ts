import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { archiveAssets } from "../src/data/archive-assets.ts";

const root = resolve(import.meta.dirname, "..");

test("approved archive mockups remain in the repository", () => {
  assert.ok(existsSync(resolve(root, archiveAssets.references.writing)));
  assert.ok(existsSync(resolve(root, archiveAssets.references.projects)));
});

test("archive asset manifest names every production output", () => {
  assert.equal(archiveAssets.writing.phases.length, 8);
  assert.equal(
    archiveAssets.writing.atlas.desktop2x,
    "/assets/writing-atlas-v2-2560.webp",
  );
  assert.equal(archiveAssets.projects.earth.frameCount, 12);
  assert.equal(
    archiveAssets.projects.earth.fallback,
    "/assets/projects-earth-v3/earth-00.webp",
  );
  assert.equal(
    archiveAssets.projects.earth.mobile,
    "/assets/projects-earth-v3-mobile.webp",
  );
  assert.equal(
    archiveAssets.projects.satellite,
    "/assets/projects-satellite-v2.webp",
  );
});

test("Writing production assets meet dimensions and byte budgets", async () => {
  const expected = [
    ["public/assets/writing-atlas-v2-1600.webp", 1600, 550_000],
    ["public/assets/writing-atlas-v2-2560.webp", 2560, 750_000],
    ["public/assets/writing-atlas-v2-mobile-900.webp", 900, 280_000],
  ] as const;

  for (const [path, width, budget] of expected) {
    const absolute = resolve(root, path);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, width);
    assert.ok(statSync(absolute).size <= budget, `${path} exceeds ${budget}`);
  }

  for (const phase of archiveAssets.writing.phases) {
    const absolute = resolve(root, `public${phase}`);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, 256);
    assert.equal(metadata.height, 256);
    assert.ok(metadata.hasAlpha, `${phase} must preserve transparency`);
    assert.ok(statSync(absolute).size <= 28_000, `${phase} exceeds 28KB`);

    const { data, info } = await sharp(absolute)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let y = 0; y < 32; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        const corners = [
          [x, y],
          [info.width - 1 - x, y],
          [x, info.height - 1 - y],
          [info.width - 1 - x, info.height - 1 - y],
        ];
        for (const [cornerX, cornerY] of corners) {
          assert.ok(
            data[(cornerY * info.width + cornerX) * info.channels + 3] <= 3,
            `${phase} contains opaque corner contamination`,
          );
        }
      }
    }
  }
});

test("Projects production assets meet dimensions and byte budgets", async () => {
  const expected = [
    ["public/assets/projects-space-v2-1600.webp", 1600, 450_000, false],
    ["public/assets/projects-space-v2-2560.webp", 2560, 650_000, false],
    ["public/assets/projects-space-v2-mobile-900.webp", 900, 260_000, false],
    ["public/assets/projects-earth-v3-mobile.webp", 180, 110_000, true],
    ["public/assets/projects-satellite-v2.webp", 640, 120_000, true],
  ] as const;

  for (const [path, width, budget, alpha] of expected) {
    const absolute = resolve(root, path);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, width);
    assert.equal(Boolean(metadata.hasAlpha), alpha);
    assert.ok(statSync(absolute).size <= budget, `${path} exceeds ${budget}`);
  }

  let earthFrameBytes = 0;
  const earthFrameDigests = new Set<string>();
  for (
    let index = 0;
    index < archiveAssets.projects.earth.frameCount;
    index += 1
  ) {
    const suffix = String(index).padStart(2, "0");
    const path = `public/assets/projects-earth-v3/earth-${suffix}.webp`;
    const absolute = resolve(root, path);
    const metadata = await sharp(absolute).metadata();
    assert.equal(metadata.width, 256);
    assert.equal(metadata.height, 1152);
    assert.equal(metadata.hasAlpha, true);
    const bytes = statSync(absolute).size;
    assert.ok(bytes <= 140_000, `${path} exceeds 140000`);
    const digest = await sharp(absolute)
      .resize({ width: 16, height: 72 })
      .raw()
      .toBuffer();
    earthFrameDigests.add(digest.toString("base64"));
    earthFrameBytes += bytes;
  }
  assert.ok(
    earthFrameDigests.size >= 10,
    "Earth rotation frames are not visually distinct",
  );
  assert.ok(earthFrameBytes <= 1_600_000, "Earth frame set exceeds 1.6 MB");
});
