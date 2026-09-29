# Release-readiness remediation SPEC

Status: **DRAFT — OWNER SPEC APPROVAL REQUIRED**. This is a behavioral and
release contract, not SPEC approval or implementation authorization.

Parent PLAN: [Release-readiness remediation PLAN](release-readiness-remediation-plan.md),
approved by the Owner on 2026-09-29 at exact commit
`6c9c926b390a9070c5a7b01fc9acae35e7277d58`. Approval scope is SPEC preparation
only. SPEC approval is still required before PHASE/TODO preparation.

```text
PR191_PLAN=APPROVED
PR191_SPEC_STATUS=DRAFT_AWAITING_OWNER_APPROVAL
PR191_SPEC_APPROVAL=REQUIRED_NOT_GRANTED
PR191_PHASE_TODO=NOT_PREPARED_SPEC_APPROVAL_REQUIRED
PR191_IMPLEMENTATION=NOT_STARTED_SPEC_AND_PHASE_APPROVAL_REQUIRED
BASELINE_ALIGNMENT=ALIGNED_AFTER_OWNER_APPROVED_AMENDMENT
PRODUCTION_CONFIGURATION_CHANGE=NOT_AUTHORIZED
DEPLOYMENT_TAG_PUBLICATION_MERGE=NOT_AUTHORIZED
```

This revision records the candidate-gate behavior observed at the refreshed
`downstream/main` baseline `c0a2f9c26533685cc782c0d86b076dd6f73cf89f`.
Phase 10 is marked complete in `docs/IMPLEMENTATION_ORDER.md`; this
remediation follows the normal SPEC and PHASE/TODO approval gates rather than
relying on D-030.

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
- Do not include FT-14/15, project or issue mutation, or unrelated historical
  fixture reconstruction as release implementation. Reconstruction of the
  single named production tag is release evidence only; it is never original
  release-time evidence or a runtime rollback.
- Do not claim that a source tag alone is a deployable runtime rollback
  artifact, or that a rehearsal is an actual rollback.

## 3.4 Current behavior

- At baseline `c0a2f9c26533685cc782c0d86b076dd6f73cf89f`,
  `downstream/scripts/release-candidate.sh` assembles the pinned upstream SHA
  with the ordered patch series, but its default Pastebin and Add-on commands
  invoke `$ROOT/node_modules/.bin` from the downstream checkout instead of
  installing the assembled worktree's dependencies from its committed lockfile
  or the exact candidate's workspace dependencies. The Pastebin command also
  omits the frontend build that the Worker validation needs first. The Add-on
  command runs with the Add-on directory as its current directory even though
  its Vite/Vitest configuration contains repository-root-relative paths, and
  it omits Add-on frontend validation. The script accepts target-command
  environment overrides and removes captured target output on both success
  and failure. Its current success path also prints `TAG_ELIGIBLE=yes` after
  only the two target commands pass, before provenance, artifact identity,
  review, and tag-protection evidence exist.
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
  context. Read-only inspection on 2026-09-29 confirmed the production tag is
  an annotated ref whose current remote object SHA is
  `d07eeb4aee7fba8a0509e04fff630332ad8ea77c`, peeling to commit
  `58bc7dda4da6237bfdd9806326a92fa4df11afac`. Its committed manifest SHA-256
  is `97cc2d6e932a546e9fd7c0b1f1f8f59ec58d3783ae60f80ac161bf715de22d98`,
  pinning upstream `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`; its committed
  30-entry series SHA-256 is
  `7ce315bfccbf902d4a1caa5076d0f57802ffdc17360256b24c2271fa0a72375b`.
  Replaying only that tag's own series succeeded at assembled HEAD
  `b63d5b10520b1979ac76a79a6c4d65b511a8c36f`, tree
  `4ca38f19e10c57dc79c0c13f45984965774fde81`; this is source reconstruction,
  not original release-time or deployed-runtime evidence. It establishes patch
  replay only; historical target validation remains UNKNOWN. The tag's
  provenance script has a no-op default retention hook, and its rollback script
  accepts omitted provenance; no exact-SHA Actions artifact or GitHub Release
  was located in the inspected evidence. Historical provenance and artifact
  identity therefore remain UNKNOWN. The current remote annotated ref matches
  the observed identity; no evidence of retargeting was found.
