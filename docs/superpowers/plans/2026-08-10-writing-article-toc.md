# Writing Article Top-Level TOC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Writing 文章左栏自动展示正文实际最高层级标题，并提供锚点跳转和当前章节高亮。

**Architecture:** 服务端继续使用 Markdown renderer 返回的 headings，不扫描浏览器 DOM。新增一个纯函数选择正文最浅标题层级，`ArticleLayout.astro` 只负责渲染和滚动交互；Writing 路由显式开启目录。

**Tech Stack:** Astro 7、TypeScript、Node test runner、原生 IntersectionObserver 与锚点导航。

## Global Constraints

- 页面文章标题不进入目录。
- 只展示正文实际出现的最浅标题层级，不写死 `h2`。
- 没有标题时不渲染空目录或解释文字。
- 桌面端目录 sticky；窄屏横向滚动且不遮挡正文。
- 不修改文章 Markdown 和标题 ID 生成方式。

---

### Task 1: 选择正文最高层级标题

**Files:**
- Create: `src/lib/article-headings.ts`
- Create: `tests/article-headings.test.ts`

**Interfaces:**
- Consumes: Astro renderer 产生的 `{ depth, slug, text }[]`。
- Produces: `selectTopLevelArticleHeadings<T extends ArticleHeading>(headings: readonly T[]): T[]`。

- [ ] **Step 1: 写失败测试**

覆盖混合 `depth`、只有深层标题、脚注标题和空数组：

```ts
assert.deepEqual(
  selectTopLevelArticleHeadings([
    { depth: 2, slug: "first", text: "第一章" },
    { depth: 3, slug: "detail", text: "细节" },
    { depth: 2, slug: "second", text: "第二章" },
  ]).map(({ slug }) => slug),
  ["first", "second"],
);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/article-headings.test.ts`

Expected: FAIL，因为 `src/lib/article-headings.ts` 尚不存在。

- [ ] **Step 3: 实现纯函数**

```ts
export interface ArticleHeading {
  depth: number;
  slug: string;
  text: string;
}

export function selectTopLevelArticleHeadings<T extends ArticleHeading>(
  headings: readonly T[],
): T[] {
  const eligible = headings.filter(({ slug }) => slug !== "footnote-label");
  if (eligible.length === 0) return [];
  const topDepth = Math.min(...eligible.map(({ depth }) => depth));
  return eligible.filter(({ depth }) => depth === topDepth);
}
```

- [ ] **Step 4: 运行单元测试**

Run: `node --test tests/article-headings.test.ts`

Expected: PASS。

### Task 2: 启用并渲染 Writing 目录

**Files:**
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/pages/writing/[...slug].astro`
- Modify: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `selectTopLevelArticleHeadings`。
- Produces: `data-writing-toc` 目录，仅在开关打开且存在标题时渲染。

- [ ] **Step 1: 更新契约测试并确认旧实现失败**

测试要求路由使用 `showTableOfContents`，布局调用选择函数，并且不输出“原稿未设置章节标题”。

Run: `node --test tests/presentation-contract.test.ts`

Expected: FAIL，因为路由当前传入 `showTableOfContents={false}`。

- [ ] **Step 2: 接入动态标题选择**

在布局中导入纯函数，将现有固定 `depth >= 2 && depth <= 3` 过滤替换为：

```ts
const tocHeadings = selectTopLevelArticleHeadings(headings);
```

将目录现有外层条件从 `showTableOfContents && (` 改为
`showTableOfContents && tocHeadings.length > 0 && (`，保留现有 `nav`、编号、链接与标题子节点；删除空目录文案和子层级专用 class。

- [ ] **Step 3: Writing 路由开启目录**

把 `showTableOfContents={false}` 改为 `showTableOfContents`。

- [ ] **Step 4: 运行相关测试**

Run: `node --test tests/article-headings.test.ts tests/presentation-contract.test.ts`

Expected: PASS。

### Task 3: 稳定滚动高亮并完成验证

**Files:**
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: 已渲染的目录链接及其目标 heading。
- Produces: 点击平滑跳转、滚动中最近已越过章节高亮、移动端横向快捷导航。

- [ ] **Step 1: 改进当前章节计算**

在现有 IntersectionObserver 之外，用 `requestAnimationFrame` 节流滚动处理；选择 `getBoundingClientRect().top <= viewportOffset` 的最后一个标题，否则选择首项。链接点击时尊重 `prefers-reduced-motion`：

```ts
heading.scrollIntoView({
  behavior: reduceMotion.matches ? "auto" : "smooth",
  block: "start",
});
```

- [ ] **Step 2: 收敛目录样式**

沿用现有 `.writing-toc` 桌面和移动样式，删除不再使用的 `.is-sub` 分支；为目录列表增加最大可视高度和轻量滚动保护，使长目录不超出视口。

- [ ] **Step 3: 运行完整校验**

Run: `npm run test:content`

Expected: 全部测试通过。

Run: `npm run build`

Expected: `astro check` 无错误，SSR build 成功。

- [ ] **Step 4: 可视化烟测**

在桌面宽度验证目录处于截图左侧空白区、点击与滚动高亮正确；在 900px 以下验证目录横向排列且不与上一篇／下一篇和正文重叠。

- [ ] **Step 5: 提交**

```bash
git add src/lib/article-headings.ts tests/article-headings.test.ts \
  src/layouts/ArticleLayout.astro src/pages/writing/'[...slug].astro' \
  src/styles/global.css tests/presentation-contract.test.ts
git commit -m "feat: add top-level navigation to writing articles"
```
