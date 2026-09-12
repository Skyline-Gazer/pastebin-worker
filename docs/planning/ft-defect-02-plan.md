# FT-DEFECT-02 PLAN — Add-on Web product / information architecture remediation

Status: PLAN READY FOR OWNER REVIEW

Implementation has NOT started.

Parent umbrella: [ft-defect-remediation.md](ft-defect-remediation.md) — [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)

Tracking issue: [#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135)

Function Test remains PAUSED. `FT-03_DATA_PATH: PASS` does **not** mean Web UX is accepted. `FT-04+` is not started.

## Objective

Remediate the Add-on Web information architecture so a logged-in user can recognize, open, copy, and (when honest) download their entries, with distinct text vs file presentation, distinct checkbox metaphors, and usable desktop/mobile layout.

**Locked UI foundation (owner product decision):** keep the existing React 19 + TypeScript + Vite + Tailwind CSS 4 + Cloudflare Worker Assets stack. Adopt **shadcn/ui** (new-york / current default), **Lucide**, and **Sonner** as the primitive/design-system layer. shadcn MUST NOT become the product architecture. Do not migrate to Next.js, Remix, React Router framework mode, Ant Design, Arco, Semi, Material UI, or another SPA framework.

Owner visual observation remains authoritative. Adopting shadcn does **not** itself satisfy the UX defect. Unit tests alone cannot mark this workstream PASS.

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
- Chrome is hand-written CSS plus ad-hoc controls, not an accessible primitive layer (nested/custom dialogs, no shared Button/Card/Tabs system).

Dependencies (do not collapse):

- Workstream B (FT-DEFECT-03) establishes the dual-provider session/login model. Do not implement this UI from an unmerged B branch.
- Workstream A (FT-DEFECT-01) establishes TEXT / UNENCRYPTED FILE / ENCRYPTED FILE URL semantics. Do not present `/d/<name>` as direct file bytes. Do not assume every entry is plain Markdown.

## Assumptions (with verification)

- `GET /api/entries` already returns `publicUrl`, `pasteName`, `content`, lifecycle fields: verify `docs/API_CONTRACT.md` and entries-list tests.
- Listing currently always includes `content` and `managedTask`: verify Worker projection. File cards MUST NOT fabricate filename/MIME; SPEC defines when those fields may be added from upstream metadata (`/m/<name>` via PasteClient), not from guessing.
- GFM task rendering is a locked product requirement (`AGENTS.md` §12, `docs/FRONTEND.md`): keep a real GFM parser; fenced code stays literal. Do **not** replace Markdown with a shadcn component.
- Batch Mode already has a separate `BatchSelector`: verify `App.tsx`. Lifecycle actions already exist in Chinese (永久归档 / 限期归档 / 删除 / 恢复).
- Add-on frontend already uses React 19, Vite, TypeScript, Tailwind v4 (`@tailwindcss/vite`) and Worker `[assets]`. Verify `downstream/addons/feishu/frontend/vite.config.ts` and `style.css`. Configure shadcn **into this existing project**; do not scaffold a new Vite app.
- Root `package.json` is upstream-owned. shadcn/Lucide/Sonner/Radix dependencies belong in an Add-on-owned manifest, not a root/upstream patch.
- ego-lite does not inherit the owner's Chrome cookie jar: visual PASS may require owner acceptance if automation cannot see the authenticated real-data page.

## Non-goals

- No Pastebin (`pastebin-prod`) change in this workstream.
- No dual-provider auth/webhook/schema design (owned by DEFECT-03). This UI consumes B's login routes and session `brand`/`provider`.
- No account linking UI.
- No Feishu-client chrome, avatars, or enterprise dashboard.
- No fabrication of filename/MIME when upstream metadata does not provide it.
- No generic “Managed task” checkbox on entries whose content has no GFM task.
- No framework migration (Next.js, Remix, React Router framework mode).
- No Ant Design / Arco / Semi / MUI / other full design-system swap.
- No `shadcn add --all`, dashboard templates, or third-party registries for appearance.
- No charts, command palettes, data grids, form kits, or calendars.
- No `package.json` / `components.json` / generated shadcn code in this planning amendment.
- No FT-04, no P2P, no Paste deletion, no production deploy in this planning turn.

## Risks / unknowns

- File-card honesty depends on whether PasteClient can read metadata without storing a second body. SPEC chooses additive optional listing fields sourced from upstream `/m/` (or equivalent already-fetched headers). If metadata is unavailable, the card stays a text/message card with Open/Copy URL only — never a fake Download filename.
- Encrypted Pastebin files with `#key` are a Pastebin-web concern; Feishu-managed creates are not client-encrypted today. Do not invent encrypted-file cards unless listing metadata honestly says the Paste is encrypted.
- Visual PASS cannot be claimed from JSDOM. If screenshot automation cannot use the owner cookie jar, the issue stays open pending owner visual acceptance rather than being downgraded.
- shadcn CLI `init` can scaffold or overwrite an app if pointed at the repo root or invoked with a framework template. Implementation MUST use `--cwd` on the existing Add-on frontend and must not pass a new-app template/`--force` that replaces `App.tsx`.
- Root `package.json` must not gain these UI libraries (upstream-owned). Duplicate React copies are a risk if the Add-on package is not a workspace consumer of root React; SPEC requires proving a single React instance in the Vite/Worker asset build.

## Proposed implementation approach (later)

1. Start only after DEFECT-03 is merged (refreshed `downstream/main`) and DEFECT-01 URL semantics are stable enough to consume.
2. Configure shadcn **in the existing** Add-on Vite app (`components.json`, Tailwind v4 tokens, Vite + TypeScript `@/` alias to the Feishu frontend root). Do not replace the tree with a newly scaffolded Vite project. Do not run a CLI command that overwrites `App.tsx`.
3. Add only the primitives actually used (SPEC list). Product components own lifecycle/provider/file semantics; `components/ui/*` stays generic.
4. Reduce hand-written chrome CSS; Tailwind/shadcn own spacing, layout, type hierarchy, controls. Custom CSS remains for Markdown, syntax highlighting, task-list content, and exceptional content layout.
5. Logged-out (after DEFECT-03): product identity `Pastebin` / `Feishu / Lark Add-on` plus `Continue with Feishu` and `Continue with Lark`. Do not auto-select Feishu. One Web app.
6. Logged-in header: product name, provider badge (name/small icon, not a Feishu-blue or Lark-themed app), theme toggle mapped onto shadcn `.dark` tokens, logout.
7. Primary views remain Active / Archive (`进行中` / `归档`) using shadcn `Tabs`.
8. Text vs file cards per already-approved IA. Title = first non-empty line else `Untitled`. Download uses Workstream A `?a`. Never promise Download via `/d/<name>`.
9. Reconcile three checkbox concepts. GFM parser unchanged. Remove `ManagedTaskCheckbox` from ordinary entries. Batch uses shadcn `Checkbox` only in Batch Mode. Destructive delete uses `AlertDialog`.
10. Responsive + owner visual acceptance on authenticated real data. shadcn adoption is not UX PASS.

## Candidate files/components (candidates only)

Under `downstream/addons/feishu/frontend/` (names may differ if a cleaner existing layout wins; primitive vs product split is required):

- `components/ui/*` — generated shadcn primitives only
- `components/auth/ProviderLogin.tsx`, `ProviderBadge.tsx`
- `components/entries/EntryCard.tsx`, `TextEntryCard.tsx`, `FileEntryCard.tsx`, `EntryActions.tsx`
- `components/lifecycle/LifecycleMenu.tsx`, `ArchiveStatus.tsx`
- `components/batch/BatchToolbar.tsx`
- `components/AppHeader.tsx`, Markdown wrapper, Empty/Error states
- `lib/utils.ts` (`cn`)
- `ManagedTaskCheckbox.tsx` — remove from default cards
- Add-on-owned `package.json` for UI libraries (not root `package.json`)
- listing projection in the Add-on Worker if optional file metadata fields are added
- later docs: `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/API_CONTRACT.md`

## Validation strategy

- Contract tests: logged-out dual login hrefs; logged-in provider badge; title derivation; `publicUrl` rendered; file card only when metadata present; no `/d/` download lie; no Managed-task checkbox without GFM tasks; batch selector only in Batch Mode; countdown not treated as body text.
- Foundation tests (later implementation): Vite/TS/Vitest/Worker-asset alias resolution; Tailwind v4 CSS in assets; dark/light tokens; keyboard dialogs/dropdowns; Open is a real link; Copy URL; AlertDialog for destructive actions.
- Responsive tests where practical.
- **Visual acceptance** on authenticated `https://pb.test.223.im` real data: desktop, mobile, provider chooser, Active, Archive, text entry, file entry, long content, Markdown task, Batch Mode, dialogs, destructive confirmation, dark/light. Owner observation wins. If automation cannot access the cookie jar, require owner visual acceptance; do not close the UX defect from unit tests.

## References

- Umbrella: `docs/planning/ft-defect-remediation.md`
- SPEC: `docs/planning/ft-defect-02-spec.md`
- A semantics: `docs/planning/ft-defect-01-spec.md`
- B session/login: `docs/planning/ft-defect-03-spec.md`
- `docs/DESIGN.md`, `docs/FRONTEND.md`, `AGENTS.md` §11–§15

Status: PLAN READY FOR OWNER REVIEW
Implementation has NOT started.
