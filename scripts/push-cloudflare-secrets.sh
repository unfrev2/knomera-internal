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

# Optional OpenAI secrets for Stage 2 evidence matching
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  printf '%s' "$OPENAI_API_KEY" | npx wrangler secret put OPENAI_API_KEY
fi
if [[ -n "${OPENAI_FAST_MODEL:-}" ]]; then
  printf '%s' "$OPENAI_FAST_MODEL" | npx wrangler secret put OPENAI_FAST_MODEL
fi
if [[ -n "${OPENAI_REASONING_MODEL:-}" ]]; then
  printf '%s' "$OPENAI_REASONING_MODEL" | npx wrangler secret put OPENAI_REASONING_MODEL
fi

# Optional MCP / OAuth secrets
if [[ -n "${APP_BASE_URL:-}" ]]; then
  printf '%s' "$APP_BASE_URL" | npx wrangler secret put APP_BASE_URL
fi
if [[ -n "${WORKSPACE_SLUG:-}" ]]; then
  printf '%s' "$WORKSPACE_SLUG" | npx wrangler secret put WORKSPACE_SLUG
fi
if [[ -n "${MCP_OAUTH_SIGNING_SECRET:-}" ]]; then
  printf '%s' "$MCP_OAUTH_SIGNING_SECRET" | npx wrangler secret put MCP_OAUTH_SIGNING_SECRET
fi
if [[ -n "${MCP_CONNECTOR_SECRET:-}" ]]; then
  printf '%s' "$MCP_CONNECTOR_SECRET" | npx wrangler secret put MCP_CONNECTOR_SECRET
fi

echo "Done. Deploy with: npm run deploy"
