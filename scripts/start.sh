#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

require_docker

for example in .env.example apps/backend/.env.example apps/frontend/.env.example; do
  target="$ROOT_DIR/${example%.example}"
  if [[ ! -e "$target" ]]; then
    (umask 077; cp "$ROOT_DIR/$example" "$target")
    printf 'Criado: %s\n' "${example%.example}"
  fi
done

on_error() {
  printf '\nFalha ao inicializar a aplicação. Logs recentes:\n' >&2
  compose logs --tail=60 >&2 || true
  printf '\nCorrija o erro e execute novamente. Para parar os serviços: bash scripts/stop.sh\n' >&2
}
trap on_error ERR

printf 'Instalando dependências, construindo imagens e iniciando os serviços…\n'
compose up -d --build --wait --wait-timeout 180
printf '\nAplicação iniciada. Portas publicadas:\n'
compose ps
printf '\nLogs: docker compose -f compose.yaml -f scripts/compose.yaml logs -f\n'
printf 'Encerrar: bash scripts/stop.sh\n'
