# Phase 10 — Release hardening SPEC

Status: CONTINUOUS-MODE SPEC READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

Parent: [Phase 10 PLAN](phase10-plan.md). This is the behavioral and release
contract for roadmap Phase 10 under D-030. It permits Phase/TODO planning, not
implementation, a tag push, a production deployment, or a migration. It uses
the Phase 5–9 contracts as fixed inputs; a release check must reveal a defect
in those contracts rather than silently redesigning them.

## 3.1 Problem statement

The downstream has two independently deployable targets, but the current
release scripts only assemble the exported patch series and write partial local
provenance. They do not yet provide one CI release gate for the exact pinned
inputs, both target builds, integration/security regression coverage, complete
provenance, immutable downstream release tags, or a rehearsable rollback path.
The repository's existing upstream `goshujin` deployment workflow is not a
downstream release mechanism and must not be repurposed by assumption.

Operators need evidence that a proposed downstream release can be reconstructed
from immutable inputs, that the Add-on preserves its established browser and
webhook trust boundaries, and that a prior known release can be selected for a
controlled rollback. Those needs must be met without exposing credentials,
editing generated integration trees, or treating production deployment as a
normal CI side effect.

## 3.2 Goals

1. Define a downstream-only CI/release guardrail that validates the exact
   manifest upstream commit, explicit ordered patch series, clean checkout,
   fail-closed replay, and independent patched-Pastebin and Add-on checks.
2. Define deterministic local/mock integration coverage for the Phase 5–9
   binding, lifecycle, batch, reconciliation, and authoritative-expiry
   contracts, plus webhook verification and retry safety.
3. Define secret-leakage checks spanning browser/API output, stable errors,
   logs/telemetry seams, webhook/queue paths, CI-visible output, and generated
   release provenance.
4. Define a machine-readable release provenance record and immutable downstream
   tag contract sufficient to rebuild a historical release without patch branch
   heads.
5. Define a non-production rollback rehearsal and an owner-controlled
   production rollback/deploy handoff.
6. Complete a documentation review across build/deploy, patch/release,
   security, testing, Add-on operations, and Phase 10 planning artifacts.

## 3.3 Non-goals

- No Phase 5–9 product, lifecycle, Batch Mode, browser session/CSRF/Origin,
  API, or visual redesign; no new user-visible product capability.
- No new generic upstream capability, upstream dependency update, or direct
  modification of upstream-owned source. A later necessary upstream-owned
  change remains a separate explicit patch decision and is outside this SPEC.
- No live production deploy, credential provisioning/rotation, destructive
  migration, database reset, queue/DLQ creation, or manual production repair.
- No manual edit of a generated patched-upstream worktree, patch reversal in
  production, moving patch-branch input, or automatic three-way replay.
- No PR #5, `upstream-sync`, `goshujin`, or upstream-mirror rewrite work.
- No second authoritative Paste-body store, browser-visible management
  credential, secret-bearing artifact/log, or coupling of the two deployments.

## 3.4 Current behavior

At the Phase 10 PLAN baseline (`downstream/main` after Phase 9),
`downstream/release.json` pins upstream commit
`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`, identifies the Add-on path, and
points at `downstream/patches/series`. That series explicitly lists the three
exported non-expiring-paste artifacts.

`downstream/scripts/check-patches.sh` reads the manifest (or an explicit base),
creates a detached temporary worktree, and sequentially runs `git am` for each
listed patch. It rejects missing/unsafe listed paths and stops at the first
failure without `--3way`. It is a replay validator, not a complete release
gate. `downstream/scripts/build-downstream.sh` rejects a dirty checkout by
default, repeats assembly in `.build/patched-upstream`, and writes local JSON
with upstream/downstream/assembled SHAs, series path, and patch SHA-256 hashes.
It deliberately leaves project-specific tests/builds to a subsequent caller;
it has no downstream tag field, target result records, deployment identifiers,
artifact retention contract, or rollback operation.

The checked-in `deploy.yml` deploys only pushes to `goshujin`; `pr.yml` is
upstream-oriented, although `feishu-phase3.yml` validates Add-on formatting,
lint, type checking, Worker tests, and Vite build on pull requests. None is
currently the complete downstream release guardrail. No downstream release-tag
convention is evidenced by an existing `downstream-*` tag at this baseline.

