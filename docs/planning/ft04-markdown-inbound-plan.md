# PLAN — Markdown-first inbound (native code block + webhook disposition)

Status: **PLAN APPROVED FOR SPEC**. SPEC draft: [ft04-markdown-inbound-spec.md](ft04-markdown-inbound-spec.md). No application code. No production mutation.

Tracking: [#151](https://github.com/Skyline-Gazer/pastebin-worker/issues/151). Parent Function Test: [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149). Architecture context only: [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146). Checkbox shorthand (not in this implementation): [#153](https://github.com/Skyline-Gazer/pastebin-worker/issues/153).

This PLAN does **not** authorize another P2P, FT-04 retry, FT-05, deploy, D1/queue/console mutation, or selector widening beyond the two first-class ingresses below.

Narrower observability-only PLAN [#152](https://github.com/Skyline-Gazer/pastebin-worker/pull/152) is **subsumed**. Observability remains required here as part B.

## Original FT-04 failure

```text
FT-04: FAIL
timestamp: 2026-09-15T04:04:59.515Z
POST /api/feishu/events HTTP 200
version: 036de73a-6c6a-4c73-a702-8b6f0ee44e12
cf-ray: a3b4c01fef4a4c4d
x-request-id: a06b59a4-ed8c-4c46-b54a-480adb285657
PRINCIPAL_SCOPE_TOUCHED_AFTER_EVENT=NO
QUEUE_SEND_REACHED=NO
NEW_PASTE_COUNT=0
SECOND_P2P_SENT=NO
```

Current webhook accepts `message_type=text` only (`normalizeAuthorizedEvent` otherwise returns `null` → empty HTTP 200, no queue).

## Owner input mode

Owner used **Feishu native Code Block UI** for the one consumed P2P whose intended body was `FT_CREATE_20260912_01`.

Raw production `message_type` was **not recovered** (encrypted body not logged; Open Platform console `OWNER_REQUIRED`).

Likely transport: Open Platform rich **`post`** (or equivalent code/md node), not `text`. Confidence **MEDIUM** on `message_type=post`; **HIGH** that the supported `text` path was not entered.

```text
RAW_PAYLOAD_RECOVERED=NO
```

## Markdown-first product contract

Canonical stored content is **MarkdownSource** (a Markdown source string). Provider format is ingress transport only.

```text
plain text          → MarkdownSource (existing; exact decoded text)
native code block   → extract exact inner source → MarkdownSource
MarkdownSource      → existing create pipeline → Paste raw body → RenderedMarkdown
```

Do **not** store provider rich-text AST as canonical content. Do **not** wrap native code-block contents in Markdown fences. Do **not** add language labels, line numbers, prefixes, suffixes, UI decoration, or an extra newline.

For a native code block containing provider text `FT_CREATE_20260912_01` (with or without a provider terminal LF), Paste body MUST equal that provider `code_block.text` byte-for-byte — including a trailing LF **iff** the provider supplied one. Do not invent or strip terminal newlines for FT assertions against owner-visible glyphs.

Multiline Markdown inside a code block MUST preserve source text and line boundaries deterministically.

Generic name: **MarkdownSource**. Not `FeishuMarkdown` / `LarkMarkdown`. Provider-specific parsing may live in adapters. If Feishu and Lark share Open Platform post/code-block JSON, share one Open Platform parser. Do not assume Slack/WeCom/DingTalk.

## Supported vs fail-closed

Required after remediation:

1. Existing plain P2P `text` (behavior unchanged).
2. P2P native **single** code block carrying textual Markdown source.

Simple textual `post` nodes (paragraphs of `text` tags only): **SPEC decision**. Include only if Open Platform schema has a stable lossless mapping. Otherwise fail-closed; do not invent a lossy flatten.

Remain fail-closed: group chat, bot/app sender, image/file/media/card, mixed resource+text, multiple code blocks, ambiguous mixed posts, unknown tags.

Fixed unsupported reason (logs only): `UNSUPPORTED_POST_STRUCTURE` in addition to existing type/sender/chat/message enums.

Phase 4 SPEC currently forbids posts. This PLAN **replaces that product rule** for the two first-class cases above after owner PLAN approval and a later SPEC. Until SPEC, production stays `text`-only.

## Provider adapter placement

- Generic ingress still: `im.message.receive_v1` + `sender_type=user` + `chat_type=p2p`.
- Message-type allowlist expands in SPEC to `text` and the proven native-code-block/`post` subset.
- Extraction in provider adapter / shared Open Platform parser → `MarkdownSource`.
- Queue payload continues to carry the extracted string (existing create schema). No AST on the queue.

## Observability (part B)

Secret-free `WEBHOOK_DISPOSITION` as previously planned:

```text
challenge
unsupported_event
queue_publish_begin
queue_publish_success
queue_publish_failed
```

Allowed: `provider`, `correlationId`, fixed reason enum (`UNSUPPORTED_EVENT_TYPE`, `UNSUPPORTED_SENDER_TYPE`, `UNSUPPORTED_CHAT_TYPE`, `UNSUPPORTED_MESSAGE_TYPE`, `UNSUPPORTED_POST_STRUCTURE`).

Never log body, decrypted payload, tokens, keys, tenant, open_id, chat_id, message_id, principal, cookies, OAuth.

Consumer dispositions remain **DEFERRED** (pre-queue ambiguity plus extraction, not consumer routing).

Business HTTP/status/challenge/signature/decrypt/retry/D1/consumer semantics unchanged except the **explicit** new supported code-block (and optional simple-text post) extraction.

## RED tests (required before implementation)

1. Plain P2P text → queue once; body exact; prior tests still PASS.
2. P2P native single code block `FT_CREATE_20260912_01` → queue once; content exact; **no** fences.
3. Multiline code-block Markdown → exact intended source including newlines.
4. Simple textual post **if SPEC includes it** → deterministic MarkdownSource; otherwise this case fail-closed.
5. Unsupported rich post → HTTP 200 no-op; queue zero; `unsupported_event` / `UNSUPPORTED_POST_STRUCTURE`.
6. Mixed resource + text → fail closed.
7. Group chat → no queue; `UNSUPPORTED_CHAT_TYPE`.
8. Bot/app sender → no queue; `UNSUPPORTED_SENDER_TYPE`.
9. Malformed post → no queue; safe 400 or 200-no-op per SPEC (no secrets).
10. Oversized extracted Markdown → existing 100k text / 120k queue limits.
11. Queue send failure → 503 `UNAVAILABLE`; `queue_publish_failed`.
12. Log leakage: no fixture token/key/tenant/open_id/chat_id/message_id/body.

## Checkbox compatibility audit

`RenderedMarkdown` uses `marked` `{ gfm: true }` plus XSS sanitization. Interactive checkboxes intercept click/change and do not mutate the DOM until the lifecycle chooser commits. Fenced task syntax stays literal. Restore maps a **single** top-level GFM list task (`[-+*]` / numbered + `[x]`).

```text
STANDARD_GFM_CHECKBOX=SUPPORTED
BARE_CHECKBOX_SHORTHAND=NOT_SUPPORTED
```

Bare `[ ]` / `[x]` without a list marker is not GFM and is not detected by `hasMarkdownTask`. **Do not** silently insert `- ` in #151. Tracked separately: [#153](https://github.com/Skyline-Gazer/pastebin-worker/issues/153). Not blocking native-code-block ingress.

No frontend rewrite in #151 unless extraction would break GFM rendering (it should not: Paste body is MarkdownSource).

## Deployment / rollback

Later implementation: `pastebin-feishu-prod` only. Not `pastebin-prod`. No binding/secret rename.

Rollback: previous Worker version. Additive message-type extraction + logs. Old `text` path must keep working.

## Retry procedure

Failed token `FT_CREATE_20260912_01` remains historical. Do **not** reuse unless owner explicitly decides.

```text
PLAN approval
→ SPEC
→ RED tests
→ minimal implementation
→ CI/review
→ merge
→ versioned candidate
→ production validation (no behavior/config drift beyond SPEC)
→ ARM a NEW FT-04 retry
→ fresh owner authorization
→ exactly one new Feishu P2P with a NEW token
```

**No retry is authorized by this PLAN.**

## PASS criteria (this PLAN turn)

- Markdown-first contract and exact code-block extraction recorded.
- Observability + RED tests listed.
- Checkbox audit + #153.
- #151 / #149 remain OPEN.

## This turn

```text
PRODUCTION_MUTATION=NO
SECOND_P2P_SENT=NO
FT04_RETRY_AUTHORIZED=NO
```
