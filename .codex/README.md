# .codex/ — Codex adapter (generated)

`hooks.json` is rendered from `.agents/hooks/hooks.json` by `node .agents/tools/harness-bridges.mjs write`; `agents/` would hold rendered copies of `.agents/agents` if the workspace ever defines subagents. Codex reads `.agents/skills` natively, so no skill bridges are needed here. Codex loads this folder only in a trusted project and runs a hook only after the operator trusts its definition (`/hooks`). Do not edit by hand.
