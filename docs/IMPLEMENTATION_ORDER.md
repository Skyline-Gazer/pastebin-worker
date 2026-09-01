# Recommended Implementation Order

## Phase 1 — Repository and release skeleton

- establish `upstream-sync` and `downstream/main` roles;
- add `downstream/release.example.json`;
- add ordered `downstream/patches/series`;
- add patch export/replay/build scripts;
- add CI guardrails and review templates.

## Phase 2 — Generic non-expiring patch

Develop on dedicated `patch/non-expiring-paste` from an exact upstream SHA.

TDD:

- `never`;
- `max`;
- KV/R2 semantics;
- metadata;
- cleanup;
- timed <-> permanent transitions;
- backward compatibility.

No Feishu code in patch.

After review:

- export with `git format-patch`;
- commit exported files under `downstream/patches/010-non-expiring-paste/`;
- add them to `downstream/patches/series`;
- replay the complete series from the pinned upstream SHA.

## Phase 3 — Feishu Paste client + binding store

On a Feishu feature branch from `downstream/main`:

- server-side password generation;
- create with `e=never`;
- binding persistence;
- repeated PUT on same Paste;
- safe logging;
- metadata reconciliation.

## Phase 4 — Webhook foundation

- verification/security;
- event normalization;
- idempotency;
- stable record key;
- binding integration.

## Phase 5 — Frontend baseline

- React/Vite/TS/Tailwind;
- upstream Pastebin Worker visual alignment;
- Active/Archive tabs;
- GFM rendering + sanitization;
- managed task checkbox;
- no Feishu-client/profile/dashboard chrome.

## Phase 6 — Single completion actions

- compact action chooser;
- permanent archive;
- expiring archive;
- delete + destructive confirmation;
- Archive list;
- authoritative expiry capture.

## Phase 7 — Countdown + restore

- live/coarse countdown;
- restore archived permanent;
- restore timed and cancel expiry;
- missing/expired reconciliation.

## Phase 8 — Batch Mode frontend

- separate BatchSelector;
- selection state;
- select all/clear;
- sticky/minimal action bar;
- suppress ambiguous normal checkbox interaction;
- one confirmation for expiring/delete batch actions.

## Phase 9 — Batch backend

- `/api/batch` equivalent;
- server-side credential resolution;
- per-item upstream operation;
- partial-success response;
- retry/idempotency handling;
- frontend partial-failure UX.

## Phase 10 — Release hardening

- E2E/integration tests;
- secret leakage tests;
- webhook retry tests;
- exact upstream pin;
- full ordered patch replay CI;
- generated release provenance;
- downstream release tag;
- deployment rollback from prior release tag;
- full documentation review.
