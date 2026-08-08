# Projects 活动信号档案实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Projects 页活动轨道被遮挡和详情不可读的问题，并实现已确认的 A「信号档案」详情卡。

**Architecture:** 保留现有 `ActivityDay[]` 数据流，在 `ActivityOrbit.astro` 内把每个日期渲染成可聚焦触发器与完整详情区域；页面内联脚本统一管理 hover、focus、touch 和卫星定位状态；Projects 专属样式负责抬升轨道、避让默认文字及实现信号档案视觉。数据库与 API 不变。

**Tech Stack:** Astro 7、TypeScript 6、原生 HTML/CSS/JavaScript、Node.js `node:test`、阿里云 CLI 3.4.11。

## Global Constraints

- 采用 A「信号档案」：直角冷青细边框、近黑半透明背景、顶部琥珀信号线。
- 同一天的详情必须渲染 `day.items` 中的全部活动。
- 每个节点支持 hover、键盘 focus 和触摸点击；`Escape` 可关闭并归还焦点。
- 桌面轨道中段连续可见；移动端继续使用进入文档流的垂直时间线。
- 不修改数据库结构、活动发布 API、项目卡或分页逻辑。
- 遵守 `prefers-reduced-motion: reduce`。

---

### Task 1: 为活动详情语义与交互建立失败测试

**Files:**
- Modify: `tests/presentation-contract.test.ts`
- Test: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: `ActivityDay.items: StoredActivity[]`。
- Produces: `data-activity-node`、`data-activity-trigger`、`data-activity-detail`、`aria-controls`、`aria-expanded` 和完整的 `day.items.map(...)` 渲染契约。

- [ ] **Step 1: 写入失败测试**

在 `tests/presentation-contract.test.ts` 增加两个用例，断言详情不是只读取 `items[0]`，并断言页面脚本具有开关、点击外部关闭及 `Escape` 处理：

```ts
test("Projects activity nodes expose every activity in an accessible detail archive", () => {
  const orbit = readFileSync(
    resolve(projectRoot, "src/components/projects/ActivityOrbit.astro"),
    "utf8",
  );

  assert.match(orbit, /day\.items\.map/);
  assert.match(orbit, /data-activity-node/);
  assert.match(orbit, /data-activity-trigger/);
  assert.match(orbit, /data-activity-detail/);
  assert.match(orbit, /aria-controls/);
  assert.match(orbit, /aria-expanded="false"/);
  assert.match(orbit, /item\.summary/);
  assert.match(orbit, /item\.url/);
  assert.doesNotMatch(orbit, /const featured = day\.items\[0\]/);
});

test("Projects activity archives support pointer, keyboard, touch, and satellite location", () => {
  const page = readFileSync(
    resolve(projectRoot, "src/pages/projects/index.astro"),
    "utf8",
  );

  assert.match(page, /function setActivityOpen/);
  assert.match(page, /pointerenter/);
  assert.match(page, /focusin/);
  assert.match(page, /aria-expanded/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /data-activity-trigger/);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node --test --test-name-pattern="Projects activity" tests/presentation-contract.test.ts`

Expected: FAIL，缺少 `day.items.map`、活动详情属性和 `setActivityOpen`。

- [ ] **Step 3: 提交测试红灯**

```bash
git add tests/presentation-contract.test.ts
git commit -m "test: specify project activity archives"
```

### Task 2: 实现完整活动详情与统一交互

**Files:**
- Modify: `src/components/projects/ActivityOrbit.astro`
- Modify: `src/pages/projects/index.astro`
- Test: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: `ActivityDay.date`、`ActivityDay.count` 与 `ActivityDay.items`。
- Produces: `setActivityOpen(node: HTMLElement, open: boolean)`；每个详情区的 ID 为 `activity-day-${day.date}`。

- [ ] **Step 1: 用完整日期活动替换首条活动摘要**

在 `ActivityOrbit.astro` 中增加活动类型标签，并把节点结构改为按钮触发器与完整档案：

```astro
const kindLabels = {
  progress: "进展",
  fix: "修复",
  release: "发布",
  research: "研究",
  maintenance: "维护",
} as const;

<li class="activity-orbit__day" data-activity-node data-open="false">
  <button
    class="activity-orbit__trigger"
    type="button"
    aria-expanded="false"
    aria-controls={`activity-day-${day.date}`}
    data-activity-trigger
  >
    <span class="activity-orbit__dot" aria-hidden="true" />
    <span class="activity-orbit__summary">
      <time datetime={day.date}>{day.date.slice(5).replace("-", ".")}</time>
      <strong>{day.count} 项活动</strong>
      <small>{day.items[0]?.projectSlug}：{day.items[0]?.title}</small>
    </span>
  </button>
  <article
    id={`activity-day-${day.date}`}
    class="activity-orbit__detail"
    data-activity-detail
    hidden
  >
    <header><time datetime={day.date}>{day.date}</time><strong>{day.count} 项活动</strong></header>
    <ol class="activity-orbit__records">
      {day.items.map((item) => (
        <li class="activity-orbit__record">
          <p class="activity-orbit__record-meta">
            <span>{item.projectSlug ?? "独立记录"}</span>
            <span>{kindLabels[item.kind]}</span>
          </p>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
          {item.url ? <a href={item.url} target="_blank" rel="noreferrer">查看 GitHub 记录 ↗</a> : null}
        </li>
      ))}
    </ol>
  </article>
</li>
```

