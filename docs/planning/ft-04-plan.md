# FT-04 PLAN — New Feishu P2P create

Status: **PLAN ONLY**. Not executed. No SPEC in this turn.

Tracking: [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149)

Do **not** start FT-04, send P2P, create or delete Pastes, or mutate D1/queues/Cloudflare from this document. Execution requires a later owner authorization.

## Recovered source of truth

Canonical definition is the owner instruction **START PRODUCTION FUNCTION TEST** (2026-09-12). Heading:

```text
# FT-04 — New P2P create
```

That instruction names the exact body token `FT_CREATE_20260912_01`, forbids synthetic send, and defines the end-to-end create path and PASS checks below.

Supporting repo records (sequencing and pause only; they do **not** redefine FT-04):

| Source                                                                                                                                            | What it records                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ft-defect-remediation.md](ft-defect-remediation.md) / closed [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)                 | FT-04+ blocked until remediation + targeted regressions; `FT_CREATE_20260912_01_SENT: NO`; do not send P2P or delete test Pastes unless a later Function Test step is authorized |
| [ft-auth-origin-fix.md](ft-auth-origin-fix.md) / [#130](https://github.com/Skyline-Gazer/pastebin-worker/issues/130)                              | After origin defect, resume at FT-02; do not send `FT_CREATE_20260912_01` yet                                                                                                    |
| FT-DEFECT-01/02/03 PLANs and SPECs                                                                                                                | `FT-04+` not started during defect work                                                                                                                                          |
| [provider-neutral-messaging-todo.md](provider-neutral-messaging-todo.md) §C / [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146) | Start-gate note: do not start FT-04 until `FT-DEFECT-03=PASS`. **Not** a new FT-04 spec. Optional Lark P2P is a **separate** AFTER_LARK_ENABLEMENT item                          |
| Closed [#134](https://github.com/Skyline-Gazer/pastebin-worker/issues/134)                                                                        | Dual Feishu+Lark auth/ingestion gate; does not change FT-04 into Lark P2P                                                                                                        |

No GitHub issue previously tracked FT-04 itself. [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146) is **not** the FT-04 tracker.

## Exact objective

Validate **one** new production create from a **real owner-originated Feishu P2P** message.

Expected pipeline (verbatim from the Function Test instruction):

```text
Feishu event
→ webhook 200
→ ingress queue
→ create
→ Service Binding
→ pastebin-prod POST /
→ 200
→ D1 succeeded
→ entry visible in frontend
→ public Paste GET 200
```

Current production webhook for Feishu is `POST /api/feishu/events` on `pastebin-feishu-prod`. Do not substitute a Lark event or `POST /api/lark/events`.

## Workers involved

**Both:**

| Worker                 | Role in FT-04                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `pastebin-feishu-prod` | Feishu webhook, ingress queue consume, D1 operation/scope write, Service Binding call |
| `pastebin-prod`        | `POST /` Paste create; public `GET` of the new Paste                                  |

Add-on origin: `https://pb.test.223.im`  
Paste origin: `https://pb.223.im`

## Prerequisites (must already be true before execution)

Accepted gates (owner-recorded; this PLAN does not re-run them):

```text
FT-01 PASS
FT-02 PASS          # real Feishu Add-on session on pb.test.223.im
FT-03_DATA_PATH PASS
FT_DEFECT_01_PASS=YES
FT_DEFECT_02_PASS=YES
FT_DEFECT_03_PASS=YES
LARK_WEBHOOK_READY=YES
LARK_OAUTH_READY=YES
LARK_PRODUCTION_ENABLED=YES
```

The original Function Test said: do **not** send `FT_CREATE_20260912_01` until FT-02 and FT-03 have completed successfully. Defect remediations and dual-provider enablement were blocking lifecycle testing; they are now accepted. They are **not** part of FT-04 itself.

Before execution, confirm live versions still match the owner baseline (read-only):

```text
pastebin-prod         1d84dbbd-fa52-4b5a-a158-d1dab939d32b @ 100%
pastebin-feishu-prod  036de73a-6c6a-4c73-a702-8b6f0ee44e12 @ 100%
```

If versions have changed, STOP and ask the owner; do not treat a drifted Worker as the Function Test surface.

## Environment

- Current **production** only. No preview traffic, no version override, no local Worker.
- Do not modify source, config, schema, or deployments during the test run.
- Do not replay old queue events.
- Do not manipulate historical D1 rows.
- Do not create synthetic Feishu webhook events when a real Feishu interaction is required.
- Do not claim PASS from unit tests alone.

## Expected input

Exactly one owner-originated Feishu P2P whose **owner-visible token** is:

```text
FT_CREATE_20260912_01
```

(or an owner-authorized retry token such as `FT_CREATE_20260915_02`).

Do not send it synthetically. Do not send a second P2P. Do not send a Lark P2P as FT-04.

Stored Paste body MUST equal provider MarkdownSource byte-for-byte (`PROVIDER_MARKDOWN_SOURCE === STORED_PASTE_BODY`). A provider-preserved terminal LF from Feishu native Code Block UI is **not** a runtime defect (see [ft04-markdown-inbound-spec.md](ft04-markdown-inbound-spec.md) §4.1; adjudicated on production Paste `7Zf3ZDjmyj2dQMWpSwfc7CK8`).

If the agent cannot send Feishu P2P, stop and report:

```text
OWNER_INTERACTION_REQUIRED: SEND_FT_CREATE_20260912_01
```

The 2026-09-12 token is the original PASS body name; the remediation retry used `FT_CREATE_20260915_02`. Do not invent additional tokens without owner authorization.

## Test sequence (execution later; not this turn)

1. **Preflight (read-only).** Confirm Worker versions, Feishu Add-on session still authenticated (`GET /api/auth/session` on `https://pb.test.223.im`), ingress backlog and DLQ backlog, and that `FT_CREATE_20260912_01` is not already a live Paste body for this principal.
2. **Owner send.** Owner sends the single Feishu P2P. Agent does not send it.
3. **Ingress.** Observe Feishu webhook 200 on `pastebin-feishu-prod` (`POST /api/feishu/events`). Do not inject a fake event.
4. **Create path.** Confirm ingress consume → create → Service Binding → `pastebin-prod POST /` → 200.
5. **D1.** Confirm a succeeded create operation bound to the **Feishu** principal/scope (`feishu:v1:…`), not Lark.
6. **Frontend.** Authenticated listing on `https://pb.test.223.im` shows one new Active entry; body matches provider MarkdownSource (terminal LF preserved if present); permanent retention.
7. **Public Paste.** `GET https://pb.223.im/<paste-name>` returns 200 with `STORED_PASTE_BODY === PROVIDER_MARKDOWN_SOURCE`.
8. **Uniqueness / health.** One and only one new Paste; no DLQ increment; no `reconciliation_required`.
9. **Record.** Operation id, paste name, public URL.
10. **STOP.** Do not continue into FT-05+ unless a later owner instruction starts those tests. The FT-04 entry is the input for later lifecycle tests (archive/restore/delete); leave it in place.

## Production writes (when executed; not this turn)

Yes. FT-04 **mutates** production:

- Feishu inbound event (owner)
- Ingress queue message consume
- D1 create/success rows (Feishu scope)
- `pastebin-prod` Paste create (KV/R2 as implemented)

This **planning** turn performs **none** of those writes.

## Owner-only actions

- Send the real Feishu P2P `FT_CREATE_20260912_01`.
- Complete any Feishu client confirmation the product requires.
- Later cleanup through product UI/API only after lifecycle/delete tests (FT-11+), not as part of FT-04.

## Safety boundaries

- No synthetic webhook, no queue replay, no D1 row edit/delete, no DLQ purge to hide a failure.
- No Lark P2P, no Slack/WeCom/DingTalk.
- Do not consume [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146) deferred work (resource rename, D1 table rename, cookie rename, queue wire schema migration, PLATFORM removal, `BROWSER_AUTH_PROVIDERS` cleanup, optional Lark P2P).
- Do not delete historical evidence Pastes (`DRsrmX5eRifhY2dAidEA6PW5`, `GArKkmdGdbXwikYdckMJhYKC`).
- If the test fails, capture the exact failure; continue only where later test state cannot be corrupted. No code fix in the same Function Test run.

## P2P requirement (from evidence)

**Required: exactly one real Feishu P2P.** Synthetic events are forbidden for this step.

Not required for FT-04: Lark P2P. That remains optional AFTER_LARK_ENABLEMENT on #146 and needs its own authorization.

## Expected artifacts / evidence

- Webhook 200 correlation (Feishu event id / Worker logs as available without printing secrets)
- Queue consume without DLQ increment
- D1 succeeded operation id (Feishu namespace)
- Paste name and `https://pb.223.im/<name>`
- Frontend Active listing screenshot or equivalent (body + permanent retention)
- Public GET 200 body exact match
- Counts: new Feishu P2P used = 1; new Pastes created = 1

## Rollback / cleanup

FT-04 does **not** roll back the created Paste or D1 row as part of PASS.

From the original cleanup policy:

- Do not clean up evidence before results are captured.
- Disposable FT entries may be deleted through the **normal product UI/API only after** corresponding lifecycle/delete tests have completed.
- Do not directly delete D1 rows.
- Do not purge queues unless an unexpected test-created DLQ message exists, in which case STOP and report instead of hiding the failure.
- Keep the historical M3 smoke Paste untouched.

If create fails mid-path (webhook 4xx/5xx, DLQ, `reconciliation_required`, duplicate Paste): **STOP**, report, do not retry a second P2P without owner authorization.

## Pass / fail criteria

**PASS** when all of the following hold:

- Body of the new Paste **exactly** `FT_CREATE_20260912_01`
- Pipeline completed as specified through public GET 200
- One and only one Paste created for this send
- No DLQ increment
- No `reconciliation_required`
- Active entry visible in the authenticated Feishu Add-on UI
- Permanent retention
- Operation id, paste name, and public URL recorded

**FAIL** on any broken hop, wrong body, duplicate Paste, DLQ increment, reconciliation flag, Lark-namespaced create, or synthetic-event substitution.

**BLOCKED_OWNER_INTERACTION** if the P2P has not been sent:

```text
OWNER_INTERACTION_REQUIRED: SEND_FT_CREATE_20260912_01
```

Allowed result token for this step: `FT-04: PASS` | `FT-04: FAIL` | `FT-04: BLOCKED_OWNER_INTERACTION`.

## This planning turn

```text
PRODUCTION_MUTATION=NO
P2P_SENT=NO
FT04_EXECUTED=NO
```
