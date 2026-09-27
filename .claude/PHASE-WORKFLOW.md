# BizScout phase workflow

Step 0 turns requirements into a roadmap and phase plans in `docs/superpowers/plans/`. Each phase plan then goes through four steps. Nothing is committed until step 4.

| Step            | You type                                                     | Runs on                                                                                                                                        | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Plan         | `/phase-plan brief.pdf` or `/phase-plan <requirements text>` | Controller: Opus 5.5, high (skill override). Workers: `phase-planner` agents, Opus 5.5, high (Sonnet 5 for phases with no new code)            | Extracts every requirement with an ID, asks you the few decisions that are yours (optional tracks, scope, anything paid), checks current versions and service limits, writes the roadmap and stops for your OK. Then one agent per phase writes the plan and runs its code in a scratch repo, fixing the plan until everything passes. Finishes with a cross-plan review. In a repo that already has plans, new phases continue the numbering and the roadmap is updated. |
| 1. Implement    | `/phase-implement 4`                                         | Controller: Sonnet 5, medium (skill override). Workers: `phase-implementer` agents, Sonnet 5, high; a failing task is retried once on Opus 5.5 | Creates branch `phase/04-…` from `main`, does any carry-forward items for the phase, then implements every task with one fresh agent per task (TDD, plan code verbatim, no commits), runs all gates and summarises                                                                                                                                                                                                                                                        |
| 2. Review + fix | `/phase-review 4`                                            | Controller: Opus 5.5, medium (skill override). Worker: the `phase-reviewer` agent, Opus 5.5, high                                              | One reviewer agent checks correctness (line by line, removed behaviour, callers, stack pitfalls, security, a gap sweep), plan compliance, tests, docs and later plans, and fixes what it finds, with no built-in `/code-review` fan-out. It re-runs the gates, checks the UI in the browser for web phases, and opens the diff pane                                                                                                                                       |
| 3. Your review  | Plain chat                                                   | The model picker (suggested: Opus 5.5, medium)                                                                                                 | You read the diff pane and ask for changes; Claude applies them, re-runs the gates and shows the diff again                                                                                                                                                                                                                                                                                                                                                               |
| 4. Commit       | `/phase-commit 4` or `/phase-commit 4 split`                 | Sonnet 5, medium (skill override)                                                                                                              | Runs the gates, stages explicit paths only, commits (one commit, or split by area), merges into `main` with `--no-ff`, ticks carry-forward items and deletes the phase workspace. It never pushes.                                                                                                                                                                                                                                                                        |

## Tips

- **Start each phase in a new session.** Context stays small, and the skills keep their state in files anyway.
- **Agents load automatically.** Claude Code watches `.claude/agents/` and `.claude/skills/`, so edits apply within seconds. If a dispatch says `phase-implementer` isn't available, start a new session.
- **Set the model picker too.** A skill's `model` and `effort` apply only to the turn that runs it. If a step is interrupted (usage limit, a question for you) and you resume with plain chat, the picker's model takes over. Match the table: Opus 5.5 / high for step 0, Sonnet 5 / medium for step 1, Opus 5.5 / medium for steps 2 and 3.
- **Optional extra review.** Before step 2 you can run `/code-review <level>` yourself, and `/phase-review` then verifies and applies its findings. Mind the cost: it fans out (see "Subagents started by other skills" below). `/code-review ultra` runs in the cloud instead, billed separately; keep it for a phase that deserves the deepest check, such as the core pipeline or anything security-related.
- **Resuming after an interruption.** Run the same command again. Progress is tracked in `.superpowers/phase-cycle/phase-N/progress.md` (and `.superpowers/phase-plan/<date>-<project>/progress.md` for step 0), and finished work is skipped.
- **Requirements input for step 0.** Give a file path (PDF, Markdown, text, Word), a URL, or type the requirements after the command. Text after a file path counts as extra instructions, e.g. `/phase-plan brief.pdf use Neon for the database`. With no input, it lists candidate files and asks.
- **Accounts and secrets.** Steps that need your accounts or secrets (Phase 5 hosting, Phase 8 submission) are never done for you; they're listed as "pending user action".

## Setup and tear-down lifecycle

