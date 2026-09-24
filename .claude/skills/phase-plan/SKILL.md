---
name: phase-plan
description: Step 0 of the BizScout phase cycle. Turns requirements (a PDF or other file, a URL, or text typed after the command) into a roadmap and validated phase plans in docs/superpowers/plans/, with Opus 5.5 at max effort and one phase-planner agent per phase.
argument-hint: <requirements.pdf | requirements text> [extra instructions]
disable-model-invocation: true
model: claude-opus-5-5
effort: max
---

# Plan phases from requirements (step 0: plan → implement → review → your manual review → commit)

You are the planning controller. You own the requirements, the decisions, the research and the roadmap. You dispatch one `phase-planner` agent per phase; each writes its plan and proves the plan's code by running it in a scratch repo. Nothing is committed.

Input: $ARGUMENTS

## 0. Set up

1. `DATE=$(date +%F)`.
2. Make sure the workspace is git-ignored:
   ```bash
   mkdir -p .superpowers/phase-plan
   [ -f .superpowers/phase-plan/.gitignore ] || printf '*\n' > .superpowers/phase-plan/.gitignore
   ```
3. **Resume or start.**
   - **Resume:** if a `.superpowers/phase-plan/*/progress.md` has no `Status: done` line, check the input.
     - With no input, resume it: `WS` is its folder.
     - With input, ask the user whether to resume it or start fresh. A fresh start leaves the old folder alone.
     - When resuming, skip every step the ledger marks done. Rebuild the scratch repo only if it's missing: replay the validated phases by resuming their planners.
   - **Fresh start:** once step 1 has named the project, set `WS=.superpowers/phase-plan/$DATE-<project>`. Create `$WS/progress.md` with the first line `# Phase-plan ledger: <project> ($DATE)`.

## 1. Take in the requirements

Read the input:

- **It starts with a path to an existing file** (quoted or not; names can contain spaces, so try the longest prefix that exists):
  - That file is the source.
  - Text after the path is the user's extra instructions. They override the source where the two conflict.
  - **PDF:** get the page count (`mdls -name kMDItemNumberOfPages <file>`), then read every page with the Read tool (`pages`, at most 20 per call), including tables and images.
  - **Markdown or text:** read it.
  - **Word or RTF:** `textutil -convert txt -stdout <file>`.
- **A URL:** fetch it with WebFetch, asking for the full requirements verbatim.
- **Any other text:** that text is the requirements.
- **Nothing:**
  1. Find candidates: `find . -maxdepth 3 \( -iname '*.pdf' -o -iname '*requirement*' -o -iname '*brief*' \) -not -path '*/node_modules/*'`.
  2. Ask with AskUserQuestion, one option per candidate. "Other" lets the user paste requirements.

Then:

1. **Name the project:** one lowercase word of letters and digits, e.g. `bizscout`. In extend mode (step 2), reuse the word in the existing plan file names.
2. **Keep the source:** save text or URL input verbatim to `docs/superpowers/requirements/$DATE-<project>-source.md`. A file is referred to by its path.
3. **Privacy:** if the source file is inside the repo and `git check-ignore -q <path>` fails, tell the user and offer to git-ignore it now. Never commit a private brief, or quote long passages of it anywhere.
4. **Write `$WS/requirements.md`:** every requirement, with:
   - an ID, grouped by letter (e.g. F functional, N non-functional, T testing, D deliverables, O optional tracks);
   - the source's own words (a short quote or close paraphrase);
   - where it sits in the source (page or section);
   - must, should or optional.

   Include the implicit ones too: deliverables, docs, time expectations, submission steps. A requirement you can't classify becomes a question for step 3.

5. **Ledger:** `Source: <path | text | URL>` and `Requirements: N extracted`.

## 2. Understand the ground

