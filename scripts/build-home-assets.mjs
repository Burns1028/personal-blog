import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");

const cutouts = [
  {
    name: "github",
    source: "design-source/home/github-dark-window.png",
    master: "design-source/home/github-dark-window-cutout.png",
    widths: [960, 1440],
    background: "dark",
  },
  {
    name: "manuscript",
    source: "design-source/home/ralph-loop-manuscript.png",
    master: "design-source/home/ralph-loop-manuscript-cutout.png",
    widths: [640, 960],
    background: "light",
  },
  {
    name: "sketch",
    source: "design-source/home/memory-architecture-kraft.png",
    master: "design-source/home/memory-architecture-kraft-cutout.png",
    widths: [640, 960],
    background: "light",
  },
];

const scenes = [
  {
    source: "design-source/home/deep-space-stars.png",
    outputs: [
      ["public/assets/home-space-1280.webp", 1280, 82],
      ["public/assets/home-space-2048.webp", 2048, 86],
    ],
  },
];

const ringCutout = {
  source: "design-source/home/amber-orbit-composed-v1.png",
  master: "design-source/home/amber-orbit-composed-v1-cutout.png",
  outputs: [
    ["public/assets/home-rings-composed-v5-1280.webp", 1280],
    ["public/assets/home-rings-composed-v5-2048.webp", 2048],
  ],
};

const profilePortrait = {
  source: "design-source/home/profile-burns-original.jpg",
  crop: {
    left: 1180,
    top: 1050,
    width: 1250,
    height: 1667,
  },
  outputs: [
    ["public/assets/home-profile-burns-320.webp", 320],
    ["public/assets/home-profile-burns-640.webp", 640],
  ],
};

const neighbors = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

function isExteriorPixel(data, offset, mode) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const luminance = (red + green + blue) / 3;
  const chroma = maximum - minimum;

  if (mode === "dark") {
    return luminance <= 10 && chroma <= 9;
  }

  return luminance >= 253.5 && chroma <= 3;
}

function floodExterior(data, width, height, mode) {
  const exterior = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (exterior[index]) return;
    if (!isExteriorPixel(data, index * 3, mode)) return;
    exterior[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);

    for (const [deltaX, deltaY] of neighbors) {
      const nextX = x + deltaX;
      const nextY = y + deltaY;
      if (
        nextX < 0 ||
        nextX >= width ||
        nextY < 0 ||
        nextY >= height
      ) {
        continue;
      }

      enqueue(nextY * width + nextX);
    }
  }

  return exterior;
}

function keepLargestMaterial(exterior, width, height) {
  const visited = new Uint8Array(exterior.length);
  const queue = new Int32Array(exterior.length);
  let largest = [];

  for (let start = 0; start < exterior.length; start += 1) {
    if (exterior[start] || visited[start]) continue;

    let head = 0;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;
    const pixels = [];

    while (head < tail) {
      const index = queue[head];
      head += 1;
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);

      for (const [deltaX, deltaY] of neighbors) {
        const nextX = x + deltaX;
        const nextY = y + deltaY;
        if (
          nextX < 0 ||
          nextX >= width ||
          nextY < 0 ||
          nextY >= height
        ) {
          continue;
        }

        const next = nextY * width + nextX;
        if (!exterior[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail] = next;
          tail += 1;
        }
      }
    }

    if (pixels.length > largest.length) largest = pixels;
  }

  const alpha = new Uint8Array(exterior.length);
  for (const index of largest) alpha[index] = 255;
  return alpha;
}

function floodMaskExterior(mask, width, height) {
  const exterior = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (exterior[index] || mask[index]) return;
    exterior[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);

    for (const [deltaX, deltaY] of neighbors) {
      const nextX = x + deltaX;
      const nextY = y + deltaY;
      if (
        nextX < 0 ||
        nextX >= width ||
        nextY < 0 ||
        nextY >= height
      ) {
        continue;
      }
      enqueue(nextY * width + nextX);
    }
  }

  return exterior;
}

async function buildLightSilhouette(data, width, height) {
  const seed = new Uint8Array(width * height);

  for (let index = 0; index < seed.length; index += 1) {
    const offset = index * 3;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const luminance = (red + green + blue) / 3;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const warmPaper = red - blue > 3.5 && red >= green - 1;
    const darkWarmMark = luminance < 190 && chroma > 2;
    seed[index] = warmPaper || darkWarmMark ? 255 : 0;
  }

  const closed = await sharp(seed, {
    raw: { width, height, channels: 1 },
  })
    .dilate(10)
    .erode(10)
    .greyscale()
    .raw()
    .toBuffer();
  const exterior = floodMaskExterior(closed, width, height);
  return keepLargestMaterial(exterior, width, height);
}

