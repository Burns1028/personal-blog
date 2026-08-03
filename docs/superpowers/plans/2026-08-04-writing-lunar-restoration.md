# Writing Lunar Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the Writing archive's original lunar-phase visual language using the existing master strip, with every article phase derived from that same source.

**Architecture:** Keep `writing-moon-phases-1200.webp` as the only visual master. Render it directly as the complete top strip, generate eight versioned transparent article-phase crops with Sharp, and map article dates through the existing lunar-phase calculation. Add only a restrained highlight to the current phase.

**Tech Stack:** Astro, TypeScript, Sharp, Node test runner, CSS

## Global Constraints

- Do not regenerate lunar artwork or overwrite the master asset.
- Do not change Writing content, SQLite data, the atlas background, or other pages.
- Preserve transparent edges and prevent adjacent phases from entering a crop.
- Keep reduced-motion behavior and mobile readability intact.

---

### Task 1: Lock the restoration contract with failing tests

- [ ] Update archive asset tests to require the original strip and the restored, versioned crop family.
- [ ] Update presentation tests to require one complete top strip, compact article phases, and no old v2 phase source.
- [ ] Run the focused tests and confirm they fail for the expected missing implementation.

### Task 2: Generate article phases from the master

- [ ] Add fixed crop bounds for the eight lunar stages to `scripts/build-writing-assets.mjs`.
- [ ] Generate transparent WebP crops from `public/assets/writing-moon-phases-1200.webp` without overwriting the master.
- [ ] Verify crop dimensions, transparency, file size, and visual isolation.

### Task 3: Restore the Writing page presentation

- [ ] Point the asset manifest at the master strip and restored crop family.
- [ ] Render the master as one centered top image with a subtle current-phase glow.
- [ ] Reduce article phase size to 36–38px desktop and about 32px mobile.
- [ ] Disable the glow animation for reduced motion.

### Task 4: Verify and ship

- [ ] Run focused tests, the full content suite, and the production build.
- [ ] Inspect the desktop and mobile Writing page visually.
- [ ] Commit the isolated change, integrate it without touching unrelated user edits, push, and deploy through the existing workflow.
