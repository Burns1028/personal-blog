import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("homepage keeps three accessible destinations over the supplied stationary video", () => {
  const page = read("src/pages/index.astro");
  const component = read("src/components/HomeOrrery.astro");
  assert.match(page, /<HomeOrrery\s*\/>/);
  assert.equal((component.match(/key: "/g) ?? []).length, 3);
  for (const route of ["writing", "projects", "ideas"]) assert.match(component, new RegExp(`href: "/${route}"`));
  assert.equal((component.match(/<video /g) ?? []).length, 1);
  assert.equal((component.match(/<canvas /g) ?? []).length, 1);
  assert.match(component, /muted loop playsinline preload="none"/);
  assert.match(component, /loading="eager"/);
  assert.doesNotMatch(component, /ThreeBody|SphereController|data-texture-url|satellite|three-body/);
  const css = read("src/styles/home-orrery.css");
  assert.doesNotMatch(css, /@keyframes|will-change|data-three-body/);
});

test("video work starts after the first paint and pauses for hidden, offscreen, reduced-motion and data-saving states", () => {
  const component = read("src/components/HomeOrrery.astro");
  assert.match(component, /burns:page-settled/);
  assert.match(component, /IntersectionObserver/);
  assert.match(component, /!document.hidden/);
  assert.match(component, /!reducedMotion.matches/);
  assert.match(component, /!savesData/);
  assert.match(component, /event.persisted/);
  assert.match(component, /player\?\.destroy/);
  const controller = read("src/lib/home-celestial-video.ts");
  assert.match(controller, /requestVideoFrameCallback/);
  assert.match(controller, /onReady\(false\)/);
  assert.match(controller, /color \* alpha/);
  assert.doesNotMatch(controller, /getImageData|putImageData|setInterval/);
  const layout = read("src/layouts/BaseLayout.astro");
  assert.match(layout, /homeOrreryAssets\.scene\.subjects/);
  assert.doesNotMatch(layout, /motion\.texture/);
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
