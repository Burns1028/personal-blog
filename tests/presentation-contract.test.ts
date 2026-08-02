import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { contacts, site } from "../src/data/site.ts";

const projectRoot = resolve(import.meta.dirname, "..");

test("Writing archive keeps search, pagination, and lunar phases on one centered axis", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/writing/index.astro"),
    "utf8",
  );
  const cssPath = resolve(projectRoot, "src/styles/writing-archive-v2.css");
  assert.ok(existsSync(cssPath));
  const css = readFileSync(cssPath, "utf8");
  assert.match(page, /name="q"/);
  assert.match(page, /export const prerender = false/);
  assert.match(page, /ArchivePagination/);
  assert.match(page, /<LunarPhase/);
  assert.match(css, /--writing-column:\s*min\(780px/);
  assert.match(css, /margin-inline:\s*auto/);
  assert.match(css, /font-size:\s*clamp\(21px,\s*1\.45vw,\s*23px\)/);
  assert.match(css, /width:\s*clamp\(36px,\s*2\.7vw,\s*42px\)/);
  assert.match(
    css,
    /\.writing-v2__phase-strip img\s*\{[^}]*opacity:\s*0\.8;/,
  );
  assert.match(css, /\.writing-v2__meta \.lunar-phase[\s\S]*?width:\s*42px/);
  assert.doesNotMatch(css, /grid-template-columns:\s*minmax\(0,\s*62%\)/);
});

test("Writing lunar phases come from independently drawn assets, not a black mask", () => {
  const buildScript = readFileSync(
    resolve(projectRoot, "scripts/build-writing-assets.mjs"),
    "utf8",
  );

  assert.match(buildScript, /moon-phases-v3\.png/);
  assert.doesNotMatch(buildScript, /phaseVisibility/);
  assert.doesNotMatch(buildScript, /const shade\s*=/);
});

test("archive destinations do not render the persistent artifact stack", () => {
  const archivePages = [
    "src/pages/writing/index.astro",
    "src/pages/projects/index.astro",
    "src/pages/ideas/index.astro",
  ];

  for (const relativePath of archivePages) {
    const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
    assert.doesNotMatch(
      source,
      /ArtifactRouteStage/,
      `${relativePath} must not render the archive artifact stack`,
    );
  }
});

test("the Ideas archive keeps its singularity without restoring artifacts", () => {
  const singularityPath = resolve(
    projectRoot,
    "src/components/IdeasSingularity.astro",
  );
  const ideasPage = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );
  assert.ok(existsSync(singularityPath), "Ideas singularity component must exist");
  const singularity = readFileSync(singularityPath, "utf8");

  assert.match(ideasPage, /import IdeasSingularity/);
  assert.match(ideasPage, /<IdeasSingularity\s*\/>/);
  assert.match(singularity, /ideas-black-hole-overlay-v4\.webp/);
  assert.doesNotMatch(singularity, /data-route-artifact/);
});

test("Ideas preserves intentional SQLite line breaks while retaining natural wrapping", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/ideas/index.astro"),
    "utf8",
  );
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(page, /<h2>\{idea\.text\}<\/h2>/);
  assert.match(
    css,
    /\.signal-card h2\s*\{[^}]*white-space:\s*pre-line/,
  );
});

test("the homepage transition captures every artifact entrypoint", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/layouts/BaseLayout.astro"),
    "utf8",
  );

  assert.match(
    source,
    /a\[data-route-artifact\], a\[data-artifact\]/,
  );
  assert.match(source, /dataset\.artifactIntent/);
});

