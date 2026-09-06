#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/downstream/scripts/release-candidate.sh"
FIXTURE="$(mktemp -d)"
OUTPUT="$(mktemp)"
SENTINEL="PHASE10_SAFE_SENTINEL_NOT_A_SECRET"
trap 'rm -rf "$FIXTURE" "$OUTPUT"' EXIT

git init -q "$FIXTURE"
git -C "$FIXTURE" config user.name fixture
git -C "$FIXTURE" config user.email fixture@example.invalid
mkdir -p "$FIXTURE/downstream/patches" "$FIXTURE/downstream/addons/feishu" "$FIXTURE/downstream/scripts"
cp "$SCRIPT" "$FIXTURE/downstream/scripts/release-candidate.sh"
printf 'base\n' > "$FIXTURE/file"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm base
BASE="$(git -C "$FIXTURE" rev-parse HEAD)"
printf '\n' > "$FIXTURE/downstream/patches/series"
printf '{"schemaVersion":1,"upstream":{"commit":"%s"},"patchSeries":"downstream/patches/series","addon":{"path":"downstream/addons/feishu"}}\n' "$BASE" > "$FIXTURE/downstream/release.json"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm fixture

RELEASE_ROOT="$FIXTURE" PASTEBIN_CHECK_COMMAND="printf '$SENTINEL\\n'" ADDON_CHECK_COMMAND=true \
  "$FIXTURE/downstream/scripts/release-candidate.sh" >"$OUTPUT" 2>&1
! grep -Fq "$SENTINEL" "$OUTPUT"
grep -q '^TARGET_PASTEBIN=passed$' "$OUTPUT"
grep -q '^TARGET_ADDON=passed$' "$OUTPUT"
grep -q '^CANDIDATE_STATUS=passed$' "$OUTPUT"
echo 'phase10 secret observable fixtures passed'
