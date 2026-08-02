import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const source = resolve(
  projectRoot,
  "design-source/projects/glow-earth-source.png",
);
const earthSurfaceSource = resolve(
  projectRoot,
  "design-source/projects/earth-surface-generated.png",
);
const earthFrameDirectory = resolve(
  projectRoot,
  "design-source/projects/earth-frames",
);
const earthGeneratedMidframeDirectory = resolve(
  projectRoot,
  "design-source/projects/earth-generated-midframes",
);
const earthKeyframeCount = 12;
const earthCanvasWidth = 2048;
const earthTargetBrightness = 116;
const earthCrop = {
  left: 0,
  top: 0,
  width: 256,
  height: 1152,
};
const earthForegroundSeed = 12;
const earthForegroundFloor = 4;
const earthBlackPoint = 3;
const archiveSourceDirectory = resolve(
  projectRoot,
  "design-source/archive-v2/projects",
);
const archiveSpaceSource = resolve(archiveSourceDirectory, "space-master.png");
const archiveEarthSource = resolve(
  archiveSourceDirectory,
  "earth-surface-master.png",
);
const archiveImpressionistEarthDirectory = resolve(
  archiveSourceDirectory,
  "earth-impressionist",
);
const archiveImpressionistEarthSource = resolve(
  archiveImpressionistEarthDirectory,
  "candidate-oil.png",
);
const archiveImpressionistEarthMaster = resolve(
  archiveImpressionistEarthDirectory,
  "earth-oil-master.png",
);
const archiveSatelliteSource = resolve(
  archiveSourceDirectory,
  "satellite-master.png",
);
const archiveEarthFrameCount = 12;

async function writeWebp(input, path, options) {
  const destination = resolve(projectRoot, path);
  await mkdir(dirname(destination), { recursive: true });
  await sharp(input)
    .resize(options)
    .webp({ quality: 86, effort: 6, smartSubsample: true })
    .toFile(destination);
}

async function writeArchiveWebp(input, path, options, webpOptions = {}) {
  const destination = resolve(projectRoot, path);
  await mkdir(dirname(destination), { recursive: true });
  await sharp(input)
    .resize(options)
    .webp({
      quality: 84,
      alphaQuality: 92,
      effort: 6,
      smartSubsample: true,
      ...webpOptions,
    })
    .toFile(destination);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function sampleWrappedBilinear(data, info, u, v) {
  const wrappedU = ((u % 1) + 1) % 1;
  const clampedV = clamp01(v);
  const sourceX = wrappedU * (info.width - 1);
  const sourceY = clampedV * (info.height - 1);
  const x0 = Math.floor(sourceX);
  const y0 = Math.floor(sourceY);
  const x1 = (x0 + 1) % info.width;
  const y1 = Math.min(info.height - 1, y0 + 1);
  const mixX = sourceX - x0;
  const mixY = sourceY - y0;
  const offset00 = (y0 * info.width + x0) * info.channels;
  const offset10 = (y0 * info.width + x1) * info.channels;
  const offset01 = (y1 * info.width + x0) * info.channels;
  const offset11 = (y1 * info.width + x1) * info.channels;
  const color = [0, 0, 0];

  for (let channel = 0; channel < 3; channel += 1) {
    const top =
      data[offset00 + channel] * (1 - mixX) +
      data[offset10 + channel] * mixX;
    const bottom =
      data[offset01 + channel] * (1 - mixX) +
      data[offset11 + channel] * mixX;
    color[channel] = top * (1 - mixY) + bottom * mixY;
  }

  return color;
}

function projectArchiveEarth(
  surface,
  rotation,
  { width, height, sphereDiameter },
) {
  const radius = sphereDiameter / 2;
  const rightCropOffset = sphereDiameter - width;
  const verticalOffset = (height - sphereDiameter) / 2;
  const rgba = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sphereX = x + rightCropOffset;
      const sphereY = y - verticalOffset;
      const normalizedX = (sphereX - radius) / radius;
      const normalizedY = (sphereY - radius) / radius;
      const radiusSquared =
        normalizedX * normalizedX + normalizedY * normalizedY;
      const targetOffset = (y * width + x) * 4;

      if (radiusSquared > 1) continue;

      const surfaceZ = Math.sqrt(1 - radiusSquared);
      const latitude = Math.asin(-normalizedY);
      const longitude = Math.atan2(normalizedX, surfaceZ) + rotation;
      const u = longitude / (Math.PI * 2) + 0.5;
      const v = 0.5 - latitude / Math.PI;
      const sampled = sampleWrappedBilinear(
        surface.data,
        surface.info,
        u,
        v,
      );
      const diffuse = clamp01(
        0.56 + surfaceZ * 0.36 + normalizedX * 0.18 - normalizedY * 0.04,
      );
      const limb = clamp01((0.2 - surfaceZ) / 0.2);
      const edgeDistance = 1 - Math.sqrt(radiusSquared);
      const alpha = smoothstep(edgeDistance / 0.008);

      rgba[targetOffset] = Math.min(
        255,
        Math.round(sampled[0] * diffuse + limb * 5),
      );
      rgba[targetOffset + 1] = Math.min(
        255,
        Math.round(sampled[1] * diffuse + limb * 22),
      );
      rgba[targetOffset + 2] = Math.min(
        255,
        Math.round(sampled[2] * diffuse + limb * 58),
      );
      rgba[targetOffset + 3] = Math.round(alpha * 255);
    }
  }

  return rgba;
}

