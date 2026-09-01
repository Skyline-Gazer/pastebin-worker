# Patch and Upstream Maintenance

## 1. Purpose

The downstream is an actively curated distribution. It SHOULD behave like:

```text
release N = exact upstream SHA + reviewed ordered generic patch series
```

The Feishu Add-on remains a separate downstream component and is not encoded as one giant upstream patch.

This minimizes merge conflict surface and makes upstream upgrades auditable.

Release timing MUST NOT depend on official upstream acceptance. Changes that official upstream has not merged MAY still be carried downstream as explicit patches after independent review, testing, documentation, and provenance recording.

## 2. Clean upstream mirror

`upstream-sync` mirrors upstream `SharzyL/pastebin-worker:goshujin` and contains no downstream product behavior, no adopted PRs, no dependency updates not merged upstream, no downstream patches, and no downstream documentation.

Never use `upstream-sync` as a place to "temporarily" fix downstream behavior or to adopt unmerged changes. Any change not present in official upstream is downstream-owned.

## 3. Curated adoption of external changes

### 3.1 Why curation exists

Official upstream may merge contributions slowly, inconsistently, or never. The downstream maintainer therefore evaluates changes independently:

```text
Upstream change available
        │
        ▼
Has official upstream already merged it?
        │
       yes
        │
        ▼
sync through upstream-sync

        OR

       no
        │
        ▼
Is the change useful to this downstream?
        │
       yes
        │
        ▼
independent review
        ↓
tests / compatibility validation
        ↓
adopt as downstream patch
        ↓
record provenance
        ↓
carry until removed / superseded / upstreamed
```

The official upstream maintainer's merge decision (or lack of response) MUST NOT by itself determine whether a change is acceptable downstream.

### 3.2 Candidate sources and evaluation

A candidate MAY come from:

- open upstream PRs;
- closed-but-unmerged upstream PRs;
- abandoned upstream PRs;
- third-party contributor fixes;
- upstream Dependabot dependency updates;
- downstream-identified bugs/security/compatibility fixes.

An upstream PR being open, closed, rejected, ignored, or unmerged MUST NOT be treated as sufficient evidence that the code is good or bad.

Every candidate MUST be independently evaluated for at least:

- correctness;
- compatibility with the currently pinned upstream SHA;
- tests;
- regression risk;
- API/behavior changes;
- security implications where relevant;
- maintenance burden;
- license / IP compatibility (the source repository license must permit adoption);
- interaction with the existing downstream patch stack.

Once adopted, the downstream project owns the maintenance responsibility for that change until it is removed or superseded.

### 3.3 Provenance requirements

Every externally sourced downstream patch MUST preserve provenance. Documented structure:

```text
downstream/patches/
└── 120-adopt-upstream-pr-123/
    ├── README.md
    └── 0001-fix-example-problem.patch
```

The accompanying README SHOULD record at minimum:

```text
Patch ID
Title
Origin repository
Original PR URL / number
Original author
Original commit SHA(s)
Upstream PR status when adopted
Adoption date
Reason for carrying downstream
Local changes made after adoption, if any
License / IP compatibility
Attribution / NOTICE requirements
Validation performed
Known risks / limitations
Dependencies on other downstream patches
Removal condition
Upstreamed/superseded status
```

Do not fabricate unknown information, including license status. Unknown data MUST be explicitly marked `unknown` / `not available`.

Do not strip attribution. If license/IP compatibility cannot be established with sufficient confidence, adoption MUST STOP and be escalated to the owner. Same-upstream PRs may be straightforward under the repository's contribution/license context, but provenance must still be preserved; cross-repository copied/adapted code requires explicit license compatibility verification.

When possible, preserve original Git authorship when adopting commits. Do not rewrite third-party authorship as if the downstream maintainer authored the original change.

### 3.4 Patch lifecycle

```text
candidate
   ↓
reviewed
   ↓
adopted
   ↓
carried downstream
   ↓
one of:
   ├── upstreamed
   ├── superseded
   ├── no longer needed
   └── rejected/removed
```

If official upstream later includes an equivalent change:

1. update `upstream-sync`;
2. attempt a clean downstream assembly;
3. determine whether the carried patch is now duplicate or obsolete;
4. remove the downstream patch from the ordered series;
5. record why it was removed;
6. re-run the complete relevant test/build suite.

Do NOT keep a duplicate downstream patch merely because it historically existed.