test("homepage artifacts use distinct expansive opening transitions", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(
    css,
    /::view-transition-old\(artifact-repo\)\s*{\s*transform-origin:\s*center;\s*animation:\s*artifact-open-repo 680ms/s,
  );
  assert.match(
    css,
    /::view-transition-old\(artifact-document\)\s*{\s*transform-origin:\s*7% 50%;\s*animation:\s*artifact-open-document 720ms/s,
  );
  assert.match(
    css,
    /::view-transition-old\(artifact-idea\)\s*{\s*transform-origin:\s*18% 50%;\s*animation:\s*artifact-open-idea 720ms/s,
  );
  assert.match(
    css,
    /@keyframes artifact-open-document[\s\S]*?perspective\(1500px\)[\s\S]*?rotateY\(-72deg\)/,
  );
  assert.match(
    css,
    /@keyframes artifact-open-idea[\s\S]*?perspective\(1600px\)[\s\S]*?rotateY\(-54deg\)/,
  );
  assert.match(
    css,
    /html\[data-artifact-arrival\]::view-transition-new\(root\)[\s\S]*?artifact-destination-reveal 620ms/,
  );
});

test("artifact navigation starts on the next frame without an artificial delay", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/layouts/BaseLayout.astro"),
    "utf8",
  );

  assert.doesNotMatch(source, /setTimeout\([\s\S]*?150\)/);
  assert.match(source, /burns:artifact-navigation-start/);
  assert.match(source, /requestAnimationFrame\([\s\S]*?location\.assign/);
});

test("artifact view transitions only animate compositor-friendly properties", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );
  const transitionKeyframes = css.slice(
    css.indexOf("@keyframes artifact-open-repo"),
    css.indexOf("/* Six lunar chapter markers"),
  );

  assert.doesNotMatch(transitionKeyframes, /\bfilter\s*:/);
  assert.doesNotMatch(transitionKeyframes, /\bblur\(/);
  assert.doesNotMatch(transitionKeyframes, /\bdrop-shadow\(/);
});

test("homepage continuous motion pauses as soon as artifact navigation starts", () => {
  const cosmicSource = readFileSync(
    resolve(projectRoot, "src/components/CosmicField.astro"),
    "utf8",
  );
  const homepageSource = readFileSync(
    resolve(projectRoot, "src/pages/index.astro"),
    "utf8",
  );
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(cosmicSource, /burns:artifact-navigation-start/);
  assert.match(cosmicSource, /cancelAnimationFrame\(animationFrame\)/);
  assert.match(homepageSource, /burns:artifact-navigation-start/);
  assert.match(
    css,
    /html\[data-artifact-navigating\][\s\S]*?animation-play-state:\s*paused/,
  );
});

test("destination motion waits for the cross-document transition to finish", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/layouts/BaseLayout.astro"),
    "utf8",
  );

  assert.match(source, /pagereveal/);
  assert.match(source, /viewTransition\.finished/);
  assert.match(source, /burns:page-settled/);
  assert.match(source, /dataset\.pageSettled/);
  assert.match(source, /if \("onpagereveal" in window\)/);
  assert.match(source, /window\.addEventListener\(\s*"load"/);
  assert.match(source, /if \(!pageRevealSeen\)/);
  assert.doesNotMatch(
    source,
    /dataset\.artifactArrival\s*&&\s*"onpagereveal"/,
  );
});

test("project earth frames decode progressively after the page settles", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/components/projects/RotatingEarth.astro"),
    "utf8",
  );

  assert.match(source, /burns:page-settled/);
  assert.match(source, /fetchPriority\s*=\s*"low"/);
  assert.doesNotMatch(source, /Promise\.all\(/);
  assert.match(source, /paintInterval\s*=\s*1000\s*\/\s*24/);
  assert.doesNotMatch(source, /globalCompositeOperation\s*=\s*"lighter"/);
});

test("project earth stays static on constrained devices", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/components/projects/RotatingEarth.astro"),
    "utf8",
  );

  assert.match(source, /connection\?\.saveData/);
  assert.match(source, /window\.innerWidth\s*<=\s*620/);
  assert.match(source, /has-static-earth/);
});

test("Ideas defers its entrance animation and avoids fixed oversized textures", () => {
  const singularitySource = readFileSync(
    resolve(projectRoot, "src/components/IdeasSingularity.astro"),
    "utf8",
  );
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.match(singularitySource, /burns:page-settled/);
  assert.match(singularitySource, /dataset\.motionReady/);
  assert.match(
    css,
    /\.ideas-signals\[data-motion-ready="true"\][\s\S]*?ideas-navigation-flow-in/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*1440px\)[\s\S]*?ideas-atlas-1280\.webp/,
  );
  assert.doesNotMatch(
    css,
    /body\[data-route="\/ideas"\][\s\S]{0,900}?background-attachment:\s*fixed/,
  );
});

test("secondary star fields use the lower continuous-rendering budget", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/components/CosmicField.astro"),
    "utf8",
  );

  assert.match(source, /cosmicMode === "stars" \? 64 : 92/);
  assert.match(source, /cosmicMode === "stars" \? 1\.2 : 1\.25/);
  assert.match(source, /cosmicMode === "stars" \? 60 : 50/);
});

test("Projects does not pin a full-viewport bitmap during scrolling", () => {
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.doesNotMatch(
    css,
    /background-attachment:\s*fixed/,
  );
});

test("project cards use the GitHub Octocat mark instead of a book", () => {
  const source = readFileSync(
    resolve(projectRoot, "src/components/projects/ProjectCard.astro"),
    "utf8",
  );

  assert.match(source, /class="project-card__github-mark"/);
  assert.match(source, /M12 \.297c-6\.63 0-12 5\.373-12 12/);
  assert.doesNotMatch(source, /M4\.5 4\.5h5\.2/);
});

test("Projects renders search, truthful pagination, an activity orbit, and satellite control", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/projects/index.astro"),
    "utf8",
  );
  const orbit = readFileSync(
    resolve(projectRoot, "src/components/projects/ActivityOrbit.astro"),
    "utf8",
  );
  const earth = readFileSync(
    resolve(projectRoot, "src/components/projects/RotatingEarth.astro"),
    "utf8",
  );

  assert.match(page, /name="q"/);
  assert.match(page, /export const prerender = false/);
  assert.match(page, /ArchivePagination/);
  assert.match(page, /listActivityDays\(6\)/);
  assert.match(page, /<ActivityOrbit/);
  assert.match(page, /<RotatingEarth/);
  assert.match(orbit, /data-satellite-control/);
  assert.match(earth, /data-projects-earth-motion/);
  assert.match(earth, /rotationDuration = 20_000/);
  assert.match(earth, /paintInterval = 1000 \/ 24/);
  assert.match(earth, /burns:page-settled/);
  assert.doesNotMatch(earth, /Promise\.all/);
  assert.doesNotMatch(page, /<CosmicField/);
});

