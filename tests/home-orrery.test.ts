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

test("homepage renders the semantic three-planet orrery instead of the artifact collage", () => {
  const homepage = readExisting("src/pages/index.astro");

  assert.match(homepage, /import HomeOrrery/);
  assert.match(homepage, /<HomeOrrery\s*\/>/);
  assert.doesNotMatch(
    homepage,
    /home-github-cutout|home-manuscript-cutout|home-sketch-cutout/,
  );

  const component = readExisting("src/components/HomeOrrery.astro");
  assert.equal(
    (component.match(/class="home-planet home-planet--/g) ?? []).length,
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
});

test("home orrery manifest names generated planets and the existing satellite", () => {
  const manifest = readExisting("src/data/home-orrery-assets.ts");

  for (const kind of ["writing", "projects", "ideas"]) {
    assert.match(
      manifest,
      new RegExp(`home-planet-${kind}-v1-480\\.webp`),
    );
    assert.match(
      manifest,
      new RegExp(`home-planet-${kind}-v1-960\\.webp`),
    );
  }

  assert.match(manifest, /projects-satellite-v2\.webp/);
});

test("generated home planets are square transparent WebPs within their byte budget", async () => {
  for (const kind of ["writing", "projects", "ideas"]) {
    const relativePath = `public/assets/home-planet-${kind}-v1-960.webp`;
    const absolutePath = resolve(root, relativePath);
    assert.ok(existsSync(absolutePath), `${relativePath} must exist`);

    const metadata = await sharp(absolutePath).metadata();
    assert.equal(metadata.width, 960, `${relativePath} width`);
    assert.equal(metadata.height, 960, `${relativePath} height`);
    assert.equal(metadata.hasAlpha, true, `${relativePath} alpha channel`);
    assert.ok(
      statSync(absolutePath).size < 500_000,
      `${relativePath} must stay below 500 KB`,
    );

    const { data, info } = await sharp(absolutePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) =>
      data[(y * info.width + x) * info.channels + 3];

    assert.ok(alphaAt(0, 0) <= 4, `${relativePath} top-left transparent`);
    assert.ok(
      alphaAt(info.width - 1, 0) <= 4,
      `${relativePath} top-right transparent`,
    );
    assert.ok(
      alphaAt(0, info.height - 1) <= 4,
      `${relativePath} bottom-left transparent`,
    );
    assert.ok(
      alphaAt(info.width - 1, info.height - 1) <= 4,
      `${relativePath} bottom-right transparent`,
    );
    assert.ok(
      alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2)) >= 220,
      `${relativePath} center must be opaque`,
    );
  }
});

test("orrery ambient motion is layered, pausable, and reduced-motion safe", () => {
  const css = readExisting("src/styles/home-orrery.css");
  const layout = readExisting("src/layouts/BaseLayout.astro");

  assert.match(layout, /import "\.\.\/styles\/home-orrery\.css"/);
  assert.match(css, /home-dust-orbit 78s/);
  assert.match(css, /home-projects-turn 48s/);
  assert.match(css, /home-satellite-orbit 18s/);
  assert.match(css, /home-ideas-turn 88s/);
  assert.match(css, /home-ideas-breathe 9s/);
  assert.match(css, /home-writing-breathe 12s/);
  assert.match(css, /data-motion-running="true"/);
  assert.match(css, /html\[data-artifact-navigating\][\s\S]*animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});

test("planetary route openings replace paper transforms with compositor-only expansion", () => {
  const css = readExisting("src/styles/home-orrery.css");

  assert.match(css, /\.home-planet--projects\s*{[\s\S]*?view-transition-name:\s*artifact-repo/);
  assert.match(css, /\.home-planet--writing\s*{[\s\S]*?view-transition-name:\s*artifact-document/);
  assert.match(css, /\.home-planet--ideas\s*{[\s\S]*?view-transition-name:\s*artifact-idea/);
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
