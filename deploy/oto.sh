#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
compose() { docker compose --env-file .env -f compose.yaml "$@"; }
case "${1:-}" in
  init)
    if [[ -e .env ]]; then
      printf '.env existente preservado.\n'
      exit 0
    fi
    domain="${2:?Informe o domínio: bash deploy/oto.sh init oto.seudominio.com}"
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ || "$domain" != *.* ]]; then
      printf 'Informe somente um hostname válido, sem protocolo ou caminho.\n' >&2
      exit 1
    fi
    (umask 077
      printf 'DOMAIN=%s\nPOSTGRES_DB=oto_poc\nPOSTGRES_PASSWORD=%s\nAPP_DB_PASSWORD=%s\n' \
        "$domain" "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > .env)
    printf 'Configuração criada com credenciais aleatórias em deploy/.env.\n'
    ;;
  up)
    compose config --quiet
    # Construção sequencial para reduzir o pico de memória na VPS de 4 GB.
    compose build postgres migrate
    compose build web
    # Executa migrations e permissões em toda release, mesmo sem mudanças no YAML.
    compose up -d --wait postgres
    compose run --rm --no-deps migrate
    compose run --rm --no-deps permissions
    compose up -d --no-deps --wait --wait-timeout 180 backend
    compose up -d --no-deps web
    compose ps
    ;;
  backup)
    umask 077
    mkdir -p backups
    target="backups/oto-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
    trap 'rm -f -- "$target.partial"' EXIT
    compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$target.partial"
    mv -- "$target.partial" "$target"
    printf 'Backup local criado: deploy/%s. Copie-o para fora da VPS.\n' "$target"
    ;;
  ps) compose ps ;;
  logs) compose logs --tail=100 -f backend web ;;
  stop) compose stop ;;
  contas) compose exec -T backend pnpm auth:contas ;;
  catalogos) compose exec -T backend pnpm db:catalogos ;;
  *) printf 'Uso: bash deploy/oto.sh {init DOMINIO|up|backup|ps|logs|stop|contas|catalogos}\n' >&2; exit 1 ;;
esac
