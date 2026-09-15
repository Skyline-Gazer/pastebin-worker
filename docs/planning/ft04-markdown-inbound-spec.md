# SPEC — Markdown-first inbound (native code block + webhook disposition)

Status: **SPEC READY FOR OWNER REVIEW**. No application implementation in this turn.

Parent PLAN: [ft04-markdown-inbound-plan.md](ft04-markdown-inbound-plan.md)  
Exact approved PLAN HEAD: `f8458cbc51ae66655938f41b8618817fc5ef1cb2`

Tracking: [#151](https://github.com/Skyline-Gazer/pastebin-worker/issues/151). Parent Function Test: [#149](https://github.com/Skyline-Gazer/pastebin-worker/issues/149). Bare checkbox shorthand: [#153](https://github.com/Skyline-Gazer/pastebin-worker/issues/153). Architecture context only: [#146](https://github.com/Skyline-Gazer/pastebin-worker/issues/146).

This SPEC does **not** authorize merge of planning PR [#154](https://github.com/Skyline-Gazer/pastebin-worker/pull/154), application code, production mutation, a second P2P, or FT-04 retry.

```text
PRODUCTION_MUTATION=NO
SECOND_P2P_SENT=NO
FT04_RETRY_AUTHORIZED=NO
```

---

## 1. Objective

Remediate FT-04 pre-queue classification so authenticated Feishu/Lark P2P create accepts exactly two MarkdownSource ingresses:

1. Existing plain-text `message_type=text` (byte-for-byte unchanged).
2. Exactly one native Open Platform **code block** carrying MarkdownSource.

Preserve secret-free `WEBHOOK_DISPOSITION` observability for challenge, unsupported, and queue publish outcomes.

Do **not** build a general rich-text → Markdown converter in v1.

---

## 2. Authoritative native code-block payload contract

Established **before** any parser design. Sources (priority order used):

1. Official Open Platform docs (Feishu + Lark).
2. Official receive-content schema (not UI appearance).
3. Repository fixtures/history: **none** currently encode `code_block` / `post` inbound (no local invention).
4. SDK/sample repos: not required once official receive schema is explicit.

### 2.1 Recorded constants

```text
NATIVE_CODE_BLOCK_MESSAGE_TYPE=post
NATIVE_CODE_BLOCK_CONTENT_SHAPE=see §2.2 (receive shape; NOT send zh_cn/en_us wrapper)
CODE_NODE_TAG=code_block
CODE_SOURCE_FIELD=text
```

### 2.2 Feishu receive shape (`im.message.receive_v1`)

On `im.message.receive_v1`:

| Field                        | Contract                                                              |
| ---------------------------- | --------------------------------------------------------------------- |
| `event.message.message_type` | `"post"` for rich text that can carry a native code block             |
| `event.message.content`      | JSON **string** whose parsed object is the **receive** rich-text body |

Receive rich-text body (authoritative for inbound; differs from **send** locale-wrapped body):

```json
{
  "title": "Title",
  "content": [
    [
      {
        "tag": "code_block",
        "language": "GO",
        "text": "func main() int64 {\n    return 0\n}"
      }
    ]
  ],
  "content_v2": []
}
```

`code_block` node fields (official):

| Field      | Type   | Role                                                                    |
| ---------- | ------ | ----------------------------------------------------------------------- |
| `tag`      | string | Must be `"code_block"`                                                  |
| `language` | string | Optional language label (PYTHON, GO, …). **Not** part of MarkdownSource |
| `text`     | string | **Authoritative code-block source** → MarkdownSource                    |

Notes from official receive docs:

- Send body uses locale keys (`zh_cn` / `en_us`). **Inbound receive content does not use that wrapper.** Fixtures MUST use the receive shape above.
- `md` appears only in `content_v2` on Feishu receive docs and preserves Markdown for messages composed via `md`. Native **Code Block** UI maps to `tag=code_block` in `content` (and identically in `content_v2` when no `md` is present).
- v1 MUST extract from `content` → `code_block.text`. Do **not** treat `md` as the native code-block path. Do **not** require `content_v2` for acceptance.

Evidence:

- Receive event: <https://open.feishu.cn/document/server-docs/im-v1/message/events/receive> (`message_type`, `content` string; points to receive message content).
- Receive content / `code_block`: <https://open.feishu.cn/document/server-docs/im-v1/message-content-description/message_content> (and alias <https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/im-v1/message/events/message_content>).
- Send content (contrast only; **not** inbound fixture shape): <https://open.feishu.cn/document/server-docs/im-v1/message-content-description/create_json>.

### 2.3 Lark

Lark Open Platform documents the **same** receive rich-text `post` body with `tag=code_block` and source field `text` (same structural contract as Feishu).

Evidence:

- <https://open.larkoffice.com/document/server-docs/im-v1/message-content-description/message_content>
- <https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/im-v1/message/events/message_content>
- Receive event: <https://open.larkoffice.com/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/events/receive>

```text
FEISHU_LARK_PAYLOAD_SCHEMA=SHARED_OPEN_PLATFORM_RECEIVE
```

Therefore v1 uses one shared Open Platform parser/helper for Feishu and Lark. ProviderAdapters remain the brand/routing boundary; Slack / WeCom / DingTalk MUST NOT import this post/`code_block` shape.

### 2.4 Payload schema gate

```text
PAYLOAD_CONTRACT_ESTABLISHED=YES
FT04_MARKDOWN_SPEC_BLOCKED_PAYLOAD_SCHEMA=NO
```

If future production evidence shows a different native Code Block encoding than §2.2, STOP implementation and reopen SPEC. Do not invent an alternate parser.

---

## 3. Narrow first implementation (v1)

### 3.1 Supported

| Case                        | Behavior                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Existing plain-text P2P  | `message_type=text`, content `{"text":"..."}` → MarkdownSource exactly as today                                                                                                                               |
| B. Single native code block | `message_type=post`, receive body whose `content` is **exactly one** paragraph containing **exactly one** node `{ tag: "code_block", text: <string>, language?: <string> }` → MarkdownSource = `text` exactly |

Accepted single-code-block constraints (all required):

- `title` absent or `""` (non-empty title → unsupported).
- `content.length === 1`.
- That paragraph length `=== 1`.
- That node `tag === "code_block"`.
- `typeof text === "string"`.
- Optional `language` ignored for MarkdownSource (any string or absent is fine; extra unknown fields on the node → unsupported).
- Extra top-level keys such as `content_v2` may be present and are **ignored** for acceptance when `content` already matches B.
- Empty `text` (`length === 0`) follows existing empty-text limit/unsupported semantics (no queue; current text path uses HTTP 400 `UNSUPPORTED` — retain that class for empty extracted source).

### 3.2 Explicitly deferred (fail closed → no queue)

- Arbitrary rich-text paragraphs / simple textual `post` conversion.
- Multiple code blocks.
- Code block + ordinary text (any additional `text`/`a`/`at`/… nodes or paragraphs).
- Text + image / image/file/media.
- Cards / interactive.
- Unknown tags.
- Lossy flattening of `content` or `content_v2` `md` trees.
- Treating `md` as a supported create path in #151.

Reason: FT-04 needs Markdown-preserving **native code-block** ingress, not a general rich-text converter.

```text
GENERIC_SIMPLE_TEXTUAL_POST=DEFERRED
MD_TAG_INGRESS=DEFERRED
BARE_CHECKBOX_SHORTHAND=DEFERRED_TO_#153
```

---

## 4. Canonical MarkdownSource contract

```ts
type MarkdownSource = string
```

Conceptual/internal only. The string entering the existing create pipeline **is** the Paste body.

| Ingress           | MarkdownSource                                       |
| ----------------- | ---------------------------------------------------- |
| Plain text        | Provider `content.text` exactly as currently decoded |
| Native code block | Provider `code_block.text` exactly                   |

Never add:

- Markdown fences (` ``` `)
- Language identifier into the body
- Line numbers
- Leading/trailing decoration
- Extra newline beyond what `text` already contains
- UI metadata

Exactness example:

```text
Input code_block.text:  FT_CREATE_20260912_01
Queued/Paste body:      FT_CREATE_20260912_01
```

Byte-for-byte identical.

---

## 5. Multiline exactness

The provider `code_block.text` field is **authoritative** for line breaks and trailing-newline semantics.

Example source inside `text`:

```text
# Tasks

- [ ] Build VM
- [x] Configure NAS
```

Must produce the same MarkdownSource, including intended line breaks.

Rules:

- Do **not** trim indiscriminately (no `trim()` of the whole source).
- Do **not** normalize CRLF ↔ LF unless an already-defined provider/API decoding step already does so; current webhook path JSON-parses the content string and uses the resulting JS string as-is — **retain that** (JSON `\n` → LF; no extra CRLF policy).
- Trailing newline: preserve iff present in `text`; do not invent one.

FT-04 / #151 validation content MUST use standard GFM list checkboxes where tasks matter; do **not** depend on bare `[ ]` shorthand (#153).

```text
STANDARD_GFM_CHECKBOX=SUPPORTED
BARE_CHECKBOX_SHORTHAND=DEFERRED_TO_#153
```

No source rewriting such as `[ ] task` → `- [ ] task` in this patch.

---

## 6. Provider layer design

Keep `webhook.ts` orchestration generic.

```text
Provider / Open Platform adapter
        ↓
decode supported inbound body
        ↓
MarkdownSource | UnsupportedReason
        ↓
generic webhook normalization
        ↓
existing identity / queue / create path
```

Because Feishu and Lark share the receive schema (§2.3):

- Prefer a shared helper under `downstream/addons/messaging/worker/providers/open-platform.ts` (or a tightly scoped sibling module imported by Open Platform providers).
- Feishu/Lark adapters remain brand/config/routing; they must not diverge on `code_block` parsing.
- Do **not** leak Open Platform post shapes into future Slack / WeCom / DingTalk adapters.

Wire/schema of `InboundMessageV1` / queue payload remains the extracted string in `content`. No AST on the queue.

---

## 7. Result type — preserve unsupported reason

Current:

```ts
normalizeAuthorizedEvent(...) → AuthorizedInboundEvent | null
```

loses why `null` was returned.

### 7.1 Minimal internal change

Introduce a fixed internal result (names may vary; semantics MUST match):

```ts
type NormalizeAuthorizedResult =
  | { kind: "accepted"; event: AuthorizedInboundEvent }
  | {
      kind: "unsupported"
      reason:
        | "UNSUPPORTED_EVENT_TYPE"
        | "UNSUPPORTED_SENDER_TYPE"
        | "UNSUPPORTED_CHAT_TYPE"
        | "UNSUPPORTED_MESSAGE_TYPE"
        | "UNSUPPORTED_POST_STRUCTURE"
    }
```

Mapping (first failing gate wins; order matches current checks then new post structure):

| Condition                                                 | reason                       |
| --------------------------------------------------------- | ---------------------------- |
| `event_type !== im.message.receive_v1`                    | `UNSUPPORTED_EVENT_TYPE`     |
| `sender_type !== user`                                    | `UNSUPPORTED_SENDER_TYPE`    |
| `chat_type !== p2p`                                       | `UNSUPPORTED_CHAT_TYPE`      |
| `message_type` not `text` and not accepted `post`         | `UNSUPPORTED_MESSAGE_TYPE`   |
| `post` that is not the single-`code_block` shape (§3.1 B) | `UNSUPPORTED_POST_STRUCTURE` |

Malformed auth/schema/identity/empty/oversize continue to throw `WebhookError` with current HTTP codes (not the unsupported result).

Compatibility: public exports may keep a thin wrapper returning `AuthorizedInboundEvent | null` if needed, but webhook orchestration MUST use the reason-preserving result for disposition logging. Do not expose decrypted provider data on the result type.

---

## 8. Safe webhook disposition logging

Exact points:

| Point                         | Log                                                             |
| ----------------------------- | --------------------------------------------------------------- |
| URL challenge handled         | `WEBHOOK_DISPOSITION=challenge`                                 |
| Normalize → unsupported       | `WEBHOOK_DISPOSITION=unsupported_event` + `reason=<fixed enum>` |
| Immediately before queue send | `WEBHOOK_DISPOSITION=queue_publish_begin`                       |
| After resolved queue send     | `WEBHOOK_DISPOSITION=queue_publish_success`                     |
| Queue send throws             | `WEBHOOK_DISPOSITION=queue_publish_failed`                      |

Allowed fields only:

- `provider`
- `correlationId`
- `disposition` (via `WEBHOOK_DISPOSITION=…`)
- fixed `reason` when disposition is `unsupported_event`

Never log:

- MarkdownSource / message body
- decrypted envelope
- raw POST body
- event / message / chat / open IDs
- tenant
- principal
- secrets / tokens / keys
- cookies / session / OAuth

Consumer dispositions remain **DEFERRED**.

---

## 9. HTTP semantics

Preserve current external behavior unless this SPEC explicitly changes extraction support.

| Case                                                                                               | Queue     | HTTP                                                                  |
| -------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------- |
| Supported plain text                                                                               | send once | 200 empty                                                             |
| Supported single native code block                                                                 | send once | 200 empty                                                             |
| Authenticated unsupported business variant (group, bot, wrong type, unsupported post structure, …) | no        | 200 empty                                                             |
| Malformed structure / auth failure                                                                 | no        | current 4xx (`MALFORMED` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, …) |
| Empty / oversize extracted source (existing text rules)                                            | no        | current `UNSUPPORTED` 400                                             |
| Queue publication failure                                                                          | n/a       | 503 `UNAVAILABLE`                                                     |

Do **not** turn unsupported business variants into error responses solely for observability.

---

## 10. RED contracts (required before implementation)

RED tests MUST initially fail only for newly required behavior. Existing webhook tests MUST continue to pass after implementation.

Use fixtures whose `post` `content` JSON matches §2.2 receive shape (not send `zh_cn`).

| ID  | Case                                                                              | Expect                                                                                                                                   |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Existing P2P text                                                                 | content exact; queue once                                                                                                                |
| B   | Native single code block; `text=FT_CREATE_20260912_01`                            | queue once; content exact; no fences                                                                                                     |
| C   | Multiline Markdown in one code block                                              | exact MarkdownSource; line boundaries preserved; no fences                                                                               |
| D   | Paragraph-only rich `post` (`text` tags only)                                     | no queue; HTTP 200; `UNSUPPORTED_POST_STRUCTURE`                                                                                         |
| E   | Multiple code blocks                                                              | no queue; unsupported (`UNSUPPORTED_POST_STRUCTURE`)                                                                                     |
| F   | Code block + text                                                                 | no queue; unsupported                                                                                                                    |
| G   | Code block + image/resource                                                       | no queue; unsupported                                                                                                                    |
| H   | Unknown node/tag                                                                  | no queue; unsupported                                                                                                                    |
| I   | Group chat + otherwise-valid code block                                           | no queue; `UNSUPPORTED_CHAT_TYPE`                                                                                                        |
| J   | Bot/app sender                                                                    | no queue; `UNSUPPORTED_SENDER_TYPE`                                                                                                      |
| K   | Wrong message type (e.g. `image`)                                                 | no queue; `UNSUPPORTED_MESSAGE_TYPE`                                                                                                     |
| L   | Malformed native-code-block structure (bad JSON, missing `content`, non-array, …) | fail closed; no queue; 4xx where current malformed rules apply                                                                           |
| M   | Extracted Markdown exceeds `TEXT_LIMIT` (100_000 bytes)                           | no queue; existing limit semantics                                                                                                       |
| N   | Queue send rejects                                                                | HTTP 503; `queue_publish_failed`                                                                                                         |
| O   | Disposition success path                                                          | `queue_publish_begin` then `queue_publish_success`                                                                                       |
| P   | Log leakage                                                                       | captured logs must not contain fixture body/MarkdownSource, token, encrypt key, verification token, tenant, open_id, chat_id, message_id |

Fixture policy: the RED native-code-block fixture MUST reflect §2.2. Do not invent a payload that merely matches a preferred implementation.

Relevant inbound shape for `im.message.receive_v1` is the **receive** post body (`title` + `content` paragraphs). Locale send layouts (`zh_cn` / `en_us`) are out of scope for inbound fixtures.

---

## 11. Text path regression

Existing text path MUST remain byte-for-byte semantically unchanged:

- identity derivation (`scopeId` / `recordKey` / `requestId`)
- principal namespace
- queue wire schema (`InboundMessageV1`)
- D1 principal-scope behavior
- consumer behavior
- `PasteClient` / `PASTEBIN_SERVICE`

No frontend change required for #151: UI already renders Paste MarkdownSource via `RenderedMarkdown`. #153 remains separate.

---

## 12. Implementation surface estimate

Likely minimal files (later implementation PR; not this SPEC turn):

| Path                                                                                          | Role                                                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `downstream/addons/messaging/worker/providers/open-platform.ts` (and/or small sibling helper) | Shared receive `post` / `code_block` → MarkdownSource \| reason                      |
| `downstream/addons/messaging/worker/webhook.ts`                                               | Reason-preserving normalize result; disposition logs; allow `post` single code block |
| `downstream/addons/messaging/tests/webhook.spec.ts`                                           | RED A–P + regressions                                                                |
| Optional provider-local parser unit tests                                                     | Shared helper coverage                                                               |

Do **not** modify:

- `pastebin-prod` application code
- Upstream-owned Pastebin paths on `downstream/main` outside Add-on
- Frontend for #151
- D1 migrations / queue bindings / secrets / OAuth / custom domains as part of this remediation

---

## 13. Deployment scope (later candidate only)

Production candidate changes **only**:

```text
pastebin-feishu-prod
```

No intended change to:

- `pastebin-prod`
- D1 schema
- queue bindings
- secrets
- OAuth config
- custom domains

Candidate MUST preserve all existing production bindings/config. Rollback = previous Worker version. Text path remains live.

---

## 14. Retry contract

Do **not** authorize retry now.

Failed historical input remains:

```text
FT_CREATE_20260912_01
```

A later FT-04 retry MUST use a **new** token selected/authorized by the owner.

```text
SPEC approval
→ RED
→ minimal implementation
→ tests / CI
→ PR review
→ merge
→ versioned candidate
→ production smoke without business P2P
→ promote
→ ARM FT-04 retry
→ owner authorizes one new P2P
→ observe once
```

No automatic retry. No second P2P from this SPEC.

---

## 15. Docs / planning impact

| Artifact                                    | Action                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| This SPEC                                   | Added for owner review on PR #154                                                                |
| Parent PLAN                                 | Remains approved baseline; simple textual post decided **DEFERRED** here                         |
| Phase 4 SPEC “posts forbidden” product rule | Replaced for the two first-class cases in §3.1 after this SPEC is owner-approved and implemented |
| #153                                        | Unchanged; bare shorthand out of scope                                                           |
| #146                                        | Not consumed                                                                                     |

---

## 16. Acceptance criteria (SPEC turn)

- [x] Authoritative Feishu/Lark native code-block payload constants recorded (§2).
- [x] v1 support limited to plain text + single native code block; generic rich text deferred (§3).
- [x] MarkdownSource exactness + multiline rules (§4–§5).
- [x] Checkbox: standard GFM supported; bare shorthand → #153 (§5).
- [x] Shared Open Platform parser placement; webhook stays generic (§6).
- [x] Unsupported reason preserved; disposition logging + HTTP semantics (§7–§9).
- [x] RED A–P defined with real receive-shape fixture policy (§10).
- [x] Text regression + file surface + deploy + retry gates (§11–§14).
- [ ] Owner approval of this SPEC before RED/implementation.
- [ ] No merge of #154 until owner directs.

---

## 17. This turn flags

```text
PRODUCTION_MUTATION=NO
SECOND_P2P_SENT=NO
FT04_RETRY_AUTHORIZED=NO
```
