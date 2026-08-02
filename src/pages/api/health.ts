import { accessSync, constants, existsSync } from "node:fs";
import { getArticleDatabase } from "../../lib/server/content-store.ts";

export const prerender = false;

export function GET(): Response {
  const checks: { database: "ok" | "failed"; media: "ok" | "failed" } = {
    database: "failed",
    media: "failed",
  };

  try {
    getArticleDatabase().prepare("SELECT 1 AS healthy").get();
    checks.database = "ok";
  } catch {
    checks.database = "failed";
  }

  try {
    const mediaRoot = process.env.BLOG_MEDIA_PATH ?? "public/media/articles";
    if (!existsSync(mediaRoot)) throw new Error("missing");
    accessSync(mediaRoot, constants.R_OK | constants.W_OK);
    checks.media = "ok";
  } catch {
    checks.media = "failed";
  }

  const healthy = checks.database === "ok" && checks.media === "ok";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      release: process.env.BURNS_RELEASE_SHA ?? "unknown",
      checks,
      time: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
