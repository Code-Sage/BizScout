#!/usr/bin/env bash
# Usage: phase-info.sh PHASE_NUMBER
# Prints shell-style assignments for one phase: PLAN, SLUG, BRANCH, WORKSPACE.
#   eval "$(bash .claude/phase-workflow/scripts/phase-info.sh 4)"
# Plan files are named YYYY-MM-DD-<project>-NN-<phase-slug>.md, where <project> is one lowercase word
# and NN is the zero-padded phase number (the roadmap is NN = 00).
set -euo pipefail

phase="${1:?usage: phase-info.sh PHASE_NUMBER}"
[[ "$phase" =~ ^[1-9][0-9]?$ ]] || { echo "phase must be a number from 1 to 99, got: $phase" >&2; exit 2; }
nn="$(printf '%02d' "$phase")"

# Match the whole basename, so a date such as 2026-09-24 never passes for phase 9.
matches=()
for file in docs/superpowers/plans/*.md; do
  [[ "$(basename "$file")" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+-${nn}-[a-z0-9-]+\.md$ ]] && matches+=("$file")
done
[ "${#matches[@]}" -gt 0 ] || { echo "no plan file for phase $phase (docs/superpowers/plans/YYYY-MM-DD-<project>-$nn-<slug>.md)" >&2; exit 3; }
[ "${#matches[@]}" -eq 1 ] || { echo "more than one plan matches phase $phase: ${matches[*]}" >&2; exit 3; }

plan="${matches[0]}"
slug="$(basename "$plan" .md | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+-//')"   # e.g. 04-testing-ci
workspace=".superpowers/phase-cycle/phase-$phase"

echo "PLAN='$plan'"
echo "SLUG='$slug'"
echo "BRANCH='phase/$slug'"
echo "WORKSPACE='$workspace'"
