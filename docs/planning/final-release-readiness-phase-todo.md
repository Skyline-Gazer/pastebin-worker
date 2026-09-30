# Final Release Readiness — PHASE/TODO

Status: **DRAFT — OWNER PHASE/TODO APPROVAL REQUIRED**. No implementation has
started. This document is the consolidated implementation approval package;
implementation may begin only after the Owner approves this exact phase/TODO
artifact and it is durably published under the repository workflow.

## Approval record and inputs

The Owner approved these exact SPEC commits on 2026-09-30 for PHASE/TODO
preparation:

- Release Readiness SPEC: `a3680ed943e0b1f0ebb271d4f0a769318fbd3676`.
- OAuth State Consumption SPEC: `87bafdafa2cbbcfd027a9f14739f0725e8ae3692`.

Those commits and their trees were verified locally and remain unchanged. The
SPEC files retain their original draft-status banners and status fields from
before this Owner decision. The approval above supersedes those earlier status
fields for the exact approved SHAs only; this record does not edit or broaden
either SPEC. The Owner approvals authorize phase/TODO preparation, not
implementation.

Parent PLANs:

- Release readiness PLAN: approved at exact commit
  `6c9c926b390a9070c5a7b01fc9acae35e7277d58` for SPEC preparation only. Its
  recorded baseline-pin and tag-protection clarifications are Owner-approved
  amendments; the Release Readiness SPEC at the approved SHA reflects them.
- OAuth state-consumption PLAN: Owner-approved under Decision C on 2026-09-29
  for SPEC preparation only. It preserves historical exploitation as UNKNOWN.

The current remote `downstream/main` is
`c0a2f9c26533685cc782c0d86b076dd6f73cf89f`. All implementation branches must
start from a freshly fetched `downstream/main` after this planning package is
approved; do not start from this planning branch.

## Current evidence and blockers

- The local SPEC commits are not published: GitHub cannot resolve either SHA,
  and no matching `codex/release-sprint-*` remote refs exist. No GitHub CI result
  exists for these local commits.
- PR #191 is still OPEN/DRAFT on remote head
  `8f63bd47c3e10c81b5f28b96520d4a40bb781e36`, with base SHA
  `e300500d0cba6dd486035d33ed304bb409448bd3` and merge state `DIRTY`. It does
  not contain either approved local SPEC commit. Do not force-push or reuse its
  stale head for this package.
- The normal eventual publication route is a fresh branch from refreshed
  `downstream/main`, pushed explicitly to `origin` without force, and a PR
  targeting `downstream/main`. The tracked `downstream/scripts/gh-write.sh`
  currently refuses `gh pr create`; do not bypass it. Publishing needs
  separate Owner authorization for a supported guarded route (for example, an
  approved guard extension or an explicitly authorized GitHub UI route).
- The parent-inclusive tag ruleset query currently returns no applicable tag
  rules; the legacy tag-protection endpoint returns 404. Current tag
  enforcement is `FAIL/NOT_PROTECTED`. Historical tag integrity remains
  `UNKNOWN`; neither status establishes past tampering.
- The exact production tag's own 30-entry source series replayed successfully
  in prior read-only work. Its artifact/provenance-at-release and deployed
  Worker identity remain `UNKNOWN`. The current baseline series has 33 entries
  and must never substitute for the tag's 30-entry series.
- Hosted non-production D1 support for the exact atomic state-consumption
  primitive and concurrent one-winner behavior remains `UNKNOWN`.
- Nothing is executed during this non-mutating planning preparation. RR-04's
  sanitized Actions evidence artifact remains a later implementation deliverable
  after its implementation-sized TODO is prepared and approved. No tag ruleset
  change, log deletion, production configuration change, deployment, tag,
  GitHub Release, or release publication is authorized here.

## Phase dependency order

```text
RR-01 Candidate gate ───────────────→ RR-04 Provenance/artifact ─→ RR-05 Rollback
RR-02 OAuth query redaction ────────┐                         │
RR-03 OAuth state consumption ──────┴─ independent of RR-01 ─┘
                                                                  ↓
                                                final exact-SHA evidence/health audit
```

RR-02 and RR-03 may proceed independently of RR-01 after this PHASE/TODO is
approved. RR-04 must wait until RR-01 has merged and `downstream/main` has been
refreshed. RR-05 must wait for RR-04's retained-evidence contract. RR-03's
implementation is separately gated by its hosted non-production D1 proof.

