# GitHub 项目手动登记设计

日期：2026-08-06

## 目标

当 Burns 提供一个 GitHub 仓库地址时，通过受签名保护的发布接口把项目资料写入 SQLite，并立即出现在 Projects 页面和公开项目接口中。

不再定时扫描 GitHub，不安装 systemd timer，也不自动订阅仓库变化。活动时间线继续由 Burns 明确要求后，通过 `burns-update-github-progress` 的进度发布流程单独维护。

## 数据流

```text
GitHub 仓库地址
  -> Skill 单次读取仓库公开元数据
  -> POST 校验（事务回滚）
  -> PUT 发布（签名 HTTPS）
  -> SQLite projects
  -> Projects 页面与 GET /api/projects
```

项目登记入口只写 `projects`。它不导入活动存储、不创建 `activities`，也不根据 commit、release 或 event 推断时间线。

## 接口

- `POST /api/publish/projects/validate`：验证签名、内容类型和项目字段，在事务中执行后回滚。
- `PUT /api/publish/projects`：验证签名并幂等写入项目。
- `GET /api/projects`：公开读取当前 SQLite 中未归档的项目。

写入结构沿用 `ProjectInput`：`slug`、`githubFullName`、`title`、`summary`、`repoUrl`、`demoUrl`、`language`、`status`、`featured`、`publishedAt` 与 `updatedAt`。

## Skill 行为

`skills/burns-update-github-progress/scripts/register-project.mjs` 接受仓库 URL 或 `owner/repository`。它只在用户明确触发时读取一次 GitHub 仓库元数据，构建项目记录并调用上述接口。

默认使用仓库名、描述、主页、主要语言、创建时间和最近推送时间；这些字段均可通过参数人工覆盖。第一次先使用 `--validate`，确认后再正式发布。

`scripts/upload.mjs` 保留为精选进度发布入口。只有用户明确提供或认可一个具体里程碑时，才同时写项目与活动。

## 验收

1. 项目校验不留下表或数据。
2. 同一项目重复发布只保留一行。
3. 项目登记前后 `activities` 行数不变；空库中不会创建活动表。
4. `GET /api/projects` 返回 `storage: sqlite`，Projects 页面继续调用同一存储层。
5. 未签名请求被拒绝。
6. Skill 中项目登记与进度登记是两个清晰、不可混淆的命令。
