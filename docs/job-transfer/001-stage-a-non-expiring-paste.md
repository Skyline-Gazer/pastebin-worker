# Job Transfer — Phase 2 / Stage A：`patch/non-expiring-paste`（非过期 Paste 能力，Patch 010）

> 这是一份**交接给下一个 AI Coding Agent** 的承接指令 + 可回传契约。
> 请先完整读取本文件与被引用的 durable 工件，再按章程继续；不要重新做 PLAN / SPEC / PHASE 分解（均已 owner 批准）。
> 副本位置：工作区 `docs/job-transfer/001-stage-a-non-expiring-paste.md`（**本地 untracked，已通过 .git/info/exclude 排除**，不会进入任何 commit / patch 分支；不要 add/commit 它）。

---

## 0. 立即动作（读完本档后按顺序做）

1. 读取持久化工件：
   - SPEC —— GitHub `Skyline-Gazer/pastebin-worker` Issue **#3**（`Phase 2 SPEC — Generic non-expiring paste capability (owner approved)`）
   - PHASE/TODO —— Issue **#4**（`Phase 2 PHASE/TODO — …`，**Status: OWNER APPROVED**）
2. 确认在分支 `patch/non-expiring-paste` 上，且其 HEAD = 精确 pinned upstream SHA `0835cac4ab8f974035d31845f5c2b93b0c85b5c6`。
3. 先解决唯一已知 blocker（见 §2），随后按 §5 逐 TODO 推进。

**禁止**：自行重排任务、更改 owner 已批准语义、把下游/交接内容写进 patch 分支、在 Stage A 就 export / 改 `downstream/patches/series` / 建 Stage B。

---

## 1. 背景与 durable refs

- **repository**：`Skyline-Gazer/pastebin-worker`（curated downstream of `SharzyL/pastebin-worker`）。
- **目标**：实现并提交 generic upstream patch `010-non-expiring-paste`，让上游支持 `e=never`（永久 Paste）与显式 `e=max`，并在永久时返回 `expireAt: null` / `expirationSeconds: null`；现有数值/timed 行为与 clamp 完全向后兼容。
- **所有权边界**：改的是 **upstream-owned** 源/测试/doc（`shared/*`、`worker/handlers/handleWrite.ts`、`worker/handlers/handleMPU.ts`、`worker/storage/storage.ts`、`frontend/components/UploadedPanel.tsx`（仅最小 null-aware、显示 "Never"）、`doc/api.md`、适用时 `doc/curl.md`）。前端不做 redesign；不加任何 Feishu 概念。
- **refs**：
  - SPEC：https://github.com/Skyline-Gazer/pastebin-worker/issues/3
  - PHASE/TODO：https://github.com/Skyline-Gazer/pastebin-worker/issues/4
  - pinned upstream SHA：`0835cac4ab8f974035d31845f5c2b93b0c85b5c6`（= 当前 `upstream-sync` tip = 官方 `upstream/goshujin`，已 fetch 验证）。
  - 流程规约：`AGENTS.md` §4.8/§17/§18/§20、`DECISIONS.md` D-028/D-029、`docs/CHANGE_CONTEXT_AND_REVIEW.md` §9/§10、`docs/PATCH_AND_UPSTREAM.md` §3/§11/§14、`docs/TESTING.md` §1、`.github/PULL_REQUEST_TEMPLATE.md`。

---

## 2. 真实 blocker（最新，immediate）

