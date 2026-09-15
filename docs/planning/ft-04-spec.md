# FT-04 SPEC — New Feishu P2P create

Status: **SPEC READY FOR OWNER REVIEW**. Not executed.

Parent PLAN: [ft-04-plan.md](ft-04-plan.md) (owner-approved for SPEC).

Tracking: [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149)

This SPEC is the executable production-test contract for FT-04. It does not authorize execution by itself. A later owner execution authorization is required.

This document does **not** send P2P, mutate Cloudflare, D1, queues, or production Pastes.

## 1. Objective

Validate **exactly one** new production Paste created from **exactly one** owner-originated **real Feishu** P2P whose intended owner-visible token is:

```text
FT_CREATE_20260912_01
```

(or the authorized retry token `FT_CREATE_20260915_02` for the Markdown-inbound remediation).

Acceptance of stored bytes is against **provider MarkdownSource**, not against a no-terminal-LF assertion on owner-visible glyphs. See §6.3 and [ft04-markdown-inbound-spec.md](ft04-markdown-inbound-spec.md) §4.1.

Lark P2P is **not** FT-04.

## 2. Surfaces

| Surface        | Value                                           |
| -------------- | ----------------------------------------------- |
| Add-on origin  | `https://pb.test.223.im`                        |
| Feishu webhook | `POST https://pb.test.223.im/api/feishu/events` |
| Paste origin   | `https://pb.223.im`                             |
| Ingress Worker | `pastebin-feishu-prod`                          |
| Paste Worker   | `pastebin-prod`                                 |
| Binding        | `PASTEBIN_SERVICE` → `pastebin-prod` `POST /`   |

Required live versions (ARM). Any other version is fail-closed:

```text
pastebin-prod         1d84dbbd-fa52-4b5a-a158-d1dab939d32b @ 100%
pastebin-feishu-prod  036de73a-6c6a-4c73-a702-8b6f0ee44e12 @ 100%
```

## 3. Execution model

FT-04 has **three phases**. They MUST NOT be collapsed so that the owner is asked to send before observation is ready.

```text
PHASE A — ARM
PHASE B — OWNER SEND
PHASE C — OBSERVE / DECIDE
```

The executor/agent MUST NOT synthesize or send the Feishu message in any phase.

## 4. PHASE A — ARM

Read-only. No P2P. No D1 writes. No queue replay. No version deploy.

### 4.1 Version gate

Confirm the exact Worker versions in §2.

If either Worker or split differs:

```text
STOP
FT04_NOT_ARMED_VERSION_DRIFT
```

Do not ask the owner to send.

### 4.2 Read-only baseline

Capture enough evidence to detect **exactly one new transaction** after send:

- Ingress queue backlog/count as available (do not consume or replay).
- DLQ backlog/count (do not ack, purge, or replay).
- Relevant D1 create/operation baseline on `feishu_operations` (and bindings if needed): counts and the latest create-related ids **without** printing secrets, full `principal_key`, session ids, CSRF, or passwords.
- Authenticated **Feishu** session validity on `https://pb.test.223.im` (`GET /api/auth/session` authenticated; Feishu namespace). Do not start a new OAuth login unless a later owner instruction authorizes it.
- Confirm **no** existing FT-04 operation already attributable to body `FT_CREATE_20260912_01` (no matching succeeded create for this token).
- Confirm **no** current `reconciliation_required` condition relevant to this test (open create-path reconciliation that would make uniqueness/DLQ attribution ambiguous). Historical closed #128 rows are not this test.

If session is not a valid Feishu session: **STOP**. Do not ARM. Do not ask for P2P.

### 4.3 Observability before owner send

Attach/prepare observation **before** `OWNER_ACTION` so a missed log cannot force a second P2P.

`pastebin-feishu-prod`:

- Webhook receipt evidence for `POST /api/feishu/events`
- Queue/consumer create-stage logs
- Correlation/event identifiers where available
- `PASTEBIN_SERVICE_STAGE=request_ready|fetch_enter|fetch_response`
- `PASTE_CREATE_STAGE=formdata_ready|transport_enter|transport_response|response_parse|done`

