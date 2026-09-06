#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/downstream/scripts/release-rollback-rehearsal.sh"
FIXTURE="$(mktemp -d)"
OUTPUT="$(mktemp)"
PROVENANCE="$(mktemp)"
cleanup() {
  status=$?
  rm -rf "$FIXTURE" "$OUTPUT" "$PROVENANCE"
  exit "$status"
}
trap cleanup EXIT

git init -q "$FIXTURE"
git -C "$FIXTURE" config user.name fixture
git -C "$FIXTURE" config user.email fixture@example.invalid
mkdir -p "$FIXTURE/downstream/patches/one" "$FIXTURE/downstream/addons/feishu" "$FIXTURE/downstream/scripts"
touch "$FIXTURE/downstream/addons/feishu/.keep"
cp "$ROOT/downstream/scripts/release-candidate.sh" "$FIXTURE/downstream/scripts/release-candidate.sh"
cp "$ROOT/downstream/scripts/release-provenance.sh" "$FIXTURE/downstream/scripts/release-provenance.sh"
cp "$SCRIPT" "$FIXTURE/downstream/scripts/release-rollback-rehearsal.sh"
printf 'base\n' > "$FIXTURE/file"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm base
BASE="$(git -C "$FIXTURE" rev-parse HEAD)"
git -C "$FIXTURE" checkout -qb fixture-patch
printf 'patched\n' > "$FIXTURE/file"
git -C "$FIXTURE" commit -am patch -q
git -C "$FIXTURE" format-patch -1 --stdout > "$FIXTURE/downstream/patches/one/one.patch"
git -C "$FIXTURE" checkout -q master
printf '%s\n' 'one/one.patch' > "$FIXTURE/downstream/patches/series"
printf '{"schemaVersion":1,"upstream":{"commit":"%s"},"patchSeries":"downstream/patches/series","addon":{"path":"downstream/addons/feishu"}}\n' "$BASE" > "$FIXTURE/downstream/release.json"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm fixture-release
SELECTED_SHA="$(git -C "$FIXTURE" rev-parse HEAD)"
RELEASE_ROOT="$FIXTURE" PROVENANCE_GENERATED_AT=2026-09-06T00:00:00Z PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND=true \
  "$FIXTURE/downstream/scripts/release-provenance.sh" --output "$PROVENANCE" >"$OUTPUT" 2>&1
git -C "$FIXTURE" tag -a fixture-nonprod-rollback-prior -m fixture-nonprod-rollback-prior

run() {
  PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND=true "$SCRIPT" --root "$FIXTURE" \
    --tag fixture-nonprod-rollback-prior --provenance "$PROVENANCE" 2>&1
}

if ! run >"$OUTPUT"; then cat "$OUTPUT"; exit 1; fi
grep -qx 'ROLLBACK_REHEARSAL_STATUS=passed' "$OUTPUT"
grep -qx 'ROLLBACK_MODE=fixture' "$OUTPUT"
grep -qx 'FIRST_RELEASE_EXCEPTION=yes' "$OUTPUT"
grep -qx 'TARGET_PASTEBIN=passed' "$OUTPUT"
grep -qx 'TARGET_ADDON=passed' "$OUTPUT"
grep -qx 'PROVENANCE_MATCH=passed' "$OUTPUT"
grep -qx 'DEPLOY_CLAIM=no' "$OUTPUT"
grep -qx "SELECTED_TAG_SHA=$SELECTED_SHA" "$OUTPUT"
! git -C "$FIXTURE" tag -l 'downstream-v*' | grep -q .
! [[ fixture-nonprod-rollback-prior =~ ^downstream-v[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[1-9][0-9]*$ ]]
! git -C "$ROOT" tag -l 'downstream-v*' | grep -q .

if PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND=true "$SCRIPT" --root "$FIXTURE" --tag master >"$OUTPUT" 2>&1; then exit 1; fi
grep -qx 'ROLLBACK_REHEARSAL_STATUS=failed' "$OUTPUT"
grep -qx 'DEPLOY_CLAIM=no' "$OUTPUT"

if PASTEBIN_CHECK_COMMAND=false ADDON_CHECK_COMMAND=true "$SCRIPT" --root "$FIXTURE" --tag fixture-nonprod-rollback-prior --provenance "$PROVENANCE" >"$OUTPUT" 2>&1; then exit 1; fi
grep -qx 'ROLLBACK_REHEARSAL_STATUS=failed' "$OUTPUT"
grep -qx 'DEPLOY_CLAIM=no' "$OUTPUT"
! grep -qx 'ROLLBACK_REHEARSAL_STATUS=passed' "$OUTPUT"

echo 'phase10 rollback rehearsal fixtures passed'
