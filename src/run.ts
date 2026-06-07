import 'dotenv/config';
import { OctavusClient, WorkerError } from '@octavus/server-sdk';
import { githubToolHandlers } from './github-tools.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

const issueUrl = process.argv[2];
if (!issueUrl) {
  console.error('Usage: npm run dev -- https://github.com/owner/repo/issues/123');
  process.exit(1);
}

const baseUrl = process.env.OCTAVUS_API_URL || 'https://octavus.ai';
const workerAgentId = required('OCTAVUS_WORKER_AGENT_ID');
const apiKey = required('OCTAVUS_API_KEY');
const maxComments = Number(process.env.MAX_COMMENTS || 8);
const model = process.env.OCTAVUS_MODEL || 'anthropic/claude-sonnet-4-5';

const client = new OctavusClient({ baseUrl, apiKey });

try {
  const { output, sessionId } = await client.workers.generate(
    workerAgentId,
    { ISSUE_URL: issueUrl, MAX_COMMENTS: maxComments, MODEL: model },
    { tools: githubToolHandlers, signal: AbortSignal.timeout(120_000) }
  );

  console.log(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
  console.error(`\nDebug session: ${baseUrl}/sessions/${sessionId}`);
} catch (error) {
  if (error instanceof WorkerError) {
    console.error(`Worker failed: ${error.message}`);
    if (error.sessionId) console.error(`Debug session: ${baseUrl}/sessions/${error.sessionId}`);
  } else {
    console.error(error);
  }
  process.exit(1);
}
