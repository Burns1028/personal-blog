---
title: "Notes on debugging remote training jobs"
summary: "Separate environment, resources, processes, and logs before spending another run on a blind retry."
publishedAt: 2026-06-18
updatedAt: 2026-07-20
tags: ["Infra", "Training", "Debug"]
featured: false
draft: false
number: "DOC—002"
status: "living"
section: "LLM INFRA"
---

远程训练任务失败时，最昂贵的动作往往是立刻重跑。先判断故障属于环境、资源、进程还是代码，可以显著缩短排查路径。

## 四层检查

### 环境

确认工作目录、提交版本、依赖环境和数据路径。

### 资源

确认 GPU 数量、显存、磁盘空间、网络和调度状态。

### 进程

确认主进程、worker、端口占用和分布式通信状态。

### 日志

先找第一处异常，而不是最后一行异常。后续报错常常只是上游失败的结果。

```bash
git rev-parse --short HEAD
nvidia-smi
df -h .
ps aux | grep -E "torchrun|python"
```

## 重跑之前

- 是否会覆盖已有 checkpoint？
- 是否需要清理僵尸进程？
- 失败是否可以用更小的样本复现？
- 新一轮运行会留下哪些额外证据？
