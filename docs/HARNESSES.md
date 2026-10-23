# Harnesses and models — your work across AI tools

The workspace's projects, memory and skills live in ordinary files. A capable harness can read those instructions, work with the selected business and save the results. The harness supplies file access, tools and a model connection; the model alone does not operate the workspace.

Claude Code and Codex have generated adapters in this repository. OpenClaw, Hermes and other capable harnesses can use their supported skill discovery or follow the canonical instructions by path. These routes share records and methods; they do not promise identical hooks, delegation or model performance.

## Included Claude Code and Codex adapters

The table records this template's adapter targets and the discovery guidance checked on September 8, 2026. It is not a certification of every current host version. When diagnosing a host, inspect the generated files and the actual loaded skill path; use that host's current documentation for version-specific behavior.

| | Codex | Claude Code |
|---|---|---|
| Skills discovered from | `.agents/skills` in the working directory and every parent up to the repository root (`.git`); `~/.agents/skills`; `.codex/skills` in trusted projects. Never `.claude/`. | `.claude/skills` in the start directory and parents up to the repository root; `~/.claude/skills`; plugins. Nested `.claude/skills` in subfolders load lazily as `/<path>:<skill>`; `--add-dir <folder>` loads a folder's skills. Never `.agents/`. |
| Same name twice | Not merged, not shadowed; both appear | Personal beats project; skills beat legacy `.claude/commands` |
| Invoke a skill | `$name`, or automatically when the description matches | `/name`, or automatically when the description matches |
| Subagents | `.codex/agents/*.toml` (`name`, `description`, `developer_instructions`); `~/.codex/agents` | `.claude/agents/*.md` (frontmatter + instructions); `~/.claude/agents`; plugins |
| Hooks | `.codex/hooks.json` or `config.toml` `[hooks]`; same event names; project hooks only in a trusted project and after the operator trusts the hook (`/hooks`); output is JSON with `additionalContext` | `.claude/settings.json` (also `settings.local.json`, user settings, plugin `hooks/hooks.json`) |
| Instructions file | `AGENTS.md`, concatenated from the repository root down to the working directory (32 KiB cap) | `CLAUDE.md` |
| Workflow execution | Follow the canonical skill with available tools; delegation only when supported | Follow the canonical skill with available tools; delegation only when supported |
| Reads the other's folder? | No | No |

## How the workspace stays identical for both

- **One author location**: `.agents/`. Skills in the Agent Skills format (`skills/<name>/SKILL.md`), agents in `agents/<name>.md` (Claude's format is the canonical one), hooks in `hooks/hooks.json` with the scripts beside it. `.agents/` is a standard for skills only; no host reads agents or hooks from it, which is why they are generated.
- **Generated host files**: `node .agents/tools/harness-bridges.mjs write` creates `.claude/skills/<name>/SKILL.md` pointer bridges, `.claude/agents/<name>.md` copies, the `hooks` key of `.claude/settings.json` (every other key is the operator's), `.codex/agents/<name>.toml` and `.codex/hooks.json`. `check` fails on drift and is part of the test run.
- **One map, two names**: `AGENTS.md` and `CLAUDE.md` are identical. The validator requires both.
- **Discovery walks up, never down**: a business's content department is a nested folder, so its skills, agents and hooks are native only when the host is opened there. From the workspace root, `continue content` reaches it by reading its `continue` by path (skills then read by path; department hooks do not fire); Claude Code can also `--add-dir` it.

Nave uses the same canonical-input/generated-adapter pattern (`engine/tools/skill-bridges.mjs`). Each installed department has its own map, records and setup; matching adapter patterns do not guarantee identical host execution.

## Shadowing

In Claude Code a personal skill in `~/.claude/skills` with the same name as a project skill takes precedence. Before following a skill, confirm which file loaded. Personal `continue`, `done` and memory skills should delegate when `system/workspace.json` (workspace), `engine/nave.json` (current department) or `nave.json` (legacy department) exists. Resolve `.agents/skills/` from the department root, not `engine/`. This changes the skill route, not global hook execution. Codex can list both workspace and department skills; use their paths and descriptions to select the intended lifecycle.

From the workspace root, `continue <business> content` (or `<business> Content Operating System`) selects that registered department and loads its map and lifecycle by path. Keep the selected business, task and department memory through `done`. For first-time setup, read that department's `start` instead of restarting business onboarding. This does not create a separate agent or make nested hooks run.

The same contract applies to any business name, repository location and nested client path. From a subfolder, find the nearest owning marker and stop at an unrelated `.git` directory or worktree file. Prefer the current department over its enclosing workspace; resolve skills from the department root. A missing or malformed managed lifecycle is a reported setup gap, never permission to write into a different memory room. An ordinary repository uses its own canonical lifecycle or its documented local process; it does not acquire Nave or substrate memory automatically. Personal routing helpers are optional local integrations, not a dependency shipped with this template.

## Other harnesses

Keep `.agents/skills/` as the author location. Configure the harness to read that directory instead of maintaining another editable copy.

- **Hermes:** its documented skill discovery includes a trusted project's `.agents/skills/`; `skills.external_dirs` can point to additional skill directories. Check trust, working directory and skill precedence. [Hermes skills documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills).
- **OpenClaw:** its documented workspace discovery includes `.agents/skills/`; `skills.load.extraDirs` can include additional directories. Configure the workspace and sandbox access for the folder you intend to use. [OpenClaw skills documentation](https://docs.openclaw.ai/tools/skills).
- **Other harnesses:** use supported Agent Skills discovery, or ask the agent to read the root `AGENTS.md` and the selected `.agents/skills/<name>/SKILL.md` explicitly. File and command permissions must cover the requested operation. A chat without file/tool access can help plan or write, but cannot maintain the workspace itself.

For a new workspace, follow `.agents/skills/workspace-onboard/SKILL.md`. For an existing business, follow `.agents/skills/continue/SKILL.md`, which selects its context and task; close with `.agents/skills/done/SKILL.md`. Skill names do not imply that every harness supports the same slash commands.

When adding Nave, explicitly read the installed content department's map and selected skill. Root discovery does not establish access to every nested department. Follow Nave's [portable harness setup](https://github.com/agentic-ai-content/nave/blob/main/.agents/skills/start/references/portable-harnesses.md) for that department's setup and connection checks.

## Hosted and local models

Choose a model through your harness's supported provider connection. Local inference is a valid route: for example, [OpenClaw documents local models through Ollama](https://docs.openclaw.ai/providers/ollama). Use the provider protocol that the harness documents; endpoints are not universally interchangeable.

The useful requirement is a model capable of the task, rather than a particular brand. It needs enough context to follow the selected instructions and reliable tool use for operations. Image review requires a model or tool that can inspect images. Smaller models may need a narrower task and more guidance. A local driving model does not make separate research, media or publishing services local or remove their setup requirements.

## What has been verified

The repository checks its generated Claude Code and Codex adapters for consistency. The Hermes and OpenClaw routes above were checked against their documentation on September 28, 2026; they are not end-to-end execution certifications for this workspace. No claim is made that every local model or every harness version has been tested.

For your chosen combination, confirm that the agent reads the intended map and skill, selects the correct business, performs one small authorized task and saves a usable result. Record the harness, model and versions with that evidence. Hooks, delegation and connected providers need their own checks when the work requires them.