test("Projects keeps the search, three cards, and activity orbit within a compact desktop composition", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/projects/index.astro"),
    "utf8",
  );
  const css = readFileSync(
    resolve(projectRoot, "src/styles/projects-archive-v2.css"),
    "utf8",
  );
  const orbit = readFileSync(
    resolve(projectRoot, "src/components/projects/ActivityOrbit.astro"),
    "utf8",
  );

  assert.match(page, /projects-v2__header-actions[\s\S]*?archive-search--projects/);
  assert.match(css, /width:\s*min\(1060px,\s*calc\(100vw - 120px\)\)/);
  assert.match(css, /padding:\s*clamp\(118px,\s*13svh,\s*138px\) 0 250px/);
  assert.match(css, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.archive-search--projects\s*\{[^}]*width:\s*min\(250px,\s*100%\)/);
  assert.match(css, /\.archive-search--projects\s*\{[^}]*height:\s*34px/);
  assert.match(css, /\.projects-v2 \.project-card\s*\{[^}]*min-height:\s*146px/);
  assert.match(css, /\.project-card__title h2\s*\{[^}]*font:\s*16px/);
  assert.match(css, /\.activity-orbit\s*\{[^}]*height:\s*248px/);
  assert.match(orbit, /\[91,\s*24\]/);
  assert.match(css, /right:\s*clamp\(6px,\s*1\.2vw,\s*24px\)/);
  assert.match(css, /top:\s*clamp\(-136px,\s*-8\.5vw,\s*-104px\)/);
});

test("shared GitHub contact points to Burns1028", () => {
  assert.equal(site.github, "https://github.com/Burns1028");
  assert.deepEqual(
    contacts.find(({ icon }) => icon === "github"),
    {
      label: "GitHub",
      kind: "link",
      href: "https://github.com/Burns1028",
      icon: "github",
    },
  );
});

test("shared email contact points to datazngao@gmail.com", () => {
  assert.equal(site.email, "datazngao@gmail.com");
  assert.deepEqual(
    contacts.find(({ icon }) => icon === "mail"),
    {
      label: "Email",
      kind: "link",
      href: "mailto:datazngao@gmail.com",
      icon: "mail",
    },
  );
});

test("shared Jike contact points to Burns' profile", () => {
  const profileUrl =
    "https://web.okjike.com/u/1B6E3DA3-83C2-4686-ACF6-221B730D4707";

  assert.equal(site.jike, profileUrl);
  assert.deepEqual(
    contacts.find(({ icon }) => icon === "jike"),
    {
      label: "Jike",
      kind: "link",
      href: profileUrl,
      icon: "jike",
    },
  );
});

test("shared X contact points to GaoZhangyo96596", () => {
  const profileUrl = "https://x.com/GaoZhangyo96596";

  assert.equal(site.x, profileUrl);
  assert.deepEqual(
    contacts.find(({ icon }) => icon === "x"),
    {
      label: "X",
      kind: "link",
      href: profileUrl,
      icon: "x",
    },
  );
});

test("project cards use real SQLite repository URLs and the GitHub mark", () => {
  const card = readFileSync(
    resolve(projectRoot, "src/components/projects/ProjectCard.astro"),
    "utf8",
  );

  assert.match(card, /project\.repoUrl/);
  assert.match(card, /project-card__github-mark/);
  assert.doesNotMatch(card, /CollectionEntry|astro:content/);
});

test("six lunar phase assets are available for article section ornaments", () => {
  for (let phase = 1; phase <= 6; phase += 1) {
    const relativePath = `public/assets/article-section-phase-${phase}.webp`;
    assert.ok(
      existsSync(resolve(projectRoot, relativePath)),
      `${relativePath} must exist`,
    );
  }
});

test("article body headings do not repeat in the side rail", () => {
  const route = readFileSync(
    resolve(projectRoot, "src/pages/writing/[...slug].astro"),
    "utf8",
  );
  const layout = readFileSync(
    resolve(projectRoot, "src/layouts/ArticleLayout.astro"),
    "utf8",
  );

  assert.match(route, /showTableOfContents=\{false\}/);
  assert.match(layout, /showTableOfContents\?: boolean/);
  assert.match(layout, /showTableOfContents && \(/);
});

test("writing articles end without an editorial slogan", () => {
  const layout = readFileSync(
    resolve(projectRoot, "src/layouts/ArticleLayout.astro"),
    "utf8",
  );
  const css = readFileSync(
    resolve(projectRoot, "src/styles/global.css"),
    "utf8",
  );

  assert.doesNotMatch(layout, /记录不是终点/);
  assert.doesNotMatch(css, /\.writing-end\s*>\s*p\s*\{/);
});
