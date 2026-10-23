# My Brand workspace

Scope label: **My Brand workspace**. The operator's own business inside this AI workspace. `AGENTS.md` and `CLAUDE.md` are identical.

## Structure

```
businesses/my-brand/
├── AGENTS.md · CLAUDE.md   this map
├── business.json           id, name, type, departments, status
├── context/                approved current facts (offer, audience, brand, accounts)
├── departments/            only the departments this business runs; content/ = the installed Content OS engine; content/nave-content-os/ = your content data
├── projects/               cross-department projects
├── memory/                 YYYY-MM-DD.md daily logs + bank/
├── wiki/                   LLM wiki (created on first ingest)
├── handover.md             written by /done, read by /continue
├── routines/  sessions/  tasks/
```

## Routing

- Business facts: `context/README.md`. Update only with the operator's confirmation.
- Content work: `departments/content/AGENTS.md` (the installed package's map); your data lives in `departments/content/nave-content-os/`.
- A request a studio handles (a post, a script, a thread, a design, or one of your own studios such as a coach or an audit): `departments/content/AGENTS.md`, section **Studios first**.
- Other departments: their `README.md`.
- Session state: `handover.md`, `memory/`, `tasks/`.

## Rules

- Everything learned about this business is written here and nowhere else.
- The workspace map (`../../AGENTS.md`) and `system/policies/operating-boundaries.md` remain authoritative.