- **现象**：`pnpm exec vitest run worker/test/basic.spec.ts` 失败：`Cannot find module '../../dist/frontend/.vite/ssr-manifest.json' imported from /Users/ian/Desktop/Projects/pastebin-worker/worker/pages/markdown.ts`。
- **原因**：`worker/pages/markdown.ts` 在 import 时加载前端 SSR 构建产物；workers 测试池（vitest-pool-workers）先于 build 就会缺该文件。这是**构建前置依赖，不是源码缺陷，也不是本 task 的 RED**。
- **修复（下一个可执行单步）**：先跑 `pnpm build:frontend`（repo 现有 script、`dist/*` 已 gitignore）生成 `dist/frontend/.vite/ssr-manifest.json`，再用：
  ```sh
  pnpm exec vitest run worker/test/basic.spec.ts
  ```
  确认 workers pool 能绿（作为后续 REGRESSION 基线）。若 `build:frontend` 报错，如实记录，不要为通过而改动 package.json / 源码。

---

## 3. 当前进度（本交接前的已完成项 & 每一项 host 验证证据）

> 以下带「host-verified」的项都有真实命令结果，不是猜测。

1. **Issue #4 两处流程修正 + 状态说明**（已写入）：修正 A —— Stage A exit =「REVIEW-ONLY source PR 已过 **current-HEAD** AI Review Gate + required CI + remains UNMERGED」，canonical refs `docs/CHANGE_CONTEXT_AND_REVIEW.md §9.13` / `docs/PATCH_AND_UPSTREAM.md §14.1`；整体 Phase 2 只在 Stage B promotion PR 并入 `downstream/main` 后完成（§9.14 / §14.2）；**REVIEW-ONLY PR 绝不 merge 到 `upstream-sync`**。修正 B —— TDD：新/缺失行为必须真实 RED；既有正确行为允许提前 GREEN 并记录为 baseline/regression；绝不伪造 RED / 不破坏已绿测试。Issue #3 body 验证前后一致（`diff` → `ISSUE3-BODY-UNCHANGED`）。
2. **环境（用户授权改用 ~/.local 用户目录安装，因 brew 在该执行沙箱被确认为无法自写 /opt/homebrew）**：
   - fnm 1.39.0 已装到 `~/.local/bin/fnm`（`fnm --version` → 1.39.0）。
   - Node：`fnm install 22 && fnm use 22` → `node --version` = **v22.23.2**（22.x ✓）。corepack → `pnpm --version` = **10.34.5**（10.x ✓）。
   - `~/.zshrc` 已追加 fnm 初始化行（只追加一次，未重复）。
   - **重要环境注意**：每条需要 node/pnpm 的命令，若在全新 shell，先执行：
     ```sh
     export PATH="$HOME/.local/bin:$PATH"
     eval "$("$HOME/.local/bin/fnm" env --shell bash 2>/dev/null)"
     fnm use 22 >/dev/null 2>&1 || true
     ```
     再跑 `node --version` / `pnpm --version` 自检。不要用系统自带 node26/pnpm11。
   - 不要用 brew 路径（沙箱限制已验证不可行）；不要卸载/改动用户原有 node26。
   - 安装/版本一律不动 `package.json` / `pnpm-lock.yaml` / `.node-version` / `.nvmrc` / repo 内任何 tracked 文件来“迁就”版本。
3. **完整 Stage A mandatory preflight**（全通过）：
   - 工作区干净：`git status --short` 空。
   - `git fetch --all --prune` 成功（origin + upstream）。
   - pinned commit 存在：`git cat-file -e 0835cac4ab8f974035d31845f5c2b93b0c85b5c6^{commit}` → OK。
   - `refs/remotes/origin/upstream-sync` == `0835cac4…`（可直接作为 Stage A REVIEW-ONLY PR 的 base）。
   - 官方 `refs/remotes/upstream/goshujin` == `0835cac4…`（本地归档虽显示同 SHA；即便官方前进也不得改 pinned base）。
4. **分支**：已 `git checkout -b patch/non-expiring-paste 0835cac4…`；HEAD 恰为 pinned `0835cac4…`（`git rev-parse HEAD`），`git merge-base --is-ancestor <pinned> HEAD` → OK，且不是 `downstream/main`。
5. **依赖**：`pnpm install --frozen-lockfile` 成功（pnpm 10.34.5）；随后 `git status --short` 仍空（无 tracked 变化；`node_modules` 已被 ignore）。