- The committed lockfile at the approved PLAN commit resolves Wrangler
  `4.129.0`. The installed `config-schema.json` defines
  `observability.redact_query_string` as a boolean with default `false`; the
  locked CLI validator accepts the snake-case key and its serializer emits the
  matching Workers API property. The globally installed Wrangler `4.141.0`
  schema also contains it. The tracked
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
- The originally approved PLAN contained the documentation error
  `0835cac4ea0952b7d30ade1d80272421a3789b96`. On 2026-09-29 the Owner
  authorized correcting that PLAN field to
  `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Read-only source verification
  confirms the corrected SHA resolves in official upstream and that
  `goshujin` points to it; the audited candidate and production tag manifests
  already record the same SHA. This is a documentation-only baseline
  correction; no manifest, upstream dependency, patch series, or release input
  changed. The baseline alignment blocker is resolved. Candidate validation
  and tag eligibility remain subject to all other gates in this SPEC.
- Read-only GitHub inspection on 2026-09-29 requested
  `GET /repos/Skyline-Gazer/pastebin-worker/rulesets?includes_parents=true&targets=tag&per_page=100`.
  It returned HTTP 200 with body `[]` under repository-admin access and a
  classic token with `repo` scope. No repository-scoped or inherited rulesets
  were returned by that query. The classic
  `GET /repos/Skyline-Gazer/pastebin-worker/tags/protection` endpoint returned
  HTTP 404. A separate organization-level ruleset listing could not be read
  because the token lacks `admin:org`; effective inherited tag protection is
  therefore UNKNOWN, not PASS or a claim of NOT_PROTECTED. Tag existence alone
  does not establish protection. This result does not show that the tag was
  historically moved or tampered with. The current remote annotated ref matches
  the observed tag-object and peeled-commit identities, and no evidence of
  retargeting was found; historical tag immutability/integrity nevertheless
  remains UNKNOWN without trusted release-time identity/history evidence. Tag
  eligibility stays fail-closed until effective protection is verifiable and
  exact source identity passes its checks. No tag-policy mutation is authorized.

Evidence: [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/),
[Cloudflare Workers API](https://developers.cloudflare.com/api/resources/workers/),
[Cloudflare Worker logs documentation](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
[Cloudflare Worker edit API](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/edit/),
[Cloudflare Worker read API](https://developers.cloudflare.com/api/typescript/resources/workers/subresources/beta/subresources/workers/methods/get/),
[Worker deployments API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/),
[Worker versions API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/list/),
and [GitHub repository rules API](https://docs.github.com/en/rest/repos/rules).

## 3.5 Desired behavior

### Candidate gate

1. Before validating a candidate, compare the manifest's upstream SHA with the
   Owner-approved PLAN baseline. A mismatch blocks the gate before assembly;
   do not guess which pin to use. The corrected PLAN and audited candidate
   manifest currently record the same upstream SHA. The gate accepts a clean
   committed downstream SHA and validates its release manifest, exact
   upstream commit, explicit ordered patch series, and every patch file.
   Unsafe paths, missing inputs, dirty/untracked input, or failed patch replay
   stop the gate.
2. The patched Pastebin target installs dependencies from the assembled
   upstream worktree's exact committed lockfile with frozen resolution. Its
   frontend manifest is built before Worker typecheck/build. Install and checks
   run inside the disposable assembled worktree; caller `node_modules`,
   `NODE_PATH`, caller-provided `.bin` entries, and caller-supplied `PATH`
   entries cannot influence command or module resolution. Construct `PATH`
   from the declared toolchain and required platform utilities.
3. The Add-on target runs from an isolated downstream worktree at the exact
   candidate commit, using that commit's root workspace lockfile and frozen
   resolution. It does not reuse the caller checkout's `node_modules`.
   Validation runs from the isolated repository root and covers the Add-on
   Worker and frontend lint/typecheck, tests, and builds, including required
   upstream frontend prerequisites.
4. The documented default command runs both targets. Release mode rejects
   target-command overrides and fixture-only switches; overrides may exist
   only in tests and cannot produce candidate PASS or provenance.
5. `CANDIDATE_STATUS=passed` means only that baseline alignment and both named
   default target suites passed for the exact candidate SHA. The candidate
   command never emits `TAG_ELIGIBLE=yes`; a separate tag-eligibility check
   emits `TAG_ELIGIBILITY=eligible` only after retained provenance and artifact
   identity have been verified for that same SHA, required CI and review gates
   pass, and no release blocker remains. Eligibility is a technical
   precondition, not Owner authorization to create a tag, release, or deploy.
   Until that check passes, tag eligibility is `no` or `unknown`.
6. On a candidate-gate failure, report the target, stable stage ID, numeric
   exit code, sanitized diagnostic, and whether the diagnostic was truncated.
   Emit at most 80 lines and 8 KiB of UTF-8 diagnostic text to stderr before
   deleting temporary output. Redact
   all URL query strings, full URLs, authorization/cookie headers, OAuth
   `code`/`state`, tokens, passwords, management secrets, and user content. If
   redaction cannot safely classify an excerpt, suppress its text and report
   only the stage and failure category. Never print the raw command line or
   raw captured output.
   Stage IDs are stable slugs for baseline alignment, manifest, series, patch
   replay, dependency install, frontend manifest, format, lint, typecheck,
   tests, Worker build, and override guard.

   The machine-readable failure envelope is:

   ```text
   RELEASE_FAILURE_SCHEMA=1
   CANDIDATE_STATUS=failed|blocked
   TARGET=PASTEBIN|ADDON|PRECHECK
   STAGE=<stable-stage-id>
   EXIT_CODE=<decimal>
   TAG_ELIGIBLE=no
   DEPLOY_CLAIM=no
   DIAGNOSTIC_TRUNCATED=yes|no
   DIAGNOSTIC_SHA256=<sha256-of-sanitized-diagnostic>
   DIAGNOSTIC_BEGIN
   <sanitized text, at most 80 lines and 8 KiB>
   DIAGNOSTIC_END
   ```

   Emit the envelope to stderr before temporary output is removed. If the
   excerpt is suppressed, keep the envelope and hash the empty diagnostic.

7. CI invokes the same default gate. Workflow steps may not replace the gate
   with `true`, skip a target, or convert a nonzero result to success.
8. Invoking the checked-in gate from a working directory outside the checkout
   still resolves the checkout from the script location. The release path does
   not depend on the caller's current directory, `node_modules`, `.bin`,
   `PATH`, or `NODE_PATH`. Any fixture-root or command override used by tests
   cannot produce candidate PASS, retained provenance, or tag eligibility.

### Provenance and artifact identity

1. Provenance records schema version, UTC generation time, downstream commit,
   upstream commit, ordered patch paths and SHA-256 hashes, assembled
   commit/tree, each used lockfile path and SHA-256 plus tool versions, gate
   mode (`default`), each target's named checks and results, and GitHub
   workflow run ID/attempt and candidate SHA. It records no post-upload
   artifact digest inside the file that digest identifies.
2. `PROVENANCE_STATUS=retained` is possible only after the provenance JSON and
   its SHA-256 sidecar exist and the workflow upload succeeds. Candidate build
   PASS alone is never `retained` and never tag-eligible. Missing files, upload
   errors, absent artifact ID/URL/digest, or unexpected retention fail closed.
3. Upload uses a unique non-overwritten artifact name, `if-no-files-found:
error`, and retention of at least 30 days. The workflow records the returned
   artifact ID, browser URL, archive SHA-256 digest, creation/expiry times, and
   exact name in the run summary, alongside candidate SHA, run ID/attempt, and
   provenance-file SHA-256. A read-only GitHub Actions API lookup verifies the
   exact run attempt and candidate `head_sha`, artifact ID/name, non-expired
   state, archive digest, and an expiry at least 30 days after creation. A
   read-only artifact download recomputes the provenance JSON SHA-256 and
   matches it to the sidecar and summary. Missing or contradictory fields,
   lookup/download errors, or retention below 30 days prevent `retained` and
   tag eligibility. The summary is a convenience record; API-linked artifact
   metadata and the downloaded checksum are the verification evidence.
4. The summary and artifact distinguish candidate validation from release
   authorization, deployment, and publication. Candidate generation is
   non-deploying and does not create a tag or Release.

GitHub's upload action exposes artifact ID, URL, and SHA-256 digest after
upload; its artifact digest is the archive identity, distinct from the
provenance file checksum. See [upload-artifact action metadata](https://github.com/actions/upload-artifact/blob/main/action.yml)
and [GitHub artifact documentation](https://docs.github.com/en/actions/tutorials/store-and-share-data).

### Production-tag rollback procedure

1. Rehearsal records the full source-release identity: tag name/ref, annotated
   tag-object SHA, peeled commit SHA, committed `release.json` SHA-256, pinned
   upstream SHA, downstream Add-on/source commit, ordered patch-series path,
   patch count, and every ordered patch path and SHA-256. Durable expected
   identity must come from the original release record or Owner-approved
   evidence. Re-read the remote tag ref before and after rehearsal; any change
   from its expected tag-object or peeled-commit SHA fails the rehearsal.
2. The known production tag is
   `downstream-v2026.09.10.1` (tag object
   `d07eeb4aee7fba8a0509e04fff630332ad8ea77c`, peeled commit
   `58bc7dda4da6237bfdd9806326a92fa4df11afac`). Its prior rollback tag is
   `downstream-v2026.09.07.1` (tag object
   `c2a36242ab8aedb4d5032c0739a89b12e924e4d0`, peeled commit
   `0fc784c2a4cf2951de060cae37b8e89dfb054820`). These are source identities,
   not Worker runtime identities. The production tag's committed
   `downstream/patches/series` contains exactly 30 ordered patch entries; the
   audited candidate series contains 33. Reconstruction MUST read only the
   selected tag's own `release.json` and `series`, validate and hash its 30
   entries, and stop if the count or any expected hash differs. It must never
   use the current 33-entry series as a substitute.
3. Before calling a tag protected, verify the applicable repository and
   inherited GitHub rulesets against the exact tag pattern. Evidence must show
   enforcement prevents tag creation, updates, and deletion by the relevant
   actors, with no applicable bypass for release automation. A complete
   successful lookup with no matching protection rule or a rule that permits
   mutation is `FAIL/NOT_PROTECTED`; unavailable APIs, insufficient scope, or
   incomplete inherited-rule visibility is `UNKNOWN`. Tag existence and a
   successful historical build do not prove protection. The 2026-09-29
   repository-scoped lookup described in §3.4 returned HTTP 200 and an empty
   result, while the available token could not read the separate org-level
   ruleset listing. Effective tag protection is therefore `UNKNOWN`; do not
   report rollback PASS. This status is separate from historical tag integrity,
   which also remains `UNKNOWN` absent sufficient trusted evidence. The empty
   repository-scoped result alone does not demonstrate past tag tampering.
   Tag eligibility remains fail-closed until effective protection is
   verifiable and exact source identity checks pass. Rehearsal never moves,
   creates, or deletes a tag.
4. Rehearsal checks out the exact peeled commit in a disposable worktree,
   installs from that tag's own committed lockfile with frozen resolution, and
   runs its own release inputs. Any compatibility harness or tool added after
   the tag is separately identified by commit and labeled as reconstruction;
   it cannot silently replace the tag's inputs. No automatic conflict
   resolution or manual product edits are allowed.
5. Label evidence `ORIGINAL_RELEASE_TIME` only when it was created and retained
   at release time; evidence generated now is
   `RECONSTRUCTED_FROM_SOURCE_TAG`. The reconstruction compares the tag,
   manifest, upstream pin, all 30 ordered patch hashes, lockfiles/tool
   versions, assembled tree, and both target results. It proves source/build
   reproducibility only, not what Cloudflare ran or whether a runtime rollback
   is available. A source mismatch or failed target is `FAIL`; missing or
   unverifiable historical evidence is `UNKNOWN`. Neither may be overridden
   into PASS.
6. Runtime rollback identity is separate for each Worker target: Cloudflare
   account and script name, exact version ID, deployment ID, active traffic
   percentage, and UTC observation time from read-only APIs. Verify target
   versions that are currently active and the exact previously deployed
   versions before any future rollback is considered. If a target was not
   deployed or the prior version/deployment identity cannot be proved, record
   that fact only when release evidence establishes it; otherwise runtime
   rollback readiness is `UNKNOWN`, regardless of source reconstruction PASS.
   A Git tag does not supply a runtime version ID.
7. A future actual rollback requires a separate Owner deployment
   authorization, exact Cloudflare Worker version/deployment identity for both
   targets, a reviewed traffic plan, and a compatibility check for D1,
   Queues, and external side effects. Re-deploying a source tag does not undo
   data changes or provider-side effects. Do not roll back by moving a Git tag.

### OAuth query redaction and drift detection

1. The tracked Worker observability contract requires the redaction setting
   and these measurable values:

   ```toml
   [observability]
   enabled = true
   head_sampling_rate = 1
   redact_query_string = true

   [observability.logs]
   enabled = true
   invocation_logs = true
   head_sampling_rate = 1

   [observability.traces]
   enabled = true
   head_sampling_rate = 1
   ```

   The locked Wrangler schema at `4.129.0` accepts the redaction field.
   Cloudflare's edit API contract names the same boolean and describes removal
   of request URL query strings from logs/traces. Do not use an undocumented
   CLI assumption. No tracked overlay may lower the sampling rate or disable
   invocation logs, logs, traces, or query redaction.

2. Every tracked deployment overlay that supplies Worker observability config
   must preserve `true`. Automated offline tests use the exact locked Wrangler
   schema to parse/validate the TOML and fail if the key is absent, false, or
   ignored by schema serialization. Overlay tests fail on missing or false
   values.
3. A read-only configuration-drift check calls
   `GET /accounts/{account_id}/workers/workers/{worker_id}` and compares every
   returned setting listed above to the exact tracked value. An explicit
   `false` or sampling-rate mismatch is `FAIL`; a missing/malformed field,
   unauthorized response, API error, or unavailable response is `UNKNOWN`.
   Neither is a pass. Live check credentials require only `Workers Scripts
