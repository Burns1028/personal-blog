# 《谈认同》重写实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有文章重写为《谈认同》，说明认同在组织中的真实作用、越界后的代价，以及不依靠新身份仍然行动的可能。

**Architecture:** 使用研究驱动与有限个人证据的混合写法。组织心理学材料先纠正“认同都是束缚”的简单判断，《心经》解释成绩与身份的条件性，《金刚经》进一步阻止文章把价值认同写成新的永久自我。

**Tech Stack:** Markdown、CBETA 原典、同行评审组织心理学研究、shell 文本检查

## Global Constraints

- 标题使用 `谈认同`，保留 `draft: true`、文章编号与现有标签。
- 正文控制在 2,200—2,800 个中文字符，最多 3 个二级标题，不使用表格或编号框架。
- 字节、高绩效和顶级 offer 只作为作者已经提供的事实出现一次；不虚构晋升、失败、会议、对白或情绪场景。
- 承认角色和组织认同的实际作用，不把“摆脱身份”写成轻巧答案。
- 不把价值认同写成终点；好奇、探索和负责必须落到选择，不形成新的自我定义。
- 《心经》和《金刚经》分别改变论证，不作为文化装饰。
- “不是 X，而是 Y”不超过两次；不强制短句、口语词、回环或金句结尾。

---

### Task 1: 重建论点与开头

**Files:**
- Modify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-05-workplace-identity-sutra-rewrite-design.md`
- Produces: 说明“认同有用且会越界”的文章前半部分

- [ ] **Step 1: 修改 frontmatter**

把标题、摘要和 deck 改为：

```yaml
title: "谈认同"
summary: "认同让组织得以协作，也会悄悄变成对一个人的判词。"
deck: "职位和成绩不需要被否定，价值也不是更稳定的身份；下一次选择仍要重新做。"
```

- [ ] **Step 2: 从认同的功能切入**

第一部分先写组织为什么需要角色、归属和评价。只用一段研究材料校准判断：2015 年的元分析发现，组织认同与工作满意度、角色内表现和角色外表现相关；2021 年四项研究发现，重要社会角色被打断时，人更容易感到不像自己。

引用：

- [Lee, Park & Koo, 2015](https://pubmed.ncbi.nlm.nih.gov/25984729/)
- [Liu, Dalton & Lee, 2021](https://doi.org/10.1371/journal.pone.0256939)

- [ ] **Step 3: 放入有限个人证据**

正文中只出现一次下列事实，不把它放在第一句话，也不追加虚构场景：

> 我也会说，自己是字节的同学，拿过高绩效，也拿到过顶级 offer。

由此提出问题：一句准确的坐标，什么时候开始被当成关于整个人的结论。

- [ ] **Step 4: 写出认同越界后的代价**

把原稿“不断证明自己”的泛化段落改为组织语境里的具体机制：评价本来回答一段时间内做得怎样，后来却被拿来回答自己是否仍然值得；身份越中心，变化越容易被体验成自我的断裂。

### Task 2: 让两部经文继续推进论证

**Files:**
- Modify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: Task 1 的“组织坐标变成判词”问题
- Produces: 由条件性推进到不建立新身份的文章后半部分

- [ ] **Step 1: 用《心经》处理条件性**

保留“照见五蕴皆空”，但不把“空”解释成什么都不重要。写清一份绩效由投入、项目时机、协作者、管理判断和评价周期共同形成；成绩真实，贡献应该被看见，却不能独自完成对一个人的解释。

- [ ] **Step 2: 用《金刚经》阻止价值身份化**

引用完整语境：

> 不应住色生心，不应住声香味触法生心，应无所住而生其心。

文章由此不能停在“从职业身份转向价值认同”。写明“我是好奇、负责的人”也可能成为需要保护的自我形象，使人拒绝承认无知、错误和疲惫。

- [ ] **Step 3: 把价值写成组织中的动作**

用连续散文写出四类实际选择，不做列表：遇到未知时靠近问题，证据变化时改判断，组织利益与个人判断冲突时守边界，作出选择后承担后果。价值只在这些动作中成立，不替人生成新的永久身份。

- [ ] **Step 4: 在具体判断处结束**

结尾不回到履历，不总结两部经文，也不提出新的自我介绍。停在：角色仍然承担，结果仍然争取，但它们不能免除下一次重新判断和选择。

### Task 3: 终审与交付

**Files:**
- Verify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: Task 1—2 的完整 Markdown 草稿
- Produces: 可供用户阅读的文章正文

- [ ] **Step 1: 检查结构、长度与事实边界**

Run:

```bash
ARTICLE=/tmp/burns-workplace-sutra.TNyjM0/draft.md
H2_COUNT=$(rg -c '^## ' "$ARTICLE" || true)
TABLE_COUNT=$(rg -c '^\|' "$ARTICLE" || true)
BODY_CHARS=$(awk 'BEGIN{body=0} /^---$/{n++; if(n==2){body=1; next}} body{print}' "$ARTICLE" | wc -m | tr -d ' ')
test "$H2_COUNT" -le 3
test "$TABLE_COUNT" -eq 0
test "$BODY_CHARS" -ge 2200 -a "$BODY_CHARS" -le 2800
```

Expected: H2 不超过 3，表格为 0，正文字符数为 2,200—2,800。

- [ ] **Step 2: 检查模型写作痕迹**

Run:

```bash
rg -n '首先|其次|最后|综上所述|值得注意的是|不难发现|让我们|说真的|我一直觉得' "$ARTICLE" || true
rg -n '不是.+而是' "$ARTICLE" || true
rg -n '字节|高绩效|顶级 offer' "$ARTICLE"
```

Expected: 无标准套话；“不是 X，而是 Y”不超过 2 次；三项个人事实只在同一处出现。

- [ ] **Step 3: 检查来源和哲学替换测试**

确认四个链接可打开：两篇研究、CBETA `T08n0235` 和 `T08n0251`。再做替换测试：如果删掉《心经》，条件性论证会缺失；如果删掉《金刚经》，文章会错误停在价值身份。任一经文可无损删除时返工。

- [ ] **Step 4: 朗读并删除过度完成的句子**

删除只是重复上一句的段末金句、机械回环、连续对称句和解释完每一处留白的句子。不通过随机拆句、俚语或错字制造活人感。

- [ ] **Step 5: 向用户展示正文**

展示时不附 YAML frontmatter、自检表或写作过程。保留正文中的简短内联引用和经文脚注，先让用户判断文章本身。
