---
name: sync
description: Regenerate every host folder from the canonical .agents layer, for the AI Workspace root and every registered content department in one go, so Claude Code and Codex always see the same skills, agents and hooks. Run after creating or improving any skill, agent or hook (authoring itself is done with the native skill-creator). Triggers on "sync", "sync skills", "sync the harness folders", "regenerate bridges", "update the other folders", "/sync", "$sync".
---

# sync — one canonical layer, every host up to date

Everything an agent needs is authored once under `.agents/` (skills, agents, hooks) or, for a business's own content skills, under `departments/content/nave-content-os/skills/`. Each host reads its own generated folder (`.claude/`, `.codex/`). This skill makes sure those generated folders are never behind, everywhere at once. Skills are written with the native `skill-creator`; this skill runs right after.

## Run

```
node .agents/tools/harness-bridges.mjs write --all
node .agents/tools/harness-bridges.mjs check --all
```

`--all` covers the workspace root and every business in `system/workspace.json` whose `contentDepartment` ships `engine/tools/skill-bridges.mjs` or the older `tools/skill-bridges.mjs`. Each department is regenerated with its own generator, so a 1.3.0-layout install (real skills still under `.claude/skills`) gets its Codex-facing bridges and a 1.4.0 install gets its Claude-facing ones.

## Report

```
## Harness sync
workspace: <status> · bridges N · agents N · hooks yes/no
<business> → <department>: <status> · bridges N · overlay N · legacy N · agents N
Issues: none | list
```

Any issue is fixed in the canonical file (never in a generated one) and `sync` runs again.

## When it runs by itself

- After every file write under `.agents/` or an overlay `skills/` folder, the `after-edit` hook runs this in both hosts (Claude Code through `.claude/settings.json`, Codex through `.codex/hooks.json` once the operator trusted the hook).
- Before every commit, when the git hook is installed: `node .agents/tools/harness-bridges.mjs install-git-hook`. A commit with stale host folders is refused with the command to run.

If a host has no hooks enabled, run this skill by hand at the end of any session that touched a skill, agent or hook.

## Rules

- Never edit a generated file; `sync` overwrites them. Edit the canonical file and run `sync`.
- A department is regenerated only through its own generator; this skill never writes into `nave-content-os/`.
- `sync` writes generated host files only. It never installs packages, fetches anything or changes permissions.
