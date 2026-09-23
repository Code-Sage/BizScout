# 0001 — Monorepo with TypeScript end-to-end

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The system has an API, a web dashboard and a contract between them (REST + SSE payloads). The brief evaluates clarity, decision-making and delivery within a short time budget.

## Decision

- One pnpm workspace: `apps/api`, `apps/web`, `packages/shared`, `e2e`.
- TypeScript everywhere; request/response/event payloads are zod schemas in `packages/shared`, validated on both sides.
- Pinned majors verified together on 2026-09-24: Node 24, pnpm 11, TypeScript 5.9 (typescript-eslint 8 does not support TS ≥ 6.1), ESLint 9, Vitest 3.2, Vite 7, React 19, Express 5.

## Alternatives considered

- **Separate repos** — contract drift and duplicated CI for a two-app system.
- **Latest majors (TS 7, Vite 8, Vitest 5)** — not yet supported by the lint toolchain; upgrading is listed as future work.
- **tRPC** — tighter coupling than needed; SSE and a plain REST surface are easier for reviewers to exercise with curl.

## Consequences

- A contract change is one PR that fails typecheck wherever it breaks.
- Workspace linking needs care in Docker builds (handled with `pnpm deploy` in Phase 5).
