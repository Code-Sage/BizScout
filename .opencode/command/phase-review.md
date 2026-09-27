---
description: Step 2 of the BizScout phase cycle (OpenCode). Reviews the uncommitted phase changes and fixes issues in code and docs with one phase-reviewer agent (GLM-5.3, high effort; no fan-out), then hands over to the user for manual review.
agent: build
model: opencode-go/glm-5.3
variant: high
---

# Phase $1: review and fix (step 2 of 4)

You are the review controller. Everything stays uncommitted.

## 0. Preconditions

1. Start the services: `bash .claude/phase-workflow/scripts/start-services.sh`.
2. Resolve the phase: `eval "$(bash .claude/phase-workflow/scripts/phase-info.sh $1)"`.
3. Check all three of these; if any fails, stop and tell the user what to run instead:
   - You are on `$BRANCH`.
   - `git status --porcelain` shows phase changes (anything besides `.claude/phase-workflow/CARRY-FORWARD.md`).
   - `$WORKSPACE/progress.md` has a `done` line (or `pending user action`) for every task in `grep -nE '^### Task [0-9]+' "$PLAN"`.
4. If the user ran an external review on these changes before this step (any level, their own or another tool's), collect its findings for step 1.

This command never runs a fan-out review itself. The `phase-reviewer` below runs the same kinds of check in one agent, with a fixed model, effort and step cap.

## 1. Review and fix: the phase-reviewer agent

1. Build the package: `bash .claude/phase-workflow/scripts/review-package.sh "$WORKSPACE/review-package.diff"`.
2. Dispatch the `phase-reviewer` agent with the task tool and wait for it. Give it:
   - the phase number, `$PLAN`, `$WORKSPACE/phase-context.md` and `.claude/phase-workflow/ENVIRONMENT.md`;
   - the package path;
   - the ledger `$WORKSPACE/progress.md` and the `task-*-report.md` files;
   - `.claude/phase-workflow/CARRY-FORWARD.md` and `docs/REQUIREMENTS.md`;
   - the user's external review findings from step 0, if any;
   - the report path `$WORKSPACE/review-report.md`.
3. If its reply leaves gates red, resume the same session (pass its `task_id` to the task tool) with the failures. Allow at most 3 rounds, then stop and report the state honestly. If it stops at its step limit, resume it once with "finish and report".
4. Start `$WORKSPACE/review-summary.md` with its verdict, and say which of the user's external findings it applied.

## 2. Verify it yourself

1. Run `bash .claude/phase-workflow/scripts/gates.sh`, adding `--e2e` if an e2e package exists. All gates must pass.
2. **UI phases only** (changes under `apps/web`): do a browser check when a browser tool is available to you (e.g. a Playwright MCP server).
   - Start `api` and `web` (`pnpm --filter @bizscout/api dev` and `pnpm --filter @bizscout/web dev`, ports 4000 and 5173).
   - Exercise the phase's user-facing flows, at desktop width and at 375 px.
   - Stop both servers afterwards and reset the viewport. If no browser tool is available, say so and leave this check to the user.

## 3. Tear down

Do this before handing over, AND before any early stop (a question to the user, a blocker, an error).

1. Run `bash .claude/phase-workflow/scripts/cleanup-processes.sh`. It catches any dev server, watcher or test runner still running, including ones the reviewer agent left behind.
2. Leave the Docker services **running**: while you apply the user's step-3 requests you'll re-run the gates. `/phase-commit` stops them.
3. Keep the branch, the uncommitted changes and `$WORKSPACE`.

## 4. Hand over for manual review (step 3 of 4)

1. Copy the reviewer's "Carry-forward" items into `.claude/phase-workflow/CARRY-FORWARD.md`, under the phase they belong to.
2. Complete `$WORKSPACE/review-summary.md` with the verdict, fixes (code and docs), later-plan amendments, deferred items, "needs your decision" items and the gate results.
3. List the changed files for the user so they can review the uncommitted changes (`git diff`, or the session's file-change view).
4. Reply with a concise summary, the items needing the user's decision, and this instruction:

   > Review the uncommitted changes (`git diff`, or the session's file-change view). Send change requests as `file:line: what to change` (or plain language). I'll apply them, re-run the gates and show the diff again. When you're happy, run `/phase-commit $1` (optionally `split` for one commit per area instead of one).

While applying the user's requests in step 3:

- keep everything uncommitted;
- run `start-services.sh` first if the services were stopped in between (it is safe to run anyway);
- re-run `gates.sh` after each batch;
- update any docs the change affects;
- run `cleanup-processes.sh` when a batch is done;
- re-show the changed files.
