import 'dotenv/config';
import { getGitHubIssue, searchRepoCode } from './github-tools.js';

const issueUrl = process.argv[2] || 'https://github.com/octavus-ai/agent-sdk/issues/1';
const context = await getGitHubIssue({ issueUrl, maxComments: 3 });
const repo = context.repo.fullName;
const firstSearchTerm =
  context.issue.labels[0] ||
  context.issue.title.split(/\s+/).find((word: string) => word.length > 5) ||
  context.issue.title.split(/\s+/)[0];

let snippets: Awaited<ReturnType<typeof searchRepoCode>> = [];
try {
  snippets = await searchRepoCode({ repo, query: firstSearchTerm, maxResults: 5 });
} catch {
  // Public repos can still be briefed even if a local clone/search fails.
}

console.log(`# Mock issue brief input\n`);
console.log(`Repo: ${context.repo.fullName} (${context.repo.primaryLanguage ?? 'unknown language'})`);
console.log(`Issue: #${context.issue.number} ${context.issue.title}`);
console.log(`Labels: ${context.issue.labels.join(', ') || 'none'}`);
console.log(`Comments fetched: ${context.comments.length}`);
console.log(`Code snippets for "${firstSearchTerm}": ${snippets.length}`);
console.log('\nThis mock command exercises the same server-side tools the Octavus worker receives.');
console.log('Run `npm run dev -- <issue-url>` after syncing the worker to get the LLM-written brief.');
