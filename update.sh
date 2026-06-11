#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="${ROOT}/backend"
FRONTEND="${ROOT}/frontend"
BRANCH="${BRANCH:-main}"
PM2_APP="${PM2_APP:-paperless-api}"

log() {
  printf '\n==> %s\n' "$1"
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

use_node() {
  local nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [[ ! -s "${nvm_sh}" ]]; then
    return 0
  fi

  # shellcheck disable=SC1090
  source "${nvm_sh}"
  nvm use 20.19.5 >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true

  local node_bin
  node_bin="$(nvm which 20.19.5 2>/dev/null || nvm which 20 2>/dev/null || true)"
  if [[ -n "${node_bin}" ]]; then
    export PATH="$(dirname "${node_bin}"):${PATH}"
  fi
}

cd "${ROOT}"

if [[ -n "$(git status --porcelain)" ]]; then
  log "Local changes detected — will autostash during pull"
  git status --short
fi

log "Pulling latest code (${BRANCH})"
git pull --ff-only --autostash origin "${BRANCH}"

log "Installing backend dependencies"
cd "${BACKEND}"
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

log "Running database migrations"
php artisan migrate --force

log "Optimizing Laravel"
php artisan optimize

log "Installing frontend dependencies"
cd "${FRONTEND}"
use_node
npm install

log "Building frontend"
npm run build

if command -v pm2 >/dev/null 2>&1; then
  log "Restarting ${PM2_APP}"
  pm2 restart "${PM2_APP}"
else
  log "pm2 not found — restart the API manually"
fi

log "Update complete"
