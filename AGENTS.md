# AGENTS.md — Mandatory AI Coding Agent Instructions

## 1. Mission

This repository is an actively maintained **curated downstream distribution** of `SharzyL/pastebin-worker`: a maintained downstream with a curated patch stack and an independent Feishu Add-on. The upstream project MUST remain a Pastebin. The downstream project adds an independent **Feishu Add-on** that uses the Pastebin HTTP API and password-based update/delete model. The Add-on is not a replacement Pastebin, not a second content database, and not a Feishu-client-styled application.

The downstream MUST NOT depend on the official upstream maintainer actively merging PRs. Changes that are useful to this downstream MAY be adopted as explicit downstream patches after independent review, regardless of whether official upstream has merged them. Lack of an upstream merge decision is neither a reason to reject a change nor evidence of its quality. Official upstream only provides the clean reference baseline via `upstream-sync`.

The maintenance model is intentionally split:

```text
Development                    Release / Build
-----------                    ---------------
upstream-sync                  exact upstream commit
     |                                  |
     +-- patch/<id>                     +-- replay reviewed ordered patch series
     |      |                           |
     |      `-- review/export ----------+
     |
     `-- downstream/main ---------> pinned downstream release commit/tag
             |
             `-- Feishu Add-on           `-- build Add-on independently
```

**Branches are development workspaces. Reviewed patch files plus a pinned upstream commit are the release/build contract.**

## 2. Non-negotiable architecture rules

1. **Upstream syncability is the highest maintenance priority.**
2. Upstream-owned source MUST remain unchanged on `upstream-sync` and SHOULD remain unchanged on `downstream/main`.
3. Before modifying upstream behavior, first determine whether the requirement can be implemented entirely in `downstream/addons/feishu`.
4. If upstream behavior truly must change, create the smallest possible **generic upstream patch**.
5. Each independent upstream patch MUST be developed on its own `patch/<id>` topic branch.
6. A patch branch is a development source, not a production build dependency. Once reviewed, export it with `git format-patch` into the ordered downstream patch series.
7. The production/release build MUST NOT merge moving patch branches together.
8. The production/release build MUST start from an **exact pinned upstream commit** and replay the reviewed ordered patch series in a clean ephemeral worktree using `git am` without automatic conflict guessing.
9. The patch order MUST be explicit in `downstream/patches/series`; never infer order from branch names, directory enumeration, timestamps, or developer memory.
10. A long-lived manually edited `deploy` or `build/integration` branch is forbidden. Integration trees are disposable build artifacts.
11. Integration conflicts MUST be resolved in the responsible patch branch and re-exported. Never repair a generated integration tree by hand.
12. Feishu frontend, webhook/Bot logic, bindings, lifecycle state, batch behavior, password handling, and Feishu-facing APIs belong to `downstream/addons/feishu`.
13. Paste content remains authoritative in upstream KV/R2. The Add-on MUST NOT create a second authoritative copy of full Paste bodies.
14. Paste management passwords are backend secrets and MUST NEVER be exposed to the browser, Feishu client, analytics, logs, public URLs, or client-visible state.
15. All behavior changes require tests and documentation in the same change.
16. **Review context is part of the deliverable.** Non-trivial commits and PRs MUST include business context, expected behavior/business rules, acceptance criteria, constraints/non-goals, validation evidence, and documentation impact.
17. **Curated adoption.** Open, closed-but-unmerged, abandoned, or third-party upstream PRs and fixes MAY be adopted downstream after independent review. Upstream PR status is NOT quality evidence. See §4.7.
18. **Upstream-owned dependency/workflow changes** (e.g. `package.json`, `pnpm-lock.yaml`, upstream `frontend/*`, `worker/*`, `shared/*`, or modifications to workflows that already exist in official upstream, including `.github/workflows/*`) that are not present in official upstream MUST be carried as explicit downstream patches — never committed directly into `downstream/main`. New downstream-only workflows (for example downstream CI covering `downstream/` or `docs/`) belong to `downstream/main` and are not upstream patches.
19. **Every adopted external change MUST record provenance** (origin, PR URL, author, original commit SHA, upstream status at adoption, validation) and MUST be independently reviewed and tested. Preserve original Git authorship when possible.
20. **Once adopted, downstream owns maintenance** for that change until it is removed or superseded. When official upstream later includes an equivalent change, retire the carried downstream patch instead of keeping a duplicate.

