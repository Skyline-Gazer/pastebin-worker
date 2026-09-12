# FT-DEFECT-02 SPEC — Add-on Web product / information architecture

Status: SPEC READY FOR OWNER REVIEW

Parent: [ft-defect-02-plan.md](ft-defect-02-plan.md) — [#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135)

Implementation has NOT started. Function Test remains PAUSED. `FT-03_DATA_PATH: PASS` is not UX acceptance. No production mutation. No P2P. No Paste deletion.

Later deploy: `pastebin-feishu-prod`. Depends on FT-DEFECT-03 merge and FT-DEFECT-01 file semantics (stable contract, not the same PR).

## 3.1 Problem statement

The Add-on Web page can list real Feishu-managed entries, but it is not a usable product surface: opaque paste names as titles, no Open/Copy/Download, one Markdown card for everything, colliding checkbox metaphors, mixed chrome, and weak mobile/long-content layout. Owner visual observation is authoritative.

## 3.2 Goals

1. Logged-out chooser: product identity + Continue with Feishu + Continue with Lark (one app; no auto-select).
2. Logged-in header: product name, Feishu or Lark badge, theme, logout.
3. Active / Archive as primary views.
4. Text/message vs file cards when file metadata is honest; never fabricate MIME/filename.
5. User-readable titles; paste name secondary.
6. Open / Copy URL / Download (when applicable) using Workstream A URL semantics.
7. Three checkbox concepts reconciled.
8. Lifecycle actions and authoritative archive countdown visible.
9. Desktop and mobile layout acceptance.
10. shadcn/ui + Lucide + Sonner as primitive layer only; product components own Add-on semantics.
11. Visual PASS only from authenticated real data (owner/ego-lite), not unit tests or “we installed shadcn” alone.

## 3.3 Non-goals

- Implementing dual-provider auth internals (DEFECT-03).
- Implementing Pastebin download-path patch (DEFECT-01).
- Account linking UI.
- Feishu-client or Lark-client look, avatars, sidebars, analytics, enterprise admin dashboards.
- Migrating the Add-on to Next.js, Remix, React Router framework mode, or another SPA framework.
- Replacing the stack with Ant Design, Arco Design, Semi Design, or Material UI.
- `shadcn add --all`, third-party shadcn registries, or dashboard templates.
- Charts, command palettes, data grids, form kits, calendars, or other unused shadcn kits.
- Replacing the GFM parser with a shadcn Markdown component.
- Treating unit-test screenshots of fixtures, or successful `shadcn init`, as UX PASS.
- Fabricating file metadata.
- Changing root/upstream `package.json` to carry Add-on-only UI libraries.
- Starting FT-04.
- Any `package.json`, `components.json`, or generated shadcn code in this planning amendment.

## 3.4 Current behavior

- Unauthenticated: single `Sign in with {loginBrand}` → `/api/auth/login` (PLATFORM brand).
- Header: “Feishu Add-on” / “Feishu Pastebin”, theme toggle via `data-theme` on `<html>`; no provider badge after login; no logout in the observed chrome beyond session expiry.
- Entry card: `class="fixture-entry"`, `<h2>{pasteName}</h2>`, `ManagedTaskCheckbox` on every Active entry, GFM body, lifecycle buttons. `publicUrl` is in the API type and tests but not rendered as Open/Copy/Download.
- Batch selector is separate but sits next to the extra managed checkbox.
- Tabs 进行中 / 归档 are Chinese; login/theme strings are English.
- Listing always projects `content` + `managedTask` as if every paste were Markdown text.
- Styling is hand-written classes in `style.css` (`page-shell`, `content-panel`, `fixture-entry`, …) on top of Tailwind v4 `@import "tailwindcss"`. No shadcn, Lucide, Sonner, or Radix primitives. Dialogs are custom. Frontend files currently live mostly at `frontend/*.tsx` rather than `components/`.
- Toolchain already present: React 19, TypeScript, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), Cloudflare Worker Assets. Root `package.json` is upstream-owned and must not be the home for Add-on-only UI libraries.

## 3.5 Desired behavior

### UI foundation (locked)

Target stack (existing app, not a new scaffold):

