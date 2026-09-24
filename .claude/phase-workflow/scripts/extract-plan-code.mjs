// Usage: node extract-plan-code.mjs PLAN_FILE OUT_DIR [--list] [--overwrite-package-json]
//
// Writes every full-file code block in a phase plan into OUT_DIR, so the plan's code can be run as
// written. A block counts as a full file when the line just before its fence (up to 3 lines above)
// labels it with a path, in one of these forms:
//   `path/to/file.ts`:
//   Create `path/to/file.ts`:            (also Replace / Update / Overwrite)
//   - [ ] **Step 3: Create `path/to/file.ts`**
// Partial edits ("Modify `path`: replace … with …") are NOT extracted; apply those by hand, exactly as
// the plan words them. A later block for the same path wins, so the extracted tree is the plan's end
// state. Existing package.json files are kept (the plan adds dependencies with `pnpm add`), unless
// --overwrite-package-json is given. --list prints the labelled paths without writing anything.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const [plan, outDir] = args.filter((arg) => !arg.startsWith('--'));
if (!plan || (!outDir && !flags.has('--list'))) {
  console.error(
    'usage: node extract-plan-code.mjs PLAN_FILE OUT_DIR [--list] [--overwrite-package-json]',
  );
  process.exit(2);
}

const lines = fs.readFileSync(plan, 'utf8').split('\n');
const labelPatterns = [
  /^`([^`\s]+)`:\s*$/,
  /^(?:Create|Replace|Update|Overwrite) `([^`\s]+)`[^`]*:\s*$/,
  /\*\*Step \d+: (?:Create|Replace|Write|Overwrite|Update) `([^`\s]+)`[^`]*\*\*/,
];
const looksLikePath = (label) =>
  /\//.test(label) || /\.[\w.]+$/.test(label) || /^\.?[\w-]+rc$/.test(label);

const files = new Map();
for (let i = 0; i < lines.length; i++) {
  const text = lines[i].trim().replace(/^- \[[ x]\] /, '');
  const label = labelPatterns.map((re) => re.exec(text)?.[1]).find(Boolean);
  if (!label || !looksLikePath(label)) continue;

  let j = i + 1;
  while (j < lines.length && j <= i + 3 && !/^\s*`{3,}/.test(lines[j])) j++;
  const fence = /^\s*(`{3,})/.exec(lines[j] ?? '')?.[1];
  if (!fence) continue;

  const body = [];
  let k = j + 1;
  for (; k < lines.length && lines[k].trim() !== fence; k++) body.push(lines[k]);
  files.set(label, body.join('\n') + '\n');
  i = k;
}

let written = 0;
for (const [rel, content] of files) {
  if (flags.has('--list')) {
    process.stdout.write(`${rel}\n`);
    continue;
  }
  if (path.isAbsolute(rel) || rel.split('/').includes('..')) {
    console.error(`skipped ${rel}: paths must stay inside OUT_DIR`);
    continue;
  }
  const dest = path.join(outDir, rel);
  if (
    path.basename(rel) === 'package.json' &&
    fs.existsSync(dest) &&
    !flags.has('--overwrite-package-json')
  ) {
    console.error(`kept existing ${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  process.stdout.write(`${rel}\n`);
  written++;
}
console.error(
  `${files.size} labelled file blocks${flags.has('--list') ? '' : `, ${written} written`}`,
);
