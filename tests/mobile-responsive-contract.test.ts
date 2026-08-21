import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

function mobileBlockContaining(css: string, marker: string) {
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing mobile marker: ${marker}`);
  const mediaIndex = css.lastIndexOf("@media", markerIndex);
  const openingBrace = css.indexOf("{", mediaIndex);
  assert.match(css.slice(mediaIndex, openingBrace), /max-width:\s*767px/);

  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`unterminated mobile block: ${marker}`);
}

test("the shared shell and Home use a phone-only normal document flow", () => {
  const css = read("src/styles/global.css");
  const marker = "Mobile responsive contract: shared shell and Home";
  const mobile = mobileBlockContaining(
    css,
    marker,
  );

  assert.ok(
    css.indexOf(marker) >
      css.lastIndexOf('body[data-route^="/writing/"] .site-header'),
    "the shared phone shell must follow every writing-detail header override",
  );
  assert.match(
    mobile,
    /:root\s*\{[^}]*--mobile-page-gutter:\s*clamp\(16px,\s*4\.6vw,\s*20px\)[^}]*--mobile-header-height:\s*calc\(92px \+ env\(safe-area-inset-top,\s*0px\)\)/,
  );
  assert.match(
    mobile,
    /body\[data-route\] \.site-header\s*\{[^}]*width:\s*calc\(100vw - \(2 \* var\(--mobile-page-gutter\)\)\)[^}]*min-height:\s*var\(--mobile-header-height\)[^}]*padding-top:\s*env\(safe-area-inset-top,\s*0px\)/,
  );
  assert.match(mobile, /body\[data-route="\/"\] \.home-hero__inner[\s\S]*?display:\s*block/);
  assert.match(mobile, /body\[data-route="\/"\] \.hero-actions[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /body\[data-route="\/"\] \.hero-actions a[\s\S]*?min-height:\s*52px/);
  assert.match(mobile, /body\[data-route="\/"\] \.contact-strip[\s\S]*?min-height:\s*44px/);
  assert.doesNotMatch(mobile, /max-height:\s*100(?:s|d)?vh/);
});

test("the Home institution link keeps a practical phone hit area", () => {
  const css = read("src/styles/global.css");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: shared shell and Home",
  );

  assert.match(
    mobile,
    /body\[data-route="\/"\] \.hero-profile__institution-logo\s*\{[^}]*min-height:\s*44px[^}]*align-items:\s*center/,
  );
});

test("the Home orrery fits every destination into a finite phone stage", () => {
  const css = read("src/styles/home-orrery.css");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Home orrery",
  );

  assert.match(
    mobile,
    /\.home-orrery\s*\{[^}]*width:\s*100%[^}]*height:\s*clamp\(420px,\s*118vw,\s*480px\)[^}]*min-height:\s*0[^}]*overflow:\s*clip/,
  );
  assert.match(
    mobile,
    /\.home-cosmos__stage\s*\{[^}]*left:\s*50%[^}]*width:\s*min\(112%,\s*480px\)[^}]*transform:\s*translateX\(-50%\)/,
  );
  assert.match(
    mobile,
    /\.home-celestial--writing\s*\{[^}]*top:\s*7%[^}]*left:\s*12%[^}]*width:\s*24%/,
  );
  assert.match(
    mobile,
    /\.home-celestial--projects\s*\{[^}]*top:\s*17%[^}]*left:\s*55%[^}]*width:\s*42%/,
  );
  assert.match(
    mobile,
    /\.home-celestial--ideas\s*\{[^}]*top:\s*62%[^}]*left:\s*8%[^}]*width:\s*27%/,
  );
  assert.match(
    mobile,
    /\.home-cosmos__particle-canvas\s*\{[^}]*opacity:\s*0\.52/,
  );
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*(?:760|430)px\)/);
});

test("Projects becomes one continuous, touchable phone document", () => {
  const css = read("src/styles/projects-archive-v2.css");
  const orbit = read("src/components/projects/ActivityOrbit.astro");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Projects",
  );

  assert.match(mobile, /\.projects-v2 \.project-card-grid[\s\S]*?max-height:\s*none/);
  assert.match(mobile, /\.projects-v2 \.project-card-grid[\s\S]*?overflow:\s*visible/);
  assert.match(mobile, /\.projects-v2__header[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.archive-search--projects[\s\S]*?min-height:\s*44px/);
  assert.match(mobile, /\.activity-orbit__trigger[\s\S]*?min-height:\s*44px/);
  assert.match(mobile, /\.activity-orbit__heading[\s\S]*?display:\s*block/);
  assert.match(orbit, /<h2 class="activity-orbit__heading">近期活动<\/h2>/);
});

test("Ideas turns each phone entry into a full-width single-column record", () => {
  const css = read("src/styles/ideas-journal.css");
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Ideas",
  );

  assert.match(mobile, /\.ideas-journal__entry article[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.ideas-journal__meta[\s\S]*?display:\s*flex/);
  assert.match(mobile, /\.ideas-journal__node[\s\S]*?position:\s*absolute/);
  assert.match(mobile, /\.ideas-journal__entry h2[\s\S]*?font-size:\s*16px/);
  assert.match(mobile, /\.ideas-journal__entry h2[\s\S]*?line-height:\s*1\.68/);
});