`pastebin-prod`:

- Downstream `POST /` receipt/result evidence where safely observable (status, not request secrets)

Do not require a second P2P to obtain missed logs. If observability cannot be prepared, **do not ARM**.

### 4.4 ARM success token

Only when versions, baseline, Feishu session, uniqueness-of-token, reconciliation gate, and observability are ready, return **exactly**:

```text
FT04_ARMED_OWNER_SEND_REQUIRED
```

with:

```text
WORKERS
- pastebin-prod: 1d84dbbd-fa52-4b5a-a158-d1dab939d32b @ 100%
- pastebin-feishu-prod: 036de73a-6c6a-4c73-a702-8b6f0ee44e12 @ 100%

BASELINE
- ingress: <count/backlog as observed>
- DLQ: <count/backlog as observed>
- D1 operation/create baseline: <counts; no secrets>
- Feishu session valid: YES

OBSERVABILITY
- Feishu webhook observation ready: YES
- queue consumer observation ready: YES
- pastebin-prod observation ready: YES

OWNER_ACTION:
Send exactly ONE Feishu P2P whose entire body is:
FT_CREATE_20260912_01
Do not send anything else.

P2P_SENT=NO
FT04_EXECUTED=NO
```

Before owner send, the Function Test token for this step is:

```text
FT-04: BLOCKED_OWNER_INTERACTION
```

Armed state uses `FT04_ARMED_OWNER_SEND_REQUIRED` (not PASS).

Then **STOP** and wait for owner confirmation. Do not send. Do not watch for a message that was not authorized as sent.

## 5. PHASE B — OWNER SEND

Only owner interaction satisfies this gate.

Acceptable owner confirmation (concise):

```text
FT04_OWNER_P2P_SENT
```

After that confirmation:

- Do **not** ask the owner to send again.
- Even if later evidence is incomplete or the test fails: **NO SECOND P2P** without a **fresh explicit owner authorization**.

Executor/agent MUST NOT send or synthesize the Feishu P2P.

## 6. PHASE C — OBSERVE / DECIDE

After owner confirms the single send, observe and correlate. Do not mutate the created Paste. Do not archive/restore/delete.

### 6.1 Required chain

```text
real Feishu P2P
→ POST /api/feishu/events accepted
→ ingress queue
→ consumer/create operation
→ Service Binding PASTEBIN_SERVICE
→ pastebin-prod POST /
→ HTTP 200
→ D1 succeeded state
→ Feishu Active listing
→ public https://pb.223.im/<name> GET 200
```

Any broken hop after send is:

```text
FT-04: FAIL
```

Capture the first failing boundary and all already-created state.

### 6.2 Correlation

Use the strongest available identifiers:

- Feishu event/message id (redact if sensitive in public artifacts)
- correlation id
- D1 operation id
- resulting paste name

Do not treat timestamp proximity alone as sufficient if stronger identifiers exist.

Never print credentials, tokens, management passwords, full session ids, CSRF, or full `principal_key`. Principal namespace classification may be recorded as `feishu:v1:...` only.

### 6.3 Exact content

Returned Paste body MUST equal the **canonical MarkdownSource** extracted from the provider payload for that send, **byte-for-byte**, with no application-added transformation.

```text
PROVIDER_MARKDOWN_SOURCE === STORED_PASTE_BODY
```

For native Feishu Code Block UI:

- Do **not** require that `STORED_PASTE_BODY` equal the owner-visible token string with an asserted “no terminal LF”.
- A provider-supplied terminal LF is **permitted** and **MUST** be preserved (see [ft04-markdown-inbound-spec.md](ft04-markdown-inbound-spec.md) §4.1 / §5).
- Fences, language labels, line numbers, or other decoration MUST NOT appear.

Retry token for the FT-04 Markdown-inbound remediation attempt:

```text
FT_CREATE_20260915_02
```

Historical first-attempt token `FT_CREATE_20260912_01` remains historical and must not be reused.

