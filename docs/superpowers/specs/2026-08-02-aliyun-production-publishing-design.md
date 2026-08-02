# Burns Blog 阿里云生产部署与内容发布接口设计

日期：2026-08-02

## 目标

把当前 Burns Blog 完整部署到杭州 ECS `i-bp1bcc626i6ygsbfg71k`，以 `https://burnsgao.me` 作为唯一正式入口，并保留现有首页、Writing、Projects、Ideas、旋转地球、月相与全部视觉素材。

生产环境继续以 SQLite 作为文章、灵感、项目和活动的唯一事实源。新增受保护的文章与灵感写入接口，让 `burns-upload-article` 和 `burns-upload-idea` 两个 Skill 只通过生产凭据完成远程校验、发布、更新和查询。两个 Skill 不再提供本地 SQLite 发布模式。

代码以私有 GitHub 仓库 `Burns1028/personal-blog` 作为唯一同步源。ECS 只按明确的 commit SHA 创建 release，不接收手工复制的代码目录。数据库、运行时媒体和凭据不进入 Git。

## 已确认环境

- ECS：2 vCPU、4 GB 内存，Alibaba Cloud Linux 3，根盘约 33 GB 可用。
- 网络：安全组已开放 TCP 80 和 443；22 未开放。
- 运维通道：Cloud Assistant 正常并支持 Session Manager。
- 服务器当前没有 Node.js、npm、Nginx、Docker、Git 或 rsync。
- 域名由阿里云 DNS 托管。
- 当前 DNS 只有一个 `*` 类型的 A 记录，且没有指向目标 ECS；根域 `@` 没有记录。
- 当前应用是 Astro Node standalone SSR，运行时要求 Node.js 24.15 或更高版本。
- 当前数据库默认位于 `data/blog.sqlite`；文章素材默认写入 `public/media/articles`。
- 当前 Git 仓库没有有效远端；受跟踪文件约 24 MB，没有超过 GitHub 单文件限制的文件。

## 方案比较

### 方案 A：原生 Node.js、systemd、Nginx 与持久 SQLite

这是采用的方案。它与当前 Astro standalone 输出和单实例 SQLite 架构直接匹配，资源开销最低，服务、反向代理、持久数据和发布版本边界清晰。

### 方案 B：Docker Compose

容器化能够统一运行环境，但当前服务器没有 Docker，还需要镜像构建、镜像仓库和持久卷管理。对于一台 2C4G 的单实例博客，新增复杂度大于收益，因此不采用。

### 方案 C：静态托管或无状态 Serverless

当前页面和公开 API 在运行时读取 SQLite，文章与灵感还需要在线写入。无状态部署无法直接共享本地数据库和素材目录，因此不采用。

## 生产架构

```text
Internet
  |
  v
Nginx :80/:443
  |-- HTTP -> HTTPS redirect
  |-- /media/articles/* -> /var/lib/burns-blog/media/articles/*
  |-- cacheable static assets
  `-- proxy -> 127.0.0.1:4321
                    |
                    v
             Astro Node SSR
                    |
          +---------+---------+
          |                   |
          v                   v
