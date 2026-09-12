# FT remediation before lifecycle function testing

Status: **PLANNING ARTIFACTS READY FOR OWNER REVIEW**. Implementation has NOT started.

Function Test remains PAUSED:

```text
FT-01 PASS
FT-02 PASS
FT-03_DATA_PATH PASS
FT-04+ NOT STARTED
FUNCTION_TEST_STARTED_BEYOND_FT03: NO
NEW_P2P_SENT: NO
FT_CREATE_20260912_01_SENT: NO
```

This umbrella tracks three independently reviewable remediation workstreams. They MUST NOT be collapsed into one implementation PR. They have separate deploy and rollback boundaries.

## Accepted checkpoint

- Defect audit accepted with the architecture clarifications in the owner `FUNCTION_TEST_DEFECT_PLANNING` instruction.
- No new P2P was sent during the audit.
- No production mutation occurred during the defect audit.
- `pastebin-prod` and `pastebin-feishu-prod` are unchanged by this planning work.

## Preserved evidence Paste

Do not delete or mutate:

```text
GArKkmdGdbXwikYdckMJhYKC
```

Classification: `EXPECTED_PRIOR_FEISHU_P2P_CREATE`.

Accepted evidence: successful create, Feishu P2P request identity, same Feishu scope as the M3 smoke Paste, not `FT_CREATE_20260912_01`. Do not state that the owner personally sent it unless sender evidence exists.

## Workstreams

| ID           | Title                                                 | Ownership                                                                                                                              | Later deploy           | Docs                                                       |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| FT-DEFECT-01 | Pastebin upload → usable file/read/download path      | Generic Pastebin patch                                                                                                                 | `pastebin-prod`        | [PLAN](ft-defect-01-plan.md), [SPEC](ft-defect-01-spec.md) |
| FT-DEFECT-03 | Simultaneous Feishu + Lark browser auth and ingestion | Add-on Worker                                                                                                                          | `pastebin-feishu-prod` | [PLAN](ft-defect-03-plan.md), [SPEC](ft-defect-03-spec.md) |
| FT-DEFECT-02 | Add-on Web product / IA remediation                   | Add-on frontend (+ listing API if required). **UI foundation: shadcn/ui + Lucide + Sonner on existing React 19 / Vite / Tailwind v4.** | `pastebin-feishu-prod` | [PLAN](ft-defect-02-plan.md), [SPEC](ft-defect-02-spec.md) |

GitHub:

- Umbrella: [#132](https://github.com/Skyline-Gazer/pastebin-worker/issues/132)
- FT-DEFECT-01: [#133](https://github.com/Skyline-Gazer/pastebin-worker/issues/133)
- FT-DEFECT-03: [#134](https://github.com/Skyline-Gazer/pastebin-worker/issues/134)
- FT-DEFECT-02: [#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135)

## Dependency graph

```text
FT-DEFECT-01 (Pastebin file semantics)
        \
         --> FT-DEFECT-02 (Add-on Web IA)
        /
FT-DEFECT-03 (dual Feishu+Lark identity)

FT-04+ blocked until required remediation + targeted regressions complete.
```

Rules:

- FT-DEFECT-01 and FT-DEFECT-03 establish product/data semantics and may proceed in parallel. They do not share a deploy Worker, schema, or patch series.
- FT-DEFECT-02 MUST NOT start implementation from an unmerged DEFECT-01 or DEFECT-03 branch. It starts only after those semantics are stable (merged, or owner-recorded as stable enough that C can consume the contracts).
- FT-DEFECT-02 MUST use Workstream A file-vs-text URL semantics and Workstream B dual-provider login/session model. It MUST NOT assume every entry is Markdown text.
- FT-DEFECT-02 UI primitives are shadcn/ui (new-york, neutral, OKLCH) + Lucide + Sonner. shadcn is not the product architecture. Owner visual acceptance remains required; installing shadcn does not close the UX defect.
- `FT-03_DATA_PATH: PASS` does not mean Web UX is accepted.
- Do not start FT-04, send a P2P, or delete test Pastes as part of this planning or later implementation unless a later owner instruction explicitly authorizes that Function Test step.

## Proposed implementation PR boundaries (later; not now)

1. **DEFECT-01 source PR** — review-only `patch/upload-download-path` from pinned upstream SHA. Must not merge into `upstream-sync`.
2. **DEFECT-01 promotion PR** — export into `downstream/patches/140-upload-download-path/` (or next free series id), add to `downstream/patches/series`, replay from pinned SHA. Target `downstream/main`. Later production deploy is `pastebin-prod` only.
3. **DEFECT-03 implementation PR(s)** — `feat/feishu-dual-provider-auth` from refreshed `downstream/main`. Add-on Worker/auth/webhook/queue/session only. Target `downstream/main`. Later production deploy is `pastebin-feishu-prod` only.
4. **DEFECT-02 implementation PR(s)** — `feat/feishu-web-ia` from refreshed `downstream/main` **after** DEFECT-03 merge (and after DEFECT-01 contract is stable). Target `downstream/main`. Later production deploy is `pastebin-feishu-prod` only.

Forbidden: one PR that mixes Pastebin patch + Add-on auth + Add-on UI.

## Database migrations

- FT-DEFECT-01: none (Pastebin KV/R2 only).
- FT-DEFECT-03: additive D1 migration(s) for OAuth state provider and browser session provider. No rewrite of existing Feishu principal/scope keys. See [ft-defect-03-spec.md](ft-defect-03-spec.md).
- FT-DEFECT-02: none expected. Listing API may add optional public metadata fields; no D1 rewrite.

## Rollback boundaries

- FT-DEFECT-01: roll back `pastebin-prod` Worker to the prior immutable version. Add-on origin is unaffected.
- FT-DEFECT-03: roll back `pastebin-feishu-prod` Worker. Additive D1 columns remain; old code must keep serving existing Feishu sessions. Do not roll forward into DEFECT-02 UI that requires dual-provider session fields.
- FT-DEFECT-02: roll back `pastebin-feishu-prod` frontend/Worker listing projection only. Dual-provider auth remains.

## Function Test gate

FT-04 remains blocked until:

1. Required remediations for the defects that block lifecycle testing are implemented, reviewed, and deployed to the applicable production Worker(s).
2. Targeted regressions in each workstream SPEC pass.
3. Owner visual acceptance of DEFECT-02 uses the authenticated real-data page.

This planning turn does not start FT-04.
