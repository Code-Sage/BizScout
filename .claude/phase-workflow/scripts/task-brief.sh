#!/usr/bin/env bash
# Usage: task-brief.sh PLAN_FILE TASK_NUMBER OUTFILE
# Extracts the full text of "### Task N" (up to the next Task heading) from a phase plan,
# ignoring headings inside fenced code blocks.
set -euo pipefail

plan="${1:?usage: task-brief.sh PLAN_FILE TASK_NUMBER OUTFILE}"
n="${2:?task number required}"
out="${3:?output file required}"

awk -v n="$n" '
  /^```/ { infence = !infence }
  !infence && /^#+[ \t]+Task[ \t]+[0-9]+/ {
    intask = ($0 ~ ("^#+[ \t]+Task[ \t]+" n "([^0-9]|$)"))
  }
  intask { print }
' "$plan" > "$out"

[ -s "$out" ] || { echo "task $n not found in $plan" >&2; exit 3; }
echo "wrote $out: $(wc -l < "$out" | tr -d ' ') lines"
