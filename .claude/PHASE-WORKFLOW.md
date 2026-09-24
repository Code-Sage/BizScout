# BizScout phase workflow

Each phase plan in `docs/superpowers/plans/` goes through four steps. Nothing is committed until step 4.

| Step            | You type                                     | Runs on                                                                                            | What happens                                                                                                                                                                                                       |
| --------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Implement    | `/phase-implement 4`                         | Controller: Sonnet 5 at Max (skill override). Workers: `phase-implementer` agents, Sonnet 5 at Max | Creates branch `phase/04-…` from `main`, does any carry-forward items for the phase, then implements every task with one fresh agent per task (TDD, plan code verbatim, no commits), runs all gates and summarises |
| 2. Review + fix | `/phase-review 4`                            | Controller: Opus 5.5 at Max (skill override). Worker: the `phase-reviewer` agent, Opus 5.5 at Max  | Built-in `/code-review max --fix` for correctness, then a whole-phase review that fixes code, docs and later plans; re-runs the gates, checks the UI in the browser for web phases, and opens the diff pane        |
| 3. Your review  | Plain chat                                   | Whatever the model picker says                                                                     | You read the diff pane and ask for changes; Claude applies them, re-runs the gates and shows the diff again                                                                                                        |
| 4. Commit       | `/phase-commit 4` or `/phase-commit 4 split` | Picker model                                                                                       | Runs the gates, stages explicit paths only, commits (one commit, or split by area), merges into `main` with `--no-ff`, ticks carry-forward items and deletes the phase workspace. It never pushes.                 |

## Tips

- **Start each phase in a new session.** Context stays small, and the skills keep their state in files anyway.
- **Agents load automatically.** Claude Code watches `.claude/agents/` and `.claude/skills/`, so edits apply within seconds. If a dispatch says `phase-implementer` isn't available, start a new session.
- **Set the model picker too.** A skill's `model` and `effort` apply only to the turn that runs it. If a step is interrupted (usage limit, a question for you) and you resume with plain chat, the picker's model takes over. Choose Sonnet 5 / Max for step 1 and Opus 5.5 / Max for step 2.
- **Optional extra review.** Before step 2, type `/code-review ultra`. It's a deep multi-agent review in the cloud; only you can start it, and it's billed separately. `/phase-review` then applies its findings.
- **Resuming after an interruption.** Run the same command again. Progress is tracked in `.superpowers/phase-cycle/phase-N/progress.md`, and finished tasks are skipped.
- **Accounts and secrets.** Steps that need your accounts or secrets (Phase 5 hosting, Phase 8 submission) are never done for you; they're listed as "pending user action".

## Setup and tear-down lifecycle

| Resource                                                                              | Set up by                                                                                        | Torn down by                                                                                              | Why then                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker services: Postgres (:55432) and go-httpbin (:8080), compose project `bizscout` | `start-services.sh` at the start of every step (safe to repeat; starts Docker Desktop if needed) | `stop-services.sh` (`docker compose down`) at the end of `/phase-commit`, unless you ask to keep them     | Steps 1–3 all need them, and so does applying your review requests; the cycle ends at commit. Database data is kept in the `bizscout_pgdata` volume. |
| Dev servers, watchers, test runners (tsx, vite, vitest, Playwright)                   | Agents and browser checks, during a step                                                         | `cleanup-processes.sh` at the end of every step and before any early stop; each agent also runs it itself | They're only needed inside a step, and a stray server blocks ports (4000, 5173, 4100, 4173) for the next step                                        |
| Phase branch `phase/0N-…`                                                             | `/phase-implement`                                                                               | Never deleted automatically; merged by `/phase-commit`                                                    | Deleting a branch is your call                                                                                                                       |
| Workspace `.superpowers/phase-cycle/phase-N/` (briefs, reports, ledger)               | `/phase-implement`                                                                               | `/phase-commit` after a successful merge                                                                  | It's the resume point and review input until then                                                                                                    |
| Uncommitted changes                                                                   | Steps 1–3                                                                                        | Committed by `/phase-commit`                                                                              | Your approval is the commit                                                                                                                          |

Failure paths keep what you need to retry. If gates, the commit or the merge fail, only stray processes are cleaned up; services, workspace and changes stay.

`start-services.sh` is idempotent and safe to run twice, even at the same moment:

- Containers that are already up are left alone (`docker compose up -d --wait` doesn't touch them).
- Two simultaneous starts end with one container per service; if they collide, the script retries once.
- If a port is taken by something outside Docker, compose fails and the script prints which process owns the port.

**Manual commands:**

```bash
bash .claude/phase-workflow/scripts/start-services.sh     # start the Docker services (idempotent)
bash .claude/phase-workflow/scripts/stop-services.sh      # docker compose down (keeps the database volume)
bash .claude/phase-workflow/scripts/cleanup-processes.sh  # stop stray dev servers/watchers from this repo
docker compose down -v                                    # full reset: also deletes the database volume
docker compose logs -f postgres                           # follow a service's logs
```

**Abandoning a phase.** Nothing does this automatically; each step below is yours to run:

1. Run `cleanup-processes.sh`.
2. Save what you want to keep, e.g. `git diff > ~/phase-N.patch`.
3. Discard the changes: `git restore . && git clean -fd -e .claude`. This permanently deletes uncommitted work.
4. `git switch main && git branch -D phase/0N-…`
5. `rm -rf .superpowers/phase-cycle/phase-N`

## Where things live

| Path                                      | What it is                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `.claude/skills/phase-implement/SKILL.md` | Step 1 instructions                                                                                                            |
| `.claude/skills/phase-review/SKILL.md`    | Step 2 instructions                                                                                                            |
| `.claude/skills/phase-commit/SKILL.md`    | Step 4 instructions                                                                                                            |
| `.claude/agents/phase-implementer.md`     | Per-task implementer: model, effort, system prompt                                                                             |
| `.claude/agents/phase-reviewer.md`        | Whole-phase reviewer and fixer: model, effort, system prompt                                                                   |
| `.claude/phase-workflow/ENVIRONMENT.md`   | Shared rules: Docker services, gates, git rules, code conventions                                                              |
| `.claude/phase-workflow/CARRY-FORWARD.md` | Decisions and fixes that outlive a phase; the skills read and update it                                                        |
| `.claude/phase-workflow/scripts/*.sh`     | `start-services`, `stop-services`, `cleanup-processes`, `gates`, `phase-info`, `task-brief`, `phase-context`, `review-package` |
| `docker-compose.yml` (repo root)          | The Docker services themselves (Postgres, go-httpbin), shared with the plans                                                   |
| `.claude/launch.json`                     | `api` and `web` dev-server configs for the browser pane                                                                        |
| `.superpowers/phase-cycle/phase-N/`       | Per-phase briefs, reports, ledger, summaries (git-ignored; deleted by `/phase-commit`)                                         |

`.claude/` is committed: the skills, agents, scripts and docs are part of the repo. `.claude/settings.local.json` holds your personal permissions and stays out of git. `/phase-commit` commits `CARRY-FORWARD.md` with each phase; commit other changes under `.claude/` on their own, or tell `/phase-commit` to include them.

## How to modify

Edits are picked up live; no restart is needed. Commit workflow changes like any other change.

### Change a model or effort level

- **Agents.** Edit the frontmatter of `.claude/agents/phase-implementer.md` or `phase-reviewer.md`:
  - `model:` takes an alias (`sonnet`, `opus`, `haiku`, `fable`), `inherit` (use the main conversation's model), or a full ID such as `claude-sonnet-5` or `claude-opus-5-5`.
  - `effort:` takes `low`, `medium`, `high`, `xhigh` or `max`. The levels available depend on the model.
- **Skills.** Edit `model:` and `effort:` in a `SKILL.md`. These govern the controller turn. Delete both lines to make the skill use the model picker instead.
- **Example: cheaper implementation.** Set `effort: high` in `phase-implementer.md`, and optionally in `phase-implement/SKILL.md`.

### Change what an agent does

The markdown below the frontmatter is the agent's entire system prompt. Edit the "How you work" / "What to review" lists to add or remove rules, for example "always add JSDoc to exported functions" or "also review for performance".

To restrict tools, add `tools: Read, Edit, Write, Bash, Grep, Glob` (an allowlist) or extend `disallowedTools:`. `Agent` is disallowed so agents can't spawn more agents.

Other useful frontmatter fields:

- `maxTurns: 80` caps a runaway agent.
- `skills: [name]` preloads skills into the agent.
- `color:` sets the agent's colour in the transcript.
- `permissionMode:` sets how the agent handles permission prompts.

### Change a step's procedure

Edit the numbered steps in the `SKILL.md`. Useful fields:

- `arguments: [phase]` makes `$phase` available in the text; `/phase-commit` also uses `$mode`.
- `argument-hint:` controls the autocomplete hint.
- `disable-model-invocation: true` means only you can trigger the skill; Claude never runs it on its own. Keep this for all three skills.
- `allowed-tools:` lists tools that run without a permission prompt during the skill, for example `phase-commit`'s git commands.

Some example changes:

- **Stop between tasks for your approval:** in `phase-implement/SKILL.md` step 2, add "after each task, stop and wait for the user's go-ahead".
- **Skip the built-in code review:** delete step 1 of `phase-review/SKILL.md`.
- **Different commit style:** edit section 3 of `phase-commit/SKILL.md` (subject format, trailers, default mode).
- **Push after merging:** add a step to `phase-commit`, but only once a remote exists; this workflow never pushes by default.

### Add a quality gate

Edit `.claude/phase-workflow/scripts/gates.sh`, for example `run security pnpm audit --prod`. Every step already runs `gates.sh`, so the new gate applies everywhere.

### Change services or ports

The services are defined in the repo's `docker-compose.yml`; change images or settings there. The local Postgres port comes from `BIZSCOUT_PG_PORT` (default 55432, passed to compose as `POSTGRES_PORT`); httpbin's 8080 is fixed in the compose file. If you change a port, also update the URLs in `ENVIRONMENT.md`, the defaults in `gates.sh` and `apps/api/.env`. Stop the services with `bash .claude/phase-workflow/scripts/stop-services.sh`.

### Add a new skill

Create `.claude/skills/<name>/SKILL.md` with `name` and `description` frontmatter; it becomes `/<name>`. Add `context: fork` and `agent: phase-reviewer` to run it in that agent's isolated context.

### Check that everything loaded

- Type `/phase-` and all three commands should autocomplete.
- In an interactive terminal session, `/agents` lists `phase-implementer` and `phase-reviewer`. In the desktop app, just start a phase: the first dispatch fails loudly if an agent isn't loaded.