## 3. Source ownership boundaries

### 3.1 Upstream-owned paths

Treat upstream application paths as upstream-owned. Typical examples include:

```text
/frontend
/worker
/shared
/scripts
/doc
package.json
wrangler.toml
```

Do not directly commit downstream business behavior into these paths on `downstream/main`.

### 3.2 Downstream-owned paths

Downstream code and maintenance metadata belong under:

```text
/downstream
/docs
/AGENTS.md
/DECISIONS.md
/.github        # downstream review/CI metadata only
```

Do not restructure upstream solely to make downstream code cleaner.

### 3.3 Generic-patch rule

Forbidden upstream patch logic:

```ts
if (source === "feishu") {
  /* special behavior */
}
```

Forbidden upstream patch logic:

```ts
if (content.includes("- [x]")) {
  /* expire Paste */
}
```

Acceptable generic behavior:

```text
e=never -> non-expiring Paste
e=max   -> current deployment MAX_EXPIRATION
```

The Add-on decides when to request either generic capability.

## 4. Git branch model

### 4.1 `upstream-sync`

A clean mirror of upstream `SharzyL/pastebin-worker:goshujin`.

Rules:

- MUST contain only commits that exist in official upstream (no downstream-owned commits); temporarily lagging behind the newest upstream commit between syncs is expected and is not uncleanliness;
- no locally adopted PRs;
- no dependency updates not merged upstream;
- no Feishu code;
- no downstream patches applied as committed source;
- no downstream product customization;
- no downstream documentation;
- no downstream-only fixes;
- update ONLY by fetching official upstream and fast-forwarding this branch to a commit that exists in official upstream history; no arbitrary ref movement, no rewinds, and no force updates;

Any change not present in official upstream is downstream-owned and MUST NOT be committed to `upstream-sync`. Do not directly modify `upstream-sync` for any downstream purpose.

If a historical release requires an older official-upstream commit, pin that older SHA in the release manifest — do NOT rewind `upstream-sync`.

### 4.2 `downstream/main`

The long-lived downstream control branch.

It owns:

- `downstream/addons/feishu`;
- reviewed/exported patch files;
- `downstream/patches/series`;
- release/build scripts and manifest template;
- downstream docs and review rules.

Upstream-owned application source on this branch SHOULD remain identical to the selected upstream baseline. CI SHOULD enforce that downstream product changes do not leak into upstream-owned paths outside exported patches.

### 4.3 `patch/<id>` branches

Examples:

```text
patch/non-expiring-paste
patch/other-generic-capability
```

Default rule: each independent patch branch is created directly from the **exact upstream commit** it targets.

```bash
git switch upstream-sync
git switch -c patch/non-expiring-paste <UPSTREAM_SHA>
```

A patch branch MUST contain only the upstream change represented by that patch series plus directly relevant upstream tests/docs.

Do not add Feishu UI, webhook, archive, checkbox, Batch Mode, or binding logic to patch branches.

### 4.4 Real patch dependencies

Independent patches SHOULD NOT be stacked merely to enforce order.

If patch B truly depends on patch A, declare that dependency explicitly in patch documentation and the series metadata/comments. Do not hide the dependency in branch ancestry.

When developing a truly dependent patch, an ephemeral stacked workspace may be used, but the dependency MUST be documented and the final ordered patch series MUST replay cleanly from the pinned upstream base.

### 4.5 Feishu feature branches

Feishu changes branch from `downstream/main`, for example:

```text
feat/feishu-rendered-markdown
feat/feishu-batch-mode
feat/feishu-archive-countdown
fix/feishu-webhook-signature
```

After review they merge back into `downstream/main`.

### 4.6 No long-lived deploy branch

Do not maintain a manually edited `deploy`, `integration`, or `patch-A-plus-B` branch.

Release composition is generated from:

