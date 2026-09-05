# Phase 6 — Single completion actions SPEC

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW / IMPLEMENTATION AUTHORIZED under D-030 after this §10.5 artifact-update PR merges.

Implementation has NOT started.

Parent: [approved Phase 6 PLAN](phase6-plan.md). This is an in-scope D-030 continuous-execution SPEC. The owner-approved browser trust boundary is recorded in `docs/decisions/phase6-browser-trust-2026-09-06.md` §§1–9.

## 3.1 Problem statement and goals

Phase 5 renders a managed unchecked top-level task but makes it inert. Phase 6 supplies exactly `archive_permanent`, `archive_expiring`, and `delete` through an explicit chooser, with authoritative Archive results, no exposed Paste management credential, and no cross-scope mutation.

Browser authorization is official Feishu/Lark OAuth authorization-code → Worker callback/server-side verification and exchange → server-derived principal → Add-on session. Thereafter browser mutation uses only the Add-on session. Phase 6 preserves server-only credentials, upstream Paste-body authority, Phase 3 scoped claims/idempotency, and fail-closed reconciliation. It never accepts browser scope authority, uses a global/default scope, or infers a trusted scope from an entry ID alone.

## 3.2 Non-goals

No Feishu user access token is a browser-held long-lived application credential. No browser-submitted Feishu identity/scope authority, restore, countdown loop, list/pagination/read API, reconciliation UI, Batch Mode, production deployment, upstream patch/root dependency/workflow work, `upstream-sync`, or PR #5 change is in scope. No second authoritative Paste-body store, webhook receipt/idempotency table, or destructive D1 migration is permitted.

## 3.3 Current behavior

At `downstream/main` baseline `0975fa90a2b156b841dc8771f166e911a4f4fd63`, Phase 5 is fixture-only and inert. Phase 3 has internal scoped services: `EntryContext.scopeId` is for a trusted adapter, bindings/operations are scope-qualified, credentials are encrypted server-side, and per-entry claims, fingerprints, versions, success replay, and uncertain-outcome blocking apply.

Phase 4's authenticated P2P Bot event derives a trusted Phase 3 scope. Phase 6.0 extends that trusted event path to establish/update principal-to-scope authorization metadata; it does not alter Phase 3 binding/operation authority.

## 3.4 Desired lifecycle behavior

1. Clicking the managed control opens a compact chooser with no mutation; Cancel is unchanged.
2. `archive_permanent` checks only the managed source task, keeps `e=never`, then returns/persists `archived/permanent/null` after upstream success.
3. `archive_expiring` checks that task, changes to `e=max`, validates a non-null upstream ISO `expiresAt`, then returns/persists `archived/timed/<expiresAt>`. Browser time never derives the deadline.
4. `delete` has distinct destructive confirmation; upstream DELETE precedes binding removal and v1 stores no tombstone.
5. Only a successful Worker result moves UI state; duplicate submission is disabled while pending. Other Markdown checkboxes remain content.

Transitions are `ACTIVE_PERMANENT → ARCHIVED_PERMANENT`, `ACTIVE_PERMANENT → ARCHIVED_EXPIRING`, and `ACTIVE_PERMANENT → DELETED`. Persist only after confirmed upstream success; a post-dispatch unknown result is reconciliation-required, never successful.

## 3.5 OAuth, session, and completion contract

The Worker validates OAuth state, exchanges the code server-side, retrieves identity server-side, derives a principal from `(app_id, tenant_key, open_id)`, and creates a regenerated opaque random Add-on session. Prefer a keyed/hashed derived principal ID; do not expose raw IDs in public APIs/logs. The browser never receives or stores the Feishu `user_access_token` as an Add-on API credential.

Session state is server-side with an absolute eight-hour TTL. Cookie: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter when compatible with verified OAuth, `Path=/`, and `__Host-` where topology permits. Logout/revocation invalidates server state. Feishu tokens retained server-side are encrypted and minimized; none are browser-accessible.

Every state-changing browser request requires authenticated session, exact configured allowed `Origin`, and a server-generated CSRF token bound to that session in a request header. SameSite is not the sole CSRF control. Missing/mismatched Origin or CSRF is rejected before Phase 3/upstream activity.

```http
POST /api/entries/:id/complete
Content-Type: application/json
Idempotency-Key: <bounded opaque request identity>
X-CSRF-Token: <session-bound token>

{ "action": "archive_permanent" | "archive_expiring" | "delete" }
```

Browser sends only entry ID, action, idempotency identity, and normal session/CSRF material. It must not send `scopeId`, tenant/chat/app IDs as authority, a Feishu token, Paste password, management URL, Paste body, or retention deadline. Worker resolves server-derived principal and joins allowed scopes to binding/entry; cross-scope access fails before Phase 3/upstream mutation.

Archive success returns only allowlisted public entry state (`id`, safe public URL/name where already permitted, `visibility`, `retentionMode`, exact `expiresAt`, `version`); delete returns `204` or equivalent secret-free success. Invalid input, unauthenticated, forbidden, missing, stale/conflicting, and reconciliation-required outcomes use stable sanitized codes. Repeated identical completion replays Phase 3-recorded result; same identity with different inputs conflicts; pending/ambiguous claims block mutation.

## 3.6 Principal-to-scope lifecycle and additive migration

