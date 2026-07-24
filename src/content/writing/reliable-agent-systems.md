---
title: "Reliable agent systems are not a longer prompt"
summary: "Rethinking agent reliability through state, evidence, and recovery."
deck: "Once a model starts using tools, reliability is no longer just about the answer—it is about whether every step leaves evidence you can inspect."
publishedAt: 2026-07-24
updatedAt: 2026-07-24
tags: ["Agent", "Reliability", "Infra"]
featured: true
draft: false
number: "WR—001"
readingTime: "8 MIN"
---

很多 Agent 应用的第一版都从一条 Prompt 开始。这很合理：Prompt 是最短的反馈回路，能让我们快速确认模型是否理解任务。

问题在于，当系统开始读取外部信息、调用工具、修改状态，Prompt 就不再是系统本身。它只是系统里一个会变化、会失败、也会被上下文影响的决策节点。

> 可靠性不是让模型永远不犯错，而是让错误可见、可定位、可恢复。

## 从“回答正确”转向“过程有证据”

传统接口通常有明确的输入和输出。Agent 的输出却来自一条更长的路径：

1. 理解意图；
2. 拆分任务；
3. 选择工具；
4. 读取外部状态；
5. 执行动作；
6. 检查结果；
7. 决定继续还是停止。

如果系统只保存最终回复，那么大部分真正重要的信息已经丢失。我们不知道模型看到了什么，也不知道它为什么选择某个工具。

### 最小证据单元

我更愿意把一次执行记录成一组可验证的事件：

```ts
type AgentEvent =
  | { type: "intent"; value: string }
  | { type: "tool.call"; name: string; input: unknown }
  | { type: "tool.result"; name: string; output: unknown }
  | { type: "assertion"; rule: string; passed: boolean }
  | { type: "handoff"; reason: string };
```

这不是为了把日志做得更复杂，而是为了让每个关键判断都有位置可落。

## 把失败恢复当作产品能力

“重试一次”不是恢复策略。真正的恢复至少需要回答三个问题：

- 哪一步失败了？
- 已经产生了哪些外部影响？
- 继续执行会不会重复写入或发送？

对于会修改外部状态的工具，幂等键、动作前检查和动作后验证比更聪明的 Prompt 更重要。

```python
result = create_document(
    title=title,
    body=body,
    idempotency_key=stable_key,
)

assert result.url
assert result.status == "created"
```

## 让停止条件比继续条件更清楚

Agent 很容易继续：再搜索一次、再换一个工具、再组织一版答案。系统真正缺少的是明确的停止条件。

一个可操作的停止条件通常来自以下几类：

| 类型 | 示例 |
| --- | --- |
| 目标满足 | 用户要求的文件已经生成并验证 |
| 风险边界 | 下一步会发送消息或修改外部权限 |
| 信息不足 | 缺少会实质改变结果的用户选择 |
| 预算边界 | 继续搜索的边际收益已经很低 |

## 最后

Prompt 当然重要，但可靠的 Agent 产品最终会长成一套系统：它保存状态，要求证据，识别副作用，并且知道什么时候应该停下来。

更长的 Prompt 也许能让演示更顺滑；更好的系统边界才能让它走进真实工作。