由 `git rev-parse 0835cac4…` 确认，可安全参考 pinned 上源码。**尚未**开始读取其余待改源码（见 §6），也**尚未**写任何 RED 测试或改动。

---

## 4. 不可违反的约束（审计重点核对）

1. **范围**：只做 Issue #3 SPEC §5-§10 所列 generic 能力 + Issue #4 的 Phase 2A TODO；不改 Phase 2B / 不 export / 不改 `downstream/patches/series` / 不建 Stage B promotion branch。
2. **所有权**：只改 upstream-owned 文件 + `doc/api.md`（适用 `doc/curl.md`）+ `frontend/components/UploadedPanel.tsx`（仅 null→“Never”）；**加进 diff 的每一行都不得出现 Feishu**。
3. **REVIEW-ONLY**：PR 必须标注「REVIEW ONLY — DO NOT MERGE INTO upstream-sync」，base 用 `upstream-sync`（其 tip == pinned，§3.4）或 pinned。**永不 merge 到 upstream-sync 或 downstream/main**；到达 Stage A exit 就 STOP。
4. **TDD（docs/TESTING.md §1.1 + Issue #4 修正 B）**：
   - 新/缺失行为（`e=never`、`e=max`、`parseExpirationSpec`、permanent KV/R2 表示、`updateAccessCounter` permanent 重写、permanent↔timed 双向转换、可空响应、UploadedPanel “Never”、MPU create-stage authority、complete-e 不 override、permanent cleanup skip 等）必须观察真实 RED 并记录——test 名、exact command、expected reason、actual failure。
   - baseline/regression（omitted/empty→`DEFAULT_EXPIRATION`、现有 numeric clamp、现有 invalid→400、legacy 过期清理）允许提前 GREEN，记录为 baseline，**绝不强制失败/绝不让正确测试失败凑 RED/绝不伪造 RED**。
   - 用非 watch 的 vitest：`pnpm exec vitest run <file-or-pattern>`；全量回归 `pnpm exec vitest run`，另跑 `pnpm typecheck`、`pnpm lint`、`pnpm build`（只用 repo 现有 script，别发明不存在的）。
5. **MPU retention 权威源（Issue #3 已批准契约）**：MPU `/mpu/create` 或 `/mpu/create-update` 阶段选的 retention **权威**，编码进 R2 multipart `customMetadata`；`complete()` 后必须从 **completed `R2Object.customMetadata`** 派生最终 Paste retention / KV metadata / API 响应。绝不改成信任 `/mpu/complete` 的 `e`，不引入第二 source of truth。**若 runtime/API/类型/mock 无法从 complete() 可靠获得所需 customMetadata** → 立即 STOP；这属于 **SPEC change-control blocker**，报告 owner，不自行降级。
6. **no-Feishu guard（在最终 Stage A diff 上检查新增行）**，例如：
   ```sh
   git diff --unified=0 0835cac4ab8f974035d31845f5c2b93b0c85b5c6...HEAD -- . \
     | grep '^+' | grep -v '^+++' | grep -iE 'feishu|飞书'
   ```
   （不要用只查文件名的方式。）
7. **提交（AGENTS.md §17 + change context）**：subject 用 Conventional Commit（建议 `feat(expiration): support non-expiring pastes`）；body 必须含 Context / Expected behavior / Acceptance criteria / Constraints / Validation / Docs / Refs，且含：
   ```text
   Upstream base: 0835cac4ab8f974035d31845f5c2b93b0c85b5c6
   Patch ID:      010-non-expiring-paste
   Dependencies:  none
   ```
   Refs 引用 Issue #3 与 #4 的 URL。默认单个 coherent source commit；若 AI Review Gate 后有 review-fix commit 允许追加有意义的 fix commit，不要为“恰好一个 commit”而隐藏 review history。
