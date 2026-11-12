#!/usr/bin/env bash
# Update only a WORKBENCH-owned pre-commit hook; preserve foreign hooks.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run from a WORKBENCH Git checkout." >&2; exit 2
fi
hook="$(git rev-parse --git-path hooks/pre-commit)"
mkdir -p "$(dirname "$hook")"
if [[ -e "$hook" ]] && ! grep -Fq 'WORKBENCH: block private-data file types' "$hook" && ! grep -Fq 'WORKBENCH: allow only reviewed source types' "$hook"; then
  echo "Existing pre-commit hook is not owned by WORKBENCH. Left it untouched: $hook" >&2
  echo "Add 'bash scripts/check-git-sensitive-files.sh --staged' (includes source secret scan) to that hook manually." >&2
  exit 1
fi
cp scripts/check-git-sensitive-files.sh "$hook"
chmod +x "$hook"
echo "WORKBENCH pre-commit hook installed or updated: $hook"
