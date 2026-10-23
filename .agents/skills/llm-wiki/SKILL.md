---
name: llm-wiki
description: The synthesized knowledge base of one business — an agent-maintained, interlinked markdown wiki built from the business's raw sources and memory, so a question like "what do we know about X" is answered from pages with sources instead of re-reading everything. Three operations: ingest (a source updates every page it touches), query (answer from the wiki, file the answer as a page), lint (find contradictions, orphans, drift, gaps). Triggers on "ingest this into the wiki", "what do we know about", "wiki lint", "build the wiki", "/llm-wiki", "$llm-wiki".
---

# llm-wiki — the business knowledge base the agent maintains

Three layers: raw sources you curate and never edit (`context/`, `memory/`, documents), a wiki the agent writes and you read, and a schema that tells the agent how to behave. This skill is the schema. Everything is scoped to one business: `businesses/<b>/memory/wiki/`. There is one wiki per business and none per department: the content department's bank is its curated layer, and the business wiki cites it as a source.

## Layout

```
businesses/<b>/memory/wiki/
├── index.md        map of every page: title, one-line summary, link. Loaded first on every query.
├── log.md          append-only chronological record of every ingest, query and lint pass
├── raw/            drop folder for sources that have no other home (transcripts, exports, PDFs as text)
└── pages/          one markdown page per entity, concept, decision or process
```

Raw sources also include, without copying them: `context/`, the daily logs and bank beside the wiki in `memory/`, `handover.md`, `projects/*/brief*`, `departments/*/README.md`, and the Content OS brand profile. Wiki pages link to those files as sources; they never duplicate media.

## Page format

```
# <Title>
Type: entity | concept | decision | process | question
Sources: [memory/2026-09-07.md](../../memory/2026-09-07.md), [context/README.md](../../context/README.md)
Updated: YYYY-MM-DD

<synthesized content, short sections, plain sentences>

## Related
- [[other-page]] — why it relates
```

One idea per page. Links use `[[page-name]]` (file name without extension). Every page must be linked from at least one other page or the index.

## Operations

**Ingest** (`ingest <source>`): read the source end to end. List every existing page it affects and every page it justifies creating. Update each affected page (merge, do not append blindly; resolve conflicts explicitly, keeping the newer dated fact and marking the older as superseded). Create new pages. Update `index.md`. Append one line to `log.md`: `YYYY-MM-DD ingest <source> → updated: a, b; created: c`. Typical yield: one source touches 5 to 15 pages.

**Query** (`what do we know about X`): read `index.md`, open only the relevant pages, answer with citations to pages and sources. If the answer is new synthesis worth keeping, file it as a `question` page and log it.

**Lint** (`wiki lint`, weekly or after a large ingest): scan for contradictions between pages, orphan pages, missing backlinks, drift (a source says X, the wiki says Y), stale `Updated` dates against newer sources, and coverage gaps (entities mentioned often in memory with no page). Fix what is mechanical, list the rest in `log.md` as `lint findings`.

## Relationship to the other memory layers

Daily memory is the journal (what happened). The bank is the curated fact list (what is true). The wiki is the synthesis (how it all connects). Every business has a wiki; `done` ingests today's memory into it on every session, and `continue` reads `memory/wiki/index.md` at the start. The panel's Second brain shows the index. The wiki never replaces `context/`, which stays the approved business truth; a wiki page that contradicts `context/` is a lint finding, not a correction.

## Rules

- Never edit raw sources. Never paste secrets, credentials or another business's facts.
- Cite sources on every page. No page without a `Sources:` line.
- Keep pages short. Split when a page has more than three sections that could stand alone.
- Bootstrap a new wiki with `ingest` over `context/README.md`, `handover.md` and the last 7 daily logs, then lint.
