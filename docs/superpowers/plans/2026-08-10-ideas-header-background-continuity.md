# Ideas Header Background Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the fixed Ideas navigation's rectangular color veil so the atlas background remains visually continuous from the top of the viewport.

**Architecture:** Keep the existing fixed header and page backdrop intact. Protect the intended appearance with a stylesheet contract test, then remove only the route-specific `site-header::after` rules that create the veil.

**Tech Stack:** Astro, CSS, Node.js test runner

## Global Constraints

- Preserve the fixed navigation, its dimensions, text colors, and interaction states.
- Do not modify the atlas assets, black-hole placement, content layout, or mobile navigation structure.
- Remove the veil on both desktop and mobile.

---

### Task 1: Remove the Ideas header veil

**Files:**
- Modify: `tests/ideas-journal.test.ts`
- Modify: `src/styles/ideas-journal.css`

**Interfaces:**
- Consumes: the Ideas route selector `body[data-route="/ideas"]` and existing `.site-header` rules.
- Produces: an Ideas stylesheet with no `.site-header::after` overlay.

- [ ] **Step 1: Write the failing regression test**

Add this assertion to `Ideas journal styling fixes the background and keeps the reading controls available`:

```ts
assert.doesNotMatch(
  css,
  /body\[data-route="\/ideas"\] \.site-header::after/,
);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test --test-name-pattern="Ideas journal styling fixes" tests/ideas-journal.test.ts
```

Expected: failure because `src/styles/ideas-journal.css` still declares `body[data-route="/ideas"] .site-header::after`.

- [ ] **Step 3: Remove the minimal CSS that causes the veil**

Delete the complete desktop rule:

```css
body[data-route="/ideas"] .site-header::after {
  position: absolute;
  z-index: -1;
  inset: 0 -28px -18px;
  content: "";
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(224, 194, 150, 0.96),
    rgba(224, 194, 150, 0.74) 68%,
    transparent
  );
}
```

Also delete the now-dead mobile override:

```css
body[data-route="/ideas"] .site-header::after {
  inset-inline: -8px;
}
```

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
node --test --test-name-pattern="Ideas journal styling fixes" tests/ideas-journal.test.ts
npm run test:content
npm run build
```

Expected: all commands pass with no Astro diagnostics.

- [ ] **Step 5: Verify the rendered page at desktop width**

Run the local site and capture `/ideas` at a 2048-pixel-wide viewport. Confirm the atlas linework remains continuous beneath the fixed navigation, particularly in the upper-right region, while the navigation remains readable and fixed.

- [ ] **Step 6: Commit the implementation**

```bash
git add tests/ideas-journal.test.ts src/styles/ideas-journal.css
git commit -m "fix: reveal ideas background beneath navigation"
```

### Task 2: Publish the verified main branch

**Files:**
- No repository files changed.

**Interfaces:**
- Consumes: the verified `main` commit from Task 1.
- Produces: the same commit on `origin/main` and the Alibaba Cloud production checkout.

- [ ] **Step 1: Push main**

```bash
git push origin main
```

Expected: `origin/main` advances to the implementation commit.

- [ ] **Step 2: Deploy and verify production**

Use the repository's Alibaba Cloud production workflow, then confirm the production release SHA matches local `main` and `/ideas` returns successfully.
