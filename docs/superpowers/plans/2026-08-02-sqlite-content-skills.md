# SQLite 内容后端与三个发布 Skill 实施计划

> 执行方式：按任务顺序以 TDD 完成；每个任务先得到预期失败，再写最小实现并运行相关测试。不得以静态示例或前端 Mock 代替数据库结果。

**目标：** 用 SQLite 统一承载文章、灵感、项目和项目活动，创建并验收文章发布、灵感发布、GitHub 进度更新三个 Skill，同时删除全部假数据。

**架构：** `src/lib/server/*-store.ts` 负责数据库模型与查询，`scripts/import-*.ts` 负责确定性导入，`skills/*` 负责把自然语言工作流收敛到导入命令。页面和读取 API 只调用 Store。

**技术栈：** Astro 5、TypeScript、Node SQLite、Vitest、Sharp、Markdown、Codex Skills。

---

## 任务 1：锁定数据源契约

**文件：**

- 新建：`tests/content-source-contract.test.ts`
- 修改：`tests/presentation-contract.test.ts`

1. 写失败测试，要求 Ideas 页面不再导入 `src/data/ideas.ts`。
2. 写失败测试，要求 Projects 页面不再调用 `getCollection("projects")`。
3. 写失败测试，要求 Writing catalog 与详情页不再调用 Astro Writing collection。
4. 写失败测试，要求三个旧数据目录不再包含运行时内容文件。
5. 运行 `node --test tests/content-source-contract.test.ts tests/presentation-contract.test.ts`，确认失败原因正是旧 Mock 数据源仍存在。

## 任务 2：实现 Ideas SQLite Store

**文件：**

- 新建：`tests/idea-store.test.ts`
- 新建：`src/lib/server/idea-store.ts`

1. 先测试 `upsertIdea` 的幂等更新、状态校验、发布日期排序与 draft 过滤。
2. 运行 `node --test tests/idea-store.test.ts`，确认模块或行为缺失。
3. 新增 `ideas` 表、输入归一化、事务写入、单条读取与已发布列表查询。
4. 重跑测试并确认通过。

## 任务 3：实现 Projects SQLite Store

**文件：**

- 新建：`tests/project-store.test.ts`
- 新建：`src/lib/server/project-store.ts`

1. 先测试项目幂等写入、GitHub 地址校验、featured 排序、archived 过滤。
2. 运行 `node --test tests/project-store.test.ts`，确认失败。
3. 新增 `projects` 表和对应写入、读取、列表查询。
4. 重跑测试并确认通过。

## 任务 4：实现三个确定性发布命令

**文件：**

- 新建：`tests/publishing-cli.test.ts`
- 修改：`scripts/import-article.ts`
- 新建：`scripts/import-idea.ts`
- 新建：`scripts/import-github-progress.ts`
- 修改：`package.json`

1. 用临时目录、临时数据库和一张测试图片编写三个命令的集成测试。
2. 文章测试要求 Markdown、frontmatter、本地图片 WebP 和资源记录完整写入。
3. 灵感测试要求相同 `source_key` 重复执行只更新一条记录。
4. GitHub 进度测试要求一次命令同时写入 Project 与 Activity，重复执行保持一条活动。
5. 添加 `article:upload`、`idea:upload`、`github:progress` npm scripts。
6. 运行 `node --test tests/publishing-cli.test.ts`，直至全部通过。

## 任务 5：迁移页面与读取 API

**文件：**

- 修改：`src/lib/server/writing-catalog.ts`
- 修改：`src/pages/writing/[...slug].astro`
- 修改：`src/pages/ideas/index.astro`
- 修改：`src/pages/projects/index.astro`
- 修改：`src/components/projects/ProjectCard.astro`
- 修改：`src/pages/index.astro`
- 新建：`src/pages/api/ideas/index.ts`
- 新建：`src/pages/api/projects/index.ts`
- 修改：`src/content.config.ts`

