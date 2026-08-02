import type { APIContext } from "astro";
import { getArticleDatabase } from "../../../../lib/server/content-store.ts";
import { listIdeas, type IdeaStatus } from "../../../../lib/server/idea-store.ts";
import { verifyPublishRequest } from "../../../../lib/server/publish-auth.ts";
import { publishAuthError, publishError } from "../../../../lib/server/publish-response.ts";

export const prerender = false;

export async function GET({ request }: APIContext): Promise<Response> {
  const database = getArticleDatabase();
  try {
    await verifyPublishRequest(request, database);
  } catch {
    return publishAuthError();
  }

  const status = new URL(request.url).searchParams.get("status") ?? "all";
  if (!["all", "draft", "published", "archived"].includes(status)) {
    return publishError(400, "PUBLISH_IDEA_STATUS", "灵感状态无效。");
  }
  const ideas = listIdeas(status as IdeaStatus | "all", database);
  return Response.json(
    { data: ideas, meta: { count: ideas.length } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