Observed production adjudication for the native Code Block retry: stored body was `FT_CREATE_20260915_02` + LF; classified as acceptance-contract match to provider source (not a runtime LF-injection defect).

Expected retention: **permanent**.

Expected provider/principal: **Feishu namespace only**. A Lark-namespaced operation is **FAIL**.

### 6.4 Uniqueness

The one real owner send must produce:

```text
NEW_FEISHU_P2P_COUNT=1
NEW_PASTE_COUNT=1
```

No duplicate create. No retry-created second Paste. No duplicate D1 success operation representing another Paste.

If duplicate or ambiguity occurs:

```text
FT-04: FAIL
```

Do not clean it up in this step.

### 6.5 DLQ / reconciliation

Compare against the ARM baseline.

Require:

```text
DLQ_INCREMENT=0
RECONCILIATION_REQUIRED=NO
```

If a test-created DLQ message appears:

```text
STOP
FT-04: FAIL
```

Do not acknowledge, purge, replay, or hide it.

If `reconciliation_required` occurs:

```text
STOP
FT-04: FAIL
```

Do not repair production in the same test run.

### 6.6 Frontend evidence

Using the authenticated **Feishu** browser context on `https://pb.test.223.im`:

- exact body matching `PROVIDER_MARKDOWN_SOURCE` (provider-preserved terminal LF allowed; no fences/decoration)
- one new matching entry
- permanent retention
- provider context is Feishu

Use screenshot or equivalent safe evidence if practical.

Do not mutate, archive, or delete the entry.

### 6.7 Public Paste evidence

Record paste name and public URL.

Require:

```text
GET https://pb.223.im/<paste-name> → 200
STORED_PASTE_BODY === PROVIDER_MARKDOWN_SOURCE (byte-for-byte)
```

Do **not** fail solely because a provider-preserved terminal LF differs from owner-visible glyph expectation.

Do not delete it. This Paste remains the lifecycle object for FT-05+.

## 7. Failure semantics (after send)

No automatic retry.

Do not:

- send another P2P
- replay queue
- synthesize webhook
- edit D1
- deploy a code/config fix
- delete created Paste
- purge DLQ

A later owner decision determines recovery/retry.

## 8. PASS evidence record

On PASS record at minimum:

- owner send count = 1
- Feishu webhook accepted
- event/correlation identifier (redacted if sensitive)
- operation id
- provider = feishu
- principal namespace classification = `feishu:v1:...`
- Service Binding create PASS
- `pastebin-prod POST /` = 200
- paste name
- public URL
- public GET = 200
- body exact match
- frontend Active listing PASS
- permanent retention
- DLQ increment = 0
- `reconciliation_required` = NO
- Paste count = 1

Do not print secrets or full session identifiers.

## 9. Result tokens

Do not invent additional success states.

| When                                     | Token                              |
| ---------------------------------------- | ---------------------------------- |
| Before owner send (including ARM wait)   | `FT-04: BLOCKED_OWNER_INTERACTION` |
| ARM complete, owner must send            | `FT04_ARMED_OWNER_SEND_REQUIRED`   |
| After send, chain succeeds               | `FT-04: PASS`                      |
| After send, any required condition fails | `FT-04: FAIL`                      |
| Version mismatch during ARM              | `FT04_NOT_ARMED_VERSION_DRIFT`     |

## 10. Post-PASS boundary

On `FT-04: PASS`: **STOP**.

Do not start FT-05 automatically.

Do not archive/restore/delete the Paste.

Do not execute optional Lark P2P.

Do not consume [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146) deferred work.

The FT-04 Paste is preserved input for later lifecycle tests.

## 11. Out of scope

- SPEC/PLAN authoring is not execution.
- Lark P2P, Slack, WeCom, DingTalk.
- Resource/D1/cookie/queue-schema renaming, `PLATFORM` removal, `BROWSER_AUTH_PROVIDERS` cleanup.
- FT-05 through FT-15.
- Code or config changes to make the test pass.

## 12. This document turn

```text
PRODUCTION_MUTATION=NO
P2P_SENT=NO
FT04_EXECUTED=NO
```
