---
title: "A field guide to agent evaluation"
summary: "From task contracts and trace evidence to a failure taxonomy that can actually drive iteration."
publishedAt: 2026-07-01
updatedAt: 2026-07-24
tags: ["Agent", "Evaluation", "Checklist"]
featured: true
draft: false
number: "DOC—001"
status: "living"
section: "EVALUATION"
---

这份手册用于评估会调用工具、读取外部状态并执行多步任务的 Agent。它不试图给出一个万能分数，而是帮助团队得到可以行动的失败分类。

## 先写清楚任务合同

每条任务样本至少包含：

- 用户真正想完成的结果；
- 可使用的工具和数据范围；
- 不允许发生的副作用；
- 可以被机器或人工检查的完成证据。

```yaml
id: create-weekly-report
goal: create a report from three approved sources
allowed_tools:
  - search_documents
  - create_document
must_not:
  - message_external_users
evidence:
  - document_url_exists
  - required_sections_present
```

## 保存轨迹，而不只保存答案

最终答案只能说明表达质量，无法解释执行质量。应同时保存工具调用、工具结果、关键判断和验证步骤。

## 失败分类

建议从少量、互斥度较高的类别开始：

| 类别 | 说明 |
| --- | --- |
| 理解失败 | 错读了用户目标或约束 |
| 规划失败 | 路径不完整或顺序错误 |
| 工具失败 | 选错工具、参数错误或未处理返回值 |
| 验证失败 | 已执行但没有确认结果 |
| 停止失败 | 过早结束或无意义继续 |

## 每次迭代的最小闭环

1. 选择最近最重要的失败簇；
2. 复现三到五条代表性样本；
3. 修改一个主要变量；
4. 回放完整任务集；
5. 检查新回归；
6. 记录为什么这次修改有效或无效。
