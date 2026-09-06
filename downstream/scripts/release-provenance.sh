#!/usr/bin/env bash
set -euo pipefail

ROOT="${RELEASE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
OUTPUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output) OUTPUT="${2:-}"; shift 2 ;;
    *) echo 'PROVENANCE_STATUS=failed' >&2; echo 'Unsupported provenance option.' >&2; exit 2 ;;
  esac
done
[[ -n "$OUTPUT" ]] || { echo 'PROVENANCE_STATUS=failed' >&2; echo 'An explicit --output path is required.' >&2; exit 2; }
case "$OUTPUT" in /*) ;; *) OUTPUT="$ROOT/$OUTPUT" ;; esac

TMPROOT="$(mktemp -d "${RELEASE_TMPDIR:-/tmp/release-provenance.XXXXXX}")"
trap 'rm -rf "$TMPROOT"' EXIT
CANDIDATE_OUTPUT="$TMPROOT/candidate.out"
if ! "$ROOT/downstream/scripts/release-candidate.sh" >"$CANDIDATE_OUTPUT" 2>&1; then
  echo 'PROVENANCE_STATUS=failed' >&2
  echo 'Validated candidate is required before provenance retention.' >&2
  exit 1
fi
grep -qx 'CANDIDATE_STATUS=passed' "$CANDIDATE_OUTPUT" || { echo 'PROVENANCE_STATUS=failed' >&2; exit 1; }
grep -qx 'TARGET_PASTEBIN=passed' "$CANDIDATE_OUTPUT" || { echo 'PROVENANCE_STATUS=failed' >&2; exit 1; }
grep -qx 'TARGET_ADDON=passed' "$CANDIDATE_OUTPUT" || { echo 'PROVENANCE_STATUS=failed' >&2; exit 1; }

GENERATED_AT="${PROVENANCE_GENERATED_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
TMP_OUTPUT="$TMPROOT/release-provenance.json"
python3 - "$ROOT" "$CANDIDATE_OUTPUT" "$TMP_OUTPUT" "$GENERATED_AT" <<'PY'
import hashlib, json, os, re, sys
root, candidate_path, output, generated_at = sys.argv[1:]
if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", generated_at):
    raise SystemExit("Invalid provenance timestamp.")
candidate = open(candidate_path, encoding="utf-8").read().splitlines()
values = dict(line.split("=", 1) for line in candidate if "=" in line)
manifest = json.load(open(os.path.join(root, "downstream/release.json"), encoding="utf-8"))
series = manifest["patchSeries"]
entries = []
for line in open(os.path.join(root, series), encoding="utf-8"):
    line = line.split("#", 1)[0].strip()
    if not line: continue
    path = os.path.join(root, "downstream", "patches", line)
    entries.append({"path": f"downstream/patches/{line}", "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest()})
data = {
    "schemaVersion": 1,
    "generatedAt": generated_at,
    "upstreamCommit": manifest["upstream"]["commit"],
    "downstreamCommit": os.popen(f"git -C {json.dumps(root)} rev-parse HEAD").read().strip(),
    "downstreamTag": None,
    "tagState": "not-created",
    "patchSeries": series,
    "patches": entries,
    "assembledHead": values["ASSEMBLED_HEAD"],
    "assembledTree": values["ASSEMBLED_TREE"],
    "targets": {
        "patchedPastebin": {"status": "passed", "checks": [{"name": "candidate", "status": "passed"}], "artifactId": None, "deploymentId": None},
        "feishuAddon": {"status": "passed", "checks": [{"name": "candidate", "status": "passed"}], "artifactId": None, "deploymentId": None},
    },
}
with open(output, "w", encoding="utf-8") as target:
    json.dump(data, target, sort_keys=True, indent=2)
    target.write("\n")
PY
mkdir -p "$(dirname "$OUTPUT")"
mv "$TMP_OUTPUT" "$OUTPUT" || { echo 'PROVENANCE_STATUS=failed' >&2; exit 1; }
if ! bash -c "${PROVENANCE_RETAIN_COMMAND-:}" -- "$OUTPUT" >"$TMPROOT/retention.out" 2>&1; then
  rm -f "$OUTPUT"
  echo 'PROVENANCE_STATUS=failed' >&2
  echo 'Provenance retention failed; candidate is not releasable.' >&2
  exit 1
fi
echo 'PROVENANCE_STATUS=retained'
echo "PROVENANCE_PATH=$OUTPUT"
