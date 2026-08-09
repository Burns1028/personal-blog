# 《云图回忆录》编辑纪实配图重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 撤下《云图回忆录》中四张被否决的 AI 概念图，生成三张叙事明确的编辑纪实情境图，并把包含四张真实照片与三张新图的文章发布到官网。

**Architecture:** 内置 ImageGen 独立生成三张横向 3:2 情境图，人工逐张检查后保存到文章资产目录。Markdown 只承担图片插入、alt、图注、连续编号与现有双图网格；签名发布客户端负责只读校验、图片打包、WebP 转换和 production 更新。此任务不修改生产代码，验证使用编辑前后断言、构建检查、发布接口响应和线上资源检查完成。

**Tech Stack:** Burns Writing、Guizang Type 1 人物纪实方法、built-in ImageGen、Markdown、Astro、Burns signed article publishing API

## Global Constraints

- 三张新图固定为横向 3:2 编辑纪实摄影，文件名分别为 `17-legacy-service-night-office-image2-v1.png`、`18-conversion-rehearsal-image2-v1.png`、`19-weekend-agent-prototyping-image2-v1.png`。
- 三张图使用相近的低饱和色彩、自然或可信室内光、轻微胶片颗粒和 Fujifilm / Leica 式编辑摄影观看距离。
- 人物不得复制 Burns 或真实同事的长相，不得出现可识别身份、公司标识、可读代码、可读 UI 或可读投影内容。
- 禁止纸张感、手稿感、墨迹、星空、宇宙、信息图、标签墙、框线图、思维导图、AI 机器人、赛博 HUD、商业图库摆拍和产品陈列。
- 四张真实照片全部保留，不做生成式修改；四张旧 AI 图只从文章引用中撤下，不删除源资源文件。
- 每张新图图注必须包含“AI 生成的情境插图”，避免把它伪装成当年现场证据。
- 发布后正文必须恰好七张图，编号 `图 1` 至 `图 7` 各出现一次；第二次比赛的分享照与队友合影保持现有响应式双栏。

### 用户最终修订（覆盖冲突步骤）

- 用户随后提供本人照片并授权作为三张主角图的身份参考；最终生成使用该照片锁定发型、圆框眼镜与侧面轮廓。
- 人物采用侧脸或背侧脸，不使用正脸、三分之四正脸、直视镜头或写真式构图。
- 最终文件为 `17-legacy-service-night-office-image2-v2.png`、`18-conversion-rehearsal-image2-v2.png`、`19-weekend-agent-prototyping-image2-v2.png`；下文的 v1 文件名仅代表首次实施记录。
- 最终公开图注不写“AI 生成”“生成的情境插图”或“概念示意”；下文要求三条 AI 声明的步骤已被本条覆盖。
- 最终发布结果为 `https://burnsgao.me/writing/yuntu-memoir` revision 8，共七个健康媒体资源。

---

### Task 1: 生成、保存并验收三张编辑纪实情境图

