---
name: burns-update-github-progress
description: Use when Burns provides a GitHub repository to list in Projects or asks to record one verified development milestone.
---

# Burns GitHub Projects and Progress

Use the production signed HTTPS API. There is no local database fallback.

## Verify Facts First

核对准确的 `owner/repository`、标题、简介、主要语言、状态、事件时间、事件类型和活动说明。不要从占位图推断项目，也不要把 Git 提交流水直接当成精选进度。稳定的 `source-key` 应在修订同一事件时复用。

## Register a repository only

When Burns gives a GitHub repository URL without describing a timeline event, register only the project:

```bash
node skills/burns-update-github-progress/scripts/register-project.mjs \
  --repo https://github.com/Burns1028/repository --validate
```

The command reads the repository's public metadata once, validates the SQLite payload, and does not create an activity. Remove `--validate` only after the response matches the requested repository. Optional overrides are `--project-title`, `--project-summary`, `--language`, `--project-status`, `--demo-url`, `--featured`, `--display-order`, `--project-published-at`, and `--project-updated-at`.

`--display-order` accepts an integer from `1` through `100000`; smaller values appear first. Use `--display-order none` to clear an existing manual position. Omit the option to preserve an existing position during metadata updates. The same option is available when recording a curated progress event.

## Record a curated progress event

Only use this flow when Burns explicitly provides or approves one concrete milestone for the timeline.

`--occurred-at` 是时间线日期的唯一来源，可以传入带时区的历史日期来补录旧进度。修订同一条历史记录时必须复用原来的 `--source-key`；只有不同事件才创建新的 key。

先运行只读校验：

```bash
node skills/burns-update-github-progress/scripts/upload.mjs \
  --repo Burns1028/repository --slug repository \
  --project-title "Project title" --project-summary "Verified summary" \
  --language TypeScript --project-status active \
  --source-key repository:2026-08-02:event \
  --occurred-at 2026-08-02T21:00:00+08:00 --kind progress \
  --activity-title "Concrete change" --activity-summary "What changed" \
  --validate
```

校验通过后移除 `--validate`。两个流程都需要 `BURNS_PUBLISH_URL`、`BURNS_PUBLISH_KEY_ID` 和 Keychain 服务 `burns-blog-publisher` 中的密钥。缺少配置时必须失败。

不要编造提交、日期、语言、发布或说明；不要直接写 SQLite，也不要只创建前端卡片。
