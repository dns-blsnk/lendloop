// Rebuilds the n8n workflow JSON, then fails when the result differs from what is committed (new
// files included) or when any export contains something that looks like a secret. Secrets belong
// in env and n8n credentials, never in workflow JSON.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const exportDirs = ['n8n/workflows', 'n8n/credentials'];

// Long hex runs, private keys, bearer tokens, and non-empty password/secret fields.
const SUSPICIOUS = [
  /\b[a-f0-9]{32,}\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/,
  /"(password|secret|apiKey|token|accessToken)"\s*:\s*"[^"]+"/i,
];

execFileSync('node', [join(root, 'n8n/src/build.mjs')]);

const problems = [];
for (const dir of exportDirs) {
  for (const file of readdirSync(join(root, dir)).filter((name) => name.endsWith('.json'))) {
    const text = readFileSync(join(root, dir, file), 'utf8');
    for (const pattern of SUSPICIOUS) {
      if (pattern.test(text)) {
        problems.push(`${dir}/${file}: matches ${String(pattern)}`);
      }
    }
  }
}

// Files the rebuild changed or created and nobody has staged or committed: "XY path" where the
// work-tree column Y is set, or "??" for untracked files.
const changed = execFileSync('git', ['status', '--porcelain', '--', 'n8n/workflows'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter((line) => line.startsWith('??') || (line.length > 1 && line[1] !== ' '))
  .join('\n');
if (changed !== '') {
  problems.push(`n8n/workflows differs from n8n/src; commit the rebuilt files:\n${changed}`);
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('n8n exports: up to date, no secrets found.');
