# FT-13 PLAN — Batch permanent archive

Status: **PROPOSED_FOR_OWNER_REVIEW**. Tracking issue:
[#186](https://github.com/Skyline-Gazer/pastebin-worker/issues/186), Project #3
item [FT-13: Batch permanent archive (planning)](https://github.com/orgs/Skyline-Gazer/projects/3).
Planning baseline: `downstream/main` at
`496d6c93e97646cf4feac8e030204260558296af` (FT-12 merge).

This PLAN requests review of one narrowly scoped production Function Test. It
does not approve a SPEC, create a fixture, authorize a production mutation, or
start FT-13.

## Context and objective

FT-12 passed the two-entry Batch Mode `delete` all-success path with one
`POST /api/batch`, two successful results, and no failed results. The Batch
Mode contract also supports `archive_permanent` and `archive_expiring`, but the
completed production evidence reviewed here does not show either batch action
being exercised. The proposed objective is to verify one eligible entry can be
permanently archived through Batch Mode.

This is a production verification gap, not a known product-functionality gap:
current automated batch/service tests exercise the supported actions and mixed
results. A one-entry permanent archive is the smallest action-specific Batch
Mode check. It avoids another fixture beyond one, timed-expiry/countdown and
cancellation dependencies, and extra fixture cleanup. It does not repeat
FT-06's single-entry permanent archive or FT-12's batch delete.

## Completed FT-01 through FT-12 coverage

This matrix summarizes the durable repository evidence available at this
planning baseline. “PASS” describes the accepted functional result; it does
not imply every internal ordering or edge case was verified.

| Test  | Completed coverage                                                                                 | Result and evidence limit                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| FT-01 | Exact objective and steps are not recoverable from the current durable FT records.                 | PASS is recorded in `docs/planning/ft-auth-origin-fix.md`; no narrower objective is inferred here.                                                    |
| FT-02 | Browser OAuth callback/session on canonical Add-on origin.                                         | Initially found an origin defect; after correction, accepted as PASS in the later FT-04/05 prerequisites. This does not erase the historical failure. |
| FT-03 | Add-on data-path checkpoint.                                                                       | `FT-03_DATA_PATH=PASS` is recorded in `docs/planning/ft-defect-remediation.md`; the exact original test steps are not fully restated there.           |
| FT-04 | Real Feishu P2P create through ingress, queue, Add-on, Paste, and public read.                     | PASS; the created Paste remains historical evidence and was not a lifecycle target.                                                                   |
| FT-05 | Create idempotency/duplicate-delivery contract using production state and implementation evidence. | Accepted as `PASS_BY_PRODUCTION_STATE_AND_IDEMPOTENCY_CONTRACT`; no live duplicate event replay by design.                                            |
| FT-06 | Single-entry permanent archive.                                                                    | PASS; established the purpose-built lifecycle fixture used by later lifecycle tests.                                                                  |
| FT-07 | Restore permanent archive.                                                                         | Functional PASS. Historical operation-order proof remains `INCONCLUSIVE`; later telemetry is explicitly non-retroactive.                              |
| FT-08 | Single-entry timed archive and authoritative expiry countdown.                                     | PASS; expiration metadata and Archive presentation were checked.                                                                                      |
| FT-09 | Restore timed archive and cancel expiry.                                                           | PASS; a prior blocked precondition attempt is retained separately and is not the PASS run.                                                            |
| FT-10 | Archive Markdown/GFM rendering.                                                                    | PASS; rendering observation only, with no lifecycle mutation in that test.                                                                            |
| FT-11 | Single-entry delete.                                                                               | PASS; one exact disposable fixture was deleted and reconciled.                                                                                        |
| FT-12 | Batch Mode all-success delete.                                                                     | PASS; two entries, one batch request, two succeeded, zero failed. The original Fixture A was terminally not created, never retried, and not included. |

## Remaining candidates

| Candidate                        | Production evidence gap                              | Existing coverage / reason to defer                                                                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batch `archive_permanent`        | Not exercised by FT-12; proposed FT-13.              | Single-entry permanent archive passed in FT-06; automated Batch Mode coverage exists. A one-entry batch checks the distinct selection/request path with one fixture.                                                   |
| Batch `archive_expiring`         | Not exercised by FT-12.                              | Single-entry timed archive and restore passed in FT-08/09 and automated batch coverage exists. It adds authoritative expiry/countdown and later cancellation concerns, so it is not the smallest next check.           |
| Deliberate batch partial failure | FT-12 deliberately covered only all-success.         | Mixed results are covered in automated tests. A safe, representative production failure fixture and bounded impact have not been specified; do not manufacture a failure or use a guessed/cross-scope ID in this PLAN. |
| Batch replay/idempotency         | No production replay was needed in FT-12.            | Automated coverage exists. A production replay adds little to the next functional action and is not authorized here.                                                                                                   |
| FT-07 restore ordering           | Historical step-order evidence remains inconclusive. | `docs/planning/restore-ordering-telemetry-plan.md` and its SPEC track this separate observability/evidence issue; current telemetry does not retroactively close it. It is not a reason to redefine FT-13.             |

No documentation reviewed defines FT-13 in advance. FT-12 SPEC explicitly left
the other batch actions and deliberate partial failure outside its execution.
This PLAN records a proposed next scope based on that evidence; it does not
claim that the repository had already canonically assigned FT-13.

## Proposed scope

### Objective

Through the authenticated production Add-on, use Batch Mode to apply
`archive_permanent` to exactly one newly created, explicitly disposable,
purpose-built eligible entry. Verify the one-item result and permanent Archive
state. Do not repeat single-entry archive behavior or use a serial single-item
API call as a substitute for Batch Mode.

### Specification references

- [FT-12 SPEC](ft-12-spec.md): batch request/result contract, allowed actions,
  confirmation behavior, idempotency, and stop rules.
- [FT-12 production evidence](evidence/ft-12-batch-delete-pass.md): completed
  two-entry all-success batch delete and original Fixture A settlement.
- [FT-06 SPEC](ft-06-spec.md) and Issue
  [#160](https://github.com/Skyline-Gazer/pastebin-worker/issues/160): prior
  single-entry permanent archive behavior.
- [`API_CONTRACT.md`](../API_CONTRACT.md): allowed batch actions and sanitized
  ordered per-item results.
- [`RETENTION_LIFECYCLE.md`](../RETENTION_LIFECYCLE.md): permanent archive
  state transition and independent task/visibility/retention semantics.
- [`DESIGN.md`](../DESIGN.md) §6: separate BatchSelector and confirmation
  behavior.
- [`TESTING.md`](../TESTING.md) and
  `downstream/addons/messaging/tests/batch.spec.ts`: existing automated
  coverage; this PLAN requests production verification, not implementation.
- [Restore-ordering telemetry plan](restore-ordering-telemetry-plan.md):
  separate FT-07 evidence gap.

### Preconditions and fixture proposal

An approved later SPEC must freeze the production ingress, exact marker, and
verification method. This PLAN proposes:

- exactly one new purpose-built entry, created through the normal Add-on
  ingress only after a separate explicit owner authorization;
- one unique FT-13 disposable marker and one eligible unchecked GFM task;
- initial state Active, permanent retention, `expiresAt=NULL`, and explicit
  disposable provenance;
- no reuse of any historical, retained, unknown-origin, or prior FT fixture;
- fresh read-only preflight verifying account/scope, Add-on Worker compatibility
  and identity, exact fixture identity/state, and no conflicting target
  operation, reconciliation, or in-flight work.

The detailed SPEC must also define a fresh pre-submit drift check. If any
identity, state, authentication, deployment, or operation precondition is
unknown or contradictory, stop without submitting the action.

### Proposed action and expected result

After a separate authorization bound to the exact verified entry ID, select
that one visible eligible Active entry in Batch Mode and choose
`archive_permanent`. The current contract does not require a destructive
selection-level confirmation for permanent archive. Submit exactly one
authenticated `POST /api/batch` with one ID, the action, and a fresh
idempotency key. Do not call the single-entry lifecycle endpoint, retry, or
replay the request.

Expected outcome:

- one requested, one succeeded, zero failed, and one ordered result for the
  exact selected ID;
- the same binding and Paste remain; the managed task becomes checked;
- the entry leaves Active and appears in Archive as permanent;
- `expiresAt=NULL`, with the public Paste still readable and non-expiring;
- zero reconciliation-required or in-flight residue;
- no unrelated or historical entry/Paste mutation, credential exposure, or
  queue/DLQ/deployment/configuration change.

## Acceptance criteria

FT-13 may be classified PASS only if an approved SPEC defines and all of these
are evidenced:

1. A fresh preflight and immediate drift check match the approved Worker,
   principal/scope, and exact disposable fixture.
2. Exactly one selected ID uses `archive_permanent`; exactly one batch request
   is submitted, with no destructive selection-level confirmation and no
   single-entry fallback.
3. The authoritative response reports one requested, one succeeded, zero
   failed, and the exact ID in order.
4. The same entry/binding/Paste is present in Archive and absent from Active;
   the task is checked, retention is permanent, and `expiresAt=NULL`.
5. The public Paste remains readable and non-expiring.
6. D1 operation/result evidence agrees with the UI and public Paste; there is
   no target or global reconciliation/in-flight residue.
7. No unrelated or historical entry/Paste changed, and no secret was exposed.

An incomplete, contradictory, or ambiguous result is not PASS. Stop and
reconcile read-only.

## Required evidence

The later execution record should contain, with credentials and secrets
redacted:

- exact production Add-on Worker identity/version and observation time;
- pre/post read-only binding, operation, batch-result, reconciliation, and
  in-flight counts, including the exact target row/state;
- fixture marker, entry ID, Paste ID, and disposable provenance (no password,
  token, credential URL, or unrelated Paste body);
- selection count, selected action, confirmation count, request count, ordered
  sanitized response, and operation ID;
- post-action Active/Archive result, task state, retention/expiry, and public
  Paste read/metadata result;
- comparison showing no unrelated or historical mutations and no secret
  exposure;
- final functional result and consumed/unused authorization state.

## Risk, stop, and reconciliation

The authorized action would mutate one production binding and Paste body by
checking its managed task, and move the entry into permanent Archive. The
successful fixture is intentionally retained as evidence. This PLAN does not
authorize a restore, delete, or other cleanup; each would need a separate
explicit owner authorization.

On timeout, transport ambiguity, unexpected response, identity drift,
operation conflict, nonzero reconciliation/in-flight state, or mismatch
between UI/D1/public state: submit nothing further; stop; preserve the fixture;
perform read-only reconciliation only; record uncertainty and request owner
resolution. Do not retry, replay, compensate, restore, or delete. No automatic
rollback is safe for an ambiguous lifecycle mutation.

## GitHub Project decision

Continue tracking in Project #3. Its existing items define the repository's
active queue, and the queue was refreshed after FT-12 with all six prior items
Done. A new project would split the established history without a documented
need. Issue #186 and one Project #3 planning item record this proposed scope;
no implementation or speculative follow-up tasks are created.

## Owner gates and non-goals

Required, separate gates before any execution:

1. Owner approves this PLAN scope. Until then the SPEC remains not started.
2. Owner reviews and approves the detailed SPEC before any execution
   authorization is considered.
3. Owner explicitly authorizes exactly one fixture create through the SPEC's
   frozen normal ingress and marker.
4. Owner explicitly authorizes exactly one `archive_permanent` batch request
   bound to the exact verified entry ID.
5. Any restore/delete cleanup requires another explicit owner authorization.

No production mutation, D1 write, fixture creation, Feishu event/webhook replay,
partial-failure injection, guessed/cross-scope ID test, batch retry, restore,
delete, deployment, Worker/configuration change, application-code change, or
FT-14 planning is part of this PLAN.

```text
FT13_SCOPE_STATUS=PROPOSED_FOR_OWNER_REVIEW
FT13_PLAN_APPROVAL=REQUIRED
FT13_SPEC=NOT_STARTED
FT13_FIXTURE_CREATE_AUTHORIZED=NO
FT13_BATCH_ARCHIVE_AUTHORIZED=NO
FT13_EXECUTION_AUTHORIZED=NO
FT13_EXECUTION_STARTED=NO
```
