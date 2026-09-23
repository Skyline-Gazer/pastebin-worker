# FT-12 SPEC — Batch Mode production Function Test

Parent: [FT-12 PLAN](ft-12-plan.md), tracking issue
[\#183](https://github.com/Skyline-Gazer/pastebin-worker/issues/183).
This is an execution contract, not a production authorization.

## Fixture contract

FT-12 requires at least two explicitly disposable purpose-built entries. The
normal expected state is no usable existing fixture, so a later owner gate may
authorize exactly two new entries through the supported Add-on create path.
Each entry must have a unique FT-12 marker, one binding and one Paste,
`visibility=active`, `retentionMode=permanent`, `expiresAt=NULL`, and durable
explicit disposable provenance. Historical, retained, and unknown-origin
entries are never substitutes.

The planning marker identities are intentionally not created here:

```text
FT12_FIXTURE_COUNT_REQUIRED=2
FT12_FIXTURE_A_MARKER=OWNER_GATE_REQUIRED
FT12_FIXTURE_B_MARKER=OWNER_GATE_REQUIRED
```

## Browser and API boundary

The later request is:

```http
POST /api/batch
Content-Type: application/json
Idempotency-Key: <fresh opaque batch identity>
X-CSRF-Token: <session-bound token>

{"ids":["entry_a","entry_b"],"action":"delete"}
```

The frontend supplies no Paste password, management URL/body, Feishu token,
scope authority, or deadline. The Worker requires the opaque authenticated
session, exact Origin, session-bound CSRF, and a server-derived principal to
allowed-scope join before lifecycle work.

## Validation and limits

- Method is POST and content type is JSON.
- IDs are nonempty strings, unique, ordered, and bounded to 50.
- Body size is bounded to 16 KiB.
- Action is exactly one of `archive_permanent`, `archive_expiring`, `delete`.
- The request has one bounded printable idempotency key.
- Invalid method, content, identity, session, Origin, CSRF, or scope rejects
  before upstream/lifecycle work.

## Result contract

Processed results contain `requested`, `succeeded`, `failed`, and exactly one
sanitized result per requested ID in the same order. A successful delete item
is `{id,status:"ok",deleted:true}`. Archive items expose only authoritative
public state. Failed items expose a stable safe code and retryability. No raw
upstream errors, credentials, tokens, scope IDs, Paste bodies, or management
URLs are returned.

The batch is not globally transactional. Each item executes independently;
successful effects remain committed when another item fails. Partial results
are a supported product contract but are not deliberately induced by FT-12.

## Idempotency and retry

One request identity reserves a durable batch record. An equivalent completed
replay returns the recorded result; conflicting reuse is rejected. An
ambiguous or reconciliation-required dispatch is not converted into success
and is not blindly retried. A later retry, if legitimately needed, contains
only failed/retryable IDs, uses a new key, and requires a new owner gate.

Batch execution must not be implemented as a browser loop over
`POST /api/entries/:id/complete`. Backend delegation may reuse the existing
single-entry lifecycle service while the browser makes one batch request.

## Frontend selection and confirmation

BatchSelectors are distinct controls from Markdown task checkboxes and appear
only for visible eligible Active entries. Batch Mode locks normal task
completion. Delete and expiring archive use one selection-level confirmation;
permanent archive does not require destructive confirmation. While in flight,
the action bar is disabled and no optimistic lifecycle state is shown.

Authoritative success updates only successful IDs. Failed IDs remain selected
and retryable. A summary reports aggregate counts; a transport/unavailable
error claims no unverified item success.

## Later execution acceptance

```text
BATCH_SELECTED_COUNT=2
BATCH_CONFIRMATION_COUNT=1
BATCH_REQUEST_COUNT=1
BATCH_ACTION=delete
BATCH_RESULT_TOTAL=2
BATCH_RESULT_SUCCEEDED=2
BATCH_RESULT_FAILED=0
ENTRY_A_ACTIVE_AFTER=NO
ENTRY_A_ARCHIVE_AFTER=NO
PASTE_A_DELETED=YES
ENTRY_B_ACTIVE_AFTER=NO
ENTRY_B_ARCHIVE_AFTER=NO
PASTE_B_DELETED=YES
D1_RECONCILIATION_REQUIRED_AFTER=0
D1_INFLIGHT_AFTER=0
UNRELATED_ENTRY_MUTATION=NO
UNRELATED_PASTE_MUTATION=NO
HISTORICAL_ENTRY_MUTATION=NO
HISTORICAL_PASTE_MUTATION=NO
SECRET_EXPOSURE=NO
SERIAL_SINGLE_ENTRY_FALLBACK_USED=NO
```

## Owner gates and stop

```text
FT12_ACTION_OWNER_GATE=REQUIRED
FT12_FIXTURE_CREATION_AUTHORIZED=NO
FT12_BATCH_EXECUTION_AUTHORIZED=NO
```

No fixture, batch, archive, restore, delete, D1, queue, deployment, or
configuration mutation is authorized by this SPEC.
