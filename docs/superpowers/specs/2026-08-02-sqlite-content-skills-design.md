# Burns 内容发布与 Skills 设计

日期：2026-08-02

## 目标

把文章、灵感、项目与项目进度统一收敛到 `data/blog.sqlite`。前端只读取 SQLite，不保留静态 Markdown、TypeScript 数组或组件内示例数据作为回退。建立三个可复用 Skill，分别完成文章发布、灵感发布、GitHub 项目进度更新，并通过真实写入与页面读取验收。

## 设计原则

1. **SQLite 是唯一事实源。** 页面、RSS 与公开读取 API 都从数据库取数。
2. **Skill 是发布入口，不是第二套后端。** Skill 只检查输入、定位博客仓库并调用仓库内的确定性导入命令。
3. **没有数据就诚实留空。** 删除虚构的项目、灵感和静态文章回退；空状态不制造示例内容。
4. **写入可重复执行。** 文章按 `slug`、灵感按 `source_key`、项目按 `slug`、活动按 `source_key` 幂等更新。
5. **资源随内容归档。** Markdown 中的本地图片压缩为 WebP，复制到 `public/media/articles/<slug>/`，并把重写后的路径和资源元数据一起写入 SQLite。
6. **现有视觉不降级。** Writing 星图与逐篇月相、Projects 旋转地球和卫星交互继续保留，只替换数据来源。

## 数据模型

### Articles

沿用现有 `articles`、`article_assets` 与 `article_revisions` 表。发布命令解析 frontmatter 和 Markdown，处理本地图片后调用 `upsertArticle`。已存在的 `ai-aesthetics` 保留；三个真实静态 Markdown 通过文章 Skill 导入后删除源文件和 Astro Writing collection。

### Ideas

新增 `ideas` 表：

- `source_key`：稳定、唯一的外部标识；
- `text`：灵感正文；
- `theme`：主题标签；
- `captured_at`：记录时间；
- `status`：`draft | published | archived`；
- `featured`：首页或列表排序信号；
- `created_at`、`modified_at`：审计时间。

列表只返回 `published`，按 `featured`、`captured_at` 倒序。现有 `src/data/ideas.ts` 全部删除，不迁移虚构内容。

### Projects

新增 `projects` 表：

- `slug`：站内稳定标识；
- `github_full_name`：GitHub `owner/repository`；
- `title`、`summary`；
- `repo_url`、可选 `demo_url`；
- `language`；
- `status`：`active | maintained | experiment | archived`；
- `featured`、`published_at`、`updated_at`；
- `created_at`、`modified_at`。

沿用现有 `activities` 表记录聚合进度。GitHub 进度更新命令在同一次操作中幂等写入项目和活动。现有三个虚构项目 Markdown 全部删除，不迁移。

## 三条发布链

### 文章发布

`burns-upload-article` → `scripts/import-article.ts` → 图片转 WebP、Markdown 路径重写 → Articles SQLite → Writing 列表、详情、RSS。

### 灵感发布

`burns-upload-idea` → `scripts/import-idea.ts` → 输入校验与幂等写入 → Ideas SQLite → Ideas 列表与公开读取 API。

### GitHub 进度更新

`burns-update-github-progress` → `scripts/import-github-progress.ts` → 项目资料与活动资料校验 → Projects + Activities SQLite → Projects 卡片、活动轨道与公开读取 API。

命令不默认抓取或猜测 GitHub 内容。Skill 可先核对用户提供的仓库或变更信息，再把明确字段交给命令；缺少真实信息时保持空状态。

## 页面与 API

- `writing-catalog.ts` 改为 SQLite-only；详情页只渲染数据库 Markdown。
- Ideas 页面直接读取 `listPublishedIdeas`，无记录时展示克制的空状态。
- Projects 页面直接读取 `listPublishedProjects`，保留搜索、分页、旋转地球、卫星和活动轨道。
- 首页移除对假项目和假灵感的导入，只保留不依赖内容数据的真实导航语义。
- 新增 `GET /api/ideas` 与 `GET /api/projects`；既有文章、活动 API 保留。

## Skill 结构

三个 Skill 的规范版本保存在仓库 `skills/`，再链接安装到用户 Skill 目录：

- `skills/burns-upload-article/`
- `skills/burns-upload-idea/`
- `skills/burns-update-github-progress/`

每个 Skill 包含精简 `SKILL.md`、`agents/openai.yaml` 与一个脚本包装器。文章 Skill 另含 Markdown 模板资产。每个 Skill 必须分别通过：

1. Skill 目录结构契约测试；
2. `quick_validate.py`；
3. 对临时 SQLite 数据库的真实正向写入；
4. 重复执行后的幂等性检查；
5. 对缺失必填字段的失败检查。

## 验收

- 仓库中不存在 `src/data/ideas.ts`、`src/content/projects/*.md` 或 `src/content/writing/*.md` 形式的页面数据回退。
- 现有三篇真实静态文章已由文章 Skill 写入生产 SQLite，连同原有文章共可查询四篇已发布文章。
- 空 Projects / Ideas 数据库不会显示虚构卡片。
- 三个 Skill 均可从临时数据库完成一次真实写入并通过幂等验收。
- 单元测试、集成测试、Astro 构建与本地浏览器抽查全部通过。
