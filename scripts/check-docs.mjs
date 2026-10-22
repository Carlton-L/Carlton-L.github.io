// Checks the docs against section 9 of docs/workflow.md, apart from the product tests.
//
//   npm run check:docs
//
// Every RFC and ADR (docs/rfc/, docs/decisions/) has a status line near the top, and every
// prototype (docs/prototypes/) starts with one in an HTML comment. A status is draft, accepted,
// current or "superseded by <link>", then a date: `Status: accepted · 2026-10-22`. Nothing under
// .agent-work/ is tracked. A folder that doesn't exist yet is skipped. Prints every problem and
// exits 1 if there are any.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const STATUS = /Status: (draft|accepted|current|superseded by \S+) · \d{4}-\d{2}-\d{2}/;
const problems = [];

const files = (dir, ext) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => join(dir, f)) : [];

for (const file of [...files('docs/rfc', '.md'), ...files('docs/decisions', '.md')]) {
  const line = readFileSync(file, 'utf8').split('\n').slice(0, 10).find((l) => l.startsWith('Status:'));
  if (!line) problems.push(`${file}: no Status: line in the first 10 lines`);
  else if (!STATUS.test(line)) problems.push(`${file}: status is not "<status> · YYYY-MM-DD": ${line}`);
}

for (const file of files('docs/prototypes', '.html')) {
  const line = readFileSync(file, 'utf8').split('\n')[0];
  if (!line.startsWith('<!-- Status:')) problems.push(`${file}: does not start with a <!-- Status: … --> comment`);
  else if (!STATUS.test(line)) problems.push(`${file}: status is not "<status> · YYYY-MM-DD": ${line}`);
}

const tracked = execFileSync('git', ['ls-files', '.agent-work'], { encoding: 'utf8' }).trim();
if (tracked) for (const file of tracked.split('\n')) problems.push(`${file}: tracked; .agent-work/ stays local`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('docs ok');