| Resource                                                                                                         | Set up by                                                                                        | Torn down by                                                                                              | Why then                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker services: Postgres (:55432) and go-httpbin (:8080), compose project `bizscout`                            | `start-services.sh` at the start of every step (safe to repeat; starts Docker Desktop if needed) | `stop-services.sh` (`docker compose down`) at the end of `/phase-commit`, unless you ask to keep them     | Steps 1–3 all need them, and so does applying your review requests; the cycle ends at commit. Database data is kept in the `bizscout_pgdata` volume. |
| Dev servers, watchers, test runners (tsx, vite, vitest, Playwright)                                              | Agents and browser checks, during a step                                                         | `cleanup-processes.sh` at the end of every step and before any early stop; each agent also runs it itself | They're only needed inside a step, and a stray server blocks ports (4000, 5173, 4100, 4173) for the next step                                        |
| Phase branch `phase/0N-…`                                                                                        | `/phase-implement`                                                                               | Never deleted automatically; merged by `/phase-commit`                                                    | Deleting a branch is your call                                                                                                                       |
| Workspace `.superpowers/phase-cycle/phase-N/` (briefs, reports, ledger)                                          | `/phase-implement`                                                                               | `/phase-commit` after a successful merge                                                                  | It's the resume point and review input until then                                                                                                    |
| Planning workspace `.superpowers/phase-plan/<date>-<project>/` (requirements, research, ledger, planner reports) | `/phase-plan`                                                                                    | Kept after planning; delete it yourself when you no longer need the notes                                 | It's the resume point and the record of what was verified                                                                                            |
| Planning scratch repo `…/scratch` and its Docker project `<project>-plan`                                        | `/phase-plan`, step 6                                                                            | `/phase-plan` at the end (`down -v`, then `rm -rf`); processes also by `cleanup-processes.sh`             | It exists only to run the plans' code                                                                                                                |
| Uncommitted changes                                                                                              | Steps 1–3                                                                                        | Committed by `/phase-commit`                                                                              | Your approval is the commit                                                                                                                          |

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

| Path                                                   | What it is                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `.claude/skills/phase-plan/SKILL.md`                   | Step 0 instructions                                                                                                            |
| `.claude/skills/phase-implement/SKILL.md`              | Step 1 instructions                                                                                                            |
| `.claude/skills/phase-review/SKILL.md`                 | Step 2 instructions                                                                                                            |
| `.claude/skills/phase-commit/SKILL.md`                 | Step 4 instructions                                                                                                            |
| `.claude/agents/phase-planner.md`                      | Per-phase plan writer and validator: model, effort, system prompt, and the rules every plan follows                            |
| `.claude/agents/phase-implementer.md`                  | Per-task implementer: model, effort, system prompt                                                                             |
| `.claude/agents/phase-reviewer.md`                     | Whole-phase reviewer and fixer: model, effort, system prompt                                                                   |
| `.claude/phase-workflow/ENVIRONMENT.md`                | Shared rules: Docker services, gates, git rules, code conventions                                                              |
| `.claude/phase-workflow/CARRY-FORWARD.md`              | Decisions and fixes that outlive a phase; the skills read and update it                                                        |
| `.claude/phase-workflow/scripts/*.sh`                  | `start-services`, `stop-services`, `cleanup-processes`, `gates`, `phase-info`, `task-brief`, `phase-context`, `review-package` |
| `.claude/phase-workflow/scripts/extract-plan-code.mjs` | Writes a plan's full-file code blocks into a folder (`--list` to preview); `/phase-plan` uses it to run plans                  |
| `docker-compose.yml` (repo root)                       | The Docker services themselves (Postgres, go-httpbin), shared with the plans                                                   |
| `.claude/settings.json`                                | Project settings: the subagent guardrails (spawn depth 1, unassigned subagents on Sonnet 5, at most 3 at once)                 |
| `.claude/launch.json`                                  | `api` and `web` dev-server configs for the browser pane                                                                        |
| `.superpowers/phase-plan/<date>-<project>/`            | Step 0 workspace (git-ignored)                                                                                                 |
| `.superpowers/phase-cycle/phase-N/`                    | Per-phase briefs, reports, ledger, summaries (git-ignored; deleted by `/phase-commit`)                                         |

