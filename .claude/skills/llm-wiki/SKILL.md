---
name: llm-wiki
description: The synthesized knowledge base of one business — an agent-maintained, interlinked markdown wiki built from the business's raw sources and memory, so a question like "what do we know about X" is answered from pages with sources instead of re-reading everything. Three operations: ingest (a source updates every page it touches), query (answer from the wiki, file the answer as a page), lint (find contradictions, orphans, drift, gaps). Triggers on "ingest this into the wiki", "what do we know about", "wiki lint", "build the wiki", "/llm-wiki", "$llm-wiki".
---

<!-- Generated discovery bridge. Edit the canonical skill in .agents/skills, not this file. -->

This is a compatibility entry for Claude Code, not a second implementation.
Read [the canonical llm-wiki skill](../../../.agents/skills/llm-wiki/SKILL.md) completely and follow it.
Resolve its relative references and scripts from that canonical directory, not from this bridge.
The workspace [operating map](../../../AGENTS.md) defines scope, business selection and boundaries.