The Add-on already has protected single, restore, reconciliation, and batch
routes; server-held credentials; durable operation/batch evidence; and Phase 9
partial-result/idempotency behavior. The sole public webhook route is
`POST /api/feishu/events`. It verifies/decrypts permitted Feishu events,
derives stable hashed identities, queues normalized safe payloads, and uses the
existing deterministic create request identity to make duplicate delivery safe.
Its documented queue/DLQ runbook requires operator intervention for DLQ
recovery. Existing tests cover individual units, but the Phase 10 test suite
does not yet prove the end-to-end/release properties in this SPEC.

## 3.5 Desired behavior

### Release inputs, assembly, and guardrails

A candidate downstream release is exactly:

```text
committed downstream revision (later named by an immutable release tag)
 + downstream/release.json exact upstream commit
 + series entries, in file order, and their exact committed patch bytes
 + downstream/addons/feishu at that downstream revision
```

CI must reject a dirty checkout; parse and schema-validate the manifest; prove
the upstream value resolves locally/fetched as a commit; read only non-comment,
nonblank `series` lines as order; reject unsafe, duplicate, or absent entries;
and apply each listed patch once, sequentially, in a new detached temporary
worktree. Any first replay failure stops the candidate before either target
build or deploy. Neither `git am --3way` nor `git apply --3way` is permitted.
An unlisted `.patch` file has no release effect. The generated worktree is
read-only as a release input: a repair returns to the responsible patch branch,
is reviewed/re-exported, and restarts complete replay.

After common validation, patched Pastebin and the Feishu Add-on may build in
parallel from their respective pinned inputs. Both must run their defined
test/typecheck/lint/format/build checks before the candidate passes. A failure
records failure evidence and blocks tag/deployment; it does not cause a partial
release claim.

### Provenance and tag contract

The hardening implementation must produce a versioned JSON provenance artifact
with: `schemaVersion`, generation timestamp, exact upstream SHA, exact
downstream SHA, downstream tag (or explicit `null` / `not-created` state for a
pre-tag candidate), series path, ordered patch path plus SHA-256 for every
entry, assembled upstream HEAD/tree, and one result object per target. Each
target result records named checks, pass/fail/blocked status, and safe artifact
or deployment identifier when available. It must never embed credentials,
tokens, full management URLs, raw upstream errors, Paste bodies, or CI secret
values. Missing deployment IDs are explicit unavailable values, never invented.

A release tag uses the documented `downstream-vYYYY.MM.DD.N` pattern, is
annotated or otherwise auditable, and resolves exactly to the clean committed
downstream revision whose manifest/series/Add-on were checked. Existing-tag
collision, a non-commit target, a dirty candidate, or provenance whose SHA does
not equal the candidate SHA fails before any tag/deploy step. Creating or
pushing a tag is a protected release action: only an authorized release actor
may do it after all gates pass. Ordinary PR CI may validate a candidate but
must not create/push tags or deploy.

### Integration, webhook retry, and security observables

Tests use a controlled local/mock Pastebin API and Worker harness; no test
uses production credentials or a live production Paste. They prove binding
creation and repeat update use one mapped Paste, single archive/delete,
mixed-batch outcome, backend `expiresAt`, Restore, and missing/expired upstream
reconciliation without a second content authority. These tests assert the
existing state transitions and public responses; they do not introduce a new
route or lifecycle action.

Webhook tests exercise raw-route verification, permitted normalized event
delivery, invalid verification rejection, queue failure behavior, and duplicate
or concurrent retry safety. The stable Feishu-derived message/create identity
is the idempotency identity for repeated delivery of the same accepted message:
only one Paste create/mutation may be dispatched. A different event remains a
different request. An uncertain/storage-unavailable delivery follows the
existing retry/DLQ policy and must not be silently converted into a duplicate
operation. Tests may use sentinel secret strings, but all observable output
must prove them absent.

### Rollback

Rollback selection starts from an existing immutable downstream release tag,
not a branch or patch head. The rollback workflow resolves the selected tag to
its commit, loads that revision's manifest/series/Add-on, repeats clean replay
and both target checks, and records selected tag/SHA/provenance reference and
per-target outcome. A non-production rehearsal may stop after those checks.
Production redeploy requires an explicit owner-authorized release operation
with separately supplied credentials and target deployment identifiers. The
two targets remain independently deployable; a failure must identify which
target failed and make no claim that the other changed unless its deployment
identifier confirms it.

