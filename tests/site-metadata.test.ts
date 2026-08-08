import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");
const productionOrigin = "https://burnsgao.me";

test("production metadata, RSS, and robots use the public Burns domain", () => {
  const astroConfig = readFileSync(
    resolve(projectRoot, "astro.config.mjs"),
    "utf8",
  );
  const rssRoute = readFileSync(
    resolve(projectRoot, "src/pages/rss.xml.ts"),
    "utf8",
  );
  const robots = readFileSync(
    resolve(projectRoot, "public/robots.txt"),
    "utf8",
  );

  assert.match(astroConfig, new RegExp(productionOrigin));
  assert.match(rssRoute, new RegExp(productionOrigin));
  assert.match(
    robots,
    new RegExp(`Sitemap: ${productionOrigin}/sitemap-index\\.xml`),
  );

  for (const source of [astroConfig, rssRoute, robots]) {
    assert.doesNotMatch(source, /burns-blog\.example\.com/);
  }
});
