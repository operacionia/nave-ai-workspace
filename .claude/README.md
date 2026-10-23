# .claude/ — Claude Code adapter (generated)

`skills/` contains generated pointer bridges to the canonical skills in `.agents/skills` (Claude Code does not read `.agents/`). The `hooks` key of `settings.json` is rendered from `.agents/hooks/hooks.json`; every other key in `settings.json` is the operator's. Regenerate with `node .agents/tools/harness-bridges.mjs write`; verify with `check`. Do not add skills, commands, agents or rules here.
