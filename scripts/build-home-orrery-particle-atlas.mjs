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

const roles = {
  gold: { seed: 1028, color: [230, 160, 58], count: 74, spread: 0.72 },
  pearl: { seed: 2048, color: [236, 226, 202], count: 58, spread: 0.58 },
  transition: { seed: 4096, color: [164, 191, 194], count: 66, spread: 0.66 },
  blue: { seed: 8192, color: [88, 181, 239], count: 70, spread: 0.68 },
};

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

const createDrawCommands = ({ seed, color, count, spread }, scale) => {
  const random = seededRandom(seed);
  const width = 256 * scale;
  const height = 96 * scale;
  const centerY = height / 2;
  const commands = [];

  for (let index = 0; index < count; index += 1) {
    const progress = 0.035 + random() * 0.93;
    const edgeFade = Math.pow(Math.sin(progress * Math.PI), 0.55);
    const x = progress * width;
    const localSpread = height * spread * (0.48 + edgeFade * 0.52);
    const y = centerY + (random() - 0.5) * localSpread;
    const radius = (0.24 + Math.pow(random(), 2.2) * 1.18) * scale;
    const alpha = (0.16 + random() * 0.5) * edgeFade;
    const tint = color.map((channel) =>
      clampByte(channel + (random() - 0.5) * 18),
    );

    commands.push(
      `fill '${rgba(tint, alpha * 0.14)}' circle ${x.toFixed(2)},${y.toFixed(2)} ${(x + radius * 1.9).toFixed(2)},${y.toFixed(2)}`,
      `fill '${rgba(tint, alpha)}' circle ${x.toFixed(2)},${y.toFixed(2)} ${(x + radius).toFixed(2)},${y.toFixed(2)}`,
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

const outputParticleStrip = async (role, config, scale) => {
  const width = 256 * scale;
  const height = 96 * scale;
  const output = resolve(
    outputRoot,
    `home-orrery-particles-${role}-${width}.webp`,
  );
  await execFileAsync("magick", [
    "-size",
    `${width}x${height}`,
    "xc:none",
    "-draw",
    createDrawCommands(config, scale),
    "-channel",
    "RGBA",
    "-blur",
    `0x${0.28 * scale}`,
    "-define",
    "webp:lossless=true",
    "-quality",
    "88",
    output,
  ]);
};

await ensureImageMagick();
await mkdir(outputRoot, { recursive: true });

for (const [role, config] of Object.entries(roles)) {
  await outputParticleStrip(role, config, 1);
  await outputParticleStrip(role, config, 2);
}