## 3.6 User/API flows

### Candidate release CI flow

1. CI checks out one exact downstream commit with no untracked or modified
   files and records its SHA.
2. It validates `release.json`, resolves its exact upstream commit, parses the
   sole ordered series, validates every listed path, and computes patch hashes.
3. It creates a fresh detached worktree from the exact upstream SHA, applies
   the listed patches one at a time, and stops at the first failure.
4. On clean assembly, it runs the patched-Pastebin checks and the Add-on
   checks from their separate pinned inputs, including integration/security
   suites. No deploy command is enabled in this flow.
5. It writes/retains sanitized provenance and reports pass/fail/blocked
   outcomes. Only a fully passing candidate is eligible for the protected tag
   and separately authorized release workflow.

### Webhook retry flow

1. Feishu sends `POST /api/feishu/events`; the Worker checks method/content
   type/body bound and validates the configured verification model before it
   trusts event data.
2. Invalid, malformed, unauthorized, forbidden, unsupported, or oversized
   input receives only the existing stable response/correlation form and
   creates no binding, scope grant, queue message, or Paste operation.
3. A permitted event derives the existing stable request identity and queues
   only normalized safe data. The consumer delegates to existing durable
   idempotency/reconciliation evidence.
4. A repeated same event finds that identity; it must return/ack safely without
   another Paste operation. A transient uncertain outcome follows the existing
   retry/DLQ runbook; a test must prove no credential or raw callback leaks.

### Protected tag and rollback flow

1. An authorized release actor selects the current successful candidate or a
   prior immutable `downstream-v…` tag; CI alone has no authority to select or
   push it.
2. The release/rollback guard resolves that tag's commit, reruns its clean
   validation and checks, and verifies provenance matches the resolved inputs.
3. For a new release only, the actor creates the non-colliding immutable tag
   pointing at that already validated commit, then records the resulting tag.
4. A production deployment/rollback stops for owner authorization and secret
   injection. If authorized, the operator deploys Pastebin and Add-on through
   separate configurations and records safe deployment identifiers.
5. Post-deploy validation and any failed target are reported accurately; no
   automatic rollback, database action, or generated-tree edit is permitted.

Phase 10 adds no public browser API. Existing API routes retain their Phase
6–9 method, request, validation, authorization, idempotency, partial-success,
and sanitized-error contracts.

## 3.7 Data and state model

No product data/lifecycle migration is authorized. Paste content remains in
upstream KV/R2; Add-on storage remains the source for binding/lifecycle,
credential-encryption, browser trust, and durable operation evidence. Phase 10
may add additive, non-secret CI/release metadata only, such as this provenance
shape:

```ts
interface ReleaseProvenance {
  schemaVersion: 1
  generatedAt: string
  upstreamCommit: string
  downstreamCommit: string
  downstreamTag: string | null
  patchSeries: string
  patches: Array<{ path: string; sha256: string }>
  assembledHead: string
  assembledTree: string
  targets: Record<"patchedPastebin" | "feishuAddon", TargetResult>
}
interface TargetResult {
  status: "passed" | "failed" | "blocked"
  checks: Array<{ name: string; status: "passed" | "failed" | "blocked" }>
  artifactId: string | null
  deploymentId: string | null
}
```

The artifact is an evidence record, not an authority for release eligibility,
credentials, product state, or rollback permissions. Its location and retention
must be documented by the implementing PHASE/TODO: CI artifacts must have a
defined retention window; a release's final provenance must be retained with
the tagged release or durable release record. Safe hashes/correlation IDs are
allowed; secrets and raw bodies are not.

## 3.8 Security and trust boundaries

Release automation is a trust boundary. Pull-request validation uses read-only
repository permissions and no deploy/OAuth/Cloudflare/credential secrets. It
must not print environment dumps or command-line secret arguments, upload
unredacted logs, or execute untrusted external PR code with privileged secrets.
Any downstream-only workflow must use least privilege, pinned actions, and
safe artifact paths; a modification to an upstream-owned existing workflow is
not authorized by this docs SPEC and would require the explicit patch process.