Read`; no PATCH or deploy credential is used by this checker.
4. Tests cover exact expected values, explicit false/mismatched values,
   missing fields, API errors, unauthorized responses, and malformed bodies.
   They assert sanitized output and nonzero failure for every non-PASS result.
   A deployment verification also records the exact deployment/version ID and
   active traffic percentages from the read APIs.
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
  redaction `true`, with `enabled=true` and sampling rates exactly `1` for
  Worker logs and traces, and invocation logs enabled;
- after an explicit deployment authorization, sends at most one GET to a
  code-reviewed, unauthenticated, read-only route from an allowlist. The check
  generates a one-use marker from at least 128 bits of cryptographic
  randomness and places it only in a dedicated query parameter. It never uses
  OAuth callback/login routes or includes secrets, PII, cookies, tokens, or
  customer data;
- captures the response's provider request ID (for example, CF-Ray) without
  recording the full request URL. It queries logs only for the bounded
  five-minute interval after the request and correlates the exact event by the
  same request ID, method, path, status, and active Worker version. It
  requires exactly one matching event, verifies that the logged URL contains
  no query and that the marker is absent from every returned event field, then
  discards the raw marker and event payload. The durable evidence contains
  only marker SHA-256, request ID, method/path/status, Worker version, and UTC
  timestamps;
- reports `FAIL` if a correlated event includes a query string or marker and
  `UNKNOWN` if no common request ID, unique event, complete log result,
  five-minute freshness window, API permission, or stable version mapping can
  be verified. It does not infer redaction from a missing or uncorrelated
  event.

The marker exists only in process memory while the authorized check runs; it
is never written to logs, summaries, or artifacts. Offline fixtures must prove
the correlation and redaction rules without a production request. This SPEC
performs no request against production.

### Final read-only production health checks

Following deployment verification, the final health report uses one UTC
window `[window_start, window_end]` of at most 15 minutes. Each point-in-time
API read must complete during the last five minutes of that window; historical
queries include only events within the declared window. It records observation
time, source, target, and freshness for each result. Each check is `PASS` only
when complete authoritative evidence within the window meets its stated
predicate; a contradictory in-window value is `FAIL`; missing, stale,
unauthorized, malformed, partial, out-of-window, or approximate evidence is
`UNKNOWN`. Overall status is `FAIL` if any required check fails, else `UNKNOWN`
if any required check is unknown, else `PASS`. It checks:

- public Add-on availability on its canonical origin (expected 2xx) and the
  safe unauthenticated `GET /api/auth/session` response (expected 401), without
  a user session or mutation;
- current active Worker deployment/version identity and configured service
  binding. The expected version must receive 100% traffic and the binding must
  match the reviewed deployment manifest; explicit mismatch or split traffic
  is `FAIL`;
- aggregate D1 operation/batch/reconciliation-required/in-flight counts using
  SELECT-only access; no entry IDs, user payloads, secrets, or paste bodies;
- Queue and DLQ identity and best-effort backlog metrics. A zero
  `oldest_message_timestamp_ms` is UNKNOWN; approximate zero backlog is not
  exact Queue emptiness. No peek, ack, purge, replay, send, or reconfiguration
  is part of the final health check;
- public Paste availability only through an already approved safe probe; do
  not create a test Paste or inspect unrelated users' content; a successful
  safe GET must return its documented 2xx status; and
- aggregate recent server-error status without exporting raw request URLs or
  historical OAuth values. Zero in-window 5xx events from a complete log
  source is `PASS`; one or more is `FAIL`; incomplete sampling, unavailable
  logs, or uncertain query coverage is `UNKNOWN`.

Queue/DLQ names and D1 counts are reported as aggregate values only; no
unapproved threshold is inferred for batch or in-flight counts. A D1 check is
`PASS` when the SELECT-only read is complete, counts are valid nonnegative
integers, and `reconciliation_required_count=0`; a positive reconciliation
count is `FAIL`, and a missing or invalid value is `UNKNOWN`. Queue/DLQ checks
are `PASS` when identities match the reviewed manifest and the complete
response contains valid nonnegative backlog fields; a nonzero backlog is
reported, not interpreted as empty or failed. A zero
`oldest_message_timestamp_ms` makes the Queue age/emptiness check `UNKNOWN`,
never proof that a Queue is empty. Unavailable or ambiguous evidence remains
`UNKNOWN`. A healthy 15-minute window does not establish a historical absence
of errors or unauthorized log access. The two retained inventory entries
without reconstructible expected hashes remain `UNKNOWN` until the Owner
supplies identifiers and sources or explicitly authorizes their exclusion from
that inventory scope. IP, geolocation, and user-agent retention remains a
separate privacy decision.

## 3.6 User/operator flows

1. A maintainer selects a clean, committed downstream candidate SHA and
   invokes the non-deploying default gate. If the manifest pin differs from
   the Owner-approved PLAN, the gate blocks before assembly.
2. The gate resolves manifest inputs, assembles the exact patched upstream
   tree, installs each target from its pinned lockfile, runs all target checks,
   and reports `CANDIDATE_STATUS` per named stage. Candidate PASS does not imply
   retained evidence or tag eligibility.
3. A separate owner-triggered candidate workflow runs the same gate on that
   exact SHA. It generates provenance and checksum, uploads them, and writes
   the post-upload artifact identity to the durable run summary.
4. A maintainer verifies the run, artifact metadata/digest, file checksum,
   candidate SHA, and patch hashes through read-only GitHub evidence.
5. A separate read-only tag-eligibility check reports eligible only after
   artifact verification and all review gates pass; it does not create a tag or
   authorize release.
6. A read-only source-tag reconstruction validates the exact existing
   production tag identity and its own 30-entry patch series. It makes no
   Cloudflare changes and cannot prove runtime rollback readiness.
7. A separately approved deployment may run later. Post-deployment API reads,
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
  commit. The candidate manifest pin must equal the Owner-approved PLAN pin;
  the documented baseline amendment in §3.4 aligns both at
  `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Any future mismatch blocks the
  candidate gate. Upstream-owned changes stay in exported patches.
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
  output, absent required stage result, or approved-PLAN/manifest pin mismatch
  prevents candidate PASS. Candidate PASS alone never makes a tag eligible.
