import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputRoot = resolve(
  projectRoot,
  "public/assets/home-cosmic-system-v4",
);

const resolveOutputRoot = (args) => {
  if (args.length === 0) return defaultOutputRoot;
  if (args.length !== 2 || args[0] !== "--output-root" || !args[1]) {
    throw new Error(
      "Usage: node scripts/build-home-orrery-particle-atlas.mjs [--output-root <directory>]",
    );
  }
  return resolve(args[1]);
};

const outputRoot = resolveOutputRoot(process.argv.slice(2));

const spriteColors = [
  [235, 165, 62],
  [248, 188, 86],
  [225, 132, 38],
  [255, 215, 138],
  [238, 228, 207],
  [255, 245, 222],
  [187, 203, 206],
  [155, 198, 219],
  [88, 181, 239],
  [108, 205, 255],
  [151, 220, 255],
  [204, 239, 255],
  [235, 177, 86],
  [179, 205, 221],
  [116, 191, 239],
  [220, 245, 255],
];

const seededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
const rgba = (color, alpha) =>
  `rgba(${color[0]},${color[1]},${color[2]},${alpha.toFixed(3)})`;

const createDrawCommands = (scale) => {
  const random = seededRandom(1028);
  const width = 256 * scale;
  const cellSize = width / 4;
  const commands = [];

  for (let index = 0; index < spriteColors.length; index += 1) {
    const color = spriteColors[index];
    const column = index % 4;
    const row = Math.floor(index / 4);
    const centerX = (column + 0.5) * cellSize;
    const centerY = (row + 0.5) * cellSize;
    const radius = cellSize * (0.07 + random() * 0.035);
    const horizontal = radius * (1.25 + random() * 1.4);
    const vertical = radius * (0.65 + random() * 0.45);
    const tint = color.map((channel) => clampByte(channel + (random() - 0.5) * 14));
    commands.push(
      `fill '${rgba(tint, 0.12)}' ellipse ${centerX.toFixed(2)},${centerY.toFixed(2)} ${(horizontal * 2.5).toFixed(2)},${(vertical * 2.5).toFixed(2)} 0,360`,
      `fill '${rgba(tint, 0.34)}' ellipse ${centerX.toFixed(2)},${centerY.toFixed(2)} ${(horizontal * 1.55).toFixed(2)},${(vertical * 1.55).toFixed(2)} 0,360`,
      `fill '${rgba(tint, 0.94)}' ellipse ${centerX.toFixed(2)},${centerY.toFixed(2)} ${horizontal.toFixed(2)},${vertical.toFixed(2)} 0,360`,
      `fill '${rgba([255, 250, 235], 0.72)}' circle ${centerX.toFixed(2)},${centerY.toFixed(2)} ${(centerX + radius * 0.42).toFixed(2)},${centerY.toFixed(2)}`,
    );
  }

  return commands.join(" ");
};

const ensureImageMagick = async () => {
  try {
    const { stdout } = await execFileAsync("magick", ["-version"]);
    if (!/ImageMagick 7\./.test(stdout)) {
      throw new Error("ImageMagick 7 was not detected");
    }
    if (!/Delegates[^\n]*\bwebp\b/i.test(stdout)) {
      throw new Error("the ImageMagick WebP delegate was not detected");
    }
  } catch {
    throw new Error(
      "ImageMagick 7 with WebP support is required to build the orrery particle atlas. Install it with `brew install imagemagick`.",
    );
  }
};

const outputParticleAtlas = async (scale) => {
  const size = 256 * scale;
  const output = resolve(
    outputRoot,
    `home-orrery-particle-atlas-${size}.webp`,
  );
  await execFileAsync("magick", [
    "-size",
    `${size}x${size}`,
    "xc:none",
    "-draw",
    createDrawCommands(scale),
    "-channel",
    "RGBA",
    "-blur",
    `0x${0.34 * scale}`,
    "-define",
    "webp:lossless=true",
    "-quality",
    "88",
    output,
  ]);
};

await ensureImageMagick();
await mkdir(outputRoot, { recursive: true });

await outputParticleAtlas(1);
await outputParticleAtlas(2);
