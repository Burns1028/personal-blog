# Workplace Identity Sutra Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the essay so readers can use the “role–narrative–commitment” model to understand identity changes at work.

**Architecture:** Keep the existing Markdown frontmatter and Buddhist source notes, but replace the argument spine. The new draft starts from a failed prediction after success, explains identity as a lightweight self-narrative model, uses the Heart Sutra and Diamond Sutra for two distinct moves, and ends with observable action rules.

**Tech Stack:** Markdown, CBETA source links, shell-based text checks

## Global Constraints

- Keep the draft between 2,500 and 3,200 Chinese characters excluding frontmatter and source notes.
- Use personal experience only as evidence; keep “我” to 2–5 occurrences.
- Do not present the systems analogy as a settled psychological or neuroscientific theory.
- Do not turn either sutra into a workplace manual or claim the article is the only interpretation.
- Preserve the title `应无所住，而生其心` and `draft: true`.

---

### Task 1: Replace the Essay’s Argument Spine

**Files:**
- Modify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: the approved design in `docs/superpowers/specs/2026-08-05-workplace-identity-sutra-rewrite-design.md`
- Produces: a complete Markdown essay whose sections progress from role to narrative to commitment

- [ ] **Step 1: Rewrite the opening around a failed prediction**

Open with the familiar thought “等我升上去，就证明自己了,” followed by the discovery that the title changed while anxiety remained. State the main judgment within the first three paragraphs:

> 真正动摇身份认知的，往往不是事件本身，而是事件让原来的自我叙事失效了。

- [ ] **Step 2: Explain identity as a lightweight model**

Use the engineering analogy carefully: roles are coordinates; the self-narrative compresses past events and predicts future ones; repeated positive feedback hides the distinction between the coordinate and the person. Mention that this is an explanatory analogy, not a literal claim about how the brain is implemented.

- [ ] **Step 3: Give the two sutras separate jobs**

Use “照见五蕴皆空” to explain conditionality: a role is real and useful but depends on organization, timing, relationships, and evaluation. Use “应无所住而生其心” to explain continued agency after the old model fails: do not ask a result to prove the whole person, but continue choosing and acting.

- [ ] **Step 4: Convert value labels into action rules**

Contrast “我是一个有好奇心的人” with an observable rule such as:

> 遇到暂时解释不了的问题时，先靠近它，形成自己的判断；证据变化时，允许判断一起变化；作出选择以后，把风险和后果接回来。

Explain that values are recurring decisions, not a more flattering identity label.

- [ ] **Step 5: End on the distinction between coordinates and direction**

Return to the opening. The final movement must show that an expired role does not reveal a hidden permanent self; it creates another opportunity to choose. End with a compact variation of:

> 坐标会失效，方向要一次次选择。

### Task 2: Run Burns Content and Format Checks

**Files:**
- Verify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: the rewritten essay from Task 1
- Produces: a review-ready Markdown draft with verified sources and no Burns hard-rule violations

- [ ] **Step 1: Check metadata, length, headings, and banned phrases**

Run:

```bash
rg -n '^# |在当今|近年来|随着.*发展|说白了|本质上|综上所述|值得注意的是|不难发现|让我们来看看|。。。|？？？|= =' /tmp/burns-workplace-sutra.TNyjM0/draft.md
awk 'BEGIN{body=0} /^---$/{n++; if(n==2){body=1; next}} body{print}' /tmp/burns-workplace-sutra.TNyjM0/draft.md | wc -m
rg -o '我' /tmp/burns-workplace-sutra.TNyjM0/draft.md | wc -l
```

Expected: no forbidden phrase or body-level H1 matches; body length is 2,500–3,200 Chinese characters; “我” occurs 2–5 times.

- [ ] **Step 2: Check the argument contract**

Run:

```bash
rg -n '自我叙事|角色|价值承诺|照见五蕴皆空|应无所住而生其心|坐标|方向' /tmp/burns-workplace-sutra.TNyjM0/draft.md
```

Expected: the opening names self-narrative failure; both sutra quotations support distinct sections; the final section returns to coordinates and direction.

- [ ] **Step 3: Verify source links and truthfulness boundaries**

Confirm that the footnotes link to CBETA `T08n0235` and `T08n0251`, that the systems analogy is marked as an analogy, and that no unprovided personal event is narrated as fact.

- [ ] **Step 4: Present the full draft for review**

Show the article without YAML frontmatter. State that images remain a separate production step and do not claim the article is final until the user approves the argument and voice.
