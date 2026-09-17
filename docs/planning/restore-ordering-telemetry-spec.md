# SPEC — Restore ordering telemetry

Status: **SPEC** (implements owner-prescribed observability debt; no FT-07/FT-08 execution)

Parent PLAN: [restore-ordering-telemetry-plan.md](restore-ordering-telemetry-plan.md)

```text
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO
FT08_STARTED=NO
RETROACTIVE_EVIDENCE=NO
```

## 1. Objective

Define secret-free, same-invocation `RESTORE_STAGE` markers for
`EntryService.restoreEntry` so **post-deploy** restore executions can prove FT-07
SPEC §9 ordering from Workers Logs without inferring order from final state.

## 2. Log schema

```text
RESTORE_STAGE=<stage> seq=<positive int> [request_id=<safe>] [op_id=<uuid>] [kind=restore_permanent|restore_timed] [code=<safe>]
```

Rules:

- `seq` increases by 1 for each emitted marker within one `restoreEntry` call
- `request_id` logged only if it matches `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`
- `op_id` logged only after operation construction, and only if UUID-shaped
- Never log password, paste body/content, credential envelope, Authorization,
  manageUrl, full exception messages, or paste/entry identifiers beyond op/request ids
- `*_completed` / success stage names mean that step succeeded
- `*_started` does **not** mean success
- `*_failed` means that step failed; later success stages for the same attempt must not appear

## 3. Emitted stages (permanent success path)

In order:

1. `request_accepted`
2. `duplicate_lookup_completed`
3. `binding_lookup_completed`
4. `lifecycle_gate_passed`
5. `fingerprint_kind_completed`
6. `credential_open_completed`
7. `paste_read_completed`
8. `managed_task_completed`
9. `operation_constructed` (op_id present from here)
10. `reservation_completed`
11. `dispatch_completed`
12. `upstream_update_started`
13. `upstream_update_completed`
14. `finish_completed`

Timed path inserts `expiry_cancel_started` → `expiry_cancel_completed` (or `*_failed`)
after `dispatch_completed` and before `upstream_update_started`.

## 4. Mechanical ordering checks (future FT gate)

Given logs filtered by one `request_id` (and `op_id` after construction):

```text
seq(reservation_completed) < seq(dispatch_completed)
seq(dispatch_completed) < seq(upstream_update_started)
seq(upstream_update_started) < seq(upstream_update_completed)
seq(upstream_update_completed) < seq(finish_completed)
```

Equivalently: `RESERVATION_BEFORE_UPSTREAM_UPDATE` holds when
`seq(reservation_completed) < seq(upstream_update_started)` under the same correlation.

Do **not** use Workers invocation aggregates alone.

## 5. Failure stages

| Failure | Marker | Must not appear afterward |
| --- | --- | --- |
| lifecycle gate | `lifecycle_gate_failed` | reservation/dispatch/update/finish completed |
| credential open | `credential_open_failed` | paste_read+ completed |
| paste read | `paste_read_failed` | managed_task+ completed |
| managed task | `managed_task_failed` | operation+ completed |
| reservation | `reservation_failed` | dispatch/update/finish completed |
| dispatch | `dispatch_failed` | update/finish completed |
| timed expiry cancel | `expiry_cancel_failed` | upstream_update/finish completed |
| upstream update | `upstream_update_failed` | upstream_update_completed / finish_completed |
| finish / post-update persist | `finish_failed` | finish_completed |

Compensation / API error codes remain unchanged; markers are additive only.

## 6. Source-structure-only steps

All SPEC §9 steps above have runtime markers. Duplicate replay emits
`duplicate_replayed` and stops. No additional tracing framework.

## 7. FT-07 / FT-08 policy

```text
FT07 historical ordering remains INCONCLUSIVE
ORDERING_VERIFIED_BY_STEP_LOGS=NO for FT-07
New RESTORE_STAGE markers MUST NOT be cited as FT-07 historical proof
FT08_STARTED=NO unless separately authorized
Markers become usable only after an authorized messaging Worker deploy
```

## 8. Tests

- Unit: emitter seq / correlation / redaction
- Service: permanent success stage list + reserve before update
- Service: upstream reject → `upstream_update_failed`, no later completed stages
- No production network

## 9. Docs impact

`MESSAGING_ADDON.md`, `docs/INDEX.md`, note on `evidence/ft-07-restore-pass.md`,
this SPEC/PLAN.
