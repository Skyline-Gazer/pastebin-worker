# Frontend Implementation

## 1. Stack

Use:

- React 19
- Vite
- TypeScript
- Tailwind CSS 4
- shadcn/ui (new-york, neutral, Radix primitives)
- Lucide
- Sonner
- Cloudflare Worker Assets

Add-on-only UI libraries live in `downstream/addons/feishu/package.json`, not the upstream-owned root `package.json`. Alias `@/` points at `downstream/addons/feishu/frontend`.

Align with upstream dependency/tooling choices where practical. Do not migrate to Next.js, Remix, Ant, Arco, Semi, or MUI.

## 2. Visual rule: upstream Pastebin Worker first

The Add-on web page is independent in code but should look like a natural Pastebin Worker page.

Prefer reuse/alignment with upstream:

- shadcn `Button` / `Tooltip` and Lucide icons for chrome;
- dark-mode via the `.dark` class on `document.documentElement`;
- OKLCH / CSS-variable color tokens;
- compact rounded surfaces;
- content width/spacing similar to upstream display pages (bounded ~64rem).

If direct imports create fragile coupling, implement a thin Add-on-local equivalent that matches appearance/behavior rather than modifying upstream structure.

Forbidden by default:

- avatars;
- user/account profile UI;
- Feishu-client top chrome;
- large left navigation dashboards;
- decorative illustrations;
- enterprise analytics cards;
- unrelated metadata clutter.

## 3. Suggested component model

```text
App
|- AppHeader              # Pastebin + session ProviderBadge, icon theme, 退出
|- ProviderLogin          # Continue with Feishu / Continue with Lark
|- Tabs + BatchToolbar    # 进行中/归档 counts and 批量管理 on one row
|- EntryList              # one shared bordered surface, compact rows
|  |- TextEntryCard       # first-line title, omit duplicate single-line body
|  |  |- MarkdownContent  # existing GFM parser, not a shadcn Markdown kit
|  `- FileEntryCard       # honest filename/MIME/size only; Download uses ?a
|- LifecycleMenu          # 永久归档 / 限期归档 / 删除 — overflow 更多
|- ArchiveStatus          # authoritative expiresAt countdown
|- EmptyState / ErrorState
```

Names are suggestions, semantics are required.

Logged-out chrome shows `Continue with Feishu` → `/api/auth/login/feishu` and `Continue with Lark` → `/api/auth/login/lark` when the session advertises both providers. Hidden providers stay hidden. Provider badge after login comes from session `brand`, never hostname or localStorage.

Text titles are the first non-empty content line (80 characters, otherwise `Untitled`). `pasteName` is secondary metadata. A single-line Paste is not rendered again as Markdown body; first-line GFM tasks keep the full source so checkboxes stay interactive. Open uses Display `/d/<name>` (`打开`); Copy uses `publicUrl` (`复制链接`); file Download uses `/<name>?a` (`下载`) and is omitted unless listing metadata honestly identifies a file.

Authenticated chrome uses Chinese operational labels (`打开`, `复制链接`, `更多`, `批量管理`, `完成`, `全选`, `清除`, `退出`, lifecycle verbs). Provider brands stay `Feishu` / `Lark`. Logged-out chooser keeps `Continue with Feishu` / `Continue with Lark`. The theme control is icon-only with an accessible name. There is no generic ManagedTaskCheckbox and no `BatchModeToggle` / `Batch select` copy. Markdown task checkboxes stay content semantics. Batch checkboxes appear only in Batch Mode as the leading control. Entries render as compact list rows inside one shared surface, not independent dashboard cards. Content width is bounded to `max-w-[64rem]`.

Production boot loads entries from the Add-on session and `GET /api/entries`. Typed fixtures are test-only via explicit `initialEntries`; the production page must not render them by default.

## 4. Rendered Markdown

Use a GFM-capable parser. Avoid raw `/d/<name>`-style syntax display as the default.

Task examples:

```markdown
- [ ] unchecked
- [x] checked
```

must produce semantic checkbox UI.

Code fences containing the same characters remain literal code.

Sanitize generated HTML.

## 5. Normal-mode task interaction

Clicking an unchecked **GFM task checkbox** (or choosing a lifecycle menu action) does not immediately persist `[x]`.

Flow:

```text
check real GFM task or open LifecycleMenu
-> open completion Dialog / AlertDialog
-> choose archive_permanent / archive_expiring / delete
-> confirm
-> backend mutation
-> authoritative UI update
```

Cancel means no mutation.

Delete uses `AlertDialog`. There is no generic "Complete managed entry" checkbox on entries without a GFM task.

## 6. Batch Mode state

Suggested React state:

```ts
batchMode: boolean
selectedIds: Set<string>
pendingAction: "archive_permanent" | "archive_expiring" | "delete" | null
batchResult: BatchResult | null
```

Do not encode Batch Mode by mutating Markdown checkbox state.

### 6.1 Selector behavior

- BatchSelector appears only in Batch Mode.
- Selection state is transient UI state.
- A selected entry does not imply completed/checked Markdown.
- Markdown completion interaction should be disabled/suppressed during Batch Mode.
- `全选/清空` may operate only on the currently loaded/visible entry set unless API pagination semantics explicitly support more.

## 7. Batch action bar

Keep it compact and consistent with upstream styling:

```text
已选择 3 项   [永久归档] [限期归档] [删除]
```

Avoid a complex admin toolbar.

## 8. Batch results

Backend returns aggregate and per-item status.

Frontend behavior:

- remove successful archived/deleted entries from Active as appropriate;
- keep failed entries visible and preferably selected;
- show concise summary, e.g. `已处理 18 项，2 项失败`;
- allow retry without forcing user to reconstruct selection manually.

## 9. Archive countdown

Frontend receives authoritative ISO timestamp:

```ts
expiresAt: string
```

Rendering may calculate:

```ts
remaining = new Date(expiresAt).getTime() - Date.now()
```

Do not derive `expiresAt` from hard-coded `MAX_EXPIRATION` in browser code.

Countdown formatting should remain compact, e.g.:

```text
剩余 89d 12h
剩余 3d 4h
```

or localized Chinese equivalents.

Do not update more frequently than the displayed precision requires. For day/hour display, minute-level or coarse updates are enough.

## 10. Archive restore

Restore is a backend operation. Do not optimistically show an Active/permanent state until expiration cancellation succeeds.

On success:

- move entry back to Active;
- clear countdown;
- restore managed checkbox state to unchecked as defined by the entry model.

## 11. Loading/error behavior

- disable duplicate submissions while a single action is in flight;
- batch action button is disabled while batch request is in flight;
- surface retryable per-item failures;
- never print secret-bearing upstream URLs/errors;
- on stale upstream 404, reconcile/remove stale Archive state rather than rendering a broken permanent item.

## 12. Accessibility

- task checkboxes and BatchSelectors need distinct labels;
- use `aria-checked`/semantic checkbox controls appropriately;
- dialogs require focus management;
- countdown/status cannot rely only on color;
- destructive Delete must be clearly named.