- Provenance or checksum failure, upload failure, missing artifact metadata,
  unverifiable run/attempt/candidate identity, or retention below 30 days
  prevents `PROVENANCE_STATUS=retained` and tag eligibility.
- A tag-eligibility check without retained provenance, verified artifact
  identity, current review/CI evidence, aligned baseline, or verified tag
  protection reports `TAG_ELIGIBILITY=refused`; no candidate script may
  convert those statuses to eligible.
- Rollback source mismatch or failed target is `FAIL`; unavailable expected
  identity, tag protection, runtime deployment identity, or historical input
  is `UNKNOWN`. Either blocks rollback readiness and reports
  `DEPLOY_CLAIM=no`; never substitute current source or claim runtime rollback
  success from a source reconstruction.
- A target failure emits the §3.5 bounded stderr envelope before temporary
  output is deleted. Raw command output is never included in artifacts or
  summaries.
- Redaction schema mismatch or live drift result other than exactly true
  reports FAIL/UNKNOWN and blocks release readiness. Do not change production
  configuration automatically.
- Post-deployment version/config/log evidence or final health-check evidence
  that is absent, stale, ambiguous, or unauthorized remains UNKNOWN and cannot
  be represented as PASS.
- Final health status is `FAIL` if any required check has a trusted in-window
  failure, otherwise `UNKNOWN` if any required check is missing, stale,
  ambiguous, or out of window, and `PASS` only when every required check passes
  within the declared maximum 15-minute UTC window.

