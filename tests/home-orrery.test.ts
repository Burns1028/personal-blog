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
  assert.match(component, /home-cosmos__stardust/);
  assert.match(component, /home-cosmos__earth-track/);
  assert.match(component, /home-cosmos__singularity-inner/);
  assert.doesNotMatch(
    component,
    /home-planet-(?:writing|projects|ideas)-v1/,
  );
});

test("home orrery manifest names every unified cosmic asset family", () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");

  for (const asset of [
    "home-cosmos-stardust-main-v2",
    "home-cosmos-dust-near-v2",
    "home-cosmos-writing-moon-v2",
    "home-cosmos-projects-earth-surface-v2",
    "home-cosmos-projects-earth-atmosphere-v2",
    "home-cosmos-ideas-core-v2",
    "home-cosmos-ideas-warp-v2",
    "home-cosmos-satellite-v2",
  ]) {
    assert.match(manifest, new RegExp(asset));
  }
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

test("orrery ambient motion is layered, pausable, and reduced-motion safe", () => {
  const css = readExisting("src/styles/home-orrery.css");
  const component = readExisting("src/components/HomeOrrery.astro");
  const layout = readExisting("src/layouts/BaseLayout.astro");

  assert.match(layout, /import "\.\.\/styles\/home-orrery\.css"/);
  assert.match(css, /home-stardust-drift 54s/);
  assert.match(css, /home-near-dust-drift 38s/);
  assert.match(css, /home-earth-surface-turn 108s/);
  assert.match(css, /home-satellite-drift 18s/);
  assert.match(css, /home-singularity-inner 38s/);
  assert.match(css, /home-singularity-outer 60s/);
  assert.match(css, /home-moon-breathe 12s/);
  assert.match(css, /data-motion-running="true"/);
  assert.match(css, /html\[data-artifact-navigating\][\s\S]*animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(component, /connection\?: \{ saveData\?: boolean \}/);
  assert.match(component, /window\.innerWidth > 760 && !savesData/);
  assert.match(component, /data-near-dust-host/);
  assert.match(component, /!savesData/);

  const keyframes = css.slice(css.indexOf("@keyframes home-stardust-drift"));
  assert.doesNotMatch(keyframes, /\bfilter\s*:/);
  assert.doesNotMatch(keyframes, /\bbackground-position\s*:/);
  assert.doesNotMatch(keyframes, /\bbox-shadow\s*:/);
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
