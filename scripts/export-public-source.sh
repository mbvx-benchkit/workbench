#!/usr/bin/env bash
# Create a source-only archive from reviewed, committed Git content.
# It deliberately excludes .git, node_modules, untracked local files and personal backups.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

output="${1:-}"
if [[ -z "$output" ]]; then
  echo "Usage: bash scripts/export-public-source.sh /absolute/path/public-source.zip" >&2
  exit 2
fi
if [[ "$output" != /* ]]; then
  echo "Use an absolute output path so the ZIP does not land in the repository." >&2
  exit 2
fi
if [[ "$output" != *.zip ]]; then
  echo "Output must be a .zip path." >&2
  exit 2
fi

bash scripts/check-git-sensitive-files.sh --head
bash scripts/check-git-sensitive-files.sh --tracked

# Only HEAD (committed files) is exported. Worktree edits are never included.
git archive --format=zip --prefix=jan/ -o "$output" HEAD
echo "Created source-only ZIP from committed HEAD: $output"
echo "IMPORTANT: this is not a backup of browser IndexedDB or your working tree."
