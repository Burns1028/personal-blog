# Projects 人工排序设计

## 目标

为项目档案增加独立于 GitHub 时间的人工展示顺序，使 `https://burnsgao.me/projects` 的前三项固定为：

1. Any Hark
2. Burns Skills
3. Akka

未指定人工顺序的项目继续沿用既有的精选状态和 GitHub 更新时间排序。项目时间字段保持真实，不承担展示位置的职责。

## 数据模型

在 `projects` 表增加可空整数列 `display_order`，应用层字段名为 `displayOrder`。

- 有值的项目排在无值项目之前。
- 数值越小，位置越靠前。
- 合法范围为 `1` 到 `100000`，且必须是整数。
- 相同 `displayOrder` 使用原有规则 `featured DESC, updated_at DESC, id DESC` 决定顺序。
- `displayOrder` 为 `null` 时，项目完全按照原有规则排序。

本次数据配置为：

- `anyhark`: `10`
- `burns-skill`: `20`
- `akka`: `30`
- 其他项目：`null`

预留十位间隔，方便未来在两个项目之间插入新项目而不必整体改号。

## 数据库迁移

新建数据库时，`projects` 表直接包含 `display_order INTEGER` 及范围约束。

既有生产数据库通过幂等迁移补列：启动或首次访问项目存储时读取 `PRAGMA table_info(projects)`；仅在字段不存在时执行 `ALTER TABLE projects ADD COLUMN display_order INTEGER CHECK (...)`。迁移不得重建表，也不得修改现有项目记录。

新增与排序规则一致的索引。旧索引可以保留，因为数据规模很小且它仍可服务状态过滤；不为这次变更执行破坏性的索引删除。

## 写入语义

`ProjectInput.displayOrder` 为可选字段：

- 字段缺省：更新既有项目时保留原值；新项目写入 `null`。
- 显式整数：写入并替换人工顺序。
- 显式 `null`：清除人工顺序，使项目恢复默认排序。

这种三态语义可以保证旧客户端继续工作，也避免普通的仓库元数据更新意外清除已经配置的顺序。

项目发布脚本增加 `--display-order <integer|none>`：

- 整数映射为对应的 `displayOrder`。
- `none` 映射为显式 `null`。
- 未传参数时不在 payload 中加入该字段。

项目与活动联合发布脚本采用相同语义。

## 读取与排序

`listPublishedProjects()` 使用以下优先级：

1. `display_order` 是否为空：有值者优先。
2. `display_order ASC`。
3. `featured DESC`。
4. `updated_at DESC`。
5. `id DESC`。

公共 `/api/projects` 响应增加 `displayOrder`，便于线上验收和后续管理。项目卡片不展示这个内部字段，页面视觉保持不变。

## 发布流程

1. 在隔离分支实现数据库、存储层、公共 API 和两个项目发布脚本的变更。
2. 运行项目存储、私有发布 API、Skill 契约、内容测试和生产构建。
3. 使用现有部署流程发布包含迁移的新版本。
4. 先对 Any Hark、Burns Skills、Akka 三个 payload 执行只读校验。
5. 校验全部通过后，使用项目专用发布入口依次写入 `10`、`20`、`30`；不创建新的活动。
6. 读取公开项目 API 与实际项目页，确认前三项严格为 `anyhark`、`burns-skill`、`akka`。

## 错误处理

- 非整数、超出范围或无法识别的 `--display-order` 在客户端发请求前失败。
- 服务端对绕过客户端的非法数值再次拒绝。
- 迁移只添加缺失列，可被重复调用；字段已存在时不得再次执行 `ALTER TABLE`。
- 部署或任一只读校验失败时，不写入三个排序值。
- 排序写入发生部分失败时，使用相同项目 slug 重试；项目 upsert 是幂等的，不会生成重复记录。

## 测试

- 新数据库与模拟旧数据库都能得到 `display_order` 字段。
- 指定人工顺序的项目优先，并按数值升序排列。
- 无人工顺序的项目仍按原有精选和更新时间规则排列。
- 字段缺省时保留旧值；整数能更新；显式 `null` 能清除。
- 公共 API 返回 `displayOrder`。
- 两个发布脚本正确处理整数、`none`、缺省值和非法输入。
- 线上 API 与 SSR 页面均呈现目标前三名。

## 范围外事项

- 不在项目卡片上展示排名或“精选”标签。
- 不改变活动时间线顺序。
- 不修改 GitHub 的 `publishedAt` 或 `updatedAt`。
- 不为项目增加拖拽排序后台。
