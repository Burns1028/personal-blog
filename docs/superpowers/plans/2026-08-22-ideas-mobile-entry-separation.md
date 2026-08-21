# Ideas Mobile Entry Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make long Ideas entries clearly distinguishable from adjacent entries on phones while leaving desktop unchanged.

**Architecture:** Keep the existing Astro markup and journal timeline. Add a phone-only adjacent-entry gap and override the phone text divider/padding inside the existing canonical Ideas media query, guarded by the existing responsive contract test.

**Tech Stack:** Astro, CSS, Node.js built-in test runner.

## Global Constraints

- Production changes are confined to the canonical `@media (max-width: 767px)` Ideas block.
- At `360px`, `390px`, and `430px`, Ideas remains a full-width single-column document flow with no horizontal overflow or nested scrolling.
- At `1440px`, the original three-column timeline geometry and dotted desktop divider remain unchanged.
- Do not change markup, content, search controls, date filters, or other routes.

---

### Task 1: Strengthen phone entry boundaries

**Files:**
- Modify: `tests/mobile-responsive-contract.test.ts`
- Modify: `src/styles/ideas-journal.css`

**Interfaces:**
- Consumes: the existing `mobileBlockContaining(css, "Mobile responsive contract: Ideas")` test helper and `.ideas-journal__entry`, `.ideas-journal__meta`, `.ideas-journal__entry h2` selectors.
- Produces: a phone-only 10px adjacent-entry gap, 14px metadata top padding, 20px text bottom padding, and 1px solid warm-brown divider.

- [ ] **Step 1: Write the failing responsive contract test**

Append this test to `tests/mobile-responsive-contract.test.ts`:

```ts
test("Ideas gives long phone entries an unmistakable reading break", () => {
  const css = read("src/styles/ideas-journal.css");
  const desktop = css.slice(0, css.indexOf("@media"));
  const mobile = mobileBlockContaining(
    css,
    "Mobile responsive contract: Ideas",
  );

  assert.match(
    mobile,
    /\.ideas-journal__entry\s*\+\s*\.ideas-journal__entry\s*\{[^}]*margin-top:\s*10px/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__meta\s*\{[^}]*padding:\s*14px 0 0/,
  );
  assert.match(
    mobile,
    /\.ideas-journal__entry h2\s*\{[^}]*padding:\s*8px 0 20px[^}]*border-bottom:\s*1px solid rgba\(89,\s*59,\s*28,\s*0\.3\)/,
  );
  assert.match(
    desktop,
    /\.ideas-journal__entry h2\s*\{[^}]*border-bottom:\s*1px dotted rgba\(89,\s*59,\s*28,\s*0\.15\)/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="Ideas gives long phone entries" tests/mobile-responsive-contract.test.ts
```

Expected: FAIL because the mobile block does not yet contain the adjacent-entry margin or stronger divider.

- [ ] **Step 3: Implement the minimal phone-only CSS**

Inside the canonical `@media (max-width: 767px)` Ideas block in `src/styles/ideas-journal.css`, add the adjacent sibling rule and update the existing metadata and heading declarations:

```css
.ideas-journal__entry + .ideas-journal__entry {
  margin-top: 10px;
}

.ideas-journal__meta {
  padding: 14px 0 0;
}

.ideas-journal__entry h2 {
  padding: 8px 0 20px;
  border-bottom: 1px solid rgba(89, 59, 28, 0.3);
}
```

- [ ] **Step 4: Verify GREEN and the complete suite**

Run:

```bash
node --test --test-name-pattern="Ideas gives long phone entries" tests/mobile-responsive-contract.test.ts
npm run test:content
npm run build
git diff --check
```

Expected: focused test PASS, complete suite PASS, Astro check reports no errors/warnings/hints, build succeeds, and `git diff --check` prints nothing.

- [ ] **Step 5: Commit the implementation**

```bash
git add tests/mobile-responsive-contract.test.ts src/styles/ideas-journal.css
git commit -m "fix: separate long ideas on phones"
```

### Task 2: Browser validation and production deployment

**Files:**
- Modify: `docs/superpowers/verification/2026-08-22-ideas-mobile-entry-separation.md`

**Interfaces:**
- Consumes: the production build from Task 1 and the existing Burns deployment workflow.
- Produces: phone/desktop visual evidence and a production release matching the tested Git commit.

- [ ] **Step 1: Inspect the built page in a browser**

Open `/ideas` at `390×844` and verify:

```text
- every long text block ends at a visible solid divider;
- the next number/theme/date row has a clear pause before it;
- at least three records remain readily scannable in a typical viewport;
- documentElement.scrollWidth <= window.innerWidth;
- no entry owns an internal vertical scrollbar.
```

Open `/ideas` at `1440×900` and verify:

```text
- the timeline remains three-column;
- the desktop divider remains dotted;
- search placement and singularity geometry are unchanged;
- documentElement.scrollWidth <= window.innerWidth.
```

- [ ] **Step 2: Record verification evidence**

Create `docs/superpowers/verification/2026-08-22-ideas-mobile-entry-separation.md` with the tested commit, commands/results, viewport observations, and screenshot paths.

- [ ] **Step 3: Commit verification evidence**

```bash
git add docs/superpowers/verification/2026-08-22-ideas-mobile-entry-separation.md
git commit -m "docs: verify ideas mobile separation"
```

- [ ] **Step 4: Deploy and smoke-test production**

Use the `burns-deploy-blog` workflow to deploy the exact tested commit. Confirm the service is active, internal health checks report database/media `ok`, `/ideas` returns HTTP 200, and the production release SHA equals the tested commit.
