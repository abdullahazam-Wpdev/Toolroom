#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 24 LTS, then run this script again.' >&2
  exit 1
fi
exec npm run dev
