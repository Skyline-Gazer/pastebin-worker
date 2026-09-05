# Phase 4 execution TODO

Status: OWNER APPROVED / EXECUTION AUTHORIZED (2026-09-05)

Parent: [approved SPEC](phase4-spec.md) · [PHASE decomposition](phase4-phases.md).

Owner approved the Phase 4 SPEC on 2026-09-05. This TODO is the durable active checklist for the single Phase 4 delivery milestone. **Owner approved this PHASE/TODO pair on 2026-09-05 — EXECUTION AUTHORIZED.** Implementation may proceed.

## Delivery milestone

Goal: Feishu webhook foundation — verified encrypted `im.message.receive_v1` P2P human text ingress through Cloudflare Queues into Phase 3 `EntryService.createEntry`, with fail-closed reconciliation and no duplicate Pastes. Scope and acceptance: [SPEC](phase4-spec.md) section 3.11 criteria 1-10; milestone fields: [phase4-phases.md](phase4-phases.md). Dependency: merged Phase 3 at `09148c96cad01af4a5938e5d74f3b3a33823e348`. Inputs: approved PLAN/SPEC/PHASE, Phase 3 internal services, Feishu/Cloudflare contracts cited by SPEC. Deliverables: fetch/Queue adapter, protocol verify/normalize modules, shared Queue payload types, mandatory DLQ-configured consumer classification, behavior-first tests, Add-on docs, downstream-only CI. Candidate implementation branch after approval: `codex/phase4-webhook-foundation` or `feat/feishu-webhook-foundation` from refreshed `downstream/main`; PR target `downstream/main`. No production deploy/migration; no Patch 010/series/`upstream-sync`/PR #5 changes; no new D1 receipt table; no Phase 3 interface extension. Main risks: early ACK, non-stable identities, ambiguity retry, authz gaps, content/secret leakage. Exit: SPEC criteria validated, current-HEAD CI + independent AI Review Gate passed, findings dispositioned, PR merged only with appropriate authority.

## Ordered work

### 0. Preflight (before implementation branch / first RED)

- [x] Confirm owner approval of this PHASE decomposition and TODO (STOP if not explicit).
- [ ] Refresh `downstream/main` (`fetch` + `--ff-only`); verify clean tree and tip descends from / equals `09148c96cad01af4a5938e5d74f3b3a33823e348` or a later merge that still contains Phase 3 services.
- [ ] Confirm Node 22.x and pnpm 10.x available; confirm Add-on Vitest/tsc/eslint/vite tooling paths.
- [ ] Confirm PR #5 remains OPEN / UNMERGED / REVIEW ONLY.
- [ ] Create the implementation branch from refreshed `downstream/main` (not from an unmerged planning-only commit unless planning docs are first merged or intentionally carried).
- [ ] Persist any final approved TODO wording on the durable branch before coding (§10.7).

### 1. Inspect contracts before tests

- [ ] Re-read Phase 3 `createEntry` result codes used by SPEC §3.6 (`ok`, `STORAGE_OR_CREDENTIAL_UNAVAILABLE`, `RECONCILIATION_REQUIRED`, conflicts, etc.).
- [ ] Confirm existing Add-on worker entrypoints, wrangler/env binding patterns, and downstream-only CI workflow shape.
- [ ] Select the concrete operator-visible durable disposition integration within SPEC bounds (mandatory DLQ path if no governance-approved durable sink exists; never treat console logs alone as durable disposition). Document the choice in Add-on docs without changing SPEC behavior.

### 2. TDD RED — protocol and authorization

- [ ] Write failing protocol tests: clear/encrypted URL verification challenge; exact raw-body signature vectors; tampering; invalid token; base64/AES/padding/UTF-8 failures; missing secrets; timing-safe comparison guards.
- [ ] Write failing normalization/authorization tests: schema/event/app/tenant/actor/chat/message allowlists; bot/system sender; group chat; non-text types; malformed/empty/oversized text; deterministic `scopeId`/`recordKey`/`requestId` vectors excluding `event_id`.
- [ ] Record genuine RED evidence per `docs/TESTING.md` section 1.1 (no fabricated RED).

