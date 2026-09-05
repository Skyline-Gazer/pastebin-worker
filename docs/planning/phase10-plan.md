# Phase 10 — Release hardening PLAN

Status: CONTINUOUS-MODE PLAN READY AFTER INTERNAL CONSISTENCY REVIEW.

Implementation has NOT started.

## Authorization and baseline

This is an in-scope planning artifact for roadmap Phase 10 under **Owner
Delegated Continuous Execution** (D-030) and
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §10.1.1. The baseline is
`downstream/main` at `cc7655b322680ee652a22c0dd93618c52ba1133e`, after Phase
9 completed through PR #42. It plans release hardening only; it does not
authorize a production deployment, destructive migration, work on PR #5,
`upstream-sync`, or a `goshujin` rewrite.

`AGENTS.md` §18 permits the normal owner pauses for PLAN/SPEC/PHASE/TODO only
within D-030's bounded roadmap delegation. It does not permit silent product,
API, security, trust-boundary, or acceptance-criteria drift. The Phase 10 SPEC
must therefore settle the release-contract details identified below before
implementation begins.

Phases 6–9 are complete product-contract inputs, not targets for redesign:
they establish the Add-on browser trust boundary, lifecycle behavior, separate
Batch Mode selectors, and server-orchestrated partial-success batch mutation.
Phase 10 validates and releases those contracts reproducibly; it must not
change their user-visible semantics merely to make release automation easier.

## Objective

Define the Phase 10 release-hardening contract for reproducible downstream
release assembly and rollback: E2E/integration, secret-leakage, and webhook
retry coverage; exact upstream pin verification; full ordered patch replay CI;
machine-readable release provenance; downstream release tagging; rollback from
a prior release tag; and a complete documentation review.

## Context

The product has two independently built deployment targets: patched Pastebin
and the Feishu Add-on. `docs/BUILD_DEPLOY.md` §§1–7 require immutable release
inputs, a clean checkout, an ephemeral patched-upstream worktree, sequential
`git am` replay, and independent target builds. Its §§8–10 require provenance,
tag-based rebuild/redeploy rollback, and retained ownership separation between
the two Cloudflare deployments.

`docs/PATCH_AND_UPSTREAM.md` §§7–13 makes exported patch files plus the
explicit `downstream/patches/series` the release contract. Replay starts at the
manifest's exact upstream commit, follows `series` top to bottom, fails closed
at the first error, and must never use automatic three-way conflict guessing.
`docs/TESTING.md` §§11–14 requires the patch compatibility gate, release/build
checks, upstream-API integration coverage, and webhook verification/retry
coverage. `docs/SECURITY.md` §§1–3 and §7 prohibit management-password,
credential, token, secret-bearing URL, and raw upstream-error exposure while
requiring webhook verification and idempotent retry handling.

## Assumptions and verification

| Assumption                                                                                                                    | Verification method / current basis                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 9 is complete and Phase 10 can begin from the merged downstream baseline.                                               | Verify `git rev-parse HEAD` is `cc7655b322680ee652a22c0dd93618c52ba1133e` and merge history identifies PR #42; do not depend on an unmerged phase branch.                                                  |
| The release manifest, patch series, and scripts are the intended existing release inputs.                                     | Inspect `downstream/release.json`, `downstream/patches/series`, and `downstream/scripts/{check-patches.sh,build-downstream.sh}`; confirm exact-pin and explicit-series behavior before specifying changes. |
| Release replay must be reproducible without patch branch heads.                                                               | Verify `BUILD_DEPLOY.md` §§2–5 and `PATCH_AND_UPSTREAM.md` §§7–13: pinned upstream SHA plus exported listed patch files are authoritative.                                                                 |
| Existing Add-on tests can be extended with local/mock upstream and webhook fixtures rather than a live production dependency. | Inspect test tooling, Worker route composition, Paste-client seams, webhook handler, and current fixtures; Phase 10 E2E/integration must remain deterministic and safe for CI.                             |
| A downstream release tag can identify the exact downstream source used for a release.                                         | Verify repository tag/release conventions and release automation capabilities during the SPEC; the tag must correspond to the committed downstream release revision, not a moving branch.                  |
| Current product contracts remain fixed inputs.                                                                                | Verify D-010, D-014, D-015 and Phase 6–9 docs/tests; release hardening may expose a defect but must stop/escalate rather than silently redesign behavior.                                                  |

## Non-goals

- No redesign or expansion of Batch Mode or Phases 6–9 product, lifecycle,
  browser-trust, webhook, or API contracts.
