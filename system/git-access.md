# Git access — how this workspace pushes

Agent sessions cannot answer an interactive password prompt, and a GitHub CLI login is not always present. The workspace pushes with a token, read at push time by `.agents/tools/git-push.mjs`, exposed as the `push` skill (`/push` in Claude Code, `$push` in Codex).

## Where the token lives

`.env` at the workspace root, gitignored (copy `.env.example`):

```
GITHUB_TOKEN=<token with "Contents: read and write" on your repositories>
GITHUB_USER=<the GitHub login the token belongs to>   # optional
```

Resolution order: process environment (`GITHUB_TOKEN`, `GH_TOKEN`), then `.env`. The tool never prints the token and replaces it with `***` in any git message.

## Repositories

The workspace itself is always pushed first (add its remote with `git remote add origin <url>`). Other repositories you maintain from here go in `system/repos.json`. `node .agents/tools/git-push.mjs --status --all` shows ahead/behind/dirty counts without pushing.

## Never

Never commit `.env`, never echo the token, never store it in memory files, handovers, skills or a panel. A leaked token is revoked on GitHub and replaced here.