- [ ] **Step 2: 实现统一的打开与关闭逻辑**

在 `src/pages/projects/index.astro` 中查询所有 `[data-activity-node]`，实现：

```js
function setActivityOpen(node, open) {
  const trigger = node.querySelector("[data-activity-trigger]");
  const detail = node.querySelector("[data-activity-detail]");
  if (!(trigger instanceof HTMLButtonElement) || !(detail instanceof HTMLElement)) return;
  node.dataset.open = String(open);
  trigger.setAttribute("aria-expanded", String(open));
  detail.hidden = !open;
}
```

为节点绑定 `pointerenter`、`pointerleave`、`focusin`、`focusout` 和触发器 `click`；点击节点外关闭全部，按 `Escape` 关闭并把焦点归还触发器。卫星按钮改为聚焦最新节点内的 `[data-activity-trigger]`，从而同时展开最新档案。

完整事件边界如下：

```js
const activityNodes = [
  ...document.querySelectorAll("[data-activity-node]"),
].filter((node) => node instanceof HTMLElement);

const closeActivitiesExcept = (current) => {
  for (const node of activityNodes) {
    if (node !== current) setActivityOpen(node, false);
  }
};

for (const node of activityNodes) {
  const trigger = node.querySelector("[data-activity-trigger]");
  if (!(trigger instanceof HTMLButtonElement)) continue;

  node.addEventListener("pointerenter", () => {
    closeActivitiesExcept(node);
    setActivityOpen(node, true);
  });
  node.addEventListener("pointerleave", () => {
    if (!node.contains(document.activeElement)) setActivityOpen(node, false);
  });
  node.addEventListener("focusin", () => {
    closeActivitiesExcept(node);
    setActivityOpen(node, true);
  });
  node.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!node.contains(document.activeElement) && !node.matches(":hover")) {
        setActivityOpen(node, false);
      }
    });
  });
  trigger.addEventListener("click", () => {
    const nextOpen = node.dataset.open !== "true";
    closeActivitiesExcept(node);
    setActivityOpen(node, nextOpen);
  });
}

document.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (target instanceof Element && !target.closest("[data-activity-node]")) {
    closeActivitiesExcept(null);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openNode = activityNodes.find((node) => node.dataset.open === "true");
  const trigger = openNode?.querySelector("[data-activity-trigger]");
  if (!openNode || !(trigger instanceof HTMLButtonElement)) return;
  setActivityOpen(openNode, false);
  trigger.focus({ preventScroll: true });
});
```

- [ ] **Step 3: 运行目标测试并确认通过**

Run: `node --test --test-name-pattern="Projects activity" tests/presentation-contract.test.ts`

Expected: PASS。

- [ ] **Step 4: 提交语义与交互实现**

```bash
git add src/components/projects/ActivityOrbit.astro src/pages/projects/index.astro tests/presentation-contract.test.ts
git commit -m "feat: add project activity signal archives"
```

### Task 3: 修复轨道几何并实现信号档案视觉

**Files:**
- Modify: `tests/presentation-contract.test.ts`
- Modify: `src/components/projects/ActivityOrbit.astro`
- Modify: `src/styles/projects-archive-v2.css`
- Test: `tests/presentation-contract.test.ts`

**Interfaces:**
- Consumes: Task 2 的活动节点与详情类名。
- Produces: 抬升后的轨道 `M0 44 C210 190 560 198 1000 38`，以及 `.activity-orbit__detail` 信号档案视觉状态。

- [ ] **Step 1: 写入轨道和视觉失败测试**

把旧的曲线路径断言替换为新路径，并增加这些契约：

```ts
assert.match(orbit, /d="M0 44 C210 190 560 198 1000 38"/);
assert.match(css, /\.activity-orbit__summary\s*\{[^}]*bottom:\s*24px/);
assert.match(css, /\.activity-orbit__detail\s*\{[^}]*background:\s*rgba\(3,\s*8,\s*10,\s*0\.96\)/);
assert.match(css, /\.activity-orbit__detail::before[\s\S]*?background:\s*#d3a04a/);
assert.match(css, /\.activity-orbit__day\[data-open="true"\][\s\S]*?opacity:\s*1/);
assert.match(css, /@media \(max-width:\s*767px\)[\s\S]*?\.activity-orbit__detail\s*\{[^}]*position:\s*relative/);
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node --test --test-name-pattern="Projects activity" tests/presentation-contract.test.ts`

Expected: FAIL，旧路径仍为 `M0 38 C180 240 520 260 1000 32`，且不存在信号档案样式。

