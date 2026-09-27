#!/usr/bin/env node
// Prints a markdown coverage table for $GITHUB_STEP_SUMMARY.
// Usage: node scripts/coverage-summary.mjs <path/to/coverage-summary.json> "<title>"
import { readFileSync } from 'node:fs';

const [file, title = 'Coverage'] = process.argv.slice(2);
if (!file) {
  console.error('usage: coverage-summary.mjs <coverage-summary.json> [title]');
  process.exit(1);
}

const { total } = JSON.parse(readFileSync(file, 'utf8'));
const metrics = ['lines', 'statements', 'functions', 'branches'];
const rows = metrics.map(
  (metric) =>
    `| ${metric} | ${total[metric].pct}% | ${total[metric].covered}/${total[metric].total} |`,
);

process.stdout.write(
  [`### ${title}`, '', '| Metric | % | Covered |', '|---|---|---|', ...rows, ''].join('\n') + '\n',
);