## RR-01 — Default Release Candidate gate

**Goal:** The default command validates the exact pinned upstream assembly and
both complete targets with isolated dependencies; fixture overrides cannot
certify a candidate.

**Scope and file ownership:**

- A owns `downstream/scripts/release-candidate.sh`,
  `downstream/tests/release-candidate.test.sh`, and
  `.github/workflows/feishu-phase3.yml`.
- A owns `docs/BUILD_DEPLOY.md` §7 and the candidate-gate part of
  `docs/TESTING.md`.
- A must not edit upstream-owned `.github/workflows/pr.yml` or `deploy.yml`.
  The candidate PR workflow must be explicit about the tested candidate SHA;
  it must not silently validate a merge-ref as if it were the PR head.

**Dependencies:** Approved exact Release Readiness SPEC and this PHASE/TODO;
start from refreshed `downstream/main`. Independent of RR-02/RR-03.

**Inputs:** The approved Release Readiness SPEC, refreshed `downstream/main`,
the pinned release manifest and ordered patch series, and the committed lockfiles
for both build targets.

**Deliverables:** Candidate-gate script and regression tests, the corrected
downstream PR workflow, owned build/test documentation, and exact-HEAD CI and
review evidence.

**Expected branch type:** `build/*`.

**Branch/PR:** `codex/build-release-candidate-gate` → PR target
`downstream/main`. Do not reuse remote branch `codex/release-candidate-gate`,
which is attached to stale PR #191.

**TODO:**

1. RED: change the existing stub-`gh`/shell fixtures so empty, set, malformed,
   or hostile caller command overrides cannot fake a successful target; assert
   rejected target commands are never executed and candidate success never
   reports provenance retention or positive tag eligibility.
2. Validate clean committed inputs, exact approved upstream pin, manifest,
   ordered series, duplicate/missing/unsafe entries, pinned commits, and
   fail-closed patch replay. Assert neither target starts after preflight or
   replay failure.
3. Isolate dependencies: assemble upstream and install from its own committed
   lockfile; validate the Add-on from the exact candidate tree and its committed
   workspace lockfile. Prove caller `node_modules`, `.bin`, `PATH`,
   `NODE_PATH`, and working directory cannot affect child argv, cwd, or
   environment.
4. Run the Pastebin frontend prerequisite before downstream validation. Run
   complete Add-on Worker and frontend validation, including a non-deploy dry
   run build.
5. Test bounded sanitized failure diagnostics before temporary-output cleanup:
   stable stage and exit status, 80-line/8-KiB bounds, truncation evidence,
   sentinel/URL/OAuth/header redaction, suppression of unclassifiable output,
   and child failure propagation.
6. Remove no-op `true` overrides from `feishu-phase3.yml`; verify the workflow
   exercises the real default gate and performs no artifact upload or release
   action.
7. Keep the candidate/provenance interface stable for RR-04, including
   `CANDIDATE_STATUS`, both target statuses, assembled HEAD and tree identity.
8. Update owned docs and retain RED/GREEN evidence in the implementation PR.

**Acceptance criteria and tests:** Focused `downstream/tests/release-candidate.test.sh`,
the unoverridden default candidate command, and applicable PR workflow checks
must pass on the actual PR HEAD. Current workflow contexts observed are
`Feishu internal services / feishu-validation` and
`PR Tests / test`, `coverage-goshujin`, and `report-coverage`; verify the exact
current workflow results for each PR. The CI workflow must bind results to the
actual candidate SHA and report both targets.

**Risks:** The current workflow's checkout ref is implicit; resolve exact-HEAD
semantics. Branch-protection lookup did not establish required-check contexts,
so do not infer that CI is optional. No success here implies provenance,
tag eligibility, deployment, or release authorization.

**Exit criteria:** Both targets pass through the unoverridden default gate for
the exact clean candidate SHA; failures are bounded and sanitized; no no-op
target override remains; required current-HEAD CI and the full Phase Review
Gate are satisfied; no actionable findings remain; PR merges and
`downstream/main` is refreshed before RR-04 starts.

## RR-02 — OAuth query-string redaction

**Goal:** Track and test `observability.redact_query_string=true`, with
fail-closed read-only drift detection. Historical records are not remediated.