The Add-on browser/server boundary remains unchanged: credentials, management
passwords, Feishu tokens, session/CSRF material, raw tenant/open/chat/scope
identifiers where avoidable, credential ciphertext, and raw upstream errors
remain backend-only. Sentinel fixtures must cover API success/error bodies,
exceptions, structured logs/telemetry adapters, webhook and queue messages,
test snapshots/reports, provenance JSON, workflow annotations, and retained
artifacts. Tests assert absence of each sentinel and stable sanitized codes.

Webhook input remains untrusted until configured verification/decryption and
authorization succeed. CI tests must not weaken raw-body validation, tenant/
app constraints, queue/DLQ fail-closed configuration, server-derived scope,
or durable idempotency/reconciliation semantics. The release job must not turn
DLQ recovery into automatic destructive replay.

## 3.9 Compatibility

The release contract preserves D-018 and D-021–D-025: old timed expiration
and the generic `e=never`/`e=max` patch behavior replay from the pinned base;
patch ordering remains explicit; the Add-on remains a separate build target.
Release candidates whose pinned upstream SHA or patch artifacts no longer
replay fail closed rather than falling back to a newer upstream ref or moving
patch branch.

All Phase 5–9 public contracts remain compatible: GFM task behavior, the three
explicit completion actions, authoritative countdown, Restore ordering,
separate Batch selectors, and non-transactional batch responses do not change.
Existing webhook consumers retain the documented event route and retry/DLQ
semantics. New provenance fields are versioned and additive; consumers must
reject unsupported schema versions rather than infer missing security/release
facts. No production data migration or fallback conversion is authorized.

## 3.10 Failure behavior

| Failure                                                                                                      | Required behavior                                                                                                    |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Dirty/unpinned checkout, malformed manifest, missing upstream commit, invalid/duplicate/missing series entry | Fail before assembly; emit sanitized diagnostic and no tag/deploy.                                                   |
| Patch replay failure                                                                                         | Stop at first patch; abort/remove generated worktree; no build/deploy/manual repair.                                 |
| One target check fails/blocks                                                                                | Record that target's safe result; candidate fails; no success/tag/deploy claim.                                      |
| Provenance generation/retention fails                                                                        | Candidate fails closed; do not call it reproducible or tag/deploy it.                                                |
| Tag collision or tag/SHA mismatch                                                                            | Refuse mutation and escalate to authorized release actor; never retarget/force a tag.                                |
| Invalid/repeated webhook                                                                                     | Reject invalid input before effects; duplicate uses durable identity and produces no second Paste effect.            |
| Queue/storage/upstream uncertainty                                                                           | Preserve existing durable reconciliation/retry/DLQ path; do not redispatch blindly.                                  |
| Rollback validation/deployment failure                                                                       | Report selected tag and per-target safe failure; no claim of completed rollback and no automatic destructive repair. |

CI cleanup must remove temporary worktrees even on failed replay while retaining
safe diagnostics/provenance when possible. A blocked external secret/deploy
operation is a STOP, not a test failure that can be bypassed by changing
security controls.

## 3.11 Acceptance criteria

- [ ] A downstream candidate rejects dirty checkout, invalid manifest/noncommit
      pin, unsafe/duplicate/missing series entries, and unlisted-patch
      auto-application before release assembly.
- [ ] The complete series is replayed exactly in `series` order from the exact
      pin in a fresh detached worktree; first failure stops assembly; no
      `--3way` command/path and no manual generated-tree mutation is possible.
- [ ] Both independent targets run required checks from pinned inputs; a failed
      or blocked target prevents release success, tag eligibility, and deploy.
- [ ] Versioned provenance records exact upstream/downstream SHA, tag state,
      ordered patch hashes, assembled refs, check outcomes, and safe optional
      identifiers; it contains none of the tested sentinel secrets/raw errors.
- [ ] A protected, immutable `downstream-vYYYY.MM.DD.N` tag can only name the
      validated clean downstream commit; collision/mismatch is rejected.
- [ ] Controlled integration tests prove Phase 5–9 create/repeated-update,
      archive/delete, partial batch, authoritative expiry, Restore, and
      missing/expired reconciliation without live production dependencies.
- [ ] Webhook tests prove valid handling, invalid rejection, safe same-event
      retry/concurrent delivery, correct binding identity, and zero credential
      leakage while retaining the existing DLQ recovery boundary.
- [ ] Sentinel-secret tests cover responses, error/log/telemetry paths,
      webhook/queue payloads, provenance, reports, annotations, and artifacts.