```text
pinned upstream commit
+ ordered exported patch series
+ pinned downstream release commit/tag for Add-on source
```

### 4.7 Curated adoption of changes not merged upstream

The downstream is actively curated, not a passive mirror. An upstream change is not blocked merely because the official maintainer has not merged it.

1. Candidate changes MAY come from open upstream PRs, closed-but-unmerged PRs, abandoned PRs, third-party contributor fixes, upstream Dependabot PRs, or downstream-identified fixes.
2. Every candidate MUST be independently evaluated before adoption: correctness, compatibility with the currently pinned upstream SHA, tests, regression risk, API/behavior changes, security implications, maintenance burden, license/IP compatibility (the source license must permit adoption), and interaction with the existing downstream patch stack.
3. Upstream PR status (open/closed/rejected/ignored/unmerged) MUST NOT be treated as evidence that the code is good or bad.
4. Adoption MUST follow the normal patch path: dedicated `patch/<id>` branch from the exact pinned upstream SHA → development → tests → review → export with `git format-patch` → add to the ordered `downstream/patches/series`.
5. Do NOT directly merge arbitrary upstream PR branches or external branches into `downstream/main`.
6. Adopted patches MUST record provenance in their patch README (origin repository, PR URL/number, original author, original commit SHA(s), upstream status at adoption, adoption date, reason, license/IP compatibility, attribution/NOTICE requirements, local changes, validation, risks, dependencies, removal condition). Unknown data MUST be marked `unknown` / `not available`; never fabricate it, including license status. If license/IP compatibility cannot be established with sufficient confidence, adoption MUST STOP and be escalated to the owner.
7. Preserve original Git authorship when adopting commits. Do not rewrite third-party authorship as if the downstream maintainer wrote the original change.
8. Once adopted, the downstream assumes maintenance responsibility for that change until removed, superseded, or upstreamed.
9. Dependency changes affecting upstream-owned files that are not merged upstream MUST be represented as downstream patches (see §2 rule 18), never committed directly to `downstream/main`.
10. Dependencies belonging only to downstream-owned code (`downstream/addons/feishu/` or downstream tooling) are normal downstream changes and MAY merge into `downstream/main`; they do NOT become upstream patches.
11. Keep the patch stack curated: do not adopt a change downstream does not need, does not unblock, or whose maintenance burden is not justified, and do not keep a duplicate carried patch once official upstream includes an equivalent change.

### 4.8 Mandatory AI Review Bot Phase Review Gate

Every non-trivial change — product development, upstream patch development, patch promotion, build/release, security, and governance — MUST pass the Phase Review Gate described in `docs/CHANGE_CONTEXT_AND_REVIEW.md` §9 before its PR is merged.

1. Every non-trivial implementation PR MUST pass the AI Review Bot Phase Review Gate before merge.
2. Review MUST cover the latest/current PR HEAD; ANY commit that changes the HEAD SHA invalidates the previous gate and requires a new completed review of the new HEAD.
3. ANY commit that changes the PR HEAD SHA after review invalidates the previous AI-review gate and requires a new completed review of the new HEAD (mechanical rule).
4. All actionable findings MUST be fixed or explicitly dispositioned; a blocking/critical finding MUST NOT be dispositioned as false-positive or not-applicable by a coding agent alone.
5. Blocking findings cannot be self-overridden by a coding agent; only the owner may override, explicitly and recorded.
6. Bot failure/unavailability is NOT approval; the gate fails closed.
7. Dependent next-phase work MUST start only after the required previous phase/PR is merged (with target branch refreshed).
8. Large phases MAY be split; every constituent PR remains independently review-gated.
9. Patch source PRs are review-only and MUST NOT merge into `upstream-sync`.
10. Exported patch promotion PRs MUST also pass review before merge into `downstream/main`.
11. External/untrusted PR code MUST NOT gain privileged secrets merely to enable review automation.
12. Required tests/checks must be current for the reviewed HEAD.
13. Review-fix commits must preserve review context and references.
14. Owner override, when allowed, MUST be explicit and recorded; agents cannot self-override.

## 5. Patch development and export workflow

For every upstream patch:

1. Identify and document the generic capability needed.
2. Pin the upstream base commit.
3. Create a dedicated `patch/<id>` branch from that exact base.
4. Write a failing test first for behavioral changes.
5. Implement the smallest generic change.
6. Run affected tests and upstream regression tests.
7. Write review-ready commits with full context.
8. Review the branch as an isolated upstream change.
9. Export reviewed commits with `git format-patch`.
10. Add exported files to `downstream/patches/<id>/` on `downstream/main`.
11. Add the patch files to `downstream/patches/series` in explicit replay order.
12. Run `downstream/scripts/check-patches.sh` against the pinned upstream commit.
13. Only after replay succeeds may the patch enter a release.

Run export from a `downstream/main` checkout/worktree so the exported files are written into downstream-owned storage. For an independent patch, prefer the helper:

```bash
downstream/scripts/export-patch.sh \
  <UPSTREAM_SHA> \
  patch/<name> \
  <NNN-patch-id>
```

For a truly dependent patch, use the helper's explicit `--start <PREREQUISITE_STACK_TIP>` option and document the dependency. The helper uses `git format-patch --base=<UPSTREAM_SHA>` so reviewed commit messages and prerequisite metadata are preserved.

The exported patch must preserve the reviewed commit message and review context.

## 6. Patch series is the release contract

`downstream/patches/series` is authoritative for patch replay order.

Example:

```text
010-non-expiring-paste/0001-expiration-support-non-expiring-pastes.patch
020-example/0001-example-generic-capability.patch
```

Rules:

- one relative patch path per line;
- blank lines and `#` comments are allowed;
- every listed file must exist;
- no unlisted `.patch` file is automatically applied;
- do not use filesystem sort order as release semantics;
- the complete series must replay sequentially from the pinned upstream commit.

Stable patch files are release artifacts/source. Patch development branches may move or be deleted after merge/export; release reproducibility must not depend on their current branch heads.

## 7. Release manifest and reproducibility

A release MUST pin an exact upstream commit. Use `downstream/release.json` based on `downstream/release.example.json`.

Conceptual form:

```json
{
  "schemaVersion": 1,
  "upstream": {
    "remote": "upstream",
    "branch": "goshujin",
    "commit": "40-character commit SHA"
  },
  "patchSeries": "downstream/patches/series",
  "addon": {
    "path": "downstream/addons/feishu"
  }
}
```

The downstream Add-on source is pinned by the downstream commit/tag used for the release. Release automation MUST record at least:

- upstream commit SHA;
- downstream release commit SHA/tag;
- ordered patch list;
- checksum/hash for each patch file;
- build/test result.

Do not release from an uncommitted or dirty working tree.

## 8. Ephemeral integration build

Release/build assembly MUST be disposable and reproducible.

Required model:

```text
exact upstream SHA
      |
      v
clean temporary git worktree
      |
      v
git am patch 1
      |
      v
git am patch 2
      |
     ...
      |
      v
test/build patched Pastebin
```

Feishu Add-on is a separate build target from the pinned downstream release commit:

```text
downstream release commit/tag
      |
      `-- downstream/addons/feishu
              |
              v
           test/build/deploy
```

Do not copy Feishu source into upstream `worker` or `frontend` merely to create a single artifact.

### 8.1 Fail-closed conflict behavior

Automated build MUST NOT use automatic three-way conflict resolution for release patch replay.

Forbidden release behavior:

```bash
git am --3way ...
git apply --3way ...
```

If replay fails:

1. stop the build;
2. identify the responsible patch;
3. return to its `patch/<id>` development branch;
4. update/rebase/adapt it against the new upstream base;
5. review and test again;
6. export a new patch series;
7. rerun clean assembly from scratch.

Generated integration trees MUST NEVER receive manual product fixes.

## 9. Required repository structure

```text
pastebin-worker/
|- upstream files ...
|- AGENTS.md
|- DECISIONS.md
|- docs/
|
`- downstream/
   |- release.example.json
   |
   |- patches/
   |  |- README.md
   |  |- series
   |  `- 010-non-expiring-paste/
   |     |- README.md
   |     `- *.patch
   |
   |- addons/
   |  `- feishu/
   |     |- frontend/
   |     |- worker/
   |     |- shared/
   |     |- tests/
   |     |- docs/
   |     |- migrations/
   |     |- README.md
   |     `- wrangler.toml
   |
   `- scripts/
      |- export-patch.sh
      |- check-patches.sh
      `- build-downstream.sh
```

