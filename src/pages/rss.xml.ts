import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../data/site";

export async function GET(context: { site?: URL }) {
  const entries = (await getCollection("writing", ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? "https://margin-notes.example.com",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.publishedAt,
      link: `/writing/${entry.id}/`,
    })),
  });
}
