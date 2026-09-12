# FT-DEFECT-01 SPEC — Pastebin upload → usable file/read/download path

Status: SPEC READY FOR OWNER REVIEW

Parent: [ft-defect-01-plan.md](ft-defect-01-plan.md) — [#133](https://github.com/Skyline-Gazer/pastebin-worker/issues/133)

Implementation has NOT started. Function Test remains PAUSED. No production mutation. No object deletion.

Pinned upstream base (later patch): `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`

Proposed patch ID: `140-upload-download-path`

Dependencies: existing series through `130-max-reads-consume`. No Feishu concepts in this patch.

## 3.1 Problem statement

A user who uploads a file to Pastebin gets persistence and working raw/`?a` bytes, but the returned UI and Display page treat the result like a text paste. Display URL is over-emphasized, `/d/<name>` is easy to mistake for a file download, the common small-file download control does not activate reliably, and some binaries can be handled as text.

## 3.2 Goals

1. Distinguish TEXT, UNENCRYPTED FILE, and ENCRYPTED FILE in upload results and Display actions.
2. Make the primary user action for unencrypted files **Download file** targeting `/<name>?a`.
3. Keep encrypted-file share/open on `/d/<name>#<key>` with a working plaintext decrypt/download on Display. Never put the key on the server-visible URL.
4. Provide a working, accessible download control (no nested interactive `<Button><a>`).
5. Keep raw GET, HEAD, filename, MIME, and `Content-Disposition` honest, including MPU where already supported.
6. Add a regression matrix that can be run without deleting production objects.

## 3.3 Non-goals

- Feishu UI, auth, or webhooks.
- Changing encryption algorithms or storing keys on the server.
- Deleting or mutating production Pastes.
- Expanding the MIME magic table unless residual RED tests remain after classification (see 3.5).
- Merging this change into `upstream-sync` or committing frontend fixes directly on `downstream/main`.

## 3.4 Current behavior

Verified against tracked source and accepted audit:

- `UploadedPanel` always leads with Display URL (`/d/<name>` plus `#key` when encrypted). Raw URL is secondary. `?a` is documented only in the Raw URL tooltip, not as a primary file action. There is no class-specific Download URL field.
- Display `/d/<name>` is an HTML app. Small decrypted/in-memory files use a blob/`download` attribute inside a HeroUI `Button` wrapping `<a>`. Pending/media unencrypted download uses `rawUrl` **without** `?a` in the header control, while the in-body “Download raw” link for oversized/non-renderable pastes correctly uses `rawUrl?a`.
- Raw `/<name>` and `/<name>?a` are accepted as working for bytes.
- Patch 070 stores sniffed `mimeType` and defaults empty filenames to `Untitled`. Residual binaries whose magic is not recognized can still be classified as text/display.
- Patch 080 QR targets Display URL.
- Patch 110 decrypts oversized encrypted Display downloads client-side; it does not fix the nested-button small-file control.
- Encryption key is already placed after `#` in `makeDecryptionUrl`; that property must be preserved.

## 3.5 Desired behavior

### Classification

Use existing client and stored metadata. Do not special-case Feishu.

| Class | How it is recognized | Primary returned link / QR | Display primary action |
| --- | --- | --- | --- |
| TEXT | Not encrypted; treated as text (`text/*` or valid UTF-8 paste without a binary `mimeType`) | Display `/d/<name>` (plus Markdown URL when highlight is markdown) | View. Secondary: Raw, Copy |
| UNENCRYPTED FILE | Not encrypted; binary `mimeType`, non-UTF-8 body, or a file upload whose stored type is not text | Download `/<name>?a` | Download file → `/<name>?a`. Display/info page may remain secondary. Do not present `/d/<name>` as file bytes |
| ENCRYPTED FILE | Client encryption key present | `/d/<name>#<key>` | Functioning plaintext decrypt/download. Raw remains ciphertext. No `?key=` |

Encrypted **text** pastes keep the existing Display `#key` share URL (not a file-download lie).

### UploadedPanel

- TEXT: Display URL primary; Raw URL and Copy remain. Markdown URL stays available for markdown.
- UNENCRYPTED FILE: a control labeled for download whose value/href is `/<name>?a` is primary. Display URL, if shown, is explicitly secondary and labeled as a viewer/info page, not “the file”.
- ENCRYPTED FILE: primary share/open URL is `/d/<name>#<key>`. Tooltip continues to say the fragment is client-side. Raw URL labeled as ciphertext. Never generate `/<name>?key=…` or any server-visible equivalent.
- Manage URL remains private/secondary in all classes.
- QR (patch 080) targets the **primary** URL of the class above, including `#key` for encrypted (QR payload is client-side; still never a query key).

### Display download affordance

- One accessible control: a real link or a button that programmatically clicks a non-nested link. No interactive `<button>` wrapping `<a>`.
- Unencrypted file (small or MPU): `href="/<name>?a"` (same-origin paste URL + `?a`). Do not rely on a blob URL for the primary unencrypted download.
- Encrypted with fragment key: keep client-side decrypt then download plaintext (patch 110). Filename from metadata/`Untitled`. Key never appended to href query.
- Encrypted without fragment: do not offer a working plaintext download. Ciphertext raw/`?a` may remain a secondary “download encrypted bytes” action, labeled as such.
- `/d/<name>` remains HTML. Docs and labels must not imply it returns file bytes.

### MIME fallback (same workstream, bounded commits)

**Chosen default:** do **not** expand the magic table in the required first commit.

First commit MUST:

- Stop presenting unknown/non-text binaries as if Display were the file.
- If stored `mimeType` is missing and UTF-8 detection fails, classify as UNENCRYPTED FILE and use `?a` / octet-stream disposition rather than text highlighting.

Second commit (same patch id `140`, separately revertible) MAY expand magic **only if** a RED test for a binary whose MIME is not covered by current 070 sniff still fails after commit 1. If commit 1 GREEN includes that case, skip commit 2.

### HEAD, Range, filename, MIME, Content-Disposition

- HEAD on `/<name>` and `/<name>?a` remains metadata-only and must not consume max-reads (patch 130 already: `/d/` does not consume; GET body does). Tests must assert HEAD does not return a Display HTML body as if it were the file.
- `?a` GET sets `Content-Disposition: attachment` and uses the stored filename (`Untitled` if that is the stored default).
- Range: keep patch 110 R2/MPU Range where supported. KV small objects that do not support Range must fail closed / ignore Range as today — do not invent a new Range implementation unless tests show a regression.
- Content-Type: stored `mimeType` if present; otherwise current sniff/fallback after the classification rule above. `?mime=` override remains for raw.

## 3.6 User/API flows

### Upload result (browser, unauthenticated Pastebin web)

1. User uploads text, unencrypted file, or encrypted file.
2. Panel shows class-correct primary URL (3.5).
3. Copy copies that primary URL. QR encodes that primary URL.
4. Opening primary URL: text → HTML Display; unencrypted file `?a` → attachment bytes; encrypted `#key` → Display decrypt UI.

### Display download

1. User opens `/d/<name>` or `/d/<name>#<key>`.
2. Download control: see 3.5. Keyboard and screen reader can activate it.
3. Unencrypted `?a` response: 200, attachment, correct filename/type, body is paste bytes.
4. Encrypted with key: plaintext file download; network request remains ciphertext raw without key query.
5. Encrypted without key: plaintext download absent or disabled; no exception that leaks a guessed key.

No new public HTTP routes. Existing raw, `?a`, `/d/`, `/m/`, HEAD stay.

## 3.7 Data/state model

No new database. Uses existing paste metadata: name, filename, mimeType, size, encryption scheme, expireAt. Client-only: encryption key fragment.

## 3.8 Security and trust boundaries

- Decryption key is fragment-only. Tests fail if any generated href/QR/copy string contains `key=` query or puts the key in a server-visible parameter.
- Manage URL remains in the panel as today (user-held secret). This patch does not add it to QR or the primary file Download URL.
- Do not log encryption keys.
- Generic patch: no `if (source === "feishu")` behavior.

## 3.9 Compatibility

- Replay onto current series tip from pinned SHA. Export as `140-upload-download-path` (adjust id only if 140 is taken at implementation time).
- Keep 070 filename/Untitled, 080 QR component (change target URL, not the QR feature), 110 encrypted large download, 120 zip, 130 max-reads.
- Existing text-paste Display-first bookmarks remain valid (TEXT class unchanged).
- Existing `/<name>?a` clients unchanged.

## 3.10 Failure behavior

- Missing paste: existing 404 on raw/`?a`/Display; download control must not appear to succeed.
- Encrypted Display without key: existing decrypt error; no fake plaintext file.
- Range unsupported: existing behavior; tests document it.
- HEAD failure: Display may fall back as today; do not convert that into a hang or a nested-button no-op.

## 3.11 Acceptance criteria

1. TEXT upload result: Display URL is the primary link; Raw/Copy secondary; QR matches Display URL (no `#key` unless encrypted text).
2. UNENCRYPTED FILE upload result: primary action/link is `/<name>?a`; `/d/<name>` is not presented as the file bytes; QR matches `?a`.
3. ENCRYPTED FILE upload result: primary URL is `/d/<name>#<key>`; no `?key=` anywhere; Raw is ciphertext URL without key.
4. Display download control is a single accessible name/button/link (no nested interactive `<Button><a>`).
5. Unencrypted small and MPU files download via `?a` with attachment disposition and stored filename.
6. Encrypted file with `#key`: Display plaintext decrypt/download works; network URLs do not include the key.
7. Encrypted file without fragment: no working plaintext download.
8. Binary whose stored/sniffed type is not text is not syntax-highlighted as UTF-8 source solely because Display opened it.
9. Raw GET, `?a`, `/d/`, HEAD, and Range-where-supported have tests. No production object deletion.
10. Complete series including this patch replays from the pinned SHA without `--3way`.

## 3.12 Test specification

Minimum matrix (fixtures in tests/CI, not production deletes):

| Case | Assert |
| --- | --- |
| Small text | Display primary; raw GET is body; `/d/` is HTML; HEAD is not HTML file-bytes |
| Small PNG or other sniffed binary | Upload primary `?a`; GET `?a` attachment + image MIME; `/d/` HTML; download control href `?a`; nested button absent |
| Binary MIME not in current magic | After commit 1: classified as file if non-UTF-8; `?a` works; not highlighted as text. Commit 2 only if this stays RED |
| Large/MPU unencrypted | `?a` download; Range where supported |
| Encrypted small file with `#key` | Display decrypt/download plaintext; no `?key=` |
| Encrypted opened without fragment | No plaintext download success |
| Raw GET | Bytes / ciphertext as applicable |
| `?a` | Content-Disposition attachment |
| `/d/` | HTML viewer |
| HEAD | Metadata; not consume-on-HEAD if that is already the 130 contract |
| Filename | Stored name / `Untitled` |
| Content-Type | Stored or classified type |

Also: a11y/role test that download is one control; QR payload test per class; negative test that copy/QR/href never contain `key=` query.

## 3.13 Open questions

None requiring owner product input. Engineering defaults above:

- MIME magic expansion is optional commit 2 in the same patch id, not a separate workstream.
- QR follows the class primary URL.
- `GET /api/auth/login` is out of scope (Add-on).

Status: SPEC READY FOR OWNER REVIEW
Implementation has NOT started.