- [ ] **Step 3: 实现抬升轨道与默认节点避让**

在 `ActivityOrbit.astro` 使用新曲线及对应节点位置：

```ts
const positions = [
  [13, 34],
  [25, 51],
  [43, 62],
  [61, 58],
  [78, 43],
  [91, 25],
] as const;
```

在 CSS 中让 `.activity-orbit__summary` 位于圆点上方 `24px`，轨道线保持独立连续层，不再穿过默认文字。

- [ ] **Step 4: 实现 A「信号档案」及响应式状态**

`.activity-orbit__detail` 使用 `rgba(3, 8, 10, 0.96)`、冷青细边框、顶部 `#d3a04a` 短线与克制阴影；通过节点的 `data-align` 为左右节点设置不同锚点。桌面端绝对定位在轨道上方，移动端改为 `position: relative` 并进入日期节点下方的文档流。减少动态效果偏好下取消位移。

- [ ] **Step 5: 运行目标测试与完整测试**

Run: `node --test --test-name-pattern="Projects activity" tests/presentation-contract.test.ts`

Expected: PASS。

Run: `npm run test:content`

Expected: 全部测试通过，失败数为 `0`。

- [ ] **Step 6: 提交视觉实现**

```bash
git add src/components/projects/ActivityOrbit.astro src/styles/projects-archive-v2.css tests/presentation-contract.test.ts
git commit -m "fix: clarify project activity orbit"
```

### Task 4: 构建与视觉回归

**Files:**
- Verify: `src/components/projects/ActivityOrbit.astro`
- Verify: `src/styles/projects-archive-v2.css`
- Verify: `src/pages/projects/index.astro`

**Interfaces:**
- Consumes: Tasks 2–3 的最终页面。
- Produces: 可发布的 Astro SSR 构建与三种视口截图证据。

- [ ] **Step 1: 完整构建**

Run: `npm run build`

Expected: `astro check` 为 `0 errors`，Astro SSR 构建退出码为 `0`。

- [ ] **Step 2: 启动本地生产构建并检查数据**

Run: `HOST=127.0.0.1 PORT=4321 npm start`

Expected: `GET /api/health` 返回 `status: ok`，`GET /projects` 返回 `200`。

- [ ] **Step 3: 视觉检查三个视口**

使用无头 Chrome 截取 `2,048 × 928`、`1,440 × 900` 和 `390 × 844`。桌面截图需要同时覆盖默认轨道和一张打开的详情卡；移动端截图需要覆盖展开后的流式详情。确认轨道中段连续、卡片不越界、文字可读且无横向滚动。

- [ ] **Step 4: 检查提交范围**

Run: `git status --short && git diff --check && git log --oneline -5`

Expected: 只有本计划相关提交，工作树干净。

### Task 5: 推送 `main` 并部署精确提交

**Files:**
- Verify: `ops/deploy-release.sh`

**Interfaces:**
- Consumes: 本地 `main` 的最终 40 位提交 SHA。
- Produces: GitHub `origin/main` 与阿里云 ECS `i-bp1bcc626i6ygsbfg71k` 上的同一发布 SHA。

- [ ] **Step 1: 推送当前 `main`**

Run: `git push origin main`

Expected: `origin/main` 指向本地最终提交。

- [ ] **Step 2: 用阿里云 CLI 做只读发布前检查**

通过 ECS Cloud Assistant 检查：

```sh
systemctl is-active burns-blog.service
git -C /opt/burns-blog/repository status --short
git -C /opt/burns-blog/repository rev-parse --short HEAD
readlink /opt/burns-blog/current
curl -fsS http://127.0.0.1:4321/api/health
```

Expected: 服务为 `active`，仓库无未提交改动，健康检查为 `ok`。

- [ ] **Step 3: 部署精确提交**

通过阿里云 CLI 的 `ecs RunCommand` 执行：

```sh
set -eu
release_sha="$(git rev-parse HEAD)"
remote_script="set -eu
/opt/burns-blog/repository/ops/deploy-release.sh '$release_sha'"
command_b64="$(printf '%s' "$remote_script" | base64 | tr -d '\n')"
aliyun ecs RunCommand \
  --RegionId cn-hangzhou \
  --InstanceId.1 i-bp1bcc626i6ygsbfg71k \
  --Type RunShellScript \
  --ContentEncoding Base64 \
  --CommandContent "$command_b64" \
  --Timeout 900 \
  --KeepCommand false
```

Expected: 输出 `deployed` 与 `$release_sha` 的完整值。

- [ ] **Step 4: 验证线上提交和页面**

实例内验证 `systemctl is-active burns-blog.service`、`readlink /opt/burns-blog/current` 与 `/api/health`；公网验证 `https://burnsgao.me/api/health`、`https://burnsgao.me/projects` 和三个视口下的活动详情交互。

Expected: 健康检查为 `ok`，线上 `release` 等于最终 SHA，Projects 页轨道与详情卡符合设计。
