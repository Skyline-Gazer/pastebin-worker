# Phase 4 — Feishu webhook foundation PHASE decomposition

Status: OWNER APPROVED / EXECUTION AUTHORIZED (2026-09-05)

Parent: [owner-approved SPEC](phase4-spec.md). Active implementation checklist: [phase4-todo.md](phase4-todo.md).

This document is the durable PHASE decomposition required by `docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.4 after SPEC approval. **Owner approved this PHASE decomposition and the active TODO on 2026-09-05 — EXECUTION AUTHORIZED.** Implementation may proceed on `codex/phase4-webhook-foundation` from refreshed `downstream/main`.

## Baseline and ownership

- Canonical `downstream/main` baseline: `09148c96cad01af4a5938e5d74f3b3a33823e348` (Phase 3 PR #9 merged).
- Ownership: entirely `downstream/addons/feishu` plus downstream-only docs/CI paths.
- Consumes Phase 3 `EntryService.createEntry` only; no Phase 3 interface extension and no new D1 receipt table.
- Patch source PR #5 remains OPEN / UNMERGED / REVIEW ONLY and must never merge into `upstream-sync`.
- Phase 3 exact-HEAD owner override does **not** carry forward.

## Decomposition decision

IMPLEMENTATION_ORDER Phase 4 is delivered as **one coherent reviewable milestone** (preferred), matching the approved SPEC acceptance set (criteria 1-10) and the Phase 3 single-delivery pattern.

Optional large-phase split (only if owner or review size later requires it, remaining fully inside this SPEC):

1. **Phase 4.1 — Ingress:** protocol verify/decrypt/authorize/normalize + `POST /api/feishu/events` + Queue publish (no Phase 3 call).
2. **Phase 4.2 — Consumer:** Queue consumer + `createEntry` integration + result classification/DLQ disposition.

If split: 4.2 MUST start from refreshed merged `downstream/main` after 4.1 merges; do not stack on an unmerged 4.1 branch. Default path below assumes the single-milestone delivery.

## Phase 4 — Webhook foundation (single delivery milestone)

- **Goal:** Accept encrypted Feishu schema 2.0 `im.message.receive_v1` human P2P text callbacks, durably enqueue a stable create command, consume it through Phase 3 `createEntry` with fail-closed reconciliation, and never create duplicate Pastes or expose management secrets.
- **Scope:**
  - Public `POST /api/feishu/events` (challenge + ordinary encrypted events).
  - Raw-body signature verification, AES-256-CBC decryption, token/app/tenant/actor/chat/message allowlists.
  - Deterministic `scopeId` / `recordKey` / `requestId` derivation and text snapshot normalization.
  - Cloudflare Queue producer (`FEISHU_INGRESS_QUEUE`) awaited before HTTP 200; mandatory DLQ configuration.
  - Queue consumer invoking Phase 3 `createEntry({scopeId}, {recordKey, requestId, content})` with the SPEC §3.6 classification matrix.
  - Tests, Add-on docs/config notes, and downstream-only CI updates as needed.
- **Non-goals (unchanged from SPEC):** group/bot/non-text events; edit sync; public management API; frontend; archive/restore/delete/batch/countdown; production deploy/migration; Patch 010 / series / `upstream-sync` / PR #5 changes; new D1 receipt table; Phase 3 API changes.
- **Dependencies:** Merged Phase 3 at `09148c96cad01af4a5938e5d74f3b3a33823e348`. No unmerged Phase 4 branch dependency.
- **Inputs:**
  - Approved PLAN: `docs/planning/phase4-plan.md`
  - Approved SPEC: `docs/planning/phase4-spec.md`
  - Phase 3 internal services under `downstream/addons/feishu/worker/`
  - Official Feishu callback/signature/decrypt and `im.message.receive_v1` contracts cited by the PLAN/SPEC
- **Deliverables:**
  - Worker fetch adapter for `/api/feishu/events`
  - Protocol verification, decryption, authorization, normalization modules
  - Shared internal Queue payload type `FeishuMessageCreateV1`
  - Queue producer + consumer wiring with mandatory DLQ config validation
  - Behavior-first unit/handler/consumer/integration tests per SPEC §3.12
  - Add-on configuration/recovery/operator-DLQ documentation (no claim that console logs are a durable disposition sink)
  - Downstream-only CI coverage for the new surfaces without modifying upstream-owned workflows/config
- **Acceptance criteria:** SPEC §3.11 criteria 1-10 (verbatim contract).
- **Tests required:** SPEC §3.12 protocol, normalization/authorization, fetch-handler, queue-consumer, Phase 3 integration, and regression suites; Node 22 and pnpm 10 for formatting, lint, TypeScript, Vitest, and build checks; authoritative GitHub Actions on the reviewed HEAD.
- **Expected branch type:** `feat/*` Feishu feature branch from refreshed `downstream/main` (candidate name: `codex/phase4-webhook-foundation` or `feat/feishu-webhook-foundation`). Planning artifacts remain on `codex/phase4-planning` until merged or superseded.
- **Expected PR target:** `downstream/main`. Implementation PR opens only after owner approval of this PHASE decomposition and the active TODO.
- **Risks:**
  - ACK before durable Queue acceptance loses accepted work.
  - Non-deterministic identities or content mutation create duplicate Pastes under retry.
  - Queue retry of post-dispatch ambiguity invents a second mutation.
  - Signature success mistaken for tenant/chat/actor authorization.
  - Content/secret leakage via logs, Queue payload, responses, or D1.
  - Claiming durable operator disposition from transient console logs alone.
  - Runtime/schema evidence contradicting SPEC crypto, limits, or field allowlists leads to STOP for SPEC change control.
- **Exit criteria:**
  - All SPEC §3.11 criteria demonstrated on the current implementation HEAD.
  - Authoritative GitHub CI green for that HEAD.
  - Independent current-HEAD AI Review Bot Phase Review Gate passed; actionable findings fixed or owner-dispositioned (Phase 3 override not reused).
  - Implementation/phase-scoped PR(s) merged; `downstream/main` refreshed.
  - No production deployment or production D1 migration performed by this phase unless separately authorized.
  - PR #5 still unmerged; Patch 010 / series / upstream-owned paths untouched.

## Active TODO pointer

Ordered verifiable work items live in [`phase4-todo.md`](phase4-todo.md) and remain **awaiting owner approval** before execution.

Status: PHASE DECOMPOSITION READY FOR OWNER REVIEW

Implementation has NOT started.
