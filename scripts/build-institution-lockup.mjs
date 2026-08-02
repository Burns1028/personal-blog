import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(
  projectRoot,
  "design-source/home/peking-university-lockup-original.png",
);
const outputPath = resolve(
  projectRoot,
  "public/assets/peking-university-lockup-v1.png",
);

const { data, info } = await sharp(sourcePath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const rgba = Buffer.alloc(width * height * 4);

let sealLeft = width;
let sealTop = height;
let sealRight = 0;
let sealBottom = 0;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width * 0.31; x += 1) {
    const offset = (y * width + x) * 3;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const isSealRed =
      red > 92 && red > green * 1.45 && red > blue * 1.45;

    if (!isSealRed) continue;
    sealLeft = Math.min(sealLeft, x);
    sealTop = Math.min(sealTop, y);
    sealRight = Math.max(sealRight, x);
    sealBottom = Math.max(sealBottom, y);
  }
}

if (sealLeft >= sealRight || sealTop >= sealBottom) {
  throw new Error("Could not locate the Peking University seal.");
}

const sealCenterX = (sealLeft + sealRight) / 2;
const sealCenterY = (sealTop + sealBottom) / 2;
const sealRadiusX = (sealRight - sealLeft) / 2;
const sealRadiusY = (sealBottom - sealTop) / 2;
const darkText = { red: 184, green: 177, blue: 165 };

let contentLeft = width;
let contentTop = height;
let contentRight = 0;
let contentBottom = 0;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const sourceOffset = (y * width + x) * 3;
    const targetOffset = (y * width + x) * 4;
    const sourceRed = data[sourceOffset];
    const sourceGreen = data[sourceOffset + 1];
    const sourceBlue = data[sourceOffset + 2];
    const minimum = Math.min(sourceRed, sourceGreen, sourceBlue);
    const maximum = Math.max(sourceRed, sourceGreen, sourceBlue);
    const chroma = maximum - minimum;
    const distanceFromWhite = 255 - minimum;
    const sealDistance =
      ((x - sealCenterX) / (sealRadiusX * 0.965)) ** 2 +
      ((y - sealCenterY) / (sealRadiusY * 0.965)) ** 2;
    const insideSealPaper = sealDistance <= 1;

    let alpha = insideSealPaper ? 255 : distanceFromWhite;
    if (alpha < 4) alpha = 0;
    if (alpha > 244) alpha = 255;

    let red = sourceRed;
    let green = sourceGreen;
    let blue = sourceBlue;

    if (!insideSealPaper && alpha > 0 && alpha < 255) {
      const normalizedAlpha = alpha / 255;
      red = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            (sourceRed - 255 * (1 - normalizedAlpha)) / normalizedAlpha,
          ),
        ),
      );
      green = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            (sourceGreen - 255 * (1 - normalizedAlpha)) / normalizedAlpha,
          ),
        ),
      );
      blue = Math.max(
        0,
        Math.min(
          255,
          Math.round(
            (sourceBlue - 255 * (1 - normalizedAlpha)) / normalizedAlpha,
          ),
        ),
      );
    }

    const isNeutralEnglish =
      x > sealRight &&
      y > sealCenterY &&
      chroma < 26 &&
      minimum < 116 &&
      alpha > 0;

    if (isNeutralEnglish) {
      red = darkText.red;
      green = darkText.green;
      blue = darkText.blue;
    }

    rgba[targetOffset] = red;
    rgba[targetOffset + 1] = green;
    rgba[targetOffset + 2] = blue;
    rgba[targetOffset + 3] = alpha;

    if (alpha > 3) {
      contentLeft = Math.min(contentLeft, x);
      contentTop = Math.min(contentTop, y);
      contentRight = Math.max(contentRight, x);
      contentBottom = Math.max(contentBottom, y);
    }
  }
}

const padding = 5;
const cropLeft = Math.max(0, contentLeft - padding);
const cropTop = Math.max(0, contentTop - padding);
const cropRight = Math.min(width - 1, contentRight + padding);
const cropBottom = Math.min(height - 1, contentBottom + padding);
const cropWidth = cropRight - cropLeft + 1;
const cropHeight = cropBottom - cropTop + 1;

await mkdir(dirname(outputPath), { recursive: true });
await sharp(rgba, {
  raw: {
    width,
    height,
    channels: 4,
  },
})
  .extract({
    left: cropLeft,
    top: cropTop,
    width: cropWidth,
    height: cropHeight,
  })
  .png({
    compressionLevel: 9,
    adaptiveFiltering: true,
  })
  .toFile(outputPath);

console.log(
  `Built ${outputPath} (${cropWidth}x${cropHeight}) from ${sourcePath}`,
);
