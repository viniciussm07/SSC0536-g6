# Mantém PostgreSQL 17 e o mesmo diretório de dados do setup inicial.
# A instalação pelo repositório PostgreSQL atende amd64 e arm64.
FROM postgres:17-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
