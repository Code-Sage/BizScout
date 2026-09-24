# Build journal

A running log of what was built, the decisions behind it, surprises, and time spent. Newest entries at the bottom.

## Phase 1 — Foundation (2026-09-24)

- Built: pnpm monorepo, lint/format/typecheck gates, shared zod contracts, Express skeleton with validated env + pino + error envelope, docker compose (Postgres 17 + go-httpbin), CI skeleton.
- Decisions: see ADR-0001. go-httpbin gives CI a deterministic, offline stand-in for httpbin.org.
- Surprises: pnpm 11 fails installs on unapproved postinstall scripts → `allowBuilds` in `pnpm-workspace.yaml`. Docker is not installed on the build machine, so the compose stack and CI were written but not run. A Prettier run briefly reformatted the planning docs, now excluded via `.prettierignore`.
- Verification: ran — lint, format:check, typecheck, 12 shared + 12 API tests, API health check against a local Postgres 17 stand-in on port 55432 and an httpbin stub on 8080. Not run — `docker compose up`, GitHub Actions.
- Time: ~35 min (agent-executed)