8. **Phase Review Gate（docs/CHANGE_CONTEXT_AND_REVIEW.md §9）**：AI Review 必须对原 PR **当前最新 HEAD**；required CI 对当前 HEAD green；可行动 finding 修复或按规定 disposition；**blocking findings 不得由 coding agent 自行 override**；任何改变 PR HEAD 的 commit 使旧 review 失效、需重新 review；bot 故障/不可用**不算通过**（fail-closed），如实报告，不得当绿灯填。
9. **base/rev**：不得为了“方便”把 patch rebase 到更新的 upstream，不得改 pinned SHA；若 `upstream-sync` 前进则按 `docs/PATCH_AND_UPSTREAM.md §14.1` 做临时 review-base（当前未前进，不必动）。
10. **clean 保持**：除 task 必要文件外工作区需保持 clean；`docs/job-transfer/` 已排除，不需处理。

---

## 5. 剩余执行计划（从 Issue #4 Active Phase 2A TODO §1 起）

（在此交接时 §0 preflight 已全过，见 §3.3-§3.5；从 §1 直接开始。）

1. **§1 TDD RED**：按 Issue #4 的 RED targets 先写并跑失败测试（vitest run 单文件），逐条记录 RED。参考文件位置（pinned 上，尚未读全文，先 read 建立 baseline）：
   - `shared/test/*`（parser：`parseExpirationSpec`；可含 resolution-policy 测试）
   - `worker/test/storage.spec.ts` / `worker/test/r2.spec.ts`（KV/R2 永久表示、updateAccessCounter、cleanup、isExpired）
   - `worker/test/writeErrors.spec.ts` / `worker/test/uploadOptions.spec.ts`（`e=never`/`e=max`/invalid-400）
   - `worker/test/mpu.spec.ts` / `worker/test/mpuErrors.spec.ts`（MPU create-stage authority、complete-e、permanent）
   - `worker/test/common.spec.ts`（`metaResponseFromMetadata` null 输出）
   - 前端 `UploadedPanel` “Never” fixture（`frontend` 测试）
2. **§2 GREEN→§3 REFACTOR→§4 REGRESSION**：实现最小正确改动；REFACTOR 只做必要整理；全量 `vitest run`、`typecheck`、`lint`、`build` 真实跑一遍并记录。
   - 依据 Issue #3 §5/§6/§7 精确语义（尤其 `parseExpirationSpec` 纯解析器、策略层、schema v2 `willExpireAtUnix: number|null`、R2 `permanent:"1"`、KV 永久 omit `expiration`、统一 `isExpired`、`migratePasteMetadata` v1→v2 读取归一化、`expireAt:null`/`expirationSeconds:null`、MPU flow）。
   - 必须覆盖 Issue #4 列出的全部实现点（见 §5.1 TODO 清单原文与 §4/ 约束清单）。
3. **§5 source commit（push 前）**：先自跑 no-Feishu guard；确认工作区只剩本 patch 变更；`git log` 无 job-transfer/additional 噪音。
4. **push + REVIEW-ONLY PR**：
   ```sh
   git push -u origin patch/non-expiring-paste
   ```
   push 前再次确认 `origin/upstream-sync`==`0835cac4…`；push 后确认远端 head == 本地 HEAD；再开 PR（title 亦可带「REVIEW ONLY」/body 顶行明确），base=`upstream-sync`。
5. **Phase Review Gate 循环**：等/查 AI Review（当前正在用 Kody：CheckRun `Kody Code Review`）。finding→fix→targeted test→regression→commit→push→re-review latest HEAD，直到满足 Stage A exit。
6. **Stage A exit 并 STOP**：

   ```
   Stage A exit checkpoint satisfied:
     REVIEW-ONLY source PR passed the current-HEAD AI Review Gate and required CI, and remains UNMERGED.
   Canonical refs: docs/CHANGE_CONTEXT_AND_REVIEW.md §9.13 / docs/PATCH_AND_UPSTREAM.md §14.1
   ```

   **不要** merge PR、不要 `git format-patch`/`export-patch.sh`、不改 series、不建 Stage B、不开始 Phase 2B。整体 Phase 2 只会在后续 Stage B promotion PR 并到 `downstream/main` 后完成。