Only a fully authenticated/authorized Phase 4 P2P event, or equivalently authenticated server-side Feishu source, may establish/update `principal → Phase 3 scopeId`. v1 requires prior authenticated P2P Bot interaction. One principal may map to multiple scopes. No mapping fails closed with a sanitized authorization/linkage error; no default/global scope exists and browser input cannot create or choose mappings.

When needed, Phase 6.0 adds an additive D1 mapping table/index containing authorization metadata only: keyed/hashed derived principal ID, Phase 3 `scopeId`, timestamps, and safe maintenance metadata. It stores no full Paste body, webhook receipt/idempotency state, raw IDs where avoidable, management password, or OAuth ciphertext. Session state is server-controlled and additive. Existing Phase 3 bindings/operations stay authoritative/readable; no reset, browser-input backfill, or destructive migration.

## 3.7 OAuth verification record

Orchestrator verification is **PASS — no STOP**; it found no material contradiction to the owner design.

- Browser authorize: `GET https://accounts.feishu.cn/open-apis/authen/v1/authorize` with `client_id`, `response_type=code`, `redirect_uri`, `state`, optional scope/PKCE; callback has `code`/`state` or `error=access_denied`. [Obtain OAuth code](https://open.feishu.cn/document/authentication-management/access-token/obtain-oauth-code); [web SSO consent guide](https://open.feishu.cn/document/common-capabilities/sso/web-application-end-user-consent/guide).
- Server exchange prefers `https://accounts.feishu.cn/oauth/v3/token`; documented v2 `https://open.feishu.cn/open-apis/authen/v2/oauth/token` is deprecated toward v3. Inputs: `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri`, optional `code_verifier`. Result includes user `access_token`, `expires_in`, optional `refresh_token`, `token_type`, scope—not `open_id`/`tenant_key`.
- Worker calls `GET https://open.feishu.cn/open-apis/authen/v1/user_info` with bearer user token to obtain `open_id`/`tenant_key`. [user_info reference](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/authen-v1/authen/user_info).

## 3.8 Data, compatibility, and failure behavior

Paste content remains authoritative upstream; a transient read may make the deterministic managed-task update, but D1 stores no second full body. Additive binding state is `visibility: "active" | "archived"`, `retentionMode: "permanent" | "timed"`, `expiresAt: string | null`, and `version`. Existing bindings remain `active/permanent/null`; timed state needs validated upstream ISO timestamp.

Validation/authentication/authorization failures perform no Phase 3/upstream action. Definite upstream failure leaves lifecycle state unchanged. Timeout, failed metadata verification, or post-success persistence failure is reconciliation-required: preserve evidence/claim; do not blind-retry, fabricate expiry, delete evidence, or report success. `ENTRY_NOT_FOUND` and source ambiguity are sanitized/fail-closed. Phase 3 claims/idempotency and Phase 4 webhook behavior remain compatible; generic `e=never`/`e=max` stays upstream-generic.

## 3.9 Acceptance criteria

1. Exact chooser actions, Cancel no-op, and delete confirmation hold.
2. OAuth/token/identity resolution and principal derivation are server-side; browser-visible responses/logs expose no secrets.
3. Sessions are opaque, regenerated on login, server-invalidatable, eight-hour absolute TTL, and use specified secure cookie properties.
4. Mutations require authenticated session, exact allowed Origin, and session-bound CSRF before Phase 3/upstream activity.
5. Trusted Feishu-side event alone establishes mappings; no-scope fails closed, multi-scope works, and cross-scope mutation is denied before upstream activity.
6. Lifecycle ordering, exact `expiresAt`, source precision, Phase 3 idempotency/reconciliation, and active/permanent compatibility hold.
7. Browser/public/log data contains no trusted scope/identity authority, Paste secret/body/management URL, deadline, raw upstream error, OAuth/session/CSRF secret, or credential ciphertext.
8. Migration is additive D1 metadata/session work only and does not duplicate Paste bodies or change Phase 3/4 authority.

## 3.10 Test specification

TDD requires recorded RED/GREEN/REFACTOR/REGRESSION evidence. Before behavior code, add failing tests for: no session → `401`; invalid/expired/revoked session → `401`; principal without scope → forbidden; scope A cannot mutate scope B; browser-supplied scope cannot affect authorization; guessed entry ID cannot grant scope; invalid Origin; missing/invalid CSRF; OAuth/session secrets absent from browser-visible responses/logs; duplicate completion retaining Phase 3 idempotency; and Phase 3/4 compatibility.

Also require frontend chooser/cancel/pending/delete-confirm/result/no-secret tests; service/store/client ordering, source precision, expiry validation, claims/replay/conflicts/reconciliation; adapter method/media/body/action/idempotency validation; additive migration compatibility; Worker/frontend type, lint, build, and regression suites.

## Internal consistency review

Reviewed against `AGENTS.md`, D-001–D-030 (especially D-007, D-008, D-010–D-016, D-030), the Phase 6 PLAN, Phase 3 trusted-context/claim contracts, Phase 4 authenticated P2P scope derivation, Phase 5 fixture boundary, `SECURITY.md`, `API_CONTRACT.md`, `FEISHU_ADDON.md`, `DESIGN.md`, and `CHANGE_CONTEXT_AND_REVIEW.md` §10.5. The owner-approved OAuth flow resolves the former ambiguity without browser tokens/identity/scope trust, upstream changes, Paste-body duplication, or Phase 3/4 authority changes. OAuth verification in §3.7 is PASS. No residual STOP exists; implementation remains unstarted until this artifact-update PR merges.
