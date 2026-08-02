# Burns’ Blog

Burns 的 Astro 个人博客。Writing、Ideas、Projects 和 Project Activities 都以 `data/blog.sqlite` 为唯一事实源；页面不保留静态示例或前端 Mock 回退。

## 内容发布

所有内容写入统一通过仓库内三个 Skill 完成：

- `skills/burns-upload-article`：发布含本地图片的 Markdown 文章；
- `skills/burns-upload-idea`：记录或修订一条灵感；
- `skills/burns-update-github-progress`：一次写入真实 GitHub 项目资料与一条项目活动。

### 发布文章

模板位于 `skills/burns-upload-article/assets/article-template.md`。本地图片使用 Markdown 相对路径，导入时会压缩为 WebP 并归档到 `public/media/articles/<slug>/`。

```bash
node skills/burns-upload-article/scripts/upload.mjs \
  --project-root "$PWD" \
  --file /absolute/path/article.md \
  --slug article-slug \
  --status published
```

### 发布灵感

```bash
node skills/burns-upload-idea/scripts/upload.mjs \
  --project-root "$PWD" \
  --source-key 2026-08-02-observation \
  --text "一条真实观察。" \
  --theme "系统" \
  --captured-at 2026-08-02T20:30:00+08:00 \
  --status published
```

### 更新 GitHub 项目进度

```bash
node skills/burns-update-github-progress/scripts/upload.mjs \
  --project-root "$PWD" \
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

三个 Skill 都支持 `BURNS_BLOG_ROOT`，也可显式传 `--project-root`。底层命令对应 `npm run article:upload`、`npm run idea:upload` 和 `npm run github:progress`。

## 读取接口

- `GET /api/articles`
- `GET /api/articles/:slug`
- `GET /api/ideas`
- `GET /api/projects`
- `GET /api/activities?days=6`

写入不通过前端或公开 API 完成，只走上述 Skill。`BLOG_DB_PATH` 可覆盖默认数据库路径 `./data/blog.sqlite`。

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
