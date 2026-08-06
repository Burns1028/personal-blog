# GitHub 仓库自动订阅设计

日期：2026-08-06

## 目标

让 Projects 页的仓库目录自动跟随 GitHub 用户 `Burns1028` 的公开原创仓库，同时保持活动时间线由站长手动策展。

系统必须遵守一个不可跨越的数据边界：自动同步只写 `projects` 表，绝不读取 GitHub events、commits、releases 来生成 `activities`。时间线继续只由 `burns-update-github-progress` Skill 的人工发布流程写入。

## 方案选择

采用 ECS 本机的 systemd timer 每小时运行一次同步脚本。

没有采用页面请求时同步，因为页面渲染不应依赖 GitHub 的实时可用性，也不应把 GitHub 延迟转嫁给访客。没有采用 GitHub Actions 推送，因为订阅的所有权应留在博客服务器，避免把生产写入凭据放入另一个自动化系统。

## GitHub 数据源

同步器调用 GitHub REST API：

```text
GET https://api.github.com/users/Burns1028/repos?type=owner&sort=updated&direction=desc&per_page=100&page=N
```

请求使用 GitHub 推荐的 JSON Accept 头和明确的 API 版本头。公开仓库接口允许匿名访问；生产环境可选配置只读 `GITHUB_TOKEN`。配置令牌后，同步器保存并复用 ETag，通过 `If-None-Match` 发起条件请求；`304 Not Modified` 直接结束，不写数据库。

同步器顺序请求分页，不并发轰击 GitHub。遇到 `403` 或 `429` 时读取速率限制响应头并失败退出，由 systemd 留下日志，下一小时再重试。网络错误或非完整分页响应不得触发归档，防止一次不完整抓取误伤项目。

## 仓库筛选

进入站点目录的仓库必须同时满足：

- `owner.login` 等于 `Burns1028`，忽略大小写；
- `private` 为 `false`；
- `fork` 为 `false`；
- GitHub 返回的仓库对象具有合法的 `name`、`full_name` 与 `html_url`。

GitHub 已标记 `archived` 或 `disabled` 的仓库仍保留在 SQLite 中，但站点状态同步为 `archived`，因此不会出现在公开项目列表。

## 字段映射与人工字段保护

自动同步负责的字段：

| SQLite 字段 | GitHub 字段或规则 |
| --- | --- |
| `slug` | 仓库名转为小写连字符格式；同一仓库后续以 `github_full_name` 定位，避免重命名时产生重复记录 |
| `github_full_name` | `full_name` |
| `title` | `name` |
| `summary` | `description`；为空时使用 `Burns1028/<name> 的开源项目。` |
| `repo_url` | `html_url` |
| `demo_url` | `homepage`；空字符串转为 `NULL` |
| `language` | `language`；为空时使用 `未标注` |
| `published_at` | `created_at` |
| `updated_at` | 优先 `pushed_at`，否则 `updated_at` |

人工策展字段必须受到保护：

- 新仓库默认 `status = active`、`featured = false`；
- 已存在仓库同步时保留当前 `featured`；
- 已存在仓库的 `status` 保留人工设置，除非 GitHub 明确返回 `archived` 或 `disabled`；
- GitHub 仓库恢复活跃时，不自动把本地 `archived` 改回 `active`，需要人工确认；
- 手动维护的活动、活动日期和活动文案不受仓库同步影响。

## 缺失仓库与归档

只有在所有分页均成功获取后，才比较远端全集与本地 GitHub 仓库。

属于 `Burns1028`、曾由订阅器同步、但本次远端全集中不存在的项目标记为 `archived`，不物理删除。为了区分自动订阅项目和未来可能手工添加的外部项目，`projects` 表增加 `sync_source` 字段，值为 `github-profile` 或 `manual`；缺失归档只作用于 `sync_source = github-profile`。

## 组件边界

### GitHub 客户端

`src/lib/server/github-repository-client.ts` 只负责 HTTP、分页、响应校验、ETag 和速率限制错误。它不接触 SQLite。

### 仓库同步服务

`src/lib/server/github-repository-sync.ts` 负责筛选、字段映射、人工字段保护和事务。它调用项目存储层，但不导入活动存储层。

### 项目存储层

`src/lib/server/project-store.ts` 增加面向同步器的专用写入与归档函数。现有手动 `upsertProject` 行为保持兼容。数据库迁移必须幂等，为旧记录补 `sync_source = manual`。

### 命令行入口

`ops/sync-github-repositories.mjs` 是唯一自动同步入口，默认用户固定为 `Burns1028`。支持 `--dry-run`，只输出将新增、更新和归档的项目，不写 SQLite。

### 调度

新增：

- `ops/systemd/burns-blog-github-sync.service`
- `ops/systemd/burns-blog-github-sync.timer`

Timer 使用 `OnCalendar=hourly`、`Persistent=true` 和小幅随机延迟。Service 以 `burns-blog` 用户运行，读取 `/etc/burns-blog/app.env`，复用 `BLOG_DB_PATH`，可选读取 `GITHUB_TOKEN`。部署脚本安装并启用这两个 unit。

## 时间线隔离

自动同步代码不得：

- 导入 `activity-store.ts`；
- 调用 `upsertActivity`；
- 请求 `/users/Burns1028/events`、commits、releases 或 activity feeds；
- 自动创建“今日更新”“仓库更新”等活动记录。

现有 `burns-update-github-progress` Skill 保持为时间线唯一的 GitHub 进度发布工具。它由用户明确触发，在核验具体事实后同时修订项目资料并写入一条人工精选活动。

## 失败与可观测性

- GitHub 不可达、响应不合法、分页不完整或数据库事务失败时，进程以非零状态退出；
- 任一失败都不得留下部分更新；
- 标准输出记录抓取数量、新增数量、更新数量、归档数量与 `304` 命中；
- 令牌从环境变量读取，日志不得输出令牌或完整 Authorization 头；
- systemd journal 保存运行结果，Timer 下一周期自动重试。

## 测试与验收

1. 客户端测试覆盖分页、`304`、速率限制与响应字段校验。
2. 同步测试覆盖公开原创仓库筛选、空简介/语言回退、仓库重命名和幂等重复同步。
3. 保护测试证明已存在项目的 `featured` 与人工状态不会被普通同步覆盖。
4. 归档测试证明只有完整远端快照才会归档缺失的 `github-profile` 项目。
5. 隔离测试证明同步模块不写 `activities`，同步前后活动行数完全相同。
6. 运维契约测试验证 service/timer 安装、非特权用户、环境文件、每小时调度和 `Persistent=true`。
7. `--dry-run` 与一次真实本地同步返回准确摘要；第二次真实同步必须为幂等结果。
8. Projects 页面能从 SQLite 看到同步后的仓库，时间线内容保持不变。

## 官方依据

- GitHub REST API 的“List repositories for a user”接口返回指定用户的公开仓库，支持 `type`、排序和最多 100 条分页。
- GitHub 允许公开数据匿名读取；匿名请求主要限额为每小时 60 次。
- GitHub 推荐固定频率轮询、条件请求与 ETag；正确认证下的 `304 Not Modified` 不消耗主要限额。