- No live production deployment in this planning artifact and no unapproved
  deployment as part of Phase 10 implementation planning.
- No destructive migration, manual repair of a generated integration tree, or
  rollback by reversing individual production patch commits.
- No PR #5, `upstream-sync`, `goshujin`, or upstream mirror rewrite work.
- No new product scope, second Paste-content store, browser-visible management
  credentials, or coupling of the Pastebin and Add-on deployment artifacts.

## Risks and unresolved implementation questions

- **Release tag authority and timing:** The SPEC must define who/what creates a
  downstream release tag, its immutable target revision, naming/version rule,
  collision behavior, and whether tag creation is a protected manual release
  step or an authorized CI action. It must not assume authority to push a tag.
- **Rollback inputs and verification:** `BUILD_DEPLOY.md` §9 defines rollback
  as rebuild/redeploy from a prior tag. The SPEC must define selection,
  manifest/provenance lookup, clean-checkout and replay validation, target
  ordering, deployment identifiers, failure reporting, and post-rollback
  verification without inventing a live-production operation here.
- **CI environment boundaries:** The SPEC must determine which mocked/local
  upstream, Worker, and webhook harnesses can exercise real route composition
  without production credentials; required secrets must be injected only via
  CI secret mechanisms and never printed in artifacts or logs.
- **Secret-leakage test surface:** Existing APIs, error paths, logs, generated
  provenance, test snapshots, CI annotations, and webhook retry failures must
  be inventoried. The SPEC must choose safe sentinel-secret fixtures and an
  assertable logging/telemetry seam without recording real secret values.
- **Webhook retry semantics:** `SECURITY.md` §3 and `TESTING.md` §14 require
  idempotency but leave event identity, replay window/retention, concurrent
  retry behavior, and safe response behavior to the implementation contract.
  The SPEC must make these explicit while preserving the existing webhook
  product contract.
- **Provenance schema and retention:** The required fields are known, but the
  exact machine-readable schema, output location, checksum algorithm, release
  artifact retention, and how unavailable deployment identifiers are marked
  must be specified before implementation.

No unresolved owner product decision is currently identified. If the SPEC
requires new observable product behavior, an API/security/trust-boundary
change, a destructive migration, a production deployment, PR #5,
`upstream-sync`, or a `goshujin` rewrite, D-030 requires STOP and owner
direction.

## Proposed implementation approach

1. Inspect the release manifest, patch series, existing scripts, CI workflows,
   Add-on test tooling, webhook handler/idempotency store, and Phase 6–9 test
   suites. Produce the Phase 10 SPEC with explicit release inputs/outputs,
   responsibility boundaries, tag and rollback preconditions, provenance
   schema, and non-production test environment.
2. Add RED integration/E2E tests using a controlled local/mock upstream API for
   binding creation and repeated update, single archive/delete, mixed batch
   outcomes, authoritative `expiresAt`, Restore, and missing/expired upstream
   reconciliation, as required by `TESTING.md` §13. Keep tests at the Add-on
   boundary and do not duplicate Paste-body authority.
3. Add RED secret-leakage tests covering browser/API responses, handled errors,
   logs/telemetry seams, webhook paths, generated provenance, and CI-visible
   output. Use sentinel values to prove that management passwords, full
   management URLs, OAuth/session/CSRF material, raw tokens, credential
   ciphertext, and raw upstream errors are absent, per `SECURITY.md` §§1–2, 7.
4. Add RED webhook tests for valid verification/event handling, invalid
   verification rejection, duplicate/concurrent retry idempotency, correct
   binding resolution, and credential redaction. Implement only the smallest
   durable retry/idempotency support needed to meet the established contract.
5. Harden CI/release scripts so they reject a dirty release checkout; resolve
   the exact manifest upstream SHA; validate every and only `series` entry;
   create a clean temporary worktree; replay the complete ordered series with
   sequential `git am`; stop at the first conflict; and never use `--3way`.
   Run patched-upstream and Add-on checks from those immutable inputs.
6. Generate a machine-readable provenance artifact recording upstream SHA,
   downstream SHA/tag, ordered patch paths and hashes, both target test/build
   outcomes, and deployment identifiers when available. Define downstream tag
   creation and a rollback command/workflow that selects a prior tag and
   rebuilds/redeploys solely from its pinned committed inputs.
