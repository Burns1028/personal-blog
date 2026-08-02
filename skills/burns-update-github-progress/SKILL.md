---
name: burns-update-github-progress
description: Use when adding or correcting a verified GitHub repository and one concrete development activity in the Burns personal blog Projects archive.
---

# Burns Update GitHub Progress

Write verified project metadata and one activity to the blog's SQLite backend in a single transaction. The Projects page then reads project cards and its activity orbit from those records.

## Verify Facts First

Use information supplied by the user or inspect the named public repository when current metadata is requested. Confirm the exact `owner/repository`, title, summary, primary language, status, event time, event kind, activity title, and activity summary. Do not infer a repository from a screenshot or invent progress from visual placeholders.

Choose a stable activity `source-key`, preferably `<repository>:<date>:<event-identifier>`. Reuse it when correcting the same event.

## Publish

Run:

```bash
node skills/burns-update-github-progress/scripts/upload.mjs \
  --project-root /absolute/path/to/personal-blog \
  --repo Burns1028/repository \
  --slug repository \
  --project-title "Project title" \
  --project-summary "Verified project summary" \
  --language TypeScript \
  --project-status active \
  --source-key repository:2026-08-02:event \
  --occurred-at 2026-08-02T21:00:00+08:00 \
  --kind progress \
  --activity-title "Concrete change" \
  --activity-summary "What changed and why"
```

Use `--activity-url` for a specific commit, pull request, release, or issue when known. Use `--demo-url` and `--featured` only when verified. Read the JSON response and confirm both project and activity identifiers. Repeating one source key must update one activity, not create duplicates.

## Safety

- Do not substitute the GitHub profile URL for a repository URL.
- Do not fabricate commits, dates, languages, releases, or project descriptions.
- Do not write only a frontend card; the command must complete successfully.
- Do not weaken missing-field validation. If facts are unavailable, leave the archive empty and report what is missing.
