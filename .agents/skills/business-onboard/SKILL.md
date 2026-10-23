---
name: business-onboard
description: Interview that adds one business or client to an existing AI Workspace — scoped questions, then a business folder in the standard shape registered in workspace.json. Triggers on "add a client", "onboard a business", "new client folder", "/business-onboard".
---

# business-onboard — one more business, same shape

Status: specification (September 7, 2026). Requires an existing workspace (`workspace.json` present). Never copies another business's folder as a starting point.

## Rules

Same as `workspace-onboard`: one question at a time, skip known answers, "help me decide" and "leave this open" are valid, show files before writing, no credentials, only confirmed departments.

## Questions

1. Business or client name; what it does and for whom; who your contact is.
2. Is it your own brand or a client? (Own brands sit in `businesses/<brand>/`; clients in `businesses/clients/<client>/`.)
3. What are you doing for this business? The engagement or goal in one sentence.
4. Which departments does this engagement touch? Create only those.
5. Existing material to bring in (brand files, previous work, an archive)? Where? Import is a separate reviewed step.
6. Content as a department for this business? If yes, `departments/content/` is created like any other department. A content operating system is not installed by this workspace; a member installs it later from their own package.

## Output

`businesses/<path>/` with `business.json`, `AGENTS.md` + identical `CLAUDE.md` (first line "<Business> workspace"), `README.md`, `context/README.md`, confirmed `departments/`, `projects/`, `memory/bank/index.md`, `memory/wiki/index.md` + `memory/wiki/log.md` (empty, the synthesized knowledge base `done` fills), `handover.md`, `routines/`, `sessions/`, `tasks/`. A new entry in `workspace.json`. Client folders are added to `.gitignore` when the operator wants them kept out of the repository.

## Close

Read back the scope and open items. Remind: open a fresh session per client; never combine client context.
