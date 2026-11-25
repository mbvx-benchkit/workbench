#!/usr/bin/env bash
# WORKBENCH: compatibility entry point; one shared publication policy.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec node scripts/audit-publication.mjs "$@"
