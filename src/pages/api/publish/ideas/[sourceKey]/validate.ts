import type { APIContext } from "astro";
import { getArticleDatabase } from "../../../../../lib/server/content-store.ts";
import { validateIdea, type IdeaInput } from "../../../../../lib/server/idea-store.ts";
import { verifyPublishRequest } from "../../../../../lib/server/publish-auth.ts";
import {
  publishAuthError,
  publishError,
  publishSuccess,
} from "../../../../../lib/server/publish-response.ts";

export const prerender = false;

export async function POST({ request, params }: APIContext): Promise<Response> {
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
    const payload = (await request.json()) as IdeaInput;
    const sourceKey = params.sourceKey ?? "";
    if (payload.sourceKey !== sourceKey) {
      return publishError(400, "PUBLISH_SOURCE_KEY_MISMATCH", "灵感 sourceKey 与路径不一致。");
    }
    const normalized = validateIdea(payload);
    return publishSuccess({
      validated: true,
      sourceKey: normalized.sourceKey,
      status: normalized.status,
    });
  } catch (error) {
    return publishError(
      400,
      "PUBLISH_IDEA_INVALID",
      error instanceof Error ? error.message : "灵感数据无效。",
    );
  }
}