**Scope and file ownership:** C owns
`downstream/addons/messaging/wrangler.toml`,
`downstream/addons/messaging/tests/wrangler-contract.spec.ts`, a narrow drift
checker and its focused tests, and the OAuth-redaction section of
`docs/SECURITY.md`. C does not edit `docs/BUILD_DEPLOY.md` or
`docs/TESTING.md`; if additional wording is needed there, provide a patch for
the designated document owner to integrate without concurrent file edits.

**Dependencies:** Approved Release Readiness SPEC and this PHASE/TODO. May run
in parallel with RR-01 and RR-03 after PHASE/TODO approval.

**Inputs:** The approved Release Readiness SPEC, refreshed `downstream/main`,
the locked Wrangler 4.129.0 schema, tracked configuration overlays, and the
documented Cloudflare API contract.

**Deliverables:** Tracked query-string redaction configuration, schema and
drift-contract tests, a narrow read-only drift checker, and owned security
documentation.

**Expected branch type:** `fix/*`.

**Branch/PR:** `codex/security-oauth-query-redaction` → PR target
`downstream/main`. Keep this PR distinct from RR-03 and from any production
deployment authorization.

**TODO:**

1. Verify the locked Wrangler 4.129.0 schema/parser/serializer contract and
   assert the tracked setting is exactly true in each applicable overlay.
2. Add tests rejecting absent, false, or misspelled values and checking the
   generated/deployment configuration contract.
3. Add mocked read-only Cloudflare drift tests: exact match `PASS`, explicit
   mismatch `FAIL`, unavailable/malformed/unauthorized evidence `UNKNOWN`.
4. Document that this protects future logs only. Do not inspect or delete
   retained logs, change live settings, or perform a post-deployment probe.
5. Ensure all tests and diagnostics contain no raw OAuth values, cookies,
   tokens, or other secrets.

**Acceptance criteria and tests:** Locked-schema and overlay tests, drift-check
fixtures, focused security tests, applicable current-HEAD CI and review gate
pass. No production access/configuration operation occurs. Post-deployment
verification remains separately gated by deployment authorization.

**Risks:** The tracked setting may be unsupported by an overlay or the live API
may not expose reliable drift evidence; distinguish `FAIL` from `UNKNOWN`, and
make no historical-log remediation claim.

## RR-03 — Atomic OAuth state consumption

**Goal:** Consume one valid OAuth state at most once under concurrent callbacks
and preserve existing provider/session/error behavior.

**Scope and file ownership:** C owns
`downstream/addons/messaging/worker/browser-store.ts`,
`downstream/addons/messaging/worker/browser-auth.ts`, focused callback tests
under `downstream/addons/messaging/tests/`, and the OAuth state section of
`docs/SECURITY.md`. C-R and C-S are distinct PRs and deployment decisions;
serialize edits to the shared `docs/SECURITY.md` so only one PR edits it at a
time.

**Dependencies:** Approved OAuth SPEC and this PHASE/TODO. Before any database
implementation, pass the hosted non-production D1 compatibility gate below.
This phase is independent of RR-01 and RR-02, subject to the gate.

**Inputs:** The approved OAuth State Consumption SPEC, refreshed
`downstream/main`, existing callback/session behavior, local Workers D1, and an
already-existing isolated hosted non-production D1 database.

**Deliverables:** Only after the hosted/local one-winner gate passes: atomic
state-consumption code, deterministic callback/session regression tests, owned
security documentation, and exact-HEAD CI/review evidence. Otherwise, a
sanitized gate result with compatibility left `UNKNOWN` and no implementation.

**Expected branch type:** `fix/*`.

**Branch/PR:** `codex/security-oauth-state-single-use` → PR target
`downstream/main` after the gate passes. If hosted D1 validation is unavailable
or ambiguous, do not create an implementation PR; keep compatibility and
exploitation status `UNKNOWN`.

**TODO:**

1. In the local Workers D1 runtime, write a deterministic barrier test proving
   the current separate SELECT/DELETE race before implementation.
2. Using synthetic rows on an existing isolated Cloudflare-hosted
   non-production D1 database, validate the exact candidate statement/result
   and concurrent cross-call one-winner semantics. Do not use production data.
   If no isolated database exists and one must be provisioned, obtain explicit
   authorization first.
3. If either hosted or local validation cannot prove exactly one successful
   consumer, stop before DB code changes and report the blocker. Do not infer
   `DELETE ... RETURNING` support from SQLite or a different D1 primitive.