**Files:**
- Create: `/Users/misery/Documents/burns project/yuntu-memoir-assets/17-legacy-service-night-office-image2-v1.png`
- Create: `/Users/misery/Documents/burns project/yuntu-memoir-assets/18-conversion-rehearsal-image2-v1.png`
- Create: `/Users/misery/Documents/burns project/yuntu-memoir-assets/19-weekend-agent-prototyping-image2-v1.png`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-09-yuntu-memoir-editorial-documentary-reillustration-design.md`
- Produces: three visually inspected local PNG assets for article packaging

- [ ] **Step 1: Generate the legacy-service scene with built-in ImageGen**

Use one built-in ImageGen call, no reference images, with this complete prompt:

```text
Use case: photorealistic-natural
Asset type: landscape editorial photograph embedded in a Chinese personal technology memoir
Primary request: show the first moment of learning to take responsibility by patiently tracing a complicated legacy service without mature AI coding tools.
Scene/backdrop: a believable, mostly quiet late-night software office with most overhead lights off.
Subject: one young software engineer alone at an ordinary workstation, leaning forward between two monitors while tracing a complicated legacy service; screens show only unreadable shapes of code, terminal windows and nested calls; the desk has a water cup, keyboard and a few loose cables.
Style/medium: candid human documentary photography, Fujifilm/Leica editorial feeling, natural practical light, low saturation, subtle film grain, real textures.
Composition/framing: horizontal 3:2, medium-wide view from slightly behind and to the side, one clear human action, environment supplies context.
Lighting/mood: monitor light and one ordinary desk lamp, focused and responsible rather than exhausted or tragic.
Constraints: no recognizable identity, no logos, no readable text, no readable UI, no watermark.
Avoid: paper or manuscript aesthetic, ink, collage, stars, cosmic motifs, diagrams, labels, frames, sci-fi interfaces, cyberpunk, staged stock-photo posing.
```

- [ ] **Step 2: Generate the defense-rehearsal scene with built-in ImageGen**

Use a separate built-in ImageGen call, no reference images, with this complete prompt:

```text
Use case: photorealistic-natural
Asset type: landscape editorial photograph embedded in a Chinese personal technology memoir
Primary request: show the serious rehearsal and candid peer feedback that followed an initially unsuccessful conversion defense.
Scene/backdrop: a believable small conference room at night after normal working hours.
Subject: one young software engineer stands beside an ordinary presentation screen, explains seriously with a clicker, while exactly two colleagues sit at the table listening closely; one records notes on a laptop and the other prepares candid feedback; water bottles, notebooks and a few cables suggest a real working session; the slide contains only unreadable layout shapes.
Style/medium: candid human documentary photography, Fujifilm/Leica editorial feeling, natural office lighting, low saturation, subtle film grain, real textures.
Composition/framing: horizontal 3:2, observed from a corner of the room, clear attention flows from presenter to colleagues, nobody looks at the camera.
Lighting/mood: restrained tension, effort and mutual trust, not victory or celebration.
Constraints: no recognizable identity, no logos, no readable slide text, no watermark.
Avoid: paper or manuscript aesthetic, ink, collage, stars, cosmic motifs, diagrams, labels, frames, classroom staging, corporate training stock photography, celebration.
```

- [ ] **Step 3: Generate the weekend-Agent scene with built-in ImageGen**

Use a third built-in ImageGen call, no reference images, with this complete prompt:

```text
Use case: photorealistic-natural
Asset type: landscape editorial photograph embedded in a Chinese personal technology memoir
Primary request: show self-directed weekend experimentation whose value is still unknown but later becomes the entrance to an opportunity.
Scene/backdrop: a lived-in home desk on a quiet weekend afternoon with soft natural side light.
Subject: one young software engineer quietly experiments with an unfinished software system on an ordinary laptop; the interface is unreadable; one small development board, a few loose cables, headphones, half-finished coffee and casual notes make the activity concrete without becoming a product display.
Style/medium: candid human documentary photography, Fujifilm/Leica editorial feeling, low saturation, subtle film grain, intimate and believable real-life texture.
Composition/framing: horizontal 3:2, medium side or rear view, one person and one coherent workspace, spontaneous rather than staged.
Lighting/mood: curiosity, calm concentration and open-ended exploration.
Constraints: no recognizable identity, no logos, no readable text, no readable UI, no watermark.
Avoid: paper or manuscript aesthetic, ink, collage, stars, cosmic motifs, diagrams, labels, frames, AI robots, futuristic laboratory, cyberpunk, product display, commercial stock-photo posing.
```

- [ ] **Step 4: Copy each selected ImageGen output to its stable project path**

For each ImageGen response, use its returned `output_hint` as the source path, then copy it to the corresponding file declared above. Do not overwrite any unrelated asset.

- [ ] **Step 5: Inspect all three images at original detail**

Open every saved PNG with `view_image(detail: original)`. Accept only when:

- legacy-service image clearly shows one person tracing a complex service in a normal office, without futuristic UI;
- defense image clearly shows one presenter and exactly two colleagues engaged in rehearsal and feedback;
- weekend image clearly shows self-directed experimentation in a lived-in home workspace, not an AI advertisement;
- all three share a credible documentary color language and contain none of the global forbidden items.

If one image fails, make one new ImageGen call changing only the failed visual relationship, save the replacement to the same stable filename, and inspect it again.

- [ ] **Step 6: Verify production asset dimensions and file integrity**

Run:

```bash
for image in \
  "/Users/misery/Documents/burns project/yuntu-memoir-assets/17-legacy-service-night-office-image2-v1.png" \
  "/Users/misery/Documents/burns project/yuntu-memoir-assets/18-conversion-rehearsal-image2-v1.png" \
  "/Users/misery/Documents/burns project/yuntu-memoir-assets/19-weekend-agent-prototyping-image2-v1.png"; do
  test -s "$image"
  sips -g pixelWidth -g pixelHeight "$image"
done
```

Expected: all three files are non-empty landscape images with a 3:2 ratio, normally `1536 × 1024`.

---

### Task 2: 用三张新图重组文章图序

**Files:**
- Modify: `/Users/misery/Documents/burns project/云图回忆录.md`

**Interfaces:**
- Consumes: three accepted PNG assets from Task 1
- Produces: one seven-image Markdown article ready for build and signed validation

- [ ] **Step 1: Run the pre-edit structure assertions**

Run:

```bash
article="/Users/misery/Documents/burns project/云图回忆录.md"
test "$(rg -c '^!\[' "$article")" -eq 8
for old in \
  13-tiger-rule-image2-native-v1.png \
  14-olap-hardware-cost-concept-v1.png \
  15-agent-production-gate-concept-v1.png \
  16-problem-definition-workbench-concept-v1.png; do
  test "$(rg -c "$old" "$article")" -eq 1
done
for fresh in \
  17-legacy-service-night-office-image2-v1.png \
  18-conversion-rehearsal-image2-v1.png \
  19-weekend-agent-prototyping-image2-v1.png; do
  test "$(rg -c "$fresh" "$article" || true)" -eq 0