## 10. Technology stack

Feishu Add-on SHOULD align with upstream tooling.

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS

Backend:

- Cloudflare Workers
- TypeScript

Testing:

- Vitest
- Cloudflare Workers test tooling where appropriate
- Testing Library for frontend behavior
- MSW or equivalent request mocking where appropriate

Do not introduce another application framework or a separate always-on Node server without an explicit architecture decision.

## 11. Feishu Web frontend visual rules

The Add-on frontend is an independent **web page**, not a page styled like the Feishu client.

It MUST visually follow the upstream Pastebin Worker Web UI wherever practical:

- minimal content-first layout;
- upstream-like background/foreground/default color tokens;
- similar spacing/content width;
- matching light/dark behavior;
- compact controls;
- upstream-like buttons/icons/rounded containers where reuse does not create harmful coupling.

Do NOT add by default:

- user avatars;
- user/profile panels;
- enterprise dashboard chrome;
- decorative sidebars;
- fake Feishu desktop/mobile chrome;
- unrelated navigation.

## 12. Markdown rendering and task semantics

Normal Add-on view renders GFM rather than upstream `/d/<name>` source view.

Required behavior:

<!-- prettier-ignore -->
```markdown
- [ ] task
- [x] completed
- [X] completed
```

renders as interactive task checkboxes.

Use a real GFM-compatible Markdown parser. Do not implement task lists with regex replacement.

Rendered HTML MUST be sanitized.

Text inside fenced code blocks MUST remain source text and MUST NOT become interactive tasks.

Markdown task state, Add-on visibility, and Paste retention are distinct concepts.

## 13. Paste binding and password model

A Feishu-managed entry maps to one upstream Paste.

Conceptual state:

```ts
interface PasteBinding {
  id: string
  feishuRecordKey: string
  pasteName: string
  rawUrl: string
  articleUrl?: string
  managementPassword: string // backend only
  visibility: "active" | "archived"
  retentionMode: "permanent" | "timed"
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}
```

Source-of-truth rules:

- Paste body: upstream KV/R2.
- Feishu mapping/lifecycle metadata: Add-on state store.
- Do not persist a second authoritative full Paste body in the Add-on database.

At creation the Add-on SHOULD generate a cryptographically strong management password and supply it to upstream using the existing password field. Browser-visible responses MUST omit that secret.

All upstream PUT/DELETE operations MUST be performed by the Add-on backend.

## 14. Completion and retention lifecycle

Active Feishu-managed entries are non-expiring.

Clicking a normal rendered task checkbox from unchecked to checked MUST NOT immediately commit a retention decision. First present exactly these actions:

1. **永久归档** — set Markdown task to checked, hide from Active, keep Paste non-expiring, show in Archive.
2. **限期归档** — set Markdown task to checked, hide from Active, switch Paste to `MAX_EXPIRATION`, show in Archive with authoritative countdown.
3. **删除** — destructive confirmation, delete upstream Paste, remove active binding; deleted items are not shown in Archive in v1.

Cancel leaves the task unchanged.

Archive contains only entries that still exist: permanent archive and expiring archive.

Timed countdown MUST use authoritative backend/upstream `expiresAt`, never `browser_now + MAX_EXPIRATION`.

Restore MUST return an archived entry to:

```text
Markdown: unchecked
visibility: active
retention: permanent
expiresAt: null
```

For timed archive, expiration cancellation/upstream permanent transition MUST succeed before restore is reported successful.

## 15. Batch Mode

Batch Mode exists because asking for one completion decision per checkbox is inefficient.

Batch selection MUST use a separate UI control from Markdown task checkboxes.

Conceptually:

```text
Batch selector   Markdown task state
     |                  |
     v                  v
     □                  ☐ Task A
     □                  ☐ Task B
```

