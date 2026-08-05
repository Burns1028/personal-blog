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
  assert.match(component, /home-cosmos__approved-scene/);
  assert.match(component, /home-cosmos__sphere--moon/);
  assert.match(component, /home-cosmos__sphere--earth/);
  assert.match(component, /home-cosmos__accretion-disc/);
  assert.doesNotMatch(component, /home-cosmos__stardust|home-cosmos__dust-near/);
  assert.doesNotMatch(
    component,
    /home-planet-(?:writing|projects|ideas)-v1/,
  );
});

test("home orrery manifest names only the approved scene and its moving interiors", () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");

  for (const asset of [
    "home-cosmos-starfield-v3",
    "home-cosmos-approved-scene-v9",
    "home-cosmos-writing-moon-inner-v11",
    "home-cosmos-projects-earth-inner-v11",
    "home-cosmos-ideas-inner-v11",
  ]) {
    assert.match(manifest, new RegExp(asset));
  }

  assert.doesNotMatch(manifest, /legacyRoot|particle-river|atmosphere|warp/);
});

test("homepage uses a generated star field without the former Saturn ring layer", () => {
  const field = readExisting("src/components/CosmicField.astro");

  assert.match(field, /homeOrreryAssets\.background\.starfield/);
  assert.match(field, /cosmic-field__stars/);
  assert.match(field, /data-cosmic-stars/);
  assert.doesNotMatch(field, /cosmic-field__rings/);
  assert.doesNotMatch(field, /home-rings-composed/);
});

test("approved mother scene and inner crops describe the connected system", () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");

  for (const asset of [
    "home-cosmos-approved-scene-v9-881.webp",
    "home-cosmos-writing-moon-inner-v11-140.webp",
    "home-cosmos-projects-earth-inner-v11-312.webp",
    "home-cosmos-ideas-inner-v11-96.webp",
  ]) {
    assert.match(manifest, new RegExp(asset));
  }
});

test("approved live composition has one canvas river and refined rotating sprites", () => {
  const component = readExisting("src/components/HomeOrrery.astro");
  const css = readExisting("src/styles/home-orrery.css");

  assert.doesNotMatch(component, /data-particle-river-base/);
  assert.match(component, /data-particle-river-canvas/);
  assert.equal((component.match(/<canvas/g) ?? []).length, 1);
  assert.equal((component.match(/home-cosmos__motion-surface/g) ?? []).length, 2);
  assert.equal((component.match(/home-cosmos__accretion-disc/g) ?? []).length, 1);
  assert.match(component, /homeOrreryAssets\.writing\.moonSurface/);
  assert.match(component, /homeOrreryAssets\.projects\.earthSurface/);
  assert.match(component, /homeOrreryAssets\.ideas\.blackHole/);

  assert.match(css, /home-moon-inner-travel 15s ease-in-out infinite alternate/);
  assert.match(css, /home-earth-inner-travel 21s ease-in-out infinite alternate/);
  assert.match(css, /home-accretion-turn 36s linear infinite/);
  assert.doesNotMatch(css, /home-satellite-drift 21s ease-in-out infinite/);
  assert.match(css, /--celestial-scale:\s*1/);
  assert.doesNotMatch(css, /home-cosmos__path--main/);
});

