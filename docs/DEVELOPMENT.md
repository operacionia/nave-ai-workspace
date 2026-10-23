# Development

How to change this template, check it and release it.

## Principles

1. **One map.** `AGENTS.md` is the source of truth; `CLAUDE.md` is a byte-identical copy. Change `AGENTS.md`, then `cp AGENTS.md CLAUDE.md`. Same rule inside `businesses/<b>/`.
2. **One skill bank.** Edit skills, hooks and tools only in `.agents/`. Then `node .agents/tools/harness-bridges.mjs write`; a running watcher can do this automatically, but verify with `check`. Never touch `.claude/` or `.codex/` by hand.
3. **No business data.** Nothing under `businesses/` except the `my-brand` scaffold placeholders. No memory, no media, no credentials, no client names, no operator paths in tools.
4. **Routing over volume.** Every markdown file says where to go next. A file an agent cannot reach from `AGENTS.md` in two hops is misplaced.
5. **Small `system/`.** Registry, policies, workflows, the opt-in operations helper, tests. Operator records belong to the operator's business.

## Checks

```sh
node system/tests/validate.mjs                                              # registry, business folders, required maps, location warnings
node .agents/tools/harness-bridges.mjs check                                # host folders in sync with the canonical layer
node --test system/tests/validate.test.mjs system/tests/workspace-operations.test.mjs   # routing and cooperative task ownership (synthetic fixtures)
cmp AGENTS.md CLAUDE.md && cmp businesses/my-brand/AGENTS.md businesses/my-brand/CLAUDE.md
```

All four must pass before a commit. `node .agents/tools/harness-bridges.mjs install-git-hook` adds a pre-commit check that refuses stale host folders.

For optional cooperative task ownership and recovery, see [the operations helper](../system/operations/README.md). Its mutation tests use synthetic temporary workspaces; they do not claim live tasks. Optional [session routes](ARCHITECTURE.md#optional-session-routes) are checked by the registry validator and routing tests above.

## Adding a skill

1. Create `.agents/skills/<name>/SKILL.md` with `name` and `description` frontmatter; the description says when the skill should and should not trigger.
2. Put scripts in `scripts/` and references in `references/` inside the skill folder.
3. Regenerate the host folders. Add the skill to the tables in `AGENTS.md`, `.agents/README.md`, `docs/ARCHITECTURE.md` and the README.
4. Test it in both hosts: `/name` in Claude Code, `$name` in Codex.

## Changing the business scaffold

`businesses/my-brand/` is what `workspace-onboard` renames and fills. Keep every file a template with clear placeholders. The validator requires `business.json`, `AGENTS.md`, `CLAUDE.md` and each department folder listed in `business.json`.

## Changing the README video

See [README-VIDEO.md](README-VIDEO.md). The composition lives with the maintainers; this repository ships only the rendered files in `docs/media/` under stable names.

## Release

1. Update `VERSION` and `CHANGELOG.md`.
2. Run the checks.
3. Commit, then push with the `push` skill (`node .agents/tools/git-push.mjs`); tag `v<version>` when the release is meant to be pulled by instances.
4. Prepare member updates as reviewed changes, not a blanket replacement of the instance. Checkpoint or back up the instance, compare its current files with the chosen template revision, then apply only the reusable changes. Preserve customized operating maps, registries, business records and secrets. Run the checks in the updated instance and keep the checkpoint for recovery. A Git pull can conflict with customized files; it is not an automatic safe updater.

## Relationship to the Nave package

Nave — Content OS is developed in `agentic-ai-content/nave`, with its own access, installer and upgrade guide. This template never bundles or installs it; it documents what it is, where it lives in a workspace and where to get access.
