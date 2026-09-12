# FT-DEFECT-02 SPEC — Add-on Web product / information architecture

Status: SPEC READY FOR OWNER REVIEW

Parent: [ft-defect-02-plan.md](ft-defect-02-plan.md) — [#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135)

Implementation has NOT started. Function Test remains PAUSED. `FT-03_DATA_PATH: PASS` is not UX acceptance. No production mutation. No P2P. No Paste deletion.

Later deploy: `pastebin-feishu-prod`. Depends on FT-DEFECT-03 merge and FT-DEFECT-01 file semantics (stable contract, not the same PR).

## 3.1 Problem statement

The Add-on Web page can list real Feishu-managed entries, but it is not a usable product surface: opaque paste names as titles, no Open/Copy/Download, one Markdown card for everything, colliding checkbox metaphors, mixed chrome, and weak mobile/long-content layout. Owner visual observation is authoritative.

## 3.2 Goals

1. Logged-out chooser: product identity + Sign in with Feishu + Sign in with Lark.
2. Logged-in header: product name, Feishu or Lark badge, theme, logout.
3. Active / Archive as primary views.
4. Text/message vs file cards when file metadata is honest; never fabricate MIME/filename.
5. User-readable titles; paste name secondary.
6. Open / Copy URL / Download (when applicable) using Workstream A URL semantics.
7. Three checkbox concepts reconciled.
8. Lifecycle actions and authoritative archive countdown visible.
9. Desktop and mobile layout acceptance.
10. Visual PASS only from authenticated real data (owner/ego-lite), not unit tests alone.

## 3.3 Non-goals

- Implementing dual-provider auth internals (DEFECT-03).
- Implementing Pastebin download-path patch (DEFECT-01).
- Account linking UI.
- Feishu-client look, avatars, sidebars, analytics.
- Treating unit-test screenshots of fixtures as UX PASS.
- Fabricating file metadata.
- Starting FT-04.

## 3.4 Current behavior

- Unauthenticated: single `Sign in with {loginBrand}` → `/api/auth/login` (PLATFORM brand).
- Header: “Feishu Add-on” / “Feishu Pastebin”, theme toggle; no provider badge after login; no logout in the observed chrome beyond session expiry.
- Entry card: `class="fixture-entry"`, `<h2>{pasteName}</h2>`, `ManagedTaskCheckbox` on every Active entry, GFM body, lifecycle buttons. `publicUrl` is in the API type and tests but not rendered as Open/Copy/Download.
- Batch selector is separate but sits next to the extra managed checkbox.
- Tabs 进行中 / 归档 are Chinese; login/theme strings are English.
- Listing always projects `content` + `managedTask` as if every paste were Markdown text.

## 3.5 Desired behavior

### Logged out

Product identity (existing Add-on name, still a Pastebin Worker-like page — not Feishu desktop chrome).

Two links/buttons:

- `Sign in with Feishu` → `GET /api/auth/login/feishu`
- `Sign in with Lark` → `GET /api/auth/login/lark`

If DEFECT-03 enablement lists only one provider, only that button is shown. Do not show a button for a disabled provider.

### Logged-in header

- Product name
- Current provider badge: `Feishu` or `Lark` from session (DEFECT-03)
- Theme control
- Logout

### Views

- Active (`进行中`)
- Archive (`归档`)

Lifecycle action labels stay the locked Chinese product terms: 永久归档, 限期归档, 删除, 恢复为进行中, 批量 (`docs/DESIGN.md`). Login/provider strings stay English as specified in this Function Test instruction. That split is intentional and closes the “random mixed chrome” defect by assigning each surface a language rather than mixing inside one control.

### Entry kinds

1. **Text/message** — default when file metadata is absent or the paste is text.
2. **File** — only when the listing provides honest filename and/or MIME/size from upstream metadata.

Do not mark an entry as a file solely because the body is long or because `pasteName` looks random.

### Text/message card

- Title: first non-empty line of `content`, trimmed, internal newlines collapsed, max 80 characters; remainder truncated with ellipsis. If none: `Untitled`.
- `pasteName` as secondary metadata (not `h2`).
- Actions: Open (navigates to Pastebin Display `/d/<name>` on `PASTEBIN_ORIGIN`, or in-app expand if already showing GFM — Open MUST be a real navigation/copy target to the public Display URL), Copy URL (`publicUrl` raw origin URL is acceptable for text; Display URL may be used for Open). Do not use `/d/` as a download.
- Lifecycle actions as today.
- GFM body with real task-list rendering when the content contains GFM tasks. Fenced code stays literal.

### File card

Shown only when listing includes honest fields (3.7).

- Filename when authoritative; omit rather than invent.
- MIME and size when authoritative.
- Download: `https://<pastebin-origin>/<pasteName>?a` (Workstream A). Never `/d/<name>` for Download.
- Open/view: Display URL is allowed as a **viewer** action, labeled as view/info, not Download.
- Copy URL: `publicUrl` or the `?a` URL; Copy Download URL is the `?a` link. Do not copy `/d/` as if it were the file.
- Lifecycle actions as today.
- Do not force GFM rendering of binary/non-text bodies. Do not run a fake Markdown card on opaque bytes.

Encrypted Pastebin files with `#key` are not expected on Feishu-managed creates. If listing metadata honestly says encrypted, do not generate `?key=` and do not promise `?a` plaintext.

### Checkbox semantics (three concepts)

| Concept | Control | When it appears | Behavior |
| --- | --- | --- | --- |
| Markdown task checkbox | GFM-rendered checkbox inside the body | Only if parsed Markdown actually contains a task list item outside fences | Existing completion dialog (永久归档 / 限期归档 / 删除). Cancel leaves Markdown unchanged |
| Lifecycle / completion | Explicit card actions (and the dialog above) | Always for Active (archive/delete); Archive shows restore + countdown | Not a second checkbox on every card |
| Batch Mode selection | `BatchSelector` | Only when Batch Mode is on | Separate control; never the GFM checkbox |

**Remove** `ManagedTaskCheckbox` from the default card. Do not create an unrelated generic “Managed task” checkbox when content has no task.

Relationship: lifecycle completion may be **triggered from a GFM task** when the user checks a real Markdown task. That is the only checkbox→lifecycle bridge. Entries without tasks use the explicit 永久归档 / 限期归档 / 删除 actions.

### Lifecycle UX

- Active: 永久归档, 限期归档, 删除, plus Batch when enabled.
- Archive: permanent archive state **or** countdown from authoritative `expiresAt` (never `browser_now + MAX_EXPIRATION`). Countdown is archive/lifecycle chrome, not message content.
- Restore returns to Active per existing lifecycle SPEC.
- Batch selection only in Batch Mode; partial failure reporting unchanged.

### Responsive

Desktop: bounded readable content width (upstream-like, ~64rem max), clear card hierarchy, actions visible or wrapping, long body scrolls inside the card/page without destroying header/tabs.

Mobile: no horizontal overflow, actions wrap, dialogs inside viewport, batch controls usable, both login choices usable.

### Fixture leftovers

Remove `fixture-entry` as the production class name. Production cards are not fixture-oriented.

## 3.6 User/API flows

### Boot

1. `GET /api/auth/session` (existing). Unauthenticated → logged-out chooser.
2. Authenticated → header badge from session provider; `GET /api/entries` for that principal’s scopes only (DEFECT-03 isolation).

### Open / Copy / Download

- Open text: `https://<pastebin-origin>/d/<pasteName>` (viewer).
- Copy text: copy `publicUrl` (already returned).
- Download file: `GET https://<pastebin-origin>/<pasteName>?a` in a new navigation/download, not via Add-on password.
- Browser never receives management passwords (unchanged).

### Completion

Unchanged API (`POST /api/entries/:id/complete`). UX trigger: GFM task **or** explicit lifecycle buttons — not a synthetic managed checkbox.

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
- Open/Download leave the Add-on origin to Pastebin public URLs only.
- Provider badge is secret-free.
- CSRF/origin on mutations unchanged.
- Do not load `/<name>?a` through a credentialed Add-on proxy that would bypass Pastebin auth; these pastes are already public-by-URL.

## 3.9 Compatibility

- Existing clients that ignore new optional fields keep working.
- DEFECT-03 session `brand`/`provider` required for the badge; if B is not yet deployed, this PR must not merge.
- Workstream A `?a` semantics: if A is not yet on `pastebin-prod`, Download still targets `?a` (already works). Display-as-download lies must still be avoided in this UI even before A’s UploadedPanel fix.

## 3.10 Failure behavior

- Session expired: logged-out chooser, both provider buttons.
- Listing error: existing alert; no fake cards.
- Missing `publicUrl`: hide Copy/Open rather than link to `#`.
- File metadata missing: text/message card or non-file fallback; no invented PNG title.
- Visual tooling cannot see owner cookies: leave UX defect open pending owner acceptance.

## 3.11 Acceptance criteria

1. Logged-out page shows both provider logins when both are enabled, using `/api/auth/login/feishu` and `/api/auth/login/lark`.
2. Logged-in header shows product name, Feishu or Lark badge matching the session, theme, logout.
3. Active and Archive remain the primary views.
4. Text card title is first non-empty line or `Untitled`; pasteName is not the heading.
5. `publicUrl` is usable via Open and Copy URL.
6. File card appears only with honest metadata; Download uses `?a`, not `/d/` as the download promise.
7. No Managed-task checkbox on entries without GFM tasks.
8. GFM tasks still render with a real parser; fenced tasks stay literal; checking a real task still opens the existing completion dialog.
9. Batch selectors only in Batch Mode and are distinct from GFM checkboxes.
10. Archive shows permanent vs `expiresAt` countdown in lifecycle chrome.
11. Desktop: bounded width; long body does not break layout.
12. Mobile: no horizontal overflow; actions wrap; dialogs in viewport; batch + both logins usable.
13. Visual acceptance uses the owner’s authenticated real-data page (desktop + mobile + Active + Archive + long content + Markdown task + batch + provider chooser). Unit tests cannot close this issue alone.

## 3.12 Test specification

Contract/unit (necessary, not sufficient):

- Dual login hrefs and enablement hiding
- Provider badge from session
- Title derivation (first line, blank → Untitled, 80-char cap)
- `publicUrl` rendered; missing URL hides actions
- File card only when `kind=file` with filename/mime; Download href ends with `?a`; no Download pointing at `/d/`
- File kind omits binary `content`
- ManagedTaskCheckbox absent without GFM tasks
- GFM task present → interactive task; completion dialog on check; cancel does not mutate
- Batch selector absent unless Batch Mode
- Countdown uses `expiresAt`
- Logout control present

Visual (required for PASS):

- Authenticated desktop and mobile/responsive
- Active, Archive, long content, Markdown task content, Batch Mode, provider chooser
- Owner observation authoritative
- If ego-lite/automation lacks the owner cookie jar, record `OWNER_VISUAL_ACCEPTANCE_REQUIRED` instead of claiming PASS

## 3.13 Open questions

None requiring owner product input. Engineering defaults: title rule, 80-character cap, listing metadata from `/m/`, remove default Managed-task checkbox, language split (English auth/provider, Chinese lifecycle/views).

Owner visual acceptance after implementation is a **validation** step, not an open design fork.

Status: SPEC READY FOR OWNER REVIEW
Implementation has NOT started.
