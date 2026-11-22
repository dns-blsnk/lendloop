#!/usr/bin/env sh
# Points the Convex CLI at the local self-hosted backend and copies the integration settings from
# the root .env into the Convex deployment. Safe to run again.
set -eu

[ -f .env ] || { echo "Create .env from .env.example first." >&2; exit 1; }
set -a; . ./.env; set +a

backend=packages/backend
if [ ! -f "$backend/.env.local" ]; then
  key=$(docker compose exec -T convex-backend ./generate_admin_key.sh | tail -n 1)
  printf 'CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210\nCONVEX_SELF_HOSTED_ADMIN_KEY=%s\n' "$key" \
    > "$backend/.env.local"
fi

convex() { (cd "$backend" && npx convex "$@"); }
convex env set N8N_WEBHOOK_BASE_URL http://n8n:5678/webhook >/dev/null
convex env set CONVEX_TO_N8N_SECRET "$CONVEX_TO_N8N_SECRET" >/dev/null
convex env set N8N_TO_CONVEX_SECRET "$N8N_TO_CONVEX_SECRET" >/dev/null
convex env set CLERK_JWT_ISSUER_DOMAIN "${CLERK_JWT_ISSUER_DOMAIN:-}" >/dev/null
convex dev --once --typecheck disable
echo "Convex is configured and the functions are deployed."
