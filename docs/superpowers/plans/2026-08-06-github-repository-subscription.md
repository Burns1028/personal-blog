# GitHub Project Registration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Register a user-supplied GitHub repository in the SQLite Projects catalog without creating a timeline activity.

**Architecture:** A signed project-only API validates or upserts `ProjectInput`. The existing public API and Projects page read the same SQLite project store. The GitHub Skill has a repository-only runner that performs one explicit metadata lookup, while the existing progress runner remains the only GitHub timeline writer.

**Tech Stack:** TypeScript, Astro API routes, Node.js, SQLite, signed HMAC publishing client.

---

## Task 1: Project-only publishing boundary

**Files:** `src/lib/server/project-publisher.ts`, `src/pages/api/publish/projects/index.ts`, `src/pages/api/publish/projects/validate.ts`, `tests/private-project-api.test.ts`

- [x] Write failing tests for read-only validation, signed idempotent publication, public SQLite display, and zero activity writes.
- [x] Implement a transaction-backed project publisher.
- [x] Add signed validate and publish routes.
- [x] Confirm focused tests pass.

## Task 2: Explicit repository registration flow

**Files:** `skills/burns-update-github-progress/SKILL.md`, `skills/burns-update-github-progress/scripts/register-project.mjs`, `tests/skill-contract.test.ts`, `package.json`

- [x] Add a failing contract requiring a project-only runner.
- [x] Add the runner, which accepts a repository address and performs one metadata lookup.
- [x] Document the decision boundary between repository registration and curated progress publication.
- [x] Add `npm run github:project`.

## Task 3: Verification

- [x] Run focused API, store, public source, and Skill tests.
- [x] Run `npm run check` and the full content test suite.
- [x] Confirm no timer, automatic scanner, or project-only activity write exists in the diff.
- [x] Commit only this feature and integrate it without touching unrelated visual changes.
