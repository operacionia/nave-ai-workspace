# Memory process — the second brain

A session is a meeting. `continue` gathers the context (who we are, what is open, what was decided last time). During the meeting the agent keeps the minutes: the daily log, with Retain lines written the moment something worth keeping happens. `done` synthesizes the minutes into memory pieces: durable facts to the bank, synthesized pages to the wiki, and what the next meeting needs to the handover. Nothing is remembered that was not first written in the minutes, and nothing in the minutes becomes durable without being promoted.

## Two rooms per business

Memory is scoped to one business. A business with Nave installed has a second room for its content work, with separate minutes and a handover. Keep client facts in the client’s folder; this is a working rule, not an operating-system access boundary.

| Room | Session | Memory | What belongs there |
|---|---|---|---|
| **Business workspace** | business session: `continue` at the AI Workspace root | `businesses/<b>/memory/` (daily log, bank, wiki), `handover.md` | strategy, offers, clients, community, operations, decisions |
| **Content department** | content session: `continue content` from the root, or the host opened at `businesses/<b>/departments/content` | `departments/content/nave-content-os/memory/` (daily log + bank), its `handover.md` | what was made, what worked, brand and format lessons |

Facts move between rooms by promotion, never by copying. Up: the department's `done` writes one `## Content department` block into the business handover only when a business-level decision happened, and the business wiki cites department memory as a source. Down: the department reads the business's approved `context/` through its brand profile. A harness's private memory (for example Claude Code's project memory) is never a dependency of the system.

## The layers inside a room

| Layer | Path inside the room | What it is | Written by |
|---|---|---|---|
| Daily log (the minutes) | `memory/YYYY-MM-DD.md` | Journal of what happened, as Retain blocks | every session, in real time |
| Bank | `memory/bank/{world,opinions,experience,contacts}.md` + `index.md` (content room: `bank/index.md` with `[works]`, `[avoid]`, `[hypothesis]`) | Curated, permanent facts with sources | `done` promotion |
| Wiki (business room only) | `memory/wiki/index.md`, `memory/wiki/log.md`, `memory/wiki/pages/`, `memory/wiki/raw/` | Synthesized, interlinked knowledge with sources | the `llm-wiki` skill, run by `done` |
| Handover | `handover.md` | What was built, decisions, issues, next steps; newest block first | `done` |

## Retain blocks

```
### Retain
- W @Entity: verified fact
- O(c=0.80) @Entity: opinion — WHY — APPLIES WHEN
- B @Entity: what was built or what happened, and why it matters
- C @Entity: contact, relationship or user preference update
```

Every line carries an `@Entity` tag. Trust markers after the prefix when provenance matters: `[stated]`, `[observed]`, `[inferred]`, `[discussed]`. Full rules: `.agents/skills/context-engine/SKILL.md`.

## The loop

1. `continue` reads `handover.md`, the last daily logs, `bank/index.md`, `memory/wiki/index.md` and open tasks. Bounded reads; no scanning.
2. During the session, Retain blocks are written as things happen.
3. `done` promotes durable lines to the bank, ingests the day into the wiki, writes the newest handover block, updates the task, offers a scoped commit.

## The wiki

The business's synthesized knowledge base. Three operations, all in `.agents/skills/llm-wiki/SKILL.md`:

- **Ingest**: a source (today's memory, a transcript in `memory/wiki/raw/`, a context file) updates every page it touches and creates the pages it justifies; `index.md` and `log.md` are updated.
- **Query**: read `index.md`, open only the relevant pages, answer with citations; file new synthesis as a page.
- **Lint**: contradictions, orphans, missing backlinks, drift against sources, coverage gaps.

Raw sources are never edited. `context/` stays the approved truth; a wiki page contradicting it is a lint finding. One wiki per business, none per department; every business has one from onboarding, and `done` ingests every session into it.

## Never in memory

Secrets, tokens, raw media, transcripts (those go to `memory/wiki/raw/` or the project), another business's facts, anything the operator asked to keep out.
