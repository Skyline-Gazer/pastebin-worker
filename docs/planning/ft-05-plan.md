# FT-05 PLAN — Idempotency / duplicate delivery protection

Status: **PLAN DRAFT — OWNER APPROVAL REQUIRED BEFORE SPEC/EXECUTION**.

Tracking: [#157](https://github.com/Skyline-Gazer/pastebin-worker/issues/157). Parent Function Test sequence: owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12). FT-04 tracker [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149) **CLOSED** (`FT04_PASS=YES`).

This PLAN does **not** authorize FT-05 execution, webhook/queue replay, D1 mutation, Paste mutation, deploy, P2P, or FT-06+.

## Canonical source

Authoritative definition (verbatim intent recovered from the 2026-09-12 production Function Test instruction; not invented in this turn):

```text
# FT-05 — Idempotency / duplicate delivery protection

Do NOT resend the user message manually.

Use only existing production evidence / safe delivery semantics to establish that the original Feishu event identity is stored and cannot create a duplicate Paste.

If validating this requires deliberately replaying a webhook or queue event, DO NOT perform it in production.

Then classify:

FT-05: PASS_BY_PRODUCTION_STATE_AND_IDEMPOTENCY_CONTRACT

or

FT-05: NOT_LIVE_REPLAYED_BY_DESIGN

Do not generate duplicate production events merely to prove idempotency.
```

Supporting durable references (sequencing / fixture preservation only; they do **not** redefine FT-05 as archive/lifecycle):

| Source | Relevance |
| ------ | --------- |
| Owner instruction `START PRODUCTION FUNCTION TEST` (2026-09-12) | Canonical FT-01…FT-15 list; FT-05 text above |
| [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149) | FT-04 complete; out-of-scope note “FT-05 through FT-15”; Paste retained for later lifecycle |
| [ft-04-plan.md](ft-04-plan.md) / [ft-04-spec.md](ft-04-spec.md) | FT-04 entry is input for later **lifecycle** tests (FT-06+); do not auto-start FT-05; do not archive/restore/delete in FT-04 |
| Closed [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132) | Remediation umbrella before lifecycle testing; does not redefine FT-05 |

No prior `docs/planning/ft-05-*.md` existed on `downstream/main` at `ae491a185d428a0f506505f6c7c428ebba04b6f3`.

## Purpose

Validate that **duplicate delivery of the same Feishu create event identity cannot create a second Paste**, using **read-only / contract evidence** from production — **not** by resending P2P or replaying webhook/queue traffic in production.

## Prerequisites

```text
FT-01 PASS
FT-02 PASS
FT-03_DATA_PATH PASS
FT-04 PASS
```

Live Workers at FT-04 completion (record; reconfirm at ARM/SPEC time):

```text
pastebin-feishu-prod  4c18eccc-0d80-472f-8d33-349047442fde @ 100%
pastebin-prod         1d84dbbd-fa52-4b5a-a158-d1dab939d32b @ 100%
```

Retained FT-04 Paste (immutable for this step; do not delete/mutate):

```text
7Zf3ZDjmyj2dQMWpSwfc7CK8
https://pb.223.im/7Zf3ZDjmyj2dQMWpSwfc7CK8
```

## Owner action

**None that creates a new business event.**

- Do **not** resend the FT-04 Feishu message.
- Do **not** send a second P2P for FT-05.
- Do **not** authorize synthetic webhook or queue replay in production for this step.

## Expected system path under test

Read-only inspection of idempotency contracts already exercised by FT-04 create:

```text
Feishu event identity (message / request identity as stored by ingress)
→ existing D1 create operation uniqueness / fingerprint / one-mutation constraints
→ exactly one succeeded create for that identity
→ exactly one Paste for that create
→ no second Paste attributable to the same delivery identity
```

Exact durable keys/tables/fields to cite in SPEC after owner PLAN approval (must match live schema; do not invent new product rules here).

## Expected mutations

```text
PRODUCTION_MUTATION=NO   (for FT-05 itself)
```

FT-05 is observation/contract classification only under the canonical instruction.

## PASS criteria (canonical tokens)

Exactly one of:

```text
FT-05: PASS_BY_PRODUCTION_STATE_AND_IDEMPOTENCY_CONTRACT
```

when existing production evidence safely proves the event identity is stored and cannot create a duplicate Paste **without** live replay;

or

```text
FT-05: NOT_LIVE_REPLAYED_BY_DESIGN
```

when proving duplicate suppression would require deliberate webhook/queue replay in production (forbidden).

Both are terminal classifications for this step. Neither authorizes generating duplicate production events “merely to prove idempotency.”

## Failure / STOP conditions (planning-level)

- Any attempt to resend the user message or inject/replay webhook/queue events in production → **STOP** (out of FT-05 authorization).
- Discovery that FT-04 create uniqueness evidence is ambiguous or that a duplicate Paste already exists for the same event identity → **STOP**; report; do not “fix” in the same Function Test run.
- Do not start FT-06+ from this PLAN.

Detailed FAIL tokens belong in a later SPEC after owner PLAN approval.

## Cleanup policy

- Do **not** delete or mutate Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8`.
- Do **not** delete historical evidence Pastes.
- No FT-05-specific cleanup; disposable deletes remain deferred to later lifecycle/delete tests (FT-11+ per FT-04 PLAN).

## Feishu / Lark scope

- **Feishu** create-path idempotency only (same surface as FT-04).
- **Not** Lark P2P. Not Slack/WeCom/DingTalk.

## Dependency on Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8`

```text
DEPENDENCY_ON_FT04_PASTE_FOR_FT05_MUTATION=NO
```

FT-05 does **not** archive/restore/delete that Paste. It may **read** D1/operation/public evidence associated with the FT-04 create (including that Paste name) as part of proving uniqueness. Lifecycle mutation of that Paste begins at **FT-06** per the same Function Test instruction.

## Explicit non-goals

- Not permanent/timed archive, restore, batch, markdown rendering, or delete (FT-06+).
- Not a license to replay production webhooks/queues.
- Not #153 bare checkbox shorthand.
- Not #146 deferred architecture cleanup.

## Next workflow stage

Owner approval of this PLAN → SPEC (`docs/planning/ft-05-spec.md`) → owner SPEC approval → execution authorization.

```text
FT05_STARTED=NO
PRODUCTION_MUTATION=NO
P2P_SENT=NO
```