### 3.5 Dependabot policy

#### 3.5.1 Already merged by official upstream

If official upstream merges the dependency update:

```text
official upstream
    ↓
upstream-sync
```

No downstream patch is necessary unless additional downstream adaptation is required.

#### 3.5.2 Official upstream Dependabot PR not merged

The downstream maintainer MAY adopt it independently.

If the dependency change modifies upstream-owned files such as:

```text
package.json
pnpm-lock.yaml
.github/workflows/*   (modifications to workflows that already exist upstream)
frontend/*
worker/*
shared/*
```

or modifies workflows that already exist in official upstream, and is not present in official upstream, treat it as a downstream upstream-modification patch. New downstream-only workflows (for example downstream CI covering `downstream/` or `docs/`) are not upstream patches and belong directly to `downstream/main`. It MUST go through:

```text
candidate dependency update
        ↓
dedicated patch development/review
        ↓
tests
        ↓
ordered patch series
```

Do NOT directly commit such upstream dependency changes into `downstream/main`.

#### 3.5.3 Dependencies belonging only to downstream-owned code

For dependencies inside:

```text
downstream/addons/feishu/
```

or other downstream-owned tooling, normal downstream PRs MAY merge into:

```text
downstream/main
```

They do NOT need to become an upstream patch because they do not modify upstream-owned application code.

## 4. What belongs in a patch

A patch is justified only when the Add-on cannot provide the required capability through existing upstream APIs, or when a fix (bug, security, compatibility) must touch upstream-owned code. Adopted external changes follow the same rule once they affect upstream-owned code.

Initial generic requirement:

```text
e=never -> non-expiring Paste
e=max   -> deployment MAX_EXPIRATION
```

The patch may need to update upstream expiration metadata, KV behavior, R2 metadata/cleanup, validation, and tests.

The patch must not know about:

- Feishu;
- checkbox state;
- Active/Archive pages;
- Batch Mode;
- Feishu bindings;
- Feishu management workflow.

## 5. One patch, one development branch

Each logically independent patch is developed on its own `patch/<id>` branch from the exact upstream base it targets.

Example:

```text
upstream SHA abc123
├─ patch/non-expiring-paste
├─ patch/generic-capability-b
└─ patch/adopt-pr-123-multipart-fix
```

This isolates review and makes upstream upgrade failures attributable.

Do not stack independent patch branches merely because the release replay order is A then B then C.

## 6. True dependencies

Patch dependency and patch ordering are not the same thing.

If B truly requires API/schema behavior introduced by A:

- document `requires: A` in B's README;
- keep the dependency visible in review;
- ensure `series` lists A before B;
- ensure the entire series replays from the pinned upstream base.

Do not rely on hidden branch ancestry as the only expression of dependency.

## 7. Export reviewed branches, do not merge them into release

After a patch branch passes review and tests, switch to a `downstream/main` checkout/worktree and export the reviewed branch into the downstream patch directory. For an independent patch:

```bash
downstream/scripts/export-patch.sh \
  <UPSTREAM_SHA> \
  patch/<name> \
  <NNN-patch-id>
```

For a truly dependent patch, pass `--start <PREREQUISITE_STACK_TIP>` so only the dependent commits are exported while `--base` metadata still records the original upstream base. The dependency must also be documented explicitly.

Why `format-patch`/`git am` rather than a raw working-tree diff:

- preserves commit boundaries;
- preserves commit messages and AI-review context;
- preserves original Git authorship where adoption preserves it;
- supports multi-commit patch series;
- gives a deterministic ordered replay model;
- keeps the release independent of moving branch heads.

## 8. Ordered series

`downstream/patches/series` is the only release patch-order authority.

Example:

```text
# Generic expiration capability
010-non-expiring-paste/0001-expiration-support-non-expiring-pastes.patch
010-non-expiring-paste/0002-expiration-skip-permanent-r2-cleanup.patch

# Adopted upstream fix
120-adopt-upstream-pr-123/0001-fix-example-problem.patch
```

Rules:

- replay exactly top to bottom;
- never automatically apply every `.patch` found in the tree;
- never rely on lexical directory sort as the contract;
- fail when a listed file is missing;
- ignore unlisted patch files during release assembly.

## 9. Patch ID ranges

The numeric prefix of a patch directory is an organizational category convention. A reasonable model:

