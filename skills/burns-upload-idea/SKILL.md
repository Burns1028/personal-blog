---
name: burns-upload-idea
description: Use when recording, publishing, correcting, listing, reading, or deleting one concise observation in the Burns personal blog Idea archive.
---

# Burns Upload Idea

Manage production ideas only through the signed HTTPS API. This Skill has no local database fallback.

## Configuration

Set `BURNS_PUBLISH_URL=https://burnsgao.me` and `BURNS_PUBLISH_KEY_ID=primary`. Store the hexadecimal secret in Keychain service `burns-blog-publisher`. Missing configuration is a hard failure.

## Upsert

Preserve the user's wording, choose one stable lowercase `source-key`, use the actual known `captured-at`, and validate before writing:

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --action upsert --source-key 2026-08-02-observation \
  --text "一条真实观察。" --theme "系统" \
  --captured-at 2026-08-02T20:30:00+08:00 --status published --validate
```

Remove `--validate` to publish. Reusing a source key updates exactly one record.

## Read

Use `--action list --status published` or `--action get --source-key <key>`.

## Delete

Delete only after explicit user authorization, and require the same key twice:

```bash
node skills/burns-upload-idea/scripts/upload.mjs --action delete \
  --source-key observation --confirm-delete observation
```

Never write SQL directly, invent content metadata, or add mock fallback data.
