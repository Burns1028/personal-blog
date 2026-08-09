# Burns Skills 项目与活动发布设计

## 目标

把公开仓库 `Burns1028/burns-skill` 加入 `https://burnsgao.me/projects`，显示名称为「Burns Skills」，位置紧随 Any Hark；同时新增一条精选发布活动，记录这套个人 Skill 集合正式开源。

## 已核实事实

- 仓库地址：`https://github.com/Burns1028/burns-skill`
- 默认分支：`main`
- 仓库状态：公开、未归档
- GitHub 标注的主要语言：HTML
- 仓库创建时间：`2026-08-09T15:16:57Z`
- 最近推送时间：`2026-08-09T16:10:51Z`
- 当前项目顺序以 `featured DESC, updated_at DESC, id DESC` 计算。
- Any Hark 当前位列第一，但更新时间早于 Burns Skills；若直接发布，Burns Skills 会排在 Any Hark 前面。

## 方案

不修改站点代码或数据库结构。通过现有签名发布 API 完成两次幂等更新：

1. 重新登记 Any Hark，并设置 `featured: true`，使它继续位列项目列表第一。
2. 登记 Burns Skills，并同时发布一条 `release` 活动。Burns Skills 保持 `featured: false`，因此紧随 Any Hark。

这种方案保留两个仓库的真实发布时间和更新时间，不用为了排序伪造日期，也不引入新的人工排序字段。

## 展示文案

项目：

- 标题：`Burns Skills`
- 简介：`一套从真实工作流中长出来的个人 Skill 集合，覆盖写作、阅读、思考、可视化与内容发布。`
- 状态：`active`

活动：

- 类型：`release`
- 标题：`公开 Burns Skills`
- 摘要：`把写作、阅读、思考、可视化与内容发布的方法沉淀为可复用的个人 Skill，并以开源仓库正式发布。`
- 链接：`https://github.com/Burns1028/burns-skill`
- 时间：采用仓库正式公开阶段最后一次已核实推送的时间 `2026-08-09T16:10:51Z`
- 稳定键：`burns-skill:2026-08-09:public-release`

## 发布与校验

发布必须使用 `skills/burns-update-github-progress` 的生产签名 HTTPS 流程，不直接操作 SQLite：

1. 分别对 Any Hark 项目更新和 Burns Skills 项目活动执行只读校验。
2. 只在两次校验均通过后执行正式发布。
3. 发布后读取 `/api/projects`，确认前两项依次为 `anyhark`、`burns-skill`。
4. 读取 `/api/activities`，确认活动稳定键、标题、摘要、类型、时间和链接与本设计一致。

## 失败处理

- GitHub 元数据、签名配置或生产校验失败时，不执行正式发布。
- Any Hark 的项目更新成功而 Burns Skills 发布失败时，保留前者的精选状态；修复问题后使用相同稳定键重试 Burns Skills，避免重复活动。
- 线上排序或活动内容与预期不一致时，使用同一项目 slug 和活动稳定键修订，不创建第二条记录。

## 范围外事项

- 不修改项目页视觉样式、分页数量或活动轨道交互。
- 不新增数据库字段或人工排序系统。
- 不为仓库编造技术栈、提交记录或发布日期。
