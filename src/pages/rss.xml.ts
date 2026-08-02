import rss from "@astrojs/rss";
import { site } from "../data/site";
import { getWritingCatalog } from "../lib/server/writing-catalog";

export const prerender = false;

export async function GET(context: { site?: URL }) {
  const entries = await getWritingCatalog();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? "https://burns-blog.example.com",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.publishedAt,
      link: `/writing/${entry.id}/`,
    })),
  });
}