## 3.11 Acceptance criteria

- [ ] Owner-approved PLAN pin and candidate manifest pin match. The current
      baseline amendment aligns them; any future mismatch blocks candidate
      PASS before assembly.
- [ ] The default release candidate path validates both complete targets from
      a clean exact SHA using each target's committed dependency inputs, and
      fails when dependencies are missing or a target override/skip is
      attempted. Invoking the script from an unrelated current directory still
      resolves the correct checkout. Candidate PASS is separate from retained
      provenance and tag eligibility; candidate PASS never emits a positive
      tag-eligibility result.
- [ ] The assembled upstream and isolated downstream candidate worktrees use
      their own committed lockfiles with frozen resolution; poisoned caller
      `node_modules`, `.bin`, `PATH`, and `NODE_PATH` cannot affect checks.
- [ ] Frontend prerequisites execute before dependent Worker typecheck/build;
      Add-on Worker and frontend validation run from the correct repository root.
- [ ] Failure output follows the exact §3.5 envelope, is emitted before temp
      output cleanup, remains at most 80 lines/8 KiB after sanitization, and
      contains no secret sentinel, raw URL, or raw command. The downstream
      workflow invokes no `true` target override.
- [ ] Provenance records source, patch, assembly, lockfile, gate, workflow run,
      and target identities and includes no deployment claim.
