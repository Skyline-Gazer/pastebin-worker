#!/usr/bin/env bash
# Issue #86: tip Worker cannot parse e=never/e=max until patch assembly;
# deploy.yml remains goshujin-only until a separate owner-authorized change.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY="$ROOT/.github/workflows/deploy.yml"
DOCS="$ROOT/docs/BUILD_DEPLOY.md"

python3 - "$DEPLOY" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
if "branches:" not in text or "- goshujin" not in text:
    raise SystemExit("deploy.yml must still trigger on goshujin")
if "downstream/main" in text:
    raise SystemExit("deploy.yml must not retarget to downstream/main without owner auth")
PY

python3 - "$DOCS" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
required = (
    "Tip Worker vs assembled release",
    "e=never",
    "e=max",
    "deploy.yml",
    "goshujin",
    "downstream/main",
    "Do not retarget deploy.yml to downstream/main",
)
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit("BUILD_DEPLOY.md missing ops note phrases: " + ", ".join(missing))
PY

echo "issue86-tip-vs-assembled: PASS"
