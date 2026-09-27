# syntax=docker/dockerfile:1

# ---- build: install workspace deps, bundle the API, assemble a prod-only directory ----
FROM node:24-alpine AS build
RUN npm install -g pnpm@11.13.1
WORKDIR /repo

# Manifests first: dependency layers stay cached across source-only changes.
# Every workspace manifest is copied so the frozen lockfile matches the workspace.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile --filter "@bizscout/api..."

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @bizscout/api build \
 && pnpm --filter @bizscout/api deploy --prod --legacy /out

# ---- runtime: bundle + migrations + production node_modules only ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "--enable-source-maps", "dist/server.js"]