---

## 6. 尚未读取、但必须先 read 再改的 pinned 源码（§5 §1 前置）

这些我在交接前只确认了“存在 + 全局搜索曾读片段”，尚未做逐文件 read 建立 baseline，请按 actual pinned 状态再看（不要凭记忆改）：

- `shared/parsers.ts`（`parseExpiration` / `parseExpirationReadable`）
- `shared/interfaces.ts`（`MetaResponse.expireAt`、`PasteResponse.expirationSeconds`）
- `shared/verify.ts`（`verifyExpiration`）
- `worker/storage/storage.ts`（`PasteMetadata` / `PasteMetadataInStorage` / `metaResponseFromMetadata` / `migratePasteMetadata` / `updateAccessCounter` / `getPaste` / `getPasteMetadata` / `pasteNameAvailable` / `cleanExpiredInR2` / `createPaste` / `updatePaste`）
- `worker/handlers/handleWrite.ts`（`expire` 处理 + clamp）
- `worker/handlers/handleMPU.ts`（`mpuExpireMetadata`、MPU create/complete）
- `frontend/components/UploadedPanel.tsx`（该前端产物在 SSG 目的；见 §2 dist 构建；也涉及 pages/display）
- `DEFAULT_EXPIRATION`/`MAX_EXPIRATION` 的默认值与 `maxExpiration` 来源：在 `common.ts`/`index.ts`（为精确不引用猜测值）

关键提示（SPE§ 语义要点）：永久表示拒绝用 Number.MAX_SAFE_INTEGER/远未来哨兵，一律 `null`；KV 永久写不传 expiration；R2 permanent:`"1"`；读/判定统一 `isExpired(m)= m.willExpireAtUnix !== null && m.willExpireAtUnix < now`；响应永久为 null；`UploadedPanel` 遇 null 显示 “Never” 而非格式话日期；MPU create-stage 权威 retention 在 multipart customMetadata。若存在与规格冲突/拿不到 customMetadata 的 runtime 现实——按 §4.5 STOP 报 owner，不改规格。

---

## 7. Return / Handoff-back 契约（双向）

> 为了让**你（现承接的 agent）**在未来停机/里程碑也能给别人/给 owner 拿回，请在**每个可回传点（尤其 Stage A exit、或任何 STOP/blocked）**输出下面缩写块的精确填写版，写进一个新的 `docs/job-transfer/00X-….md` 或在 001 末尾更新版本；并在你给 owner 的最后一条消息中附上该块原文。

