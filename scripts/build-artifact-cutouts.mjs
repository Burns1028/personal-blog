import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");

const artifacts = [
  {
    name: "github",
    source: "design-source/hero/artifact-github-cosmic-source.png",
    master: "design-source/hero/artifact-github-cosmic-cutout.png",
    outputs: [720, 1200],
    background: { minimum: 180, maximumChroma: 14 },
    contract: 2,
    punchHoles: true,
  },
  {
    name: "idea",
    source: "design-source/hero/artifact-idea-cosmic-source.png",
    master: "design-source/hero/artifact-idea-cosmic-cutout.png",
    outputs: [480, 720],
    background: { minimum: 205, maximumChroma: 14 },
    contract: 2,
  },
  {
    name: "document",
    source: "design-source/hero/artifact-document-cosmic-source.png",
    master: "design-source/hero/artifact-document-cosmic-cutout.png",
    outputs: [640, 960],
    background: { minimum: 190, maximumChroma: 16 },
    contract: 2,
  },
];

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

function isNeutralBackground(data, offset, { minimum, maximumChroma }) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const maximum = Math.max(red, green, blue);
  const minimumChannel = Math.min(red, green, blue);
  const luminance = (red + green + blue) / 3;

  return luminance >= minimum && maximum - minimumChannel <= maximumChroma;
}

function floodExterior(data, width, height, settings) {
  const pixelCount = width * height;
  const exterior = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (exterior[index]) return;
    if (!isNeutralBackground(data, index * 3, settings)) return;
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

function keepMaterialComponents(exterior, width, height) {
  const visited = new Uint8Array(exterior.length);
  const queue = new Int32Array(exterior.length);
  const components = [];

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

    components.push(pixels);
  }

  components.sort((left, right) => right.length - left.length);
  const largest = components[0]?.length ?? 0;
  const alpha = new Uint8Array(exterior.length);

  for (const component of components) {
    if (component.length < Math.max(1200, largest * 0.004)) continue;
    for (const index of component) alpha[index] = 255;
  }

  return alpha;
}

function removePunchHoles(alpha, data, width, height) {
  const scanWidth = Math.round(width * 0.078);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < scanWidth; x += 1) {
      const index = y * width + x;
      const offset = index * 3;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luminance = (red + green + blue) / 3;
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);

      if (luminance > 176 && chroma < 22) alpha[index] = 0;
    }
  }
}

function contractEdge(alpha, width, height, passes) {
  let current = alpha;

  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (!current[index]) continue;

        if (
          neighbors.some(
            ([deltaX, deltaY]) =>
              current[(y + deltaY) * width + x + deltaX] === 0,
          )
        ) {
          next[index] = 0;
        }
      }
    }

    current = next;
  }

  return current;
}

function alphaBounds(alpha, width, height, padding = 4) {
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

async function buildArtifact(artifact) {
  const sourcePath = resolve(projectRoot, artifact.source);
  const masterPath = resolve(projectRoot, artifact.master);
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const exterior = floodExterior(
    data,
    info.width,
    info.height,
    artifact.background,
  );
  let alpha = keepMaterialComponents(exterior, info.width, info.height);

  if (artifact.punchHoles) {
    removePunchHoles(alpha, data, info.width, info.height);
  }

  alpha = contractEdge(
    alpha,
    info.width,
    info.height,
    artifact.contract,
  );

  const bounds = alphaBounds(alpha, info.width, info.height);
  await mkdir(dirname(masterPath), { recursive: true });

  const transparentSource = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 3,
    },
  })
    .joinChannel(alpha, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 1,
      },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(transparentSource)
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toFile(masterPath);

  for (const width of artifact.outputs) {
    const outputPath = resolve(
      projectRoot,
      `public/assets/artifact-${artifact.name}-cosmic-${width}.webp`,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(masterPath)
      .resize({ width, withoutEnlargement: true })
      .webp({
        quality: 86,
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

for (const artifact of artifacts) {
  await buildArtifact(artifact);
}