4. After proof, implement the smallest approved atomic operation with RED/GREEN
   evidence. Add deterministic tests for exactly one consumer and one eligible
   session, all competitors rejected, no duplicate session, replay/missing/
   expired/invalid state rejection, both provider paths, provider exchange or
   identity failure without a session, and mapped consume/session-store errors.
5. Confirm no migration or session/CSRF boundary change is introduced. Keep
   secrets out of test diagnostics and update the owned security docs.

**Acceptance criteria and tests:** Hosted and local D1 evidence proves the one-winner
contract; callback/session tests and focused checks pass on exact PR HEAD;
required CI and review settlement pass; no production database operation,
credential rotation, or session invalidation occurs.

**Risks:** D1 statement support or concurrent cross-call behavior may remain
unverified; missing, ambiguous, or failing evidence blocks implementation and
leaves compatibility and exploitation status `UNKNOWN`.

## RR-04 — Durable candidate provenance and artifact identity

**Goal:** Persist sanitized provenance and verify exact workflow artifact
identity/retention after RR-01's candidate gate is merged.

**Scope and file ownership:** B owns
`downstream/scripts/release-provenance.sh`,
`downstream/scripts/release-tag-eligibility.sh`,
`downstream/tests/phase10-provenance-tag.test.sh`, a new owner-triggered
workflow `.github/workflows/release-candidate-provenance.yml`, and the
provenance/artifact sections of `docs/BUILD_DEPLOY.md` (§§8–9) and
`docs/TESTING.md`. B must not edit RR-01's candidate script or
`feishu-phase3.yml`. RR-01 merges before B edits the shared build/test docs.

**Dependencies:** RR-01 merged; refresh `downstream/main`; consume A's stable
candidate result and exact assembled HEAD/tree. No use of uncommitted inputs.

**Inputs:** The merged RR-01 candidate contract and refreshed target branch,
exact committed candidate identity, Actions workflow/run-attempt evidence, and
the approved Release Readiness SPEC.

**Deliverables:** Sanitized provenance and checksum contract, an owner-triggered
Actions evidence workflow with verifiable artifact identity/retention, updated
owned build/test documentation, and exact-HEAD CI/review evidence.

**Expected branch type:** `build/*`.

**Branch/PR:** `codex/build-release-provenance-artifacts` → PR target
`downstream/main` from refreshed `downstream/main`.

**Acceptance criteria and tests:** Upload/readback contract fixtures cover success,
failure, digest, retention, exact run attempt, and all negative/mismatch cases.
The workflow must not deploy or publish a release. Exact-HEAD CI/review passes;
the sanitized Actions artifact is independently readable/verifiable for the
required retention; provenance status is not inferred from a local file or
summary. Tag eligibility remains blocked unless every SPEC requirement is
verified.

**Risks:** Actions API evidence may not identify the artifact's run attempt or
retention reliably; reject ambiguous identity and keep eligibility blocked.
Because the repository is public, every artifact and run summary must be safe
for repository readers.

**TODO timing:** Prepare the implementation-sized TODO only after RR-01 merges
and the target branch is refreshed, as required by §10.1.

## RR-05 — Production-tag source reconstruction and rollback evidence

**Goal:** Make rollback rehearsal reflect the selected tag's own source inputs
and keep source reconstruction separate from historical integrity and runtime
rollback readiness.

**Scope and file ownership:** B owns
`downstream/scripts/release-rollback-rehearsal.sh`,
`downstream/tests/phase10-rollback-rehearsal.test.sh`, and rollback guidance in
`docs/BUILD_DEPLOY.md` §9. This starts only after RR-04 has merged; B serializes
its edits to `docs/BUILD_DEPLOY.md` and `docs/TESTING.md` after RR-01/RR-04.

**Dependencies:** RR-04 merged and `downstream/main` refreshed. Use the
annotated tag `downstream-v2026.09.10.1` and its own pinned manifest/30-entry
series. Never use the current candidate's 33-entry series for this historical
reconstruction.

**Inputs:** The merged RR-04 provenance contract, refreshed `downstream/main`,
the selected annotated production tag and its own manifest/30-entry series, and
trusted expected identities where available.

**Deliverables:** A read-only source reconstruction and rollback-evidence
rehearsal, separately labeled evidence for historical integrity and runtime
identity, owned rollback documentation, and exact-HEAD CI/review evidence.

**Expected branch type:** `build/*`.

**Branch/PR:** `codex/build-release-rollback-evidence` → PR target
`downstream/main` from refreshed `downstream/main`.