7. Review all release, patch, security, testing, Add-on, and operator
   documentation for consistency with the implemented contract. Record TDD
   RED/GREEN/REFACTOR/REGRESSION evidence in the Phase 10 TODO, run required
   checks, and require current-HEAD CI plus the mandatory AI Review Bot Phase
   Review Gate before each implementation PR merge.

## Expected files/components (candidates, not a forced file list)

- `downstream/scripts/check-patches.sh` and `downstream/scripts/build-downstream.sh`
  — exact-pin validation, clean ordered replay, build orchestration, and
  fail-closed release checks; never a hand-edited integration result.
- `downstream/release.json`, `downstream/release.example.json`,
  `downstream/patches/series`, and release metadata/provenance templates —
  immutable inputs and explicit replay/provenance representation.
- Downstream-only CI/release workflow files under `.github/workflows/` and/or
  `downstream/` tooling — release hardening jobs, tag/rollback safeguards, and
  artifact handling. Any change to an existing upstream-owned workflow must
  follow the explicit downstream-patch rule in `AGENTS.md`.
- `downstream/addons/feishu/worker/`, test fixtures, and test suites —
  webhook retry/idempotency and local/mock integration coverage, without
  altering Phases 6–9 contracts.
- `downstream/addons/feishu/tests/` and frontend/Worker test files — E2E or
  integration, secret-redaction, webhook-retry, and regression tests.
- `docs/BUILD_DEPLOY.md`, `docs/TESTING.md`, `docs/PATCH_AND_UPSTREAM.md`,
  `docs/SECURITY.md`, Add-on operational docs, and subsequent Phase 10
  planning artifacts — synchronized release, rollback, CI, and secret-handling
  documentation.

## Validation strategy

- Release/patch gate tests from `TESTING.md` §§11–12 and
  `PATCH_AND_UPSTREAM.md` §§8–11: dirty checkout rejected; exact upstream SHA
  exists; `series` is the sole order source; missing listed entries fail;
  unlisted patches are not applied; full replay occurs sequentially in a clean
  temporary worktree; `git am --3way`/`git apply --3way` are never used; and a
  failed replay blocks build/deployment without manual integration edits.
- Build/provenance checks from `BUILD_DEPLOY.md` §§6–10: both independent
  targets test/typecheck/build from the pinned revision; provenance includes
  upstream and downstream SHA/tag, ordered patch paths/hashes, target results,
  and deployment IDs when available; unavailable fields are explicit rather
  than fabricated.
- E2E/integration checks from `TESTING.md` §13: controlled upstream API tests
  cover create binding, same-Paste update, archive, delete, mixed batch result,
  authoritative expiry capture, Restore, and missing/expired reconciliation;
  existing Phase 6–9 behavior remains unchanged.
- Security tests from `SECURITY.md` §§1–3, 7 and `TESTING.md` §8: sentinel
  secret values never appear in client responses, logs, test reports,
  provenance, CI artifacts, or webhook outputs; invalid webhook verification
  rejects; retries do not duplicate Paste effects; correct binding resolution
  does not disclose management credentials.
- Rollback rehearsal in a non-production controlled environment: select a
  prior downstream release tag, verify its clean/pinned manifest and complete
  replay, rebuild both targets, record the selected provenance, and verify
  failure leaves no claim of successful rollback. No live deployment occurs
  unless separately owner-authorized.
- Regression and governance: run affected Worker/frontend tests, integration
  suites, type/lint/Prettier/build checks, documentation link/reference checks,
  and current-HEAD CI. Record exact TDD evidence; obtain the AI Review Bot
  Phase Review Gate for the latest HEAD, resolve or appropriately escalate
  findings, and never self-merge or self-override a blocking finding.

## Internal consistency review

Reviewed against `AGENTS.md` §§2, 4–8, 16–18 and 20; D-010, D-014, D-015, and
D-030; `docs/IMPLEMENTATION_ORDER.md` Phase 10;
`docs/CHANGE_CONTEXT_AND_REVIEW.md` §§9–10.7; `docs/BUILD_DEPLOY.md` §§1–10;
`docs/TESTING.md` §§8 and 11–14; `docs/PATCH_AND_UPSTREAM.md` §§7–13; and
`docs/SECURITY.md` §§1–3 and 7. The PLAN preserves the Phase 6–9 contracts,
keeps Pastebin/Add-on ownership and deployment targets separate, makes release
inputs immutable and patch replay fail closed, and prohibits secret exposure,
production deployment, destructive migration, PR #5, `upstream-sync`, and
`goshujin` work. No D-030 STOP condition is currently present.

Implementation has NOT started.
