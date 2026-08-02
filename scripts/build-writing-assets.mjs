import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const celestialSource = resolve(
  projectRoot,
  "design-source/writing/celestial-map-source.png",
);
const moonSource = resolve(
  projectRoot,
  "design-source/writing/moon-phases-source.png",
);
const atlasV2Source = resolve(
  projectRoot,
  "design-source/archive-v2/writing/atlas-master.png",
);
const moonPhasesV3Source = resolve(
  projectRoot,
  "design-source/archive-v2/writing/moon-phases-v3.png",
);
const phaseNames = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

const outputPath = (path) => resolve(projectRoot, path);

async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function writeWebp(input, path, width, quality = 84) {
  const destination = outputPath(path);
  await ensureParent(destination);
  await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(destination);
}

async function writeV2Webp(input, path, resize, quality = 84) {
  const destination = outputPath(path);
  await ensureParent(destination);
  await sharp(input)
    .resize(resize)
    .webp({
      quality,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination);
}

async function buildCelestialMap() {
  await writeWebp(
    celestialSource,
    "public/assets/writing-celestial-map-1600.webp",
    1600,
    82,
  );
  await writeWebp(
    celestialSource,
    "public/assets/writing-celestial-map-2560.webp",
    2560,
    86,
  );

  const mobileCrop = await sharp(celestialSource)
    .extract({
      left: 0,
      top: 0,
      width: 1760,
      height: 1536,
    })
    .toBuffer();

  await writeWebp(
    mobileCrop,
    "public/assets/writing-celestial-map-mobile-900.webp",
    900,
    82,
  );
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function alphaBounds(alpha, width, height, padding = 12) {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha[y * width + x] < 5) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }

  if (maximumX < 0 || maximumY < 0) {
    throw new Error("Moon phase extraction produced no visible pixels.");
  }

  const left = Math.max(0, minimumX - padding);
  const top = Math.max(0, minimumY - padding);
  const right = Math.min(width - 1, maximumX + padding);
  const bottom = Math.min(height - 1, maximumY + padding);

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

async function buildMoonPhases() {
  const crop = {
    left: 280,
    top: 590,
    width: 2200,
    height: 360,
  };
  const { data, info } = await sharp(moonSource)
    .extract(crop)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  const alpha = new Uint8Array(info.width * info.height);

  for (let index = 0; index < alpha.length; index += 1) {
    const sourceOffset = index * 3;
    const outputOffset = index * 4;
    const red = data[sourceOffset];
    const green = data[sourceOffset + 1];
    const blue = data[sourceOffset + 2];
    const luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    const darkness = 222 - luminance;
    const extractedOpacity = clamp((darkness - 7) * 2.25, 0, 255);
    const opacity = extractedOpacity < 24 ? 0 : extractedOpacity;

    rgba[outputOffset] = 77;
    rgba[outputOffset + 1] = 68;
    rgba[outputOffset + 2] = 56;
    rgba[outputOffset + 3] = Math.round(opacity);
    alpha[index] = Math.round(opacity);
  }

  const bounds = alphaBounds(alpha, info.width, info.height);
  const masterPath = outputPath(
    "design-source/writing/moon-phases-cutout.png",
  );
  await ensureParent(masterPath);

  await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(masterPath);

  await writeWebp(
    masterPath,
    "public/assets/writing-moon-phases-640.webp",
    640,
    88,
  );
  await writeWebp(
    masterPath,
    "public/assets/writing-moon-phases-1200.webp",
    1200,
    90,
  );

  return bounds;
}

async function buildArticleSectionPhases(phaseStripPath) {
  const phaseMetadata = await sharp(phaseStripPath).metadata();
  if (!phaseMetadata.width || !phaseMetadata.height) {
    throw new Error("Moon phase strip is missing dimensions.");
  }

  const phaseBoundsAt1200x203 = [
    { left: 114, top: 26, width: 83, height: 148 },
    { left: 238, top: 27, width: 99, height: 146 },
    { left: 363, top: 26, width: 119, height: 147 },
    { left: 503, top: 26, width: 147, height: 147 },
    { left: 669, top: 26, width: 120, height: 147 },
    { left: 816, top: 27, width: 98, height: 146 },
  ];
  const horizontalScale = phaseMetadata.width / 1200;
  const verticalScale = phaseMetadata.height / 203;
  const sourcePadding = 4;

  for (const [outputIndex, bounds] of phaseBoundsAt1200x203.entries()) {
    const left = Math.max(
      0,
      Math.floor((bounds.left - sourcePadding) * horizontalScale),
    );
    const top = Math.max(
      0,
      Math.floor((bounds.top - sourcePadding) * verticalScale),
    );
    const right = Math.min(
      phaseMetadata.width,
      Math.ceil(
        (bounds.left + bounds.width + sourcePadding) * horizontalScale,
      ),
    );
    const bottom = Math.min(
      phaseMetadata.height,
      Math.ceil(
        (bounds.top + bounds.height + sourcePadding) * verticalScale,
      ),
    );
    const destination = outputPath(
      `public/assets/article-section-phase-${outputIndex + 1}.webp`,
    );

    await ensureParent(destination);
    await sharp(phaseStripPath)
      .extract({
        left,
        top,
        width: right - left,
        height: bottom - top,
      })
      .resize(64, 64, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 92, effort: 6 })
      .toFile(destination);
  }
}

