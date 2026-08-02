---
name: burns-upload-article
description: Use when publishing or updating a Markdown article, including local images and mixed text-image content, in the Burns personal blog.
---

# Burns Upload Article

Publish one trusted Markdown article to the production Burns blog through its signed HTTPS API. This Skill has no local database fallback.

## Configuration

Set `BURNS_PUBLISH_URL=https://burnsgao.me` and `BURNS_PUBLISH_KEY_ID=primary`. Store the hexadecimal secret in macOS Keychain:

```bash
security add-generic-password -U -a Burns -s burns-blog-publisher -w
```

Missing URL, Key ID, or secret is a hard failure.

## Workflow

1. Start from `assets/article-template.md`. Require a title and explicit publication metadata.
2. Keep local images beside the Markdown and reference them with relative paths. The client packages them; production converts them to WebP.
3. Use a stable lowercase slug and choose `draft`, `published`, or `archived` deliberately.
4. Validate without writing:

```bash
node skills/burns-upload-article/scripts/upload.mjs --file /absolute/article.md --slug stable-slug --status published --validate
```

5. Publish by removing `--validate`. Confirm the response slug, status, revision, URL, and asset list. Repeating unchanged content must preserve the revision.

## Safety

- Default uncertain work to `draft`.
- Do not invent dates, claims, captions, or sources.
- Do not delete the source Markdown or images.
- Never write SQLite directly, SSH content into production, or add frontend fallback data.
