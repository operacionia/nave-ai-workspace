---
name: context-engine
description: >-
  Memory discipline for this AI workspace. A session is a meeting: continue gathers the context, the daily log is the minutes, done synthesizes the minutes into memory pieces (bank, wiki, handover). Defines the two memory rooms per business (business workspace and content department), the Retain block format with @Entity tags and trust markers, when to write, and how facts move from a session into durable knowledge. Always active; load it when writing or reading memory, or when unsure where a fact belongs.
---

# context-engine — memory discipline

## How memory works, in one breath

A session is a meeting. `continue` gathers the context: who we are, what is open, what was decided last time. During the meeting the agent keeps the minutes: the daily log, with Retain lines written the moment something worth keeping happens. `done` synthesizes the minutes into memory pieces: durable facts to the bank, synthesized pages to the wiki, and what the next meeting needs to the handover. Nothing is remembered that was not first written in the minutes, and nothing in the minutes becomes durable without being promoted.

## Two rooms per business

Use the business and department selected for this session, including a content handoff through `continue` or `/start`. A workspace-root working directory does not turn content work into business memory. For content, read the selected department's canonical `continue`/`done` and use its resolver's `records.contentMemory`; preserve registered custom paths. If the session binding is missing, recover it from the current handoff or ask before writing. Never use substrate memory as a fallback.

Every business has two meeting rooms, each with its own minutes and memory. Facts move between them by promotion, never by copying.

| Room | Session | Memory | What belongs there |
|---|---|---|---|
| **Business workspace** | business session, opened at the AI Workspace root (`continue`) | `businesses/<b>/memory/` (daily log, bank, wiki), `handover.md` | strategy, offers, clients, community, operations, decisions |
| **Content department** | content session, opened at the department root or through `continue content` | `businesses/<b>/departments/content/nave-content-os/memory/` (daily log + bank), `handover.md` | what was made, what worked, brand and format lessons |

Up: the department's `done` writes one `## Content department` block into the business handover only when a business-level decision happened, and the business wiki cites department memory as a source when it synthesizes. Down: the department reads the business's approved `context/` through its brand profile. The AI Workspace root has no memory of its own: the registry and `system/` are not memory. A harness's private memory (for example Claude Code's project memory) is never a dependency of the system.

## The layers inside a room

| Layer | Path (inside the room) | Lifetime | Written by |
|---|---|---|---|
| Daily log (the minutes) | `memory/YYYY-MM-DD.md` | Journal; read for the last few days | Every session, in real time |
| Bank | `memory/bank/{world,opinions,experience,contacts}.md` + `index.md` (content room: `bank/index.md` with `[works]`, `[avoid]`, `[hypothesis]`) | Permanent, curated | `done` promotion, or immediately when a fact is clearly durable |
| Wiki (business room only; every business has one) | `memory/wiki/pages/*.md` + `memory/wiki/index.md` + `memory/wiki/log.md` + `memory/wiki/raw/` | Permanent, synthesized, interlinked | The `llm-wiki` skill (ingest on every `done`, query, lint) |
| Handover | `handover.md` | Rolling; newest block first | `done` |

## Retain blocks

Write in real time, right after a decision, insight or significant exchange. Do not batch everything for `done`.

```
### Retain
- W @Entity @Entity: verified fact
- O(c=0.75) @Entity: opinion — WHY it is held — APPLIES WHEN
- B @Entity: experience, what happened and why it matters
- C @Entity: contact, relationship or user preference update
```

Rules: every line gets at least one `@Entity` tag (a business, a person, a product, a system). Confidence on opinions is required. One fact per line.

Trust markers, placed after the type prefix, when the source changes how much to trust the line: `[stated]` the person said it, `[observed]` you verified it, `[inferred]` derived from other facts, `[discussed]` mentioned but not confirmed.

## Promotion

The prefix is the promotion decision. `W` lines that will still matter in a month go to `bank/world.md`; `O` to `bank/opinions.md`; `B` to `bank/experience.md`; `C` to `bank/contacts.md`. Each promotion adds or updates one line in `bank/index.md`:

```
- @Entity — one-line summary → bank/world.md#anchor (source: memory/2026-09-07.md)
```

Corrections supersede: write the new fact, mark the old line `[superseded YYYY-MM-DD]`, never delete evidence.

## Reading

Start from `handover.md`, `bank/index.md` and `memory/wiki/index.md`, then open only the bank sections or wiki pages the task needs. Grep the daily logs for exact strings; use the wiki for synthesized answers. Never scan every file to "get context".

## What never goes into memory

Secrets, API keys, tokens, raw transcripts, media, another business's facts, and anything the user asked to keep out.
