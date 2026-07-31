import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const atlasPath = join(
  projectRoot,
  "public/assets/article-lunar-crater-atlas-v1.webp",
);

test("article lunar atlas satisfies the image delivery contract", async () => {
  const file = statSync(atlasPath);
  const metadata = await sharp(atlasPath).metadata();

  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 4800);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.hasAlpha, true);
  assert.ok(file.size <= 900 * 1024, `atlas is ${file.size} bytes`);
});