async function buildV2Phases() {
  const metadata = await sharp(moonPhasesV3Source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Independent moon phase master is missing dimensions.");
  }
  const rowTopRatios = [260 / 1536, 690 / 1536];
  const rowHeightRatio = 410 / 1536;

  for (let phase = 0; phase < phaseNames.length; phase += 1) {
    const column = phase % 4;
    const row = Math.floor(phase / 4);
    const left = Math.round((column * metadata.width) / 4);
    const right = Math.round(((column + 1) * metadata.width) / 4);
    const top = Math.round(rowTopRatios[row] * metadata.height);
    const height = Math.round(rowHeightRatio * metadata.height);
    const destination = outputPath(
      `public/assets/writing-phase-v2-${phase}-${phaseNames[phase]}.webp`,
    );
    await ensureParent(destination);
    const cell = await sharp(moonPhasesV3Source)
      .extract({ left, top, width: right - left, height })
      .png()
      .toBuffer();
    const refinedMoon = await sharp(cell)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(196, 196, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: 30,
        bottom: 30,
        left: 30,
        right: 30,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (
      let offset = 0;
      offset < refinedMoon.data.length;
      offset += refinedMoon.info.channels
    ) {
      const sourceAlpha = refinedMoon.data[offset + 3];
      if (sourceAlpha === 0) continue;
      const luminance =
        refinedMoon.data[offset] * 0.2126 +
        refinedMoon.data[offset + 1] * 0.7152 +
        refinedMoon.data[offset + 2] * 0.0722;
      const tonalOpacity =
        0.025 +
        0.975 * Math.pow(clamp((luminance - 10) / 185, 0, 1), 1.6);
      refinedMoon.data[offset + 3] = Math.round(sourceAlpha * tonalOpacity);
    }

    await sharp(refinedMoon.data, {
      raw: {
        width: refinedMoon.info.width,
        height: refinedMoon.info.height,
        channels: refinedMoon.info.channels,
      },
    })
      .webp({ quality: 62, alphaQuality: 82, effort: 6 })
      .toFile(destination);
  }
}

async function buildV2WritingAssets() {
  await writeV2Webp(
    atlasV2Source,
    "public/assets/writing-atlas-v2-1600.webp",
    { width: 1600 },
    80,
  );
  await writeV2Webp(
    atlasV2Source,
    "public/assets/writing-atlas-v2-2560.webp",
    { width: 2560 },
    80,
  );
  await writeV2Webp(
    atlasV2Source,
    "public/assets/writing-atlas-v2-mobile-900.webp",
    { width: 900, height: 1200, fit: "cover", position: "centre" },
    78,
  );
  await buildV2Phases();
}

if (existsSync(celestialSource)) {
  await buildCelestialMap();
}

const moonBounds = existsSync(moonSource) ? await buildMoonPhases() : undefined;
const phaseStripPath = outputPath(
  "public/assets/writing-moon-phases-1200.webp",
);

if (!existsSync(phaseStripPath)) {
  throw new Error("Writing moon phase strip is missing.");
}

await buildArticleSectionPhases(phaseStripPath);

if (!existsSync(atlasV2Source) || !existsSync(moonPhasesV3Source)) {
  throw new Error("Writing archive v2 source masters are missing.");
}

await buildV2WritingAssets();

console.log(
  moonBounds
    ? `Writing assets built. Moon crop: ${moonBounds.width}×${moonBounds.height} at ${moonBounds.left},${moonBounds.top}.`
    : "Writing section phase assets built from the existing moon strip.",
);
