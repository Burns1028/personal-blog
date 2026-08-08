import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://burnsgao.me",
  adapter: node({
    mode: "standalone",
  }),
  devToolbar: {
    enabled: false,
  },
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
      defaultColor: false,
      wrap: true,
    },
  },
});
