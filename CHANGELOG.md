# Changelog

## 0.3.5 — 2026-10-15

- What the workspace is for: the business record carries `shape` (`business`, `personal-brand` or `agency`), which the Nave app asks beside the name; workspace setup treats it as answered.
- Inside the Nave app's first run, workspace setup is no longer an interview: Nave Guide fills the records from what the person already told the app and its opening, and writes them on one yes.

## 0.3.4 — 2026-10-14

- Inside the Nave app's first run, workspace setup hands back to Nave Guide's voyage (setting up and training the AI content team) instead of pointing to `continue`.

## 0.3.3 — 2026-10-14

- Workspace setup confirms the brand name with the operator (never keeps a placeholder) and carries the confirmed name the same way everywhere it is read: the registry name ("<Brand> AI Workspace", what the Nave app shows), the business name in `workspace.json` and `business.json`, and the business map's first line. Ids and folders stay. The business map no longer carries a placeholder note.

## 0.3.2 — 2026-10-13

- A request a studio handles, Nave's or the business's own (a coach, an audit, a method), goes through the content department's **Studios first** section from the workspace and business maps. Found by a drill: a plain request for a business's own studio never reached the content department.

## 0.3.1 — 2026-10-12

- New work that names no business goes to the workspace's own brand; a client is chosen only when the person names it, never by recency, so one business's work never lands in another's folder (`continue` and the workspace map). Found by a drill on a member-like workspace with a client.
- Introduced Nave AI Workspace as the member-facing name and rewrote the product introduction around organized work, projects, saved memory and AI employees. Moved implementation detail below the value and setup path; aligned the Nave content-department explanation. Runtime names, paths and existing media are unchanged.

- Aligned the product descriptions under Agentic AI Content: AI Workspace is where a business and its agents work; Nave is its separately installed content department.
- Clarified access, session memory, client-folder boundaries and setup. Kept the existing video files and links.
- Replaced the blanket template-pull advice with a reviewed update process that preserves an instance’s custom maps, registry and private records.

## 0.3.0 — 2026-09-27

- **New home.** The template now lives in the Agentic AI Content organization (`agentic-ai-content/nave-ai-workspace`). Canonical links in the operating maps, `docs/` and `system/workspace.json` are updated. Historical entries below keep their original wording.
- **Named department routes.** Optional `sessionRoutes` resolve a department route by name; validation and tests cover them. A route chooses context; it never starts an agent or a schedule. There is also a coordination guide in `system/operations/README.md`.
- **The README video is a new 66-second overview** in the Agentic AI Content brand, with original sound. It covers one place where you and your agents work, the same shape for every business, and Tuesday's decision saved by `/done` and read back by Wednesday's `/continue`. It then shows one source for Claude Code and Codex and where Nave, installed separately, fits. It replaces the 0.2.2 story and drops its unsupported claims: a memory percentage gauge, "every session starts from zero", "free". New `docs/media/ai-workspace-poster.png`; the full-length GIF is retired, and the MP4 carries the explanation. `docs/README-VIDEO.md` is rewritten around the new story, its sources and a pinned, offline render.
- **Copy corrected to match the facts.** The template is private, not a free or open gift. Client folders keep work scoped by routing, which is not a sandbox. `/continue` proposes a next step that builds on the last session rather than promising your voice. Nave's skill counts live in its own README instead of here. The video guide's question 7 now matches the onboarding skill.

## 0.2.2 — 2026-09-13

- The README video is a new 76-second story told in the Nave world (pixel cosmos, the crew, the ship), with sound: every session your agent starts from zero → give it a home → one structure the agent always knows (the business bay assembling with the crew) → it remembers and gets better every session (a real `/continue` and `/done` with a memory gauge that compounds over twelve sessions) → Claude Code or Codex on the same files → why I recommend it → what a content operating system is, the Nave ship docking in the content bay, and where to get access → use this template, it's free, it's yours. `docs/README-VIDEO.md` rewritten around the story, the sound and the sources.

## 0.2.1 — 2026-09-13

- The README video is a new 78-second piece with sound: a chat that forgets, the gift, the folder structure drawing itself, three reasons it matters (context, memory that compounds, agents that handle work), the two commands, what a content operating system is and where to get access, the close. Ambient bed synthesized locally; CC0 `nave-originals` effects. Hero GIF, silent full GIF and MP4 with sound under `docs/media/`; `docs/README-VIDEO.md` updated.
- The template is a complete, open, self-installable workspace and no longer carries any way to install the content operating system: install commands removed from the README, the operating maps, `docs/CONTENT-OS.md`, the onboarding skills, the development doc and the video guide. `docs/CONTENT-OS.md` now explains what a content operating system is, where it lives in a workspace, and that access comes with Agentic AI Content (nave.infinitxai.com/join).

