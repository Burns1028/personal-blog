import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const kinds = ["writing", "projects", "ideas"];
const sizes = [480, 960];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

for (const kind of kinds) {
  const masterPath = resolve(
    projectRoot,
    `design-source/home-orrery/${kind}-planet-master.png`,
  );
  const trimmed = await sharp(masterPath)
    .trim({ background: transparent })
    .png({ compressionLevel: 9 })
    .toBuffer();

  for (const size of sizes) {
    const subjectSize = Math.round(size * 0.9);
    const padding = size - subjectSize;
    const before = Math.floor(padding / 2);
    const after = padding - before;
    const outputPath = resolve(
      projectRoot,
      `public/assets/home-planet-${kind}-v1-${size}.webp`,
    );

    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(trimmed)
      .resize({
        width: subjectSize,
        height: subjectSize,
        fit: "contain",
        background: transparent,
        withoutEnlargement: false,
      })
      .extend({
        top: before,
        right: after,
        bottom: after,
        left: before,
        background: transparent,
      })
      .webp({
        quality: 88,
        alphaQuality: 100,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(outputPath);

    console.log(`${kind}: ${size}×${size} -> ${outputPath}`);
  }
}
