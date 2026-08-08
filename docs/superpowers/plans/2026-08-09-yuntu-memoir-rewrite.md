# 《云图回忆录》重写实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变用户事实、时间线与核心判断的前提下，把口述稿重写成一篇完整、自然、可审阅的《云图回忆录》。

**Architecture:** 采用经验驱动的时间线结构，以两个 1024 冠军形成首尾呼应。中段让各项目依次推动工程判断从“把功能做完”发展到“同时计算口径、成本、稳定性、协作和用户价值”，AI 时代的判断从这些经历中自然长出。

**Tech Stack:** Markdown、Burns 写作终审规则、中文写作排版规范、shell 文本检查

## Global Constraints

- 严格遵循 `docs/superpowers/specs/2026-08-09-yuntu-memoir-rewrite-design.md`。
- 不虚构用户未提供的对白、会议场景、项目结果、心理活动或组织评价。
- 保留“进入云图—实习—转正以后—正式入职—关于 AI 时代下的素质—离开云图”的章节顺序。
- 保留设计稿列出的全部事实和核心判断；允许修正口述病句、重复与明显转写错误。
- “Zed”统一为“Seed”；“异构”按上下文修正为 “ego”。
- 不直接发布文章，只在工作区生成审阅稿。
- 中英文之间保留一个半角空格，中文正文使用全角标点。

---

### Task 1: 建立完整叙事初稿

**Files:**
- Create: `/Users/misery/Documents/burns project/云图回忆录.md`

**Interfaces:**
- Consumes: 用户原始口述稿与 `docs/superpowers/specs/2026-08-09-yuntu-memoir-rewrite-design.md`
- Produces: 按原章节顺序展开、事实完整的 Markdown 初稿

- [ ] **Step 1: 写开头与“实习”**

开头从第一个 1024 当天的两件连续动作进入：比赛夺冠，随后办理云图入职。交代“so fresh”、四年跨度与即将去 Seed Infra 的写作时点。

“实习”依次完整写入：学习 Spark、Hive、HDFS、MapReduce；把循环拉取的老服务迁为触发式；商品竞争分析；3500 万与 3350 万的口径取舍；Hive、ClickHouse 与 Bitmap OLAP 方案。三个项目分别推出“复杂系统可以靠细致理清”“一致性有时比局部准确更重要”“灵活性必须与资源和稳定性一起算 ROI”。

- [ ] **Step 2: 写“转正以后”与“正式入职”**

“转正以后”保留技术分享、文档、首次答辩失利、加面、offer 与最终留在字节的完整因果。offer 只解释选择，不用作观点背书。保留“人生要么 suffering，要么 boring”的个人偏好。

“正式入职”依次写入实体切词中的“老虎”案例、焦油坑、Multi-Agent 的灵活性与稳定性、业余搭 Agent 平台、文档带来的项目机会、connect the dots、多人项目的组件拆分与上下文管理。每段都在事实之后落下判断，不额外编造项目效果。

- [ ] **Step 3: 写“关于 AI 时代下的素质”与“离开云图”**

AI 一节保留五组判断：靠谱；定义问题；人有时只是被浪推着走；强观点与小 ego；以 Builder 而非单一研发角色定义责任。把这些判断分别回扣前文的老服务、OLAP、Agent 和跨角色协作，避免写成无来由的时代宣言。保留 “Taste is all you need”。

离开一节保留对 mentor、leader 与组织反馈机制的感谢；明确这只是作者四年里的个人经验。写 Spark、OLAP 与 Infra 之间可迁移的分布式系统判断，完成第二个 1024 冠军与第二次 “so fresh” 的回收，停在“感激过去，珍惜现在”。

- [ ] **Step 4: 检查初稿是否遗漏事实与核心判断**

Run:

```bash
ARTICLE='/Users/misery/Documents/burns project/云图回忆录.md'
rg -n '1024|Spark|Hive|HDFS|MapReduce|ClickHouse|Bitmap|3500|3350|阿里|腾讯|Kimi|Seed|老虎|焦油坑|Multi-Agent|connect the dots|ROI|Builder|Taste is all you need|so fresh' "$ARTICLE"
```

Expected: 每个关键词至少出现一次；`1024` 与 `so fresh` 均在开头和结尾附近出现；`Seed` 只指最终去向。

### Task 2: 内容与声音终审

