#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROVENANCE="$ROOT/downstream/scripts/release-provenance.sh"
ELIGIBILITY="$ROOT/downstream/scripts/release-tag-eligibility.sh"
FIXTURE="$(mktemp -d)"
OUTPUT="$(mktemp)"
PROVENANCE_FILE="$(mktemp)"
SENTINEL="PHASE10_SAFE_SENTINEL_NOT_A_SECRET"
trap 'rm -rf "$FIXTURE" "$OUTPUT" "$PROVENANCE_FILE"' EXIT

git init -q "$FIXTURE"
git -C "$FIXTURE" config user.name fixture
git -C "$FIXTURE" config user.email fixture@example.invalid
mkdir -p "$FIXTURE/downstream/patches/one" "$FIXTURE/downstream/addons/feishu" "$FIXTURE/downstream/scripts"
cp "$ROOT/downstream/scripts/release-candidate.sh" "$FIXTURE/downstream/scripts/release-candidate.sh"
printf 'base\n' > "$FIXTURE/file"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm base
BASE="$(git -C "$FIXTURE" rev-parse HEAD)"
git -C "$FIXTURE" checkout -qb patch
printf 'patched\n' > "$FIXTURE/file"
git -C "$FIXTURE" commit -am patch -q
git -C "$FIXTURE" format-patch -1 --stdout > "$FIXTURE/downstream/patches/one/one.patch"
git -C "$FIXTURE" checkout -q master
printf '%s\n' 'one/one.patch' > "$FIXTURE/downstream/patches/series"
printf '{"schemaVersion":1,"upstream":{"commit":"%s"},"patchSeries":"downstream/patches/series","addon":{"path":"downstream/addons/feishu"}}\n' "$BASE" > "$FIXTURE/downstream/release.json"
git -C "$FIXTURE" add .
git -C "$FIXTURE" commit -qm fixture
DOWNSTREAM="$(git -C "$FIXTURE" rev-parse HEAD)"

run_provenance() {
  RELEASE_ROOT="$FIXTURE" PROVENANCE_GENERATED_AT="2026-09-06T00:00:00Z" \
    PASTEBIN_CHECK_COMMAND="printf '$SENTINEL\\n'" ADDON_CHECK_COMMAND=true \
    "$PROVENANCE" --output "$PROVENANCE_FILE" 2>&1
}

run_provenance >"$OUTPUT"
! grep -Fq "$SENTINEL" "$OUTPUT"
! grep -Fq "$SENTINEL" "$PROVENANCE_FILE"
python3 - "$PROVENANCE_FILE" "$BASE" "$DOWNSTREAM" "$FIXTURE" <<'PY'
import hashlib, json, sys
path, upstream, downstream, root = sys.argv[1:]
data = json.load(open(path, encoding='utf-8'))
assert data['schemaVersion'] == 1
assert data['generatedAt'] == '2026-09-06T00:00:00Z'
assert data['upstreamCommit'] == upstream
assert data['downstreamCommit'] == downstream
assert data['downstreamTag'] is None and data['tagState'] == 'not-created'
assert data['patches'] == [{'path': 'downstream/patches/one/one.patch', 'sha256': hashlib.sha256(open(root + '/downstream/patches/one/one.patch', 'rb').read()).hexdigest()}]
assert len(data['assembledHead']) == 40 and len(data['assembledTree']) == 40
for target in ('patchedPastebin', 'feishuAddon'):
    assert data['targets'][target]['status'] == 'passed'
    assert data['targets'][target]['artifactId'] is None
    assert data['targets'][target]['deploymentId'] is None
PY

if RELEASE_ROOT="$FIXTURE" PROVENANCE_GENERATED_AT="2026-09-06T00:00:00Z" PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND=true PROVENANCE_RETAIN_COMMAND=false "$PROVENANCE" --output "$PROVENANCE_FILE" >"$OUTPUT" 2>&1; then exit 1; fi
grep -q 'PROVENANCE_STATUS=failed' "$OUTPUT"
run_provenance >"$OUTPUT"

TAG="downstream-v2026.09.06.1"
run_eligibility() { PASTEBIN_CHECK_COMMAND=true ADDON_CHECK_COMMAND=true "$ELIGIBILITY" --tag "$TAG" --provenance "$PROVENANCE_FILE" --root "$FIXTURE"; }
run_eligibility >"$OUTPUT"
grep -q '^TAG_ELIGIBILITY=eligible$' "$OUTPUT"
for invalid in downstream-v2026.9.6.1 downstream-v2026.09.06.0x other-v2026.09.06.1; do
  if TAG="$invalid" run_eligibility >"$OUTPUT" 2>&1; then exit 1; fi
done
if RELEASE_TAG_EXISTS=1 run_eligibility >"$OUTPUT" 2>&1; then exit 1; fi
python3 - "$PROVENANCE_FILE" <<'PY'
import json, sys
path = sys.argv[1]; data = json.load(open(path)); data['downstreamCommit'] = '0' * 40
open(path, 'w').write(json.dumps(data))
PY
if run_eligibility >"$OUTPUT" 2>&1; then exit 1; fi
run_provenance >"$OUTPUT"
python3 - "$PROVENANCE_FILE" <<'PY'
import json, sys
path = sys.argv[1]; data = json.load(open(path)); data['patches'][0]['sha256'] = '0' * 64
open(path, 'w').write(json.dumps(data))
PY
if run_eligibility >"$OUTPUT" 2>&1; then exit 1; fi
run_provenance >"$OUTPUT"
printf 'dirty\n' > "$FIXTURE/dirty"
if run_eligibility >"$OUTPUT" 2>&1; then exit 1; fi
rm "$FIXTURE/dirty"
python3 - "$PROVENANCE_FILE" <<'PY'
import json, sys
path = sys.argv[1]; data = json.load(open(path)); data['targets']['feishuAddon']['status'] = 'failed'
open(path, 'w').write(json.dumps(data))
PY
if run_eligibility >"$OUTPUT" 2>&1; then exit 1; fi

for workflow in "$ROOT/.github/workflows/pr.yml" "$ROOT/.github/workflows/feishu-phase3.yml"; do
  ! rg -n '(^|[[:space:]])git[[:space:]]+(tag|push)|wrangler[[:space:]]+deploy' "$workflow"
  rg -q 'pull_request:' "$workflow"
done
echo 'phase10 provenance and tag fixtures passed'