done
```

Expected: the article still has eight current image references, every rejected image is referenced once, and no new image is referenced yet.

- [ ] **Step 2: Replace the four rejected blocks and insert the three approved blocks**

Use `apply_patch` to make these exact content changes:

1. After the paragraph ending `但需要你把事情接住。`, insert:

```markdown
![深夜办公室里，一名年轻工程师独自面对显示复杂代码的屏幕梳理旧服务](./yuntu-memoir-assets/17-legacy-service-night-office-image2-v1.png)

*图 2：没有成熟工具的时候，复杂度只能靠人一层层理清。AI 生成的情境插图。*
```

2. Delete the OLAP image and caption block that references `14-olap-hardware-cost-concept-v1.png`.
3. After the paragraph ending `我一直很感谢这些帮助。`, insert:

```markdown
![夜晚会议室里，一名工程师站在屏幕前演练，两位同事坐在桌边认真反馈](./yuntu-memoir-assets/18-conversion-rehearsal-image2-v1.png)

*图 3：第一次答得不好以后，后面的顺利来自一次次把问题重新讲清楚。AI 生成的情境插图。*
```

4. Delete the tiger image and caption block that references `13-tiger-rule-image2-native-v1.png`.
5. Delete the Agent gate image and caption block that references `15-agent-production-gate-concept-v1.png`.
6. After the paragraph ending `但一些当时没有答案的积累，会在未来某个机会里重新出现。`, insert:

```markdown
![周末自然光照进生活化工作空间，一名工程师独自试验尚未成熟的软件系统](./yuntu-memoir-assets/19-weekend-agent-prototyping-image2-v1.png)

*图 4：当时不知道有没有用的积累，后来成了机会的入口。AI 生成的情境插图。*
```

7. Delete the caliper/robot-arm image and caption block that references `16-problem-definition-workbench-concept-v1.png`.
8. Renumber the existing real-photo captions: project talk `图 6 → 图 5`, team photo `图 7 → 图 6`, awards image `图 8 → 图 7`.

- [ ] **Step 3: Verify the final Markdown structure and rejected-image absence**

Run:

```bash
article="/Users/misery/Documents/burns project/云图回忆录.md"
test "$(rg -c '^!\[' "$article")" -eq 7
test "$(rg -c '^\*图 [0-9]+：' "$article")" -eq 7
test "$(rg -c '^<div class="article-figure-grid">$' "$article")" -eq 1
for number in 1 2 3 4 5 6 7; do
  test "$(rg -c "^\*图 $number：" "$article")" -eq 1
done
test "$(rg -c 'AI 生成的情境插图' "$article")" -eq 3
for old in \
  13-tiger-rule-image2-native-v1.png \
  14-olap-hardware-cost-concept-v1.png \
  15-agent-production-gate-concept-v1.png \
  16-problem-definition-workbench-concept-v1.png; do
  test "$(rg -c "$old" "$article" || true)" -eq 0
done
```

Expected: seven images and seven captions numbered once each; one existing figure grid; three transparent AI declarations; zero references to all four rejected images.

---

### Task 3: 构建、校验、发布并验证官网

**Files:**
- Verify: `/Users/misery/Documents/burns project/云图回忆录.md`
- Use: `/Users/misery/Documents/burns project/personal-blog/.worktrees/yuntu-illustrations/skills/burns-upload-article/scripts/upload.mjs`

**Interfaces:**
- Consumes: final Markdown plus seven local image assets
- Produces: a new published revision of `https://burnsgao.me/writing/yuntu-memoir`

- [ ] **Step 1: Run the site build before touching production**

Run `npm run build` from the isolated worktree.

Expected: `astro check` reports zero errors and `astro build` exits `0`.

- [ ] **Step 2: Run signed read-only article validation**

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

Expected: `validated: true`, slug `yuntu-memoir`, status `published`, and exactly seven packaged assets.

- [ ] **Step 3: Publish the updated article**

Run the same command without `--validate`. Expected: slug `yuntu-memoir`, status `published`, URL `/writing/yuntu-memoir`, exactly seven assets, and a revision greater than the previous production revision `6`.

- [ ] **Step 4: Verify production API content and media health**

Fetch `https://burnsgao.me/api/health` and `https://burnsgao.me/api/articles/yuntu-memoir`. Confirm health HTTP `200`, article HTTP `200`, status `published`, returned revision greater than `6`, exactly seven assets, and no rejected filename in the article source. Issue a `HEAD` or ordinary `GET` request for every returned media URL and require HTTP `200`.

- [ ] **Step 5: Verify the rendered production article**

Open `https://burnsgao.me/writing/yuntu-memoir` and confirm:

- the three new documentary scenes appear after their intended paragraphs;
- the four rejected concept images do not appear;
- all captions are consecutive from `图 1` to `图 7`;
- the two second-1024 real photos share one row on a desktop viewport and stack on a narrow viewport;
- all seven images load without broken placeholders or horizontal overflow.

- [ ] **Step 6: Run final local evidence checks**

Run `git status --short` and `git diff --check` in the isolated worktree. Expected: only intentional documentation state remains and there are no whitespace errors.