**Files:**
- Modify: `/Users/misery/Documents/burns project/云图回忆录.md`

**Interfaces:**
- Consumes: Task 1 的完整初稿
- Produces: 事实未变、结构连续、读起来不像口述转写或 AI 模板的修订稿

- [ ] **Step 1: 逐节核对因果运动**

确认每节都发生一次认识变化：老服务从陌生到可拆解；竞争分析从相信数据到理解产品口径；OLAP 从功能优势到系统代价；转正从自我感觉良好到被反馈校正；Agent 从开放能力到生产稳定性；协作从个人承接到拆分责任和上下文；AI 从执行能力增强回到定义与判断。

删除只能传递背景、不能推进这些变化的重复段落，但不得删除设计稿中的事实与“必须保留的判断与表达”。

- [ ] **Step 2: 校正作者姿态与判断边界**

把“数据不会说谎”“技术问题从来都不是麻烦”等绝对表述收窄到作者经历支持的范围；保留其锋利含义，不把个人观察写成所有项目、组织和研发都适用的规律。

检查冠军、offer、组织认可只承担时间、选择或反馈证据，不承担“因此我的观点正确”的功能。

- [ ] **Step 3: 清除模型化结构和口述赘词**

Run:

```bash
ARTICLE='/Users/misery/Documents/burns project/云图回忆录.md'
rg -n '然后呢|这个事情其实|非常非常|首先|其次|最后就是|综上所述|值得注意的是|不难发现|让我们' "$ARTICLE" || true
rg -n '不是.+而是' "$ARTICLE" || true
```

Expected: 无连续口述赘词和标准文章套话；“不是 X，而是 Y”只在确实重划边界时出现，不形成连续句式。

- [ ] **Step 4: 朗读终审**

完整朗读全文，重写现实中不会这样说、读到中途忘记主语、过度解释情绪或明显为追求金句而存在的句子。金句必须由前面的项目事实支撑；保留用户指定的核心表达，不随机加口语、短句或错字制造“人味”。

### Task 3: 排版、事实与交付检查

**Files:**
- Modify: `/Users/misery/Documents/burns project/云图回忆录.md`
- Verify: `/Users/misery/Documents/burns project/云图回忆录.md`

**Interfaces:**
- Consumes: Task 2 的内容终审稿
- Produces: 可供用户直接审阅的 Markdown 成稿

- [ ] **Step 1: 核验有限外部归因**

用一手来源核验史蒂夫·乔布斯关于 “connect the dots” 的公开讲话。对《人月神话》的“焦油坑”只保留准确的作品与意象关系，不把用户的现代延伸伪装成原书直接引语。“人生要么 suffering，要么 boring”作为作者喜欢的表达保留，不添加未经确认的作者归属。

- [ ] **Step 2: 检查中英文混排与数字格式**

统一 Agent、Multi-Agent、Infra、Workflow、Playground、Builder、ROI、CPU、SSD 等写法；汉字与英文、汉字与阿拉伯数字之间保留一个半角空格。`3500 万` 与 `3350 万` 保留原口径数值，不擅自改为千位分隔格式，以免破坏指标叙述的口语感。

- [ ] **Step 3: 执行结构与残留检查**

Run:

```bash
ARTICLE='/Users/misery/Documents/burns project/云图回忆录.md'
test "$(rg -c '^# ' "$ARTICLE")" -eq 1
test "$(rg -c '^## ' "$ARTICLE")" -eq 5
! rg -n 'TBD|TODO|Zed|异构' "$ARTICLE"
rg -n '^## (实习|转正以后|正式入职|关于 AI 时代下的素质|离开云图)$' "$ARTICLE"
```

Expected: 一个一级标题、五个二级标题；标题名称和顺序与用户原稿一致；无占位符及已确认的转写错误。

- [ ] **Step 4: 对照设计稿完成最终审校**

逐条检查设计稿“不可更改的事实”“必须保留的判断与表达”和“通过标准”。确认文章没有新增无法从用户素材推出的事实，结尾没有在第二次 1024 回环后再添加总结或口号。

- [ ] **Step 5: 交付审阅稿**

向用户提供 `/Users/misery/Documents/burns project/云图回忆录.md` 的可点击链接，并用不超过四句话说明本轮主要改动。明确尚未发布；等用户读完后再按具体反馈修改。
