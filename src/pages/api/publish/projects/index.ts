import type { APIContext } from "astro";
import { getArticleDatabase } from "../../../../lib/server/content-store.ts";
import { publishProject } from "../../../../lib/server/project-publisher.ts";
import type { ProjectInput } from "../../../../lib/server/project-store.ts";
import { verifyPublishRequest } from "../../../../lib/server/publish-auth.ts";
import {
  publishAuthError,
  publishError,
  publishSuccess,
} from "../../../../lib/server/publish-response.ts";

export const prerender = false;

export async function PUT({ request }: APIContext): Promise<Response> {
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
    const payload = (await request.json()) as ProjectInput;
    const result = publishProject(payload, database, false);
    return publishSuccess({ project: result.project });
  } catch (error) {
    return publishError(
      400,
      "PUBLISH_PROJECT_INVALID",
      error instanceof Error ? error.message : "项目数据无效。",
    );
  }
}
