import type { APIContext } from "astro";
import { listPublishedArticles } from "../../../lib/server/content-store";

export const prerender = false;

export function GET({ url }: APIContext): Response {
  const articles = listPublishedArticles();

  return Response.json(
    {
      data: articles.map((article) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        deck: article.deck,
        tags: article.tags,
        featured: article.featured,
        number: article.number,
        readingMinutes: article.readingMinutes,
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        revision: article.revision,
        url: new URL(`/writing/${article.slug}`, url).pathname,
      })),
      meta: {
        count: articles.length,
        storage: "sqlite",
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
      },
    },
  );
}
