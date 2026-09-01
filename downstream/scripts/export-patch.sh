#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  downstream/scripts/export-patch.sh <upstream-base> <patch-branch> <patch-id> [--start <ref>] [--replace]

Independent patch example (run from downstream/main checkout/worktree):
  downstream/scripts/export-patch.sh \
    abcdef1234567890abcdef1234567890abcdef12 \
    patch/non-expiring-paste \
    010-non-expiring-paste

Dependent patch example:
  downstream/scripts/export-patch.sh \
    <UPSTREAM_SHA> \
    patch/dependent-capability \
    020-dependent-capability \
    --start <PREREQUISITE_STACK_TIP>

The patch branch is a development workspace. This command exports reviewed
commits into downstream/patches/<patch-id>/ using git format-patch.

--start controls the first commit excluded from export. It defaults to the
upstream base. Use it only when a true prerequisite patch stack exists.
USAGE
}

[[ $# -ge 3 ]] || { usage >&2; exit 2; }

BASE="$1"
PATCH_BRANCH="$2"
PATCH_ID="$3"
shift 3
START="$BASE"
REPLACE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start)
      [[ $# -ge 2 ]] || { echo "--start requires a ref" >&2; exit 2; }
      START="$2"
      shift 2
      ;;
    --replace)
      REPLACE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

TARGET="$ROOT/downstream/patches/$PATCH_ID"

[[ "$PATCH_BRANCH" == patch/* ]] || {
  echo "Refusing export: patch branch must be named patch/<id>." >&2
  exit 1
}

[[ "$PATCH_ID" =~ ^[0-9]{3}-[a-z0-9][a-z0-9-]*$ ]] || {
  echo "Refusing export: patch id should look like 010-non-expiring-paste." >&2
  exit 1
}

for ref in "$BASE" "$START" "$PATCH_BRANCH"; do
  git -C "$ROOT" cat-file -e "$ref^{commit}" 2>/dev/null || {
    echo "Unknown commit/ref: $ref" >&2
    exit 1
  }
done

git -C "$ROOT" merge-base --is-ancestor "$BASE" "$START" || {
  echo "Export start ref does not descend from upstream base: $START" >&2
  exit 1
}

git -C "$ROOT" merge-base --is-ancestor "$START" "$PATCH_BRANCH" || {
  echo "Patch branch does not descend from export start ref: $START" >&2
  exit 1
}

mkdir -p "$TARGET"
shopt -s nullglob
existing=("$TARGET"/*.patch)
if (( ${#existing[@]} > 0 )); then
  if (( REPLACE == 0 )); then
    echo "Patch files already exist in ${TARGET#"$ROOT/"}." >&2
    echo "Review them first; rerun with --replace only when intentionally replacing the exported series." >&2
    exit 1
  fi
  rm -f -- "${existing[@]}"
fi

COUNT=$(git -C "$ROOT" rev-list --count "$START..$PATCH_BRANCH")
(( COUNT > 0 )) || {
  echo "No commits to export from $PATCH_BRANCH relative to $START." >&2
  exit 1
}

echo "Exporting $COUNT reviewed commit(s):"
echo "  upstream base: $BASE"
echo "  export start:  $START"
echo "  branch:        $PATCH_BRANCH"
echo "  target:        ${TARGET#"$ROOT/"}"

git -C "$ROOT" format-patch \
  --full-index \
  --binary \
  --base="$BASE" \
  --output-directory "$TARGET" \
  "$START..$PATCH_BRANCH"

echo
echo "Export complete. Review the generated files, update downstream/patches/series explicitly,"
echo "then run downstream/scripts/check-patches.sh against the pinned upstream base."
