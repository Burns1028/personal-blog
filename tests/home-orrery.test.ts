import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");

const readExisting = (relativePath: string) => {
  const absolutePath = resolve(root, relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} must exist`);
  return readFileSync(absolutePath, "utf8");
};

test("homepage renders one unified celestial system with three semantic destinations", () => {
  const homepage = readExisting("src/pages/index.astro");

  assert.match(homepage, /import HomeOrrery/);
  assert.match(homepage, /<HomeOrrery\s*\/>/);
  assert.doesNotMatch(
    homepage,
    /home-github-cutout|home-manuscript-cutout|home-sketch-cutout/,
  );

  const component = readExisting("src/components/HomeOrrery.astro");
  assert.equal(
    (component.match(/class="home-celestial home-celestial--/g) ?? []).length,
    3,
  );
  assert.match(
    component,
    /href="\/writing"[\s\S]*?data-artifact="document"/,
  );
  assert.match(
    component,
    /href="\/projects"[\s\S]*?data-artifact="repo"/,
  );
  assert.match(
    component,
    /href="\/ideas"[\s\S]*?data-artifact="idea"/,
  );
  assert.match(component, /data-home-orrery/);
  assert.match(component, /data-artifact-stage/);
  assert.match(component, /home-cosmos__particle-canvas/);
  assert.doesNotMatch(component, /home-cosmos__approved-scene/);
  assert.match(component, /home-cosmos__sphere--moon/);
  assert.match(component, /home-cosmos__sphere--earth/);
  assert.match(component, /home-cosmos__black-hole-core/);
  assert.match(component, /home-cosmos__earth-directional-glow/);
  assert.match(component, /home-cosmos__satellite/);
  assert.doesNotMatch(
    component,
    /home-planet-(?:writing|projects|ideas)-v1/,
  );
});

test("home orrery manifest exposes the mother-matched v4 independent layers", () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");

  for (const asset of [
    "home-cosmos-starfield-v3",
    "home-orrery-connection-base-v4",
    "home-orrery-writing-moon-v4",
    "home-orrery-projects-earth-v4",
    "home-orrery-projects-earth-glow-v4",
    "home-cosmos-satellite-v2",
    "home-orrery-ideas-core-v4",
    "home-orrery-ideas-field-v4",
  ]) {
    assert.match(manifest, new RegExp(asset));
  }

  assert.doesNotMatch(manifest, /approvedScene|approved-scene|inner-v11/);
});

test("home orrery asset build deterministically separates the approved mother into transparent layers", () => {
  const builder = readExisting("scripts/build-home-orrery-assets.mjs");

  assert.match(builder, /home-orrery-motion-approved-v1\.webp/);
  assert.match(builder, /outputCircularLayer/);
  assert.match(builder, /outputKeyedLayer/);
  assert.match(builder, /outputSphereTexture/);
  assert.match(builder, /surfaceSource/);
  assert.match(builder, /home-orrery-writing-moon-surface-v7-1024\.webp/);
  assert.match(builder, /home-orrery-projects-earth-surface-v9-1024\.webp/);
  assert.doesNotMatch(builder, /unwrapVisibleHemisphere|sphereSource/);
  assert.doesNotMatch(builder, /outputSphereTurnSequence|renderSphereTurnFrame/);
  assert.doesNotMatch(builder, /approved-scene|inner-v11/);
  assert.match(builder, /build-home-cosmic-system-assets\.mjs/);
});

test("continuous sphere textures contain material only, without a baked moving light band", async () => {
  const textures = [
    ["home-orrery-writing-moon-surface-v7-2048.webp", 65],
    ["home-orrery-projects-earth-surface-v9-2048.webp", 22],
  ] as const;

  for (const [filename, maximumColumnRange] of textures) {
    const absolutePath = resolve(
      root,
      "public/assets/home-cosmic-system-v4",
      filename,
    );
    const { data, info } = await sharp(absolutePath)
      .resize(512, 256, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const columnMeans = Array.from({ length: info.width }, (_, x) => {
      let total = 0;
      for (let y = 0; y < info.height; y += 1) {
        const offset = (y * info.width + x) * info.channels;
        total +=
          data[offset] * 0.2126 +
          data[offset + 1] * 0.7152 +
          data[offset + 2] * 0.0722;
      }
      return total / info.height;
    });
    const range = Math.max(...columnMeans) - Math.min(...columnMeans);

    assert.ok(
      range <= maximumColumnRange,
      `${filename} column luminance range ${range.toFixed(1)} must not contain a baked light band`,
    );
  }
});

test("homepage uses a generated star field without the former Saturn ring layer", () => {
  const field = readExisting("src/components/CosmicField.astro");

  assert.match(field, /homeOrreryAssets\.background\.starfield/);
  assert.match(field, /cosmic-field__stars/);
  assert.match(field, /data-cosmic-stars/);
  assert.doesNotMatch(field, /cosmic-field__rings/);
  assert.doesNotMatch(field, /home-rings-composed/);
});

test("live composition keeps mother-matched bases fixed and confines motion to overlays", () => {
  const component = readExisting("src/components/HomeOrrery.astro");
  const css = readExisting("src/styles/home-orrery.css");

  assert.match(component, /data-particle-river-canvas/);
  assert.equal((component.match(/<canvas/g) ?? []).length, 3);
  assert.match(component, /home-cosmos__connection-base/);
  assert.match(component, /home-cosmos__moon-base/);
  assert.match(component, /data-home-moon-motion/);
  assert.match(component, /home-cosmos__earth-base/);
  assert.match(component, /data-home-earth-motion/);
  assert.match(component, /home-cosmos__earth-directional-glow/);
  assert.match(component, /home-cosmos__black-hole-field/);
  assert.match(component, /home-cosmos__black-hole-core/);
  assert.match(component, /home-cosmos__black-hole-rotor/);
  assert.match(component, /home-cosmos__black-hole-dark-core/);
  assert.match(component, /homeOrreryAssets\.connectionBase/);
  assert.match(component, /homeOrreryAssets\.writing\.moon/);
  assert.match(component, /homeOrreryAssets\.projects\.earth/);
  assert.match(component, /homeOrreryAssets\.projects\.earthGlow/);
  assert.match(component, /homeOrreryAssets\.ideas\.core/);
  assert.match(component, /homeOrreryAssets\.ideas\.rotor/);
  assert.match(component, /homeOrreryAssets\.ideas\.field/);

  assert.match(component, /createCelestialSphereController/);
  assert.match(component, /homeOrreryAssets\.writing\.motion/);
  assert.match(component, /homeOrreryAssets\.projects\.motion/);
  assert.match(component, /data-texture-url/);
  assert.match(component, /data-scene-state="preparing"/);
  assert.match(component, /data-fallback-src=/);
  assert.match(component, /data-fallback-srcset=/);
  assert.match(component, /moonMotion\.prepare\(\)/);
  assert.match(component, /earthMotion\.prepare\(\)/);
  assert.match(component, /orrery\.dataset\.sceneState = "ready"/);
  assert.match(component, /burns:page-settled/);
  assert.match(css, /data-scene-state="ready"[\s\S]*?opacity:\s*1/);
  assert.doesNotMatch(component, /createCelestialFrameController|data-frame-prefix|data-frame-count/);
  assert.doesNotMatch(css, /home-moon-texture-travel/);
  assert.doesNotMatch(css, /home-earth-texture-travel/);
  assert.match(css, /home-black-hole-rotor-turn 46s linear infinite/);
  assert.doesNotMatch(css, /home-cosmos__black-hole-core\s*\{[^}]*animation:/s);
  assert.match(css, /home-satellite-drift 21s ease-in-out infinite/);
  assert.doesNotMatch(css, /--celestial-(?:scale|x|y)/);
  assert.doesNotMatch(css, /\.home-cosmos__surface-viewport[\s\S]*?background:\s*#000/);
});

test("mother-matched v4 layers keep exact dimensions, alpha, tight bounds, and transfer budgets", async () => {
  const assets = [
    ["home-orrery-connection-base-v4-881.webp", 881, 732, true],
    ["home-orrery-connection-base-v4-1762.webp", 1762, 1464, true],
    ["home-orrery-writing-moon-v4-480.webp", 480, 480, true],
    ["home-orrery-writing-moon-v4-960.webp", 960, 960, true],
    ["home-orrery-projects-earth-v4-480.webp", 480, 480, true],
    ["home-orrery-projects-earth-v4-960.webp", 960, 960, true],
    ["home-orrery-projects-earth-glow-v4-480.webp", 480, 480, true],
    ["home-orrery-projects-earth-glow-v4-960.webp", 960, 960, true],
    ["home-orrery-ideas-core-v4-480.webp", 480, 480, true],
    ["home-orrery-ideas-core-v4-960.webp", 960, 960, true],
    ["home-orrery-ideas-field-v4-960.webp", 960, 540, true],
    ["home-orrery-ideas-field-v4-1600.webp", 1600, 900, true],
  ] as const;

  for (const [filename, width, height, hasAlpha] of assets) {
    const relativePath = `public/assets/home-cosmic-system-v4/${filename}`;
    const absolutePath = resolve(root, relativePath);
    assert.ok(existsSync(absolutePath), `${relativePath} must exist`);

    const metadata = await sharp(absolutePath).metadata();
    assert.equal(metadata.width, width, `${relativePath} width`);
    assert.equal(metadata.height, height, `${relativePath} height`);
    assert.equal(metadata.hasAlpha, hasAlpha, `${relativePath} alpha channel`);

    if (hasAlpha) {
      const { data, info } = await sharp(absolutePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) =>
        data[(y * info.width + x) * info.channels + 3];

      for (const [x, y] of [
        [0, 0],
        [info.width - 1, 0],
        [0, info.height - 1],
        [info.width - 1, info.height - 1],
      ]) {
        assert.ok(alphaAt(x, y) <= 4, `${relativePath} corners transparent`);
      }
    }
  }

  for (const filename of [
    "home-orrery-writing-moon-v4-480.webp",
    "home-orrery-projects-earth-v4-480.webp",
  ]) {
    const { data, info } = await sharp(resolve(root, "public/assets/home-cosmic-system-v4", filename))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * info.channels + 3] > 12) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    assert.ok((maxX - minX + 1) / info.width >= 0.96, `${filename} fills width`);
    assert.ok((maxY - minY + 1) / info.height >= 0.96, `${filename} fills height`);
  }

  const bytesFor = (filename: string) =>
    statSync(resolve(root, "public/assets/home-cosmic-system-v4", filename)).size;
  const desktopBytes = [
    "home-orrery-connection-base-v4-1762.webp",
    "home-orrery-writing-moon-v4-960.webp",
    "home-orrery-projects-earth-v4-960.webp",
    "home-orrery-projects-earth-glow-v4-960.webp",
    "home-orrery-ideas-core-v4-960.webp",
    "home-orrery-ideas-field-v4-1600.webp",
  ].reduce((total, filename) => total + bytesFor(filename), 0);
  const mobileBytes = [
    "home-orrery-connection-base-v4-881.webp",
    "home-orrery-writing-moon-v4-480.webp",
    "home-orrery-projects-earth-v4-480.webp",
    "home-orrery-projects-earth-glow-v4-480.webp",
    "home-orrery-ideas-core-v4-480.webp",
    "home-orrery-ideas-field-v4-960.webp",
  ].reduce((total, filename) => total + bytesFor(filename), 0);

  assert.ok(desktopBytes <= 1_000_000, `desktop assets use ${desktopBytes} bytes`);
  assert.ok(mobileBytes <= 520_000, `mobile assets use ${mobileBytes} bytes`);
});

test("runtime starfield assets meet exact dimensions and budgets", async () => {
  const assets = [
    ["home-cosmos-starfield-v3-1280.webp", 1280, 720],
    ["home-cosmos-starfield-v3-2048.webp", 2048, 1152],
  ] as const;
  const assetRoot = resolve(root, "public/assets/home-cosmic-system-v3");

  for (const [filename, width, height] of assets) {
    const absolutePath = resolve(assetRoot, filename);
    assert.ok(existsSync(absolutePath), `${filename} must exist`);
    const metadata = await sharp(absolutePath).metadata();
    assert.equal(metadata.width, width, `${filename} width`);
    assert.equal(metadata.height, height, `${filename} height`);
    assert.equal(metadata.hasAlpha, false, `${filename} is an opaque star field`);
  }

  const bytesFor = (filename: string) => statSync(resolve(assetRoot, filename)).size;
  const standardBytes = bytesFor("home-cosmos-starfield-v3-1280.webp");
  const retinaBytes = bytesFor("home-cosmos-starfield-v3-2048.webp");

  assert.ok(standardBytes <= 70_000, `standard starfield uses ${standardBytes} bytes`);
  assert.ok(retinaBytes <= 140_000, `retina starfield uses ${retinaBytes} bytes`);
});

test("orrery ambient motion is layered, pausable, and reduced-motion safe", () => {
  const css = readExisting("src/styles/home-orrery.css");
  const component = readExisting("src/components/HomeOrrery.astro");
  const layout = readExisting("src/layouts/BaseLayout.astro");

  assert.match(layout, /import "\.\.\/styles\/home-orrery\.css"/);
  assert.match(component, /data-home-moon-motion/);
  assert.match(component, /data-home-earth-motion/);
  assert.match(css, /home-black-hole-rotor-turn 46s/);
  assert.doesNotMatch(css, /home-moon-float/);
  assert.match(css, /data-motion-running="true"/);
  assert.match(css, /html\[data-artifact-navigating\][\s\S]*animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(
    css,
    /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.home-cosmos__particle-canvas\s*{[\s\S]*?display:\s*none/,
  );
  assert.match(component, /connection\?: \{ saveData\?: boolean \}/);
  assert.match(component, /!savesData/);
  assert.match(component, /createOrreryParticleController/);
  assert.match(component, /particles\?\.setRunning\(running\)/);
  assert.match(component, /moonMotion\?\.setRunning\(running\)/);
  assert.match(component, /earthMotion\?\.setRunning\(running\)/);
  assert.match(component, /particles\?\.destroy\(\)/);
  assert.match(component, /activateStaticScene/);
  assert.match(component, /sceneMode === "animated"/);
  assert.match(layout, /rel="preload"[\s\S]*?homeOrreryAssets\.writing\.motion\.texture/);
  assert.match(layout, /rel="preload"[\s\S]*?homeOrreryAssets\.projects\.motion\.texture/);

  const keyframes = css.slice(css.indexOf("@keyframes home-moon-float"));
  assert.doesNotMatch(keyframes, /\bfilter\s*:/);
  assert.doesNotMatch(keyframes, /\bbackground-position\s*:/);
  assert.doesNotMatch(keyframes, /\bbox-shadow\s*:/);
});

test("celestial surfaces use one seamless texture each while fixed lighting stays outside the canvases", async () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");
  const component = readExisting("src/components/HomeOrrery.astro");

  assert.match(manifest, /home-orrery-writing-moon-surface-v7-1024\.webp/);
  assert.match(manifest, /home-orrery-projects-earth-surface-v9-1024\.webp/);
  assert.match(manifest, /durationMs:\s*180_000/);
  assert.match(manifest, /durationMs:\s*150_000/);
  assert.doesNotMatch(manifest, /framePrefix|frameCount|frame-v5/);
  assert.match(component, /home-cosmos__moon-motion-canvas/);
  assert.match(component, /home-cosmos__earth-motion-canvas/);

  for (const filename of [
    "home-orrery-writing-moon-surface-v7-1024.webp",
    "home-orrery-projects-earth-surface-v9-1024.webp",
  ]) {
    const texture = resolve(root, "public/assets/home-cosmic-system-v4", filename);
    assert.ok(existsSync(texture), `${filename} must exist`);
    const metadata = await sharp(texture).metadata();
    assert.equal(metadata.width, 1024, `${filename} width`);
    assert.equal(metadata.height, 512, `${filename} height`);

    const { data, info } = await sharp(texture)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let seamDifference = 0;
    for (let y = 0; y < info.height; y += 1) {
      const left = y * info.width * info.channels;
      const right = (y * info.width + info.width - 1) * info.channels;
      for (let channel = 0; channel < 3; channel += 1) {
        seamDifference += Math.abs(data[left + channel] - data[right + channel]);
      }
    }
    const meanSeamDifference = seamDifference / (info.height * 3);
    assert.ok(meanSeamDifference <= 6, `${filename} seam differs by ${meanSeamDifference}`);
  }

  const runtimeBytes = [
    "home-orrery-writing-moon-surface-v7-1024.webp",
    "home-orrery-projects-earth-surface-v9-1024.webp",
  ].reduce(
    (total, filename) =>
      total + statSync(resolve(root, "public/assets/home-cosmic-system-v4", filename)).size,
    0,
  );
  assert.ok(runtimeBytes <= 460_000, `runtime sphere textures use ${runtimeBytes} bytes`);
});

test("Earth surface keeps low-light material visible across the full turning sphere", async () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");
  const texture = resolve(
    root,
    "public/assets/home-cosmic-system-v4/home-orrery-projects-earth-surface-v9-1024.webp",
  );

  assert.match(manifest, /home-orrery-projects-earth-surface-v9-1024\.webp/);
  assert.match(manifest, /ambientLight:\s*0\.82/);
  assert.match(manifest, /diffuseLight:\s*0\.32/);
  assert.ok(existsSync(texture), "tone-mapped Earth surface must exist");

  const { data, info } = await sharp(texture)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const luminance: number[] = [];
  for (let index = 0; index < data.length; index += info.channels) {
    luminance.push(
      data[index] * 0.2126 +
      data[index + 1] * 0.7152 +
      data[index + 2] * 0.0722,
    );
  }
  luminance.sort((left, right) => left - right);
  const fifthPercentile = luminance[Math.floor(luminance.length * 0.05)];
  const median = luminance[Math.floor(luminance.length * 0.5)];

  assert.ok(fifthPercentile >= 8, `Earth dark detail collapses at ${fifthPercentile}`);
  assert.ok(median >= 18, `Earth median detail collapses at ${median}`);
  assert.ok(median <= 30, `Earth material is over-bright at ${median}`);
});

test("continuous surfaces have no discrete-frame blend path", () => {
  const component = readExisting("src/components/HomeOrrery.astro");
  const manifest = readExisting("src/data/home-orrery-assets.ts");

  assert.doesNotMatch(component, /framePrefix|frameCount|nextIndex|globalAlpha/);
  assert.doesNotMatch(manifest, /framePrefix|frameCount|frame-v5/);
  assert.equal(existsSync(resolve(root, "src/lib/home-celestial-frames.ts")), false);
});

test("homepage pointer hover highlights celestials without parallax translation", () => {
  const homepage = readExisting("src/pages/index.astro");
  const css = readExisting("src/styles/home-orrery.css");

  assert.doesNotMatch(homepage, /stage\.addEventListener\("pointermove"/);
  assert.doesNotMatch(homepage, /--stage-(?:near|mid|far)-[xy]/);
  assert.doesNotMatch(css, /--celestial-[xy]/);
  assert.doesNotMatch(css, /home-moon-float/);
  assert.match(
    css,
    /\.home-celestial:hover \.home-celestial__motion,[\s\S]*?filter:\s*brightness\(1\.12\)/,
  );
});

test("black-hole motion uses an isolated transparent particle annulus, never the directional core crop", async () => {
  const component = readExisting("src/components/HomeOrrery.astro");
  const css = readExisting("src/styles/home-orrery.css");
  const rotorPath = resolve(
    root,
    "public/assets/home-cosmic-system-v4/home-orrery-ideas-rotor-v5-480.webp",
  );

  assert.match(component, /home-cosmos__black-hole-rotor/);
  assert.match(css, /home-cosmos__black-hole-rotor/);
  assert.doesNotMatch(css, /data-motion-running[^}]*home-cosmos__black-hole-core[^}]*animation:/s);
  assert.ok(existsSync(rotorPath), "black-hole rotor must exist");

  const { data, info } = await sharp(rotorPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaAt = (x: number, y: number) =>
    data[(y * info.width + x) * info.channels + 3];
  assert.ok(alphaAt(info.width / 2, info.height / 2) <= 2, "dark core remains fixed and empty in rotor");
  assert.ok(alphaAt(2, 2) <= 2, "directional outer field is absent from rotor");
  assert.ok(alphaAt(info.width - 3, 2) <= 2, "rotor has no rectangular crop edge");
});

test("active celestial state stays legible without a circular selection ring", () => {
  const css = readExisting("src/styles/home-orrery.css");

  assert.match(
    css,
    /\.home-orrery\[data-active-artifact="document"\] \.home-celestial:not\(\.home-celestial--writing\),[\s\S]*?opacity:\s*0\.82;/,
  );
  assert.doesNotMatch(
    css,
    /\.home-orrery\[data-active-artifact="document"\] \.home-celestial--writing::after,[\s\S]*?border-color:/,
  );
  assert.doesNotMatch(css, /\.home-celestial::after\s*{/);
  assert.doesNotMatch(css, /\.home-celestial:focus-visible::after\s*{/);
});

test("directional light fields are fixed, asymmetric layers and the mother scene never ships at runtime", () => {
  const component = readExisting("src/components/HomeOrrery.astro");
  const css = readExisting("src/styles/home-orrery.css");

  assert.doesNotMatch(component, /approvedScene|home-cosmos__approved-scene/);
  assert.match(component, /home-cosmos__moon-light/);
  assert.match(component, /home-cosmos__earth-directional-glow/);
  assert.match(component, /home-cosmos__black-hole-field/);
  assert.match(component, /home-cosmos__black-hole-dark-core/);

  const animationRules = css.slice(0, css.indexOf("html[data-artifact-navigating]"));
  assert.doesNotMatch(animationRules, /home-cosmos__moon-light[^}]*animation:/s);
  assert.doesNotMatch(animationRules, /home-cosmos__earth-directional-glow[^}]*animation:/s);
  assert.doesNotMatch(animationRules, /home-cosmos__black-hole-field[^}]*animation:/s);
});

test("planetary route openings replace paper transforms with compositor-only expansion", () => {
  const css = readExisting("src/styles/home-orrery.css");

  assert.match(css, /\.home-celestial--projects\s*{[\s\S]*?view-transition-name:\s*artifact-repo/);
  assert.match(css, /\.home-celestial--writing\s*{[\s\S]*?view-transition-name:\s*artifact-document/);
  assert.match(css, /\.home-celestial--ideas\s*{[\s\S]*?view-transition-name:\s*artifact-idea/);
  assert.match(
    css,
    /::view-transition-old\(artifact-document\)[\s\S]*?planet-open-writing 880ms/,
  );
  assert.match(
    css,
    /::view-transition-old\(artifact-repo\)[\s\S]*?planet-open-projects 880ms/,
  );
  assert.match(
    css,
    /::view-transition-old\(artifact-idea\)[\s\S]*?planet-open-ideas 880ms/,
  );

  const keyframes = css.slice(css.indexOf("@keyframes planet-open-writing"));
  assert.doesNotMatch(keyframes, /\bfilter\s*:/);
  assert.doesNotMatch(keyframes, /\bblur\(/);
  assert.doesNotMatch(keyframes, /\bdrop-shadow\(/);
});
