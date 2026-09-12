# FT-DEFECT-03 PLAN — Simultaneous Feishu + Lark browser auth and ingestion

Status: PLAN READY FOR OWNER REVIEW

Implementation has NOT started.

Parent umbrella: [ft-defect-remediation.md](ft-defect-remediation.md) — [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)

Tracking issue: [#134](https://github.com/Skyline-Gazer/pastebin-worker/issues/134)

Function Test remains PAUSED. `FT-04+` is not started. No production mutation. No P2P. No Paste deletion.

## Objective

Make one Add-on Web application at `https://pb.test.223.im` accept **both** Feishu and Lark browser login and inbound events, with separate identity and data spaces, no account linking, and no cross-provider credential fallback.

Later implementation/deploy boundary: `pastebin-feishu-prod`. Not this turn.

## Context

Accepted current limitation: `PLATFORM=feishu|lark` is deployment-wide. Production is `PLATFORM=feishu`. A Lark overlay would replace Feishu rather than coexist.

Shipped and recently repaired canonical callback (keep it):

```text
GET /api/auth/callback
FEISHU_OAUTH_REDIRECT_URI=https://pb.test.223.im/api/auth/callback
```

Do not change Feishu to `/api/auth/callback/feishu` merely for symmetry.

Current code facts to verify again before implementation:

- `GET /api/auth/login` starts OAuth for the single `PLATFORM` provider.
- `feishu_oauth_states` stores only `state` + `expires_at`.
- `feishu_browser_sessions` has no provider column; identity is `principal_key` only.
- `derivePrincipalKey` always prefixes `feishu:v1:principal:` even when `PLATFORM=lark`.
- Webhook path is only `/api/feishu/events` and uses `resolveProviderConfig(env)` from `PLATFORM`.
- Queue schema `feishu.message-create.v1` has no provider field; `scopeId` is currently always `feishu:v1:scope:…`.

Target product: one host, two login buttons, isolated principals/scopes.

## Assumptions (with verification)

- Existing production Feishu sessions are `feishu:v1:principal:…` HMAC of `[feishuAppId, tenantKey, openId]`: verify `principal.ts` and D1 rows without mutating them.
- Cookie is already host-only on `pb.test.223.im` (`HttpOnly; Secure; SameSite=Lax; Path=/`; no `Domain`): verify `browser-auth.ts` and overlay. Keep it.
- Feishu and Lark credential env vars already exist as separate names with no cross-fallback in `platform.ts`: verify tests in `platform.spec.ts`. Dual-provider mode must preserve fail-closed missing-credential behavior **per provider**.
- Current Feishu callback registration in the Feishu console is the canonical `/api/auth/callback`: do not churn it.
- Lark production app/secrets may not be fully provisioned yet: code must fail closed for Lark until credentials exist; enabling Lark login is an overlay + console step, not a reason to reuse Feishu secrets.

## Non-goals

- No account linking or cross-provider identity merge.
- No parent-domain cookie.
- No Pastebin (`pastebin-prod`) change.
- No DEFECT-02 UI implementation in this workstream beyond the minimum login entrypoints the Worker must expose (`/api/auth/login/feishu` and `/api/auth/login/lark`). Logged-out dual buttons in the page belong to DEFECT-02 but may be stubbed in tests here.
- No rewrite of existing Feishu principal/scope identifiers.
- No P2P, no FT-04, no production deploy in this planning turn.
- Do not invent a second session cookie.

## Risks / unknowns

- In-flight OAuth states during migration have no provider column; additive default `feishu` is the compatible read.
- In-flight queue messages use `feishu.message-create.v1` without provider; consumer must treat missing provider as Feishu **only** for that historical schema, never as Lark.
- Showing a Lark login button before Lark secrets exist would 503 at click. SPEC: button enablement follows `BROWSER_AUTH_PROVIDERS`; missing secrets fail closed at login, they do not fall back.
- Dual webhook routes need Lark console event subscription; that is an owner console step after code lands.
- `PLATFORM` is widely threaded through tests and `resolveProviderConfig`. Replacing it carelessly could break single-provider deployments.

## Proposed implementation approach (later)

1. Introduce a typed internal provider registry (`feishu` | `lark`) keyed by explicit enablement list `BROWSER_AUTH_PROVIDERS` (comma-separated exact values). No credential fallback. `PLATFORM` remains only as backward-compatible **single-provider** default when `BROWSER_AUTH_PROVIDERS` is unset: treat it as that one provider. `PLATFORM` MUST NOT select the browser login provider when both are enabled.
2. Login routes: `GET /api/auth/login/feishu` and `GET /api/auth/login/lark`. Persist OAuth state with `{ state, provider, expires_at }`. `GET /api/auth/login` without a provider does not start a second brand; SPEC keeps it as a Feishu alias for existing bookmarks plus tests.
3. Keep `GET /api/auth/callback` for both providers. Consume stored state; provider comes **only** from that row. Ignore/reject caller `provider` query as authority.
4. Exchange code against that provider’s token/user-info hosts and **that** provider’s app credentials.
5. Derive `feishu:v1:principal:*` / `feishu:v1:scope:*` exactly as today for Feishu (same HMAC inputs). Derive `lark:v1:principal:*` / `lark:v1:scope:*` for Lark. Same `tenant_key + open_id` across providers are distinct. Do not rewrite existing Feishu keys.
6. Persist provider on the session (additive column, default `feishu`). Existing Feishu session rows remain valid. Cookie unchanged.
7. Webhooks: `POST /api/feishu/events` uses only Feishu verification token / encrypt key / app credentials / origin rules. `POST /api/lark/events` uses only Lark’s. Queue envelope carries authoritative `provider`. Consumer uses that provider for principal/scope derivation. A Lark event must never create a Feishu-namespaced scope.
8. Additive D1 migration. Rollback = previous Worker; new columns ignored by old code except that old code must still read sessions without requiring the new column (DEFAULT handles it).

## Candidate files/components (candidates only)

Under `downstream/addons/feishu`:

- `worker/platform.ts`, `worker/browser-auth.ts`, `worker/browser-store.ts`, `worker/principal.ts`, `worker/webhook.ts`
- `migrations/0008_*` (next free) for oauth state + session provider
- `wrangler.toml` / overlay docs for `BROWSER_AUTH_PROVIDERS`
- tests: `browser-auth.spec.ts`, `platform.spec.ts`, `webhook.spec.ts`, wrangler contract, origin/CSRF tests
- docs: `docs/SECURITY.md`, `docs/API_CONTRACT.md`, `docs/FEISHU_ADDON.md`, `docs/planning/m3-platform-endpoints.md` (historical note + pointer)

## Validation strategy

Later, not now. SPEC test matrix: both logins, shared callback via stored state, tamper resistance, missing credentials fail closed, no cross-fallback, tenant/open_id isolation, existing Feishu session validity, listing isolation, webhook isolation, CSRF/origin unchanged, logout, no secret leakage.

No production D1 write in this planning turn. Implementation migration is additive and must be applied with the later `pastebin-feishu-prod` deploy, not now.

## References

- Umbrella: `docs/planning/ft-defect-remediation.md`
- SPEC: `docs/planning/ft-defect-03-spec.md`
- Shipped M3 platform map: `docs/planning/m3-platform-endpoints.md` (historical single-`PLATFORM` design)
- Issue #130 / PR #131 origin fix (canonical callback)

Status: PLAN READY FOR OWNER REVIEW
Implementation has NOT started.
