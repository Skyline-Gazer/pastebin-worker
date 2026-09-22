# FT-11 Plan — single-item delete production Function Test

Status: **planning/reconnaissance only**. This artifact does not authorize a
production mutation. Tracking issue: [#180](https://github.com/Skyline-Gazer/pastebin-worker/issues/180).

## Context

The product implementation cycle is complete. FT-11 is the next production
closeout check: exercise the Add-on's single-item destructive delete against
one deliberately disposable Function-Test entry, while proving that retained
or unknown historical entries are never reused.

## Scope

1. Reconfirm `downstream/main`, the production deployment reference, and the
   read-only operational baseline.
2. Inventory production entries without exposing credentials or mutating
   state. Classify each candidate as disposable only with explicit evidence.
3. If no disposable entry exists, obtain owner authorization for exactly one
   normal supported create operation; do not create it in this planning run.
4. After a separate owner execution grant, delete exactly that entry once and
   collect the evidence defined by the SPEC.

## Non-goals

No archive action, product implementation, deployment, traffic/configuration
change, D1 migration, queue/DLQ operation, cleanup of historical data, or
FT-12–FT-15 work is in scope.

## Phase-A evidence recorded for this run

- Remote `origin/downstream/main` resolves to
  `8980c1d9a973e6b44b61998a3a365242be18603c`.
- No FT-11 issue or planning artifacts existed before Issue #180 and this
  document set.
- `/api/auth/session` and `/api/entries` on `pb.test.223.im` returned `401`.
  No authenticated D1/entry inventory was therefore claimed.
- Known FT-09 Paste `DMkerQPTisMNhhp8tdQc5Ech` remains readable, but its
  retained restore evidence makes it explicitly **non-disposable**.
- No authoritative evidence identified a disposable FT-04/05+, FT-08, or
  FT-10 entry. Unknown is not disposable.

## Stop and owner gates

The current result is `DISPOSABLE_FIXTURE_REQUIRED`. The next permitted step
is a fresh authenticated read-only preflight followed by owner authorization
for one fixture creation through the normal Add-on create path. Delete remains
blocked until that fixture is created, re-read, and separately armed.

## Acceptance criteria

- A target is selected only when its binding, Paste, lifecycle, and explicit
  disposable evidence are all current.
- Delete is submitted at most once with the supported Add-on contract and
  server-side credential handling.
- Success proves terminal deletion, absence from Active and Archive, public
  Paste unavailability, zero unresolved reconciliation/in-flight work, no
  unrelated count/state changes, and no secret exposure.
- Any ambiguous result stops and reconciles read-only; it is never blindly
  retried.
