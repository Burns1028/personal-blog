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

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: baseEntry.extend({
    number: z.string(),
    status: z.enum(["living", "stable", "archived"]).default("living"),
    section: z.string(),
  }),
});

export const collections = { docs };
