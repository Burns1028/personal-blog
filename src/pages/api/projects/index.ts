import { listPublishedProjects } from "../../../lib/server/project-store.ts";

export const prerender = false;

export function GET(): Response {
  const projects = listPublishedProjects();

  return Response.json(
    {
      data: projects.map((project) => ({
        id: project.id,
        slug: project.slug,
        githubFullName: project.githubFullName,
        title: project.title,
        summary: project.summary,
        repoUrl: project.repoUrl,
        demoUrl: project.demoUrl,
        language: project.language,
        status: project.status,
        featured: project.featured,
        publishedAt: project.publishedAt,
        updatedAt: project.updatedAt,
      })),
      meta: { count: projects.length, storage: "sqlite" },
    },
    { headers: { "Cache-Control": "private, no-cache" } },
  );
}
