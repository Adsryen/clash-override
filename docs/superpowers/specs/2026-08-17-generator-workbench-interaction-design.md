# Generator Workbench Interaction Design

**Goal:** Make the generator easier to scan and safer to edit while preserving
its local-only configuration and generated-script contracts.

The workbench will distinguish saved state from live preview state, keep stale
compression metadata from appearing after edits, and make content browsing and
adding separate workflows. Destructive content edits will expose a one-step
undo action. File operations will be grouped in the header, while the preview
remains available on both desktop and mobile.

The implementation is intentionally incremental: state correctness and feedback
come first, then content-editor layout, then global/mobile polish. Existing
accessible names remain stable wherever possible so current users and browser
tests keep their keyboard-friendly paths.

## Behavior Contracts

- `workspace.draft` is the only persisted draft.
- Valid temporary content-editor values affect script preview and size but are
  labeled uncommitted and are never exported or persisted until Add is clicked.
- Any effective script change clears compressed-size metadata until a new
  compression action completes.
- A content deletion stores one exact prior override snapshot; Undo restores it
  through the same persistence path as other draft changes.
- Invalid JSON stays in its editor and produces field-level feedback without
  affecting the preview.

## Layout

The header is a compact command area: grouped file operations, restore default,
preview toggle, and a state/size summary. The left navigation remains the
desktop section index and becomes the mobile selector. The center is the active
configuration section. The right preview is an inspector with generated output
and change information.

Script content uses a browse/add mode switch. Browse mode keeps search and
category controls attached to the result list. Add mode exposes one editor type
at a time with template, validation, live-preview, and commit actions.

## Verification

The acceptance gate is the existing Vitest suite plus Playwright production
preview tests. New assertions cover saved-versus-preview status, stale
compression reset, undo, browse/add switching, invalid JSON locality, and
desktop/mobile page-width constraints.
