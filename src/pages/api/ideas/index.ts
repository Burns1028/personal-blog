import { listPublishedIdeas } from "../../../lib/server/idea-store.ts";

export const prerender = false;

export function GET(): Response {
  const ideas = listPublishedIdeas();

  return Response.json(
    {
      data: ideas.map((idea) => ({
        id: idea.id,
        sourceKey: idea.sourceKey,
        text: idea.text,
        theme: idea.theme,
        capturedAt: idea.capturedAt,
        featured: idea.featured,
      })),
      meta: { count: ideas.length, storage: "sqlite" },
    },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
