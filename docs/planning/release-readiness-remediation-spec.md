# Release-readiness remediation SPEC

Status: **SPEC READY FOR OWNER REVIEW**. This is a behavioral and release
contract, not SPEC approval or implementation authorization.

Parent PLAN: [Release-readiness remediation PLAN](release-readiness-remediation-plan.md),
approved by the Owner on 2026-09-29 at exact commit
`6c9c926b390a9070c5a7b01fc9acae35e7277d58`. Approval scope is SPEC preparation
only. SPEC approval is still required before PHASE/TODO preparation.

```text
PR191_PLAN=APPROVED
PR191_SPEC_STATUS=READY_FOR_OWNER_REVIEW
PR191_SPEC_APPROVAL=REQUIRED_NOT_GRANTED
PR191_PHASE_TODO=NOT_PREPARED
PR191_IMPLEMENTATION=NOT_STARTED
PRODUCTION_CONFIGURATION_CHANGE=NOT_AUTHORIZED
DEPLOYMENT_TAG_PUBLICATION_MERGE=NOT_AUTHORIZED
```

## 3.1 Problem statement

The current release-candidate path can substitute successful no-op commands
for both target builds, uses dependencies from the caller checkout for the
assembled upstream tree, omits part of the Add-on validation, and discards
failing command output. Its provenance script cannot distinguish default
validation from overrides or prove a retained artifact's identity. Current
rollback guidance does not reflect the existing production tag. The tracked
Worker observability configuration also lacks query-string redaction, while a
previous audit found OAuth callback query material in historical invocation
records.

The release process needs a reproducible, non-deploying default gate, durable
evidence tied to exact source and artifact identities, a valid read-only
production-tag rehearsal, future-log redaction, post-deployment configuration
and version checks, and final read-only health checks.

## 3.2 Goals

- Make only the default, unoverridden candidate command capable of reporting a
  release candidate as passed.
- Validate the exact pinned upstream assembly and downstream Add-on using their
  own committed inputs and lockfiles.
- Preserve useful, sanitized stage failure evidence.
- Retain provenance and checksums with verifiable GitHub Actions artifact and
  run identity.
- Rehearse against an existing immutable production tag and explain what a
  source tag can and cannot prove about a deployed Worker.
- Require `observability.redact_query_string=true` in tracked configuration,
  test overlays for drift, and define read-only live verification.
- Define post-deployment observability and final read-only production health
  acceptance without performing either during this SPEC work.

## 3.3 Non-goals

- No implementation, production configuration edit, Cloudflare API mutation,
  deployment, rollback, production request, tag creation/movement/deletion,
  GitHub Release, artifact publication, merge, cleanup, D1 write, or Queue
  operation is authorized by this SPEC.
- Do not remove or rewrite historical logs. Query redaction protects future
  records; it does not remediate already-retained records.
- Do not rotate credentials or invalidate sessions based only on the known
  invocation-URL exposure. Callback/session compromise is not established.
- Do not include FT-14/15, project or issue mutation, or historical fixture
  reconstruction as a release implementation task.
- Do not claim that a source tag alone is a deployable runtime rollback
  artifact, or that a rehearsal is an actual rollback.

## 3.4 Current behavior

- `downstream/scripts/release-candidate.sh` assembles the pinned upstream SHA
  with the ordered patch series, but its default commands use
  `$ROOT/node_modules`, accept environment command overrides, and delete
  captured target output on both success and failure. The current Add-on
  command runs from the Add-on directory despite root-relative tooling paths.
- `.github/workflows/feishu-phase3.yml` runs the full Add-on checks, then
  invokes the release candidate script with both target commands set to
  `true`. That invocation is an assembly smoke test, not a release gate.
- `downstream/scripts/release-provenance.sh` requires passing candidate target
  status but does not record whether default commands ran. Its retention hook
  defaults to `:` and it prints `retained`; no artifact ID, URL, or digest is
  supplied by that script.
- `downstream/scripts/release-rollback-rehearsal.sh` validates the selected
  tag in a detached worktree and reports `DEPLOY_CLAIM=no`. The repository has
  production tag `downstream-v2026.09.10.1` and preceding tag
  `downstream-v2026.09.07.1`; older documentation saying no production tag
  exists is stale. The historical Phase 10 statement remains historical
  context.
