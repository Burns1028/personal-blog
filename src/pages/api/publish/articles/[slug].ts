import type { APIContext } from "astro";
import {
  deleteArticlePackage,
  publishArticlePackage,
  type ArticlePublishPackage,
} from "../../../../lib/server/article-publisher.ts";
import { getArticleDatabase } from "../../../../lib/server/content-store.ts";
import { verifyPublishRequest } from "../../../../lib/server/publish-auth.ts";
import {
  publishAuthError,
  publishError,
  publishSuccess,
} from "../../../../lib/server/publish-response.ts";

export const prerender = false;
const MAX_BODY_BYTES = 32 * 1024 * 1024;

export async function PUT({ request, params }: APIContext): Promise<Response> {
  const database = getArticleDatabase();
  try {
    await verifyPublishRequest(request, database);
  } catch {
    return publishAuthError();
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return publishError(415, "PUBLISH_CONTENT_TYPE", "请求必须使用 JSON。 ");
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return publishError(413, "PUBLISH_BODY_TOO_LARGE", "发布内容超过大小限制。");
  }

  try {
    const payload = (await request.json()) as ArticlePublishPackage;
    const routeSlug = params.slug ?? "";
    if (payload.slug !== routeSlug) {
      return publishError(400, "PUBLISH_SLUG_MISMATCH", "文章 slug 与路径不一致。");
    }
    const result = await publishArticlePackage(payload, {
      database,
      mediaRoot: process.env.BLOG_MEDIA_PATH ?? "public/media/articles",
      validateOnly: false,
    });
    return publishSuccess({
      slug: result.article.slug,
      status: result.article.status,
      revision: result.article.revision,
      url: `/writing/${result.article.slug}`,
      assets: result.assets,
    });
  } catch (error) {
    return publishError(
      400,
      "PUBLISH_ARTICLE_INVALID",
      error instanceof Error ? error.message : "文章数据无效。",
    );
  }
}

export async function DELETE({ request, params }: APIContext): Promise<Response> {
  const database = getArticleDatabase();
  try {
    await verifyPublishRequest(request, database);
  } catch {
    return publishAuthError();
  }

  const slug = params.slug ?? "";
  if (request.headers.get("x-burns-confirm-delete") !== slug) {
    return publishError(400, "PUBLISH_DELETE_CONFIRMATION", "删除确认与文章 slug 不一致。");
  }

  try {
    const deleted = deleteArticlePackage(slug, {
      database,
      mediaRoot: process.env.BLOG_MEDIA_PATH ?? "public/media/articles",
    });
    return publishSuccess({ slug, deleted });
  } catch (error) {
    return publishError(
      400,
      "PUBLISH_ARTICLE_DELETE_INVALID",
      error instanceof Error ? error.message : "文章删除失败。",
    );
  }
}
