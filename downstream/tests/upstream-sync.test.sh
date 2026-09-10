#!/usr/bin/env bash
# M1: fast-forward-only upstream-sync state machine and safety guards.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/downstream/scripts/sync-upstream.sh"
CHECK_PATCHES="$ROOT/downstream/scripts/check-patches.sh"
WORKFLOW="$ROOT/.github/workflows/upstream-sync.yml"
OUTPUT="$(mktemp)"
FIXTURE="$(mktemp -d)"
trap 'rm -rf "$FIXTURE" "$OUTPUT"' EXIT

export GIT_AUTHOR_NAME='fixture'
export GIT_AUTHOR_EMAIL='fixture@example.invalid'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export GITHUB_REPOSITORY='Skyline-Gazer/pastebin-worker'

init_repo() {
  local dir="$1"
  git init -q -b main "$dir"
  git -C "$dir" config user.name fixture
  git -C "$dir" config user.email fixture@example.invalid
}

commit() {
  local dir="$1"
  local msg="$2"
  git -C "$dir" add -A
  git -C "$dir" commit -qm "$msg"
}

seed_downstream_files() {
  local dir="$1"
  local base_sha="$2"
  mkdir -p "$dir/downstream/patches/one" "$dir/downstream/addons/feishu" "$dir/downstream/scripts"
  cp "$CHECK_PATCHES" "$dir/downstream/scripts/check-patches.sh"
  printf '%s\n' 'one/one.patch' >"$dir/downstream/patches/series"
  printf '{"schemaVersion":1,"upstream":{"remote":"upstream","branch":"goshujin","commit":"%s"},"patchSeries":"downstream/patches/series","addon":{"path":"downstream/addons/feishu"}}\n' "$base_sha" >"$dir/downstream/release.json"
}

make_patch_from() {
  local src="$1"
  local dest="$2"
  git -C "$src" format-patch -1 --stdout >"$dest"
}

setup_linear_world() {
  rm -rf "$FIXTURE"
  FIXTURE="$(mktemp -d)"
  local official="$FIXTURE/official.git"
  local origin="$FIXTURE/origin.git"
  local work="$FIXTURE/work"
  git init -q --bare -b goshujin "$official"
  git init -q --bare -b main "$origin"

  init_repo "$FIXTURE/official-src"
  printf 'base\n' >"$FIXTURE/official-src/tracked.txt"
  commit "$FIXTURE/official-src" A
  local A B C
  A="$(git -C "$FIXTURE/official-src" rev-parse HEAD)"
  printf 'base-b\n' >"$FIXTURE/official-src/tracked.txt"
  commit "$FIXTURE/official-src" B
  B="$(git -C "$FIXTURE/official-src" rev-parse HEAD)"
  printf 'base-c\n' >"$FIXTURE/official-src/tracked.txt"
  commit "$FIXTURE/official-src" C
  C="$(git -C "$FIXTURE/official-src" rev-parse HEAD)"
  git -C "$FIXTURE/official-src" branch -M goshujin
  git -C "$FIXTURE/official-src" remote add origin "$official"
  git -C "$FIXTURE/official-src" push -q origin goshujin

  init_repo "$work"
  git -C "$work" fetch -q "$official" goshujin:refs/heads/goshujin
  git -C "$work" checkout -q -B patch "$A"
  printf 'patched-extra\n' >"$work/extra.txt"
  commit "$work" patch-one
  mkdir -p "$work/downstream/patches/one"
  make_patch_from "$work" "$FIXTURE/one.patch"
  git -C "$work" checkout -q -B main "$A"
  seed_downstream_files "$work" "$A"
  printf 'addon\n' >"$work/downstream/addons/feishu/README.md"
  cp "$FIXTURE/one.patch" "$work/downstream/patches/one/one.patch"
  commit "$work" downstream-export

  git -C "$origin" fetch -q "$work" main:refs/heads/downstream/main
  git -C "$origin" fetch -q "$official" "$A:refs/heads/upstream-sync"
  git -C "$origin" fetch -q "$official" goshujin:refs/heads/goshujin

  git -C "$work" remote add origin "$origin"
  git -C "$work" remote add official "$official"
  git -C "$work" remote set-url --push official no_push://disabled-by-policy
  git -C "$work" fetch -q origin downstream/main upstream-sync
  git -C "$work" fetch -q official goshujin

  printf '%s' "$A" >"$FIXTURE/sha-A"
  printf '%s' "$B" >"$FIXTURE/sha-B"
  printf '%s' "$C" >"$FIXTURE/sha-C"
}

