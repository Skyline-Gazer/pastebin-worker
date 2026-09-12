# FT-DEFECT-02 PLAN — Add-on Web product / information architecture remediation

Status: PLAN READY FOR OWNER REVIEW

Implementation has NOT started.

Parent umbrella: [ft-defect-remediation.md](ft-defect-remediation.md) — [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)

Tracking issue: [#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135)

Function Test remains PAUSED. `FT-03_DATA_PATH: PASS` does **not** mean Web UX is accepted. `FT-04+` is not started.

## Objective

Remediate the Add-on Web information architecture so a logged-in user can recognize, open, copy, and (when honest) download their entries, with distinct text vs file presentation, distinct checkbox metaphors, and usable desktop/mobile layout.

Owner visual observation remains authoritative. Unit tests alone cannot mark this workstream PASS.

Later deploy boundary: `pastebin-feishu-prod`. Not this turn.

## Context

Known problems from the accepted defect audit:

- Opaque `pasteName` used as the main title (`<h2>{entry.pasteName}</h2>`).
- `publicUrl` exists in the listing API but is not rendered.
- No useful Open / Copy / Download actions.
- All content forced through one Markdown/card model.
- `ManagedTaskCheckbox` is rendered on every Active entry, even when the body has no GFM task.
- Markdown task checkboxes, lifecycle completion, and Batch selection collide visually.
- Mixed language/chrome; leftover `fixture-entry` structure; weak mobile / long-content layout.
- Current unit tests do not establish usable IA.

Dependencies (do not collapse):

- Workstream B (FT-DEFECT-03) establishes the dual-provider session/login model. Do not implement this UI from an unmerged B branch.
- Workstream A (FT-DEFECT-01) establishes TEXT / UNENCRYPTED FILE / ENCRYPTED FILE URL semantics. Do not present `/d/<name>` as direct file bytes. Do not assume every entry is plain Markdown.

## Assumptions (with verification)

- `GET /api/entries` already returns `publicUrl`, `pasteName`, `content`, lifecycle fields: verify `docs/API_CONTRACT.md` and entries-list tests.
- Listing currently always includes `content` and `managedTask`: verify Worker projection. File cards MUST NOT fabricate filename/MIME; SPEC defines when those fields may be added from upstream metadata (`/m/<name>` via PasteClient), not from guessing.
- GFM task rendering is a locked product requirement (`AGENTS.md` §12, `docs/FRONTEND.md`): keep a real GFM parser; fenced code stays literal.
- Batch Mode already has a separate `BatchSelector`: verify `App.tsx`. Lifecycle actions already exist in Chinese (永久归档 / 限期归档 / 删除 / 恢复).
- ego-lite does not inherit the owner's Chrome cookie jar: visual PASS may require owner acceptance if automation cannot see the authenticated real-data page.

## Non-goals

- No Pastebin (`pastebin-prod`) change in this workstream.
- No dual-provider auth/webhook/schema design (owned by DEFECT-03). This UI consumes B's login routes and session `brand`/`provider`.
- No account linking UI.
- No Feishu-client chrome, avatars, or enterprise dashboard.
- No fabrication of filename/MIME when upstream metadata does not provide it.
- No generic “Managed task” checkbox on entries whose content has no GFM task.
- No FT-04, no P2P, no Paste deletion, no production deploy in this planning turn.

## Risks / unknowns

- File-card honesty depends on whether PasteClient can read metadata without storing a second body. SPEC chooses additive optional listing fields sourced from upstream `/m/` (or equivalent already-fetched headers). If metadata is unavailable, the card stays a text/message card with Open/Copy URL only — never a fake Download filename.
- Encrypted Pastebin files with `#key` are a Pastebin-web concern; Feishu-managed creates are not client-encrypted today. Do not invent encrypted-file cards unless listing metadata honestly says the Paste is encrypted.
- Visual PASS cannot be claimed from JSDOM. If screenshot automation cannot use the owner cookie jar, the issue stays open pending owner visual acceptance rather than being downgraded.

## Proposed implementation approach (later)

1. Start only after DEFECT-03 is merged (refreshed `downstream/main`) and DEFECT-01 URL semantics are stable enough to consume.
2. Logged-out: product identity + `Sign in with Feishu` + `Sign in with Lark` using B's login routes. Do not auto-start a single-provider OAuth from the page.
3. Logged-in header: product name, provider badge (Feishu or Lark from session), theme, logout.
4. Primary views remain Active / Archive (`进行中` / `归档`).
5. Derive a user-readable title for text/message entries: first non-empty line, else `Untitled`. `pasteName` is secondary metadata.
6. If honest file metadata exists, render a file card: filename, MIME/size when present, Download to `/<name>?a` (Workstream A), Open/view where meaningful, Copy URL. Never put Display `/d/` where the UI promises file download.
7. Reconcile three checkbox concepts in layout and semantics (SPEC). Preserve GFM task rendering. Remove the extra Managed-task control from entries with no task list.
8. Expose lifecycle actions clearly. Archive countdown uses authoritative `expiresAt`. Batch selectors appear only in Batch Mode.
9. Responsive: bounded content width on desktop; no horizontal overflow on mobile; actions wrap; dialogs stay in viewport.
10. Validate on the owner's authenticated real-data page (desktop + mobile). Tests cover IA contracts but do not by themselves PASS the UX defect.

## Candidate files/components (candidates only)

- `downstream/addons/feishu/frontend/App.tsx` and related card/header/login components
- `downstream/addons/feishu/frontend/ManagedTaskCheckbox.tsx` (likely removed from the default card)
- listing projection in the Add-on Worker if optional file metadata fields are added
- `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/API_CONTRACT.md`
- frontend tests plus an explicit visual-acceptance checklist (not a substitute for owner/ego-lite review)

## Validation strategy

- Contract tests: logged-out dual login hrefs; logged-in provider badge; title derivation; `publicUrl` rendered; file card only when metadata present; no `/d/` download lie; no Managed-task checkbox without GFM tasks; batch selector only in Batch Mode; countdown not treated as body text.
- Responsive tests where practical.
- **Visual acceptance** on authenticated `https://pb.test.223.im` real data: desktop, mobile, Active, Archive, long content, Markdown tasks, Batch Mode, provider chooser. Owner observation wins. If automation cannot access the cookie jar, require owner visual acceptance; do not close the UX defect from unit tests.

## References

- Umbrella: `docs/planning/ft-defect-remediation.md`
- SPEC: `docs/planning/ft-defect-02-spec.md`
- A semantics: `docs/planning/ft-defect-01-spec.md`
- B session/login: `docs/planning/ft-defect-03-spec.md`
- `docs/DESIGN.md`, `docs/FRONTEND.md`, `AGENTS.md` §11–§15

Status: PLAN READY FOR OWNER REVIEW
Implementation has NOT started.