```
JOB-TRANSFER RETURN
===================
phase:              # Stage-A/: preflight|red|green|refactor|regression|source-commit|pr-open|gate|exit|blocked
active_todo_ref:    # e.g. Issue #4 Active Phase 2A TODO §1
durable_refs:       # Issue #3, #4 URLs (unchanged unless spec-drift)
environment:        # node --version / pnpm --version (must be 22.x/10.x) used
branch:             # patch/non-expiring-paste
local_head_sha:     # git rev-parse HEAD (full)
origin_head_sha:    # git rev-parse origin/<branch> AFTER push (full)   [未 push 填 N/A]
PR:                 # number + URL (N/A if none) ; PR current HEAD SHA (full)
pr_base_sha:        # 应解析到的 pinned 0835cac4… (full)
pr_state:           # OPEN / …  (must never MERGED)
worktree_clean:     # yes/no + `git status --short` real output if not clean
BLOCKER:            # (if STOP/blocked) exact next single step to unblock, or NONE
TDD/RED evidence:   # each: test-file::case / exact `pnpm exec vitest run …` / expected-reason / observed-failure(真实验出)
baseline evidence:  # list compat tests that passed GREEN pre-implementation (dedup from RED)
GREEN/REG evidence: # exact commands + exit codes/output tail
refactor scope:     # what was cleaned, tests still green
source_commits:     # commit range (from pinned..HEAD) + subject of each; final Stage A commit SHA
diff_files:         # `git diff --name-only <pinned>...HEAD` (full)
no_feishu_guard:    # real cmd + no-match result
CI:                 # per check: name, status, conclusion (e.g. Kody Code Review COMPLETED/SUCCESS)
ai_review:          # status of AI review for CURRENT PR HEAD; findings + their disposition; blocking? owner-override-needed? reviewed-HEAD-SHA
docs_updated:       # doc/api.md, doc/curl.md, etc. as applicable; whether any repo .md beyond task files changed
spec_drift:         # yes/no — if yes STOP described, never self-approve
stage_a_exit:       # satisfied/not + which canonical refs (§9.13/§14.1) hold
overall_phase_status:
    # stage-a-… | block | exit-ready | awaiting-phase2b (do NOT run Phase 2B)
ALL_CONSTRAINTS_MET: # checklist cross-ref Issue #4 acceptance & this §4
NEXT_ACTION:        # single concrete first action for the next agent/owner
```

---

## 8. 给 owner 最终汇报必须含（Stage A exit 后）

1. Issue #4 已 OWNER APPROVED 的事实与 durable ref；
2. Issue #3/#4 durable URLs；
3. preflight 实际结果；
4. branch 名 + exact base SHA（应 `0835cac4…`）；
5. RED / baseline / GREEN / REFACTOR / REGRESSION evidence（真实命令与输出）；
6. source commit 范围与最终 commit SHA；
7. Stage A REVIEW-ONLY PR URL；
8. PR（最新）head SHA；
9. AI Review Bot latest-HEAD 状态与「reviewed HEAD SHA」；
10. required CI 状态；
11. finding disposition 摘要（含是否 blocking/需 owner override）；
12. 明确确认“Stage A PR remains UNMERGED”；
13. no-Feishu guard 结果；
14. 最终状态：`STAGE A EXIT READY — WAITING FOR PHASE 2B TODO / OWNER APPROVAL`。

---

## 9. 交接元信息

- 编写人：承接过程上一任 AI agent（Reasonix）；编写日期：2026-09-02（仓库时间线）。
- 由谁写下一份：实现 agent 在每 milestone / owner 再续额度时分叉。建议使用独特 ID 以保留历史：`002-…-<milestone>`，并在 001 中被本档 §7 覆盖/追加的旧档不删、改加“已被 00X 取代”备注（可选，若 owner 希望最小化文件数则只在本档追加“更新历史”section，replace 语义需 owner 知悉）。
- 用法字符串（kickoff）：当你(owner)希望让下一 AI 接续，可直接贴：

```
请先通读工作区文档：`/docs/job-transfer/001-stage-a-non-expiring-paste.md`，
再按其中 Step-by-step 与 §7 return-skip 继续当前的 Stage A（非过期 Paste，Patch 010）
实现与 REVIEW-ONLY PR/AI Review Gate，并严守 src 交接契约——不要自行重建 PLAN/SPEC/PHASE 或改写
Issue #3 / #4 已批准语义；到达每个里程碑或需要 STOP 时，输出该文件 §7 的 JOB-TRANSFER RETURN 块来交还状态。
```

---

> 备注：仓库自身不存在 Root `/docs`；本交接用了 Root `docs/job-transfer/`（本地与上游 doc 并存），并以 `.git/info/exclude` 排除，不影响 patch 分支 clean。若要与 downstream 真正持久化，请由 owner 决定是否迁移到 tracked 的 `downstream/review/` 或独立分支，本档不主动偏离当前 untracked-local 约定。
