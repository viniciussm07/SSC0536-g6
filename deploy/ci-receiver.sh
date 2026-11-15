#!/usr/bin/env bash
# Instalado como root em /usr/local/sbin/oto-ci-deploy, fora das releases.
set -euo pipefail
if [[ "${SSH_ORIGINAL_COMMAND:-}" == check ]]; then
  printf 'OTO deploy receiver ready\n'
  exit 0
fi
if [[ ! "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([a-f0-9]{40})$ ]]; then
  printf 'Comando não permitido.\n' >&2
  exit 1
fi
sha="${BASH_REMATCH[1]}"
exec 9>/var/lock/oto-deploy.lock
flock -w 1800 9
# Cada tentativa recebe diretório próprio; releases anteriores são preservadas.
mkdir -p /opt/oto/releases
release=$(mktemp -d "/opt/oto/releases/$sha.XXXXXX")
python3 - "$release" 3<&0 <<'PY'
# O arquivo tar chega pelo fd 3; stdin contém este programa.
import os, sys, tarfile
from pathlib import PurePosixPath
root = sys.argv[1]
total = 0
count = 0
with os.fdopen(3, 'rb') as stream, tarfile.open(fileobj=stream, mode='r|') as archive:
    for member in archive:
        path = PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or not member.name:
            raise ValueError('Caminho inválido no arquivo da release')
        if not (member.isfile() or member.isdir()):
            raise ValueError('Links e arquivos especiais não são permitidos')
        if any(p == '.git' or p == '.env' or (p.startswith('.env.') and p != '.env.example') for p in path.parts):
            raise ValueError('Segredos e metadados Git não são permitidos')
        total += member.size
        count += 1
        if total > 200 * 1024 * 1024 or count > 20000:
            raise ValueError('Release excede o limite de tamanho')
        archive.extract(member, root, filter='data')
PY

test -f "$release/deploy/oto.sh"
test -f "$release/deploy/compose.yaml"
ln -s /opt/oto/deploy/.env "$release/deploy/.env"
ln -s /opt/oto/deploy/backups "$release/deploy/backups"
export RELEASE="$sha"
# O backup usa sempre a instalação operacional já existente e fica só na VPS.
bash /opt/oto/deploy/oto.sh backup
bash "$release/deploy/oto.sh" up
curl --fail --silent --show-error --retry 6 --retry-all-errors --retry-delay 5 \
  --max-time 15 https://oto.leol.dev/api/health
curl --fail --silent --show-error --output /dev/null --max-time 15 https://oto.leol.dev/
ln -sfn "$release" /opt/oto/current
printf '%s\n' "$sha" > /opt/oto/current-release
printf '\nRelease publicada: %s\n' "$sha"