- [ ] Artifact upload fails closed on missing files; retention is at least 30
      days; a read-only API lookup verifies run/attempt, candidate SHA, artifact
      ID/name/digest/expiry, and a downloaded provenance SHA-256 match.
- [ ] Rollback rehearsal records tag-object and peeled-commit identities,
      release manifest, upstream pin, lockfiles, full ordered patch hashes,
      both build targets, tag-protection status, and separate Cloudflare runtime
      version/deployment identities. Historical reconstruction uses exactly the
      selected tag's 30-entry series, never the current 33-entry series.
- [ ] A complete tag-protection lookup with no matching enforced rule fails as
      `NOT_PROTECTED`; incomplete or unavailable protection evidence is
      `UNKNOWN`. Historical immutability/integrity is reported separately and
      stays `UNKNOWN` when trusted expected identity/history evidence is
      missing; no-ruleset evidence alone is not evidence of past tampering.
      Neither state permits rollback readiness PASS.
- [ ] Locked Wrangler schema fixtures assert the exact observability values in
      §3.5 for every tracked overlay; live drift fixtures distinguish explicit
      mismatches (`FAIL`) from missing/unavailable evidence (`UNKNOWN`).
- [ ] Post-deployment fixtures verify one safe synthetic query marker by a
      unique provider request ID, exact single-event correlation, five-minute
      search bound, query/marker absence, and no raw marker or request URL in
      durable evidence. No production probe occurs before separate deployment
      authorization.
