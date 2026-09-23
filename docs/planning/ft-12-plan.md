# FT-12 Plan — Batch Mode production Function Test

Status: **planning and read-only reconnaissance only**. Tracking issue:
[\#183](https://github.com/Skyline-Gazer/pastebin-worker/issues/183).
This artifact does not authorize a production mutation.

## Context and objective

FT-11 completed the single-entry delete path. FT-12 is the next production
closeout check: exercise the normal all-success Batch Mode path with exactly
two explicitly disposable, purpose-built entries. The test validates one
protected batch request and per-item authoritative success without deliberately
manufacturing failures or authorization attacks.

## Locked contract

Batch selection is separate from Markdown/GFM task state and is limited to
currently visible eligible Active entries. The supported mutation route is
`POST /api/batch`; the browser sends only entry IDs, an allowed action, the
opaque session, exact Origin/session CSRF material, and one idempotency key.
The backend derives principal/scope and credentials server-side.

The request must preserve unique ordered IDs, a maximum of 50 IDs, and a 16 KiB
body limit. Allowed actions are exactly `archive_permanent`,
`archive_expiring`, and `delete`. Results are authoritative, ordered like the
request, and include aggregate plus per-item outcomes. Partial success is a
supported contract even though FT-12 exercises the all-success path.

## Action decision

```text
FT12_CANONICAL_ACTION_FROM_HISTORICAL_SPEC=UNSPECIFIED
FT12_RECOMMENDED_ACTION=delete
FT12_ACTION_OWNER_GATE=REQUIRED
```

Delete is recommended because both fixtures are disposable and the test then
leaves no cleanup lifecycle. This recommendation is not execution authority.

## Scope

1. Verify the merged repository and current Batch Mode/API contract.
2. Perform fresh authenticated, read-only production reconnaissance and capture
   D1, deployment, and queue baselines.
3. Classify existing entries; retained or unknown historical entries are never
   disposable candidates.
4. Prepare the exact two-fixture model and separate owner gates for creation
   and later batch execution.
5. Persist this PLAN/SPEC/TODO through a docs-only reviewed PR.

## Non-goals

No fixture creation, batch request, archive/restore/delete mutation, D1 write,
queue replay, deployment/configuration change, product-code change, FT-13 work,
cross-scope/guessed-ID test, deliberate partial failure, or artificial
reconciliation state.

## Owner-gated execution model

### Gate 1 — create two fixtures

After a fresh read-only preflight, an owner may authorize exactly two creates
through the normal Add-on path. Each create is independently exactly-once. An
ambiguous result stops and reconciles read-only; it is never blindly retried.

Before Gate 2 both entries must have current IDs and Pastes, active visibility,
permanent retention, `expiresAt=NULL`, and explicit `FT12_BATCH` disposable
provenance.

### Gate 2 — one batch request

The owner must separately authorize one batch action bound to the exact two
entry IDs. The recommended delete case is one selection-level confirmation and
one `POST /api/batch`, never two browser calls to the single-entry endpoint.

### Gate 3 — retry

No retry is implicitly authorized. If a legitimate processed result contains
failed IDs, only those IDs may be considered with a new idempotency key and a
new owner authorization. An ambiguous transport result is read-only
reconciliation only.

## Expected FT-12 PASS evidence

The later execution must prove two selected items, one confirmation, one batch
request, two succeeded/zero failed ordered results, both entries absent from
Active and Archive, both public Pastes deleted, zero reconciliation/in-flight
work, no unrelated or historical mutation, no secret exposure, and no serial
single-entry fallback.

## Stop conditions

Stop before any production write if authentication, target identity,
disposability, D1 access, queue observability, or contract consistency is
unknown or contradictory. This run reached the first stop condition because
the canonical Add-on session was unauthenticated:

```text
FT12_STATE=BLOCKED_OWNER_AUTHENTICATION
AUTH_SESSION_VALID=NO
AUTH_OWNER_INTERACTION_REQUIRED=YES
FT12_FIXTURE_CREATION_AUTHORIZED=NO
FT12_BATCH_EXECUTION_AUTHORIZED=NO
PRODUCTION_MUTATION=NO
```
