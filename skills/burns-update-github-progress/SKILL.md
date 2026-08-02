---
name: burns-update-github-progress
description: Use when adding or correcting a verified GitHub repository and one concrete development activity in the Burns personal blog Projects archive.
---

# Burns Update GitHub Progress

Publish one verified project record and one concrete activity atomically through the production signed HTTPS API. There is no local database fallback.

## Verify Facts First

核对准确的 `owner/repository`、标题、简介、主要语言、状态、事件时间、事件类型和活动说明。不要从占位图推断项目，也不要把 Git 提交流水直接当成精选进度。稳定的 `source-key` 应在修订同一事件时复用。

## Publish

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

校验通过后移除 `--validate`。需要 `BURNS_PUBLISH_URL`、`BURNS_PUBLISH_KEY_ID` 和 Keychain 服务 `burns-blog-publisher` 中的密钥。缺少配置时必须失败。

不要编造提交、日期、语言、发布或说明；不要直接写 SQLite，也不要只创建前端卡片。