run_sync() {
  local work="$1"
  cp "$SCRIPT" "$work/downstream/scripts/sync-upstream.sh"
  chmod +x "$work/downstream/scripts/sync-upstream.sh"
  local rc=0
  (
    cd "$work"
    env GITHUB_REPOSITORY="${GITHUB_REPOSITORY}" \
      RELEASE_ROOT="$work" \
      ORIGIN_REMOTE=origin \
      OFFICIAL_REMOTE=official \
      OFFICIAL_FETCH_URL="$(git -C "$work" remote get-url official)" \
      bash "$work/downstream/scripts/sync-upstream.sh"
  ) >"$OUTPUT" 2>&1 || rc=$?
  return "$rc"
}

expect_status() {
  local want="$1"
  grep -q "^UPSTREAM_SYNC_STATUS=${want}$" "$OUTPUT"
}

load_shas() {
  A="$(cat "$FIXTURE/sha-A")"
  B="$(cat "$FIXTURE/sha-B")"
  C="$(cat "$FIXTURE/sha-C")"
  WORK="$FIXTURE/work"
}

[[ -f "$SCRIPT" ]]
[[ -f "$WORKFLOW" ]]
! grep -E -- '--force|--force-with-lease' "$SCRIPT" "$WORKFLOW"
grep -Fq '17 3 * * *' "$WORKFLOW"
grep -q 'contents: write' "$WORKFLOW"
! grep -q 'pull-requests: write' "$WORKFLOW"
! grep -q 'issues: write' "$WORKFLOW"
! grep -q 'deployments: write' "$WORKFLOW"
grep -q 'workflow_dispatch' "$WORKFLOW"
grep -q 'cancel-in-progress: false' "$WORKFLOW"

setup_linear_world
load_shas
RELEASE_BEFORE="$(git -C "$WORK" show HEAD:downstream/release.json)"
MAIN_BEFORE="$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/downstream/main)"

# EQUAL -> NOOP
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/official.git" "+$C:refs/heads/upstream-sync"
git -C "$WORK" fetch -q origin upstream-sync
run_sync "$WORK"
expect_status NOOP
grep -q '^PATCH_COMPATIBILITY=PASS$' "$OUTPUT"
grep -q '^RELEASE_PIN_CHANGED=NO$' "$OUTPUT"
grep -q '^DOWNSTREAM_MAIN_CHANGED=NO$' "$OUTPUT"
grep -q '^PRODUCTION_CHANGED=NO$' "$OUTPUT"
grep -q '^OFFICIAL_UPSTREAM_WRITTEN=NO$' "$OUTPUT"
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/upstream-sync)" == "$C" ]]
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/downstream/main)" == "$MAIN_BEFORE" ]]
[[ "$(git -C "$WORK" show HEAD:downstream/release.json)" == "$RELEASE_BEFORE" ]]

# linear official ahead -> FAST_FORWARDED
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/official.git" "+$A:refs/heads/upstream-sync"
run_sync "$WORK"
expect_status FAST_FORWARDED
grep -q '^PATCH_COMPATIBILITY=PASS$' "$OUTPUT"
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/upstream-sync)" == "$C" ]]
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/downstream/main)" == "$MAIN_BEFORE" ]]
[[ "$(git -C "$WORK" show HEAD:downstream/release.json)" == "$RELEASE_BEFORE" ]]

# LOCAL_AHEAD -> blocked, no rewind
init_repo "$FIXTURE/sync-ahead"
git -C "$FIXTURE/sync-ahead" fetch -q "$FIXTURE/official.git" goshujin
git -C "$FIXTURE/sync-ahead" checkout -q -B main "$C"
printf 'local-only\n' >"$FIXTURE/sync-ahead/local-only.txt"
commit "$FIXTURE/sync-ahead" local-ahead
LOCAL_AHEAD="$(git -C "$FIXTURE/sync-ahead" rev-parse HEAD)"
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/sync-ahead" "+$LOCAL_AHEAD:refs/heads/upstream-sync"
if run_sync "$WORK"; then
  echo 'expected LOCAL_AHEAD_BLOCKED to fail' >&2
  cat "$OUTPUT" >&2
  exit 1
