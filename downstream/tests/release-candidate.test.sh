#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; SCRIPT="$ROOT/downstream/scripts/release-candidate.sh"; FIXTURE="$(mktemp -d)"; OUTPUT="$(mktemp)"
trap 'rm -rf "$FIXTURE" "$OUTPUT"' EXIT
git init -q "$FIXTURE"; git -C "$FIXTURE" config user.name fixture; git -C "$FIXTURE" config user.email fixture@example.invalid
mkdir -p "$FIXTURE/downstream/patches/one" "$FIXTURE/downstream/addons/feishu" "$FIXTURE/downstream/scripts"
cp "$SCRIPT" "$FIXTURE/downstream/scripts/release-candidate.sh"
printf 'base\n' > "$FIXTURE/file"; git -C "$FIXTURE" add .; git -C "$FIXTURE" commit -qm base; BASE="$(git -C "$FIXTURE" rev-parse HEAD)"
git -C "$FIXTURE" checkout -qb patch; printf 'patched\n' > "$FIXTURE/file"; git -C "$FIXTURE" commit -am patch-one -q; git -C "$FIXTURE" format-patch -1 --stdout > "$FIXTURE/downstream/patches/one/one.patch"
printf 'patched twice\n' > "$FIXTURE/file"; git -C "$FIXTURE" commit -am patch-two -q; git -C "$FIXTURE" format-patch -1 --stdout > "$FIXTURE/downstream/patches/one/two.patch"; git -C "$FIXTURE" checkout -q master
printf 'unlisted\n' > "$FIXTURE/downstream/patches/one/unlisted.patch"; printf '%s\n' '# comment' '' 'one/one.patch' 'one/two.patch' > "$FIXTURE/downstream/patches/series"
printf '{"schemaVersion":1,"upstream":{"commit":"%s"},"patchSeries":"downstream/patches/series","addon":{"path":"downstream/addons/feishu"}}\n' "$BASE" > "$FIXTURE/downstream/release.json"
git -C "$FIXTURE" add .; git -C "$FIXTURE" commit -qm fixture
run() { RELEASE_ROOT="$FIXTURE" PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND=true "$FIXTURE/downstream/scripts/release-candidate.sh" 2>&1; }
pass() { run >"$OUTPUT"; cat "$OUTPUT"; grep -q 'CANDIDATE_STATUS=passed' "$OUTPUT"; }
fail() { if run >"$OUTPUT"; then return 1; fi; grep -q 'CANDIDATE_STATUS=failed' "$OUTPUT"; }
pass
[[ "$(grep -n '^REPLAY_PATCH=' "$OUTPUT" | sed -n '1p')" == *'one/one.patch' ]]
[[ "$(grep -n '^REPLAY_PATCH=' "$OUTPUT" | sed -n '2p')" == *'one/two.patch' ]]
printf 'dirty\n' > "$FIXTURE/dirty"; fail; rm "$FIXTURE/dirty"
sed -i 's/"[0-9a-f]\{40\}"/"not-a-commit"/' "$FIXTURE/downstream/release.json"; fail; git -C "$FIXTURE" checkout -q -- downstream/release.json
printf '%s\n' 'one/one.patch' 'one/one.patch' > "$FIXTURE/downstream/patches/series"; fail
printf '%s\n' '../unsafe.patch' > "$FIXTURE/downstream/patches/series"; fail
printf '%s\n' 'one/missing.patch' > "$FIXTURE/downstream/patches/series"; fail
git -C "$FIXTURE" checkout -q -- downstream/patches/series
printf 'not a patch\n' > "$FIXTURE/downstream/patches/one/two.patch"; git -C "$FIXTURE" add downstream/patches/one/two.patch; git -C "$FIXTURE" commit -qm corrupt-patch
fail; [[ "$(git -C "$FIXTURE" worktree list | wc -l)" -eq 1 ]]; git -C "$FIXTURE" checkout -q HEAD^ -- downstream/patches/one/two.patch; git -C "$FIXTURE" add downstream/patches/one/two.patch; git -C "$FIXTURE" commit -qm restore-patch
if RELEASE_ROOT="$FIXTURE" PASTEBIN_CHECK_COMMAND=false ADDON_CHECK_COMMAND=true "$FIXTURE/downstream/scripts/release-candidate.sh" >"$OUTPUT" 2>&1; then exit 1; fi
grep -q 'TARGET_PASTEBIN=failed' "$OUTPUT"; grep -q 'TAG_ELIGIBLE=no' "$OUTPUT"; grep -q 'DEPLOY_CLAIM=no' "$OUTPUT"
if RELEASE_ROOT="$FIXTURE" PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND='' "$FIXTURE/downstream/scripts/release-candidate.sh" >"$OUTPUT" 2>&1; then exit 1; fi
grep -q 'TARGET_ADDON=blocked' "$OUTPUT"
! rg -n -- '--3way' "$ROOT/downstream/scripts"
echo 'release candidate fixtures passed'