Never overload a Markdown checkbox as a batch-selection control.

Batch actions are exactly:

```text
archive_permanent
archive_expiring
delete
```

Batch mutation MUST go through the Add-on backend.

The batch API MUST support partial success. Do not pretend a multi-Paste HTTP operation is globally transactional.

If 18 of 20 items succeed, report 18 successes and 2 failures with per-item outcomes. Failed items SHOULD remain selected for retry.

Batch delete requires destructive confirmation. Permanent archive does not require a second destructive confirmation. Expiring archive requires one confirmation for the whole selected set.

## 16. Testing requirements

At minimum, tests must cover:

### Patch compatibility

- complete ordered patch series replays from pinned upstream SHA;
- permanent KV behavior;
- permanent R2 behavior/cleanup;
- existing timed expiration remains backward compatible;
- `e=max` uses deployment maximum;
- no Feishu concepts appear in generic patch behavior.

### Frontend

- GFM unchecked/checked task rendering;
- nested tasks;
- fenced-code task syntax remains literal;
- single-item action dialog does not mutate on cancel;
- separate Batch Mode selectors;
- batch toolbar selected count;
- archive countdown rendering;
- restore behavior;
- dark/light style compatibility where implemented.

### Backend

- management password never returned to client;
- single permanent archive;
- single timed archive;
- delete;
- restore and expiration cancellation;
- batch permanent archive;
- batch timed archive;
- batch delete;
- partial failure response;
- retry/idempotency behavior where required.

### Build/release

- dirty release checkout rejected;
- pinned upstream commit exists;
- all `series` entries exist;
- unclean patch replay fails closed;
- release provenance contains upstream/downstream SHAs and patch hashes.

## 17. Commit and PR review context

Use Conventional Commit subjects, for example:

```text
feat(feishu): add batch selection mode
fix(feishu): keep failed batch items selected
feat(expiration): support non-expiring pastes
build(downstream): replay patch series from pinned upstream
chore(upstream): sync goshujin to <sha>
docs(git): define patch export and release workflow
```

A non-trivial commit body MUST contain enough context for an AI reviewer that cannot infer product intent from a task title alone.

Required sections:

```text
Context:
<business/user need>

Expected behavior:
<business rules and externally observable behavior>

Acceptance criteria:
- ...

Constraints:
- architecture/security/upstream/non-goals

Validation:
- exact tests/checks run and result

Docs:
- files updated or N/A with reason

Refs:
- issue/task/decision/patch id when applicable
```

For upstream patch commits additionally include:

```text
Upstream base:
<exact SHA>

Patch ID:
<stable patch id>

Dependencies:
<none or explicit prerequisite patch IDs>
```

PR descriptions MUST provide the same context at PR scope and list the affected docs/tests.

If the issue/task contains only a title or lacks acceptance criteria, agents MUST first resolve the requirement from `DECISIONS.md` and the relevant design docs. If ambiguity remains, ask the owner. Do not invent business behavior.

## 18. Required development workflow

For every non-trivial change, the approved planning artifacts (PLAN → owner approval → SPEC → owner approval → PHASE decomposition → TODO → owner approval) MUST exist before implementation starts, with durable reviewable references (`docs/CHANGE_CONTEXT_AND_REVIEW.md` §10); each approved artifact MUST be persisted to its durable location before the next workflow stage advances (§10.7 persistence checkpoint). Behavioral changes MUST record TDD evidence per `docs/TESTING.md` §1.1.

1. Read `AGENTS.md`.
2. Read `DECISIONS.md`.
3. Read relevant docs.
4. Identify whether the change belongs to Add-on code, generic upstream patch, docs/build infrastructure, or a combination.
5. Establish Context, Expected behavior, Acceptance criteria, Constraints, and Validation plan via the approved PLAN/SPEC/PHASE/TODO artifacts before implementation.
6. Select the correct branch type.
7. Write or update failing tests first for behavior changes.
8. Implement the smallest correct change.
9. Run affected tests/type checks/build checks.
10. If an upstream patch changed, export it from its dedicated branch and replay the complete ordered series from the pinned upstream SHA.
11. Update docs in the same PR.
12. Commit with complete review context.
13. Open PR; do not self-merge or bypass required checks.
14. For release, build only from committed/pinned inputs and regenerate integration from scratch.