```text
React 19
  + TypeScript
  + Vite
  + Tailwind CSS 4
  + shadcn/ui
  + Lucide
  + Sonner
  ↓
Cloudflare Worker Assets
```

shadcn/ui is the **primitive / design-system layer**. It MUST NOT become the product architecture.

| Layer              | Owns                                                          | Must not own                                       |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------- |
| `components/ui/*`  | Generated shadcn primitives (Button, Card, Dialog, …)         | Provider, lifecycle, file vs text, Paste URLs      |
| Product components | Add-on IA, session/provider, entry kinds, GFM, batch, archive | Re-implementing dialog/focus/keyboard from scratch |

Only add primitives that are actually used. Do not `shadcn add --all`. Do not import dashboard templates or third-party registries for appearance.

Use the current supported shadcn **Vite + Tailwind v4** setup (`ui.shadcn.com` Vite install). `init` / `add` MUST run against the existing Add-on frontend (`--cwd downstream/addons/feishu/frontend`). Do not pass a new-app template. Do not `--force` overwrite `App.tsx` or `src/main.tsx`.

### File layout

Equivalent structure (filenames may differ if a cleaner existing layout wins):

```text
downstream/addons/feishu/frontend/
├── components/
│   ├── ui/                 # shadcn primitives only
│   ├── entries/
│   ├── lifecycle/
│   ├── batch/
│   ├── auth/
│   └── AppHeader.tsx
├── lib/utils.ts
├── App.tsx
└── ...
```

Required split: `components/ui` = generic primitive; everything else listed below = Add-on semantics.

### shadcn configuration (later implementation)

- `components.json` lives under the Add-on frontend, not the repository root.
- Style: **new-york** / current shadcn default. `rsc: false`. CSS variables: true. `baseColor`: **neutral**.
- Tailwind v4: keep `@tailwindcss/vite`; import shadcn Tailwind v4 tokens into the existing CSS entry (`style.css` or successor). OKLCH theme variables. `@custom-variant dark` / `.dark` as current shadcn docs require.
- Alias `@/` → Add-on frontend source root (`downstream/addons/feishu/frontend`). Configure Vite `resolve.alias`, TypeScript `paths`, and Vitest the same way. The implementation PR MUST prove Vite, TypeScript, Vitest, and Worker asset builds resolve `@/` correctly. Single React instance (no nested copy that breaks hooks).
- Existing theme toggle is preserved: light/dark remains a user control. Map it onto shadcn’s `.dark` class on `document.documentElement`. `data-theme` may be removed once competing CSS is gone. Do not add `next-themes` unless the existing toggle cannot drive `.dark` (default: do not add it).
- Do not replace the whole repository with a newly scaffolded Vite project.

### Theme / visual target

- Neutral restrained palette. Proper light/dark. Clean application UI.
- **Not** an enterprise admin dashboard, Feishu clone, or Lark clone.
- Product remains provider-neutral. Brand is expressed as provider **name** and a **small badge/icon**, not by repainting the app Feishu-blue or Lark-themed.
- Content-first, bounded width, compact controls — still a Pastebin-like page, now with shadcn chrome instead of ad-hoc CSS. Later implementation updates `docs/FRONTEND.md` accordingly (stop implying HeroUI/upstream component imports for Add-on chrome).

### Styling ownership

After migration, Tailwind/shadcn owns spacing, layout, typography hierarchy, borders, backgrounds, radii, hover/focus, responsive composition, and standard controls.

Custom CSS remains only for:

- rendered Markdown
- syntax highlighting
- task-list content
- exceptional content-layout rules not cleanly expressed with utilities

Do not maintain two competing design systems. Remove obsolete classes such as `fixture-entry` when their replacement lands. Delete unused `page-shell` / `content-panel` / `theme-control` rules rather than layering shadcn underneath them.

### Accessibility

Use shadcn/Radix (or the then-current official shadcn primitive base) for dialogs, dropdowns, tabs, and checkboxes. Do not recreate focus traps manually.

Required:

