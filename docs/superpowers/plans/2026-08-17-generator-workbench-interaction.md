# Generator Workbench Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Improve generator feedback and editing ergonomics without changing configuration or generated-script formats.

**Architecture:** Keep `App.tsx` as the workbench state owner, derive preview metadata from the effective preview draft, and use small local components for grouped file actions, content modes, and undo feedback. Use existing CSS and accessible native controls; do not add a UI dependency.

**Tech Stack:** React 19, TypeScript, Vite, Vitest/Testing Library, Playwright.

## Global Constraints

- Preserve `GeneratorConfig`, `contentOverrides`, script marker, and localStorage version/shape.
- Keep temporary editor input local and persist only through existing Add/updateDraft paths.
- Keep all controls keyboard-accessible with role/name-based tests.
- Run `npm run test`, `npm run typecheck`, both production builds, `npm run test:e2e`, and root script checks before commit.

### Task 1: State correctness and feedback

**Files:**
- Modify: `generator/src/App.tsx`
- Test: `generator/src/App.test.tsx`
- Test: `generator/e2e/generator.spec.ts`

**Interfaces:**
- Add `hasPendingPreviewEdits` and `previewStatus` derived from current editor values.
- Add one in-memory `undoAction` snapshot containing `GeneratorConfig['contentOverrides']` and a label.

- [x] Add failing tests that assert temporary input shows preview-only status, script changes clear `minifiedStats`, and deleting then undoing restores the entry.
- [x] Implement derived status and clear compression metadata whenever the effective `script` changes.
- [x] Implement deletion snapshots and an accessible Undo status action that calls `updateDraft` with the snapshot.
- [x] Clear temporary editor fields on import/reset/preset-load and successful draft replacement.
- [x] Run `npm run test -- --run src/App.test.tsx` and the focused Playwright tests.

### Task 2: Script-content browse/add workflow

**Files:**
- Modify: `generator/src/App.tsx`
- Modify: `generator/src/styles.css`
- Test: `generator/src/App.test.tsx`
- Test: `generator/e2e/generator.spec.ts`

**Interfaces:**
- Add `contentMode: 'browse' | 'add'` local state.
- Keep existing `onAddRule`, `onAddProvider`, `onAddProxyGroup`, and template handlers unchanged at their persistence boundary.

- [x] Add tests for switching browse/add modes, clearing search, category result counts, and keeping valid add previews live before commit.
- [x] Implement the mode switch and sticky browse toolbar with native buttons/inputs and stable accessible labels.
- [x] Move adders into the add mode and show one type at a time using a segmented control; keep provider/group JSON validation adjacent to its field.
- [x] Add an explicit empty result state with current query/category context and a clear-search action.
- [x] Run full Vitest and the content-focused Playwright flows.

### Task 3: Header, preview, and responsive polish

**Files:**
- Modify: `generator/src/App.tsx`
- Modify: `generator/src/styles.css`
- Test: `generator/src/App.test.tsx`
- Test: `generator/e2e/generator.spec.ts`

**Interfaces:**
- Group file actions behind an accessible menu while retaining existing hidden file inputs and handlers.
- Add preview view state only in local UI state; generated script output remains unchanged.

- [x] Add desktop and mobile tests for the file menu, preview toggle, status text, and zero horizontal overflow.
- [x] Implement grouped file actions, clear saved/preview status, and compact script-size summary.
- [x] Improve preview header/action layout and mobile full-width behavior without changing script text.
- [x] Add section state summaries only where they can be derived from existing draft data.
- [x] Run the complete quality gate and inspect fresh desktop/mobile screenshots in a headed Chromium session.

### Task 4: Final verification and commit

**Files:**
- Verify: `generator/src/App.tsx`, `generator/src/styles.css`, `generator/src/App.test.tsx`, `generator/e2e/generator.spec.ts`

- [x] Run all required unit, type, build, browser, and root checks.
- [x] Run `git diff --check` and confirm no generated screenshots/dist files are included.
- [ ] Commit only task files with an Adsryen author/committer identity.
