# Video guide — "Set up Nave AI Workspace and add your content department"

Walkthrough script for the setup video (about 12 minutes recorded, 45 minutes as a live module). Every on-screen action is listed so the recording can be done in one take. Spoken lines are suggestions; keep Enrique's voice.

## 0. Before recording

- A clean folder on the desktop. Claude Code (or Codex) installed and signed in. Node.js installed.
- A fictional business ready for the interview (name it clearly as fictional, or use your own).
- Screen at 1440 wide, terminal font large, file tree visible on the left.

## 1. Why a workspace (0:00–1:00)

Show a launch task that needs yesterday’s decision. Open the prepared synthetic AI Workspace, run `continue`, and show the saved handover and the proposed next action. Use an actual saved record; do not promise the same answer from every model.

Line: "Your AI employees need to understand the work: what matters to your business, where a project stands and what you decided last time. Nave AI Workspace gives that work a home. You organize the business here, keep a record as you go, and add Nave when you’re ready to build your content team."

## 2. Install (1:00–2:30)

After confirming access to the private AI Workspace repository, show **Use this template** → private repo `<brand>-ai-workspace` → clone. Open that folder in Claude Code or Codex.

Show the tree: `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `businesses/`, `docs/`, `system/`. One sentence each (from [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

Line: "AGENTS.md and CLAUDE.md are the same file with two names. Codex reads one, Claude reads the other. You never maintain two versions."

## 3. The interview (2:30–6:00)

Type: **set up my workspace**. Walk the questions on camera:

1. Name, business, what it does, for whom.
2. Personal brand, company, agency, several brands? Clients?
3. The first useful result.
4. Which departments you actually run.
5. Claude Code, Codex or both.
6. Existing material.
7. Do you run content as a department? (Nave, the Content OS, is installed separately.)

Show the proposed files before saying yes. Show "help me decide" on one question and "leave this open" on another.

Line: "It creates only the departments you said you run. There is no default department list, because there is no default business."

## 4. Inside the business folder (6:00–7:30)

Open `businesses/<brand>/`. Read the first line of its `AGENTS.md`: "<Brand> workspace". Show `context/`, `departments/`, `projects/`, `memory/`, `handover.md`, `tasks/`.

Line: "Each business has a folder for its context, work and memory. Choose the business at the start of a session so your agent knows which records to use. These folders organize the work; they are not a security sandbox."

## 5. Your content department with Nave (7:30–10:00)

Open `departments/content/` (created only if the interview confirmed content). Explain in one breath what Nave adds: AI employees with skills for planning, writing, production, editing, distribution and learning, working with this business's brand context. Show the department tree from [docs/CONTENT-OS.md](docs/CONTENT-OS.md) and explain that Nave is acquired and installed separately. The workspace template is optional: someone with an existing workspace can install Nave there in a private content department folder. Confirm access to its private repository before demonstrating the package’s installation guide.

Line: "AI Workspace is where you and your agents work. Nave is your content department: your ideas, your voice, and a crew of AI employees helping you make and align content for your brand. You direct the work and approve what gets published."

## 6. The daily loop (10:00–11:30)

`/continue`: show what it reads and the one recommended action. Do a small thing. `/done`: show the Retain block land in `memory/YYYY-MM-DD.md` and the new block at the top of `handover.md`.

Line: "Continue reads the record you saved. Done leaves the next session a record to work from."

## 7. Close (11:30–12:00)

The checklist on screen: template cloned, interview done, `handover.md` exists, `workspace.json` lists the business. Next step: choose one useful task for your business, make it with your agent, and review the result.

## Support material to export from this script

- One-page handout: the folder graph + the seven questions.
- The checklist above.
- FAQ: "Do I need `system/`?" (it holds the registry the tools read; leave it), "Do I need `clients/`?" (only if you have clients), "Codex or Claude?" (either, same files), "Where do my API keys go?" (in the documented local secret store or gitignored configuration; never in tracked files or chat).
