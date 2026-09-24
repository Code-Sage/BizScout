# Environment and conventions for phase work (read before running anything)

## Services run in Docker, always

Postgres and httpbin run as Docker containers from the repo's `docker-compose.yml` (compose project
`bizscout`). Never use natively installed services for this project. Start them (idempotent; it also
starts Docker Desktop if needed) with:

```bash
bash .claude/phase-workflow/scripts/start-services.sh
```

| Service  | Image                       | Reachable at                                                                           |
| -------- | --------------------------- | -------------------------------------------------------------------------------------- |
| postgres | `postgres:17-alpine`        | `localhost:55432`, user/pass `bizscout`/`bizscout`, DBs `bizscout` and `bizscout_test` |
| httpbin  | `mccutchen/go-httpbin:2.25` | `localhost:8080`                                                                       |

Postgres is published on **55432** instead of the compose default 5432, because a Homebrew Postgres
already owns 5432 on this machine. The script sets `POSTGRES_PORT=55432` for compose. If you run
compose yourself, use `POSTGRES_PORT=55432 docker compose up -d --wait`. Never use the Homebrew
Postgres on 5432.

- **Docker commands in plans run for real.** `docker compose …` goes through `start-services.sh`, and plans' `docker build …` / `docker run …` verification steps (e.g. the API image in Phase 5) are executed normally.
- **Never stop, remove or reset the shared services** (`docker compose down`, `down -v`, `stop`, `rm`). The skills own them. Other containers on this machine belong to other projects: never touch them.
- **Pass the local port through env vars.** Never change committed defaults (e.g. `localhost:5432` in test helpers, compose, CI) to 55432.
  - Integration tests: `DATABASE_URL_TEST=postgres://bizscout:bizscout@localhost:55432/bizscout_test`
  - Live pipeline tests: `HTTPBIN_TEST_URL=http://localhost:8080/anything`
  - E2E: `E2E_DATABASE_URL=postgres://bizscout:bizscout@localhost:55432/bizscout_test`
  - `apps/api/.env` (git-ignored) uses `DATABASE_URL=postgres://bizscout:bizscout@localhost:55432/bizscout`
  - Manual checks: `docker compose exec postgres psql -U bizscout -d bizscout`, or `psql "postgres://bizscout:bizscout@localhost:55432/bizscout"`
- **No GitHub remote and no `gh` CLI.** Never push, never create PRs. CI workflows are written but can't be run.
- **Hosted services need the user's accounts** (Supabase, Render, Vercel, cron-job.org). Never create accounts or enter secrets.

## Gates

Run everything with:

```bash
bash .claude/phase-workflow/scripts/gates.sh          # lint, format, typecheck, tests (+coverage when defined), builds
bash .claude/phase-workflow/scripts/gates.sh --e2e    # also Playwright, once the e2e package exists (Phase 4+)
```

For focused runs, filter vitest by file-name fragment WITHOUT `--`, e.g. `pnpm --filter @bizscout/api test:unit ping-service`.

## Git rules for phase work

- Work stays **uncommitted** until the user approves it (`/phase-commit`). Never `git add`, `git commit`, `git stash`, `git reset`, `git checkout -- <file>`, `git rebase` or `git push` during implementation or review. Skip every commit step a plan task contains and note it in your report.
- The repo root holds a private PDF and git-ignored planning docs (`docs/superpowers/`). Never stage those.
- `.claude/` holds this workflow's tooling. Agents never edit it. The skills update only `.claude/phase-workflow/CARRY-FORWARD.md`, which `/phase-commit` commits with the phase.

## Code conventions reviewers enforce

- Transcribe a plan's code verbatim (Prettier re-wrapping is fine). Deviate only when it doesn't compile/pass or conflicts with existing code, with the smallest change, and record it.
- Zod 4's `z.iso.datetime()` exists in the installed zod — never swap it for the deprecated `z.string().datetime()`.
- Imports have no `.js` suffix; type-only imports use `import type` / `import { type X }`.
- Run `pnpm format` after editing; test output must be pristine (the Recharts zero-size warning in happy-dom is accepted).
- Leave no dev servers, watchers or helper processes running: `bash .claude/phase-workflow/scripts/cleanup-processes.sh` stops anything started from this repo. The Docker services are started and stopped only by the skills (`start-services.sh` / `stop-services.sh`).
