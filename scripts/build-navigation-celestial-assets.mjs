import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const sourceRoot = resolve(projectRoot, "design-source/navigation-celestials");
const outputRoot = resolve(
  projectRoot,
  "public/assets/navigation-celestials",
);

const assets = [
  {
    source: "nav-writing-moon-v1-alpha.png",
    outputs: [
      {
        filename: "nav-writing-moon-v1-64.webp",
        contentWidth: 56,
        contentHeight: 56,
        paddingX: 4,
        paddingY: 4,
      },
      {
        filename: "nav-writing-moon-v1-128.webp",
        contentWidth: 112,
        contentHeight: 112,
        paddingX: 8,
        paddingY: 8,
      },
    ],
  },
  {
    source: "nav-projects-earth-v1-alpha.png",
    outputs: [
      {
        filename: "nav-projects-earth-v1-64.webp",
        contentWidth: 56,
        contentHeight: 56,
        paddingX: 4,
        paddingY: 4,
      },
      {
        filename: "nav-projects-earth-v1-128.webp",
        contentWidth: 112,
        contentHeight: 112,
        paddingX: 8,
        paddingY: 8,
      },
    ],
  },
  {
    source: "nav-ideas-black-hole-v2-alpha.png",
    outputs: [
      {
        filename: "nav-ideas-black-hole-v2-80.webp",
        contentWidth: 72,
        contentHeight: 56,
        paddingX: 4,
        paddingY: 4,
      },
      {
        filename: "nav-ideas-black-hole-v2-160.webp",
        contentWidth: 144,
        contentHeight: 112,
        paddingX: 8,
        paddingY: 8,
      },
    ],
  },
];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir(outputRoot, { recursive: true });

for (const asset of assets) {
  const trimmed = await sharp(resolve(sourceRoot, asset.source))
    .trim({ background: transparent, threshold: 1 })
    .png()
    .toBuffer();

  for (const output of asset.outputs) {
    const target = resolve(outputRoot, output.filename);

    await sharp(trimmed)
      .resize({
        width: output.contentWidth,
        height: output.contentHeight,
        fit: "contain",
        background: transparent,
      })
      .extend({
        top: output.paddingY,
        right: output.paddingX,
        bottom: output.paddingY,
        left: output.paddingX,
        background: transparent,
      })
      .webp({ quality: 92, alphaQuality: 100, smartSubsample: true })
      .toFile(target);

    console.log(`Wrote ${output.filename}`);
  }
}
