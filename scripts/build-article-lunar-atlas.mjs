import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const panelPaths = process.argv.slice(2);

if (panelPaths.length !== 4) {
  throw new Error(
    "Expected four transparent panel paths: crater, ray crater, crater chain, lunar mare",
  );
}

const width = 1600;
const slotHeight = 1200;
const outputPath = fileURLToPath(
  new URL("../public/assets/article-lunar-crater-atlas-v1.webp", import.meta.url),
);

const panels = await Promise.all(
  panelPaths.map(async (panelPath, index) => ({
    input: await sharp(panelPath)
      .resize(width, slotHeight, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer(),
    left: 0,
    top: index * slotHeight,
  })),
);

await mkdir(dirname(outputPath), { recursive: true });

const result = await sharp({
  create: {
    width,
    height: slotHeight * panels.length,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(panels)
  .webp({ quality: 62, alphaQuality: 90, effort: 6 })
  .toFile(outputPath);

console.log(
  `Wrote ${outputPath} (${result.width}x${result.height}, ${result.size} bytes)`,
);
