---
title: "不依赖意志力的知识库"
summary: "把捕获、整理与发布缩短为同一条路径，让知识工作不再变成第二份工作。"
publishedAt: 2026-06-28
tags: ["笔记", "工作流", "知识"]
featured: false
draft: false
number: "WR—003"
readingTime: "5 分钟"
---

知识库最常见的失败，不是工具不够强，而是维护动作离真实工作太远。

我们在会议里得到一个判断，在代码里发现一个边界，在复盘里确认一种模式；如果每次都需要打开另一套系统、选择分类、补齐模板，记录很快会变成额外负担。

## 让发布成为整理的副产品

我更喜欢把 Markdown 文件作为最小单元。它可以跟代码一起被搜索、被版本控制，也可以直接变成网页。

```bash
mkdir -p src/content/writing
$EDITOR src/content/writing/new-note.md
git add .
git commit -m "notes: publish a working thought"
git push
```

## 只保留会被使用的元数据

第一版通常只需要标题、摘要、日期、标签和草稿状态。复杂的分类系统可以等内容真正变多以后再出现。

如果一个字段从来不参与筛选、展示或判断，它可能只是在制造“已经整理好”的感觉。