### 3. TDD RED — fetch handler and Queue publish

- [ ] Write failing fetch-handler tests: method/media/body limits; zero mutation before all gates; authenticated unsupported no-op 200; Queue `send` awaited before HTTP 200; Queue rejection/throw returns 503; sanitized error bodies/logs; challenge never enqueues.
- [ ] Record RED evidence.

### 4. TDD RED — consumer and Phase 3 integration

- [ ] Write failing consumer tests: confirmed success; known-success replay; duplicate/concurrent stable deliveries; safe transient retry; reconciliation/permanent disposition matrix; invalid internal payload; per-message ack/retry isolation; DLQ configuration validation failure closed.
- [ ] Write failing integration tests with Phase 3 store mocks/contracts: duplicate callback + duplicate Queue delivery yields one binding/Paste; content absent from D1; crash points before publication, before reservation, and after Phase 3 success remain recoverable without a second upstream POST.
- [ ] Record RED evidence.

### 5. Implement smallest GREEN for ingress

- [ ] Implement verification/decryption/authorization/normalization modules and identity derivation exactly per SPEC §3.5-§3.6.
- [ ] Implement `POST /api/feishu/events` with challenge handling and ordinary-event path; await Queue durable acceptance before 200.
- [ ] Wire Worker secrets/bindings/config validation fail-closed (`FEISHU_ENCRYPT_KEY`, `FEISHU_VERIFICATION_TOKEN`, `FEISHU_APP_ID`, `FEISHU_ALLOWED_TENANT_KEYS`, `FEISHU_INGRESS_QUEUE`, mandatory DLQ).
- [ ] Turn ingress RED tests GREEN without broadening allowlists or truncating oversized input.

### 6. Implement smallest GREEN for consumer

- [ ] Implement Queue consumer validating `FeishuMessageCreateV1` and calling only `createEntry({scopeId}, {recordKey, requestId, content})`.
- [ ] Implement SPEC §3.6 classification: ack / retry / fail-closed disposition; never invent a new business identity; never blind-retry post-dispatch ambiguity as a new Paste mutation.
- [ ] Turn consumer/integration RED tests GREEN.

### 7. Hardening, docs, CI, regression

- [ ] Enforce log/response/Queue/D1 redaction rules (SPEC §3.8 / criterion 8).
- [ ] Update Add-on configuration, recovery, and DLQ operator-runbook docs; state that Phase 4 does not auto-consume DLQ.
- [ ] Extend downstream-only CI for new tests/typecheck/build without changing upstream-owned workflows or package manifests on `downstream/main` outside Add-on paths.
- [ ] Run formatting, lint, TypeScript, Vitest, and build checks; keep existing Phase 3 suites green.
- [ ] Inspect final tracked diff: no Patch 010 / series / upstream-owned source changes; no new D1 migration; no Phase 3 public/internal contract change.

### 8. Review gate (after TODO approval and implementation)

- [ ] Commit with full review context; push; open implementation PR to `downstream/main` with planning refs.
- [ ] Obtain authoritative GitHub CI on the current HEAD.
- [ ] Obtain independent current-HEAD AI Review Bot review; fix or owner-disposition findings; re-review after every HEAD change.
- [ ] Merge only after the Phase Review Gate passes; refresh `downstream/main`; do not start Phase 5 from an unmerged branch.

## Evidence

Planning-only so far. Implementation evidence (RED/GREEN/REFACTOR/REGRESSION command transcripts) MUST be appended here during execution after owner TODO approval. No RED/GREEN claims are made by this planning commit.

## Explicit non-authorization

Until the owner explicitly approves this TODO (and the companion PHASE decomposition):

- do not create the implementation branch for coding;
- do not modify Add-on runtime source;
- do not open an implementation PR;
- do not deploy, migrate, or merge product changes;
- do not treat Issue #10 handoff text or archived freeze docs as execution authority.

Status: TODO READY FOR OWNER REVIEW — NOT EXECUTION AUTHORIZED.

Implementation has NOT started.
