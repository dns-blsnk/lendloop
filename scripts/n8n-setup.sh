#!/usr/bin/env sh
# Imports the LendLoop credentials and workflows into the local n8n and publishes them.
# Safe to run again: imports overwrite by id. Requires `docker compose up -d` first.
set -eu

run() { docker compose exec -T n8n n8n "$@"; }

run import:credentials --input=/lendloop-n8n/credentials/mailpit-smtp.json
run import:workflow --separate --input=/lendloop-n8n/workflows
for id in lendloopErrors01 lendloopNotify01 lendloopOverdue1; do
  run publish:workflow --id="$id"
done
# n8n loads published workflows (webhooks, schedules) on start.
docker compose restart n8n >/dev/null
docker compose up -d --wait n8n >/dev/null
echo "n8n workflows imported and published."