1. Writing catalog 和详情页改为 SQLite-only。
2. Ideas 页面读取 `listPublishedIdeas` 并增加真实空状态。
3. Projects 页面和 ProjectCard 改读 `StoredProject`，保留既有视觉与交互。
4. 首页删除静态 Ideas/Projects 数据依赖，使用内容无关的可访问性标签。
5. 新增公开只读 API，并为响应结构补测试。
6. 运行数据源契约、页面契约与 API 测试。

## 任务 6：创建并验收文章发布 Skill

**文件：**

- 新建：`tests/skill-contract.test.ts`
- 新建：`skills/burns-upload-article/SKILL.md`
- 新建：`skills/burns-upload-article/agents/openai.yaml`
- 新建：`skills/burns-upload-article/scripts/upload.mjs`
- 新建：`skills/burns-upload-article/assets/article-template.md`

1. 先运行文章 Skill 契约测试并确认目录缺失导致失败。
2. 用官方 Skill 初始化器创建结构，再以 `apply_patch` 写入工作流、包装脚本和文章模板。
3. 运行文章 Skill 契约测试、`quick_validate.py` 和临时数据库正向发布。
4. 重复发布同一 slug，确认只产生一次当前记录并增加可追踪 revision。
5. 验收通过后再进入下一个 Skill。

## 任务 7：创建并验收灵感发布 Skill

**文件：**

- 新建：`skills/burns-upload-idea/SKILL.md`
- 新建：`skills/burns-upload-idea/agents/openai.yaml`
- 新建：`skills/burns-upload-idea/scripts/upload.mjs`

1. 先运行灵感 Skill 契约测试并确认失败。
2. 初始化并实现 Skill，要求明确记录时间、主题、状态和稳定 `source_key`。
3. 运行契约测试、官方校验器、临时数据库正向写入与重复执行验收。

## 任务 8：创建并验收 GitHub 进度更新 Skill

**文件：**

- 新建：`skills/burns-update-github-progress/SKILL.md`
- 新建：`skills/burns-update-github-progress/agents/openai.yaml`
- 新建：`skills/burns-update-github-progress/scripts/upload.mjs`

1. 先运行 GitHub Skill 契约测试并确认失败。
2. 初始化并实现 Skill，要求只记录已核对的仓库资料和进度事实。
3. 运行契约测试、官方校验器、临时数据库正向写入、重复执行和缺字段失败验收。

## 任务 9：真实内容迁移与假数据删除

**文件：**

- 删除：`src/data/ideas.ts`
- 删除：`src/content/projects/context-compiler.md`
- 删除：`src/content/projects/eval-ledger.md`
- 删除：`src/content/projects/router-observatory.md`
- 删除：`src/content/writing/designing-with-restraint.md`
- 删除：`src/content/writing/low-friction-knowledge-base.md`
- 删除：`src/content/writing/reliable-agent-systems.md`
- 删除：`src/content/writing/_markdown-template.md`
- 修改：`README.md`

1. 先通过文章 Skill 把三篇真实静态文章写入 `data/blog.sqlite`。
2. 查询数据库确认四篇已发布文章均可读取，再删除静态 Writing 文件。
3. 删除八条虚构灵感与三个虚构项目，不做迁移。
4. 更新 README，只保留三个 Skill/命令的发布说明。
5. 把三个仓库内 Skill 链接安装到用户 Skill 目录。

## 任务 10：完整验收

1. 运行三个 Store 和三个发布命令的专项测试。
2. 运行 `npm run test:content`。
3. 运行 `npm run build`。
4. 启动本地站点，浏览器检查 Writing 列表与详情、Ideas 空状态、Projects 空状态和首页。
5. 检查 Writing 星图、逐篇月相、Projects 旋转地球、卫星交互、搜索和分页没有视觉或功能降级。
6. 用 `rg` 确认旧假标题、旧假 slug 和旧 Mock 导入均已消失。
7. 输出三个 Skill 的路径、调用方式、迁移结果和最终测试证据。
