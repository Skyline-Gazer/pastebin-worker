# FT-08 PLAN — Timed archive + countdown

Status: **PLAN APPROVED** (`FT08_PLAN_OWNER_REVIEW=APPROVED`); execution **FT08_FUNCTIONAL_RESULT=PASS**; closeout status sync only.

```text
FT08_TEST_OBJECTIVE=timed_archive_and_countdown
FT08_USES_FT07_RESULT=YES
FT08_FUNCTIONAL_RESULT=PASS
FT08_COMPLETE=YES
FT08_AUTHORIZED=YES (execution turn)
FT08_STARTED=YES (execution turn)
FT08_ACTION_SUBMITTED=YES (execution turn)
FT07_ORDERING_EVIDENCE=INCONCLUSIVE (unchanged)
ORDERING_VERIFIED_BY_STEP_LOGS=NO (unchanged)
PRODUCTION_MUTATION=NO (this document)
PR165_DEPLOYMENT_IS_NOT_AN_FT08_ENTRY_GATE=YES
```

Durable execution evidence: [evidence/ft-08-timed-archive-pass.md](evidence/ft-08-timed-archive-pass.md).

Tracking: Issue [#162](https://github.com/Skyline-Gazer/pastebin-worker/issues/162). Parent
function-test instruction: owner `START PRODUCTION FUNCTION TEST` (2026-09-12) sequence
`FT-06 → FT-07 → FT-08` (canonical wording `# FT-08 — Timed archive + countdown`).

## 1. Objective

Test the **completion upstream-update path** with a finite expiry (`e=max`) on the
Active lifecycle fixture retained from FT-07, and verify the authoritative
countdown presentation. This is **not** a restore test and **does not** execute
restore:

```text
Contract under test: ACTIVE_PERMANENT → ARCHIVED_EXPIRING (timed archive)
Action: archive_expiring ("限期归档")
Upstream: enum:max ("e=max") via PasteClient.update → deployment MAX_EXPIRATION
Observe: countdown from authoritative expiresAt (never browser_now + MAX_EXPIRATION)
```

## 2. Authoritative behavior sources

- `docs/RETENTION_LIFECYCLE.md` §4 (expiring archive: checked task, `archived`, upstream `e=max`, authoritative `expiresAt`, countdown) and §7 (countdown display-only from `expiresAt`).
- `downstream/addons/messaging/worker/service.ts` `completeEntry` — kind `complete_expiring`; `PasteClient.update(name, password, content, "max")`; requires upstream `expireAt` ISO and finite `Date.parse`; persists `visibility=archived`, `retention_mode=timed`, `expires_at=expiresAt`, `version+1` via `finishCompletion`.
- `downstream/addons/messaging/worker/paste-client.ts` `write` — `e=max` response must have string `expireAt` with finite `Date.parse`; `e=never` requires `expireAt=null` and `expirationSeconds=null`.
- `downstream/addons/messaging/frontend/ArchiveStatus.tsx` — countdown only from `expiresAt`; ISO `YYYY-MM-DDTHH:mm:ss.sssZ`; `剩余 Nd Nh Nm`; refresh ≤ 60 s; at/under deadline → `限期归档：等待确认过期状态` (expired/stale reconciliation state, never negative countdown, no timer-driven mutation).
- `docs/DESIGN.md` §3.2, `docs/FRONTEND.md` §3/§5, `docs/planning/phase7-spec.md` §3.5 — client never derives `expiresAt` from `MAX_EXPIRATION`/duration/browser storage.
- HTTP surface `POST /api/entries/:id/complete` (`downstream/addons/messaging/worker/completion.ts`): session + CSRF + Origin required; JSON `{action:"archive_expiring"}`; `Idempotency-Key` ≤256 printable; `200 {entry}`.

## 3. Preconditions

```text
FT07_PHASE_STATUS=PASS_WITH_DOCUMENTED_EVIDENCE_GAP
FT07_FUNCTIONAL_RESULT=PASS
ORDERING_VERIFIED_BY_STEP_LOGS=NO   # FT07 historical evidence gap; NOT an FT08 hard prerequisite
FT07_ORDERING_EVIDENCE=INCONCLUSIVE
FUTURE_ORDERING_TELEMETRY_IMPLEMENTED=YES
FUTURE_ORDERING_TELEMETRY_DEPLOYED=NO  # does NOT gate FT08
TELEMETRY_DEPLOYMENT_REQUIRED_BEFORE_FT08=NO
PR165_DEPLOYMENT_IS_NOT_AN_FT08_ENTRY_GATE=YES
```

- `FT08_USES_FT07_RESULT=YES` — the FT-07 restored fixture is the FT-08 input.
- No new lifecycle fixture; FT-07 retained the fixture with `FT07_CLEANUP=NONE`.
- No restore ordering / `RESTORE_STAGE` / FT-09 semantics in the FT-08 gate.
- Do **not** require `ORDERING_VERIFIED_BY_STEP_LOGS=YES`.

### 3.1 Planning source baseline vs FT-08 runtime deployment requirement

```text
PLANNING_SOURCE_BASELINE=38b4ff0de33b3bcf0785f99f0eba899ca18d523a
FT08_RUNTIME_DEPLOYMENT_REQUIREMENT=version-compatible; NOT identical-to-baseline
```

- **PLANNING_SOURCE_BASELINE** anchors the reviewed planning source to current
  `downstream/main` (Merge #165). It defines what the reviewed contract means;
  it is **not** a production deployment pin and does **not** require deploying
  the Worker code it contains (including #165 restore telemetry).
- **FT08_RUNTIME_DEPLOYMENT_REQUIREMENT** is the only deployment gate for FT-08:
  - the deployed production Add-on Worker is **version-compatible with the
    known FT-08 `archive_expiring` contract** — `completeEntry`, `archive_expiring`,
    `e=max` mapping, authoritative `expiresAt` handling;
  - Phase A records the actual **`WORKER_PIN`** (deployment/version identity) by
    read-only resolution;
  - Phase A verifies that deployment contains the FT-08-dependent behavior;
  - **no** production upgrade is required solely to deploy #165 restore
    telemetry (FT-08 executes `completeEntry`, not restore).
- If finite existing docs/evidence identify the exact production pin used for
  FT-06/FT-07, Phase A may cite it. Otherwise Phase A resolves the actual
  production pin read-only and verifies compatibility. FT-08 **must not** force
  `production == PLANNING_SOURCE_BASELINE`.

```text
TELEMETRY_DEPLOYMENT_REQUIRED_BEFORE_FT08=NO
PR165_DEPLOYMENT_IS_NOT_AN_FT08_ENTRY_GATE=YES
```

### 3.2 Fixture (FT-07 → FT-08 handoff; safe representation)

```text
TARGET_PASTE=DMkerQPTisMNhhp8tdQc5Ech
PUBLIC_URL=https://pb.223.im/DMkerQPTisMNhhp8tdQc5Ech
BINDING_ID_PREFIX= (redact: record full id only in the execution's private evidence, per FT-07 redaction practice)
scope=/ principal= (server-side only; never in plaintext evidence beyond prefix where allowed)
visibility=active
retention_mode=permanent
expires_at=NULL
version=3
body=- [ ] FT_LIFECYCLE_20260916_01
task_state=unchecked
kind(prior op)=restore_permanent succeeded
credential=server-encrypted envelope; opened server-side only
operation state: no pending op for the fixture
```

Expected FT-07-consistent Paste body: `- [ ] FT_LIFECYCLE_20260916_01`, no trailing LF
(upstream may preserve zero LF as already evidenced in FT-07). Any LF introduction observed
during FT-08 is an investigate/fail condition, not a silent normalize.

### 3.3 Authentication / authorization requirements

FT-08 canonical action is the **frontend single-item** lifecycle action with an authenticated
browser session (per `ft-06-plan.md` §7 surface mapping). Required: browser session cookie,
exact configured Origin, session-bound CSRF token, server-side principal→scope join to the
fixture binding; alternate direct API is NOT the canonical surface. Exactly one action
submission (`FT08_ACTION_SINGLE_SUBMISSION` — an execution invariant, not a precondition);
`<idempotency-key>` opaque 1..256 printable; transport retries collapse by key.

## 4. Action (single production mutation permitted by a future owner authorization)

```text
Action: ONE frontend single-item archive_expiring ("限期归档") on the FT-07 fixture
Endpoint surface: POST /api/entries/<id>/complete   body={"action":"archive_expiring"}
Input: none beyond action + id + session + CSRF (+ Idempotency-Key set by frontend)
Expected prior state: active / permanent / expires_at NULL / version 3 / task unchecked
Upstream: PasteClient.update(paste, password, checkedContent, "max") → e=max (deployment MAX_EXPIRATION)
          (value is a reviewed source contract; runtime evidence asserts the timed-expiring effect)
D1: reserveCompletion(kind=complete_expiring) → dispatch → finishCompletion(v3→v4)
```

Asynchronous behavior: dispatch is in-process synchronous; no queue hop. The frontend
refreshes list from authoritative response.

## 5. Expected outcomes

```text
HTTP/API: 200 {entry:{visibility:archived, retentionMode:timed, expiresAt:<ISO>, version:4}}
D1 binding: visibility=archived retention_mode=timed expires_at=<ISO> version=4
feishu_operations: kind=complete_expiring status=succeeded expected_version=3 created_at<=updated_at
Paste: body `- [x] FT_LIFECYCLE_20260916_01` (managed marker checked; other bytes unchanged); timed-expiring effect (finite authoritative expireAt)
lifecycle: ARCHIVED_EXPIRING; expiresAt authoritative from upstream expireAt
frontend: Active row leaves 进行中; Archive row shows 限期归档：剩余 Nd Nh Nm (role=status aria-label 限期归档，剩余 …)
frontend countdown ONLY from returned expiresAt (ISO); tolerance: server-expiresAt minus local-now;
refresh ≤60s; if expiresAt<=now at observation → expired/stale presentation (waiting for confirmed expired state), not negative
version delta: +1 (3→4)
operation result: result JSON of archived public entry (project())
```

## 6. Negative invariants (must not change)

```text
- unrelated Pastes / bindings / operations of other entries
- credential envelope / ownership / binding identity / scope
- FT-04 historical evidence Paste 7Zf3ZDjmyj2dQMWpSwfc7CK8
- FT07 historical evidence flags: FT07_ORDERING_EVIDENCE=INCONCLUSIVE, ORDERING_VERIFIED_BY_STEP_LOGS=NO
- no delete, no permanent archive, no restore, no batch
- no DLQ / reconciliation row
- no second Paste / no new binding
```

## 7. Evidence to collect after execution (defined in advance)

```text
- exact request time (UTC ISO) + idempotency key prefix + op id prefix
- Pre-ARM snapshot (before action): bindings total, target row (visible/retention/expiresAt/version),
  operations kind=complete_expiring total/target, create_succeeded total, DLQ baseline,
  feishu_operations total/target_succeeded/reconciliation_required
- HTTP result (status + body entry JSON)
- Post D1 row: target binding fields + target op row (kind/status/expected_version/created/updated)
- Upstream Paste: GET 200 body exact `- [x] FT_LIFECYCLE_20260916_01` (HAS_LF expectation), metadata expireAt
- VALUE of `"max"` mapping: reviewed source contract (`archive_expiring → PasteClient.update(..., "max")`); runtime metadata cannot independently prove the request literal — evidence below asserts the timed-expiring effect
- Frontend observation: Active tab target absent; Archive tab target present with 限期归档 countdown
  (role=status aria-label `限期归档，剩余 N…`), observation time
- Correlation: one idempotency key → one complete_expiring op → one HTTP 200
```

## 8. STOP conditions (Phase C–E)

```text
- fixture mismatch (visibility/retention/expiresAt/version/body/paste_name)
- version mismatch at reserve (VERSION_CONFLICT) / unexpected op row
- auth mismatch (401/403) or CSRF/Origin failure
- HEAD/deployment mismatch vs FT08_RUNTIME_DEPLOYMENT_REQUIREMENT (version compatibility; see §3.1)
- unexpected HTTP status / non-200 or body not entry JSON
- upstream update rejected/uncertain; ENTRY_NOT_FOUND; managed task ambiguous
- unexpected upstream mutation (new paste / wrong body / unrequested retention)
- partial / ambiguous state (op reconciliation_required, mismatch of D1 vs upstream vs UI)
- any situation requiring replay of FT-07 (e.g. missing precondition)
```

On STOP: stop and record; no automatic retry; blind retry forbidden when retry-safety unknown.
Precondition mismatches discovered before the first action are reported as
`FT08_EXECUTION_STATUS=BLOCKED_PRECONDITION` / `FT08_FUNCTIONAL_RESULT=NOT_RUN`,
not as functional FAIL.

## 9. Owner authorization and boundaries

```text
OWNER_AUTHORIZATION_REQUIRED_BEFORE_PHASE_C=YES
FT08_AUTHORIZED=NO
FT08_STARTED=NO
FT08_ACTION_SUBMITTED=NO
PRODUCTION_MUTATION_THIS_ROUND=NO
PR165_DEPLOYMENT_IS_NOT_AN_FT08_ENTRY_GATE=YES
```

- Owner authorization is a **fresh, explicit** authorization for FT-08 only; it
  is not implied by FT-07, #164/#165, or any prior step. Authorization sets
  `FT08_AUTHORIZED=YES`; the FT-08 run is **not** started until Phase C begins
  (`FT08_STARTED=YES` at Phase C entry), and the single action is recorded
  separately as `FT08_ACTION_SUBMITTED=YES/NO`.
- FT-08 success must NOT be used to retroactively prove FT-07 ordering;
  `RESTORE_STAGE` markers (post-deploy) are future-evidence only.
- This PLAN is docs-only; no deploy / production call / timed archive /
  restore executed now. FT-08 PASS does **not** require waiting for the real
  expiration deadline; deadline-boundary observation is future,
  separately-authorized scope.

Status: PLAN READY FOR OWNER REVIEW
