# Issue #159 create idempotency test-hardening SPEC

Status: **SPEC READY — internal consistency review PASS**

Parent PLAN: [`issue159-idempotency-tests-plan.md`](issue159-idempotency-tests-plan.md)

## Contract under test

`EntryService.createEntry` uses the durable operation keyed by
`(scopeId, requestId)` and fingerprints content. A matching fingerprint may
replay a stored result; a different fingerprint is `REQUEST_CONFLICT`. A
reservation race must return the winner's result or a fail-closed conflict,
and only the winner may dispatch `PasteClient.create`.

## Test cases

1. **Changed content:** call `createEntry` twice with the same scope, record
   key, and request ID but different content. Assert the first call succeeds,
   the second returns `REQUEST_CONFLICT`, and the injected transport receives
   one POST.
2. **Concurrent duplicate race:** start two identical `createEntry` calls
   concurrently. Assert both results are terminal (`ok` success replay or the
   documented fail-closed error), at least one result is the created entry,
   neither result is an unclassified rejection, and the transport receives one
   POST. Keep the binding count at one.

## Non-goals

No implementation change, no migration, no production test, no live replay,
and no change to FT-05 semantics.

## TDD and evidence

The TODO records the exact RED command and observed failure (if the new test
is initially unsupported), then GREEN, REFACTOR, and REGRESSION commands with
their actual results. A test that is already green before implementation is
still recorded as contract coverage added without claiming a fabricated RED.

```text
SPEC_CHANGE_CONTROL=NO_RUNTIME_CHANGE
OWNER_GATE_REQUIRED=NO
```
