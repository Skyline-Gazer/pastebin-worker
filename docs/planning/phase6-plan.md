# Phase 6 — Single completion actions PLAN

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW; browser trust boundary approved in the Phase 6 owner decision.

Implementation has NOT started.

## Authorization and baseline

This PLAN is an in-scope planning artifact under **Owner Delegated Continuous
Execution for roadmap Phases 5–10 (D-030)** and `docs/CHANGE_CONTEXT_AND_REVIEW.md`
§10.1.1. The browser trust boundary is now approved by
`/workspace/pastebin-worker-owner-decisions/phase6-browser-trust-2026-09-06.md`;
the revised SPEC/PHASE/TODO authorize Phase 6.0 after their §10.5 artifact-update
PR merges. This PLAN does not authorize a change outside roadmap Phase 6.
It does not authorize deployment, migration, PR #5, `upstream-sync`, or a
`goshujin` rewrite.

- Baseline inspected: `codex/phase6-planning` from `downstream/main` at
  `68ed29ee59d346cd7336422480dab300b40294cd` (Phase 5 complete through PRs
  #14, #15, and #16).
- Phase 5 supplies a local React presentation shell, typed fixture data,
  sanitized GFM rendering, Active/Archive tabs, and a visibly distinct managed
  checkbox. The checkbox is deliberately inert: it opens no chooser, changes
  no Markdown/fixture/lifecycle state, and makes no request.
- Phase 3 supplies trusted server-internal binding, credential, same-Paste
  content-update, operation-claim, and reconciliation capabilities. Its
  current public projection is Active/permanent only; its store/schema and
  `PasteClient` do not yet implement archived/timed/deleted lifecycle state,
  expiry capture, delete, or a completion operation.
- Phase 4 exposes only `POST /api/feishu/events`, which is an authenticated
  Feishu callback boundary and not a browser entry-management adapter.

## Objective

Define the Phase 6 implementation contract for one managed, unchecked,
top-level entry task: a compact explicit action chooser; permanent archive;
expiring archive; delete with destructive confirmation; mutation-backed
Archive display; and server-authoritative expiry capture. The implementation
will remain wholly in the Feishu Add-on and preserve the Pastebin password and
source-of-truth boundaries.

## Context

The Phase 5 page intentionally stops before real completion behavior. D-010
requires an unchecked normal-mode managed task to offer exactly **永久归档**,
**限期归档**, or **删除**, rather than treating a checkbox click as a retention
decision. D-011 and the lifecycle design require archive to contain only
existing archived entries. D-012 requires a timed archive deadline captured
from upstream authoritative state, never fabricated from browser time.

Phase 6 belongs to `downstream/addons/feishu`: its frontend, Worker adapter,
internal lifecycle service/store/client extensions, Add-on tests, and
Add-on-local documentation. It is not an upstream expiration-patch change:
the existing generic `e=never`/`e=max` capability remains generic and the
Add-on decides when to request it.

## Assumptions and verification

| Assumption                                                                                   | Verification method / current result                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A managed completion is entry-level, not a meaning assigned to every rendered Markdown task. | `docs/DESIGN.md` §9 selects the simplest v1 shape: one lifecycle-managed top-level task; other Markdown checkboxes remain content unless explicitly mapped.                                                                            |
| The three allowed actions and their outcomes are already locked.                             | Verify D-010, `docs/DESIGN.md` §3, `docs/API_CONTRACT.md` §5, and `docs/RETENTION_LIFECYCLE.md` §§3–5.                                                                                                                                 |
| A conceptual single-completion HTTP contract already exists.                                 | Verify `docs/API_CONTRACT.md` §5: `POST /api/entries/:id/complete`, one of the three action strings, public-safe result state, and no password/manage URL. Exact endpoint naming is semantic rather than mandatory.                    |
| Browser mutation cannot call Pastebin directly or carry a management credential.             | Verify D-007, `docs/API_CONTRACT.md` §1, and `docs/SECURITY.md` §§1–2, 6.                                                                                                                                                              |
| Existing Phase 3 operation controls must be retained rather than bypassed.                   | Inspect `worker/service.ts`, `worker/store.ts`, and `downstream/addons/feishu/docs/phase3-services.md`; existing per-entry claims, version checks, idempotent result replay, and fail-closed ambiguity handling are the required base. |
| Phase 6 requires a browser-facing trusted scope/authorization adapter.                       | Verify `docs/planning/phase3-spec.md` §§3.4 and 3.8: an adapter must authenticate/authorize before constructing `EntryContext`, and browser input must not supply trusted `scopeId`. No such adapter exists at the inspected baseline. |

## Scope and expected behavior

1. Replacing only the Phase 5 managed-control no-op, an unchecked managed
   top-level task in normal Active view opens one compact chooser before any
   Markdown, lifecycle, storage, or upstream mutation. It offers exactly
   `archive_permanent`, `archive_expiring`, and `delete`; Cancel closes it with
   no mutation or optimistic checked state.
2. Confirmed permanent archive checks the managed task source, keeps the Paste
   non-expiring, persists `archived/permanent/null`, removes the entry from
   Active, and returns/shows it in Archive as `永久保留`.
3. Confirmed expiring archive checks the managed task source, changes upstream
   retention to `e=max`, captures the authoritative upstream `expiresAt`, then
   persists `archived/timed/<expiresAt>`. The browser consumes the returned
   timestamp; it must not calculate a deadline from `MAX_EXPIRATION`.
4. Delete is not selected by a checkbox click alone. After the chooser action,
   it requires a clearly destructive final confirmation. On confirmed upstream
   DELETE success, remove the binding and remove the entry from Active and
   Archive. v1 creates no tombstone or Trash row.
5. The frontend receives only an allowlisted public entry/result shape and
   updates its local displayed state only from a successful authoritative
   Worker response. Duplicate in-flight submission is disabled. Sanitized
   errors do not expose passwords, credential ciphertext, management URLs, raw
   upstream bodies, or trusted scope identifiers.
6. Phase 6 establishes an Archive list backed by lifecycle results, not the
   Phase 5 static Archive fixtures. A full browser read/list, pagination,
   polling, countdown timer, restore, missing/expired reconciliation, Batch
   Mode, and batch behavior remain later-phase work.

## Data and API boundary decision

**Decision: Phase 6 must add a downstream Add-on HTTP completion adapter and
extend the Phase 3 service/store/client through that adapter; it must not add
browser-to-Pastebin mutation or a parallel lifecycle store.**

The semantic contract is the already documented single-completion contract:
`POST /api/entries/:id/complete` with only an action enum and an adapter-owned
request/idempotency identity. The Worker resolves the binding/credential
server-side, performs the deterministic managed-task source transition and
the requested upstream lifecycle mutation, captures authoritative metadata,
then records/returns public-safe final state. The adapter must consume the
existing Phase 3 mutation claim/idempotency/reconciliation model rather than
making unclaimed writes or treating an uncertain upstream result as success.

This PLAN deliberately does **not** invent a browser authentication/session
mechanism or permit the request to supply `scopeId`. The authoritative route
and payload semantics are locked by `docs/API_CONTRACT.md`; the missing
authentication and trusted scope-resolution design is an open security
contract that must be resolved in the Phase 6 SPEC from an existing approved
Add-on boundary. If no such approved boundary exists, continuous execution
MUST STOP before implementation under §10.1.1 rather than expose a
cross-scope completion endpoint. This is a security implementation dependency,
not permission to alter the documented product actions.

## Non-goals

- No Phase 7 live countdown loop, restore, expiry cancellation, or stale/missing
  reconciliation UI.
- No Phase 8 Batch Mode selectors, interaction lock, selection state, or action
  bar, and no Phase 9 batch endpoint/partial-success behavior.
- No new browser content list/read contract beyond the minimum result needed to
  apply a single successful completion; no pagination, polling, or cache policy.
- No arbitrary/nested Markdown-task-to-entry mapping; no second authoritative
  Paste-body database; no browser secret, management URL, or trusted scope.
- No upstream-owned source/dependency/workflow/root-lockfile edits, patch-series
  work, migration/deployment, release hardening, PR #5, or `upstream-sync` work.

## Risks, unknowns, and STOP conditions

- **Security/trust boundary:** the repository has no implemented browser
  authentication or server-side browser-to-scope resolver. Phase 3 explicitly
  forbids accepting a browser-provided `scopeId`. The Phase 6 SPEC must identify
  an already approved trusted resolver and its authorization rule, or STOP for
  owner direction; an unauthenticated/global/default scope is forbidden.
- **Lifecycle persistence:** the inspected D1 schema/service represents only
  active/permanent/null state. The SPEC must define the smallest additive,
  backward-compatible lifecycle fields and operation-result/state transitions
  required by the locked contract, including delete-after-upstream-success and
  uncertain-result reconciliation. A destructive schema reset is forbidden.
- **Authoritative expiry:** `PasteClient` currently validates permanent
  metadata only. The SPEC must define the validated upstream metadata response
  used to capture the exact non-null ISO timestamp for `e=max`; no duration
  arithmetic or guessed timestamp is allowed.
- **Source mutation:** the implementation must make a deterministic managed
  top-level task transition while preserving arbitrary content and leaving
  other GFM checkboxes as content. If the locked one-managed-top-level-task
  model cannot identify the source location safely for existing bindings,
  STOP rather than choose an arbitrary checkbox.
- **No current STOP:** these are implementation/SPEC resolution items bounded
  by the locked API/lifecycle documents. No product-action ambiguity, new
  product scope, deployment, destructive migration, PR #5, upstream-sync,
  goshujin, bot override, or external adoption is proposed by this PLAN.

## Proposed implementation approach

1. In the SPEC, pin the trusted browser authorization/scope-resolution
   precondition and request identity/error mapping before any route is written.
   If it cannot be grounded in an approved boundary, stop and request the owner
   decision described above.
2. Specify and test first a generic Add-on lifecycle extension around the
   existing Phase 3 claim protocol: public lifecycle projection, operation
   fingerprint/action/version behavior, additive binding state, authoritative
   expiry metadata capture, and delete cleanup only after confirmed upstream
   success. Keep full Paste content upstream; read it transiently only to make
   the managed source transformation and never persist it in D1.
3. Add the narrow authenticated completion adapter matching the API contract.
   It allowlists `id`, action, and idempotency input; resolves the trusted
   context on the server; invokes the lifecycle service; and emits only
   sanitized public state/result codes.
4. Replace the frontend no-op with an accessible compact chooser and separate
   destructive confirmation state. Do not precheck, optimistically archive, or
   send a mutation on Cancel; disable duplicate confirmation while pending.
5. Apply only returned authoritative state to the active/archive view model.
   Permanent entries render their permanent label; timed entries retain the
   returned exact `expiresAt` for Phase 7 countdown rendering.
6. Use TDD across Worker/store/client/adapter and frontend boundaries, then run
   Add-on regression/type/build/security checks. Record RED/GREEN/REFACTOR/
   REGRESSION evidence in the active Phase 6 TODO.

## Candidate files and components

All paths are candidates, not authorization to start implementation:

- `downstream/addons/feishu/frontend/` — fixture replacement/adapter client,
  entry view state, `ManagedTaskCheckbox`, completion chooser, delete
  confirmation, and mutation-backed Archive list.
- `downstream/addons/feishu/worker/index.ts` and a candidate
  `worker/entries-handler.ts` — narrow Add-on HTTP adapter only after trusted
  authorization/scope resolution is specified.
- `downstream/addons/feishu/worker/service.ts`, `store.ts`, `paste-client.ts`,
  and `shared/entries.ts` — lifecycle operation, public-safe state, metadata
  capture, and claim/idempotency extensions.
- `downstream/addons/feishu/migrations/` — only an additive migration if the
  approved lifecycle state cannot be represented otherwise.
- `downstream/addons/feishu/tests/` and `frontend/*.spec.tsx` — test-first
  Worker/store/client/adapter, secret-boundary, and UI-flow coverage.
- `downstream/addons/feishu/docs/` and `README.md` — endpoint/run/behavior
  documentation when the implementation adds durable operational detail.

## Validation strategy

The Phase 6 SPEC/TODO must map each behavior to test-first evidence. Required
categories include:

- frontend tests for chooser opening only from the managed unchecked control,
  exact three action labels, Cancel no-op, pending-submit protection, destructive
  delete confirmation, and state movement only after success;
- service/store/client tests for permanent/timed/delete transitions, task source
  update, `e=never`/`e=max`, exact upstream `expiresAt` capture, operation
  duplicate/version/claim behavior, uncertain upstream results, and delete
  binding removal ordering;
- adapter tests for method/body/action/idempotency validation, server-derived
  context, cross-scope denial before upstream activity, public-safe responses,
  and secret/error/log redaction;
- Archive rendering tests for successful permanent/timed completion results and
  exact returned `expiresAt`, never browser-manufactured deadlines;
- TypeScript, lint/format, frontend production build, Worker regression suite,
  and diff review proving no upstream/root workflow/lockfile/patch-series drift;
- a current-HEAD CI run and completed AI Review Bot phase review before merge.

## Internal consistency review

Reviewed against Phase 5’s merged fixture/inert-control baseline, D-007 through
D-012, D-016, D-017, D-030, `IMPLEMENTATION_ORDER.md` Phase 6,
`DESIGN.md` §§3–4 and §9, `FRONTEND.md` §§5 and 11–12,
`API_CONTRACT.md` §§1–6, `RETENTION_LIFECYCLE.md`, and `SECURITY.md`.

- The PLAN advances only Phase 6’s real single-item actions; it does not relabel
  Phase 5 fixtures as live state or silently make the previous inert checkbox
  mutate.
- It preserves exactly the locked action set, delete confirmation, no-tombstone
  rule, server-only password model, upstream Paste-body authority, and
  authoritative expiry requirement.
- It chooses the smallest coherent ownership/API path already contemplated by
  the API contract: Browser → Add-on Worker → Pastebin, using Phase 3 rather
  than direct browser mutation or a parallel store.
- It explicitly retains the unresolved authentication/scope-resolution
  precondition rather than inventing a public trust boundary. The Phase 6 SPEC
  must STOP for owner direction if that precondition cannot be met from an
  approved existing boundary; implementation must not proceed on a guessed
  auth model.
- No other D-030 STOP condition is triggered by this documentation-only PLAN.

## References

- `DECISIONS.md` — D-007 through D-017 and D-030.
- `docs/IMPLEMENTATION_ORDER.md` — Phase 6.
- `docs/DESIGN.md`, `docs/FRONTEND.md`, `docs/API_CONTRACT.md`,
  `docs/RETENTION_LIFECYCLE.md`, and `docs/SECURITY.md`.
- `docs/planning/phase5-plan.md`, `phase5-spec.md`, `phase5-phases.md`, and
  `phase5-todo.md`.
- `docs/planning/phase3-spec.md`,
  `downstream/addons/feishu/docs/phase3-services.md`, and
  `docs/CHANGE_CONTEXT_AND_REVIEW.md` §§10.1.1, 10.2, and 10.7.

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW

Implementation has NOT started.
