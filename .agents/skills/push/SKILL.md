---
name: push
description: Push committed work to GitHub from this workspace without interactive prompts and without exposing a token. Covers the workspace itself and the repositories listed in system/repos.json (for example a Nave package checkout). Triggers on "push", "push to github", "sync the repos", "publish the commits", "/push", "$push".
---

# push — commits to GitHub, token never shown

An agent session cannot answer an interactive password prompt, and a GitHub CLI login is not always present. This skill uses the workspace's own tool, which reads a token from the workspace `.env` at push time and masks it everywhere.

## Run

```
node .agents/tools/git-push.mjs --status --all     # what is ahead, behind or dirty, no push
node .agents/tools/git-push.mjs --all              # push everything that is committed and ahead
node .agents/tools/git-push.mjs --repo <path>      # one repository
```

Report the JSON per repository: `PUSHED`, `IN-SYNC`, `REFUSED` (uncommitted changes), `NO-TOKEN`, `FAILED`, `SKIPPED` (no remote) or `DIVERGED`.

## Rules

- Commit first, with explicit paths, never `-A`. The tool refuses a dirty tree; `--allow-dirty` only when the uncommitted files are deliberately left out of the push.
- The token is read from `.env` at the workspace root (`GITHUB_TOKEN=`, optional `GITHUB_USER=`), gitignored. Never paste it in chat, a commit, a memory file or a log. If the tool says `NO-TOKEN`, the operator stores it; see `system/git-access.md`.
- `DIVERGED` means the remote has commits this machine does not: fetch and merge by hand before pushing again; never force.
- Pushing is outward-facing: run it when the operator asked for it or authorized it for the session, and say what was pushed, by commit.