**Acceptance criteria and tests:** Historical and current series fixtures cannot be
confused; tag movement, manifest/hash mismatch, missing provenance, absent tag
protection, and unknown runtime identity block PASS as specified. Read-only
rehearsal makes no deployment/tag mutation. Required CI and review gate pass on
exact PR HEAD. Overall release readiness remains blocked if tag protection or
other required evidence is unresolved. The bounded Owner-authorized Phase 4
health audit occurs only after all required implementation PRs merge; missing
evidence stays `UNKNOWN`, with no writes, cleanup, or OAuth/login route probes.
Post-deployment checks remain separately gated by deployment authorization.

**Risks:** The tag's historical release-time identity and deployed Worker
identity may remain `UNKNOWN`; source reconstruction alone cannot establish
historical integrity or runtime rollback readiness. Current tag protection
failure blocks overall readiness.

**TODO timing:** Prepare the implementation-sized TODO only after RR-04 merges
and the target branch is refreshed, as required by §10.1.

## Shared ownership and review gates

- One workstream owns each physical file at a time. A owns the candidate shell
  test and `feishu-phase3.yml`; B owns the new artifact workflow and
  provenance/rollback tests; C owns OAuth config/code tests.
- A owns `docs/BUILD_DEPLOY.md` §7 and candidate documentation first; B owns
  §§8–9 and release evidence documentation only after A merges. A owns the
  candidate-testing section of `docs/TESTING.md`; B edits release-provenance
  sections after A merges. C writes only the relevant `docs/SECURITY.md`
  sections, with C-R and C-S serialized for that shared file.
- Current target tree uses `downstream/addons/messaging`; all candidate file
  paths resolve against exact `downstream/main`. Do not rename or relocate the
  Add-on as part of these approved SPECs.
- Every implementation PR must run all applicable CI on exact current HEAD,
  reach terminal settlement for supported review channels, fix all actionable
  findings, and satisfy the normal 2-of-3 reviewer quorum before merge. Local
  subagent reviews are planning evidence only, not official bot votes. Any new
  commit invalidates exact-HEAD review/CI evidence.
- No FT-14/15, automatic merge, quorum override, Project/Issue mutation,
  production configuration change, log deletion, credential/session action,
  deployment, tag, GitHub Release, or release publication is in scope.

## Separate Owner decision: tag protection

Current evidence is `FAIL/NOT_PROTECTED`. Before tag eligibility can pass, the
Owner must separately authorize an active tag ruleset for
`refs/tags/downstream-v*` that restricts creation, update, and deletion. The
approved SPEC requires no applicable bypass for release automation; this is
not an open Owner choice, and RR-04 must fail closed if such a bypass exists.
This PHASE/TODO does not create or change that policy. Until a separately
authorized policy is applied and read back, tag eligibility and rollback
readiness stay blocked.

## Final verification after implementation PRs

After all approved implementation PRs merge and `downstream/main` is refreshed:

1. Select the exact final candidate SHA; run the documented default candidate
   gate and all required CI for that SHA. Any later commit requires complete
   revalidation.
2. Verify provenance/artifact readback, retention, patch hashes, rollback
   evidence, Wrangler contract, and OAuth D1 gate results. Do not report a
   release-ready candidate while any required value is FAIL or UNKNOWN.
3. Perform the Owner-authorized bounded, read-only pre-release Phase 4 health
   audit only after the required PRs merge. Report unavailable production
   access as UNKNOWN; make no production mutations.
4. Do not create a tag, GitHub Release, public release asset, or release
   publication. The sanitized Actions CI evidence artifact required by RR-04
   remains in scope. A later release/deployment requires a separate explicit
   Owner authorization; only then may post-deployment checks run.

## Approval boundary

```text
RELEASE_SPEC=OWNER_APPROVED_EXACT_SHA_a3680ed943e0b1f0ebb271d4f0a769318fbd3676
OAUTH_SPEC=OWNER_APPROVED_EXACT_SHA_87bafdafa2cbbcfd027a9f14739f0725e8ae3692
PHASE_TODO=OWNER_APPROVAL_REQUIRED
IMPLEMENTATION=NOT_STARTED_PHASE_TODO_APPROVAL_REQUIRED
REMOTE_PUBLICATION=NOT_AUTHORIZED
TAG_RULESET_CHANGE=SEPARATE_OWNER_DECISION_REQUIRED
PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED
RELEASE_TAG_PUBLICATION=NOT_AUTHORIZED
```
