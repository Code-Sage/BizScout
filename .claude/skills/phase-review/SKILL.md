---
name: phase-review
description: Step 2 of the BizScout phase cycle. Reviews the uncommitted phase changes and fixes issues in code and docs with Opus 5.5 at max effort (built-in code review + the phase-reviewer agent), then hands over to the user for manual review.
argument-hint: <phase number 1-8>
arguments: [phase]
disable-model-invocation: true
model: claude-opus-5-5
effort: max
---

# Phase $phase: review and fix (step 2 of 4)

You are the review controller. Everything stays uncommitted.

## 0. Preconditions

1. Start the services: `bash .claude/phase-workflow/scripts/start-services.sh`.
2. Resolve the phase: `eval "$(bash .claude/phase-workflow/scripts/phase-info.sh $phase)"`.
3. Check all three of these; if any fails, stop and tell the user what to run instead:
   - You are on `$BRANCH`.
   - `git status --porcelain` shows phase changes (anything besides `.claude/phase-workflow/CARRY-FORWARD.md`).
   - `$WORKSPACE/progress.md` has a `done` line (or `pending user action`) for every task in `grep -nE '^### Task [0-9]+' "$PLAN"`.
4. If the user already ran `/code-review ultra` in this session, collect its findings for step 2.

## 1. Correctness pass: built-in code review

Invoke the built-in `code-review` skill with the arguments `max --fix` on the current uncommitted changes. Then run `bash .claude/phase-workflow/scripts/gates.sh`, and fix anything the review's edits broke.

Record in `$WORKSPACE/review-summary.md`:

- what `code-review` found and changed;
- the `/code-review ultra` findings, if any, and whether you applied them. Apply every Critical or Important one; treat Minor ones by the same rules as step 2.

## 2. Holistic pass: phase-reviewer agent

1. Build the package: `bash .claude/phase-workflow/scripts/review-package.sh "$WORKSPACE/review-package.diff"`.
2. Dispatch the `phase-reviewer` agent and wait for it. Give it:
   - the phase number, `$PLAN`, `$WORKSPACE/phase-context.md` and `.claude/phase-workflow/ENVIRONMENT.md`;
   - the package path;
   - the ledger `$WORKSPACE/progress.md` and the `task-*-report.md` files;
   - `.claude/phase-workflow/CARRY-FORWARD.md` and `docs/REQUIREMENTS.md`;
   - a note of what step 1 already fixed;
   - the report path `$WORKSPACE/review-report.md`.
3. If its reply leaves gates red, resume the same agent with the failures. Allow at most 3 rounds, then stop and report the state honestly.

## 3. Verify it yourself

1. Run `bash .claude/phase-workflow/scripts/gates.sh`, adding `--e2e` if an e2e package exists. All gates must pass.
2. **UI phases only** (changes under `apps/web`): do a browser check.
   - Start `api` and `web` with the built-in browser's preview tool; the configs are in `.claude/launch.json`.
   - Exercise the phase's user-facing flows, at desktop width and at 375 px.
   - Stop both servers afterwards (preview stop) and reset the viewport.

## 4. Tear down

Do this before handing over, AND before any early stop (a question to the user, a blocker, an error).

1. Run `bash .claude/phase-workflow/scripts/cleanup-processes.sh`. It catches any dev server, watcher or test runner still running, including ones the reviewer agent left behind.
2. Leave the Docker services **running**: while you apply the user's step-3 requests you'll re-run the gates. `/phase-commit` stops them.
3. Keep the branch, the uncommitted changes and `$WORKSPACE`.

## 5. Hand over for manual review (step 3 of 4)

1. Copy the reviewer's "Carry-forward" items into `.claude/phase-workflow/CARRY-FORWARD.md`, under the phase they belong to.
2. Complete `$WORKSPACE/review-summary.md` with the verdict, fixes (code and docs), later-plan amendments, deferred items, "needs your decision" items and the gate results.
3. Open the diff pane for the uncommitted changes (`show_pane` with pane `diff` and diff_scope `uncommitted`).
4. Reply with a concise summary, the items needing the user's decision, and this instruction:

   > Review the diff pane. Send change requests as `file:line: what to change` (or plain language). I'll apply them, re-run the gates and show the diff again. When you're happy, run `/phase-commit $phase` (optionally `split` for one commit per area instead of one).

While applying the user's requests in step 3:

- keep everything uncommitted;
- run `start-services.sh` first if the services were stopped in between (it is safe to run anyway);
- re-run `gates.sh` after each batch;
- update any docs the change affects;
- run `cleanup-processes.sh` when a batch is done;
- reopen the diff pane.