/var/lib/burns-blog/     /var/lib/burns-blog/
blog.sqlite              media/articles/
```

代码与状态分离：

```text
/opt/burns-blog/releases/<release-id>/  不可变版本目录
/opt/burns-blog/current                 当前版本软链接
/var/lib/burns-blog/blog.sqlite         持久数据库
/var/lib/burns-blog/media/articles/     持久文章素材
/var/backups/burns-blog/                数据库备份
/etc/burns-blog/app.env                 生产环境变量
```

Astro 仅监听 `127.0.0.1:4321`。Nginx 是唯一公网入口。应用由独立的 `burns-blog` 系统用户运行，不使用 root。

## Git 代码同步

创建私有 GitHub 仓库 `Burns1028/personal-blog`，并把它设置为本地 `origin`。私有仓库保存应用源码、锁文件、数据库迁移、部署脚本和实际运行所需的优化后静态素材。

以下内容不得提交：

- `data/*.sqlite`、WAL 与 SHM 文件；
- `/var/lib/burns-blog` 的运行时媒体；
- `.env`、发布密钥、证书私钥和 ECS SSH 密钥；
- `node_modules`、`dist` 和构建缓存；
- 不参与运行的大型临时生成素材与中间文件。

代码同步流程：

1. 本地完成测试与构建。
2. 只提交经过审阅的代码和运行素材。
3. 推送到私有仓库的 `main` 分支。
4. 记录待部署 commit SHA。
5. ECS 使用只读 GitHub Deploy Key 获取该 commit。
6. 在新的 release 目录执行 `npm ci` 与生产构建。
7. 健康检查通过后原子切换 `current`。

推送代码不会自动上线。上线必须显式执行部署命令并传入 commit SHA，避免尚未验收的提交自动替换生产版本。后续若接入 GitHub Actions，也沿用相同的 commit 锁定、健康检查和回滚契约。

## DNS 与 TLS

正式域名为 `burnsgao.me`，`www.burnsgao.me` 只作为别名并重定向到根域。

上线时执行以下 DNS 变更：

1. 新增或更新 `@` A 记录，使其指向目标 ECS 公网地址。
2. 新增或更新明确的 `www` A 记录，使其指向同一 ECS。
3. 不修改现有 `*` 通配符记录，避免影响未纳入本次部署的子域名。
4. 等待权威 DNS 返回新记录后，再申请证书。

TLS 使用 Let's Encrypt 证书并配置自动续期。Nginx 将所有 HTTP 请求重定向到 `https://burnsgao.me`，`www` 请求也重定向到根域。证书申请失败时不开放写入接口；站点不会以携带生产凭据的明文 HTTP 模式运行。

## 内容与素材持久化

生产环境新增：

```text
BLOG_DB_PATH=/var/lib/burns-blog/blog.sqlite
BLOG_MEDIA_PATH=/var/lib/burns-blog/media/articles
SITE_URL=https://burnsgao.me
```

文章 Markdown 中的最终素材 URL 继续保持 `/media/articles/<slug>/<asset>.webp`。Nginx 直接映射持久素材目录，因此后续通过 Skill 新增的图片不依赖重新构建 Astro，也不会随代码回滚丢失。

本地开发仍可使用临时 SQLite 和 `public/media/articles` 做测试，但它不是内容发布入口。所有正式文章和灵感只通过远程私有 API 写入生产 SQLite。

SQLite 保持 WAL 模式、事务写入和单实例运行。应用发布前创建一致性备份；每日通过 systemd timer 备份一次，保留最近 14 份。数据库迁移必须向后兼容当前和上一个应用版本。

## 私有发布接口

公开读取接口保持不变：

- `GET /api/articles`
- `GET /api/articles/:slug`
- `GET /api/ideas`
- `GET /api/projects`
- `GET /api/activities`

新增私有接口：

### Articles

- `PUT /api/publish/articles/:slug`
  - 接收 Markdown、发布状态、可选字段覆盖和本地素材包。
  - 按 slug 幂等写入。
  - 复用现有图片转 WebP、Markdown 路径重写、内容哈希和 revision 逻辑。
  - 相同内容重复请求保持 revision 不变；内容变化时 revision 增加。
- `POST /api/publish/articles/:slug/validate`
  - 执行完整解析、图片校验和字段校验，但事务回滚且不保留素材。

文章请求采用 JSON 内容包：

```json
{
  "markdown": "---\ntitle: ...\n---\n\n正文",
  "sourceName": "article.md",
  "status": "published",
  "assets": [
    {
      "sourcePath": "images/moon.png",
      "mediaType": "image/png",
      "contentBase64": "..."
    }
  ]
}
```

单请求总大小由 Nginx 和应用同时限制为 32 MB，单素材限制为 12 MB，素材数量限制为 40。路径必须是安全的相对路径，禁止绝对路径和目录穿越。

### Ideas

- `PUT /api/publish/ideas/:sourceKey`：新增或更新一条灵感。
- `GET /api/publish/ideas/:sourceKey`：读取包含 draft/archived 状态的单条记录。
- `GET /api/publish/ideas?status=published|draft|archived|all`：管理端列表。
- `DELETE /api/publish/ideas/:sourceKey`：删除记录，必须同时携带明确的删除确认头。
- `POST /api/publish/ideas/:sourceKey/validate`：校验但不落库。

字段和状态规则继续复用现有 `idea-store`，不创建第二套数据模型。

## 请求鉴权

写入接口使用 HTTPS 上的 HMAC-SHA256 签名。密钥不会随请求发送。

每个请求必须包含：

```text
X-Burns-Key-Id
X-Burns-Timestamp
X-Burns-Nonce
X-Burns-Content-SHA256
X-Burns-Signature
```

签名覆盖：

```text
HTTP method
request path and canonical query
timestamp
nonce
SHA-256 request body
```

服务端执行以下检查：

1. Key ID 必须存在且处于启用状态。
2. 时间戳与服务器时间偏差不超过 5 分钟。
3. nonce 在 10 分钟内未被使用，并通过 SQLite 唯一约束持久记录。
4. 请求正文哈希必须一致。
5. 使用常量时间比较签名。
6. 每个 Key ID 与来源地址执行速率限制。

生产密钥随机生成，不写入 Git、构建产物或日志。服务端密钥保存在 `/etc/burns-blog/app.env`，权限为 root 可读、应用组只读。本机优先保存在 macOS Keychain；环境变量仅作为自动化运行时的显式覆盖。

Nginx 不记录认证头，应用错误不得输出密钥、签名或素材正文。

## 两个远程发布 Skill

`burns-upload-article` 和 `burns-upload-idea` 只提供远程发布模式，使用统一配置：

```text
BURNS_PUBLISH_URL=https://burnsgao.me
BURNS_PUBLISH_KEY_ID=<key-id>
BURNS_PUBLISH_SECRET=<可选；默认从 macOS Keychain 读取>
```

### Article Skill

1. 读取 Markdown 与 frontmatter。
2. 找出 Markdown 引用的本地图片并读取真实字节。
3. 构造确定性内容包并计算正文哈希。
4. 签名后调用校验或发布接口。
5. 检查返回的 slug、status、revision、URL 和每个素材结果。
6. 对相同内容重复上传，确认 revision 不变化。

### Idea Skill

1. 保留 `upsert`、`list`、`get`、`delete` 四种操作。
2. 根据 action 映射到私有接口。
3. 保持 source-key 幂等语义。
4. 删除操作仍要求用户明确授权，脚本才添加删除确认头。
5. 检查响应中的 sourceKey、status、capturedAt 和变更结果。

Skill 的远程模式不会直接访问 SQLite、SSH 或服务器文件系统。所有生产写入只经过受保护 API。

## 部署传输与初始化

当前安全组未开放 22，也没有实例 Key Pair。首次发布不需要开放 SSH：

1. 本机安装 GitHub CLI 并通过浏览器 OAuth 登录 GitHub。
2. 创建私有仓库 `Burns1028/personal-blog`，把当前仓库历史和已审阅工作区内容推送到 `main`。
3. 通过 Cloud Assistant 在 ECS 创建 `burns-blog` 系统用户，安装 Git、Node.js 24、Nginx 和证书工具。
4. 在 ECS 为 `burns-blog` 生成专用 SSH Deploy Key，只把公钥添加到该 GitHub 仓库，权限设为只读。
5. ECS 使用 Deploy Key 克隆私有仓库，并按指定 commit SHA 创建首个 release。
6. 完成 systemd、Nginx、持久目录、DNS、TLS 和健康检查后切换上线。

安全组始终只保留 80/443，不因代码同步开放 22。GitHub Deploy Key 只能读取一个仓库，不能推送代码，也不能访问其他仓库。

首次内容迁移不复制本地 SQLite 文件到服务器。部署 API 后，从当前本地 SQLite 导出真实文章、文章素材和灵感，分别通过两个远程 Skill 写入生产数据库。Projects 与 Activities 不混入这两个接口，继续由独立的项目进度发布链管理。这样 Git 只负责代码，各内容接口只负责自己的数据，生产 SQLite 从第一天就是独立事实源。

## 原子发布与回滚

每次代码发布：

1. 从私有 GitHub 仓库获取明确的 commit SHA，并在新的 release 目录检出。
2. 用锁文件安装依赖并构建。
3. 使用生产环境变量在独立端口运行健康检查。
4. 备份 SQLite。
5. 原子切换 `current` 软链接。
6. 重启 systemd 服务并检查 `/api/health`。
7. 验证首页、Writing、文章详情、Projects、Ideas、公开 API 和媒体文件。

失败时恢复上一个 `current` 指向并重启服务。数据库迁移失败时不切换版本；数据恢复只在确认数据库被破坏时进行，不随普通代码回滚自动覆盖。

## 健康检查与运行日志

新增 `GET /api/health`，只返回：

- 应用状态；
- 版本标识；
- SQLite 可读状态；
- 持久素材目录可写状态；
- 当前时间。

接口不返回数据库路径、密钥、实例信息或内容统计。

应用日志进入 journald，Nginx 保留访问和错误日志。发布接口只记录请求 ID、Key ID、操作类型、目标 slug/sourceKey、结果和耗时，不记录正文或密钥。

## 安全边界

- 公开页面没有写入按钮，也不暴露发布凭据。
- 私有 API 只接受 HTTPS。
- CORS 默认关闭；Skill 是服务端客户端，不依赖浏览器跨域。
- 所有输入执行大小、枚举、日期、slug、source-key、路径和媒体类型校验。
- 文章与灵感写入使用数据库事务；素材先写临时目录，成功提交后原子移动。
- Nginx 对发布接口实施请求体限制、超时限制和速率限制。
- 服务器仅保留 80/443 公网入口；首次传输后的 22 规则必须删除。

## 验收标准

### 应用

- `https://burnsgao.me` 使用有效证书并返回正式首页。
- `https://www.burnsgao.me` 永久重定向到根域。
- Writing 星图、逐篇月相、Projects 旋转地球与卫星交互没有视觉降级。
- 所有既有文章和媒体文件可访问。
- SQLite、媒体目录和代码 release 相互独立。

### API

- 未签名、过期签名、重复 nonce、正文篡改和超限请求全部被拒绝。
- 文章 validate 不产生数据库记录或素材文件。
- 相同文章重复发布保持 revision，不同内容增加 revision。
- 灵感 upsert/list/get/delete 行为与现有 Skill 契约一致。
- 公开读取 API 仍只返回 published 内容。

### Skills

- 两个 Skill 不包含本地 SQLite 写入路径，缺少远程 URL 或生产凭据时必须失败。
- 两个 Skill 的请求构造与签名使用临时 HTTP 服务和临时 SQLite 完成自动化测试，但不向用户暴露本地发布模式。
- 两个 Skill 的远程 validate 在生产环境通过且不制造测试内容。
- 一篇明确授权的真实文章和一条明确授权的真实灵感能够远程发布并在页面读取。
- 凭据不存在于仓库、shell 历史、命令输出、应用日志或前端资源中。

### 运维

- systemd 开机自启且异常退出自动重启。
- 数据库备份 timer 正常，最近备份可通过 SQLite integrity check。
- 上一个 release 可以在不触碰持久内容的情况下恢复。
- ECS 当前 release 能映射到一个已推送的 GitHub commit SHA。
- GitHub Deploy Key 只有目标私有仓库的只读权限。
- 安全组只保留部署所需的 80/443 公网入口。
