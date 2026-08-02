import type { APIContext } from "astro";
import { getArticleDatabase } from "../../../../lib/server/content-store.ts";
import {
  deleteIdea,
  getStoredIdeaBySourceKey,
  upsertIdea,
  type IdeaInput,
} from "../../../../lib/server/idea-store.ts";
import { verifyPublishRequest } from "../../../../lib/server/publish-auth.ts";
import {
  publishAuthError,
  publishError,
  publishSuccess,
} from "../../../../lib/server/publish-response.ts";

export const prerender = false;

async function authenticate(request: Request) {
  const database = getArticleDatabase();
  try {
    await verifyPublishRequest(request, database);
    return { database };
  } catch {
    return { database, response: publishAuthError() };
  }
}

export async function GET({ request, params }: APIContext): Promise<Response> {
  const auth = await authenticate(request);
  if (auth.response) return auth.response;
  const sourceKey = params.sourceKey ?? "";
  const idea = getStoredIdeaBySourceKey(sourceKey, auth.database);
  return idea
    ? publishSuccess(idea)
    : publishError(404, "PUBLISH_IDEA_NOT_FOUND", "未找到这条灵感。");
}

export async function PUT({ request, params }: APIContext): Promise<Response> {
  const auth = await authenticate(request);
  if (auth.response) return auth.response;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return publishError(415, "PUBLISH_CONTENT_TYPE", "请求必须使用 JSON。");
  }

  try {
    const payload = (await request.json()) as IdeaInput;
    const sourceKey = params.sourceKey ?? "";
    if (payload.sourceKey !== sourceKey) {
      return publishError(400, "PUBLISH_SOURCE_KEY_MISMATCH", "灵感 sourceKey 与路径不一致。");
    }
    return publishSuccess(upsertIdea(payload, auth.database));
  } catch (error) {
    return publishError(
      400,
      "PUBLISH_IDEA_INVALID",
      error instanceof Error ? error.message : "灵感数据无效。",
    );
  }
}

export async function DELETE({ request, params }: APIContext): Promise<Response> {
  const auth = await authenticate(request);
  if (auth.response) return auth.response;
  const sourceKey = params.sourceKey ?? "";
  if (request.headers.get("x-burns-confirm-delete") !== sourceKey) {
    return publishError(400, "PUBLISH_DELETE_CONFIRMATION", "删除确认与 sourceKey 不一致。");
  }
  const deleted = deleteIdea(sourceKey, auth.database);
  return publishSuccess({ sourceKey, deleted });
}