- **Greenfield** (no application code yet): plans start at phase 01, with a new `00` roadmap.
- **Extend** (the repo already has code or plans):
  1. New phases continue after the highest existing number: `ls docs/superpowers/plans | sed -nE 's/^[0-9-]{10}-[a-z0-9]+-([0-9]{2})-.*/\1/p' | sort -n | tail -1`.
  2. Update the existing roadmap in place; never write a second `00`.
  3. Read:
     - the roadmap and `docs/REQUIREMENTS.md`;
     - `.claude/phase-workflow/CARRY-FORWARD.md` and `ENVIRONMENT.md`;
     - the ADRs and the README.
  4. Map the code with the codebase-memory MCP: `index_repository` if needed, then `get_architecture` and `search_graph`. For wide sweeps, use the `Explore` agent.
  5. New requirements that conflict with what's built are questions for step 3.
- **Ledger:** `Mode: greenfield | extend; first phase NN`.

## 3. Decide, and ask the user once

1. List every fork the requirements leave open:
   - optional tracks ("choose one of…");
   - the stack, where it isn't fixed;
   - hosting and the data store;
   - real-time delivery and auth;
   - scope versus time.
2. Decide everything you can. Record each decision with its reason and the alternatives you considered; together they become the roadmap's decisions table.
3. Ask the user in ONE AskUserQuestion call: up to 4 questions, your recommendation first and marked "(Recommended)". Ask only about:
   - a choice between optional tracks;
   - the scope: MVP, Target or Full, with hours for each;
   - anything that costs money or needs the user's accounts;
   - conflicts with existing code.

   Skip any question the input already answers.

4. **Ledger:** `Decisions: <one line each>`.

## 4. Research before writing

Verify everything version- or service-specific today, rather than recalling it:

- **Skills:** before planning an area, load every installed skill whose description matches its technology, e.g. `claude-api` for Claude/LLM features, or the Figma skills when designs live in Figma.
- **Packages:** check `npm view <pkg> version`, `dist-tags` and `peerDependencies`, and pin major versions that work together. Do the same for other ecosystems through their registries. Avoid any release the registry marks deprecated or broken.
- **Images and actions:**
  - Docker image tags, from the Docker Hub API;
  - GitHub Action versions, from `https://api.github.com/repos/<owner>/<repo>/releases/latest`.
- **Hosted services:** take limits and pricing from the official pages (WebFetch or WebSearch). Quote the numbers and the date.
- **Risky APIs:** try them in a throwaway folder under `$WS` before a plan depends on them, e.g. type-check an SDK call or run a library's edge case.
- **Downloads:** before installing or pulling anything, ask the user ONCE. List the registries, Docker images and browsers the validation needs, with sources and approximate sizes. Pass the approved list to every planner.

Write the findings to `$WS/research.md`: a versions table with sources and dates, API facts, and service limits. **Ledger:** `Research: done`.

## 5. Roadmap, then a checkpoint

Write `docs/superpowers/plans/$DATE-<project>-00-roadmap.md`, or in extend mode update the existing roadmap. Use these sections, in order:

1. **Header:** the "For agentic workers" line, the **Goal**, and the **Spec**. The Spec names the source and `docs/REQUIREMENTS.md`, which the first phase creates or extends.
2. **Key decisions:** a table of Area | Decision | Why | Alternatives considered.
3. **Architecture:** a diagram and the data flow.
4. **Repository layout:** the end state.
5. **Phases:**
   - A table of # | Plan file | Outcome | Depends on | Est. | Priority, followed by "Why this order".
   - Each phase ends with a working, tested, committable increment, and its last task is its docs.
   - Order: the core first, then deploy early, then optional tracks once the core is live, then a final phase for docs and submission.
6. **Requirement traceability:** Requirement | ID | Where implemented (`P<phase>-T<task>`).
7. **Cut lines:**
   - MVP, Target and Full, each with hours and the task numbers it cuts.
   - The plans cover only the chosen scope. Everything cut is listed as future work.
8. **Risks and mitigations.**
9. **Conventions for every phase:**
   - TDD, commit style and trailer, branching;
   - imports, error format, logging, env validation;
   - the definition of done.
10. **Validation status:** filled in at step 7.
11. **How to execute:** `/phase-implement N` → `/phase-review N` → manual review → `/phase-commit N`.

**Checkpoint:** show the phases (one line each), the scope and the total estimate. Ask with AskUserQuestion:

