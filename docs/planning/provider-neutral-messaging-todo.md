# TODO ledger: Provider-neutral messaging

Durable ledger. Items survive this refactor. States: `NOW` | `AFTER_MERGE` | `AFTER_PRODUCTION_DEPLOY` | `AFTER_LARK_ENABLEMENT` | `FUTURE_PROVIDER` | `DEFERRED_COMPAT_CLEANUP` | `DONE`

Tracking: [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146)

FT-DEFECT-03 remains **NOT PASS**. Provider-neutral architecture is live. Local operator config paths are canonicalized below. Cloudflare production resource names remain deferred.

---

## LOCAL_OPERATOR_CONFIG_PATHS

### Operator overlay filenames (DONE)

Canonical local production-config path (single source of truth):

```text
~/.config/pastebin-worker/wrangler.messaging-prod.toml
~/.config/pastebin-worker/messaging-prod.env
~/.config/pastebin-worker/messaging-prod.runtime.env
```

Historical filenames remain compatibility symlinks to those canonical files:

```text
wrangler.feishu-prod.toml → wrangler.messaging-prod.toml
feishu-prod.env → messaging-prod.env
feishu-prod.runtime.env → messaging-prod.runtime.env
```

This is **not** Cloudflare resource renaming. Worker `pastebin-feishu-prod`, D1, queues, `FEISHU_*` bindings, D1 table names, cookie, and queue wire schema stay under **DEFERRED_COMPAT_CLEANUP**.

Provider credentials stay provider-specific (`FEISHU_*`, `LARK_*`, future `SLACK_*` / `WECOM_*` / `DINGTALK_*`). Future provider additions MUST use the generic `messaging-prod` overlay path. Do not put `LARK_*` into a Feishu-named canonical file.

- Why now: operator filenames said Feishu after the runtime became provider-neutral; Lark must not be provisioned into a Feishu-identity config file
- Trigger: owner-authorized local path migration before Lark webhook provisioning
- Evidence: canonical files exist; historical names are symlinks; no second secret-bearing copy

---

## NOW

### NOW-1 Provider-neutral runtime (this PR)

Implement registry, adapters, split readiness, route isolation, generic naming, tests, CI path updates.

- Why now: owner-authorized; required before Lark production enablement
- Trigger: this PR
- Risk if forgotten: dual-mode leak and `/api/lark/events` Feishu fallthrough remain
- Evidence: PR merged to `downstream/main`; tests in Section 17 green

---

## AFTER_MERGE

### K. Canonical provider routes

Decide whether `POST /api/providers/:provider/events` becomes the preferred public route. Existing `/api/feishu/events` and `/api/lark/events` must remain compatibility aliases for an explicit deprecation period if adopted.

- Why deferred: adding it in this PR increases route/docs/console coordination risk without unblocking FT-DEFECT-03
- Trigger: after this architecture is on `downstream/main` and reviewed in production-shaped tests
- Risk if forgotten: operator docs keep only brand paths; future providers invent ad-hoc URLs
- Evidence: SPEC update + tests that brand paths alias the canonical handler without cross-provider fallthrough

### AFTER_MERGE-workflow GitHub Actions filename

Workflow file remains `.github/workflows/feishu-phase3.yml` (job may be renamed in-file). Filename rename is operational risk (branch protection / required checks).

- Why deferred: required-check name/path coupling
- Trigger: after required-check inventory confirms a safe rename window
- Risk if forgotten: CI title still says Feishu for a multi-provider add-on
- Evidence: workflow filename + required-check config updated together

### L. Repository naming leftovers (classification pass after merge)

Search the downstream add-on scope for misleading generic Feishu/Lark uses. Classify every remaining occurrence as `PROVIDER_SPECIFIC_VALID` | `LEGACY_COMPATIBILITY` | `TODO_RENAME`. This PR performs the primary rename; historical `docs/planning/phase5–9-*.md` paths stay as `LEGACY_COMPATIBILITY`.

- Why deferred for historical phase docs: rewriting closed-phase evidence trails is unrelated risk
- Trigger: leftover audit after merge; optional doc-only PR
- Risk if forgotten: new contributors copy Feishu as the generic type
- Evidence: audit table in a follow-up PR or an appendix to this ledger marked DONE

Highest-priority AFTER_MERGE: **K (canonical routes)** then **workflow filename** then **L leftover audit**.

---

## AFTER_PRODUCTION_DEPLOY

### A. FT-DEFECT-03 completion

After the provider-neutral refactor is **deployed** (separate owner authorization; not this PR):

