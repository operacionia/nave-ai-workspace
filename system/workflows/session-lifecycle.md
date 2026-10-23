# Session lifecycle — manual pilot contract

Canonical procedures: `.agents/skills/continue/SKILL.md` and `.agents/skills/done/SKILL.md` (Claude Code bridges in `.claude/skills`). This file keeps the contract summary.

## Start / continue

1. Select an exact business from the registry and an explicit task. Never infer a different business from a similar name.
2. Read its current context, task record and latest relevant handoff. Follow direct references to needed memory and department skills.
3. Confirm the task's owner and expected revision. If another session owns active work, stop and coordinate; filesystem folders alone are not concurrent-write locks.
4. Create a session handoff record identifying the business, task, scope and permitted outputs.
5. Perform only authorized work and verify the outcome.

## Done / checkpoint

1. Update the task's state, evidence, output references, blocker and next action. Distinguish completed, blocked and ready-for-review.
2. Record a session handoff with business ID, task ID, source revision, changed files, verification and next action.
3. Propose durable memory only for reusable decisions or lessons, with evidence and supersession links. Do not silently rewrite business facts.
4. A fresh session verifies the current task and sources before resuming; a summary is not authority to publish or repeat an external action.

## Content sessions

A content session is the same meeting in the business's content department: `continue content` from the workspace root hands off to `departments/content/.agents/skills/continue/SKILL.md` (read by path), or the host is opened at the department root. Its minutes and memory live in `nave-content-os/memory/`; its `done` bubbles business-level decisions up to the business handover in one block. Content memory never leaves the department.

## Delegated or scheduled work

Require business, objective, allowed actions, required capabilities, output location, success criteria and stop conditions. Activation uses an actual selected scheduler. Retain a unique run record and reconcile ambiguous external results before retrying. Scheduling and actual harness lifecycle hooks remain implementation work.

## Optional local coordination helper

The [task coordination helper](../operations/README.md) now provides an opt-in cooperative claim/checkpoint/release protocol with revision checks, immutable checkpoint records and explicit same-owner operation recovery. It is tested on synthetic local businesses, not deployed across every agent workflow. Status/continue is read-only; mutation requires an existing authorized task and the exact owner/revision/claim.

Never mix manual task edits with helper-controlled writes to the same task. Existing manual owners are not converted automatically, and stale lock age is not permission to take over. New JSON checkpoints supplement a task's current authority; older Markdown handoffs are not rewritten. This does not activate a scheduler, execute a model, write durable business memory or grant publishing permission.