## 0.2.0 — 2026-09-13

- README rebuilt as the front door of a free gift: Enrique Marq's channel avatar and handle, a 62-second explainer at the top (`docs/media/`), then what the workspace does, the functionality piece by piece, why to integrate it, install, the Content OS, and a documentation map. `docs/README-VIDEO.md` records what the video claims, the source of each claim, the beats and the regeneration procedure.
- Content OS documentation updated to the Nave `engine/` layout and 1.4.0-dev.8 (44 skills, 7 machines, 6 agents): `engine/install-crew.mjs plan | install | --bind-existing | --replace-engine | rollback`, the department tree with `nave-content-os/`, native versus hand-off sessions. Stale counts (52/59 skills, `machines/`, `in-production/`) removed from the maps and docs.
- `git-push.mjs` no longer falls back to a maintainer-specific secrets store; the token comes from the environment or the gitignored `.env` only. The `push` skill wording is generic.
- `system/operations/workspace-operations.mjs`: opt-in cooperative task ownership with revision-checked checkpoints, with its test suite; `system/tests/validate.test.mjs` added; `system/workflows/session-lifecycle.md` expanded to the full start/continue, done/checkpoint and content-session contract.
- Empty `piv` skill folder removed; the map already says no mandatory PIV loop.

## 0.1.5 — 2026-09-08

- The wiki lives inside the memory folder: `businesses/<b>/memory/wiki/` (daily logs, bank and wiki are one `memory/` folder); the panel reads it there.
- The business wiki is standard, not optional: every business folder ships `wiki/` (index, log, pages, raw); `done` ingests every session into it; `continue` reads its index (wiki is standard).
- `push` skill and `.agents/tools/git-push.mjs`: non-interactive pushes with a token from the gitignored `.env`, masked everywhere; `system/repos.json` lists extra repositories; `system/git-access.md` documents storage and rotation; `.env.example` added.

## 0.1.4 — 2026-09-08

- Native sync: `harness-watch.mjs` watches every canonical folder (root `.agents/`, each department's `.agents/` and overlay `skills/`) and regenerates all host folders within a second; started by the VS Code task on folder open and by the session-start hook. `sync` skill and `write --all` / `check --all` for the manual form; `after-edit` hook in both hosts; `install-git-hook` pre-commit check. Skills are authored with the native `skill-creator`.

## 0.1.3 — 2026-09-08

- Terminology table (AI Workspace, <Business> workspace, content department, Nave, `nave-content-os/`, business session, content session) and a Memory section: a session is a meeting, two memory rooms per business, promotion never copying.
- `continue content` hands off to the business's content department by reading its `continue`; `done` closes a content session through the department's `done`. `context-engine` rewritten around the two rooms.
- Harness rules verified against the official Claude Code and Codex docs; `.agents/hooks/hooks.json` manifest; `harness-bridges.mjs` renders `.claude/settings.json#hooks`, `.codex/hooks.json` and agent copies for both hosts.
- `llm-wiki` described as the business's synthesized knowledge base; one wiki per business, none per department.
- Content OS reference: 59 canonical skills, 7 agents, hooks and workflows under `.agents/`.

## 0.1.0 — 2026-09-07

First cut of the AI Workspace template, extracted from Enrique's workspace.

- Operating map `AGENTS.md` = `CLAUDE.md`; install page `README.md`; video guide.
- Canonical agent layer in `.agents/`: `continue`, `done`, `context-engine`, `llm-wiki`, `piv`, `workspace-onboard`, `business-onboard`; session-start hook; bridge generator.
- Generated Claude Code bridges in `.claude/skills`; hooks in `.claude/settings.json`.
- Business scaffold `businesses/my-brand/` in the standard shape.
- Docs: architecture, memory process (daily log, bank, LLM wiki, handover), harnesses (Claude Code and Codex), development, Content OS install.
- `system/`: registry, operating boundaries, session-lifecycle summary, validator.

## 0.1.1 — 2026-09-07

- Content OS contract aligned with the Nave package: the content department is the installed engine; the data folder is `nave-content-os/` (renamed from `content-production/`). Operator overlay (business-owned process and skills inside `nave-content-os/`) documented.

## 0.1.2 — 2026-09-08

- Install-location rule: a workspace is a regular folder the operator owns, never inside `Codex/`, `.codex/`, `.claude/`, another repository or a placeholder cloud folder. Enforced as warnings by `validate.mjs` and the session-start hook; `workspace-onboard` checks it before asking anything. The Content OS always lives inside a content department folder.
