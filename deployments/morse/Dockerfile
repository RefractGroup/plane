# syntax=docker/dockerfile:1.7
# Morse Micro board: Plane Community Edition with a rebuilt, Morse-branded web app.
# Runtime dependencies come from the matching official image; our web and backend source ship together.
ARG PLANE_VERSION=v1.4.3

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable

# Prune the monorepo down to the web app and its workspace dependencies
FROM base AS pruner
WORKDIR /app
ARG TURBO_VERSION=2.10.11
RUN corepack enable pnpm && pnpm add -g turbo@${TURBO_VERSION}
COPY . .
RUN turbo prune --scope=web --docker

# Install and build the web app (same settings as upstream apps/web/Dockerfile.web)
FROM base AS web
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable pnpm
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN CI=true pnpm install --frozen-lockfile
ENV VITE_API_BASE_URL="" \
    VITE_ADMIN_BASE_URL="" \
    VITE_ADMIN_BASE_PATH="/god-mode" \
    VITE_LIVE_BASE_URL="" \
    VITE_LIVE_BASE_PATH="/live" \
    VITE_SPACE_BASE_URL="" \
    VITE_SPACE_BASE_PATH="/spaces" \
    VITE_WEB_BASE_URL="" \
    NEXT_TELEMETRY_DISABLED=1 \
    TURBO_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=6144"
RUN pnpm turbo run build --filter=web

# Official runtime, with our web build and process config
FROM makeplane/plane-aio-community:${PLANE_VERSION}
RUN rm -rf /app/web && mkdir -p /app/web
COPY --from=web /app/apps/web/build/client /app/web
COPY deployments/morse/supervisor.conf /etc/supervisor/conf.d/supervisor.conf
COPY deployments/morse/Caddyfile /app/proxy/Caddyfile
COPY deployments/morse/morse_bootstrap_admin.py /app/backend/plane/db/management/commands/morse_bootstrap_admin.py
# Ship the pinned fork backend too, so tested API changes reach the running service.
COPY apps/api/plane /app/backend/plane
