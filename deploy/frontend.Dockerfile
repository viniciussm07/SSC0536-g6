FROM node:24.13.0-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY common ./common
RUN pnpm install --frozen-lockfile --filter @ssc0536/frontend...
COPY apps/frontend ./apps/frontend
ENV VITE_API_URL=/api
RUN pnpm --filter @ssc0536/common build && pnpm --filter @ssc0536/frontend build

FROM caddy:2.10.2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/frontend/dist /srv
