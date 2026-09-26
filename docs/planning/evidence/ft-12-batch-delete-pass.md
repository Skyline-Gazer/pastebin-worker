# FT-12 execution evidence — two-entry batch delete (PASS)

Tracking: [Issue #183](https://github.com/Skyline-Gazer/pastebin-worker/issues/183).
Planning contract: [PLAN](../ft-12-plan.md), [SPEC](../ft-12-spec.md), [TODO](../ft-12-todo.md).
This is a secret-free record of the owner-authorized production execution. The initial authentication stop and the original Fixture A reconciliation remain historical; this evidence does not rewrite either.

```text
FT12_FUNCTIONAL_RESULT=PASS
FT12_STATE=EXECUTION_PASS_EVIDENCE_PR_PENDING
FT12_BATCH_EXECUTION_AUTHORIZATION=CONSUMED_BY_SUBMISSION
BATCH_ACTION=delete
BATCH_SELECTED_COUNT=2
BATCH_CONFIRMATION_COUNT=1
BATCH_REQUEST_COUNT=1
BATCH_RESULT_TOTAL=2
BATCH_RESULT_SUCCEEDED=2
BATCH_RESULT_FAILED=0
FT13_STARTED=NO
```

## Historical Fixture A settlement

The original marker `FT12_BATCH_20260923T061407Z_A` is not either batch target. Its Feishu event was `e37603667586ed2335e59d6e33c470d6`; the originally captured local attempts at 17:06:29.737, 17:06:56.355, and 17:12:04.471 were timeouts with `httpCode=0`. The snapshot through 18:55:02 recorded no later attempt. The separately authorized final retry-window reconciliation later classified the original fixture as `CASE_B_TERMINAL_NOT_CREATED`: no D1 reservation or create operation and no Active or Archive entry. Its create authorization remained consumed; the fixture was not retried or included in this batch.

The historical ingress configuration was observed as consumer `pastebin-feishu-prod`, max retries 5, retry delay 0, queue-level DLQ `pastebin-feishu-ingress-dlq-prod`. No Feishu event was replayed for this batch.

The prior preflight stop comment ([#5835504488](https://github.com/Skyline-Gazer/pastebin-worker/issues/183#issuecomment-5835504488)) remains unchanged. The owner’s correction ([#5842308097](https://github.com/Skyline-Gazer/pastebin-worker/issues/183#issuecomment-5842308097)) establishes the correct pre-batch baseline as 19 entry operations, 12 bindings, and 0 batch operations; the earlier expected-binding value of 10 was a prompt baseline error, not production drift.

## Exact pre-batch state

Fresh preflight after owner authentication used production D1 `pastebin-feishu-prod-db` (`d2baac8f-0f8b-4943-88b3-196c18ba121a`). The Add-on Worker was `pastebin-feishu-prod`, version `0f19b190-0cd9-4d4c-ae50-08425a2e7d84`.

| Fixture | Entry ID | Paste | Marker | Pre-batch state |
|---|---|---|---|---|
| A2 | `63748f1c-1844-4455-899b-eaa44ad7ceba` | `J3C4pjsHxheYSDGWZZdtZEzm` | `FT12_BATCH_20260924T064400Z_A2` | active / permanent / expiry NULL; only `create:succeeded` |
| B | `b50921cc-bc3f-4f0d-91f8-bc6de1ccdd96` | `TCJYHQYK34MNjFCx7bERC8pk` | `FT12_BATCH_20260923T061407Z_B` | active / permanent / expiry NULL; only `create:succeeded` |

The create operation IDs were respectively `cdeca8b9-9b96-4020-9377-2391aa93a961` and `d925e69a-8f0f-4c68-b209-3b6a942ea179`. Both public Pastes and markers matched before execution. Before the batch: D1 had 19 entry operations, 12 bindings, 0 batch operations, 0 entry reconciliation-required, and 0 entry in-flight records. Both targets were visible in Active and absent from Archive.

## Single authorized submission

The already-open delete confirmation showed exactly 2 selected entries. The current confirmation was clicked once. No second click, retry, serial single-entry call, event replay, direct API fallback, or new idempotency key was used.

The Add-on displayed `已处理 2 项，0 项失败`. The production D1 batch record is:

```text
batch_id=66f087c1-dda9-4ce3-8432-53aa74c2a60d
request_id=0f509a52-0db3-4152-aa28-537a1c4b68fd
action=delete
batch_created_at=2026-09-26T06:55:27.003Z
sanitized_result_created_at=2026-09-26T06:55:28.878Z
batch_item_count=2
batch_result={"requested":2,"succeeded":2,"failed":0,"results":[{"id":"63748f1c-1844-4455-899b-eaa44ad7ceba","status":"ok","deleted":true},{"id":"b50921cc-bc3f-4f0d-91f8-bc6de1ccdd96","status":"ok","deleted":true}]}
```

D1 stored one completed-result row. The batch operation row retains schema status `dispatched`; completion is represented by the durable `feishu_batch_results` row, and the batch has no reconciliation/in-flight residue.

| Order | Entry ID | Batch outcome | Delete operation ID | D1 operation state | Operation time (UTC) |
|---:|---|---|---|---|---|
| 1 | `63748f1c-1844-4455-899b-eaa44ad7ceba` | succeeded | `af4a8958-48f5-473e-a93e-bf54e6a8ee63` | delete / succeeded | 06:55:27.083–06:55:27.907 |
| 2 | `b50921cc-bc3f-4f0d-91f8-bc6de1ccdd96` | succeeded | `381871fb-c93f-43c8-8c6d-816b5a0a3d40` | delete / succeeded | 06:55:28.027–06:55:28.779 |

The item request IDs encode the same order: batch index 0 is A2 and index 1 is B. The frontend implementation makes one `fetch("/api/batch")` for a submit and has no serial single-entry fallback.

## Read-only postcondition reconciliation

After the result, Active showed 4 entries and neither target; Archive showed its one unrelated historical entry and neither target. Public GETs to both Paste URLs returned HTTP 404:

```text
GET https://pb.223.im/d/J3C4pjsHxheYSDGWZZdtZEzm -> 404
GET https://pb.223.im/d/TCJYHQYK34MNjFCx7bERC8pk -> 404
```

Fresh read-only D1 queries returned:

```text
entry_operations_total=21
bindings_total=10
batch_operations_total=1
entry_reconciliation_required=0
entry_inflight=0
batch_reconciliation_or_inflight=0
targeted_bindings_remaining=0
successful_target_delete_operations=2
operations_in_batch_time_window=2
succeeded_batch_items=2
failed_batch_items=0
```

The only two D1 entry operations in the batch time window are the two successful deletes above, for the exact selected IDs. The 12-to-10 binding change is exactly the removal of A2 and B. The batch result contains only the two expected IDs, safe status values, and `deleted=true`; no credential, management password, Paste body, or token was exposed.

```text
A2_ACTIVE_AFTER=NO
A2_ARCHIVE_AFTER=NO
A2_PUBLIC_PASTE_AFTER=404
B_ACTIVE_AFTER=NO
B_ARCHIVE_AFTER=NO
B_PUBLIC_PASTE_AFTER=404
D1_RECONCILIATION_REQUIRED_AFTER=0
D1_INFLIGHT_AFTER=0
UNRELATED_ENTRY_MUTATION=NO
UNRELATED_PASTE_MUTATION=NO
HISTORICAL_ENTRY_MUTATION=NO
HISTORICAL_PASTE_MUTATION=NO
SECRET_EXPOSURE=NO
SERIAL_SINGLE_ENTRY_FALLBACK_USED=NO
QUEUE_OR_DLQ_MUTATION=NO
FEISHU_EVENT_REPLAYED=NO
DIRECT_D1_SQL_WRITE=NO
WORKER_CONFIGURATION_OR_DEPLOYMENT_CHANGED=NO
BATCH_RETRY=NO
FT13_STARTED=NO
```

## Settlement

FT-12’s all-success production behavior passed. No product code, Worker configuration, deployment, Queue/DLQ, or direct D1 SQL was changed by this execution. The Worker’s normal batch lifecycle wrote the expected D1 records.

```text
FT12_FUNCTIONAL_RESULT=PASS
FT12_FIXTURE_A_ORIGINAL_CLASSIFICATION=CASE_B_TERMINAL_NOT_CREATED
FT12_FIXTURE_A_RETRIED=NO
FT12_BATCH_EXECUTION_AUTHORIZATION=CONSUMED_BY_SUBMISSION
FT12_BATCH_RESULT=2_OF_2_SUCCEEDED
FT12_STATE=EXECUTION_PASS_EVIDENCE_PR_PENDING
FT12_COMPLETE=NO                         # PR review/merge and issue settlement remain
NEXT_ALLOWED_ACTION=EVIDENCE_PR_REVIEW_ONLY
```

No FT-13 work is part of this result.