function alphaBounds(alpha, width, height, padding = 8) {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!alpha[y * width + x]) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }

  if (maximumX < 0 || maximumY < 0) {
    throw new Error("No foreground pixels remained after extraction.");
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

async function buildCutout(artifact) {
  const sourcePath = resolve(projectRoot, artifact.source);
  const masterPath = resolve(projectRoot, artifact.master);
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alpha = artifact.background === "light"
    ? await buildLightSilhouette(data, info.width, info.height)
    : keepLargestMaterial(
        floodExterior(
          data,
          info.width,
          info.height,
          artifact.background,
        ),
        info.width,
        info.height,
      );
  const bounds = alphaBounds(alpha, info.width, info.height);
  const softAlpha = await sharp(alpha, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .erode(5)
    .blur(1.2)
    .greyscale()
    .raw()
    .toBuffer();

  const transparentSource = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .joinChannel(softAlpha, {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await mkdir(dirname(masterPath), { recursive: true });
  await sharp(transparentSource)
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toFile(masterPath);

  for (const width of artifact.widths) {
    const outputPath = resolve(
      projectRoot,
      `public/assets/home-${artifact.name}-cutout-v3-${width}.webp`,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(masterPath)
      .resize({ width, withoutEnlargement: true })
      .webp({
        quality: 88,
        alphaQuality: 100,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(outputPath);
  }

  console.log(
    `${artifact.name}: ${info.width}×${info.height} → ${bounds.width}×${bounds.height}`,
  );
}

async function buildScene(scene) {
  for (const [relativePath, width, quality] of scene.outputs) {
    const outputPath = resolve(projectRoot, relativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(resolve(projectRoot, scene.source))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(outputPath);
  }
}

async function buildProfilePortrait(portrait) {
  const sourcePath = resolve(projectRoot, portrait.source);

  for (const [relativePath, width] of portrait.outputs) {
    const outputPath = resolve(projectRoot, relativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(sourcePath)
      .extract(portrait.crop)
      .resize({
        width,
        height: Math.round(width * 1.334),
        fit: "cover",
      })
      .webp({
        quality: 86,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(outputPath);
  }

  console.log(
    `profile: ${portrait.crop.width}×${portrait.crop.height} crop`,
  );
}

async function buildRingCutout(ring) {
  const sourcePath = resolve(projectRoot, ring.source);
  const masterPath = resolve(projectRoot, ring.master);
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = new Uint8Array(info.width * info.height * 4);
  const alpha = new Uint8Array(info.width * info.height);

  for (let index = 0; index < alpha.length; index += 1) {
    const sourceOffset = index * 3;
    const outputOffset = index * 4;
    const red = data[sourceOffset];
    const green = data[sourceOffset + 1];
    const blue = data[sourceOffset + 2];
    const luminance = red * 0.28 + green * 0.58 + blue * 0.14;

    let matte = 0;
    if (luminance > 6 && luminance < 24) {
      matte = ((luminance - 6) / 18) * 150;
    } else if (luminance >= 24 && luminance < 70) {
      matte = 150 + ((luminance - 24) / 46) * 105;
    } else if (luminance >= 70) {
      matte = 255;
    }

    const roundedAlpha = Math.max(0, Math.min(255, Math.round(matte)));
    alpha[index] = roundedAlpha;
    const correction = 1 / Math.max(roundedAlpha / 255, 0.28);
    rgba[outputOffset] = Math.min(255, Math.round(red * correction * 1.04));
    rgba[outputOffset + 1] = Math.min(
      255,
      Math.round(green * correction),
    );
    rgba[outputOffset + 2] = Math.min(
      255,
      Math.round(blue * correction * 0.96),
    );
    rgba[outputOffset + 3] = roundedAlpha;
  }

  const bounds = alphaBounds(alpha, info.width, info.height, 4);
  await mkdir(dirname(masterPath), { recursive: true });
  await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toFile(masterPath);

  for (const [relativePath, width] of ring.outputs) {
    const outputPath = resolve(projectRoot, relativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(masterPath)
      .resize({ width, withoutEnlargement: true })
      .webp({
        quality: 90,
        alphaQuality: 100,
        effort: 6,
        smartSubsample: true,
      })
      .toFile(outputPath);
  }

  console.log(
    `rings: ${info.width}×${info.height} → ${bounds.width}×${bounds.height}`,
  );
}

for (const artifact of cutouts) {
  await buildCutout(artifact);
}

for (const scene of scenes) {
  await buildScene(scene);
}

await buildProfilePortrait(profilePortrait);
await buildRingCutout(ringCutout);
