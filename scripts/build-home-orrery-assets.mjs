import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Keep the existing independent satellite and star-field sources. The approved
// mother image is used only here, as an offline visual source for deterministic
// transparent layers; the full scene is never shipped to the browser.
await import("./build-home-cosmic-system-assets.mjs");

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const starfieldSourceRoot = resolve(projectRoot, "design-source/home-orrery-v3");
const starfieldOutputRoot = resolve(projectRoot, "public/assets/home-cosmic-system-v3");
const outputRoot = resolve(projectRoot, "public/assets/home-cosmic-system-v4");
const approvedMaster = resolve(
  projectRoot,
  "docs/superpowers/specs/assets/home-orrery-motion-approved-v1.webp",
);

await mkdir(starfieldOutputRoot, { recursive: true });
await mkdir(outputRoot, { recursive: true });

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

const circleMask = (size, inset = 1) => Buffer.from(`
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - inset}" fill="white"/>
  </svg>
`);

const keyedSharp = async (input) => {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const source = pixel * info.channels;
    const target = pixel * 4;
    const red = data[source];
    const green = data[source + 1];
    const blue = data[source + 2];
    const brightness = Math.max(red, green, blue);

    if (brightness <= 8) {
      rgba[target + 3] = 0;
      continue;
    }

    // Un-premultiply the keyed pixels so compositing over the live black field
    // reproduces the mother image's original luminance instead of squaring it.
    const alpha = clampByte(((brightness - 8) / 30) * 255);
    const factor = alpha > 0 ? Math.min(3, 255 / alpha) : 1;
    rgba[target] = clampByte(red * factor);
    rgba[target + 1] = clampByte(green * factor);
    rgba[target + 2] = clampByte(blue * factor);
    rgba[target + 3] = alpha;
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
};