1. Verify Feishu production regression
2. Provision Lark webhook-specific config
3. Verify Lark Console challenge at `https://pb.test.223.im/api/lark/events`
4. Provision remaining Lark OAuth config
5. Verify `/api/auth/login/feishu` and `/api/auth/login/lark`
6. Real Feishu browser login
7. Real Lark browser login
8. Session provider isolation
9. Principal namespace isolation
10. Scope/data isolation
11. Mismatched provider callback tampering fails closed
12. Mismatched webhook credential verification fails closed
13. Update [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)
14. Mark FT-DEFECT-03 PASS only after evidence

- Why deferred: this PR must not deploy or provision Lark
- Trigger: owner production-deploy authorization of the merged architecture, then Lark enablement steps
- Risk if forgotten: architecture ships but FT-DEFECT-03 never completes
- Evidence: recorded challenge/login/isolation probes; FT-DEFECT-03=PASS on #134 and #132

---

## AFTER_LARK_ENABLEMENT

### B. Lark P2P

At most **one** real Lark P2P validation if still necessary. Requires separate owner authorization. P2P creates downstream state and may consume queue/Paste operations. Do not send automatically.

- Why deferred: creates durable production state; Lark not enabled
- Trigger: FT-DEFECT-03 enablement complete + explicit P2P authorization
- Risk if forgotten: webhook path proven only by challenge, not message create
- Evidence: single authorized P2P with correlation IDs; no extra messages

### C. FT-04

FT-04 remains blocked until `FT-DEFECT-03=PASS`. Do not start early.

- Why deferred: owner sequencing; Web IA after identity/auth
- Trigger: FT-DEFECT-03 PASS evidence
- Risk if forgotten: UI work on an unproven dual-identity runtime
- Evidence: FT-04 tracking issue started only after PASS

---

## DEFERRED_COMPAT_CLEANUP

### D. Legacy production resource names

Do **not** rename in this PR:

- Worker: `pastebin-feishu-prod`
- D1: `pastebin-feishu-prod` / existing D1 ID
- Queues: `pastebin-feishu-ingress-prod`, `pastebin-feishu-ingress-dlq-prod`
- Bindings: `FEISHU_BINDINGS_DB`, `FEISHU_INGRESS_QUEUE`

Optional future migration to provider-neutral infrastructure names only after the provider-neutral runtime is stable in production.

- Why deferred: production identity/DNS/queue coupling; out of scope
- Trigger: stable production runtime + dedicated migration plan
- Risk if forgotten: ops keep Feishu as the product name
- Evidence: cutover runbook, dual-bind window, rollback

### E. Legacy D1 table names

Do not rename now: `feishu_oauth_states`, `feishu_browser_sessions`, `feishu_principal_scope_map`, and other historical `feishu_*` tables that are logically generic.

Future storage-schema-v2 requires: explicit migration plan, compatibility/read path, rollback, existing rows preserved, no destructive rename without evidence.

- Why deferred: live rows; additive 0008 already sufficient
- Trigger: schema-v2 plan approved
- Risk if forgotten: SQL forever says Feishu for Lark sessions
- Evidence: migrated schema + dual-read tests + rollback drill

### F. Shared secret/binding naming

Review historically named generic secrets such as `FEISHU_PRINCIPAL_KEY`. If product-wide/provider-neutral, later introduce a neutral binding with an explicit compatibility window. Do not confuse with provider credentials, which must remain `FEISHU_*`, `LARK_*`, future `SLACK_*` / `WECOM_*` / `DINGTALK_*`.

- Why deferred: production secret rotation
- Trigger: after runtime stable; overlay dual-read of old+new binding
- Risk if forgotten: HMAC key looks Feishu-only and gets copied per provider incorrectly
- Evidence: overlay accepts both names then drops the old name

### G. Queue wire schema

Current literal remains `feishu.message-create.v1`. Future: `messaging.message-create.v1` (or versioned equivalent). Do not change until producer/consumer compatibility is designed, in-flight queues accounted for, and replay/DLQ compatibility proven.

- Why deferred: in-flight/DLQ coexistence
- Trigger: empty ingress + DLQ rehearsal or dual-schema consumer
- Risk if forgotten: poison on mixed schema
- Evidence: consumer accepts old+new; producer switched; old drained

### H. PLATFORM deprecation

Track removal of `PLATFORM` as architectural provider selection. Before removal: generic `/api/auth/login` default behavior explicitly defined; all production overlays migrated; docs updated; no callers depend on `PLATFORM`.

