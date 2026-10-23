# Add your content team with Nave

**Your workspace organizes the business. Nave gives its content work a team.**

Nave AI Workspace keeps your projects, business knowledge and saved memory together. Nave, the Content OS, adds AI employees for content, helping you research, plan, write, produce and improve the work you put into the world.

## Build around what makes your brand yours

Bring your ideas, voice and experience. Give the team your direction, work through a piece together and review the result. Keep useful sources, feedback and lessons with the work so the next piece can draw on what you have already learned.

The aim is a content department you can develop over time: clear responsibilities, reusable ways of working and a body of brand knowledge that supports your decisions. Start with one task, then grow the system around the work you actually do.

Nave runs through a capable agent harness, including Claude Code, Codex, OpenClaw or Hermes, using a hosted or local model supported by that harness. Its skills and business records are portable; native integrations and model capabilities still need to be checked for the job. You direct its roles and methods, choose the tools and approve publication. Install it separately when you are ready to add that department. [Harness and model setup](HARNESSES.md).

You can add Nave to a private content department folder in your existing workspace. This template is an optional fresh-start structure, not a prerequisite for using Nave.

## What the content team works on

Nave organizes its skills into six stages. Each skill carries a method for a specific job, along with the context it needs and the work it should produce.

| Stage | Tangible work |
|---|---|
| Foundation | Audience, voice and brand context the team can work from. |
| Pre-production | Research, ideas, plans, scripts and creative direction. |
| Production | Videos, selected clips, visuals, carousels and guides. |
| Post-production | Recording cuts, captions, sound, assembly and reviewed exports. |
| Distribution | Approved channel copy, publishing actions and their receipts. |
| Learning | Results, feedback and lessons saved for future work. |

You can ask for one operation or develop a whole piece. Start with the need, such as turning a customer question into a useful explanation or editing an existing recording. Your agent follows the relevant skill, uses the tools you have connected and keeps the output with that piece. [See the skills behind each stage](https://github.com/agentic-ai-content/nave#from-an-idea-to-content-you-can-put-into-the-world).

## How the panel makes that work visible

Nave includes a local panel for inspecting the selected business's saved work. Content studio shows a week/month calendar and production board. Second brain brings business and content memory into view, with links to the underlying records. Other sections help you browse skills, tool observations, creative references and brand orientation.

Use it to answer practical questions: What did we plan? Which piece needs my review? What context have we saved? Which skill should I ask the agent to use? The panel reads files; it does not run agents, connect accounts or publish content. Tool observations are saved evidence, not a live health check. Browser onboarding drafts still need agent review before they become business facts.

This workspace template does not bundle the panel. It comes with Nave's separate installation. [Panel guide](https://github.com/agentic-ai-content/nave/blob/main/engine/panel/README.md).

## Where it lives in a workspace

```text
businesses/<b>/departments/content/     the content department
├── AGENTS.md · CLAUDE.md               the department's own operating maps
├── .agents/ · .claude/ · .codex/       the crew and its generated adapters
├── engine/                             catalog · runtime · tools · panel
└── nave-content-os/                    your brand, strategy, assets, projects and memory
```

Nave supplies the department’s reusable methods and engine. Your business’s content data lives separately in `nave-content-os/`; reviewed engine upgrades preserve that data. Business decisions are promoted to the business's `memory/` and `handover.md`; content memory stays in the department.

## Where to get access

AI Workspace and [Nave](https://github.com/agentic-ai-content/nave) are private repositories. Request access through Agentic AI Content and confirm your GitHub account can open each repository you need. Access to one does not establish access to the other.

Once you have Nave access, follow the package’s setup guide to preview an installation into `businesses/<b>/departments/content/`. Review the target before applying it, open the installed department in your agent host, and run `start`. Connect only the tools your first task needs. A content folder alone does not mean Nave is installed.

## What this template already does for content

Before installing Nave, you can keep approved business facts in `context/`, work in `projects/`, tasks in `tasks/` and session records in `memory/` and `handover.md`. When Nave is installed, bind it to the selected business and reuse confirmed context rather than repeating the interview. Nave’s `strategy/` and brand profiles belong inside its own `nave-content-os/` data folder.

## Where content tools are connected

Your AI Workspace organizes the businesses. Each business’s installed Nave department keeps its connection map in `nave-content-os/connections.json`. API keys can stay in the department’s gitignored `.env.local`. Shared CLI/API routes and MCP definitions belong to Nave; supported AI hosts use adapters to reach that same setup. Host-only app connectors are explicit exceptions, not the default.

Open the content department and ask **"Show my tools and help me connect what I need for this task."** The agent follows Nave’s installed `.agents/skills/start/references/tool-connections.md` guide. That guide and the owning skills explain setup; the workspace does not keep a second content-tool inventory.