## 19. Forbidden shortcuts

Agents MUST NOT:

- turn Pastebin into Memos/knowledge-base software;
- add Feishu-specific conditionals to generic upstream patches;
- directly expose Paste management passwords;
- store a second authoritative copy of Paste content;
- make checkbox completion automatically imply a retention mode;
- keep directly deleted entries in Archive in v1;
- use Markdown task checkboxes as Batch Mode selectors;
- calculate timed expiry solely in the browser;
- merge moving patch branch heads during production release;
- infer patch order from filenames/directories without reading `series`;
- use automatic three-way resolution during release replay;
- patch a generated integration tree by hand;
- maintain a manually edited long-lived deploy/integration branch;
- silently continue after partial patch replay;
- weaken or delete tests merely to make CI pass;
- commit a non-trivial change with only a title and no review context;
- directly merge arbitrary upstream/external PR branches into `downstream/main`;
- treat upstream PR open/closed/rejected/ignored status as evidence of code quality;
- adopt an external change without provenance recording and independent validation;
- keep a duplicate carried downstream patch after official upstream includes the equivalent change;
- apply upstream-owned dependency/file changes outside an exported downstream patch;
- modify `upstream-sync` for any downstream purpose;
- merge a PR that has not passed the latest-HEAD AI Review Gate;
- treat "no bot comments" as bot approval;
- self-override a blocking finding, or approve a bot-outage/blocking override without owner authorization;
- start dependent-phase work from an unmerged phase branch;
- merge a patch source review-only PR into `upstream-sync`;
- dismiss actionable bot findings without fixing or recording an owner-approved disposition.

## 20. Completion checklist

A change is not complete until all applicable items pass:

- [ ] Correct ownership boundary selected: Add-on vs upstream patch.
- [ ] Correct branch type used.
- [ ] Tests added/updated before behavior implementation where applicable.
- [ ] Feishu frontend remains visually aligned with minimal upstream Web UI.
- [ ] Passwords remain server-side.
- [ ] Single-item lifecycle matches permanent archive / timed archive / delete.
- [ ] Batch selector remains distinct from Markdown task checkbox.
- [ ] Batch partial failures are surfaced per item.
- [ ] Timed archive uses authoritative `expiresAt`.
- [ ] Restore cancels expiration before success.
- [ ] Upstream patch is generic and isolated.
- [ ] Patch branch was exported with reviewed commit messages.
- [ ] `downstream/patches/series` explicitly contains the release order.
- [ ] Complete series replays cleanly from pinned upstream commit.
- [ ] Generated integration tree was not manually edited.
- [ ] Commit/PR includes business context, acceptance criteria, constraints, validation, and docs impact.
- [ ] Relevant docs updated.
- [ ] Adopted external changes record provenance (origin repository, PR URL/number, original author/commits, upstream status at adoption) and validation.
- [ ] Upstream-owned dependency/upstream-file changes appear only as exported patches, never as direct commits to `downstream/main`.
- [ ] Carried patches are retired (with a recorded reason) when equivalent upstream changes are merged.
- [ ] AI Review Bot completed a review of the current HEAD (or an explicit recorded owner override exists).
- [ ] Every actionable finding is fixed or explicitly dispositioned, with no blocking finding self-dispositioned by an agent.
- [ ] Required CI/checks are green for the current reviewed HEAD.
- [ ] Dependent next-phase work starts only after the previous phase/PR merged and the target branch was refreshed.
- [ ] Approved PLAN/SPEC/PHASE/TODO artifacts exist with durable references, persisted before the next workflow stage advanced (exemptions limited to genuinely trivial changes and the recorded governance bootstrap exception; TDD/test-first exceptions do NOT exempt planning artifacts).
- [ ] Owner approval of planning artifacts was explicit (not implied by silence).
- [ ] TDD evidence (RED/GREEN/REFACTOR/REGRESSION) recorded per `docs/TESTING.md` §1.1, or `TDD: N/A` with reason and alternative verification.
