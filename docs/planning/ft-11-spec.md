# FT-11 SPEC — single-item delete production Function Test

Parent: [FT-11 PLAN](ft-11-plan.md), Issue [#180](https://github.com/Skyline-Gazer/pastebin-worker/issues/180).
This is an execution contract, not an execution authorization.

## Target fixture contract

Exactly one new fixture may be created only through the supported Add-on create
path and only after owner authorization. It must have:

- one current binding and one upstream Paste;
- a unique FT-11 marker body suitable for read-only verification;
- `visibility=active`, `retentionMode=permanent`, and `expiresAt=null`;
- explicit owner/operator evidence that it is disposable;
- no relationship to smoke, provenance, FT-04/05+, FT-08, FT-09, or FT-10
  retained evidence.

Historical or unknown-origin entries fail this contract and must not be
deleted.

## Preconditions before arming delete

All values must be freshly read and recorded without secrets:

```text
downstream/main = expected pinned commit
worker pin/deployment = current production observation
authenticated Add-on session = valid
target entry = active and visible
target Paste = exists and publicly readable
target disposable evidence = explicit YES
D1 operation/reconciliation/in-flight counts = baseline captured
ingress backlog and DLQ backlog = captured, or unavailable explicitly recorded
```

If the session is invalid, D1 is not read-only accessible, or any target
identity/disposability field is unknown, stop at the owner gate.

## Canonical delete

Use the Add-on single completion contract from `docs/API_CONTRACT.md`:

```http
POST /api/entries/:id/complete
Content-Type: application/json
Idempotency-Key: <opaque fresh identity>
X-CSRF-Token: <session-bound token>

{"action":"delete"}
```

The browser supplies no Paste password, management URL, scope authority, or
body. The backend performs the upstream DELETE with its server-side secret,
then removes the binding only after upstream success. There is exactly one
submission; an ambiguous response stops the test and is reconciled read-only.

## Required postconditions

On a definite success, prove all of the following:

1. The target is terminally deleted and absent from both Active and Archive.
2. The public Paste and metadata endpoint are unavailable (or the
   deployment's documented equivalent is observed).
3. No target operation remains in-flight or requires reconciliation.
4. D1 operation totals change only by the one intended delete operation; no
   unrelated binding/Paste is changed.
5. Responses, logs, telemetry, and evidence contain no management secret.

Any failed precondition or postcondition is a blocked/failed result, not a
success claim and not a reason to mutate another entry.

## Security and retention constraints

Delete is destructive and is not an archive transition. Do not expose or copy
the management password. Do not archive, restore, retry, repair, or clean up
other data during FT-11.
