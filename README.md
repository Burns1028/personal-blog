# MARGIN / 页边

一个以“做旧技术杂志”为视觉语言的 Astro 个人博客，包含：

- 黑色刊物封面式首页；
- 随滚动放大并接管视口的纸页过渡；
- Markdown 思考与持续更新的文档；
- 代码档案式 GitHub 项目入口；
- RSS、sitemap、SEO 与响应式阅读页面。

## 先替换个人信息

编辑 `src/data/site.ts`：

```ts
export const site = {
  author: "你的名字",
  email: "you@example.com",
  github: "https://github.com/your-handle",
  // ...
};
```

然后把 `src/content/projects/` 中每个项目的 `repo` 换成真实仓库地址。

## 写一篇文章

在 `src/content/writing/` 新建 Markdown：

```md
---
title: "文章标题"
summary: "一段用于列表和 SEO 的摘要"
publishedAt: 2026-07-24
tags: ["Agent", "Infra"]
featured: false
draft: false
number: "WR—004"
readingTime: "6 MIN"
---

正文从这里开始。
```

文档放在 `src/content/docs/`，项目放在 `src/content/projects/`。字段约束位于
`src/content.config.ts`。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build:static
npm run preview
```

`npm run build` 会在 Astro 静态产物外增加一个很薄的 Workers Static
Assets 适配层，供 Codex Sites / vinext 兼容托管使用。它不会改变内容模型，也不影响
GitHub Pages；GitHub Actions 使用的是 `build:static`。

## 发布到 GitHub Pages

1. 推送到 GitHub 仓库的 `main` 分支；
2. 在仓库 `Settings → Pages` 中选择 `GitHub Actions`；
3. 在 `Settings → Secrets and variables → Actions → Variables` 添加
   `SITE_URL`，值为你的最终域名；
4. 如使用自定义域名，再配置相应 DNS。

工作流已经放在 `.github/workflows/deploy.yml`。
