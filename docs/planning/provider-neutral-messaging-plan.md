# PLAN: Provider-neutral messaging add-on architecture

Status: **OWNER AUTHORIZED FOR IMPLEMENTATION**

Tracking: [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146)

Related: [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132), closed FT-DEFECT-01 follow-up [#143](https://github.com/Skyline-Gazer/pastebin-worker/issues/143), dual-provider PR [#137](https://github.com/Skyline-Gazer/pastebin-worker/pull/137), paused FT-DEFECT-03 [#134](https://github.com/Skyline-Gazer/pastebin-worker/issues/134)

Base: `downstream/main` `5690d43e8ad48f66311d9cdfa9c59e11c4c31d0c`

## Why now

FT-DEFECT-01 and FT-DEFECT-02 are PASS. Lark is not enabled in production. No production Lark session, scope, or P2P state exists. Migration `0008` already stores a `provider` column. Continuing FT-DEFECT-03 on the current PLATFORM / dual-mode model would freeze Feishu-shaped architecture into production.

Feishu and Lark are the first two **providers**. They are not architectural modes. Future adapters may include Slack, WeCom / WeChat Work, and DingTalk.

## Old model (replace)

```text
PLATFORM = feishu | lark
+ BROWSER_AUTH_PROVIDERS dual-mode switch
+ routes exist only when the switch is on
+ webhook challenge requires complete OAuth+webhook config
+ /api/lark/events can fall through into the Feishu handler
```

## New model

```text
ProviderRegistry
├── FeishuAdapter
└── LarkAdapter

Runtime asks: which providers are webhook-ready? which are OAuth-ready?
```

There is no single / dual / triple mode.

## Scope of this PR

- Provider registry + independent adapters
- Split webhook readiness from OAuth readiness
- Always-mounted provider routes with provider-local 503
- Generic naming cleanup for internal TypeScript/docs/directory
- Tests, CI path updates, durable TODO ledger
- PR against `downstream/main`

## Out of scope

Production deployment, Cloudflare mutation, Lark enablement, D1/queue mutation, real P2P, FT-04, renaming production Worker/D1/queues/bindings, changing queue wire literal `feishu.message-create.v1`, renaming `feishu_*` D1 tables.

## Implementation order

1. Tracking issue, PLAN, SPEC, TODO ledger
2. Rename `downstream/addons/messaging` → `downstream/addons/messaging` and `docs/MESSAGING_ADDON.md` → `docs/MESSAGING_ADDON.md`
3. Provider core + Feishu/Lark adapters
4. Route mounting and auth readiness
5. Tests (new isolation/readiness + migrated dual-provider suite)
6. CI/docs/scripts
7. Validation and review gate

Canonical `POST /api/providers/:provider/events` is **AFTER_MERGE** (compatibility aliases already exist).
