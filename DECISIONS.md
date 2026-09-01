# Locked Project Decisions

AI coding agents MUST treat these as locked unless the owner explicitly changes them.

## D-001 — Upstream remains a Pastebin

The project is based on `SharzyL/pastebin-worker`. Upstream remains a Pastebin and continues tracking upstream development.

## D-002 — Feishu is an independent Add-on

Feishu frontend, webhook/Bot backend, bindings, password management, archive/retention decisions, batch operations, and Feishu-facing APIs live under `downstream/addons/feishu`.

## D-003 — Upstream syncability is primary

Upstream-owned application source is not the normal home for downstream product logic. Required upstream behavior changes are kept as small generic patches.

## D-004 — Feishu frontend uses upstream-aligned stack

Frontend uses React + Vite + TypeScript + Tailwind CSS.

## D-005 — Feishu frontend follows upstream Pastebin Worker web style

The Add-on page is a normal Web page, not a Feishu-client UI. It should reuse or closely match upstream Web visual language: minimal layout, spacing, colors, dark mode, compact controls, and content-first presentation.

Do not add avatars, user/profile panels, enterprise dashboards, decorative sidebars, or Feishu-client chrome by default.

## D-006 — Markdown is rendered by default

Normal Add-on view renders GFM. `- [ ]`, `- [x]`, and `- [X]` render as checkboxes. Raw Markdown is optional secondary UI only.

## D-007 — Feishu-managed updates use upstream password model

Each managed Paste has a management password generated/held by the Add-on backend. Passwords are never exposed to browser/chat and are used transparently for PUT/DELETE.

## D-008 — Paste body stays in upstream storage

Upstream Paste is the content source of truth. Add-on persistence stores mapping/lifecycle metadata, not a duplicate authoritative body.

## D-009 — Active Feishu entries are non-expiring

A Feishu-managed Active entry is created/maintained using a generic non-expiring Paste capability supplied by a small upstream patch.

## D-010 — Single completion has three explicit actions

When a normal-mode managed checkbox is completed, the frontend offers exactly:

1. **永久归档** — checked, hidden from Active, non-expiring, visible in Archive.
2. **限期归档** — checked, hidden from Active, `MAX_EXPIRATION`, visible in Archive with countdown.
3. **删除** — destructive confirm, upstream DELETE, binding removed; not visible in Archive in v1.

Checking does not automatically select one action.

## D-011 — Archive contains only existing archived entries

Archive contains permanent and expiring archives. Directly deleted entries do not remain as tombstones/trash in v1.

## D-012 — Timed archive uses authoritative countdown

Countdown derives from authoritative `expiresAt`, not a browser-computed future deadline.

## D-013 — Restore cancels expiry

Restoring archived entries returns them to Active + permanent retention and cancels upstream expiration before success is shown.

## D-014 — Batch Mode uses separate selectors

Batch selection is UI state separate from Markdown checkbox state. A Markdown checkbox must never double as a batch selector.

Batch actions are the same three actions: permanent archive, expiring archive, delete.

## D-015 — Batch API supports partial success

Batch mutation is backend-orchestrated and per-Paste. It is not globally transactional. API responses expose per-item outcome and aggregate counts so failed items can be retried.

## D-016 — Generic retention patch only

The initial upstream patch exposes generic non-expiring / maximum-expiration behavior such as `e=never` and `e=max`. It contains no Feishu, archive, checkbox, or batch logic.

## D-017 — Add-on is one cohesive downstream unit

Feishu frontend, webhook/backend, shared types, tests, migrations, and docs belong to the same Add-on source unit even if frontend and Worker build/deploy separately.

## D-018 — Patch incompatibility fails closed

If the ordered patch series no longer replays cleanly on the pinned upstream baseline, release/build stops for explicit review. Automated three-way guessing is not allowed for release assembly.

## D-019 — Review context is part of the deliverable

Non-trivial changes must carry enough written context for AI and human review. A task title alone is not sufficient. Commit bodies and PR descriptions must state the business/user requirement, expected behavior/business rules, acceptance criteria, constraints/non-goals, validation evidence, and documentation impact.

If the source issue/task is underspecified, agents must resolve ambiguity from locked project decisions/docs or ask the owner rather than inventing product behavior.

## D-020 — Patch branches are development workspaces

Each independent upstream patch is developed on its own `patch/<id>` branch from the exact upstream commit it targets. Patch branches are not production build inputs.

## D-021 — Stable ordered patch series is the release contract

After review, patch commits are exported with `git format-patch` into `downstream/patches/<id>/`. `downstream/patches/series` explicitly defines replay order. Release automation applies only the listed patch files.

## D-022 — Release pins exact upstream and downstream revisions

Every release pins an exact upstream commit. The Add-on, patch files, manifests, scripts, and docs are pinned by the exact downstream release commit/tag.

Moving branch heads must never determine a production build.

## D-023 — Integration is ephemeral

There is no manually maintained long-lived `deploy` or `build/integration` branch. A clean temporary worktree is generated from the pinned upstream SHA, the ordered patch series is replayed, tests/builds run, and the worktree is disposable.

Manual fixes in generated integration trees are forbidden.

## D-024 — Independent patches do not form hidden branch chains

Independent patches should branch directly from the target upstream baseline. If one patch truly depends on another, the dependency must be explicit in documentation/series metadata and the complete series must still replay from the pinned base.

## D-025 — Patched Pastebin and Feishu Add-on are separate build targets

The patched Pastebin is `pinned upstream + ordered generic patches`. The Feishu Add-on is built from `downstream/addons/feishu` at the pinned downstream release revision. The Add-on is not copied into upstream frontend/worker merely to create one artifact.

## D-026 — `downstream/main` is the downstream control branch

`downstream/main` owns the Feishu Add-on, exported patch series, manifests, scripts, docs, and review metadata. It is not a manually patched production tree. Production assembly still starts from the exact pinned upstream SHA and replays the stable patch series in a disposable worktree.

## D-027 — Actively curated downstream distribution

### Decision

The project is an actively curated downstream distribution of `SharzyL/pastebin-worker` rather than a passive fork.

### Rationale

Official upstream may merge contributions slowly or inconsistently, so downstream releases cannot depend on upstream acceptance timing. Downstream MAY independently adopt open upstream PRs, closed-but-unmerged PRs, third-party contributor fixes, upstream Dependabot dependency updates, security fixes, and compatibility fixes — provided each adopted change is independently reviewed, tested, documented, and carried as an explicit downstream patch.

### Consequences

Positive:

- downstream can independently fix issues;
- dependency/security updates can be adopted promptly;
- useful third-party PRs can be carried;
- release cadence is controlled locally.

Costs:

- every adopted unmerged change becomes downstream maintenance responsibility;
- patch provenance must be maintained;
- upstream updates require patch-stack compatibility testing;
- equivalent upstream changes require downstream patch retirement.

### Boundary

`upstream-sync` still remains a clean official upstream mirror/reference and MUST NOT contain adopted PRs, unmerged dependency updates, Feishu code, downstream patches, downstream documentation, or downstream-only fixes.