- keyboard navigation
- visible focus states
- semantic buttons and links (Open/Download are real `<a>` or Button-as-link; no nested interactive controls)
- accessible dialog titles and descriptions
- destructive confirmations through `AlertDialog`
- tooltips never the only means of conveying critical information

### Product need → primitive mapping

| Product need                       | Foundation     |
| ---------------------------------- | -------------- |
| Active / Archive                   | `Tabs`         |
| Entry container                    | `Card`         |
| Provider / retention state         | `Badge`        |
| Primary actions                    | `Button`       |
| Secondary / lifecycle actions      | `DropdownMenu` |
| Archive / timed settings           | `Dialog`       |
| Delete confirmation                | `AlertDialog`  |
| Batch selection                    | `Checkbox`     |
| Hover explanation                  | `Tooltip`      |
| Loading                            | `Skeleton`     |
| Notifications                      | `Sonner`       |
| Section separation                 | `Separator`    |
| Long body (only if utilities fail) | `ScrollArea`   |

Do not use a Checkbox for lifecycle completion unless it is a real Markdown task.

Icons: Lucide only, used by product components (provider, download, copy, theme). Do not add a second icon pack.

### Primitives to add (allowlist)

`Button`, `Card`, `Badge`, `Tabs`, `Checkbox`, `DropdownMenu`, `Dialog`, `AlertDialog`, `Tooltip`, `Separator`, `Skeleton`, Sonner (`Toaster`). `ScrollArea` only if long-content layout cannot be done with utilities.

Do not add Chart, Command, Data Table, Calendar, Sidebar, Form, Input OTP, or other unused kits. Generated shadcn CSS may include unused chart tokens; do not add Chart components to consume them.

### Product components (own semantics)

`AppHeader`, `ProviderLogin`, `ProviderBadge`, `EntryCard`, `TextEntryCard`, `FileEntryCard`, `EntryActions`, `LifecycleMenu`, `ArchiveStatus`, `BatchToolbar`, `MarkdownContent`, `EmptyState`, `ErrorState`.

Exact filenames may differ. These MUST NOT live under `components/ui/`.

### Markdown

Do **not** replace the existing GFM parser (`RenderedMarkdown` / equivalent) with a shadcn component. Markdown is content, not chrome.

Keep: real GFM parsing, task-list semantics, fenced-code literal handling, sanitization.

Wrap output in `MarkdownContent` and style it consistently (custom CSS allowed here).

### Logged out

One Web application. After FT-DEFECT-03 exists:

```text
Pastebin
Feishu / Lark Add-on

[ Continue with Feishu ]
[ Continue with Lark ]
```

Use shadcn `Card` / `Button` if useful. Hrefs: `/api/auth/login/feishu` and `/api/auth/login/lark`.

Do not create two apps. Do not auto-select Feishu because it was historically first. If DEFECT-03 enablement lists only one provider, only that button is shown. Do not show a button for a disabled provider.

### Logged-in header

`AppHeader`:

- Product name (`Pastebin` / Add-on, provider-neutral chrome)
- Current provider `Badge`: `Feishu` or `Lark` from session (DEFECT-03), optional small Lucide/brand-neutral icon — not a full-app color theme
- Theme control (existing behavior, driving `.dark`)
- Logout `Button`

### Views

- Active (`进行中`)
- Archive (`归档`)

Implemented with shadcn `Tabs`. Lifecycle action labels stay the locked Chinese product terms: 永久归档, 限期归档, 删除, 恢复为进行中, 批量 (`docs/DESIGN.md`). Login/provider strings stay English (`Continue with …`, `Feishu`, `Lark`). That split is intentional.

### Entry kinds

1. **Text/message** — default when file metadata is absent or the paste is text.
2. **File** — only when the listing provides honest filename and/or MIME/size from upstream metadata.

Do not mark an entry as a file solely because the body is long or because `pasteName` looks random.

### Text/message card

`TextEntryCard` / `EntryCard` using shadcn `Card`:

