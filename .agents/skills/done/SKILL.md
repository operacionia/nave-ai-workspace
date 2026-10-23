---
name: done
description: >-
  Close a session in this AI workspace. Synthesizes the session's minutes (the daily log) into memory pieces: bank, wiki, handover; updates the task and offers a scoped commit. A content session started with `continue content` is closed by the department's own done. Triggers on "done", "wrap up", "that's it for today", "close the session", "/done", "$done".
---

# done — session completion

Business `<b>` is the one selected at `/continue`. Everything is written inside `businesses/<b>/`. The meeting is over; this skill turns the minutes into memory. Four phases: CAPTURE, PROMOTE, HANDOVER, CLOSE.

**Content session?** If the session selected content through `continue` (including a business name plus `Content Operating System` or `Nave`), `/start`, or a department-root session, reuse that session's business/task and registered `contentDepartment`. Read `<contentDepartment>/.agents/skills/done/SKILL.md` and follow it. Resolve its content-memory destination again before writing; the shell still being at the workspace root does not change the scope. Only business-level decisions receive the department's documented bubble-up to the business handover. If the binding was lost after compaction, recover it from the current session/task handoff or ask; never pick the newest unrelated business. Do not run the phases below for a content session or duplicate its memory here.

## Phase 1 — Capture

Append to `businesses/<b>/memory/YYYY-MM-DD.md` (create it with a `# YYYY-MM-DD — <Business> workspace` title if missing) a `### Retain` block with 3 to 8 lines, every line entity-tagged:

```
- W @Entity: verified fact
- O(c=0.80) @Entity: opinion — WHY — APPLIES WHEN
- B @Entity: what was built or what happened, and why it matters
- C @Entity: correction or preference the user stated
```

Add trust markers when provenance matters: `[stated]`, `[observed]`, `[inferred]`, `[discussed]`.

Then a short grounding reflection (2 to 5 lines): which assumptions held, which were violated, whether the lesson is durable. "No assumption delta this session" is a valid entry.

## Phase 2 — Promote

- Durable facts, opinions and experiences go to `businesses/<b>/memory/bank/` (`world.md`, `opinions.md`, `experience.md`, `contacts.md`) and get one line in `memory/bank/index.md` with an @Entity tag and a link to the evidence.
- Run the `ingest` step of the `llm-wiki` skill on today's memory: update or create the pages the session touched, then append to `memory/wiki/log.md`. The wiki is part of the memory system, not optional: if `businesses/<b>/memory/wiki/` does not exist yet, bootstrap it first (`ingest` over `context/README.md`, `handover.md` and the last daily logs, then `lint`).
- Business facts in `context/` are never rewritten silently. Propose the change and link it.

## Phase 3 — Handover

Insert a new block at the top of `businesses/<b>/handover.md`, right under the title:

```
## Enriched (written by /done, YYYY-MM-DD — one-line summary)
### What Was Built
### Key Decisions
### Known Issues
### Next Steps
```

Concrete files, commits and decisions. Next steps must be actionable by a reader with no memory of this session. Leave any `## Content department` blocks in place; they belong to the department's `done`.

## Phase 4 — Close

1. Update the task record in `businesses/<b>/tasks/<task>/` (status, evidence, next action).
2. Evolve: every friction point met this session gets encoded now in the skill or document that should have prevented it. Not a TODO.
3. Surface anything deliberately not done: "I noticed X, want me to handle it?" or "Nothing deferred."
4. Offer the commit with explicit paths, never `-A`:

```
git add businesses/<b>/memory businesses/<b>/handover.md <other explicit paths>
git commit -m "<b>: <one-line summary>"
```

Never commit `.env`, keys, raw media or another business's files. Push only when the operator asked or authorized it, with the `push` skill (`node .agents/tools/git-push.mjs`), never with an interactive `git push`.

## Output

```
## Session complete — <Business> workspace
Memory: <daily file> (+N retain) · Bank: <promotions> · Wiki: <pages touched or "none">
Handover: written · Task: <id> <status> · Commit: <hash or "not committed">
Deferred: <items or "nothing">
```
