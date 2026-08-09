# 《云图回忆录》补充插图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《云图回忆录》生成、插入并发布三张能直接解释工程观点的具体场景式概念插图。

**Architecture:** 三张图片分别由内置 ImageGen 独立生成，以真实器物和空间关系解释 OLAP 成本、Agent 生产边界和问题定义。合格图片保存到文章本地资源目录，Markdown 负责图位、alt 与图注，现有签名文章发布接口负责校验、WebP 转换和 production 更新。

**Tech Stack:** Burns Writing、built-in ImageGen、Markdown、Burns signed article publishing API、Chrome responsive inspection

## Global Constraints

- 输出固定为三张横向 3:2 位图：`14-olap-hardware-cost-concept-v1.png`、`15-agent-production-gate-concept-v1.png`、`16-problem-definition-workbench-concept-v1.png`。
- 禁止纸张、手稿、信件、墨迹、星空、星图、伪档案、标签墙、框线图、思维导图、发光 AI 大脑、品牌标识、伪产品界面和装饰性文字。
- 不生成 Burns 本人或真实同事，不把概念场景伪装成云图项目现场。
- 三张图分别使用独立构图，只以克制色彩、自然材质和编辑摄影观看距离形成系列感。
- 每张图必须包含准确 alt、解释论证关系的图注，以及“AI 生成的概念示意”声明。
- 原有 Pico、老虎和三张比赛图片全部保留，真实照片不得做生成式修改。

---

### Task 1: 生成并验收三张概念插图

**Files:**
- Create: `/Users/misery/Documents/burns project/yuntu-memoir-assets/14-olap-hardware-cost-concept-v1.png`
- Create: `/Users/misery/Documents/burns project/yuntu-memoir-assets/15-agent-production-gate-concept-v1.png`
- Create: `/Users/misery/Documents/burns project/yuntu-memoir-assets/16-problem-definition-workbench-concept-v1.png`

**Interfaces:**
- Consumes: approved illustration design at `docs/superpowers/specs/2026-08-09-yuntu-memoir-additional-illustrations-design.md`
- Produces: three inspected local raster assets for Markdown packaging

- [ ] **Step 1: Generate the OLAP hardware-cost image with built-in ImageGen**

Use one built-in ImageGen call with no reference images and this complete prompt:

```text
Use case: photorealistic-natural
Asset type: wide editorial concept image for a Chinese personal engineering memoir
Primary request: make the hidden resource bill of flexible OLAP queries physically visible.
Scene/backdrop: a modern open server test bench under sustained load, physically plausible and grounded, not a fantasy datacenter.
Subject: a large CPU heatsink at the visual center, dense memory modules, several enterprise SSDs, power delivery components, cooling fans and tightly routed cables all operating at once; restrained amber heat near the CPU and visible airflow pressure communicate load without diagrams.
Style/medium: high-end editorial photography, realistic engineering materials, natural detail, restrained color, no cyberpunk styling.
Composition/framing: horizontal 3:2, close-to-medium view, CPU in the foreground with memory and SSDs clearly distinguishable around it, one coherent physical scene.
Lighting/mood: neutral workshop light with a subtle warm thermal accent, serious and concrete.
Constraints: hardware must be recognizable and physically plausible; no people; no text; no numbers; no logos; no readable screens; no UI; no arrows; no callout lines; no labels; no watermark.
Avoid: paper, manuscript, ink, stars, space, archives, mind maps, framework diagrams, exploded diagrams, floating holograms, generic blue AI glow.
```

Use the `output_hint` path returned by ImageGen as `generated_source_path`, then copy the selected output without overwriting another source:

```bash
cp "$generated_source_path" "/Users/misery/Documents/burns project/yuntu-memoir-assets/14-olap-hardware-cost-concept-v1.png"
```

- [ ] **Step 2: Inspect the OLAP image**

Open the saved image with `view_image` at original detail. Accept only if CPU, memory and SSD are independently recognizable, the load is expressed by the physical scene rather than labels, and no forbidden material or pseudo-interface appears. If it fails, make one new ImageGen call changing only the failed relationship, save it as the same final filename, and inspect again.

- [ ] **Step 3: Generate the Agent production-boundary image with built-in ImageGen**

Use a separate built-in ImageGen call with no reference images and this complete prompt:

```text
Use case: photorealistic-natural
Asset type: wide editorial concept image for a Chinese personal engineering memoir
Primary request: show that exploratory autonomous behavior can remain open while production delivery needs an explicit control boundary.
Scene/backdrop: a realistic indoor robotics proving ground connected to an orderly production lane.
Subject: several small autonomous industrial carts choose different paths in a spacious open testing area; before entering the production lane, two carts queue and pass one at a time through a solid mechanical inspection gate and a narrow controlled corridor. The spatial transition itself explains freedom versus stability.
Style/medium: high-end editorial industrial photography, concrete architecture and believable robotics, restrained contemporary palette.
Composition/framing: horizontal 3:2, open testing area occupies the left two-thirds, the inspection gate creates a clear visual hinge, the production lane recedes cleanly on the right.
Lighting/mood: soft overhead industrial light, exploratory on the open side and calm, reliable order on the production side.
Constraints: relationship must be understandable without words; no people; no text; no numbers; no logos; no signs; no painted arrows; no UI; no callout lines; no labels; no watermark.
Avoid: paper, manuscript, ink, stars, space, archives, flowcharts, mind maps, card layouts, floating holograms, sci-fi robots, cyberpunk neon.
```

Copy the selected output to:

```bash
cp "$generated_source_path" "/Users/misery/Documents/burns project/yuntu-memoir-assets/15-agent-production-gate-concept-v1.png"
```

- [ ] **Step 4: Inspect the Agent image**

Open the saved image with `view_image` at original detail. Accept only if the open test area, single controlled gate and orderly production lane are legible as one spatial relationship without arrows or text. If it fails, make one new ImageGen call changing only the failed relationship, then inspect again.

- [ ] **Step 5: Generate the problem-definition workbench image with built-in ImageGen**

Use a third built-in ImageGen call with no reference images and this complete prompt:

```text
Use case: photorealistic-natural
Asset type: wide editorial concept image for a Chinese personal engineering memoir
Primary request: show that when execution becomes cheap, defining measurements and acceptance criteria becomes more important.
Scene/backdrop: a real precision engineering workbench in a quiet prototyping lab.
Subject: human hands in the foreground use a metal caliper, a go/no-go gauge and a rigid fixture to establish the exact standard for one machined component; an idle collaborative robotic arm waits beside the bench, clearly ready to execute only after the measurement is settled.
Style/medium: high-end editorial photography, tactile metal and workshop materials, natural realism, restrained color.
Composition/framing: horizontal 3:2, measuring tools and fixture are the dominant foreground action, the waiting robotic arm is visible but secondary, no face in frame.
Lighting/mood: clear directional workshop light, focused and deliberate rather than futuristic.
Constraints: measuring and acceptance criteria must be visually primary; hands only, no identifiable person; no text; no numbers readable on tools; no logos; no screens; no UI; no arrows; no callout lines; no labels; no watermark.
Avoid: paper, manuscript, ink, stars, space, archives, diagrams, mind maps, floating interfaces, glowing AI effects, generic teamwork stock photography.
```

Copy the selected output to:

```bash
cp "$generated_source_path" "/Users/misery/Documents/burns project/yuntu-memoir-assets/16-problem-definition-workbench-concept-v1.png"
```

- [ ] **Step 6: Inspect the problem-definition image**

Open the saved image with `view_image` at original detail. Accept only if measurement and fixture are visually primary, the robot is visibly waiting, no face or readable text appears, and the cause-and-effect relationship is concrete. If it fails, make one new ImageGen call changing only the failed relationship, then inspect again.

- [ ] **Step 7: Verify all three production assets**

Run:

```bash
for image in \
  "/Users/misery/Documents/burns project/yuntu-memoir-assets/14-olap-hardware-cost-concept-v1.png" \
  "/Users/misery/Documents/burns project/yuntu-memoir-assets/15-agent-production-gate-concept-v1.png" \
  "/Users/misery/Documents/burns project/yuntu-memoir-assets/16-problem-definition-workbench-concept-v1.png"; do
  test -s "$image"
  sips -g pixelWidth -g pixelHeight "$image"
done
```

Expected: all files are non-empty landscape images close to a 3:2 ratio, and every path resolves inside `yuntu-memoir-assets`.

---

### Task 2: 插入正文并保持图注顺序一致

**Files:**
- Modify: `/Users/misery/Documents/burns project/云图回忆录.md`

**Interfaces:**
- Consumes: the three accepted files produced by Task 1
- Produces: one eight-image Markdown article ready for signed validation

- [ ] **Step 1: Insert the OLAP illustration after the ROI paragraph**

Add exactly:

```markdown
![打开式服务器工作台上，高负载 CPU 散热器、内存条和多块 SSD 同时运行](./yuntu-memoir-assets/14-olap-hardware-cost-concept-v1.png)

*图 2：灵活的查询把代价推到了 CPU、内存、SSD 和稳定性上。AI 生成的概念示意。*
```

- [ ] **Step 2: Insert the Agent production-boundary illustration after the paragraph ending “谁来接住，谁来管控”**

Add exactly:

```markdown
![开放测试区中的自主设备自由探索，进入生产通道前依次通过实体校验闸门](./yuntu-memoir-assets/15-agent-production-gate-concept-v1.png)

*图 4：探索可以留在开放区域，稳定交付的环节仍需要明确边界。AI 生成的概念示意。*
```

- [ ] **Step 3: Insert the problem-definition illustration after the paragraph ending “重新定义问题”**

Add exactly:

```markdown
![工程师双手用卡尺和量规确定金属零件标准，旁边的机械臂等待执行](./yuntu-memoir-assets/16-problem-definition-workbench-concept-v1.png)

*图 5：执行越来越便宜以后，先把尺度和验收标准定义清楚，反而更重要。AI 生成的概念示意。*
```

- [ ] **Step 4: Renumber the existing captions in reading order**

Apply these exact changes:

```text
老虎概念图：图 2 → 图 3
第二次 1024 项目分享：图 3 → 图 6
第二次 1024 合影：图 4 → 图 7
第二次 1024 获奖截图：图 5 → 图 8
```

- [ ] **Step 5: Verify Markdown image and caption integrity**

Run:

```bash
article="/Users/misery/Documents/burns project/云图回忆录.md"
test "$(rg -c '^!\[' "$article")" -eq 8
test "$(rg -c '^\*图 [0-9]+：' "$article")" -eq 8
test "$(rg -c '^<div class="article-figure-grid">$' "$article")" -eq 1
for number in 1 2 3 4 5 6 7 8; do
  test "$(rg -c "^\\*图 ${number}：" "$article")" -eq 1
done
```

Expected: eight Markdown image lines in total, including the two images inside the existing raw HTML grid; eight captions numbered 1 through 8 exactly once; and one responsive figure grid.

---

### Task 3: 校验、发布并检查 production

**Files:**
- Verify: `/Users/misery/Documents/burns project/云图回忆录.md`
- Verify: `/Users/misery/Documents/burns project/personal-blog/.worktrees/yuntu-illustrations/skills/burns-upload-article/scripts/upload.mjs`

**Interfaces:**
- Consumes: the final Markdown and eight local image files from Tasks 1–2
- Produces: production article `https://burnsgao.me/writing/yuntu-memoir` at revision 6 with eight healthy media assets

- [ ] **Step 1: Run signed read-only validation**

Run:

```bash
BURNS_PUBLISH_URL=https://burnsgao.me \
BURNS_PUBLISH_KEY_ID=primary \
npm run article:upload -- \
  --slug yuntu-memoir \
  --file "/Users/misery/Documents/burns project/云图回忆录.md" \
  --status published \
  --validate
```

Expected: `validated: true`, slug `yuntu-memoir`, status `published`, and exactly eight packaged assets.

- [ ] **Step 2: Publish revision 6**

Run the same command without `--validate`:

```bash
BURNS_PUBLISH_URL=https://burnsgao.me \
BURNS_PUBLISH_KEY_ID=primary \
npm run article:upload -- \
  --slug yuntu-memoir \
  --file "/Users/misery/Documents/burns project/云图回忆录.md" \
  --status published
```

Expected: slug `yuntu-memoir`, status `published`, revision `6`, URL `/writing/yuntu-memoir`, and exactly eight assets.

- [ ] **Step 3: Verify desktop article rhythm**

Open `https://burnsgao.me/writing/yuntu-memoir` at a 1440 × 1000 viewport. Confirm the three generated images appear after their supporting paragraphs, each is a single full-width landscape figure, captions are centered and sequential, and the two real competition photos remain in one responsive row.

- [ ] **Step 4: Verify mobile article rhythm**

Set a 390 × 844 viewport. Confirm all three new images fit within the 358px article column without horizontal overflow, captions remain attached to their figures, and the competition image pair stacks into one column.

- [ ] **Step 5: Verify health, revision and media responses from the loaded production page**

From the same-origin page, fetch `/api/health`, `/api/articles/yuntu-memoir`, and issue `HEAD` requests for all eight returned asset URLs.

Expected: health HTTP `200`, release status `ok`, article HTTP `200`, revision `6`, DOM image count `8`, and every media request HTTP `200`.
