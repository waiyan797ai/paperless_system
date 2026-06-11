#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8001}"
HOST="${HOST:-127.0.0.1}"
SERVER="${ROOT}/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"

# `php artisan serve` spawns a child `php -S` without upload ini flags.
# Run the built-in server directly so large PDF uploads work (default PHP limit is 2 MB).
cd "${ROOT}"

php artisan route:cache --no-interaction 2>/dev/null || php artisan route:clear --no-interaction

cd "${ROOT}/public"

echo "Starting API server on http://${HOST}:${PORT} (upload limit 30 MB)"
exec php \
  -d upload_max_filesize=30M \
  -d post_max_size=32M \
  -d max_file_uploads=20 \
  -d memory_limit=256M \
  -S "${HOST}:${PORT}" \
  "${SERVER}"