const outputWebpPair = async (pipeline, names, sizes, quality = 88) => {
  for (let index = 0; index < names.length; index += 1) {
    const [width, height] = sizes[index];
    await pipeline
      .clone()
      .resize({ width, height, fit: "fill", kernel: sharp.kernel.lanczos3 })
      .webp({ quality, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toFile(resolve(outputRoot, names[index]));
  }
};

const outputCircularLayer = async ({ box, names, sizes }) => {
  const source = sharp(approvedMaster).extract(box);
  const baseSize = Math.max(box.width, box.height);
  const masked = await source
    .resize({ width: baseSize, height: baseSize, fit: "fill" })
    .ensureAlpha()
    .composite([{ input: circleMask(baseSize, 0.75), blend: "dest-in" }])
    .png()
    .toBuffer();
  await outputWebpPair(sharp(masked), names, sizes, 92);
};

const outputKeyedLayer = async ({ box, mask, names, sizes, quality = 88 }) => {
  const crop = await sharp(approvedMaster).extract(box).toBuffer();
  let pipeline = await keyedSharp(crop);
  if (mask) {
    pipeline = pipeline.composite([{ input: Buffer.from(mask), blend: "dest-in" }]);
  }
  const keyed = await pipeline.png().toBuffer();
  await outputWebpPair(sharp(keyed), names, sizes, quality);
};

const smoothstep = (value) => {
  const normalized = Math.max(0, Math.min(1, value));
  return normalized * normalized * (3 - 2 * normalized);
};

// Sphere textures contain albedo/material only. Directional light and atmosphere
// stay in the WebGL/fixed-overlay layers; baking the approved front-lit sphere
// into this map would make its bright limb travel across the globe as it turns.
const outputSphereTexture = async ({
  surfaceSource,
  output,
  width = 2048,
  toneGamma = 1,
}) => {
  const height = width / 2;
  const { data, info } = await sharp(surfaceSource)
    .resize({ width, height, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const seamWidth = Math.max(16, Math.round(width / 64));

  // The Earth material is intentionally near-black, but must not disappear
  // after the fixed scene light is applied. Lift only the material's dark
  // values here; this is a uniform tone curve, not baked directional light.
  if (toneGamma !== 1) {
    for (let index = 0; index < data.length; index += info.channels) {
      for (let channel = 0; channel < 3; channel += 1) {
        data[index + channel] = clampByte(
          Math.pow(data[index + channel] / 255, toneGamma) * 255,
        );
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let offset = 0; offset < seamWidth; offset += 1) {
      const blend = 1 - smoothstep(offset / seamWidth);
      const left = (y * width + offset) * info.channels;
      const right = (y * width + (width - 1 - offset)) * info.channels;
      for (let channel = 0; channel < info.channels; channel += 1) {
        const common = (data[left + channel] + data[right + channel]) / 2;
        data[left + channel] = clampByte(
          data[left + channel] * (1 - blend) + common * blend,
        );
        data[right + channel] = clampByte(
          data[right + channel] * (1 - blend) + common * blend,
        );
      }
    }
  }

  await sharp(data, { raw: { width, height, channels: info.channels } })
    .webp({ quality: 94, effort: 6, smartSubsample: true })
    .toFile(resolve(outputRoot, output));
};

const outputBlackHoleRotor = async () => {
  const size = 480;
  const source = await sharp(approvedMaster)
    .extract({ left: 768, top: 528, width: 136, height: 136 })
    .resize({ width: size, height: size, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurred = await sharp(source.data, {
    raw: {
      width: source.info.width,
      height: source.info.height,
      channels: source.info.channels,
    },
  })
    .blur(5.5)
    .raw()
    .toBuffer();
  const rgba = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const target = (y * size + x) * 4;
      const normalizedRadius = Math.hypot(x - center, y - center) / center;
      const innerFade = smoothstep((normalizedRadius - 0.49) / 0.09);
      const outerFade = 1 - smoothstep((normalizedRadius - 0.88) / 0.09);
      const radialMask = innerFade * outerFade;
      if (radialMask <= 0) continue;

      const peak = Math.max(
        source.data[target],
        source.data[target + 1],
        source.data[target + 2],
      );
      const blurredPeak = Math.max(
        blurred[target],
        blurred[target + 1],
        blurred[target + 2],
      );
      const highFrequency = Math.max(0, peak - blurredPeak - 2);
      const alpha = clampByte(highFrequency * 22 * radialMask);
      if (alpha <= 1) continue;

      rgba[target] = clampByte(source.data[target] * 1.1 + 18);
      rgba[target + 1] = clampByte(source.data[target + 1] * 1.06 + 10);
      rgba[target + 2] = clampByte(source.data[target + 2] * 0.92);
      rgba[target + 3] = alpha;
    }
  }

  await outputWebpPair(
    sharp(rgba, { raw: { width: size, height: size, channels: 4 } }),
    [
      "home-orrery-ideas-rotor-v5-480.webp",
      "home-orrery-ideas-rotor-v5-960.webp",
    ],
    [[480, 480], [960, 960]],
    90,
  );
};

const outputStarfield = async (filename, width, height, quality) => {
  await sharp(resolve(starfieldSourceRoot, "starfield-master.png"))
    .resize({ width, height, fit: "fill" })
    .removeAlpha()
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(resolve(starfieldOutputRoot, filename));
};

await outputStarfield("home-cosmos-starfield-v3-1280.webp", 1280, 720, 52);
await outputStarfield("home-cosmos-starfield-v3-2048.webp", 2048, 1152, 58);

// Exact sphere crops from the approved 1600 × 732 composition. Their circle
// masks touch every side so CSS sizing is the visible sizing—no hidden padding.
await outputCircularLayer({
  box: { left: 831, top: 89, width: 128, height: 128 },
  names: [
    "home-orrery-writing-moon-v4-480.webp",
    "home-orrery-writing-moon-v4-960.webp",
  ],
  sizes: [[480, 480], [960, 960]],
});

await outputCircularLayer({
  box: { left: 1236, top: 163, width: 300, height: 300 },
  names: [
    "home-orrery-projects-earth-v4-480.webp",
    "home-orrery-projects-earth-v4-960.webp",
  ],
  sizes: [[480, 480], [960, 960]],
});

await outputCircularLayer({
  box: { left: 768, top: 528, width: 136, height: 136 },
  names: [
    "home-orrery-ideas-core-v4-480.webp",
    "home-orrery-ideas-core-v4-960.webp",
  ],
  sizes: [[480, 480], [960, 960]],
});

await outputSphereTexture({
  surfaceSource: resolve(starfieldSourceRoot, "moon-far-hemisphere-v1.png"),
  output: "home-orrery-writing-moon-surface-v7-1024.webp",
  width: 1024,
});
await outputSphereTexture({
  surfaceSource: resolve(starfieldSourceRoot, "moon-far-hemisphere-v1.png"),
  output: "home-orrery-writing-moon-surface-v7-2048.webp",
});
await outputSphereTexture({
  surfaceSource: resolve(starfieldSourceRoot, "earth-surface-painterly-v2.png"),
  output: "home-orrery-projects-earth-surface-v9-1024.webp",
  width: 1024,
  toneGamma: 0.9,
});
await outputSphereTexture({
  surfaceSource: resolve(starfieldSourceRoot, "earth-surface-painterly-v2.png"),
  output: "home-orrery-projects-earth-surface-v9-2048.webp",
  toneGamma: 0.9,
});
await outputBlackHoleRotor();

// The stream mask follows the two real mother-image branches and removes the
// three bodies. This leaves their local glints and tapered dust convergence but
// never bakes a planet or black rectangle into the layer.
const stageMask = `
  <svg width="881" height="732" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="streams">
        <rect width="881" height="732" fill="black"/>
        <path d="M 194 598 C 92 540, 84 435, 210 365 C 346 289, 497 314, 609 278"
          fill="none" stroke="white" stroke-width="118" stroke-linecap="round"/>
        <path d="M 254 154 C 376 154, 506 189, 609 278"
          fill="none" stroke="white" stroke-width="62" stroke-linecap="round"/>
        <circle cx="254" cy="153" r="65" fill="black"/>
        <circle cx="744" cy="313" r="154" fill="black"/>
        <circle cx="194" cy="596" r="48" fill="black"/>
      </mask>
    </defs>
    <rect width="881" height="732" fill="white" mask="url(#streams)"/>
  </svg>
`;

await outputKeyedLayer({
  box: { left: 641, top: 0, width: 881, height: 732 },
  mask: stageMask,
  names: [
    "home-orrery-connection-base-v4-881.webp",
    "home-orrery-connection-base-v4-1762.webp",
  ],
  sizes: [[881, 732], [1762, 1464]],
  quality: 90,
});

// The Earth glow is intentionally taken from the mother image rather than
// recreated with box-shadow. Only the asymmetric annulus is retained.
const earthGlowMask = `
  <svg width="390" height="390" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="glow-ring">
        <rect width="390" height="390" fill="black"/>
        <circle cx="196" cy="200" r="158" fill="none" stroke="white" stroke-width="42"/>
        <circle cx="45" cy="304" r="38" fill="black"/>
      </mask>
    </defs>
    <rect width="390" height="390" fill="white" mask="url(#glow-ring)"/>
  </svg>
`;

await outputKeyedLayer({
  box: { left: 1188, top: 112, width: 390, height: 390 },
  mask: earthGlowMask,
  names: [
    "home-orrery-projects-earth-glow-v4-480.webp",
    "home-orrery-projects-earth-glow-v4-960.webp",
  ],
  sizes: [[480, 480], [960, 960]],
  quality: 90,
});

// A large keyed crop preserves the black hole's non-uniform outer field: its
// upper-left stream is strong while its lower and right sides stay restrained.
const blackFieldMask = `
  <svg width="480" height="270" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="fade" cx="41%" cy="72%" r="67%">
        <stop offset="0" stop-color="white"/>
        <stop offset="0.68" stop-color="white"/>
        <stop offset="1" stop-color="black"/>
      </radialGradient>
      <mask id="black-field">
        <rect width="480" height="270" fill="url(#fade)"/>
        <circle cx="194" cy="194" r="68" fill="black"/>
      </mask>
    </defs>
    <rect width="480" height="270" fill="white" mask="url(#black-field)"/>
  </svg>
`;

await outputKeyedLayer({
  box: { left: 641, top: 402, width: 480, height: 270 },
  mask: blackFieldMask,
  names: [
    "home-orrery-ideas-field-v4-960.webp",
    "home-orrery-ideas-field-v4-1600.webp",
  ],
  sizes: [[960, 540], [1600, 900]],
  quality: 90,
});
