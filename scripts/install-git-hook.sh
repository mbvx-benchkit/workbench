#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$(git rev-parse --show-toplevel)"
if git config --get core.hooksPath >/dev/null; then
  echo '[WORKBENCH] 独自のcore.hooksPathが設定されています。既存設定を維持します。' >&2
  exit 1
fi
cd "$ROOT"
for name in pre-commit pre-push; do
  hook="$(git rev-parse --git-path "hooks/$name")"
  if [[ -L "$hook" || ( -e "$hook" && ! -f "$hook" ) ]]; then
    echo '[WORKBENCH] 既存の特殊なフックを上書きしません。' >&2; exit 1
  fi
  if [[ -f "$hook" ]] && ! grep -Fq 'WORKBENCH: publication hook v1' "$hook"; then
    if [[ "$name" != pre-commit ]] || ! grep -Eq 'WORKBENCH: (block private-data file types|allow only reviewed source types)' "$hook"; then
      echo "[WORKBENCH] 外部フックを上書きしません: $name" >&2; exit 1
    fi
  fi
done
for name in pre-commit pre-push; do
  hook="$(git rev-parse --git-path "hooks/$name")"
  mkdir -p "$(dirname "$hook")"
  tmp="$(mktemp "$(dirname "$hook")/.workbench-hook.XXXXXX")"
  if [[ "$name" == pre-commit ]]; then
    printf '%s\n' '#!/usr/bin/env bash' '# WORKBENCH: publication hook v1' 'set -euo pipefail' 'cd "$(git rev-parse --show-toplevel)"' 'exec node scripts/audit-publication.mjs --staged' > "$tmp"
  else
    printf '%s\n' '#!/usr/bin/env bash' '# WORKBENCH: publication hook v1' 'set -euo pipefail' 'cd "$(git rev-parse --show-toplevel)"' 'exec node scripts/audit-publication.mjs --push "$2"' > "$tmp"
  fi
  chmod 755 "$tmp"
  mv -f "$tmp" "$hook"
  echo "[WORKBENCH] $name installed."
done