async function writeArchiveEarthFrame(
  surface,
  index,
  dimensions = { width: 256, height: 1152, sphereDiameter: 1152 },
  outputPath = `public/assets/projects-earth-v2/earth-${String(index).padStart(2, "0")}.webp`,
) {
  const rgba = projectArchiveEarth(
    surface,
    (index / archiveEarthFrameCount) * Math.PI * 2,
    dimensions,
  );
  const destination = resolve(projectRoot, outputPath);
  await mkdir(dirname(destination), { recursive: true });
  await sharp(rgba, {
    raw: {
      width: dimensions.width,
      height: dimensions.height,
      channels: 4,
    },
  })
    .webp({
      quality: 82,
      alphaQuality: 94,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination);
}

function findEarthRightEdge(data, info) {
  let rightEdge = 0;
  const scanWidth = Math.min(info.width, 512);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < scanWidth; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const peak = Math.max(
        data[offset],
        data[offset + 1],
        data[offset + 2],
      );

      if (peak > 9) rightEdge = Math.max(rightEdge, x);
    }
  }

  return rightEdge;
}

function smoothstep(value) {
  const normalized = Math.max(0, Math.min(1, value));
  return normalized * normalized * (3 - 2 * normalized);
}

async function writeSeamlessImpressionistEarthMaster() {
  const { data, info } = await sharp(archiveImpressionistEarthSource)
    .resize({ width: 2048, height: 1024, fit: "fill" })
    .removeAlpha()
    .modulate({ brightness: 0.82, saturation: 0.92 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.from(data);
  const seamWidth = 128;

  for (let y = 0; y < info.height; y += 1) {
    for (let distance = 0; distance < seamWidth; distance += 1) {
      const blend = smoothstep(distance / (seamWidth - 1));
      const leftPixel = y * info.width + distance;
      const rightPixel = y * info.width + (info.width - 1 - distance);

      for (let channel = 0; channel < 3; channel += 1) {
        const leftIndex = leftPixel * info.channels + channel;
        const rightIndex = rightPixel * info.channels + channel;
        const average = (data[leftIndex] + data[rightIndex]) / 2;
        output[leftIndex] = Math.round(
          average * (1 - blend) + data[leftIndex] * blend,
        );
        output[rightIndex] = Math.round(
          average * (1 - blend) + data[rightIndex] * blend,
        );
      }
    }
  }

  await mkdir(dirname(archiveImpressionistEarthMaster), { recursive: true });
  await sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(archiveImpressionistEarthMaster);
}

async function readFullEarthFrame(sourcePath) {
  return sharp(sourcePath)
    .resize({
      width: earthCanvasWidth,
      height: earthCrop.height,
      fit: "fill",
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function readKeyframe(index) {
  const sourcePath = resolve(
    earthFrameDirectory,
    `earth-${String(index).padStart(2, "0")}.png`,
  );
  const fullFrame = await readFullEarthFrame(sourcePath);

  return {
    sourcePath,
    rightEdge: findEarthRightEdge(fullFrame.data, fullFrame.info),
  };
}

async function readCroppedKeyframe(sourcePath) {
  return sharp(sourcePath)
    .extract(earthCrop)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function readNormalizedMidframe(index, targetRightEdge) {
  const sourcePath = resolve(
    earthGeneratedMidframeDirectory,
    `earth-mid-${String(index).padStart(2, "0")}.png`,
  );
  const fullFrame = await readFullEarthFrame(sourcePath);
  const generatedRightEdge = findEarthRightEdge(fullFrame.data, fullFrame.info);
  const sourceWidth = Math.min(earthCanvasWidth, generatedRightEdge + 8);
  const targetWidth = Math.min(earthCrop.width, targetRightEdge + 8);

  return sharp(fullFrame.data, {
    raw: {
      width: fullFrame.info.width,
      height: fullFrame.info.height,
      channels: fullFrame.info.channels,
    },
  })
    .extract({
      left: 0,
      top: 0,
      width: sourceWidth,
      height: earthCrop.height,
    })
    .resize({
      width: targetWidth,
      height: earthCrop.height,
      fit: "fill",
    })
    .extend({
      top: 0,
      right: earthCrop.width - targetWidth,
      bottom: 0,
      left: 0,
      background: { r: 0, g: 0, b: 0 },
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

function createTransparentEarthRgba(data, info, brightnessScale = 1) {
  const pixelCount = info.width * info.height;
  const rgb = new Uint8Array(pixelCount * 3);
  const peaks = new Uint8Array(pixelCount);
  const foreground = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const sourceIndex = pixel * info.channels;
    const targetIndex = pixel * 3;
    const red = Math.min(
      255,
      Math.round(data[sourceIndex] * brightnessScale),
    );
    const green = Math.min(
      255,
      Math.round(data[sourceIndex + 1] * brightnessScale),
    );
    const blue = Math.min(
      255,
      Math.round(data[sourceIndex + 2] * brightnessScale),
    );
    const peak = Math.max(red, green, blue);

    rgb[targetIndex] = red;
    rgb[targetIndex + 1] = green;
    rgb[targetIndex + 2] = blue;
    peaks[pixel] = peak;

    if (peak >= earthForegroundSeed) {
      foreground[pixel] = 1;
      queue[queueEnd] = pixel;
      queueEnd += 1;
    }
  }

  while (queueStart < queueEnd) {
    const pixel = queue[queueStart];
    queueStart += 1;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);

    for (
      let neighborY = Math.max(0, y - 1);
      neighborY <= Math.min(info.height - 1, y + 1);
      neighborY += 1
    ) {
      for (
        let neighborX = Math.max(0, x - 1);
        neighborX <= Math.min(info.width - 1, x + 1);
        neighborX += 1
      ) {
        const neighbor = neighborY * info.width + neighborX;

        if (
          foreground[neighbor] === 0 &&
          peaks[neighbor] >= earthForegroundFloor
        ) {
          foreground[neighbor] = 1;
          queue[queueEnd] = neighbor;
          queueEnd += 1;
        }
      }
    }
  }

  const rgba = Buffer.alloc(pixelCount * 4);
  const alphaRange = earthForegroundSeed - earthBlackPoint;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (foreground[pixel] === 0) continue;

    const sourceIndex = pixel * 3;
    const targetIndex = pixel * 4;
    const alpha = smoothstep(
      (peaks[pixel] - earthBlackPoint) / alphaRange,
    );

    rgba[targetIndex] = rgb[sourceIndex];
    rgba[targetIndex + 1] = rgb[sourceIndex + 1];
    rgba[targetIndex + 2] = rgb[sourceIndex + 2];
    rgba[targetIndex + 3] = Math.round(alpha * 255);
  }

  return rgba;
}

async function writeEarthFrame(frame, index) {
  const destination = resolve(
    projectRoot,
    `public/assets/projects-earth-frames/earth-${String(index).padStart(2, "0")}.webp`,
  );
  const { data, info } = frame;
  let brightnessTotal = 0;
  let brightnessPixels = 0;

  for (let sourceIndex = 0; sourceIndex < data.length; sourceIndex += 3) {
    const red = data[sourceIndex];
    const green = data[sourceIndex + 1];
    const blue = data[sourceIndex + 2];
    const peak = Math.max(red, green, blue);

    if (peak > 18) {
      brightnessTotal += red * 0.2126 + green * 0.7152 + blue * 0.0722;
      brightnessPixels += 1;
    }
  }

  const measuredBrightness =
    brightnessPixels > 0 ? brightnessTotal / brightnessPixels : earthTargetBrightness;
  const brightnessScale = Math.max(
    0.9,
    Math.min(1.3, earthTargetBrightness / measuredBrightness),
  );
  const rgba = createTransparentEarthRgba(data, info, brightnessScale);

  await mkdir(dirname(destination), { recursive: true });
  await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .webp({
      quality: 90,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination);
}

async function writeEarthKeyframe(frame, index) {
  const destination = resolve(
    projectRoot,
    `public/assets/projects-earth-keyframes/earth-${String(index).padStart(2, "0")}.webp`,
  );
  const { data, info } = frame;
  const rgba = createTransparentEarthRgba(data, info);

  await mkdir(dirname(destination), { recursive: true });
  await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .webp({
      quality: 92,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination);
}

let legacySourcesAvailable = true;
try {
  await Promise.all([
    access(source),
    access(earthSurfaceSource),
    access(earthFrameDirectory),
    access(earthGeneratedMidframeDirectory),
  ]);
} catch {
  legacySourcesAvailable = false;
}

if (legacySourcesAvailable) {
  await writeWebp(source, "public/assets/projects-glow-earth-1600.webp", {
    width: 1600,
    withoutEnlargement: true,
  });

  await writeWebp(source, "public/assets/projects-glow-earth-2048.webp", {
    width: 2048,
    withoutEnlargement: true,
  });

  await writeWebp(
    earthSurfaceSource,
    "public/assets/projects-earth-surface-2048.webp",
    {
      width: 2048,
      height: 1024,
      fit: "fill",
    },
  );

  await writeWebp(
    await sharp(source)
      .extract({
        left: 0,
        top: 0,
        width: 1040,
        height: 1152,
      })
      .toBuffer(),
    "public/assets/projects-glow-earth-mobile-900.webp",
    {
      width: 900,
      withoutEnlargement: true,
    },
  );

  const keyframes = await Promise.all(
    Array.from({ length: earthKeyframeCount }, (_, index) => readKeyframe(index)),
  );

  for (let index = 0; index < earthKeyframeCount; index += 1) {
    const nextIndex = (index + 1) % earthKeyframeCount;
    const targetRightEdge = Math.round(
      (keyframes[index].rightEdge + keyframes[nextIndex].rightEdge) / 2,
    );
    const originalFrame = await readCroppedKeyframe(keyframes[index].sourcePath);

    await writeEarthFrame(originalFrame, index * 2);
    await writeEarthKeyframe(originalFrame, index);
    await writeEarthFrame(
      await readNormalizedMidframe(index, targetRightEdge),
      index * 2 + 1,
    );
  }
}

await writeArchiveWebp(
  archiveSpaceSource,
  "public/assets/projects-space-v2-1600.webp",
  { width: 1600, height: 900, fit: "cover" },
  { quality: 82 },
);
await writeArchiveWebp(
  archiveSpaceSource,
  "public/assets/projects-space-v2-2560.webp",
  { width: 2560, height: 1440, fit: "cover" },
  { quality: 82 },
);
await writeArchiveWebp(
  archiveSpaceSource,
  "public/assets/projects-space-v2-mobile-900.webp",
  { width: 900, height: 1200, fit: "cover", position: "centre" },
  { quality: 80 },
);

const archiveEarthSurface = await sharp(archiveEarthSource)
  .resize({ width: 2048, height: 1024, fit: "fill" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let index = 0; index < archiveEarthFrameCount; index += 1) {
  await writeArchiveEarthFrame(archiveEarthSurface, index);
}

await writeArchiveEarthFrame(
  archiveEarthSurface,
  0,
  { width: 180, height: 760, sphereDiameter: 760 },
  "public/assets/projects-earth-v2-mobile.webp",
);

await writeSeamlessImpressionistEarthMaster();
const impressionistEarthSurface = await sharp(archiveImpressionistEarthMaster)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let index = 0; index < archiveEarthFrameCount; index += 1) {
  await writeArchiveEarthFrame(
    impressionistEarthSurface,
    index,
    { width: 256, height: 1152, sphereDiameter: 1152 },
    `public/assets/projects-earth-v3/earth-${String(index).padStart(2, "0")}.webp`,
  );
}

await writeArchiveEarthFrame(
  impressionistEarthSurface,
  0,
  { width: 180, height: 760, sphereDiameter: 760 },
  "public/assets/projects-earth-v3-mobile.webp",
);

const satelliteTrimmed = await sharp(archiveSatelliteSource)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
await writeArchiveWebp(
  satelliteTrimmed,
  "public/assets/projects-satellite-v2.webp",
  {
    width: 640,
    height: 640,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
  { quality: 84, alphaQuality: 96 },
);

console.log(
  `Projects legacy assets plus archive-v2 space/satellite and archive-v3 ${archiveEarthFrameCount}-frame painterly Earth built.`,
);
