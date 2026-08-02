---
name: burns-upload-idea
description: Use when recording, publishing, correcting, listing, or deleting one concise observation in the Burns personal blog Idea archive. Supports full CRUD via --action.
---

# Burns Upload Idea

Manage ideas in the Burns personal blog through the SQLite importer. Never append an idea to a TypeScript array or render it directly in a page.

## Operations

All operations use the same entry point with `--action`:

| Action | 用途 |
|---|---|
| `upsert` | 新增或更新一条想法（默认） |
| `list` | 列出想法，支持按状态过滤 |
| `get` | 按 source-key 查单条 |
| `delete` | 按 source-key 删除 |

---

## Create / Update (upsert)

1. Preserve the user's wording. Edit only for an explicitly requested correction; do not expand a small observation into invented copy.
2. Choose a stable `source-key` using lowercase ASCII words and hyphens, such as `2026-08-02-evidence-before-confidence`. Reuse it when correcting the same idea.
3. Set `captured-at` to the actual known time in ISO 8601 form. Include a timezone offset when available.
4. Supply a short `theme`. Use `draft` when publication intent is uncertain, otherwise use the status the user requested.
5. Run:

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --project-root /absolute/path/to/personal-blog \
  --action upsert \
  --source-key 2026-08-02-observation \
  --text "一条真实观察。" \
  --theme "系统" \
  --captured-at 2026-08-02T20:30:00+08:00 \
  --status published
```

Add `--featured` only when the user explicitly wants the record prioritized. Read the JSON response and verify the source key, status, and capture time. Re-run the same command when correcting the record; the database must keep one row.

---

## List

List ideas, optionally filtered by status. Defaults to `published` when `--status` is omitted.

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --project-root /absolute/path/to/personal-blog \
  --action list \
  --status published
```

Status filter accepts: `published`, `draft`, `archived`, `all`.

Output:
```json
{
  "ideas": [{ "id": 1, "sourceKey": "...", "text": "...", ... }],
  "count": 3
}
```

---

## Get

Fetch a single idea by source-key.

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --project-root /absolute/path/to/personal-blog \
  --action get \
  --source-key 2026-08-02-observation
```

Output: the full idea object as JSON, or `{ "found": false, "sourceKey": "..." }` with exit code 1.

---

## Delete

Remove an idea by source-key.

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --project-root /absolute/path/to/personal-blog \
  --action delete \
  --source-key 2026-08-02-observation
```

Output: `{ "deleted": true, "sourceKey": "..." }`. Exit code 1 if the key was not found.

---

## Safety

- Do not invent an observation, date, theme, or featured status.
- Do not publish multiple ideas in one command.
- Do not write SQL directly or add fallback mock content.
- Report command validation errors instead of weakening required fields.
- Confirm before deleting; never delete without the user explicitly asking.
