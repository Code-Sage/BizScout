#!/usr/bin/env bash
# Usage: phase-info.sh PHASE_NUMBER
# Prints shell-style assignments for one phase: PLAN, SLUG, BRANCH, WORKSPACE.
#   eval "$(bash .claude/phase-workflow/scripts/phase-info.sh 4)"
set -euo pipefail

phase="${1:?usage: phase-info.sh PHASE_NUMBER}"
[[ "$phase" =~ ^[1-9]$ ]] || { echo "phase must be a single digit 1-9, got: $phase" >&2; exit 2; }

matches=(docs/superpowers/plans/*-0"$phase"-*.md)
[ -f "${matches[0]}" ] || { echo "no plan file matches docs/superpowers/plans/*-0$phase-*.md" >&2; exit 3; }
[ "${#matches[@]}" -eq 1 ] || { echo "more than one plan matches phase $phase: ${matches[*]}" >&2; exit 3; }

plan="${matches[0]}"
slug="$(basename "$plan" .md | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z]+-//')"   # e.g. 04-testing-ci
workspace=".superpowers/phase-cycle/phase-$phase"

echo "PLAN='$plan'"
echo "SLUG='$slug'"
echo "BRANCH='phase/$slug'"
echo "WORKSPACE='$workspace'"
