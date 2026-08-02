import type { APIContext } from "astro";
import { listActivityDays } from "../../../lib/server/activity-store";

export const prerender = false;

export function GET({ url }: APIContext): Response {
  const requested = Number(url.searchParams.get("days") ?? 6);
  const days = Math.min(
    12,
    Math.max(1, Number.isFinite(requested) ? Math.trunc(requested) : 6),
  );

  return Response.json(
    {
      data: listActivityDays(days),
      meta: { days, storage: "sqlite" },
    },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
