#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

require_docker
printf 'Encerrando frontend, backend e banco de dados…\n'
compose down --timeout 30
printf 'Aplicação encerrada. Os dados do Postgres foram preservados.\n'