- [ ] A non-production rollback rehearsal resolves a prior tag and fully
      rebuilds/revalidates both targets from that tag's committed inputs.
- [ ] Build/deploy, patch, security, testing, Add-on operational, and planning
      documentation are reviewed and updated together; current-HEAD CI and
      AI Review Bot gates remain required for every implementation PR.

## 3.12 Test specification

| Observable                        | Tests                                                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Manifest/series/replay guardrails | Script/unit fixture tests: dirty tree, malformed/noncommit pin, comments/blanks, unsafe/duplicate/missing entry, unlisted patch ignored, exact sequential replay, first conflict, cleanup, and negative scan/assertion for `--3way`. |
| Independent source builds         | CI/integration harness verifies patched-upstream and Add-on test/type/lint/format/build commands run from their pinned inputs; intentional target failure blocks candidate.                                                          |
| Provenance/tag                    | Deterministic fixture tests verify schema, SHA-256, ordered paths, exact SHA/tag matching, null unavailable IDs, secret absence, retention publication, tag collision/mismatch rejection, and no PR-CI tag/deploy action.            |
| Phase 5–9 integration             | Local/mock upstream + Worker/frontend harness covers create/repeat update, three single actions, mixed batch result/retry selection, `expiresAt`, Restore cancellation, and missing/expired reconciliation.                          |
| Webhook retry                     | Raw valid verification/event, invalid signature/token/encryption/config rejection, same event duplicate/concurrent delivery, queue failure/retry/DLQ classification, correct binding, and no duplicate Paste effect.                 |
| Security leakage                  | Sentinel secret fixtures assert nonappearance in success/error JSON, logs/telemetry, queue/DLQ-safe records, snapshots, provenance, CI reports/annotations/artifacts; negative browser authority tests regress.                      |
| Rollback                          | Non-production fixture selects prior tag, validates its clean checkout/pin/series, rebuilds both targets, validates provenance, and asserts a failed stage reports no successful rollback.                                           |

Mechanical hardening changes follow RED → GREEN → REFACTOR → REGRESSION where
executable: add the named negative/contract test first, observe the guardrail
missing, implement the smallest guardrail, then run focused and broad release
checks. For a genuinely non-executable workflow/documentation wiring change,
the implementation PR records `TDD: N/A`, why a RED test is not meaningful,
and actual alternative validation (syntax/schema/dry-run/fixture inspection).
No PR may claim TDD evidence that was not observed.

## 3.13 Open questions and STOP conditions

No unresolved product decision is known for Phase 10 planning. The PHASE/TODO
must select concrete workflow/artifact tooling only if it preserves this
contract and ownership boundary.

STOP and obtain explicit owner direction before: production deployment or
rollback; creating/pushing release tags; using/provisioning/rotating any
production or CI credential; destructive migration/reset/queue-DLQ operation;
changing Phase 5–9 observable/API/security/trust behavior; adding product scope
beyond Phases 5–10; modifying PR #5, `upstream-sync`, or `goshujin`; any
upstream mirror rewrite; an AI-review unavailable override; or disposition of a
blocking review finding. A required upstream-owned workflow/dependency/source
change is also STOP pending its explicit generic patch path and review plan.

## Internal consistency review

Reviewed against [Phase 10 PLAN](phase10-plan.md), `AGENTS.md` §§2, 4–8,
16–18, and 20; D-001–D-003, D-007–D-008, D-010–D-018, D-021–D-026, and D-030;
`docs/IMPLEMENTATION_ORDER.md` Phase 10;
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§9–10.7;
`docs/BUILD_DEPLOY.md`; `docs/PATCH_AND_UPSTREAM.md` §§7–14;
`docs/SECURITY.md`; `docs/TESTING.md` §§1 and 8–14; and
`docs/REPO_AND_GIT.md`. It resolves the PLAN's tag, provenance, rollback,
CI-boundary, secret-test, and webhook-retry questions without changing the
Phase 5–9 contracts. It preserves immutable release inputs, explicit
fail-closed replay, separate build/deploy targets, server-only secrets, and
D-030 stop conditions. PHASE/TODO planning may begin next under continuous
execution; implementation remains unauthorized until those durable artifacts
are complete. No current STOP condition is triggered by this docs-only SPEC.
