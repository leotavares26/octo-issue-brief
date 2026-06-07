import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ToolHandlers } from '@octavus/server-sdk';

const execFileAsync = promisify(execFile);

export type IssueRef = {
  owner: string;
  repo: string;
  number: number;
  fullName: string;
  issueUrl: string;
};

function asString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function asInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function parseIssueUrl(issueUrl: string): IssueRef {
  const url = new URL(issueUrl);
  if (url.hostname !== 'github.com') throw new Error('Only github.com issue URLs are supported');

  const [owner, repo, type, number] = url.pathname.split('/').filter(Boolean);
  if (!owner || !repo || type !== 'issues' || !number) {
    throw new Error('Expected a GitHub issue URL like https://github.com/owner/repo/issues/123');
  }

  const issueNumber = Number(number);
  if (!Number.isInteger(issueNumber)) throw new Error(`Invalid issue number: ${number}`);

  return { owner, repo, number: issueNumber, fullName: `${owner}/${repo}`, issueUrl };
}

async function github<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'octo-issue-brief-demo',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status} for ${path}: ${text.slice(0, 280)}`);
  }
  return (await res.json()) as T;
}

function compactBody(body: string | null | undefined, limit = 4000): string {
  const text = (body ?? '').replace(/\r/g, '').trim();
  return text.length > limit ? `${text.slice(0, limit)}\n…[trimmed]` : text;
}

export async function getGitHubIssue(args: Record<string, unknown>) {
  const ref = parseIssueUrl(asString(args.issueUrl, 'issueUrl'));
  const maxComments = asInteger(args.maxComments, 8, 0, 25);

  const [repo, issue, comments] = await Promise.all([
    github<any>(`/repos/${ref.owner}/${ref.repo}`),
    github<any>(`/repos/${ref.owner}/${ref.repo}/issues/${ref.number}`),
    maxComments > 0
      ? github<any[]>(`/repos/${ref.owner}/${ref.repo}/issues/${ref.number}/comments?per_page=${maxComments}`)
      : Promise.resolve([])
  ]);

  return {
    repo: {
      fullName: ref.fullName,
      url: repo.html_url,
      description: repo.description,
      defaultBranch: repo.default_branch,
      primaryLanguage: repo.language,
      stars: repo.stargazers_count,
      openIssues: repo.open_issues_count
    },
    issue: {
      number: issue.number,
      url: issue.html_url,
      title: issue.title,
      state: issue.state,
      author: issue.user?.login,
      labels: (issue.labels ?? []).map((label: any) => label.name),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      body: compactBody(issue.body)
    },
    comments: comments.map((comment: any) => ({
      author: comment.user?.login,
      createdAt: comment.created_at,
      body: compactBody(comment.body, 1200)
    }))
  };
}

export async function searchRepoCode(args: Record<string, unknown>) {
  const repo = asString(args.repo, 'repo');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('repo must be owner/name');

  const query = asString(args.query, 'query');
  const maxResults = asInteger(args.maxResults, 8, 1, 20);
  const dir = await mkdtemp(join(tmpdir(), 'octo-issue-brief-'));

  try {
    await execFileAsync('git', ['clone', '--depth', '1', `https://github.com/${repo}.git`, dir], {
      timeout: 60_000,
      maxBuffer: 1_000_000
    });

    const { stdout } = await execFileAsync('git', ['-C', dir, 'grep', '-n', '-I', '-F', '--', query], {
      timeout: 30_000,
      maxBuffer: 2_000_000
    }).catch((error: any) => ({ stdout: error.stdout ?? '' }));

    return stdout
      .split('\n')
      .filter(Boolean)
      .slice(0, maxResults)
      .map((line: string) => {
        const [path, lineNumber, ...rest] = line.split(':');
        return { path, line: Number(lineNumber), snippet: rest.join(':').trim().slice(0, 500) };
      });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export const githubToolHandlers: ToolHandlers = {
  'get-github-issue': getGitHubIssue,
  'search-repo-code': searchRepoCode
};
