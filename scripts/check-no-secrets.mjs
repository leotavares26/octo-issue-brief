import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'package-lock.json', 'dist', 'coverage']);
const secretPatterns = [
  /oct_[A-Za-z0-9_\-]{20,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /ANTHROPIC_API_KEY\s*=\s*\S+/g,
  /OPENAI_API_KEY\s*=\s*\S+/g
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (stat.size < 500_000) scan(path);
  }
}

function scan(path) {
  const text = readFileSync(path, 'utf8');
  for (const pattern of secretPatterns) {
    const matches = text.match(pattern);
    if (matches) throw new Error(`Potential secret in ${path}: ${matches[0].slice(0, 12)}…`);
  }
}

walk(root);
console.log('No obvious secrets found.');