test("unified cosmic assets keep exact dimensions, alpha, and transfer budgets", async () => {
  const assets = [
    ["home-cosmos-stardust-main-v2-960.webp", 960, 480, true],
    ["home-cosmos-stardust-main-v2-1600.webp", 1600, 800, true],
    ["home-cosmos-dust-near-v2-960.webp", 960, 480, true],
    ["home-cosmos-dust-near-v2-1600.webp", 1600, 800, true],
    ["home-cosmos-writing-moon-v2-480.webp", 480, 480, true],
    ["home-cosmos-writing-moon-v2-960.webp", 960, 960, true],
    ["home-cosmos-projects-earth-surface-v2-1024.webp", 1024, 512, false],
    ["home-cosmos-projects-earth-surface-v2-2048.webp", 2048, 1024, false],
    ["home-cosmos-projects-earth-atmosphere-v2-480.webp", 480, 480, true],
    ["home-cosmos-projects-earth-atmosphere-v2-960.webp", 960, 960, true],
    ["home-cosmos-ideas-core-v2-480.webp", 480, 480, true],
    ["home-cosmos-ideas-core-v2-960.webp", 960, 960, true],
    ["home-cosmos-ideas-warp-v2-960.webp", 960, 540, true],
    ["home-cosmos-ideas-warp-v2-1600.webp", 1600, 900, true],
    ["home-cosmos-satellite-v2-320.webp", 320, 320, true],
    ["home-cosmos-satellite-v2-640.webp", 640, 640, true],
  ] as const;

  for (const [filename, width, height, hasAlpha] of assets) {
    const relativePath = `public/assets/home-cosmic-system-v2/${filename}`;
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

  const bytesFor = (filename: string) =>
    statSync(resolve(root, "public/assets/home-cosmic-system-v2", filename)).size;
  const desktopBytes = [
    "home-cosmos-stardust-main-v2-1600.webp",
    "home-cosmos-dust-near-v2-1600.webp",
    "home-cosmos-writing-moon-v2-480.webp",
    "home-cosmos-projects-earth-surface-v2-1024.webp",
    "home-cosmos-projects-earth-atmosphere-v2-960.webp",
    "home-cosmos-ideas-core-v2-480.webp",
    "home-cosmos-ideas-warp-v2-960.webp",
    "home-cosmos-satellite-v2-320.webp",
  ].reduce((total, filename) => total + bytesFor(filename), 0);
  const mobileBytes = [
    "home-cosmos-stardust-main-v2-960.webp",
    "home-cosmos-writing-moon-v2-480.webp",
    "home-cosmos-projects-earth-surface-v2-1024.webp",
    "home-cosmos-projects-earth-atmosphere-v2-480.webp",
    "home-cosmos-ideas-core-v2-480.webp",
    "home-cosmos-ideas-warp-v2-960.webp",
    "home-cosmos-satellite-v2-320.webp",
  ].reduce((total, filename) => total + bytesFor(filename), 0);

  assert.ok(desktopBytes <= 700_000, `desktop assets use ${desktopBytes} bytes`);
  assert.ok(mobileBytes <= 360_000, `mobile assets use ${mobileBytes} bytes`);
});

test("approved homepage assets meet exact dimensions and runtime budgets", async () => {
  const assets = [
    ["home-cosmos-starfield-v3-1280.webp", 1280, 720],
    ["home-cosmos-starfield-v3-2048.webp", 2048, 1152],
    ["home-cosmos-approved-scene-v9-881.webp", 881, 732],
    ["home-cosmos-approved-scene-v9-1762.webp", 1762, 1464],
    ["home-cosmos-writing-moon-inner-v11-140.webp", 140, 116],
    ["home-cosmos-writing-moon-inner-v11-280.webp", 280, 232],
    ["home-cosmos-projects-earth-inner-v11-312.webp", 312, 264],
    ["home-cosmos-projects-earth-inner-v11-624.webp", 624, 528],
    ["home-cosmos-ideas-inner-v11-96.webp", 96, 96],
    ["home-cosmos-ideas-inner-v11-192.webp", 192, 192],
  ] as const;
  const assetRoot = resolve(root, "public/assets/home-cosmic-system-v3");

  for (const [filename, width, height] of assets) {
    const absolutePath = resolve(assetRoot, filename);
    assert.ok(existsSync(absolutePath), `${filename} must exist`);
    const metadata = await sharp(absolutePath).metadata();
    assert.equal(metadata.width, width, `${filename} width`);
    assert.equal(metadata.height, height, `${filename} height`);
    assert.equal(metadata.hasAlpha, false, `${filename} is an opaque mother crop`);
  }

  const bytesFor = (filename: string) => statSync(resolve(assetRoot, filename)).size;
  const standardBytes = [
    "home-cosmos-starfield-v3-1280.webp",
    "home-cosmos-approved-scene-v9-881.webp",
    "home-cosmos-writing-moon-inner-v11-140.webp",
    "home-cosmos-projects-earth-inner-v11-312.webp",
    "home-cosmos-ideas-inner-v11-96.webp",
  ].reduce((total, filename) => total + bytesFor(filename), 0);
  const retinaBytes = [
    "home-cosmos-starfield-v3-2048.webp",
    "home-cosmos-approved-scene-v9-1762.webp",
    "home-cosmos-writing-moon-inner-v11-280.webp",
    "home-cosmos-projects-earth-inner-v11-624.webp",
    "home-cosmos-ideas-inner-v11-192.webp",
  ].reduce((total, filename) => total + bytesFor(filename), 0);

  assert.ok(standardBytes <= 110_000, `standard assets use ${standardBytes} bytes`);
  assert.ok(retinaBytes <= 260_000, `retina assets use ${retinaBytes} bytes`);
});

test("approved scene preserves the mother image's directional outer light fields", async () => {
  const master = await sharp(
    resolve(root, "docs/superpowers/specs/assets/home-orrery-motion-approved-v1.webp"),
  )
    .extract({ left: 641, top: 0, width: 881, height: 732 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const scene = await sharp(
    resolve(root, "public/assets/home-cosmic-system-v3/home-cosmos-approved-scene-v9-881.webp"),
  )
    .raw()
    .toBuffer({ resolveWithObject: true });

  const regions = [
    { name: "black hole", cx: 198, cy: 593, inner: 52, outer: 126, maxMean: 2.5 },
    { name: "Moon", cx: 260, cy: 150, inner: 62, outer: 104, maxMean: 1.5 },
    { name: "Earth", cx: 736, cy: 310, inner: 136, outer: 210, maxMean: 1.5 },
  ];

  for (const region of regions) {
    let totalDifference = 0;
    let samples = 0;
    for (let y = Math.max(0, region.cy - region.outer); y < Math.min(732, region.cy + region.outer); y += 1) {
      for (let x = Math.max(0, region.cx - region.outer); x < Math.min(881, region.cx + region.outer); x += 1) {
        const distance = Math.hypot(x - region.cx, y - region.cy);
        if (distance < region.inner || distance > region.outer) continue;
        for (let channel = 0; channel < 3; channel += 1) {
          totalDifference += Math.abs(
            master.data[(y * 881 + x) * master.info.channels + channel] -
              scene.data[(y * 881 + x) * scene.info.channels + channel],
          );
          samples += 1;
        }
      }
    }

    const meanDifference = totalDifference / samples;
    assert.ok(
      meanDifference <= region.maxMean,
      `${region.name} outer field differs by ${meanDifference.toFixed(3)}/255`,
    );
  }
});

test("orrery ambient motion is layered, pausable, and reduced-motion safe", () => {
  const css = readExisting("src/styles/home-orrery.css");
  const component = readExisting("src/components/HomeOrrery.astro");
  const layout = readExisting("src/layouts/BaseLayout.astro");

  assert.match(layout, /import "\.\.\/styles\/home-orrery\.css"/);
  assert.match(css, /home-moon-inner-travel 15s/);
  assert.match(css, /home-earth-inner-travel 21s/);
  assert.match(css, /home-accretion-turn 36s/);
  assert.match(css, /home-moon-float 15s/);
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
  assert.match(component, /particles\?\.destroy\(\)/);

  const keyframes = css.slice(css.indexOf("@keyframes home-moon-inner-travel"));
  assert.doesNotMatch(keyframes, /\bfilter\s*:/);
  assert.doesNotMatch(keyframes, /\bbackground-position\s*:/);
  assert.doesNotMatch(keyframes, /\bbox-shadow\s*:/);
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

test("approved outer light fields stay in the fixed mother scene", () => {
  const component = readExisting("src/components/HomeOrrery.astro");
  const css = readExisting("src/styles/home-orrery.css");

  assert.match(component, /homeOrreryAssets\.background\.approvedScene/);
  assert.match(component, /home-cosmos__approved-scene/);
  assert.equal((component.match(/home-cosmos__accretion-disc/g) ?? []).length, 1);

  assert.doesNotMatch(css, /home-cosmos__sphere-glow/);
  assert.doesNotMatch(css, /home-cosmos__photon-ring/);
  assert.doesNotMatch(css, /home-cosmos__black-hole-glow/);
  assert.doesNotMatch(css, /box-shadow\s*:[^;]*(?:gold|rgba\(239, 199, 116)/);
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
