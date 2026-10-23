# .agents/ — the workspace's agent layer (canonical)

Everything the workspace itself needs from an agent lives here, once. Skills use the Agent Skills format and Codex reads `.agents/skills` natively; agents and hooks are package conventions that no host reads from `.agents/`. `node .agents/tools/harness-bridges.mjs write` renders the host files: `.claude/skills` pointer bridges, `.claude/agents` copies, the `hooks` key of `.claude/settings.json`, `.codex/agents/*.toml` and `.codex/hooks.json`. Never edit a generated file; edit here and regenerate. Verified discovery rules: `AGENTS.md`, section Harness rules.

| Path | What |
|---|---|
| `skills/continue/` | Session resume, scoped to one business |
| `skills/done/` | Session completion: daily memory, bank and wiki promotion, handover, commit offer |
| `skills/sync/` | Regenerates every host folder for the root and every department (`write --all`) |
| `skills/push/` | Pushes committed work to GitHub with a token from `.env`, never shown; covers the repositories in `system/repos.json` |
| `skills/context-engine/` | Memory discipline: layers, Retain blocks, promotion, reading rules |
| `skills/llm-wiki/` | The business's synthesized knowledge base (one wiki per business): ingest, query, lint |
| `skills/workspace-onboard/` | First-run interview that creates the workspace and its first business |
| `skills/business-onboard/` | Interview that adds one business or client |
| `hooks/hooks.json` | Host-neutral hook manifest, rendered into `.claude/settings.json#hooks` and `.codex/hooks.json` |
| `hooks/session-start.sh` | Prints the registry and the newest handover at session start and starts the watcher; `--json` form for Codex |
| `hooks/after-edit.sh` | After any write under `.agents/` or an overlay `skills/` folder, runs `write --all` |
| `tools/harness-watch.mjs` | Native file watcher: regenerates all host folders within a second of any change in any canonical folder; VS Code starts it on folder open |
| `tools/git-push.mjs` | Non-interactive push with a token (`.env`), masked everywhere; `--status --all` for a dry look |
| `tools/harness-bridges.mjs` | Renders and checks every generated host file for Claude Code and Codex |

Content-production skills, agents and hooks are not here. They belong to the Nave Content OS installed per business at `businesses/<b>/departments/content/` (its own `.agents/` layer with the same generated host files), and hosts discover them only from that folder upward.
