#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
export NODE_ENV=production
export ELECTRON_DISABLE_SECURITY_WARNINGS=false

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  nvm use >/dev/null
fi

exec ./node_modules/.bin/electron --no-sandbox .