- [ ] Final read-only health checks use a maximum 15-minute UTC window and
      five-minute point-read freshness, report PASS/FAIL/UNKNOWN per §3.5, and
      perform no D1/Queue/Paste writes.
- [ ] No production configuration, deployment, tag, release, publication,
      Project, Issue, historical-log, or cleanup mutation occurs in the approved
      implementation scope without its own required authorization.

## 3.12 Test specification

- Candidate script fixtures: exact commits, clean/dirty/untracked input,
  execution from an unrelated current directory, PLAN/manifest pin match and
  mismatch, invalid or unavailable pinned inputs, missing target dependencies,
  pinned lockfiles, patch ordering/replay failure, and a proof that neither
  target starts after precheck or replay failure. For both targets, fixtures
  assert the actual child command, current directory, and environment; poison
  caller `node_modules`, `.bin`, `PATH`, and `NODE_PATH` and prove none can
  influence execution. Assert isolated worktree installs, frontend
  prerequisite ordering, Add-on worker and frontend checks, default CI command
  wiring, and that fixture-only root/command overrides cannot certify a
  candidate. A failing target fixture proves the §3.5 failure envelope is
  emitted before temporary output cleanup, stays within both size limits,
  reports stable target/stage/exit status, and redacts URL, OAuth, cookie,
  token, password, authorization-header, and user-content sentinels without
  exposing raw output or the command line.
