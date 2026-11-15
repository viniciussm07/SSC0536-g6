FROM node:24.13.0-bookworm-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN pnpm install --frozen-lockfile --filter @ssc0536/frontend...
COPY apps/frontend ./apps/frontend
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["pnpm", "--filter", "@ssc0536/frontend", "dev", "--host", "0.0.0.0"]
