---
name: phase-commit
description: Step 4 of the BizScout phase cycle. After the user's manual review, commits the approved phase (one commit, or split by area) and merges it into main locally. Never pushes.
argument-hint: <phase number 1-8> [single|split]
arguments: [phase, mode]
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git add *) Bash(git commit *) Bash(git log *) Bash(git switch *) Bash(git merge *) Bash(git rev-parse *) Bash(git ls-files *)
---

# Phase $phase: commit (step 4 of 4)

The user invoked this skill themselves, and that is their approval to commit phase $phase. Mode: "$mode". Empty means `single`.

## 1. Preconditions

1. Resolve the phase: `eval "$(bash .claude/phase-workflow/scripts/phase-info.sh $phase)"`. You must be on `$BRANCH`, with uncommitted changes.
2. Start the services (`bash .claude/phase-workflow/scripts/start-services.sh`), then run `bash .claude/phase-workflow/scripts/gates.sh`, adding `--e2e` if an e2e package exists.
3. If any gate fails: run `bash .claude/phase-workflow/scripts/cleanup-processes.sh`, leave the services running (the user will want to fix and retry), show the failures and stop. Do not commit.

## 2. Choose what to stage

List the changes with `git status --porcelain` and `git ls-files --others --exclude-standard`. Stage by **explicit path** only; never `git add -A` or `git add .`.

**Include** every modified or new file of the phase, including docs.

**Exclude:**

- the private brief PDF (`BizScout - Take Home Test*.pdf`);
- any `.env` file (`.env.example` is fine);
- `.claude/` (workflow tooling), unless the user said to include it. The one exception is `.claude/phase-workflow/CARRY-FORWARD.md`, which is always committed with the phase (see section 3);
- `.superpowers/`;
- `docs/superpowers/`, except in Phase 8, whose plan commits the plans deliberately;
- build and report output: `dist/`, `coverage/`, `playwright-report/`, `test-results/`.

Before staging, scan the candidate files for secret-looking values:

```bash
git diff HEAD | grep -nE "sk-ant-|hooks\.slack\.com/services|pooler\.supabase\.com|INTERNAL_API_TOKEN=[0-9a-f]{16,}"
```

Also check new files by name. If anything turns up, stop and ask.

## 3. Commit

First update `.claude/phase-workflow/CARRY-FORWARD.md`, so that it lands in the phase commit:

- tick the items this phase completed;
- under "Completed phases", add `Phase $phase (<plan title>): merged <date>, branch $BRANCH`.

Each commit message follows Conventional Commits and ends with a trailer for each model that authored the work:

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

(Sonnet 5 implemented, Opus 5.5 reviewed and fixed. If the work used other models, name them instead.)

- **`single` (default):** one commit, subject `feat: phase $phase <plan title>` (use `docs:` or `test:` if that fits the phase better). The body lists the main changes, the deliberate deviations from the plan, and anything left for the user. Take these from `$WORKSPACE/implementation-summary.md` and `review-summary.md`.
- **`split`:** a few logical commits grouped by area or task, reusing the plan's own commit messages where they fit.

## 4. Merge and wrap up

1. Merge:
   ```bash
   git switch main
   git merge --no-ff "$BRANCH" -m "Merge phase $phase: <title>"
   ```
   Add the same trailers to the merge message. Never push, and keep the phase branch.
2. Run `bash .claude/phase-workflow/scripts/gates.sh` on `main`.

## 5. Tear down (end of the cycle)

1. Run `bash .claude/phase-workflow/scripts/cleanup-processes.sh`.
2. Run `bash .claude/phase-workflow/scripts/stop-services.sh`, unless the user asked to keep the services running (e.g. for their own `pnpm dev`). The database data is kept, so the next `start-services.sh` resumes where it left off.
3. Delete the phase workspace: `rm -rf "$WORKSPACE"`. Git history is the record now.
4. Keep the phase branch `$BRANCH`; it's merged, and deleting it is the user's call.

If anything in section 3 or 4 fails (commit refused, merge conflict, red gates on `main`): do step 1 only, keep the services and the workspace, report exactly where it stopped, and ask the user.

Report the commits (`git log --oneline -5`), the gate results, what was torn down, and any pending user actions. Close with: "Next phase: start a new session, then `/phase-implement <N>`."