- Title: first non-empty line of `content`, trimmed, internal newlines collapsed, max 80 characters; remainder truncated with ellipsis. If none: `Untitled`.
- `pasteName` as secondary metadata (not `h2`).
- Body via `MarkdownContent` (existing GFM parser).
- `EntryActions`: Open (real link to Pastebin Display `/d/<name>` on `PASTEBIN_ORIGIN`), Copy URL (`publicUrl`). Open MUST be a real navigation target, not a no-op Button.
- `LifecycleMenu` (`DropdownMenu`) for 永久归档 / 限期归档 / 删除. Timed archive settings use `Dialog`. Delete uses `AlertDialog`.
- Do not use `/d/` as a download.

### File card

`FileEntryCard` shown only when listing includes honest fields (3.7).

- Filename when authoritative; omit rather than invent.
- MIME and size when authoritative (`Badge` / secondary text).
- Download: real link `https://<pastebin-origin>/<pasteName>?a` (Workstream A). Never `/d/<name>` for Download. Never promise Download while linking `/d/<name>`.
- Open/view: Display URL is allowed as a **viewer** action, labeled as view/info, not Download.
- Copy URL: `publicUrl` or the `?a` URL; Copy Download URL is the `?a` link. Do not copy `/d/` as if it were the file.
- Same `LifecycleMenu` as text cards.
- Do not force GFM rendering of binary/non-text bodies. Do not run a fake Markdown card on opaque bytes.

Encrypted Pastebin files with `#key` are not expected on Feishu-managed creates. If listing metadata honestly says encrypted, do not generate `?key=` and do not promise `?a` plaintext.

### Checkbox semantics (three concepts)

| Concept                | Control                                                 | When it appears                                                           | Behavior                                                                                  |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Markdown task checkbox | GFM-rendered checkbox inside `MarkdownContent`          | Only if parsed Markdown actually contains a task list item outside fences | Existing completion dialog (永久归档 / 限期归档 / 删除). Cancel leaves Markdown unchanged |
| Lifecycle / completion | `LifecycleMenu` / dialogs — **not** a Checkbox          | Always for Active (archive/delete); Archive shows restore + countdown     | Not a second checkbox on every card                                                       |
| Batch Mode selection   | shadcn `Checkbox` in `BatchToolbar` / per-card selector | Only when Batch Mode is on                                                | Separate control; never the GFM checkbox                                                  |

**Remove** `ManagedTaskCheckbox` from the default card. Do not create an unrelated generic “Managed task” checkbox when content has no task. Do not use a shadcn `Checkbox` for lifecycle completion.

Relationship: lifecycle completion may be **triggered from a GFM task** when the user checks a real Markdown task. That is the only checkbox→lifecycle bridge. Entries without tasks use `LifecycleMenu`.

### Lifecycle UX

- Active: 永久归档, 限期归档, 删除 via `LifecycleMenu` / `Dialog` / `AlertDialog`, plus Batch when enabled (`BatchToolbar`).
- Archive: permanent archive state **or** countdown from authoritative `expiresAt` (never `browser_now + MAX_EXPIRATION`). Countdown is archive/lifecycle chrome (`ArchiveStatus` + `Badge`), not message content.
- Restore returns to Active per existing lifecycle SPEC.
- Batch selection only in Batch Mode; partial failure reporting via Sonner and/or inline status; failed items remain retryable.

### Responsive and visual acceptance

shadcn adoption does **not** itself satisfy the UX defect.

Desktop: bounded readable content width (~64rem max), clear card hierarchy, actions visible or wrapping, long body scrolls inside the card/page without destroying header/tabs.

Mobile: no horizontal overflow, actions wrap, dialogs remain inside viewport, batch controls usable, both provider login choices usable.

Owner visual acceptance (authenticated real-data page) MUST cover desktop **and** mobile/responsive for:

- provider chooser
- Active
- Archive
- text entry
- file entry
- long content
- Markdown task
- batch mode
- dialogs
- destructive confirmation
- dark/light mode

If automation cannot use the owner cookie jar, record `OWNER_VISUAL_ACCEPTANCE_REQUIRED`; do not mark PASS.

### Fixture leftovers

Remove `fixture-entry` as the production class name when the Card replacement lands. Production cards are not fixture-oriented.

### Dependency policy (later implementation)

Use official shadcn-supported dependencies only where needed. Typical later adds (Add-on-owned manifest, **not** root `package.json`):

