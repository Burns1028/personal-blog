import type { APIContext } from "astro";
import { getArticleDatabase } from "../../../../../lib/server/content-store.ts";
import {
  publishProjectProgress,
  type ProjectProgressPackage,
} from "../../../../../lib/server/project-progress-publisher.ts";
import { verifyPublishRequest } from "../../../../../lib/server/publish-auth.ts";
import {
  publishAuthError,
  publishError,
  publishSuccess,
} from "../../../../../lib/server/publish-response.ts";

export const prerender = false;

export async function POST({ request }: APIContext): Promise<Response> {
  const database = getArticleDatabase();
  try {
    await verifyPublishRequest(request, database);
  } catch {
    return publishAuthError();
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return publishError(415, "PUBLISH_CONTENT_TYPE", "请求必须使用 JSON。");
  }
  try {
    const payload = (await request.json()) as ProjectProgressPackage;
    const result = publishProjectProgress(payload, database, true);
    return publishSuccess({
      validated: true,
      projectSlug: result.project.slug,
      sourceKey: result.activity.sourceKey,
    });
  } catch (error) {
    return publishError(
      400,
      "PUBLISH_PROJECT_PROGRESS_INVALID",
      error instanceof Error ? error.message : "项目进度数据无效。",
    );
  }
}
