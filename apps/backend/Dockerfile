FROM node:24.13.0-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN pnpm install --frozen-lockfile --filter @ssc0536/backend...
COPY apps/backend ./apps/backend
RUN pnpm --filter @ssc0536/backend build

# Mantém o CLI do Prisma para aplicar migrations ao iniciar o container.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:deploy && exec node dist/main.js"]
