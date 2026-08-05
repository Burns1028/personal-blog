import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(projectRoot, "design-source/home-orrery-v3");
const outputRoot = resolve(projectRoot, "public/assets/home-cosmic-system-v3");
const approvedMaster = resolve(
  projectRoot,
  "docs/superpowers/specs/assets/home-orrery-motion-approved-v1.webp",
);

await mkdir(outputRoot, { recursive: true });

const outputStarfield = async (filename, width, height, quality) => {
  await sharp(resolve(sourceRoot, "starfield-master.png"))
    .resize({ width, height, fit: "fill" })
    .removeAlpha()
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(resolve(outputRoot, filename));
};

const outputApprovedScene = async (filename, width, height, quality) => {
  const stageWidth = 881;
  const stageHeight = 732;
  const scaleX = width / stageWidth;
  const scaleY = height / stageHeight;
  const interiorWipe = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="wipe" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000" stop-opacity="1"/>
          <stop offset="86%" stop-color="#000" stop-opacity="1"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${260 * scaleX}" cy="${150 * scaleY}" rx="${60 * scaleX}" ry="${60 * scaleY}" fill="url(#wipe)"/>
      <ellipse cx="${736 * scaleX}" cy="${310 * scaleY}" rx="${134 * scaleX}" ry="${134 * scaleY}" fill="url(#wipe)"/>
      <ellipse cx="${198 * scaleX}" cy="${593 * scaleY}" rx="${50 * scaleX}" ry="${50 * scaleY}" fill="url(#wipe)"/>
    </svg>
  `);

  await sharp(approvedMaster)
    .extract({ left: 641, top: 0, width: stageWidth, height: stageHeight })
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .composite([{ input: interiorWipe, blend: "over" }])
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(resolve(outputRoot, filename));
};

const outputInnerTexture = async (
  filename,
  crop,
  horizontalPadding,
  scale,
  quality,
) => {
  const extendedTexture = await sharp(approvedMaster)
    .extract(crop)
    .extend({
      left: horizontalPadding,
      right: horizontalPadding,
      top: 0,
      bottom: 0,
      extendWith: "mirror",
    })
    .toBuffer();

  await sharp(extendedTexture)
    .resize({
      width: (crop.width + horizontalPadding * 2) * scale,
      height: crop.height * scale,
      fit: "fill",
    })
    .removeAlpha()
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(resolve(outputRoot, filename));
};

await outputStarfield("home-cosmos-starfield-v3-1280.webp", 1280, 720, 52);
await outputStarfield("home-cosmos-starfield-v3-2048.webp", 2048, 1152, 58);

await outputApprovedScene("home-cosmos-approved-scene-v9-881.webp", 881, 732, 92);
await outputApprovedScene("home-cosmos-approved-scene-v9-1762.webp", 1762, 1464, 94);

await outputInnerTexture(
  "home-cosmos-writing-moon-inner-v11-140.webp",
  { left: 843, top: 92, width: 116, height: 116 },
  12,
  1,
  94,
);
await outputInnerTexture(
  "home-cosmos-writing-moon-inner-v11-280.webp",
  { left: 843, top: 92, width: 116, height: 116 },
  12,
  2,
  96,
);
await outputInnerTexture(
  "home-cosmos-projects-earth-inner-v11-312.webp",
  { left: 1245, top: 178, width: 264, height: 264 },
  24,
  1,
  94,
);
await outputInnerTexture(
  "home-cosmos-projects-earth-inner-v11-624.webp",
  { left: 1245, top: 178, width: 264, height: 264 },
  24,
  2,
  96,
);
await outputInnerTexture(
  "home-cosmos-ideas-inner-v11-96.webp",
  { left: 791, top: 545, width: 96, height: 96 },
  0,
  1,
  94,
);
await outputInnerTexture(
  "home-cosmos-ideas-inner-v11-192.webp",
  { left: 791, top: 545, width: 96, height: 96 },
  0,
  2,
  96,
);
