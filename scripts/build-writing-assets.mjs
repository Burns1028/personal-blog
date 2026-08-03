import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const celestialSource = resolve(
  projectRoot,
  "design-source/writing/celestial-map-source.png",
);
const atlasV2Source = resolve(
  projectRoot,
  "design-source/archive-v2/writing/atlas-master.png",
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

async function buildRestoredPhases(phaseStripPath) {
  const metadata = await sharp(phaseStripPath).metadata();
  if (metadata.width !== 1200 || metadata.height !== 203) {
    throw new Error("The original lunar master must remain 1200×203.");
  }

  // Fixed isolation windows in the approved 1200×203 master. The ninth,
  // closing crescent stays in the complete strip; the date model uses eight
  // lunar stages, beginning with the master's far-left hairline crescent.
  const restoredPhaseBoundsAt1200x203 = [
    { left: 2, top: 18, width: 92, height: 170 },
    { left: 102, top: 18, width: 106, height: 164 },
    { left: 226, top: 18, width: 122, height: 164 },
    { left: 350, top: 18, width: 142, height: 164 },
    { left: 490, top: 18, width: 172, height: 168 },
    { left: 657, top: 18, width: 143, height: 164 },
    { left: 802, top: 18, width: 122, height: 164 },
    { left: 948, top: 10, width: 104, height: 172 },
  ];

  for (const [phase, bounds] of restoredPhaseBoundsAt1200x203.entries()) {
    const destination = outputPath(
      `public/assets/writing-phase-restored-v1-${phase}-${phaseNames[phase]}.webp`,
    );
    await ensureParent(destination);
    const isolatedPhase = await sharp(phaseStripPath)
      .extract(bounds)
      .png()
      .toBuffer();
    await sharp(isolatedPhase)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .resize(104, 104, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: 12,
        bottom: 12,
        left: 12,
        right: 12,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
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
}

if (existsSync(celestialSource)) {
  await buildCelestialMap();
}

const phaseStripPath = outputPath(
  "public/assets/writing-moon-phases-1200.webp",
);

if (!existsSync(phaseStripPath)) {
  throw new Error("Writing moon phase strip is missing.");
}

await buildArticleSectionPhases(phaseStripPath);
await buildRestoredPhases(phaseStripPath);

if (!existsSync(atlasV2Source)) {
  throw new Error("Writing archive atlas source master is missing.");
}

await buildV2WritingAssets();

console.log("Writing assets restored from the existing lunar master.");
