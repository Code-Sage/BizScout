#!/usr/bin/env bash
# Usage: review-package.sh OUTFILE
# Writes every uncommitted change (tracked edits + new untracked files) relative to HEAD into one file,
# excluding .claude/ (workflow tooling) and git-ignored paths. Reviewers read this instead of running git.
set -euo pipefail

out="${1:?usage: review-package.sh OUTFILE}"
exclude=(':(exclude).claude')

{
  echo "# Uncommitted changes on $(git branch --show-current) (HEAD $(git rev-parse --short HEAD))"
  echo
  echo "## Status"
  git status --short -- . "${exclude[@]}"
  echo
  echo "## Tracked changes (stat)"
  git diff HEAD --stat -- . "${exclude[@]}"
  echo
  echo "## Tracked changes"
  git diff HEAD -U10 -- . "${exclude[@]}"
  echo
  echo "## New files"
  git ls-files --others --exclude-standard -- . "${exclude[@]}" | while IFS= read -r file; do
    echo
    echo "### $file"
    git diff --no-index -- /dev/null "$file" || true
  done
} > "$out"

echo "wrote $out: $(wc -c < "$out" | tr -d ' ') bytes"
