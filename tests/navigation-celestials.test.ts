import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { nav } from "../src/data/site.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(
  projectRoot,
  "public/assets/navigation-celestials",
);

test("navigation celestial assets are responsive transparent cutouts", async () => {
  const assets = [
    ["nav-writing-moon-v1-64.webp", 64, 64, 18_000],
    ["nav-writing-moon-v1-128.webp", 128, 128, 32_000],
    ["nav-projects-earth-v1-64.webp", 64, 64, 18_000],
    ["nav-projects-earth-v1-128.webp", 128, 128, 32_000],
    ["nav-ideas-black-hole-v2-80.webp", 80, 64, 18_000],
    ["nav-ideas-black-hole-v2-160.webp", 160, 128, 32_000],
  ] as const;

  for (const [filename, width, height, maxBytes] of assets) {
    const path = resolve(publicRoot, filename);
    assert.ok(existsSync(path), `${filename} must exist`);

    const metadata = await sharp(path).metadata();
    assert.equal(metadata.width, width, `${filename} width`);
    assert.equal(metadata.height, height, `${filename} height`);
    assert.equal(metadata.hasAlpha, true, `${filename} keeps transparency`);
    assert.ok(
      statSync(path).size <= maxBytes,
      `${filename} must stay within ${maxBytes} bytes`,
    );
  }
});

test("navigation celestial assets have a deterministic build command", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(projectRoot, "package.json"), "utf8"),
  );

  assert.equal(
    packageJson.scripts["assets:navigation"],
    "node scripts/build-navigation-celestial-assets.mjs",
  );
  assert.ok(
    existsSync(
      resolve(projectRoot, "scripts/build-navigation-celestial-assets.mjs"),
    ),
  );
});

test("shared navigation maps each destination to its celestial mark", () => {
  assert.deepEqual(
    nav.map(({ href, celestial }) => ({
      href,
      kind: celestial?.kind,
      width: celestial?.width,
      height: celestial?.height,
    })),
    [
      { href: "/writing", kind: "moon", width: 64, height: 64 },
      { href: "/projects", kind: "earth", width: 64, height: 64 },
      { href: "/ideas", kind: "black-hole", width: 80, height: 64 },
    ],
  );

  for (const item of nav) {
    assert.ok(item.celestial, `${item.href} must define a celestial mark`);
    assert.match(
      item.celestial.src,
      /navigation-celestials\/.+-v(?:1|2)-(64|80)\.webp$/,
    );
    assert.match(item.celestial.srcset, / 1x, .+ 2x$/);
  }
});

test("shared navigation renders decorative responsive celestial images", () => {
  const layout = readFileSync(
    resolve(projectRoot, "src/layouts/BaseLayout.astro"),
    "utf8",
  );

  assert.match(layout, /site-nav__celestial/);
  assert.match(layout, /site-nav__celestial--\$\{item\.celestial\.kind\}/);
  assert.match(layout, /aria-hidden="true"/);
  assert.match(layout, /srcset=\{item\.celestial\.srcset\}/);
  assert.match(layout, /width=\{item\.celestial\.width\}/);
  assert.match(layout, /height=\{item\.celestial\.height\}/);
  assert.match(layout, /<span class="site-nav__label">\{item\.label\}<\/span>/);
});

test("celestial navigation spacing is responsive and never moves the icons", () => {
  const css = readFileSync(resolve(projectRoot, "src/styles/global.css"), "utf8");
  const celestialRuleBodies = [
    ...css.matchAll(/\.site-nav__celestial[^{}]*\{([^}]*)\}/g),
  ].map((match) => match[1]).join("\n");

  assert.match(css, /--site-nav-celestial-size:\s*22px/);
  assert.match(css, /--site-nav-celestial-gap:\s*8px/);
  assert.match(css, /site-nav__celestial--black-hole[\s\S]*?width:\s*27px/);
  assert.match(css, /\.site-nav__celestial\s*\{[^}]*opacity:\s*0\.82/);
  assert.match(
    css,
    /\.site-nav a:hover \.site-nav__celestial[\s\S]*?opacity:\s*1/,
  );
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?--site-nav-celestial-size:\s*18px/);
  assert.doesNotMatch(celestialRuleBodies, /\b(?:animation|transform)\s*:/);
});
