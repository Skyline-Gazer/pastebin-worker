#!/usr/bin/env bash
set -euo pipefail

ROOT="${RELEASE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
RELEASE_FILE="$ROOT/downstream/release.json"
cleanup() {
  if [[ -n "${WORKTREE:-}" && -e "${WORKTREE:-}/.git" ]]; then
    git -C "$WORKTREE" am --abort >/dev/null 2>&1 || true
    git -C "$ROOT" worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  fi
  [[ -n "${TMPROOT:-}" ]] && rm -rf "$TMPROOT"
}
trap cleanup EXIT
fail() { echo "CANDIDATE_STATUS=failed" >&2; echo "TAG_ELIGIBLE=no" >&2; echo "DEPLOY_CLAIM=no" >&2; echo "$*" >&2; exit 1; }

[[ -f "$RELEASE_FILE" ]] || fail "Missing downstream/release.json."
git -C "$ROOT" diff --quiet && git -C "$ROOT" diff --cached --quiet || fail "Refusing candidate from a dirty checkout."
[[ -z "$(git -C "$ROOT" status --porcelain --untracked-files=normal)" ]] || fail "Refusing candidate with untracked files."
mapfile -t manifest < <(python3 - "$RELEASE_FILE" <<'PY'
import json, re, sys
try:
    with open(sys.argv[1], encoding='utf-8') as source: data = json.load(source)
    commit = data['upstream']['commit']; series = data['patchSeries']; addon = data['addon']['path']
    if data.get('schemaVersion') != 1 or not isinstance(commit, str) or not re.fullmatch(r'[0-9a-f]{40}', commit): raise ValueError('schemaVersion must be 1 and upstream.commit must be a 40-character lowercase SHA')
    for value in (series, addon):
        if not isinstance(value, str) or not value or value.startswith('/') or '..' in value.split('/'): raise ValueError('manifest paths must be safe repository-relative paths')
except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
    print(f'Invalid release manifest: {error}', file=sys.stderr); sys.exit(1)
print(commit); print(series); print(addon)
PY
) || fail "Release manifest validation failed."
BASE="${manifest[0]}"; SERIES_REL="${manifest[1]}"; ADDON_REL="${manifest[2]}"; SERIES_FILE="$ROOT/$SERIES_REL"
git -C "$ROOT" cat-file -e "$BASE^{commit}" 2>/dev/null || fail "Pinned upstream commit is not present locally: $BASE"
[[ -f "$SERIES_FILE" ]] || fail "Missing patch series file: $SERIES_REL"
[[ -d "$ROOT/$ADDON_REL" ]] || fail "Missing Add-on path: $ADDON_REL"
mapfile -t PATCHES < <(sed -e 's/[[:space:]]*#.*$//' -e '/^[[:space:]]*$/d' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$SERIES_FILE")
declare -A seen=()
for rel in "${PATCHES[@]}"; do
  [[ "$rel" != /* && "$rel" != *".."* && "$rel" != *'\\'* ]] || fail "Unsafe patch path in series: $rel"
  [[ -z "${seen[$rel]+x}" ]] || fail "Duplicate patch path in series: $rel"
  seen["$rel"]=1
  [[ -f "$ROOT/downstream/patches/$rel" ]] || fail "Series entry does not exist: downstream/patches/$rel"
done
TMPROOT=$(mktemp -d "${RELEASE_TMPDIR:-$ROOT/.release-candidate.XXXXXX}"); WORKTREE="$TMPROOT/patched-upstream"
git -C "$ROOT" worktree add --detach "$WORKTREE" "$BASE" >/dev/null || fail "Could not create detached upstream worktree."
for rel in "${PATCHES[@]}"; do
  echo "REPLAY_PATCH=downstream/patches/$rel"
  git -C "$WORKTREE" am --committer-date-is-author-date "$ROOT/downstream/patches/$rel" || fail "Patch replay failed at: downstream/patches/$rel. Do not repair this generated worktree."
done
run_target() {
  local name="$1" cwd="$2" command="$3" output
  if [[ -z "$command" ]]; then echo "TARGET_${name}=blocked" >&2; fail "$name checks are not configured."; fi
  output="$(mktemp "$TMPROOT/${name,,}.XXXXXX")"
  if (cd "$cwd" && bash -c "$command") >"$output" 2>&1; then
    rm -f "$output"
    echo "TARGET_${name}=passed"
  else
    rm -f "$output"
    echo "TARGET_${name}=failed" >&2
    fail "$name checks failed."
  fi
}
PASTEBIN_CHECK_COMMAND="${PASTEBIN_CHECK_COMMAND-$ROOT/node_modules/.bin/prettier -c . && $ROOT/node_modules/.bin/eslint . && $ROOT/node_modules/.bin/tsc --noEmit && $ROOT/node_modules/.bin/vitest run && $ROOT/node_modules/.bin/wrangler deploy --dry-run --outdir=dist}"
ADDON_CHECK_COMMAND="${ADDON_CHECK_COMMAND-$ROOT/node_modules/.bin/prettier -c . && $ROOT/node_modules/.bin/eslint . && $ROOT/node_modules/.bin/tsc --noEmit -p tsconfig.json && $ROOT/node_modules/.bin/vitest run --config vitest.config.js && $ROOT/node_modules/.bin/vite build --config vite.config.js}"
run_target "PASTEBIN" "$WORKTREE" "$PASTEBIN_CHECK_COMMAND"
run_target "ADDON" "$ROOT/$ADDON_REL" "$ADDON_CHECK_COMMAND"
echo "CANDIDATE_STATUS=passed"; echo "TAG_ELIGIBLE=yes"; echo "DEPLOY_CLAIM=no"
echo "ASSEMBLED_HEAD=$(git -C "$WORKTREE" rev-parse HEAD)"; echo "ASSEMBLED_TREE=$(git -C "$WORKTREE" rev-parse HEAD^{tree})"