`.claude/` is committed: the skills, agents, scripts and docs are part of the repo. `.claude/settings.local.json` holds your personal permissions and stays out of git. `/phase-commit` commits `CARRY-FORWARD.md` with each phase; commit other changes under `.claude/` on their own, or tell `/phase-commit` to include them.

## How to modify

Edits are picked up live; no restart is needed. Commit workflow changes like any other change.

### Change a model or effort level

- **Agents.** Edit the frontmatter of `.claude/agents/phase-implementer.md` or `phase-reviewer.md`:
  - `model:` takes an alias (`sonnet`, `opus`, `haiku`, `fable`), `inherit` (use the main conversation's model), or a full ID such as `claude-sonnet-5` or `claude-opus-5-5`.
  - `effort:` takes `low`, `medium`, `high`, `xhigh` or `max`. The levels available depend on the model.
- **Skills.** Edit `model:` and `effort:` in a `SKILL.md`. These govern the controller turn. Delete both lines to make the skill use the model picker instead.
- **Example: a more thorough review for a critical phase.** Set `effort: xhigh` in `phase-reviewer.md`, and change `medium --fix` to `high --fix` in step 1 of `phase-review/SKILL.md`. Set them back afterwards.

### Cost and quality settings

The defaults put the money where it changes the outcome. The deciding facts:

- **Prices per 1M tokens (input / output):** Opus 5.5 $4 / $20, Sonnet 5 $2 / $10. Cache reads cost $0.20 on both, and they are most of an agent's tokens. So an agent's cost follows its turn count more than its model.
- **Effort:** Opus 5.5 at `medium` beats Opus 5 at `high` on coding and review with about half the tokens. Anthropic's advice is to start there and keep `xhigh` / `max` for measured gains. `max` is uncapped and thinks the most per turn.
- **Phase 4 measured, at the old `max` settings:** 5 implementers (56–128 turns each) cost about $10–13 in total. The built-in `/code-review max` alone (a lead plus 9 angle agents on Opus) cost about $26 before it was stopped.

| Role                         | Setting                                                                                 | Why                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan controller and planners | Opus 5.5, high; Sonnet 5 for no-code phases                                             | Plans are transcribed verbatim, so their design quality carries into every later step. Validation catches mechanical errors, so `max` isn't needed                                                 |
| Implement controller         | Sonnet 5, medium                                                                        | Dispatching and bookkeeping; the rare rulings don't need deep thinking                                                                                                                             |
| Implementers                 | Sonnet 5, high; retry on Opus 5.5 only after a failure; small docs/config tasks batched | The plan's code is already validated, so most tasks are transcription plus tests. Running cheap and escalating failures matches the pass rate of running everything strong, at about half the cost |
| Review controller            | Opus 5.5, medium                                                                        | Dispatching, verification, browser check. The built-in `/code-review` isn't run automatically: at `max` it spent about $26 in two minutes on 10 parallel Opus agents                               |
| Reviewer                     | Opus 5.5, high                                                                          | The main quality gate; review is where Opus 5.5 gains most (more bugs found, fewer false alarms)                                                                                                   |
| Commit                       | Sonnet 5, medium                                                                        | Mechanical, but the staging rules protect the private PDF and secrets                                                                                                                              |

**Backstops:**

- `maxTurns` (implementer 200, reviewer 250, planner 300, about 1.5× the longest run seen) stops a looping agent; the controllers resume a capped agent once.
- The review package leaves out the `pnpm-lock.yaml` diff.
- Agents read failing gate logs with `tail` or `grep`.
- Every workflow agent has a fixed model and effort and can't start subagents (`disallowedTools: Agent`), so a step's cost is one agent at a time.

### Subagents started by other skills

A skill you run yourself can start subagents that none of these files control. `/code-review` is the main one:

- **How many:** the level sets the fan-out. At `max`, 10 finder agents run in parallel, then a verifier per candidate (up to 80) and a sweep.
- **Model and effort:** its agents are unassigned `general-purpose` subagents, so they run on the session's model and effort.

Four environment settings control subagents like these. This project's `.claude/settings.json` sets the first three; a new session picks them up. To change one for yourself only, override it in `.claude/settings.local.json`.

| Setting                                         | Effect                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1"`     | Subagents can't start subagents. `/code-review` then does every angle itself in one agent (the skill supports this). The workflow is unaffected: only its controllers start agents. Default 3                      |
| `CLAUDE_CODE_SUBAGENT_MODEL: "claude-sonnet-5"` | Model for subagents nothing else assigns (`general-purpose`, including `/code-review`'s). Pinned agents such as `phase-reviewer`, and a model passed per call, still win. Built-in Explore and Plan are unaffected |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "3"`     | At most this many subagents at once; further spawns fail until one finishes. Default 20. The workflow never runs two at once                                                                                       |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE: "1"`         | Forces the model above onto every subagent, overriding `model:` in the workflow's agents too. Don't use it with this workflow                                                                                      |

Check what a running subagent uses with `/tasks`: it shows each one's model and, when set, effort.

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

- `arguments: [phase]` makes `$phase` available in the text; `/phase-commit` also uses `$mode`. `/phase-plan` uses `$ARGUMENTS`, the whole input as typed.
- `argument-hint:` controls the autocomplete hint.
- `disable-model-invocation: true` means only you can trigger the skill; Claude never runs it on its own. Keep this for all four skills.
- `allowed-tools:` lists tools that run without a permission prompt during the skill, for example `phase-commit`'s git commands.

Some example changes:

- **Stop between tasks for your approval:** in `phase-implement/SKILL.md` step 2, add "after each task, stop and wait for the user's go-ahead".
- **Skip the built-in code review:** delete step 1 of `phase-review/SKILL.md`.
- **Different commit style:** edit section 3 of `phase-commit/SKILL.md` (subject format, trailers, default mode).
- **Push after merging:** add a step to `phase-commit`. The GitHub remote `origin` exists, but this workflow never pushes by default.
- **No roadmap checkpoint:** in `phase-plan/SKILL.md` step 5, drop the checkpoint question so planning runs straight through.
- **Plan without validation:** in `phase-plan/SKILL.md` step 6, tell the planners to skip "Prove it in the scratch repo". It's faster and cheaper, but the plans' code is then unverified.

### Change how plans are written

Every plan follows the "What the plan must contain" list in `.claude/agents/phase-planner.md`. Edit that list to change plan structure, for example "every task lists its manual test steps". The roadmap's sections are listed in step 5 of `phase-plan/SKILL.md`. Keep the `### Task N:` headings, the `` `path`: `` code-block labels and the `YYYY-MM-DD-<project>-NN-<slug>.md` file names: `/phase-implement`, the extractor and `phase-info.sh` depend on them.

### Use the workflow in another project

1. Copy `.claude/skills/`, `.claude/agents/`, `.claude/phase-workflow/` and `.claude/PHASE-WORKFLOW.md`, leaving out `CARRY-FORWARD.md` (start a fresh one).
2. Adapt the project-specific parts:
   - `ENVIRONMENT.md`: services, ports, env vars, code conventions;
   - `start-services.sh` and `stop-services.sh`: the compose project;
   - `gates.sh`: the commands and the service check;
   - `cleanup-processes.sh`: the process names;
   - `launch.json`.
3. Run `/phase-plan <requirements>`. In an empty repo it plans from phase 01.

### Add a quality gate

Edit `.claude/phase-workflow/scripts/gates.sh`, for example `run security pnpm audit --prod`. Every step already runs `gates.sh`, so the new gate applies everywhere.

### Change services or ports

The services are defined in the repo's `docker-compose.yml`; change images or settings there. The local Postgres port comes from `BIZSCOUT_PG_PORT` (default 55432, passed to compose as `POSTGRES_PORT`); httpbin's 8080 is fixed in the compose file. If you change a port, also update the URLs in `ENVIRONMENT.md`, the defaults in `gates.sh` and `apps/api/.env`. Stop the services with `bash .claude/phase-workflow/scripts/stop-services.sh`.

### Add a new skill

Create `.claude/skills/<name>/SKILL.md` with `name` and `description` frontmatter; it becomes `/<name>`. Add `context: fork` and `agent: phase-reviewer` to run it in that agent's isolated context.

### Check that everything loaded

- Type `/phase-` and all four commands should autocomplete.
- In an interactive terminal session, `/agents` lists `phase-planner`, `phase-implementer` and `phase-reviewer`. In the desktop app, just start a phase: the first dispatch fails loudly if an agent isn't loaded.
