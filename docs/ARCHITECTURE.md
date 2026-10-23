# Architecture

## Two products, one pattern

| Thing | What | Where |
|---|---|---|
| AI Workspace template | This repository: operating map, agent layer, business scaffold, docs. No business data, no engine. | `agentic-ai-content/nave-ai-workspace` |
| Nave — Content OS | A crew of skills (the machines among them), specialist agents, a catalog, tools and a panel that a business's content department can hold. Not part of this template; members of Agentic AI Content install it separately. | `agentic-ai-content/nave` (members) |
| An operator's workspace | A private instance of the template with real businesses and installed packages. | `<brand>-ai-workspace`, the operator's own repository |

The template and the package never contain business data. An instance never edits the package in place; a member installs a version and receives updates as new versions.

## Root

```
<brand>-ai-workspace/
├── AGENTS.md                the operating map. Read first by every harness.
├── CLAUDE.md                identical copy; the filename Claude Code reads.
├── README.md                install page (template only; delete it in your instance if it competes with the map).
├── .agents/                 canonical agent layer, Agent Skills format
│   ├── skills/              continue · done · sync · push · context-engine · llm-wiki · workspace-onboard · business-onboard
│   ├── hooks/               hooks.json · session-start.sh · after-edit.sh
│   └── tools/               harness-bridges.mjs · harness-watch.mjs · git-push.mjs
├── .claude/                 generated: skills/ bridges + settings.json hooks
├── .codex/                  generated: hooks.json (+ agents/ if any)
├── businesses/
│   ├── <brand>/             the operator's own business
│   └── clients/<client>/    only when there are clients
├── docs/                    architecture · memory · harnesses · development · Content OS · README video · media/
└── system/                  workspace.json, policies/, workflows/, operations/, tests/
```

Why each root item exists:

- **AGENTS.md / CLAUDE.md**: one map, two names. Scope, structure, how to select a business, where facts and memory live, the session loop, the boundaries. Root, each business and the installed package each have their own identical pair.
- **.agents/**: everything the workspace itself needs from an agent, once. Codex reads `.agents/skills` natively.
- **.claude/**: Claude Code reads only `.claude/skills`, so the bridge tool writes a pointer per canonical skill. Regenerate after editing a skill. Hooks are declared in `settings.json`.
- **businesses/**: all business data. See below.
- **.codex/**: Codex reads `.agents/skills` natively, so only hooks (and agents, if any) are rendered here.
- **system/**: the registry the tools read (`workspace.json`), the boundaries, the session-lifecycle contract, the opt-in cooperative task-ownership helper (`operations/`), the validator and tests. Small on purpose; operator records do not live here.

## Where a workspace lives

A workspace is a regular folder the operator owns, for example `Documents/<brand>-ai-workspace`. Rules, enforced as warnings by `system/tests/validate.mjs` and the session-start hook:

- Not inside a tool folder: no `Codex/`, `.codex/`, `.claude/`, `node_modules/` anywhere in the path.
- Not inside another git repository.
- Not in a cloud-synced folder that keeps files as placeholders (OneDrive or Dropbox "online only"); hosts read empty files there.
- Opened in the harness at the folder that contains `AGENTS.md`, not at a parent.

In this template, an installed Nave content department belongs at `businesses/<b>/departments/content/`. Nave can also be installed in another private workspace using its supported binding; this template is optional. Keep a reusable product source checkout separate from the business's installed department.

## Business folder

```
businesses/<business>/                (or businesses/clients/<client>/)
├── AGENTS.md · CLAUDE.md             first line: "<Business> workspace"
├── README.md · business.json
├── context/                          approved current facts
├── departments/                      only the departments this business runs
│   └── content/                      the installed Nave package: AGENTS.md · CLAUDE.md · .agents/ (its skills) · engine/ (catalog · runtime · tools · installer · panel)
│       └── nave-content-os/          this business's content data (brand/ · strategy/ · assets/ · projects/ · memory/ · configuration/ · optional skills/ overlay)
├── projects/                         cross-department projects
├── memory/                           YYYY-MM-DD.md daily logs + bank/ + wiki/ (the synthesized knowledge base)
├── handover.md                       newest Enriched block first
├── routines/ · sessions/ · tasks/
```

Departments are never a fixed list. The interview creates what the business runs: content, community, sales, services, website, operations, app, analytics, finance, or others.

The content department is the installed package itself; `nave-content-os/` inside it is the business's data. Package updates replace the engine and never touch the data. The install is staggered: workspace → business → department (= package) → `nave-content-os/` data. A business may keep its own process and skills inside `nave-content-os/` (operator overlay) without forking the product.

## Optional session routes

A business can give an existing department a memorable entry name. Add `sessionRoutes` to an instance's `system/workspace.json` only when needed; the blank template does not enable any routes. `continue` matches a requested ID, name or alias without case sensitivity, then loads the owning business and that department's entry documents. It does not launch an agent, schedule work or create a new business.

Example for a synthetic business whose `community` department and `weekly-review` task already exist:

```json
{
  "sessionRoutes": [
    {
      "id": "community-review",
      "name": "Community Review",
      "aliases": ["Community check-in"],
      "businessId": "my-brand",
      "department": "community",
      "path": "businesses/my-brand/departments/community",
      "scope": "business",
      "taskId": "weekly-review"
    }
  ]
}
```

`aliases` and `taskId` are optional. IDs use lowercase letters, digits and hyphens. Each route needs a nonempty name and `scope: "business"`; `continue content` retains its own separate content-department lifecycle. Route IDs, names and aliases must not match another route after trimming spaces and ignoring case. Repeating the same label within one route is harmless.

The business must be registered, the department must appear in its `business.json`, and `path` must be the workspace-relative path to that department. Absolute paths, traversal and links outside the selected business are rejected. If supplied, `taskId` must name an existing `tasks/<taskId>/task.json` with matching `id` and `businessId`. `node system/tests/validate.mjs` checks these records. Validation is a configuration check, not a filesystem sandbox.

An explicit user-selected task takes precedence over the route default. A conflict between an explicitly selected business and a requested route needs clarification; do not silently switch business or fall back from a broken route to a different one. Department context uses the owning business's memory.

## Variants

| Answers in the interview | Shape |
|---|---|
| Single business | `businesses/<brand>/` |
| Personal brand or agency with clients | `businesses/<brand>/` + `businesses/clients/<client>/` |
| Several own brands | `businesses/<brand-a>/`, `businesses/<brand-b>/` |
| Team lead inside a company | `businesses/<company>/` with only their departments |

## Naming

| Item | Convention |
|---|---|
| Instance repository | `<brand>-ai-workspace` |
| Business folder | kebab-case name |
| Scope label | `<Business> workspace` |
| Content OS install (engine) | `departments/content/` |
| Content OS data | `departments/content/nave-content-os/` (package contract) |
| Daily memory | `memory/YYYY-MM-DD.md` |
| Handover | `handover.md` at the business root |
| Agent maps | `AGENTS.md` = `CLAUDE.md` |
