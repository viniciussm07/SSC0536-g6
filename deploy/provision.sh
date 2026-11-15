#!/usr/bin/env bash
# Execute somente na VPS Ubuntu 24.04 dedicada à POC.
set -euo pipefail
[[ "$(id -u)" == 0 ]] || { echo 'Execute como root.' >&2; exit 1; }
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]] || { echo 'Requer Ubuntu 24.04.' >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y ca-certificates curl ufw
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<SOURCES
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
SOURCES
  apt-get update -qq
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
# Complemento para picos de compilação, sem substituir swap existente.
if [[ "$(swapon --noheadings --show | wc -l)" -eq 0 && ! -e /swap-oto ]]; then
  fallocate -l 2G /swap-oto
  chmod 600 /swap-oto
  mkswap /swap-oto
  swapon /swap-oto
  printf '/swap-oto none swap sw 0 0\n' >> /etc/fstab
fi
# A VPS verificada usa SSH na porta 22; preserve-a antes de ativar o firewall.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
docker --version
docker compose version
ufw status
