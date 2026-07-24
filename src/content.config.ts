import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const baseEntry = z.object({
  title: z.string(),
  summary: z.string(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
});

const writing = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/writing" }),
  schema: baseEntry.extend({
    number: z.string(),
    readingTime: z.string(),
    deck: z.string().optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: baseEntry.extend({
    number: z.string(),
    status: z.enum(["living", "stable", "archived"]).default("living"),
    section: z.string(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: baseEntry.extend({
    number: z.string(),
    repo: z.url(),
    demo: z.url().optional(),
    language: z.string(),
    status: z.enum(["active", "maintained", "experiment", "archived"]),
    command: z.string(),
  }),
});

export const collections = { writing, docs, projects };
