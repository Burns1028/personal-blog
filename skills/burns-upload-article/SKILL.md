---
name: burns-upload-article
description: Use when publishing or updating a Markdown article, including local images and mixed text-image content, in the Burns personal blog.
---

# Burns Upload Article

Publish one trusted Markdown source through the blog's SQLite importer. Keep SQLite as the only runtime source; never add the article to `src/content/writing` or hardcode it in a page.

## Workflow

1. Locate the `burns-personal-blog` repository. Set `BURNS_BLOG_ROOT` or pass `--project-root` when running outside it.
2. Start from `assets/article-template.md` when creating a source. Require a non-empty `title`; prefer explicit `summary`, `publishedAt`, `tags`, `number`, and `status` frontmatter.
3. Keep article images as local files referenced by relative or absolute Markdown paths. Write specific alt text. The importer converts them to WebP, archives them under `public/media/articles/<slug>/`, and rewrites the Markdown.
4. Choose a stable lowercase ASCII slug. Always pass it explicitly for a flat Markdown file.
5. Run:

```bash
node skills/burns-upload-article/scripts/upload.mjs \
  --project-root /absolute/path/to/personal-blog \
  --file /absolute/path/to/article.md \
  --slug stable-article-slug \
  --status published
```

6. Read the JSON result. Confirm the expected slug, status, revision, URL, and every imported asset. A repeated unchanged upload must preserve the revision; changed Markdown must increment it.
7. Run the relevant content tests or build before reporting publication complete.

## Safety

- Default new or uncertain work to `draft`; use `published` only when the user asked to publish.
- Do not invent dates, sources, captions, or article claims.
- Do not delete the source Markdown or original images unless separately authorized.
- Do not write SQL directly or add a frontend fallback.
