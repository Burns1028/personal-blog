# Workplace Identity Sutra Voice Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the essay so its judgment grows from a truthful personal observation, with less structural and sentence-level AI voice.

**Architecture:** Preserve the Markdown metadata and verified CBETA sources, but replace the current model-first body. The new version opens with the author’s real self-introduction, lets the two sutras enter as remembered ways of seeing, and keeps the role–narrative–choice framework implicit rather than displaying it in tables and definitions.

**Tech Stack:** Markdown, CBETA source links, shell-based text checks

## Global Constraints

- Keep the body between 2,200 and 2,700 Chinese characters excluding frontmatter and source notes.
- Use no more than 3 level-two headings and no Markdown tables or numbered frameworks.
- Do not invent a promotion, failure, meeting, dialogue, or emotional event as personal experience.
- Use the supplied facts exactly: ByteDance colleague, high performance rating, and a top offer.
- Use each of these abstract terms no more than twice: `身份认知`, `自我叙事`, `价值承诺`, `解释模型`, `社会坐标`.
- Use the “不是 X，而是 Y” construction no more than twice.
- Preserve the title `应无所住，而生其心`, `draft: true`, and the two CBETA source links.

---

### Task 1: Rebuild the Opening and Narrative Movement

**Files:**
- Modify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-05-workplace-identity-sutra-rewrite-design.md`
- Produces: a complete essay whose first half moves from a real self-introduction to the recurring need for proof

- [ ] **Step 1: Open with the supplied personal fact**

Begin from this truthful material without inventing a surrounding scene:

> 字节的同学，拿过高绩效，也拿到过顶级 offer。

Let the prose notice that the sentence is useful and true before asking why it has become so easy to use as a complete answer.

- [ ] **Step 2: Let the problem emerge before naming it**

Describe the ordinary rhythm of proof: a desired result brings relief, then quietly raises the standard for the next result. Do not announce a model or framework in the opening. Use `自我叙事` at most once, only after the reader has already felt the pattern.

- [ ] **Step 3: Remove visible scaffolding**

Delete the current system analogy, both Markdown tables, and headings that separately announce the Heart Sutra, Diamond Sutra, and value commitment. Keep at most three broad headings whose language sounds like the essay rather than a lesson.

### Task 2: Let the Sutras Change the Thought

**Files:**
- Modify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: the narrative movement from Task 1
- Produces: a second half in which each sutra resolves a different part of the author’s question

- [ ] **Step 1: Bring in the Heart Sutra through the concrete conditions of achievement**

Quote `照见五蕴皆空`, then write what a performance result actually contains: personal effort, project timing, collaborators, management judgment, and the evaluation cycle. Arrive once at this sentence-level judgment without turning it into a definition:

> 一个结果可以说明一段经历，不能替整个人下结论。

- [ ] **Step 2: Bring in the Diamond Sutra through continued action**

Quote `应无所住而生其心`. Emphasize `生其心`: the author still works, competes, protects credit, chooses, and accepts consequences. Do not use the prior `事实—叙事—承诺` table.

- [ ] **Step 3: Rewrite values as lived verbs without a comparison table**

Write curiosity, revising judgment, and responsibility inside prose. Retain this judgment once:

> 价值不是更好听的自我介绍，是下一次遇到事情时仍愿意怎样做。

Do not turn the three verbs into bullets, labels, or a checklist.

- [ ] **Step 4: Return to the original introduction**

End with ByteDance, high performance, and the offer still intact. Do not say “这些都是我，也都不是我.” Let the achievements remain part of the sentence, but not its period.

### Task 3: Verify Truthfulness, Restraint, and Voice

**Files:**
- Verify: `/tmp/burns-workplace-sutra.TNyjM0/draft.md`

**Interfaces:**
- Consumes: the complete rewrite from Tasks 1–2
- Produces: a review-ready Markdown draft

- [ ] **Step 1: Check structure and length**

Run:

```bash
ARTICLE=/tmp/burns-workplace-sutra.TNyjM0/draft.md
H2_COUNT=$(rg -c '^## ' "$ARTICLE")
TABLE_COUNT=$(rg -c '^\|' "$ARTICLE" || true)
BODY_CHARS=$(awk 'BEGIN{body=0} /^---$/{n++; if(n==2){body=1; next}} body{print}' "$ARTICLE" | wc -m | tr -d ' ')
test "$H2_COUNT" -le 3
test "$TABLE_COUNT" -eq 0
test "$BODY_CHARS" -ge 2200 -a "$BODY_CHARS" -le 2700
```

Expected: at most 3 H2 headings, zero table rows, and 2,200–2,700 body characters.

- [ ] **Step 2: Check sentence-level AI markers**

Run:

```bash
rg -n '这提供了一个很实用的检查方式|放到职业语境里|所以，更准确的变化|首先|其次|最后|综上所述|值得注意的是|不难发现' "$ARTICLE"
rg -n '不是.+而是' "$ARTICLE"
for TERM in 身份认知 自我叙事 价值承诺 解释模型 社会坐标; do printf '%s ' "$TERM"; rg -o "$TERM" "$ARTICLE" | wc -l; done
```

Expected: no standard transition matches; at most two `不是…而是…` matches; every abstract term count is at most two.

- [ ] **Step 3: Check truthfulness and source boundaries**

Confirm that the only first-person career facts are those supplied by the user, both source links point to CBETA `T08n0235` and `T08n0251`, and the closing note preserves the Buddhist-interpretation boundary.

- [ ] **Step 4: Read aloud once and remove over-finished sentences**

During the final read, remove any paragraph-ending aphorism that merely repeats the previous sentence. Keep no more than three standalone short sentences in the full body. Do not introduce deliberate typos or malformed punctuation.

- [ ] **Step 5: Present the full draft for review**

Show the article without YAML frontmatter. State that images remain a later production step and ask the user to judge whether the voice now feels lived-in rather than merely less formal.
