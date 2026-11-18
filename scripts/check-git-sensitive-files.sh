#!/usr/bin/env bash
# WORKBENCH: allow only reviewed source types even if someone uses `git add -f`.
# Usage: bash scripts/check-git-sensitive-files.sh [--staged|--tracked|--head]
# Install as pre-commit hook by copying this file to .git/hooks/pre-commit.
set -euo pipefail

mode="${1:---staged}"
if [[ "$mode" != "--staged" && "$mode" != "--tracked" && "$mode" != "--head" ]]; then
  echo 'Usage: check-git-sensitive-files.sh [--staged|--tracked|--head]' >&2
  exit 2
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '[WORKBENCH] This command must run inside a Git repository.' >&2
  exit 2
fi

block=0
checked=0
while IFS= read -r -d '' file; do
  checked=$((checked + 1))
  basename="${file##*/}"
  extension="${basename##*.}"
  extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"
  why=''

  # Only the root backup/ path is private. src/backup/ is application code.
  case "/$file/" in
    */source-pdf/*|*/backups/*|/backup/*|*/exports/*|*/output/*|*/downloads/*|*/private/*|*/secrets/*|*/local-data/*|*/temp/*|*/tmp/*|*/document_builder/json/*)
      why='private/work-data directory' ;;
  esac

  case "$basename" in
    .env.example) ;;
    .env|.env.*|.npmrc|id_rsa*|id_ed25519*) why='secret/local configuration' ;;
  esac

  # Default-deny for non-source formats, including unknown extensions.
  # This blocks .pdf/.json/.xml/.md/.dat as well as newly invented data types.
  case "$file" in
    favicon.ico|.nojekyll|.gitignore|package.json|package-lock.json|tsconfig.json|tsconfig.*.json|*/tsconfig.json|*/tsconfig.*.json|README.md|COPYRIGHT.md|SECURITY_GUIDE.md|CSP_GUIDE.md|SECURITY_FIXES.md|document_builder/PRINT_HISTORY.md)
      ;;
    *.ts|*.js|*.html|*.css|*.sh|*.mjs)
      ;;
    *)
      why='not an approved source-code/config file type' ;;
  esac

  if [[ -n "$why" ]]; then
    printf '  BLOCKED: %s (%s)\n' "$file" "$why" >&2
    block=$((block + 1))
  fi
done < <(
  if [[ "$mode" == '--tracked' ]]; then
    git ls-files -z
  elif [[ "$mode" == '--head' ]]; then
    git ls-tree -r --name-only -z HEAD
  else
    git diff --cached --name-only -z --diff-filter=ACMR
  fi
)

if (( block > 0 )); then
  printf '[WORKBENCH] %d possibly private file(s) found. Commit/push stopped.\n' "$block" >&2
  echo '[WORKBENCH] Review these files manually; do not bypass for customer data.' >&2
  exit 1
fi
printf '[WORKBENCH] OK: checked %d %s file(s); no blocked types found.\n' "$checked" "$mode"
# Allowlistだけでなく、ソース中の認証情報の直書きも検査する。
node scripts/check-source-secrets.mjs "$mode"
