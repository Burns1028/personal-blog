import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const read = (path: string) =>
  readFileSync(resolve(projectRoot, path), "utf8");

function balancedBlock(css: string, openingBrace: number, label: string) {
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  assert.fail(`unterminated block: ${label}`);
}

function mobileBlockContaining(css: string, marker: string) {
  const markerIndex = css.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing mobile marker: ${marker}`);
  const mediaIndex = css.lastIndexOf("@media", markerIndex);
  const openingBrace = css.indexOf("{", mediaIndex);
  assert.match(css.slice(mediaIndex, openingBrace), /max-width:\s*767px/);
  return balancedBlock(css, openingBrace, marker);
}

function blockAtMaxWidth(css: string, maxWidth: number) {
  const mediaPattern = new RegExp(
    `@media\\s*\\(max-width:\\s*${maxWidth}px\\)\\s*\\{`,
    "g",
  );
  const matches = [...css.matchAll(mediaPattern)];
  assert.equal(
    matches.length,
    1,
    `expected one max-width: ${maxWidth}px block`,
  );
  const mediaIndex = matches[0].index;
  const openingBrace = css.indexOf("{", mediaIndex);
  return balancedBlock(css, openingBrace, `max-width: ${maxWidth}px`);
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

test("the Home institution mark and graduate note stay on one phone row", () => {
  const css = read("src/styles/global.css");
  const marker = "Mobile responsive contract: shared shell and Home";
  const selector = 'body[data-route="/"] .hero-profile__education-copy';
  const legacyMediaIndex = css.indexOf("@media (max-width: 430px)");
  const legacyRuleIndex = css.indexOf(selector, legacyMediaIndex);
  const legacyRuleEnd = css.indexOf("}", legacyRuleIndex);
  const finalRuleIndex = css.indexOf(selector, css.indexOf(marker));
  const mobile = mobileBlockContaining(css, marker);

  assert.notEqual(legacyRuleIndex, -1, "missing legacy narrow education rule");
  assert.match(
    css.slice(legacyRuleIndex, legacyRuleEnd),
    /flex-direction:\s*column/,
  );
  assert.ok(
    css.indexOf(marker) > legacyRuleIndex,
    "the canonical phone block must follow the legacy narrow override",
  );
  assert.equal(
    css.lastIndexOf(selector),
    finalRuleIndex,
    "no later education-copy rule may undo the canonical phone contract",
  );
  assert.match(
    mobile,
    /body\[data-route="\/"\] \.hero-profile__education-copy\s*\{[^}]*flex-direction:\s*row[^}]*align-items:\s*center[^}]*white-space:\s*nowrap/,
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
  assert.match(
    mobile,
    /\.archive-search--projects input\s*\{[^}]*min-height:\s*44px/,
  );
  assert.match(
    mobile,
    /\.projects-v2 \.archive-pagination ol \.archive-pagination__ellipsis\s*\{[^}]*width:\s*12px/,
  );
  assert.match(
    css,
    /\.projects-v2\s+\.archive-pagination\s+ol\.archive-pagination__pages--compact\s*\{[^}]*display:\s*none/,
  );
  assert.match(
    mobile,
    /\.projects-v2\s+\.archive-pagination\s+ol\.archive-pagination__pages--full\s*\{[^}]*display:\s*none/,
  );
  assert.match(
    mobile,
    /\.projects-v2\s+\.archive-pagination\s+ol\.archive-pagination__pages--compact\s*\{[^}]*display:\s*flex/,
  );
  assert.match(mobile, /\.activity-orbit__trigger[\s\S]*?min-height:\s*44px/);
  assert.match(mobile, /\.activity-orbit__heading[\s\S]*?display:\s*block/);
  assert.match(orbit, /<h2 class="activity-orbit__heading">近期活动<\/h2>/);
});

test("Ideas turns each phone entry into a full-width single-column record", () => {
  const css = read("src/styles/ideas-journal.css");
  const desktop = css.slice(0, css.indexOf("@media"));
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Ideas",
  );

  assert.match(
    desktop,
    /\.ideas-journal__date-option\s*\{[^}]*min-height:\s*34px/,
  );
  assert.match(mobile, /\.ideas-journal__entry article[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.ideas-journal__meta[\s\S]*?display:\s*flex/);
  assert.match(mobile, /\.ideas-journal__node[\s\S]*?position:\s*absolute/);
  assert.match(mobile, /\.ideas-journal__entry h2[\s\S]*?font-size:\s*16px/);
  assert.match(mobile, /\.ideas-journal__entry h2[\s\S]*?line-height:\s*1\.68/);
  assert.match(
    mobile,
    /body\[data-route="\/ideas"\]\s*\{[^}]*--ideas-search-height:\s*48px/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__date-option\s*\{[^}]*min-height:\s*44px/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__track\s*\{[^}]*display:\s*none/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__entries::before\s*\{[^}]*width:\s*1px[^}]*pointer-events:\s*none/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__entry\s*\{[^}]*scroll-margin-top:\s*calc\(\s*var\(--ideas-search-top\)\s*\+\s*var\(--ideas-search-height\)\s*\+\s*var\(--ideas-timeline-gap\)\s*\)/,
  );
});

test("Ideas gives long phone entries an unmistakable reading break", () => {
  const css = read("src/styles/ideas-journal.css");
  const desktop = css.slice(0, css.indexOf("@media"));
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Ideas",
  );

  assert.match(
    mobile,
    /\.ideas-journal__entry\s*\+\s*\.ideas-journal__entry\s*\{[^}]*margin-top:\s*10px/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__meta\s*\{[^}]*padding:\s*14px 0 0/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__entry h2\s*\{[^}]*padding:\s*8px 0 20px[^}]*border-bottom:\s*1px solid rgba\(89,\s*59,\s*28,\s*0\.3\)/,
  );
  assert.match(
    desktop,
    /\.ideas-journal__entry h2\s*\{[^}]*border-bottom:\s*1px dotted rgba\(89,\s*59,\s*28,\s*0\.15\)/,
  );
});

test("Ideas narrow-phone controls clear content without reviving the old grid", () => {
  const css = read("src/styles/ideas-journal.css");
  const phone = mobileBlockContaining(css, "Mobile responsive contract: Ideas");
  const legacyNarrow = blockAtMaxWidth(css, 619);
  const narrow = blockAtMaxWidth(css, 380);

  assert.ok(
    css.indexOf("@media (max-width: 619px)") >
      css.indexOf("Mobile responsive contract: Ideas"),
    "the legacy narrow override must be audited after the canonical phone block",
  );
  assert.doesNotMatch(legacyNarrow, /grid-template-columns/);
  assert.doesNotMatch(legacyNarrow, /--ideas-search-height/);
  assert.doesNotMatch(legacyNarrow, /\.ideas-journal__search\b/);
  assert.doesNotMatch(legacyNarrow, /\.ideas-journal__entry article/);
  assert.doesNotMatch(legacyNarrow, /\.ideas-journal__entry h2/);

  assert.match(
    phone,
    /\.ideas-journal__search\s*\{[^}]*grid-template-columns:\s*20px minmax\(0,\s*1fr\) 1px minmax\(132px,\s*160px\)/,
  );
  assert.match(
    narrow,
    /body\[data-route="\/ideas"\]\s*\{[^}]*--ideas-search-height:\s*88px/,
  );
  assert.match(
    narrow,
    /\.ideas-journal__search\s*\{[^}]*height:\s*88px[^}]*grid-template-columns:\s*20px minmax\(0,\s*1fr\)[^}]*grid-template-rows:\s*44px 44px/,
  );
  assert.match(
    narrow,
    /\.ideas-journal__content\s*\{[^}]*padding-top:\s*calc\(\s*var\(--ideas-search-top\)\s*\+\s*var\(--ideas-search-height\)\s*\)/,
  );
  assert.match(
    narrow,
    /\.ideas-journal__date-filter\s*\{[^}]*grid-column:\s*1 \/ -1[^}]*min-height:\s*44px/,
  );
});