- "Write and validate all phase plans" (Recommended);
- "Stop here so I can review the roadmap".

Apply any changes the user asks for first. **Ledger:** `Roadmap: approved`.

## 6. One phase-planner per phase, in order (never in parallel)

1. **Scratch repo** (once):
   - Greenfield: `git init -q "$WS/scratch"`.
   - Extend: `git clone -q --local . "$WS/scratch"`. This holds committed HEAD only; if there's uncommitted work, tell the user it isn't in the scratch repo.
2. **Dispatch** the `phase-planner` agent for phase N and wait for it. Keep the prompt short, because the files are the context. Give it:
   - the phase number, title and outcome from the roadmap;
   - the roadmap, `$WS/requirements.md` and `$WS/research.md`;
   - the earlier plans' paths and their `$WS/phase-*-report.md` files;
   - the scratch repo path and the compose project name `<project>-plan`;
   - the approved downloads;
   - the plan path: `docs/superpowers/plans/$DATE-<project>-NN-<slug>.md`;
   - the report path: `$WS/phase-N-report.md`.
3. **Check its work** yourself, and resume the same agent with anything missing:
   - `grep -nE '^### Task [0-9]+' <plan>`: tasks are numbered from 1 with no gaps.
   - `grep -niE 'TBD|TODO|implement later|similar to task|add appropriate|fill in' <plan>` finds only code that really means it.
   - `bash .claude/phase-workflow/scripts/phase-context.sh <plan> "$WS/ctx.md"` succeeds.
   - `bash .claude/phase-workflow/scripts/phase-info.sh N` resolves to this plan.
   - `node .claude/phase-workflow/scripts/extract-plan-code.mjs <plan> --list` lists the files the file map promises.
   - `git -C "$WS/scratch" log --oneline -1` shows the phase commit.
4. **Handle the reply:**
   - **Roadmap issues:** fix the roadmap, then resume or re-dispatch the planners they affect.
   - **NEEDS_CONTEXT or BLOCKED:** answer from the requirements, the decisions and the research. Ask the user only the kind of question step 3 allows.
5. **Ledger:** `Phase N: validated: <task count>, <validation line>, not executed: <…>`.

## 7. Review the whole set

1. **Coverage:** every requirement ID in the traceability table points to a task that exists and does what the ID says.
2. **Interfaces:** each phase consumes exactly the names, types, routes and env vars an earlier phase produces. Check the reports' "Interfaces produced" sections against the later plans.
3. **No reverts:** find every path that more than one plan writes as a full file (`extract-plan-code.mjs --list` per plan). The later block must keep what the earlier one built, unless replacing it is the point.
4. **Scope:** the cut lines name real tasks, and the estimates add up to the chosen scope.
5. **Validation status:** fill in the roadmap section with:
   - the measured results;
   - what wasn't executed, and why;
   - the plan fixes that running the code forced.

Fix what you find, in the plans or the roadmap. If a fix changes code, re-run that phase in the scratch repo: resume its planner, or dispatch a new one. **Ledger:** `Review: done`.

## 8. Tear down

Do this at the end, AND before any early stop (a question to the user, a blocker, an error).

1. If `$WS/scratch` has a compose file, run `docker compose -p <project>-plan down -v` there. Never touch other compose projects.
2. Run `bash .claude/phase-workflow/scripts/cleanup-processes.sh`.
3. At the end only:
   - `rm -rf "$WS/scratch"` and any trial folders;
   - keep the ledger, `requirements.md`, `research.md` and the reports;
   - append `Status: done` to the ledger.

## 9. Hand over

Reply with:

- the plan files, each with its task count and estimate;
- the chosen scope, and what was cut;
- the decisions, marking the ones the user made;
- the validation results, and what wasn't executed;
- the pending user actions.

Then: "Review the plans in `docs/superpowers/plans/`; I'll apply any changes you ask for. Then start a new session, set the model picker to Sonnet 5 at Max, and run `/phase-implement <first new phase>`."

Nothing is committed. If `docs/superpowers/` is git-ignored, the plans stay local until you commit them.