- The committed lockfile at the approved PLAN commit resolves Wrangler
  `4.129.0`. Its installed config schema defines
  `observability.redact_query_string` as a boolean, and its config serializer
  maps the property to the API field. The globally installed Wrangler
  `4.141.0` schema also contains it. The tracked
  `downstream/addons/messaging/wrangler.toml` does not currently set it.
  Wrangler's current configuration reference does not enumerate this field,
  so implementation must retain the locked-schema evidence and API-contract
  test as the compatibility source of truth.
- Cloudflare documents the Worker edit API field as
  `observability.redact_query_string`, which removes query strings from
  request URLs in logs and traces. The corresponding read API returns Worker
  observability settings and accepts `Workers Scripts Read` permission. The
  version/deployment read APIs expose version identity and active traffic
  percentages.
- A prior audit reported the live Worker setting as `false`. Current live
  configuration and logs were not re-read during SPEC preparation because
  Cloudflare authentication is unavailable; current state is UNKNOWN.

Evidence: [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/),
[Cloudflare Worker edit API](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/edit/),
[Cloudflare Worker read API](https://developers.cloudflare.com/api/typescript/resources/workers/subresources/beta/subresources/workers/methods/get/),
[Worker deployments API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/),
[Worker versions API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/list/).

## 3.5 Desired behavior

### Candidate gate

1. The gate accepts a clean committed downstream SHA and validates its release
   manifest, exact upstream commit, explicit ordered patch series, and every
   patch file. Unsafe paths, missing inputs, dirty/untracked input, or a failed
   patch replay stop the gate.
2. The patched Pastebin target installs dependencies from the assembled
   upstream worktree's exact committed lockfile with frozen resolution. Its
   frontend manifest is built before Worker typecheck/build. The caller's
   `node_modules` cannot influence the result.
3. The Add-on target uses the exact candidate commit and root workspace
   lockfile, installed with frozen resolution. Validation runs from the
   repository root and covers the Add-on Worker and frontend lint/typecheck,
   tests, and builds, including required upstream frontend prerequisites.
4. The documented default command runs both targets. Release mode rejects
   target-command overrides and fixture-only switches; overrides may exist
   only in tests and cannot produce candidate PASS or provenance.
5. On failure, report the failed target and stage plus a bounded sanitized
   diagnostic. Do not print secrets, full OAuth callback URLs, cookies, tokens,
   management passwords, or full Paste content. Do not silently discard the
   failing output.
6. CI invokes the same default gate. Workflow steps may not replace the gate
   with `true`, skip a target, or convert a nonzero result to success.

### Provenance and artifact identity

1. Provenance records schema version, UTC generation time, downstream commit,
   pinned upstream commit, ordered patch paths and SHA-256 hashes, assembled
   commit/tree, each used lockfile path and SHA-256 plus tool versions, gate
   mode (`default`), each target's named checks and results, and GitHub
   workflow run ID/attempt and candidate SHA.
2. A candidate is not `retained` until the provenance JSON and its SHA-256
   sidecar exist and upload succeeds. Missing files, upload errors, absent
   artifact ID/URL/digest, or unexpected retention fail closed.
3. Upload uses a unique non-overwritten artifact name, `if-no-files-found:
error`, and retention of at least 30 days. The uploaded artifact's returned
   ID, URL, and archive SHA-256 digest are recorded after upload in the
   workflow run summary, alongside the candidate SHA, run ID/attempt, and
   provenance-file SHA-256. A read-only GitHub run/artifact lookup must verify
   that identity. Do not put a post-upload digest inside the artifact that it
   hashes or represent an unavailable deployment ID as evidence.
4. The summary and artifact distinguish candidate validation from release
   authorization, deployment, and publication. Candidate generation is
   non-deploying and does not create a tag or Release.

GitHub's upload action exposes artifact ID, URL, and SHA-256 digest after
upload; its artifact digest is the archive identity, distinct from the
provenance file checksum. See [upload-artifact action metadata](https://github.com/actions/upload-artifact/blob/main/action.yml)
and [GitHub artifact documentation](https://docs.github.com/en/actions/tutorials/store-and-share-data).

### Production-tag rollback procedure

1. Read-only rehearsal selects only an existing protected production tag and
   resolves it to a full commit SHA. It records both the selected tag and
   resolved SHA, verifies the remote ref against durable expected tag evidence
   and the applicable GitHub tag-protection rule, and never moves or deletes
   the tag. Missing expected identity or protection evidence is UNKNOWN.
2. Rehearsal checks out that exact tag in a disposable worktree, installs from
   that tag's own committed lockfile with frozen resolution, and runs the
   gate/tooling and release inputs available at that tag. It must not
   substitute today's scripts, dependencies, patch series, or configuration
   without labeling the result as reconstruction. No automatic conflict
   resolution or manual product edits are allowed.
3. Rehearsal output labels whether evidence is original release-time evidence
   or a present-day reconstruction, compares recorded source/build identity,
   and verifies both build targets. Missing historical inputs, failed default
   validation, or a mismatch means rollback readiness is UNKNOWN/FAILED; no
   override may turn it into PASS.
4. A future actual rollback requires a separate Owner deployment
   authorization, exact Cloudflare Worker version/deployment identity for both
   targets, a reviewed traffic plan, and a compatibility check for D1,
   Queues, and external side effects. Re-deploying a source tag does not undo
   data changes or provider-side effects. Do not roll back by moving a Git tag.

### OAuth query redaction and drift detection

1. The tracked Worker contract will require this TOML setting under
   `[observability]`:

   ```toml
   redact_query_string = true
   ```

   The locked Wrangler schema at `4.129.0` accepts it. Cloudflare's edit API
   contract names the same boolean field and describes removal of request URL
   query strings from logs/traces. Do not use an undocumented CLI assumption.

2. Every tracked deployment overlay that supplies Worker observability config
   must preserve `true`. Automated offline tests use the exact locked Wrangler
   schema to parse/validate the TOML and fail if the key is absent, false, or
   ignored by schema serialization. Overlay tests fail on missing or false
   values.
3. A read-only configuration-drift check calls
   `GET /accounts/{account_id}/workers/workers/{worker_id}` and requires the
   returned observability field to be exactly `true`. False, missing,
   malformed, unauthorized, or unavailable is a failed/UNKNOWN check, never a
   pass. Live check credentials require only `Workers Scripts Read`; no PATCH
   or deploy credential is used by this checker.
4. Tests cover API responses `true`, `false`, missing field, API error, and
   malformed response. They assert sanitized output and nonzero failure for
   every non-true case. A deployment verification also records the exact
   deployment/version ID and active traffic percentages from the read APIs.
5. Redaction applies prospectively to future logs/traces. It does not alter,
   erase, or sanitize records already retained. Historical access and
   retention disposition remain separate Owner decisions.

Cloudflare API references: [edit Worker settings](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/edit/),
[read Worker settings](https://developers.cloudflare.com/api/typescript/resources/workers/subresources/beta/subresources/workers/methods/get/).

### Post-deployment observability verification

Only after a separately authorized deployment, a read-only verifier:

- reads the active deployment and requires the approved Worker version at
  100% traffic for each target; records IDs and UTC observation time;
- reads Worker observability configuration and requires query-string
  redaction `true`, with expected logs, invocation logs, traces, and sampling
  still enabled;
- sends at most one approved, harmless, non-authenticated GET to a read-only
  route with a random non-secret query marker, then confirms the marker is
  absent from a newly emitted log record; it never calls OAuth callback/login
  routes and never captures full request URLs;
- reports `UNKNOWN` when the log sink, retention window, version mapping, API
  permission, or fresh event cannot be verified. No absence-of-evidence claim
  is converted into PASS.

The synthetic marker and check request may be included only after deployment
authorization and must not contain OAuth code/state, cookies, tokens, PII, or
customer data. This SPEC performs no request against production.

### Final read-only production health checks

Following deployment verification, the final health report uses a declared
UTC observation window and records point-in-time vs. historical evidence
separately. It checks:

- public Add-on availability on its canonical origin and a safe unauthenticated
  session endpoint response, without a user session or mutation;
- current active Worker deployment/version identity and configured service
  binding, with no traffic change;
- aggregate D1 operation/batch/reconciliation-required/in-flight counts using
  SELECT-only access; no entry IDs, user payloads, secrets, or paste bodies;
- Queue and DLQ identity and best-effort backlog metrics. A zero
  `oldest_message_timestamp_ms` is UNKNOWN; approximate zero backlog is not
  exact Queue emptiness. No peek, ack, purge, replay, send, or reconfiguration
  is part of the final health check;
- public Paste availability only through an already approved safe probe; do
  not create a test Paste or inspect unrelated users' content; and
- aggregate recent error status without exporting raw request URLs or
  historical OAuth values.

Unavailable or ambiguous evidence remains UNKNOWN. A healthy point-in-time
check does not establish a historical absence of errors or unauthorized log
access. The two retained inventory entries without reconstructible expected
hashes remain UNKNOWN until the Owner supplies identifiers and sources or
explicitly authorizes their exclusion from that inventory scope. IP,
geolocation, and user-agent retention remains a separate privacy decision.

## 3.6 User/operator flows

1. A maintainer selects a clean, committed downstream candidate SHA and
   invokes the non-deploying default gate.
2. The gate resolves manifest inputs, assembles the exact patched upstream
   tree, installs each target from its pinned lockfile, runs all target checks,
   and reports pass/failure per named stage.
3. A separate owner-triggered candidate workflow runs the same gate on that
   exact SHA. It generates provenance and checksum, uploads them, and writes
   the post-upload artifact identity to the durable run summary.
4. A maintainer verifies the run, artifact metadata/digest, file checksum,
   candidate SHA, and patch hashes through read-only GitHub evidence.
5. A read-only rollback rehearsal validates the exact existing production tag
   and its own inputs. It makes no Cloudflare changes.
6. A separately approved deployment may run later. Post-deployment API reads,
   redaction check, safe synthetic probe, and final health checks follow only
   after that authorization. Their results are not implied by candidate PASS.

## 3.7 Data/state model

Candidate provenance is immutable evidence for one downstream commit and its
exact assembled upstream inputs. It contains source/target check identity and
hashes; it does not contain production secrets, invocation URLs, OAuth values,
cookies, full Paste bodies, or a claim of deployment. The detached checksum
identifies the provenance file. GitHub's upload artifact ID/URL/archive digest
identify the uploaded archive and are recorded by the workflow run after
upload. Cloudflare Worker version and deployment IDs are separate runtime
identities recorded only by a separately authorized post-deployment verifier.

## 3.8 Security and trust boundaries

- CI and release scripts operate on untrusted pull-request source without
  privileged Cloudflare credentials. Candidate workflows have contents-read
  permission only unless an independently reviewed need proves otherwise.
- The live drift checker uses a read-only Cloudflare token; deployment
  credentials are not exposed to the candidate build or tests.
- Logs, artifacts, summaries, and provenance must be sanitized and bounded.
  Never persist raw OAuth callback query values, cookies, tokens, passwords,
  user content, or provider secrets.
- Historical log-access authorization, current retention, state consumption,
  and session linkage are outside this release SPEC and remain UNKNOWN where
  audit data is unavailable. See the separate OAuth security follow-up.

## 3.9 Compatibility

- Patch replay remains exact, ordered, and fail-closed from the pinned upstream
  commit. Upstream-owned changes stay in exported patches.
- Locked Wrangler `4.129.0` schema is the tracked configuration validation
  baseline; any version change must repeat schema and Cloudflare API contract
  verification before changing the redaction configuration mechanism.
- Historical production tags are validated using their own committed tools,
  manifests, lockfiles, and settings. Evidence recreated now is labeled as a
  reconstruction.
- Existing timed expiration and Add-on runtime behavior are outside scope;
  this work changes release validation/evidence and observability config only.

## 3.10 Failure behavior

- Missing or malformed source/lock/series input, dirty state, patch conflict,
  dependency drift, skipped/overridden target, test/build failure, secret-like
  output, or absent required stage result prevents candidate PASS.
- Provenance or checksum failure, upload failure, missing artifact metadata,
  or retention below 30 days prevents `retained` status and candidate release
  eligibility.
- Rollback rehearsal failure or unavailable historical inputs reports
  FAILED/UNKNOWN and `DEPLOY_CLAIM=no`; it never substitutes current source or
  claims rollback success.
- Redaction schema mismatch or live drift result other than exactly true
  reports FAIL/UNKNOWN and blocks release readiness. Do not change production
  configuration automatically.
- Post-deployment version/config/log evidence or final health-check evidence
  that is absent, stale, ambiguous, or unauthorized remains UNKNOWN and cannot
  be represented as PASS.

## 3.11 Acceptance criteria

- [ ] The default release candidate path validates both complete targets from
      a clean exact SHA and fails when a target override or skip is attempted.
- [ ] The assembled upstream tree and downstream Add-on use their own
      committed lockfile inputs with frozen dependency resolution.
- [ ] Frontend prerequisites execute before dependent Worker typecheck/build;
      Add-on Worker and frontend validation run from the correct repository root.
- [ ] A failure fixture proves stage diagnostics remain available and
      sanitized; the downstream workflow invokes no `true` target override.
- [ ] Provenance records source, patch, assembly, lockfile, gate, workflow run,
      and target identities and includes no deployment claim.
- [ ] Artifact upload fails closed on missing files; retention is at least 30
      days; the workflow summary records and API-verifies run/attempt, candidate
      SHA, artifact ID/URL/archive digest, and provenance SHA-256.
- [ ] Rollback rehearsal uses a pre-existing production tag and its own
      committed inputs, verifies both targets, labels reconstruction evidence,
      and never changes tag or production state.
- [ ] Locked Wrangler schema tests prove TOML redaction support; every tracked
      overlay requires true; unit fixtures prove live drift detection accepts only
      API `true` and fails closed for all other responses.
- [ ] Post-deployment verification checks exact active Worker version and
      traffic, redaction and observability settings, and a harmless query marker's
      absence in a new log, only after separate deployment authorization.
- [ ] Final read-only health checks cover the criteria in §3.5, preserve
      UNKNOWN where evidence is unavailable, and perform no D1/Queue/Paste writes.
- [ ] No production configuration, deployment, tag, release, publication,
      Project, Issue, historical-log, or cleanup mutation occurs in the approved
      implementation scope without its own required authorization.

## 3.12 Test specification

- Candidate script fixtures: exact commits, clean/dirty/untracked input,
  pinned lockfiles, patch ordering/replay failure, both named target suites,
  frontend prerequisite ordering, target override/skip rejection, CI command
  wiring, retained bounded diagnostics, and secret-sentinel redaction.
- Provenance fixtures: schema fields, exact SHA/hash values, default-vs-fixture
  mode, no deployment assertion, stable serialization, checksum match/mismatch,
  missing output, and no-op retention rejection.
- Workflow fixtures: pinned action references, run SHA propagation, no
  credentials with PR source, no `true` override, fail-closed artifact upload,
  retention input, post-upload ID/URL/digest, and durable summary identity.
- Rollback fixtures: existing immutable production tag, missing/moved tag,
  exact tag worktree/lockfile, current-vs-historical script distinction,
  upstream and both target outcomes, provenance match/mismatch, and no deploy
  or tag mutation claims.
- Wrangler contract fixtures: parse tracked TOML with the exact lock-resolved
  Wrangler schema, assert serializer/API name and true, validate each tracked
  overlay, and reject absent/false/misspelled keys.
- Cloudflare drift fixtures: API true passes; false, missing, malformed,
  unauthorized, and transport error fail/UNKNOWN; output contains neither
  authorization material nor raw request URLs.
- Post-deploy/final health fixtures: expected and split traffic, wrong/missing
  version, query redaction true/false, safe query marker, unavailable logs,
  stale checks, SELECT-only aggregate query path, approximate Queue zero and
  `oldest_message_timestamp_ms=0` handling, and no state-changing method.

Implementation must record RED/GREEN evidence for behavioral fixes and run
the repository's required CI and exact-HEAD Phase Review Gate. This section is
the required validation plan; no tests or production checks were run as part
of this SPEC drafting step.

## 3.13 Open questions

- Which tracked deployment overlays besides `downstream/addons/messaging/wrangler.toml`
  exist in the eventual implementation checkout, and what must be tested for
  each? Inventory them before coding; absence of a verified production overlay
  is UNKNOWN.
- Does the existing Cloudflare account preserve the exact prior Worker version
  and per-target deployment metadata required for a future runtime rollback?
  Verify read-only before designing an actual rollback action; that action
  needs separate Owner authorization.
- The current live redaction setting, current retained OAuth log inventory,
  access history, and retention tier were not available during SPEC preparation.
  Keep each UNKNOWN; no log deletion or production edit is authorized.
- Two retained inventory entries lack identifiers/expected hashes in available
  durable evidence. The Owner must provide exact identifiers and verifiable
  source/hash evidence, or explicitly authorize excluding those entries from
  that inventory scope while integrity remains UNKNOWN.
- IP/geolocation/user-agent retention minimization needs its own Owner
  decision and does not determine OAuth credential or session compromise.
- The current release workflow's durable run-summary retention policy must be
  checked against the artifact's minimum 30-day retention before claiming the
  identity record is durable for the same period.

## Validation and documentation impact

Implementation must update release/build instructions, rollback guidance,
configuration/security docs, and `docs/TESTING.md` in the same PR as the
behavior they describe. It must test the locked Wrangler config contract and
Cloudflare API drift client without production credentials, then run the full
default candidate command, applicable repository CI, rollback fixtures, and
exact-HEAD review settlement. Cloudflare API reads and any harmless production
probe remain gated behind separate deployment/production-read authorization.

Status: **SPEC READY FOR OWNER REVIEW**.
Implementation has **NOT** started. SPEC approval has **NOT** been granted.
