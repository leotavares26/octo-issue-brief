# Octo Issue Brief

A tiny maintainer tool that turns a GitHub issue URL into an implementation brief.

Paste an issue, let an Octavus worker fetch the thread, optionally search the repo code, then return a compact plan a maintainer can act on before opening an editor.

Built by [Leo Tavares](https://github.com/leotavares26), DevRel @ Google DeepMind, because issue triage is one of those small maintainer loops that should be faster.

## Why this is useful

OSS maintainers spend a lot of time re-reading issue threads before deciding what to do. It compresses that loop into a short brief:

- what the issue actually says
- evidence from labels, comments, and repo snippets
- likely code areas
- a suggested fix plan
- tests to run
- a ready-to-post maintainer reply

## How it works

```text
GitHub issue URL
      │
      ▼
Octavus worker protocol (agents/issue-brief-worker)
      │
      ├─ calls get-github-issue on your server
      ├─ can call search-repo-code on your server
      │
      ▼
LLM writes the maintainer brief
```

The important bit: GitHub access stays in your backend. If you add `GITHUB_TOKEN`, the token is only used by the local tool handler, not exposed in the agent protocol or client UI.

## Repo layout

```text
agents/issue-brief-worker/   # Octavus worker definition
  protocol.yaml              # inputs, tools, worker steps, output
  prompts/                   # system + task prompts
src/github-tools.ts          # server-side tool handlers
src/run.ts                   # runs the Octavus worker
src/mock.ts                  # exercises the tools without an Octavus key
scripts/                    # lightweight project checks
```

## Quick start

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```bash
OCTAVUS_API_URL=https://octavus.ai
OCTAVUS_API_KEY=              # Sessions/worker execution key
OCTAVUS_CLI_API_KEY=          # Agents permission, used for sync/validate
OCTAVUS_WORKER_AGENT_ID=      # filled after sync
OCTAVUS_MODEL=anthropic/claude-sonnet-4-5
GITHUB_TOKEN=                 # optional
```

Sync the worker to your Octavus project:

```bash
npm run agents:sync
```

Or zip and upload the `agents/issue-brief-worker` folder in the Octavus Platform UI.

Copy the returned or displayed agent ID into `OCTAVUS_WORKER_AGENT_ID`, then run:

```bash
npm run dev -- https://github.com/octavus-ai/agent-sdk/issues/1
```

If you only want to test the tool plumbing without Octavus credentials:

```bash
npm run mock -- https://github.com/octavus-ai/agent-sdk/issues/1
```

## Example output shape

```md
## TL;DR
The issue reports a reproducible failure around <specific behavior>. It looks scoped to <likely area>.

## Facts from the issue
- Reporter saw <symptom> on <version/environment>.
- Label/comment evidence points to <constraint>.

## Likely code areas
- `src/...`: snippet mentions <symbol>.
- `packages/...`: likely owns <behavior>.

## Suggested implementation plan
1. Add a failing regression test for <case>.
2. Update <function/module> to handle <edge>.
3. Preserve existing behavior for <non-goal>.

## Tests to run
- `npm test -- <target>`
- Manual check: <scenario>

## Maintainer reply draft
Thanks for the clear report. I can reproduce the path from <evidence>. The likely fix is in <area>; I’ll add a regression test before changing it.
```

## Design notes

- **Declarative agent behavior**: the worker is defined in YAML, not a pile of orchestration code.
- **Server-owned tools**: GitHub API and local repo search run in your process, so credentials stay private.
- **Agentic search loop**: the model can choose targeted code searches before writing the brief.
- **Portable integration**: any Node backend can run the same worker through `@octavus/server-sdk`.

## Development

Local config lives in `.env`; start from `.env.example` and keep your own keys out of git. Before pushing changes, run:

```bash
npm run check
```

## License

MIT
