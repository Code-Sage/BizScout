---
name: phase-implement
description: Step 1 of the BizScout phase cycle. Implements one phase plan task by task with the phase-implementer agent (Sonnet 5, max effort) on a phase branch, leaving every change uncommitted for review.
argument-hint: <phase number 1-8>
arguments: [phase]
disable-model-invocation: true
model: claude-sonnet-5
effort: max
---

# Phase $phase: implement (step 1 of 4: implement → review → your manual review → commit)

You are the **controller**. You never write code or docs yourself. You delegate each plan task to the
`phase-implementer` agent, verify its work, and keep a resumable ledger. Nothing is committed in this step.

## 0. Set up

1. Start the services: `bash .claude/phase-workflow/scripts/start-services.sh`.
2. Resolve the phase: `eval "$(bash .claude/phase-workflow/scripts/phase-info.sh $phase)"`. This gives `PLAN`, `BRANCH` and `WORKSPACE`; use them below.
3. Make sure the workspace is git-ignored:
   ```bash
   mkdir -p "$WORKSPACE"
   [ -f .superpowers/phase-cycle/.gitignore ] || printf '*\n' > .superpowers/phase-cycle/.gitignore
   ```
4. **Resume or start.**
   - **Resume:** if `$WORKSPACE/progress.md` exists, you are resuming. Check out `$BRANCH` if you aren't on it. Tasks with a `Task N: done` line are finished; never re-dispatch them.
   - **Fresh start:** you must be on `main` with a clean tree (`git status --porcelain` prints nothing). If anything is dirty, stop and ask the user. Then run `git switch -c "$BRANCH"` (no commit), and create `$WORKSPACE/progress.md` with the first line `# Phase $phase ledger: $PLAN`.
5. Write the phase context: `bash .claude/phase-workflow/scripts/phase-context.sh "$PLAN" "$WORKSPACE/phase-context.md"`.
6. Read `.claude/phase-workflow/ENVIRONMENT.md`, `.claude/phase-workflow/CARRY-FORWARD.md` and the plan, once.
7. List the tasks: `grep -nE '^### Task [0-9]+' "$PLAN"`.
8. Flag tasks you won't dispatch: user actions such as creating accounts, provisioning hosted services, entering secrets, pushing, changing repo visibility, inviting people or sending messages. Record each as `Task N: pending user action: <what the user must do>`. When a task mixes code with provisioning, dispatch it for the code part only and say so in the dispatch.

## 1. Carry-forward items first

If CARRY-FORWARD.md has unchecked items for this phase (a heading naming Phase $phase, or "do first"):

1. Write `$WORKSPACE/task-0-brief.md`. Quote the items verbatim and ask for a fix with a test that fails before the fix and passes after.
2. Dispatch the `phase-implementer` agent for it, as described in step 2.
3. Record `Task 0 (carry-forward): done: <items>`.

`/phase-commit` ticks these items off later.

## 2. For each task, in order (never in parallel)

1. **Brief:** `bash .claude/phase-workflow/scripts/task-brief.sh "$PLAN" N "$WORKSPACE/task-N-brief.md"`.
2. **Dispatch** the `phase-implementer` agent and wait for it. Keep the prompt short, because the brief is the requirements. Include:
   - the phase number and task title;
   - the brief path, `$WORKSPACE/phase-context.md` and `.claude/phase-workflow/ENVIRONMENT.md`;
   - the report path `$WORKSPACE/task-N-report.md`;
   - notes on earlier tasks' deviations or rulings that affect this task (from their reports and the ledger);
   - "skip commit steps; leave changes uncommitted".
3. **Handle the reply:**
   - **DONE or DONE_WITH_CONCERNS:** read the concerns. Run `pnpm lint` and `pnpm typecheck` yourself. If either is red, resume the same agent with the failures. Then append `Task N: done: <one line; deviations if any>` to the ledger.
   - **NEEDS_CONTEXT:** answer from the plan, the spec (`docs/REQUIREMENTS.md`) and the roadmap, then resume the same agent. Record any ruling as `Ruling: <decision>: <why>: <cost if wrong>`.
   - **BLOCKED:** add context, or rule on a plan defect and resume. Stop and ask the user only for decisions that are irreversible, security-sensitive, need accounts or money, or when the plan is so broken that every path is a guess.
4. Never fix code yourself, never commit, and never dispatch two implementers at once.

## 3. Finish

1. Run `bash .claude/phase-workflow/scripts/gates.sh`, adding `--e2e` if an e2e package exists. If a gate is red, resume or dispatch a `phase-implementer` with the failures until green. Allow at most 3 rounds, then stop and report.
2. Write `$WORKSPACE/implementation-summary.md` covering: tasks done, deviations, rulings, skipped steps, pending user actions and the gate results.

## 4. Tear down

Do this at the end, AND before any early stop (a question to the user, a blocker, an error).

1. Run `bash .claude/phase-workflow/scripts/cleanup-processes.sh`. It stops any dev server, watcher or test runner still running from this repo.
2. Leave the Docker services (Postgres, httpbin) **running**: steps 2 and 3 need them. `/phase-commit` stops them at the end of the cycle.
3. Keep the branch, the uncommitted changes and `$WORKSPACE`. They are the input for `/phase-review`.

Then reply to the user with:

- the summary, in brief;
- the pending user actions;
- "Services are still running for the next step; stop them any time with `bash .claude/phase-workflow/scripts/stop-services.sh`."
- "Next: optionally switch the model picker to Opus 5.5 at Max, optionally run `/code-review ultra` yourself, then run `/phase-review $phase`."