- `lucide-react`
- `sonner`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- official shadcn primitive peer (`radix-ui` / `@radix-ui/*` or the then-current CLI default base — pick one, do not mix)
- `tw-animate-css` only if required by the current Vite/Tailwind v4 shadcn CSS entry

Do not add arbitrary registry/community component packages. Keep bundle/runtime complexity appropriate for a small Cloudflare-hosted Add-on.

Chosen default for install location: `downstream/addons/feishu/package.json` (downstream-owned). If a workspace file is required so Vite/Worker builds share root React, add a **new** root `pnpm-workspace.yaml` listing the Add-on package; do not add Lucide/Sonner/Radix to upstream-owned `package.json`. Prove one React copy in the asset graph.

## 3.6 User/API flows

### Boot

1. `GET /api/auth/session` (existing). Unauthenticated → logged-out chooser (`ProviderLogin`: Continue with Feishu / Continue with Lark).
2. Authenticated → `AppHeader` badge from session provider; `GET /api/entries` for that principal’s scopes only (DEFECT-03 isolation).

### Open / Copy / Download

- Open text: `https://<pastebin-origin>/d/<pasteName>` (viewer).
- Copy text: copy `publicUrl` (already returned).
- Download file: `GET https://<pastebin-origin>/<pasteName>?a` in a new navigation/download, not via Add-on password.
- Browser never receives management passwords (unchanged).

### Completion

Unchanged API (`POST /api/entries/:id/complete`). UX trigger: GFM task **or** `LifecycleMenu` — not a synthetic managed checkbox. Delete requires `AlertDialog`. Timed archive confirmation uses `Dialog`. Notifications (copy success, batch partial failure) use Sonner; toasts are not the only record of a failed mutation (inline status remains).

## 3.7 Data/state model

No D1 migration in this workstream.

### Listing API extension (additive, chosen default)

`GET /api/entries` public objects gain optional:

```ts
{
  filename?: string        // upstream stored filename; omit if unknown
  mimeType?: string        // upstream stored mimeType; omit if unknown
  sizeBytes?: number       // upstream size; omit if unknown
  kind: "text" | "file"    // "file" only when mimeType is non-text OR filename present and body is not treated as UTF-8 text
}
```

Authoritative source: PasteClient metadata (`/m/<name>` or equivalent headers already available to the Worker), **not** a second stored body, **not** the browser, **not** guessed from pasteName.

If metadata fetch fails, `kind` stays `"text"` if `content` is usable UTF-8; otherwise render a non-Markdown fallback (“Unable to display file metadata”) without fake filename. Do not fail the whole list for one entry if that is already isolated.

`content` for `kind: "file"` MUST NOT dump binary as a Unicode string into JSON. Omit `content` or return null for file kind. Text kind keeps `content` as today.

`managedTask` may remain for text entries that actually have GFM tasks; it MUST NOT force a card-level checkbox.

`publicUrl` remains the origin raw URL (`https://pb.223.im/<name>`). Frontend derives Display `/d/` and Download `?a` from it; do not put `#key` in API fields.

## 3.8 Security and trust boundaries

- No passwords, manage URLs, tokens, tenant, open_id, or principal keys in HTML or listing JSON (unchanged).
- Open/Download leave the Add-on origin to Pastebin public URLs only; they are real links, not nested `<button><a>`.
- Provider badge is secret-free.
- CSRF/origin on mutations unchanged.
- Do not load `/<name>?a` through a credentialed Add-on proxy that would bypass Pastebin auth; these pastes are already public-by-URL.

## 3.9 Compatibility

- Existing clients that ignore new optional fields keep working.
- DEFECT-03 session `brand`/`provider` required for the badge; if B is not yet deployed, this PR must not merge.
- Workstream A `?a` semantics: if A is not yet on `pastebin-prod`, Download still targets `?a` (already works). Display-as-download lies must still be avoided in this UI even before A’s UploadedPanel fix.
- shadcn/Lucide/Sonner are Add-on-only. Root/upstream `package.json` stays unmodified. Worker Assets continue to serve the Vite-built frontend.

## 3.10 Failure behavior

