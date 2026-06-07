import { readFileSync, existsSync } from 'node:fs';
import YAML from 'yaml';

const root = 'agents/issue-brief-worker';
const settingsPath = `${root}/settings.json`;
const protocolPath = `${root}/protocol.yaml`;

for (const path of [settingsPath, protocolPath, `${root}/prompts/system.md`, `${root}/prompts/issue-request.md`]) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
}

const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
if (settings.format !== 'worker') throw new Error('settings.json must use format=worker');
if (!settings.slug || !settings.name) throw new Error('settings.json needs slug and name');

const protocol = YAML.parse(readFileSync(protocolPath, 'utf8'));
for (const key of ['input', 'variables', 'tools', 'steps', 'output']) {
  if (!(key in protocol)) throw new Error(`protocol.yaml missing ${key}`);
}

console.log('Agent files look structurally valid. Use `npm run agents:validate` with an Octavus API key for platform validation.');
