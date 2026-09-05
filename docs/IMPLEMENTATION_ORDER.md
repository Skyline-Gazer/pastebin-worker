# Recommended Implementation Order

## Pre-implementation artifacts (required before any phase starts)

Every phase starts from approved planning artifacts; implementation MUST NOT begin before they are approved:

```text
PLAN
→ owner approval
→ SPEC
→ owner approval
→ PHASE decomposition
→ TODO
→ owner approval
→ implementation
```

Normal mode above remains the default. The owner may explicitly authorize the bounded Owner Delegated Continuous Execution exception for existing Phases 5–10 only: PLAN → internal consistency review → SPEC → internal consistency review → PHASE/TODO → implementation → CI/review/merge → next roadmap Phase, without routine owner pauses inside the delegated roadmap. This does not make the project queue empty when one Phase merges: Phases 5–10 remain queued until each is complete. The exception never authorizes work beyond those phases, silent observable/API/security SPEC drift, or the stop conditions in `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1.

- PLAN/SPEC/PHASE/TODO chapter requirements and the mandatory interaction sequence: `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.
- TDD evidence requirements (including test-first exceptions): `docs/TESTING.md` §1.
- Each approved artifact MUST be persisted to a durable, reviewable location before the next workflow stage advances: `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.7.
- Planning-artifact exemption is limited to genuinely trivial changes and the recorded governance bootstrap exception; TDD/test-first exceptions do not exempt planning artifacts.
- Planning artifacts MUST have durable, reviewable references, never only transient conversation context: `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.7.

## Phase completion gate (applies to every implementation phase)

A phase is NOT complete until ALL of the following hold:

- implementation/phase-scoped PRs are complete and merged;
- required tests pass (unit/integration/replay as applicable);
- each PR was opened with full review context (see `docs/CHANGE_CONTEXT_AND_REVIEW.md`);
- the AI Review Bot reviewed the latest HEAD of each PR;
- actionable findings were fixed or explicitly dispositioned, with no blocking finding self-dispositioned by an agent;
- ANY commit changing a PR HEAD SHA after the last bot review was re-reviewed against the new HEAD (mechanical latest-HEAD rule, `docs/CHANGE_CONTEXT_AND_REVIEW.md` §9.2);
- required CI/checks are green for the current HEAD;
- the merge completed and the target branch was refreshed (`downstream/main`);
- only then may the dependent next phase start.

For large phases: a phase MAY contain multiple coherent PRs; every constituent PR passes the gate independently; the phase acceptance criteria must pass before the phase is marked complete.

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

Two-stage review/promotion (see `docs/PATCH_AND_UPSTREAM.md` §14 and `docs/CHANGE_CONTEXT_AND_REVIEW.md` §9.13-9.14):

Stage A — source patch review: open a REVIEW-ONLY PR (`REVIEW ONLY — DO NOT MERGE INTO upstream-sync`) against the exact pinned upstream SHA; AI Review Bot + CI review loop; never merge the source PR into `upstream-sync`.

After source review passes:

- export with `git format-patch`;
- commit exported files under `downstream/patches/010-non-expiring-paste/` with provenance README;
- add them to `downstream/patches/series`;
- replay the complete series from the pinned upstream SHA.

Stage B — promotion review: open a promotion PR into `downstream/main` with the patch artifact, provenance, series position, and full replay result; AI Review Bot + CI review loop; merge the promotion PR. The phase is complete only after the promotion PR merges.

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