- Session expired: logged-out chooser, both provider buttons (when both enabled).
- Listing error: `ErrorState` plus Sonner if useful; no fake cards.
- Missing `publicUrl`: hide Copy/Open rather than link to `#`.
- File metadata missing: text/message card or non-file fallback; no invented PNG title.
- Visual tooling cannot see owner cookies: leave UX defect open pending owner acceptance.

## 3.11 Acceptance criteria

1. Logged-out page shows `Pastebin` / `Feishu / Lark Add-on` and both provider buttons when both are enabled: `Continue with Feishu` → `/api/auth/login/feishu`, `Continue with Lark` → `/api/auth/login/lark`. No auto-select of Feishu.
2. Logged-in header shows product name, Feishu or Lark badge matching the session, theme, logout. Chrome is provider-neutral (not Feishu-blue / Lark-themed).
3. Active and Archive remain the primary views (`Tabs`).
4. Text card title is first non-empty line or `Untitled`; pasteName is not the heading.
5. `publicUrl` is usable via Open and Copy URL. Open is a real link/action.
6. File card appears only with honest metadata; Download uses `?a`, not `/d/` as the download promise.
7. No Managed-task checkbox on entries without GFM tasks. shadcn `Checkbox` is not used for lifecycle completion.
8. GFM tasks still render with a real parser; fenced tasks stay literal; checking a real task still opens the existing completion dialog.
9. Batch selectors only in Batch Mode and are distinct from GFM checkboxes.
10. Archive shows permanent vs `expiresAt` countdown in lifecycle chrome.
11. Destructive delete requires `AlertDialog`. No nested interactive controls.
12. Desktop: bounded width; long body does not break layout.
13. Mobile: no horizontal overflow; actions wrap; dialogs in viewport; batch + both logins usable.
14. Vite, TypeScript, Vitest, and Worker asset builds resolve the `@/` alias. Tailwind v4 + shadcn tokens emit in assets. Dark/light tokens work.
15. Visual acceptance uses the owner’s authenticated real-data page for the full list in 3.5 (desktop + mobile + chooser + Active + Archive + text + file + long content + Markdown task + batch + dialogs + destructive confirm + dark/light). Unit tests and shadcn init cannot close this issue alone.

## 3.12 Test specification

Contract/unit (necessary, not sufficient):

- Dual login hrefs (`Continue with …`) and enablement hiding
- Provider badge from session
- Title derivation (first line, blank → Untitled, 80-char cap)
- `publicUrl` rendered; missing URL hides actions
- File card only when `kind=file` with filename/mime; Download href ends with `?a`; no Download pointing at `/d/`
- File kind omits binary `content`
- ManagedTaskCheckbox absent without GFM tasks
- GFM task present → interactive task; completion dialog on check; cancel does not mutate
- Batch `Checkbox` absent unless Batch Mode; distinct from Markdown task checkbox
- Countdown uses `expiresAt`
- Logout control present
- Delete path uses `AlertDialog`
- No nested button/link
- `@/` imports resolve in Vitest and `tsc`
- Vite build / Worker assets include Tailwind v4 + shadcn CSS variables
- Theme toggle sets `.dark` (or equivalent documented token) and is keyboard-reachable

Visual (required for PASS):

- Authenticated desktop and mobile/responsive
- Provider chooser, Active, Archive, text entry, file entry, long content, Markdown task, batch mode, dialogs, destructive confirmation, dark/light
- Owner observation authoritative
- If ego-lite/automation lacks the owner cookie jar, record `OWNER_VISUAL_ACCEPTANCE_REQUIRED` instead of claiming PASS

## 3.13 Open questions

None requiring owner product input. The owner locked shadcn/ui + Lucide + Sonner on 2026-09-12. Remaining engineering defaults: Add-on-owned `package.json` (not root), `@/` → frontend root, new-york + neutral + OKLCH, `.dark` from the existing toggle without `next-themes`, `Continue with Feishu/Lark` copy, title rule, listing metadata from `/m/`, remove default Managed-task checkbox.

Owner visual acceptance after implementation is a **validation** step, not an open design fork.

Status: SPEC READY FOR OWNER REVIEW
Implementation has NOT started.