- Why deferred: production overlay still sets `PLATFORM=feishu`
- Trigger: overlays no longer read PLATFORM; alias specified independently
- Risk if forgotten: PLATFORM silently reintroduces enablement
- Evidence: overlay grep empty; alias tests without PLATFORM

### I. BROWSER_AUTH_PROVIDERS deprecation / kill-switch semantics

Final intended semantics: readiness derives from provider configuration. If retained, it is only an allowlist / emergency kill-switch, not provider discovery. Eventually remove if unnecessary.

- Why deferred: production may still want a kill-switch during Lark enablement
- Trigger: after Lark enablement + confidence that missing `LARK_*` is sufficient fail-closed
- Risk if forgotten: unset again means “Feishu-only mode”
- Evidence: docs + tests: unset + both configs ready ⇒ both OAuth-ready

---

## FUTURE_PROVIDER

### J. Adapter onboarding checklist

For Slack, WeCom / WeChat Work, DingTalk:

- [ ] Provider adapter module (no fake Feishu-shaped fields)
- [ ] Independent webhook readiness
- [ ] Independent OAuth readiness where applicable
- [ ] Credentials isolated (`SLACK_*` / `WECOM_*` / `DINGTALK_*`)
- [ ] Principal namespace isolated (`slack:v1:*` etc.)
- [ ] Session/scope isolation; no account linking
- [ ] Provider-specific signature validation
- [ ] Generic core unchanged or minimally changed
- [ ] Tests: isolation, no fallback, missing provider = local failure

- Why deferred: no owner request to implement those providers
- Trigger: owner authorization for a named provider
- Risk if forgotten: next provider copies Feishu env vars
- Evidence: adapter PR using this checklist

### K (also AFTER_MERGE)

Canonical routes listed above.

---

## DONE (this PR, when merged)

Recorded for the ledger:

- Tracking issue #146
- PLAN / SPEC / this TODO
- Registry + Feishu/Lark adapters
- Split webhook vs OAuth readiness
- Isolated routes (no Lark→Feishu fallthrough)
- Generic internal symbol rename
- Add-on directory `downstream/addons/messaging`
- `docs/MESSAGING_ADDON.md`

Not DONE: production deploy, Lark enablement, FT-DEFECT-03 PASS, FT-04, P2P.

---

## Appendix L — leftover naming classification (this PR)

Live add-on scope after this refactor:

| Symbol / name                                                                                          | Classification                                                                           |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `FeishuAdapter`, `LarkAdapter`, `feishuAdapter`, `larkAdapter`                                         | PROVIDER_SPECIFIC_VALID                                                                  |
| `verifyFeishuChallenge` (Open Platform challenge helper still used by both Feishu/Lark tests)          | TODO_RENAME (shared helper; keep export for test compatibility this PR)                  |
| `FEISHU_*` / `LARK_*` credential env vars                                                              | PROVIDER_SPECIFIC_VALID                                                                  |
| `FEISHU_BINDINGS_DB`, `FEISHU_INGRESS_QUEUE`, `FEISHU_PRINCIPAL_KEY`, `FEISHU_SESSION_COOKIE_NAME`     | LEGACY_COMPATIBILITY (see D/F)                                                           |
| `feishu_oauth_states`, `feishu_browser_sessions`, `feishu_principal_scope_map`, `feishu_addon_session` | LEGACY_COMPATIBILITY (see E)                                                             |
| `pastebin-feishu-prod`, queue names, workflow filename `feishu-phase3.yml`                             | LEGACY_COMPATIBILITY (see D / AFTER_MERGE-workflow)                                      |
| Local overlay `wrangler.feishu-prod.toml` / `feishu-prod.env` (symlinks)                               | LEGACY_COMPATIBILITY; canonical `messaging-prod` paths (see LOCAL_OPERATOR_CONFIG_PATHS) |
| Wire `feishu.message-create.v1`                                                                        | LEGACY_COMPATIBILITY (see G)                                                             |
| Type aliases `FeishuMessageCreateV1`, `consumeFeishuMessages`, `createFeishuWebhookHandler`            | LEGACY_COMPATIBILITY (deprecated exports)                                                |
| Historical `docs/planning/phase5–9-*.md` paths `downstream/addons/feishu`                              | LEGACY_COMPATIBILITY                                                                     |
| Generic runtime `Messaging*` / `Inbound*` / `Provider*`                                                | PROVIDER_SPECIFIC_VALID (neutral)                                                        |
