#!/usr/bin/env bash
# Push runtime secrets from .env.local to the Cloudflare Worker.
# Usage: ./scripts/push-cloudflare-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# Load .env.local without printing values
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required=(
  DATABASE_URL
  SESSION_SECRET
  JON_PASSWORD_HASH
  AHMED_PASSWORD_HASH
)

for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing $key in .env.local"
    exit 1
  fi
done

cd "$ROOT"

echo "Pushing secrets to Cloudflare Worker (values hidden)…"

printf '%s' "$DATABASE_URL" | npx wrangler secret put DATABASE_URL
printf '%s' "$SESSION_SECRET" | npx wrangler secret put SESSION_SECRET
printf '%s' "$JON_PASSWORD_HASH" | npx wrangler secret put JON_PASSWORD_HASH
printf '%s' "$AHMED_PASSWORD_HASH" | npx wrangler secret put AHMED_PASSWORD_HASH

echo "Done. Deploy with: npm run deploy"