fi
expect_status LOCAL_AHEAD_BLOCKED
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/upstream-sync)" == "$LOCAL_AHEAD" ]]

# DIVERGED -> blocked
init_repo "$FIXTURE/diverged"
git -C "$FIXTURE/diverged" fetch -q "$FIXTURE/official.git" goshujin
git -C "$FIXTURE/diverged" checkout -q -B main "$A"
printf 'diverged\n' >"$FIXTURE/diverged/other.txt"
commit "$FIXTURE/diverged" diverged
DIV="$(git -C "$FIXTURE/diverged" rev-parse HEAD)"
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/diverged" "+$DIV:refs/heads/upstream-sync"
if run_sync "$WORK"; then
  echo 'expected DIVERGED_BLOCKED to fail' >&2
  cat "$OUTPUT" >&2
  exit 1
fi
expect_status DIVERGED_BLOCKED
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/upstream-sync)" == "$DIV" ]]

# wrong repository identity
if GITHUB_REPOSITORY='SharzyL/pastebin-worker' run_sync "$WORK"; then
  echo 'expected identity guard to fail' >&2
  cat "$OUTPUT" >&2
  exit 1
fi
grep -q 'Skyline-Gazer/pastebin-worker' "$OUTPUT"

# patch replay FAIL does not rewind a completed fast-forward and does not change release pin
setup_linear_world
load_shas
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/official.git" "+$A:refs/heads/upstream-sync"
git -C "$WORK" checkout -q -B conflict-patch "$A"
printf 'patched-conflict\n' >"$WORK/tracked.txt"
commit "$WORK" conflict-patch
make_patch_from "$WORK" "$FIXTURE/conflict.patch"
git -C "$WORK" checkout -q main
cp "$FIXTURE/conflict.patch" "$WORK/downstream/patches/one/one.patch"
git -C "$WORK" add downstream/patches/one/one.patch
git -C "$WORK" commit -qm 'conflicting patch'
RELEASE_BEFORE="$(cat "$WORK/downstream/release.json")"
if run_sync "$WORK"; then
  echo 'expected patch FAIL after fast-forward' >&2
  cat "$OUTPUT" >&2
  exit 1
fi
grep -q '^UPSTREAM_SYNC_STATUS=FAST_FORWARDED$' "$OUTPUT"
grep -q '^PATCH_COMPATIBILITY=FAIL$' "$OUTPUT"
grep -q 'UPSTREAM_ADVANCED_PATCH_REBASE_REQUIRED' "$OUTPUT"
[[ "$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/upstream-sync)" == "$C" ]]
[[ "$(cat "$WORK/downstream/release.json")" == "$RELEASE_BEFORE" ]]
grep -q '^RELEASE_PIN_CHANGED=NO$' "$OUTPUT"

# concurrent remote movement before sync: origin already sibling of official -> DIVERGED, no force to C
setup_linear_world
load_shas
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/official.git" "+$A:refs/heads/upstream-sync"
init_repo "$FIXTURE/sibling"
git -C "$FIXTURE/sibling" fetch -q "$FIXTURE/official.git" goshujin
git -C "$FIXTURE/sibling" checkout -q -B main "$A"
printf 'sibling\n' >"$FIXTURE/sibling/sib.txt"
commit "$FIXTURE/sibling" sibling
SIB="$(git -C "$FIXTURE/sibling" rev-parse HEAD)"
git -C "$FIXTURE/origin.git" fetch -q "$FIXTURE/sibling" "+$SIB:refs/heads/upstream-sync"
if run_sync "$WORK"; then
  echo 'expected concurrent/diverged movement to fail closed' >&2
  cat "$OUTPUT" >&2
  exit 1
fi
expect_status DIVERGED_BLOCKED
SYNC_NOW="$(git -C "$FIXTURE/origin.git" rev-parse refs/heads/upstream-sync)"
[[ "$SYNC_NOW" == "$SIB" ]]
[[ "$SYNC_NOW" != "$C" ]]

[[ "$(git -C "$WORK" remote get-url --push official)" == no_push://disabled-by-policy ]]

echo 'upstream-sync fixtures passed'
