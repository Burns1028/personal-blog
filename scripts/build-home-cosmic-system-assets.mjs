import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(projectRoot, "design-source/home-cosmic-system");
const outputRoot = resolve(projectRoot, "public/assets/home-cosmic-system-v2");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const antiqueGold = { r: 218, g: 167, b: 76 };

await mkdir(outputRoot, { recursive: true });

const source = (filename) => resolve(sourceRoot, filename);
const output = (filename) => resolve(outputRoot, filename);

async function writeTransparent({
  input,
  filename,
  width,
  height,
  quality,
  tint,
}) {
  let pipeline = sharp(source(input)).ensureAlpha();

  if (tint) pipeline = pipeline.tint(tint);

  const target = output(filename);
  await pipeline
    .resize({
      width,
      height,
      fit: "contain",
      background: transparent,
      withoutEnlargement: false,
    })
    .webp({
      quality,
      alphaQuality: 70,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(target);
  console.log(`${filename}: ${width}×${height}`);
}

async function writeOpaque({ input, filename, width, height, quality }) {
  const target = output(filename);
  await sharp(source(input))
    .resize({ width, height, fit: "fill", withoutEnlargement: false })
    .modulate({ brightness: 0.88, saturation: 0.86 })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(target);
  console.log(`${filename}: ${width}×${height}`);
}

const jobs = [
  ...[960, 1600].map((width) =>
    writeTransparent({
      input: "main-stardust-v2.png",
      filename: `home-cosmos-stardust-main-v2-${width}.webp`,
      width,
      height: width / 2,
      quality: width === 1600 ? 48 : 42,
      tint: antiqueGold,
    }),
  ),
  ...[960, 1600].map((width) =>
    writeTransparent({
      input: "near-dust-v2.png",
      filename: `home-cosmos-dust-near-v2-${width}.webp`,
      width,
      height: width / 2,
      quality: 45,
      tint: antiqueGold,
    }),
  ),
  ...[480, 960].map((size) =>
    writeTransparent({
      input: "writing-moon-v2.png",
      filename: `home-cosmos-writing-moon-v2-${size}.webp`,
      width: size,
      height: size,
      quality: size === 960 ? 68 : 64,
    }),
  ),
  writeOpaque({
    input: "projects-earth-surface-v2.png",
    filename: "home-cosmos-projects-earth-surface-v2-1024.webp",
    width: 1024,
    height: 512,
    quality: 50,
  }),
  writeOpaque({
    input: "projects-earth-surface-v2.png",
    filename: "home-cosmos-projects-earth-surface-v2-2048.webp",
    width: 2048,
    height: 1024,
    quality: 52,
  }),
  ...[480, 960].map((size) =>
    writeTransparent({
      input: "projects-earth-atmosphere-v2.png",
      filename: `home-cosmos-projects-earth-atmosphere-v2-${size}.webp`,
      width: size,
      height: size,
      quality: 50,
    }),
  ),
  ...[480, 960].map((size) =>
    writeTransparent({
      input: "ideas-core-v2.png",
      filename: `home-cosmos-ideas-core-v2-${size}.webp`,
      width: size,
      height: size,
      quality: size === 960 ? 56 : 48,
      tint: antiqueGold,
    }),
  ),
  ...[960, 1600].map((width) =>
    writeTransparent({
      input: "ideas-warp-v2.png",
      filename: `home-cosmos-ideas-warp-v2-${width}.webp`,
      width,
      height: Math.round(width * 0.5625),
      quality: width === 1600 ? 50 : 42,
      tint: antiqueGold,
    }),
  ),
  ...[320, 640].map((size) =>
    writeTransparent({
      input: "satellite-v2.png",
      filename: `home-cosmos-satellite-v2-${size}.webp`,
      width: size,
      height: size,
      quality: size === 640 ? 66 : 60,
    }),
  ),
];

await Promise.all(jobs);