```text
000-099   core downstream capabilities
100-199   adopted upstream/backport fixes
200-299   dependency/toolchain updates
300-399   compatibility/platform fixes
900-999   deployment/local downstream-specific patches
```

Examples:

```text
010-non-expiring-paste
120-adopt-pr-123-multipart-fix
210-vite-security-update
320-cloudflare-runtime-compat
```

These ranges are organizational conventions only. The `900-999` range means patches that MUST modify upstream-owned source to support a local deployment. Deployment scripts, Feishu configuration, and CI that live entirely under `downstream/` are normal `downstream/main` content; do not force them into a patch merely to fit a category. The actual authoritative application order MUST still come from the ordered `downstream/patches/series` file. Never make directory lexical ordering the source of truth.

## 10. Validation

Patch validation must replay the series sequentially in a clean temporary worktree created from the pinned upstream commit.

Preferred validation mechanism:

```text
git worktree add --detach <tmp> <UPSTREAM_SHA>
git am patch-1
git am patch-2
...
```

Do not validate a dependent series by running `git apply --check` on all patch files against the same untouched base; later patches may legitimately depend on earlier patches in the series.

## 11. Fail closed

Release automation must not use automatic three-way merge guessing:

```text
NO: git am --3way
NO: git apply --3way
```

A failed replay means the patch must be consciously adapted and reviewed.

The correct repair path is:

```text
new upstream SHA
      ↓
series replay fails at patch X
      ↓
return to patch/X development branch
      ↓
adapt + tests + review
      ↓
export replacement patch
      ↓
replay whole series from scratch
```

## 12. Patch metadata

Each patch directory should document:

- stable patch ID/name;
- purpose;
- generic behavior;
- upstream base used during latest development;
- source development branch;
- dependencies, if any;
- test coverage;
- compatibility notes.

Adopted external patches MUST additionally document the provenance fields from §3.3 (origin, PR URL/number, original author and commit SHA(s), upstream status at adoption, adoption date, removal condition, upstreamed/superseded status). Unknown fields are marked `unknown` / `not available`.

The patch directory README is explanatory metadata; the `.patch` files and `series` order are the executable release representation.

## 13. Release provenance

A release should record:

- upstream SHA;
- downstream release SHA/tag;
- ordered patch filenames;
- patch file hashes;
- test/build status.

That allows a historical release to be reconstructed without requiring old patch branch heads to still exist.

## 14. Patch review and promotion gates

Canonical review-process details live in `docs/CHANGE_CONTEXT_AND_REVIEW.md` §9; this section covers the patch-specific lifecycle.

### 14.1 Stage A — source patch review (review-only)

A generic upstream patch's source branch MUST NOT be merged into `upstream-sync`. Its review happens on a REVIEW-ONLY PR whose title/body MUST clearly state:

```text
REVIEW ONLY — DO NOT MERGE INTO upstream-sync
```

The review PR base MUST resolve to the exact same pinned upstream SHA used by the patch:

- normally `upstream-sync` MAY be used as the review base only if it still resolves to that exact pinned SHA;
- if `upstream-sync` has advanced, do NOT rebase the patch merely to make the PR convenient, and do NOT compare against an unrelated newer base;
- if the repository workflow requires a GitHub base branch, use an appropriate temporary review-base branch/ref pointing to the exact pinned upstream SHA; clearly mark it temporary/review-only, never use it as a release input, and delete it after the review/promotion lifecycle if safe;
- do not create the temporary ref unless necessary.

The source patch PR MUST go through the AI Review Bot + CI review loop (§9) and is never merged into `upstream-sync`. Export the patch (`git format-patch`) only after source review passes.

### 14.2 Stage B — patch promotion review

After source review passes:

```text
reviewed patch/<id>
       ↓
git format-patch
       ↓
downstream promotion branch from downstream/main
       ↓
add patch artifact + README/provenance + series entry
       ↓
full series replay from pinned upstream SHA
       ↓
PR -> downstream/main
       ↓
AI Review Bot + CI
       ↓
fix/re-review loop
       ↓
merge promotion PR
```

The promotion PR MUST make reviewable:

- reviewed source commit(s);
- exact upstream base SHA;
- exported patch files;
- patch provenance (including the license/IP and attribution fields from §3.3);
- dependencies;
- series position/order;
- complete replay result;
- relevant tests.

The patch phase is NOT complete merely because the source patch PR passed review; it is complete only after the reviewed exported patch is promoted and merged into `downstream/main`.
