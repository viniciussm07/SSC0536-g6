#!/usr/bin/env bash

# Compartilhado pelos scripts; caminhos independentes do diretório de execução.
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    printf 'Docker não encontrado. Instale e inicie o Docker antes de continuar.\n' >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    printf 'Docker Compose v2 não encontrado. Instale o plugin Docker Compose.\n' >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    printf 'Docker indisponível. Inicie o Docker e tente novamente.\n' >&2
    exit 1
  fi
}

compose() {
  local env_file="$ROOT_DIR/.env"
  if [[ ! -f "$env_file" ]]; then
    env_file="$ROOT_DIR/.env.example"
  fi
  docker compose --project-directory "$ROOT_DIR" --env-file "$env_file" \
    -f "$ROOT_DIR/compose.yaml" -f "$ROOT_DIR/scripts/compose.yaml" "$@"
}
