# AGENTS.md — Mandatory AI Coding Agent Instructions

## 1. Mission

This repository is a downstream distribution of `SharzyL/pastebin-worker`.

The upstream project MUST remain a Pastebin. The downstream project adds an independent **Feishu Add-on** that uses the Pastebin HTTP API and password-based update/delete model. The Add-on is not a replacement Pastebin, not a second content database, and not a Feishu-client-styled application.

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
if (source === "feishu") { /* special behavior */ }
```

Forbidden upstream patch logic:

```ts
if (content.includes("- [x]")) { /* expire Paste */ }
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

- no Feishu code;
- no downstream patches applied as committed source;
- no downstream product customization;
- update by fetching upstream and fast-forwarding/moving this branch to the chosen upstream commit.

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

For every non-trivial change:

1. Read `AGENTS.md`.
2. Read `DECISIONS.md`.
3. Read relevant docs.
4. Identify whether the change belongs to Add-on code, generic upstream patch, docs/build infrastructure, or a combination.
5. Establish Context, Expected behavior, Acceptance criteria, Constraints, and Validation plan before implementation.
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
- commit a non-trivial change with only a title and no review context.

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
