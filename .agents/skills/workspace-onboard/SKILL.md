---
name: workspace-onboard
description: First-run interview that turns a freshly cloned AI Workspace template into an operator's workspace — asks about the business, brand, goal, departments, clients, harness and existing material, then writes workspace.json and the first business folder. Triggers on "set up my workspace", "onboard my workspace", "new AI workspace", "/workspace-onboard".
---

# workspace-onboard — the interview comes before the folders

Status: specification (September 7, 2026). Runs once per workspace. Adds businesses with `business-onboard` afterwards.

## Rules

- One question at a time. Skip anything already answered or visible in supplied material.
- "Help me decide" and "leave this open" are valid answers; record them as open items, never fill them with invented facts.
- Show every proposed file before writing it. Nothing is written until the operator says yes.
- Never ask for passwords or API keys. Never connect accounts.
- Create only the departments the operator confirms. There is no default department list.

## Step 0 — Check the location before asking anything

Run `node system/tests/validate.mjs` and read its `warnings`. If the workspace path contains `Codex`, `.codex`, `.claude` or `node_modules`, sits inside another git repository, or is in a cloud "online only" folder, stop and tell the operator to move the folder to a regular location they own (for example `Documents/<brand>-ai-workspace`) before continuing. Do not create business folders in a wrong location.

## Question bank

1. **Operator and business.** Your name. The business or brand name, exactly as it should read everywhere (setup may already have filled one in: read it back and ask "Is this your brand's real name?" before treating it as answered; never keep a placeholder such as "My Brand"). In one or two sentences, what does it do and for whom?
2. **Shape.** Is this a personal brand, a company, an agency, or several brands you own? Do you manage clients? Name them. When the business's `business.json` already has a `shape` (the Nave app asks it beside the name: `business`, `personal-brand` or `agency`), the shape is answered: keep it, and for an agency ask only whether they manage clients.
3. **First useful result.** What should this workspace help you with first? One concrete result (a script, an offer page, a weekly plan, a client deliverable), not a list.
4. **Departments.** Which functions do you actually run today? Offer examples only if asked: content, community, sales, services, website, operations, app, analytics, finance. Who manages each?
5. **Harness.** Claude Code, Codex, both, or another agent? The files are identical either way; the answer decides which adapter folder to explain.
6. **Existing material.** Brand assets, documents, a previous workspace or archive to bring in? Where is it? (Import is a separate reviewed step; this only records the source.)
7. **Content.** Do you run content as a department? If yes, `departments/content/` is created like any other department. A content operating system (Nave) is not part of this template and is not installed here; if the operator is a member of Agentic AI Content, they install it later from their own package into that folder.

## Output

Written after approval:

- `workspace.json`: operator, `name` ("<Brand> AI Workspace", the name the Nave app shows for this workspace), businesses (id, name, path, departments), installed capabilities, and `status` / `onboardingStatus` set to done once the operator approves.
- The brand name the operator confirmed, the same in every place it is carried: the registry `name`, the business `name` in `workspace.json` and `business.json`, and the first line of the business's `AGENTS.md`/`CLAUDE.md`. Ids and folder names stay as they are (renaming a folder breaks paths); only the names people read change.
- `businesses/<brand>/`: `business.json` (with `shape`: `business`, `personal-brand` or `agency`, as answered), `AGENTS.md` + identical `CLAUDE.md` (first line "<Brand> workspace"), `README.md`, `context/README.md` filled from the answers, `departments/<each confirmed>/README.md`, `projects/`, `memory/bank/index.md`, `handover.md` with the first useful result as the next step, `routines/`, `sessions/`, `tasks/`.
- `businesses/clients/` only when clients were named; each client then goes through `business-onboard`.
- If content was confirmed: `departments/content/README.md` like any other department. Nothing is downloaded or installed; a content operating system, when the operator has one, goes into that folder later through its own installer.

## Variants the answers produce

| Answers | Shape |
|---|---|
| Personal brand or agency with clients | `businesses/<brand>/` + `businesses/clients/<client>/` |
| Single business, no clients | `businesses/<brand>/` |
| Several own brands | `businesses/<brand-a>/`, `businesses/<brand-b>/` |
| Team lead inside a company | `businesses/<company>/` with only their departments |

## Close

Read back: business, shape, first result, departments, Nave yes/no, open items. Then hand off: `/continue` for the first working session, `business-onboard` per client, Nave `$brand-setup` per content department.

Inside the Nave app's first run this is not an interview. Nave Guide fills the workspace's records from what the person already told the app (the name, what the workspace is for, what they make) and the Guide's opening questions (what to call them, their formats, platforms and rhythm), in the same conversation, before the voyage that sets up and trains the person's AI content team. Step 0 runs quietly and only a problem is said. Ask nothing the app or the opening answered, treat the content question as answered (Nave is installed), leave departments beyond content, the harness and existing material for later, and show what will be written in one short message, in plain words, written on one yes. Then hand back to the Nave Guide's first-run path (the person's team, role by role, then the stops with the studios), not to `/continue` or `$brand-setup`.
