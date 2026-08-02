# Burns’ Blog

Burns 的 Astro 个人博客。生产环境中的 Writing、Ideas、Projects 和 Project Activities 都以服务器持久化 SQLite 为事实源；Git 仓库只保存代码和视觉资产，不保存文章、灵感或生产数据库。

## 内容发布

内容更新通过仓库内 Skill 调用生产 HTTPS 接口完成：

- `skills/burns-upload-article`：发布含本地图片的 Markdown 文章；
- `skills/burns-upload-idea`：记录或修订一条灵感；
- `skills/burns-update-github-progress`：一次写入真实 GitHub 项目资料与一条项目活动。

### 发布文章

模板位于 `skills/burns-upload-article/assets/article-template.md`。本地图片使用 Markdown 相对路径，客户端会把图片与 Markdown 打包；生产端校验、压缩为 WebP，并写入持久素材目录。

```bash
node skills/burns-upload-article/scripts/upload.mjs \
  --file /absolute/path/article.md \
  --slug article-slug \
  --status published \
  --validate
```

校验通过后移除 `--validate` 才会写入生产数据库。

### 发布灵感

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --source-key 2026-08-02-observation \
  --text "一条真实观察。" \
  --theme "系统" \
  --captured-at 2026-08-02T20:30:00+08:00 \
  --status published
```

### 更新 GitHub 项目进度

```bash
node skills/burns-update-github-progress/scripts/upload.mjs \
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
  --activity-summary "What changed and why" \
  --validate
```

三个 Skill 都需要 `BURNS_PUBLISH_URL=https://burnsgao.me`、`BURNS_PUBLISH_KEY_ID=primary`，并从 macOS Keychain 服务 `burns-blog-publisher` 读取密钥。配置缺失时直接失败，不会回退到本地数据库。底层命令对应 `npm run article:upload`、`npm run idea:upload` 和 `npm run github:progress`。

## 读取接口

- `GET /api/articles`
- `GET /api/articles/:slug`
- `GET /api/ideas`
- `GET /api/projects`
- `GET /api/activities?days=6`

写入不通过前端或公开 API 完成，只走签名后的私有接口。生产服务通过 `BLOG_DB_PATH` 和 `BLOG_MEDIA_PATH` 指向服务器持久目录。

## 本地运行

需要 Node.js 24.15 或更高版本。

```bash
npm install
npm run dev
```

完整验证与生产构建：

```bash
npm run test:content
npm run build
npm start
```

`src/content/docs/` 仍用于站内文档；Writing、Ideas 和 Projects 不再使用 Astro content collection。

## 部署

这是使用本地 SQLite 的 Node SSR 应用。生产环境必须使用单实例与持久磁盘，并把 `BLOG_DB_PATH` 指向持久目录。GitHub Pages、无状态 serverless/edge 和多副本部署不能直接共享该本地数据库；这些部署形态需要远程 SQLite/LibSQL 或 PostgreSQL。
