#!/usr/bin/env bash
# Usage: phase-context.sh PLAN_FILE OUTFILE
# Writes the plan's header — goal, architecture, spec, Global Constraints, file map — i.e. everything
# before the first "### Task" heading. Every task brief is read together with this file.
set -euo pipefail

plan="${1:?usage: phase-context.sh PLAN_FILE OUTFILE}"
out="${2:?output file required}"

awk '
  /^```/ { infence = !infence }
  !infence && /^#+[ \t]+Task[ \t]+[0-9]+/ { exit }
  { print }
' "$plan" > "$out"

[ -s "$out" ] || { echo "could not extract the header of $plan" >&2; exit 3; }
echo "wrote $out: $(wc -l < "$out" | tr -d ' ') lines"