- Provenance fixtures: schema fields, exact SHA/hash values, default-vs-fixture
  mode, no deployment assertion, stable serialization, checksum match/mismatch,
  missing output, no-op retention rejection, and that candidate PASS alone
  cannot create `PROVENANCE_STATUS=retained` or tag eligibility.
- Workflow fixtures: pinned action references, run SHA propagation, no
  credentials with PR source, no `true` override, fail-closed artifact upload,
  retention input, post-upload ID/URL/digest, artifact expiry, API run/attempt
  and `head_sha` match, non-expired state, downloaded checksum, and
  tamper/missing-metadata rejection.
- Tag-eligibility fixtures: no eligibility before artifact verification;
  reject candidate/artifact SHA mismatch, missing review/CI result, unaligned
  baseline, missing protection, and incomplete evidence; pass only on exact
  retained evidence without creating a tag.
- Rollback fixtures: annotated tag object and peeled commit identity,
  missing/moved tag, protection pass/no-rule/API-unknown cases, exact tag
  worktree/lockfile, the tag's 30-entry patch series versus the current
  33-entry series, per-patch hash mismatch, current-vs-historical tooling,
  upstream and both target outcomes, provenance match/mismatch, distinct
  current-protection and historical-integrity statuses, separate Cloudflare
  version/deployment identities, and no deploy/tag mutation claims.
- Wrangler contract fixtures: parse tracked TOML with the exact lock-resolved
  Wrangler schema, assert exact redaction/log/invocation/trace/sampling values,
  validate every tracked overlay, and reject absent/false/misspelled keys.
- Cloudflare drift fixtures: exact values pass; explicit false/rate mismatch
  fails; missing, malformed, unauthorized, and transport-error evidence is
  UNKNOWN; output contains neither authorization material nor raw URLs.
- Post-deploy/final health fixtures: expected and split traffic, wrong/missing
  version, exact observability values, safe 128-bit marker, unique/missing/
  duplicate request-ID correlation, marker/query leakage, five-minute log
  deadline, 15-minute window boundaries, stale point reads, zero/nonzero 5xx,
  SELECT-only D1 counts, reconciliation-required count, approximate Queue zero
  and `oldest_message_timestamp_ms=0`, overall PASS/FAIL/UNKNOWN aggregation,
  and no state-changing method.

Implementation must record RED/GREEN evidence for behavioral fixes and run
the repository's required CI and exact-HEAD Phase Review Gate. This section is
the required validation plan; no tests or production checks were run as part
of this SPEC drafting step.

## 3.13 Remaining questions and evidence unknowns

- The 2026-09-29 repository-scoped ruleset lookup with
  `includes_parents=true` returned HTTP 200 and `[]`; the legacy tag-protection
  endpoint returned 404. The separate org-level ruleset listing was unavailable
  without `admin:org`, so effective tag protection is `UNKNOWN`. The remote
  annotated tag currently matches the observed tag-object and peeled-commit
  identities, but historical immutability/integrity remains `UNKNOWN`; no
  evidence of retargeting was found. The empty repository-scoped response does
  not prove past mutation or establish effective org-level policy. Tag
  eligibility stays refused until protection is verifiable and trusted
  source-identity checks pass. No tag policy change is authorized here.
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
- The run summary is a convenience index, not the sole artifact identity
  record. If the Actions API metadata or artifact bytes cannot be verified for
  the required retention period, provenance is not retained and tag eligibility
  is UNKNOWN.

## Validation and documentation impact

Implementation must update release/build instructions, rollback guidance,
configuration/security docs, and `docs/TESTING.md` in the same PR as the
behavior they describe. It must test the locked Wrangler config contract and
Cloudflare API drift client without production credentials, then run the full
default candidate command, applicable repository CI, rollback fixtures, and
exact-HEAD review settlement. Cloudflare API reads and any harmless production
probe remain gated behind separate deployment/production-read authorization.

Status: **DRAFT — OWNER SPEC APPROVAL REQUIRED**.
Implementation has **NOT** started. SPEC approval has **NOT** been granted.
