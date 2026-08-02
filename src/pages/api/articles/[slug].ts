import type { APIContext } from "astro";
import {
  getStoredArticleBySlug,
  listArticleAssets,
} from "../../../lib/server/content-store";
import { renderArticleMarkdown } from "../../../lib/server/markdown";

export const prerender = false;

export async function GET({
  params,
  request,
  url,
}: APIContext): Promise<Response> {
  const slug = params.slug;
  if (!slug) {
    return Response.json(
      { error: { code: "ARTICLE_SLUG_REQUIRED", message: "缺少文章 slug。" } },
      { status: 400 },
    );
  }

  const article = getStoredArticleBySlug(slug);
  if (!article) {
    return Response.json(
      { error: { code: "ARTICLE_NOT_FOUND", message: "文章不存在或尚未发布。" } },
      { status: 404 },
    );
  }

  const etag = `"${article.contentSha256}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  const assets = listArticleAssets(article.id);
  const rendered = await renderArticleMarkdown(article.bodyMarkdown, assets);

  return Response.json(
    {
      data: {
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
        bodyMarkdown: article.bodyMarkdown,
        contentHtml: rendered.html,
        headings: rendered.headings,
        assets: assets.map((asset) => ({
          url: asset.publicUrl,
          mediaType: asset.mediaType,
          width: asset.width,
          height: asset.height,
          bytes: asset.byteSize,
          sha256: asset.sha256,
          alt: asset.altText,
          caption: asset.caption,
        })),
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
        ETag: etag,
      },
    },
  );
}
