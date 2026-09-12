# FT-DEFECT-01 PLAN — Pastebin upload → usable file/read/download path

Status: PLAN READY FOR OWNER REVIEW

Implementation has NOT started.

Parent umbrella: [ft-defect-remediation.md](ft-defect-remediation.md) — [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)

Tracking issue: [#133](https://github.com/Skyline-Gazer/pastebin-worker/issues/133)

Function Test remains PAUSED. `FT-04+` is not started. No production mutation. No Paste deletion.

## Objective

Repair the generic Pastebin upload result and Display/read path so TEXT, UNENCRYPTED FILE, and ENCRYPTED FILE have honest primary actions and working download semantics.

This is a generic Pastebin defect. Do not special-case Feishu.

Later implementation target: ordered generic patch from pinned upstream SHA `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`. Later production deploy boundary: `pastebin-prod` (`https://pb.223.im`). Not this turn.

## Context

Accepted Function Test / defect-audit findings:

- Persistence works.
- Raw `/<name>` works.
- Attachment `/<name>?a` works.
- `/d/<name>` is an HTML display/viewer route, not file bytes.
- Current upload result makes Display URL too prominent for ordinary file-download semantics.
- Common small-file display download control is broken (nested interactive `<Button><a download>`).
- Small-file path can omit the known-working `?a` download affordance.
- MIME fallback can route binary content through inappropriate text/display handling.

Existing related patches (already in `downstream/patches/series`, already on production Pastebin) that this workstream must not regress:

- `070-mime-sniff-untitled` — magic sniff, stored `mimeType`, `Untitled` default filename.
- `080-qr-url-tooltip` — QR currently targets Display URL.
- `110-encrypted-direct-download` — oversized encrypted Display download via OPFS/Blob; optional R2 Range.
- `120-multi-file-directory-zip` — directory/multi-file zip uploads.
- `130-max-reads-consume` — max-reads consume-on-GET; `/d/` does not consume.

Unpatched `frontend/` on `downstream/main` is upstream-owned. Product behavior lives in the assembled patched Worker. Implementation later MUST start from the pinned upstream commit and replay the ordered series; do not commit frontend fixes directly onto `downstream/main`.

## Assumptions (with verification)

- `/<name>?a` already sets `Content-Disposition: attachment` on GET: verify with existing Worker tests and a non-destructive HEAD/GET against a fixture, never by deleting production objects.
- `/d/<name>` always returns HTML: verify `handleRead` display branch and frontend `DisplayPaste`.
- Encryption key is already fragment-only in `UploadedPanel.makeDecryptionUrl`: verify source; keep that property.
- Small-file download control uses nested `<Button><a>` in patched `DisplayPasteView`: verify on the assembled tree / patch 110 frontend, not only unpatched `downstream/main`.
- Production objects used in Function Test remain read-only evidence: do not delete `GArKkmdGdbXwikYdckMJhYKC` or other historical Pastes.

## Non-goals

- No Feishu Add-on UI, webhook, or session changes (those are DEFECT-03 / DEFECT-02).
- No production deploy in this planning turn.
- No production object deletion or mutation.
- No `?key=` or other server-visible decryption-key query.
- No change to management-password secrecy.
- No new encryption scheme.
- No rewrite of patches 070/080/110; this is a new series entry stacked after the current tip.
- Do not start FT-04.

## Risks / unknowns

- MIME magic table expansion can misclassify text as binary or the reverse. See SPEC: first commit does not expand magic; a bounded second commit exists only if residual RED tests remain.
- QR currently advertises Display URL (patch 080). Changing QR target per paste class is user-visible; SPEC defines the new targets.
- Nested HeroUI `Button` + native `<a>` is an accessibility and activation defect; replacing it must preserve keyboard and screen-reader download.
- MPU / R2 Range behavior from patch 110 must not be weakened.
- Assembled patched frontend differs from unpatched `downstream/main` `frontend/`. Implementation must edit the patch-branch tree after replay, not the unpatched files on `downstream/main`.

## Proposed implementation approach (later)

1. Classify an uploaded paste as TEXT, UNENCRYPTED FILE, or ENCRYPTED FILE using existing metadata (filename, stored `mimeType`, UTF-8 detection, client encryption key). Do not invent Feishu-specific types.
2. Change `UploadedPanel` returned-link prominence and labels to match that class. Encrypted share URL remains `/d/<name>#<key>`. Unencrypted file primary URL is `/<name>?a`. Text primary URL remains Display `/d/<name>` where appropriate.
3. Point QR at the same canonical primary URL as the prominent returned link for that class.
4. On Display, replace nested `<Button><a>` with a single accessible control. Unencrypted file download href is `/<name>?a`. Encrypted-with-key download remains client-side decrypt-to-file (existing 110 path), never a key-bearing HTTP URL. Encrypted-without-key must not pretend plaintext download works.
5. Keep raw GET, HEAD, filename, MIME, and `Content-Disposition` contracts honest. Add regression tests from the SPEC matrix. No production deletes.
6. MIME fallback: required classification/tests in this workstream. Magic-table expansion only as a separately revertible second commit in the same patch id if residual binaries still hit the text path.

## Candidate files/components (candidates only)

On the later `patch/upload-download-path` tree after series replay:

- `frontend/components/UploadedPanel.tsx` — returned-link semantics, QR target if mounted there.
- `frontend/pages/DisplayPaste.tsx` / `DisplayPasteView.tsx` — download affordance, small vs MPU vs encrypted.
- Worker read path (`worker/handlers/handleRead.ts` and MIME helpers) — only if MIME/HEAD/Range/`Content-Disposition` tests prove a server defect remains after UI classification.
- New/updated frontend and Worker tests for the SPEC matrix.
- Patch README + `downstream/patches/series` on the later promotion PR (downstream-owned).

## Validation strategy

Later, not now:

- RED tests for broken small-file download control, missing `?a` affordance, Display-as-bytes misrepresentation, and key leakage (`?key=` forbidden).
- GREEN on the SPEC matrix: small text, detected binary, uncovered binary MIME, MPU unencrypted, encrypted with `#key`, encrypted without fragment, raw GET, `?a`, `/d/`, HEAD, Range where supported.
- Patch replay of the complete ordered series from the pinned SHA, fail-closed, no `--3way`.
- Upstream-owned paths change only via exported patch.
- No production object deletion.

## References

- Umbrella: `docs/planning/ft-defect-remediation.md`
- SPEC: `docs/planning/ft-defect-01-spec.md`
- `docs/PATCH_AND_UPSTREAM.md`, `AGENTS.md` generic-patch rule
- Existing series entries 070, 080, 110, 120, 130

Status: PLAN READY FOR OWNER REVIEW
Implementation has NOT started.
