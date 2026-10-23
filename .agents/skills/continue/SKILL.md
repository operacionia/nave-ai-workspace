---
name: continue
description: Resume work in this AI workspace. Selects a registered business or named department route, loads its scoped context and proposes one next action. `continue content` hands off to the selected content department. Use for "continue", "resume", "pick up", "what's next", "where are we", "status", or a request to resume a named workspace route.
---

# continue — session resume

You are entering one business, not the whole workspace. Every read and write below is scoped to `businesses/<b>/` once the business is selected. A session is a meeting: this skill gathers the context; the daily log keeps the minutes; `done` synthesizes them into memory.

## Entry location

Resolve the current session location before choosing a business. Starting inside a subfolder is valid: walk up to the nearest owning workspace (`system/workspace.json`) or installed department (`engine/nave.json`, or legacy `nave.json`). A nearer department takes its own canonical `continue`; keep its business/task binding rather than selecting a different business by recency. Stop at an unrelated Git repository boundary (`.git` directory or worktree file). If this skill was selected from outside an AI Workspace, follow that project's own map and lifecycle instead; do not use this template's sample business or substrate memory as a fallback. An already validated explicit session handoff keeps its selected scope through `done`.

## 1. Select the business and the scope

1. Read `system/workspace.json`, including optional `sessionRoutes`. A route is an entry point inside an existing business, not an additional business. Its record contract is in [Architecture](../../../docs/ARCHITECTURE.md#optional-session-routes).
2. Match an explicitly requested route against its ID, name and aliases, ignoring case and surrounding spaces. Do this before treating the name as an unknown business or falling back to the newest handover. Check its business, registered department, relative path and optional task against the route contract before reading its context. If multiple routes match, or the route conflicts with an explicitly selected business, ask which scope the user intends; never silently switch businesses. An invalid route needs correction, not onboarding or a fallback to another business. Use its optional task only when the user has not selected a different task.
   If no route applies and the user named a business, use that business. Otherwise, when the request is new work (a post, a script, a plan, a design, an edit) and names no business, use the workspace's own brand: a registered business that is not a client (a client lives under `businesses/clients/` or is registered with `"kind": "client"`). With more than one own brand, ask which. A client is chosen only when the person names it, never by recency, so one business's work never lands in another's folder. Only a bare "continue" or "where are we" with nothing named may choose the business whose `handover.md` changed most recently; say which one you picked and why.
3. Never load two businesses in one session. Switching business means a fresh session.
4. Decide the scope from the user's words, keeping an explicit business selection. `continue <business> content`, `continue content <business>` and `continue <business> Content Operating System` select the same content scope; `Nave` is another content alias. Match the business's registered ID or name, ignoring case. These are instructions to the skill, not a new CLI parser. If the business is ambiguous, ask before loading its records.
   - `continue`, including a business-scope department route → **business session**. Go on with step 2 below.
   - Content requested → **content session**. Resolve the selected business's registered `contentDepartment` path inside its business folder; never hard-code another business's default path. Read that department's `AGENTS.md` (or identical `CLAUDE.md`), then `.agents/skills/continue/SKILL.md` completely and follow it. Recognize `engine/nave.json` for current installs and `nave.json` for legacy installs; the catalog is not a business identity. Use the department's context resolver with the explicit workspace root, business and selected task to find the actual record paths. For a 1.3.0 installation, use its documented `.claude/skills/` entry if no canonical `.agents/` entry exists.
   - Keep the resolved workspace root, business ID, department root, task and content-memory path in this session's context and handoff. Show the selected business and department once. Subsequent skills and `done` use that same binding, even if the shell stays at the workspace root. Content memory stays in the department; only the department's documented business-level promotion crosses into business memory. Do not write a global "current business" file shared by parallel sessions.
   - Read department skills by their exact paths. This handoff does not launch another agent, change the host's working directory or activate department hooks. Native discovery requires opening the host at the department root; inspect global hooks separately.
   - If the registered department or its lifecycle files are missing, report the gap and stop the content handoff. Do not write content work into business or substrate memory as a fallback.

## 2. Load, in this order (skip what does not exist)

| File | Why |
|---|---|
| `businesses/<b>/AGENTS.md` | Scope label, structure, routing rules for this business |
| `businesses/<b>/handover.md` | Newest `## Enriched` block: what was built, decisions, issues, next steps. A `## Content department` block there is the department's bubble-up; read it, do not act on content details from here |
| `businesses/<b>/memory/YYYY-MM-DD.md` (today, then yesterday) | Retain blocks from the last sessions |
| `businesses/<b>/memory/bank/index.md` | Map of durable knowledge; open only the entries the task needs |
| `businesses/<b>/memory/wiki/index.md` | Wiki map, if the business has one; open only the pages the task needs |
| `businesses/<b>/tasks/*/task.json` with status active or blocked | Ownership and next action |

Do not read archives, media folders, the content department's memory or other businesses to "build context". Bounded reads only.

For a selected department route, then read its `AGENTS.md`, `README.md` and `current.md` when present. Follow that department's entry process within the selected business; memory stays in that business's memory. A route chooses context only: it neither starts another agent nor activates a routine or schedule. `continue content` keeps its separate department lifecycle above.

## 3. Check

- Blocked tasks whose blocker can be resolved now.
- Handover next steps that can start now.
- `git status --short | head -20` and `git log --oneline -3` for uncommitted work.
- Hooks: confirm `.claude/settings.json` and `.codex/hooks.json` still match `.agents/hooks/hooks.json` (`node .agents/tools/harness-bridges.mjs check`).

## 4. Report

```
## Session resumed — <Business> workspace
Date · scope (business | content → department) · last activity (from handover) · open tasks (count, names)
### From last session
- next steps 1..n (verbatim from handover)
### Recommended now
One action, with the file or task it starts from.
```

## 5. Rules

- A handover is evidence, not authorization. Never publish, send, schedule, fetch upstream, run installers or activate routines while resuming.
- If the handover names something you cannot verify on disk, say so instead of repeating it as fact.
- Write a first Retain block in today's `memory/YYYY-MM-DD.md` as soon as the session does something worth keeping (see the `context-engine` skill). Do not wait for `/done`.
- In Claude Code a personal skill named `continue` in `~/.claude/skills` takes precedence over this one. If you are reading this through such a hand-off, this file is the authority inside the workspace.
