# The README video

Nave AI Workspace is the organized home for your work, projects and saved memory. Nave adds your content department, with AI employees for content. The README opens on a 66-second overview of AI Workspace, in the Agentic AI Content brand (white canvas, ink type, `#61AEFA` accents, the Voyager mark). It shows what the workspace is and how continuity works, without promising more than the files do. The files live in `docs/media/`:

| File | Use |
|---|---|
| `ai-workspace-hero.gif` | The complete 66-second silent overview, looping inline: 960×540, 4 fps, 9,333,672 bytes (9.33 MB) |
| `ai-workspace-explainer.mp4` | The full overview with sound, 1920×1080, 30 fps, H.264 + AAC, web-encoded |
| `ai-workspace-poster.png` | A still for places that show an image before the video plays (1600×900) |
| `enriquemarq-avatar.jpg` | Enrique's portrait beside the creator credit at the bottom of the README |

## The story (66 s, 30 fps, with sound)

| Time | Beat |
|---|---|
| 0–7 | **Your agents can only use what they can find.** A question about a launch, and scattered chat fragments a search beam can't hold. |
| 7–15 | **One place where you and your agents work.** The fragments snap onto one map (`AGENTS.md`), and the floors of two businesses rise: a brand and its client. |
| 15–26 | **Every business gets the same shape.** Context, departments, projects, tasks, memory and handover as files you own; clients keep their own folders. |
| 26–47 | **Tuesday → Wednesday.** A decision ("Fall menu launches Friday") is written by `/done` into the day's minutes, the bank (`memory/bank/`) and the handover. The next morning `/continue` reads those files back, and the agent proposes the next task. A thread of light connects the decision to the proposal. "No retraining. Just the record you saved." |
| 47–54 | **One source. Works in Claude Code and Codex.** `.agents/` generates `.claude/` and `.codex/`. |
| 54–61 | **Add departments as you grow.** The Nave ship docks at the content department: Nave installs there separately. |
| 61–66 | **AI Workspace. Your business. Your files. Your agents.** Open the folder and say "set up my workspace". A private template from Agentic AI Content. |

## Sound

Original sound only: a soft bed and accents synthesized for this film (plucks on snaps, whooshes on camera moves, a two-note chime when the thread connects, soft typing ticks, a resolve chord). Integrated loudness about −18 LUFS. No library samples and no paid generation.

## What the video claims, and where each claim comes from

| On screen | Source |
|---|---|
| The shape of a business folder | the business folder standard in `AGENTS.md` and [ARCHITECTURE.md](ARCHITECTURE.md) (the film shows six folders; routines, sessions and the wiki are omitted for space) |
| What `/done` writes and what `/continue` reads | the `done`, `continue` and `context-engine` skills |
| "No retraining. Just the record you saved." | the same skills: continuity comes from files a session reads, not from model training |
| One source for Claude Code and Codex | `harness-bridges.mjs`, `harness-watch.mjs`, [HARNESSES.md](HARNESSES.md) |
| Nave installs separately into the content department | [CONTENT-OS.md](CONTENT-OS.md) |
| "set up my workspace" | the `workspace-onboard` skill |
| Orbit Studio, Harbor Bakery, the fall menu | synthetic examples, not customers |

The film is a recorded overview, not a live capability inventory. Its Claude Code/Codex scene illustrates the included adapters; the current [harness guide](HARNESSES.md) also covers OpenClaw, Hermes and local-model routes. Recheck folder names, commands and behavior when the template changes, even though the film avoids fixed counts.

## Regenerating

The composition is a HyperFrames project maintained by Agentic AI Content outside this repository. Pinned renderer: HyperFrames 0.8.77 with chrome-headless-shell 147. It uses GSAP 3.14.2 and the OFL fonts Fraunces, Hanken Grotesk and DM Mono, all bundled locally, so it renders offline.

1. Update the on-screen data when the template changes: folder names, the `/continue` read list, the commands.
2. Lint and check the project, render a 1 fps draft, inspect a frame at every beat, then render at 30 fps.
3. Keep the full-resolution web MP4 (H.264 High, AAC, faststart). Derive the complete silent GIF from that exact MP4, preserving every scene and its reading time: 960 px wide, 4 fps, a global 32-color palette, no dithering, then Gifsicle 1.93 `-O3 --lossy=90 --careful`. Loop forever. Verify the actual result is strictly below 10,000,000 bytes; do not trim the explanation or speed up the reading holds to meet the limit. Inspect text and the closing frame after compression. The GIF has fewer colors and less fluid movement than the MP4; the MP4 remains the full-quality version with sound.
4. Replace the files in `docs/media/` under the same names so the README links stay stable, and note it in `CHANGELOG.md`.
