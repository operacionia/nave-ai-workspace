#!/usr/bin/env bash
# session-start.sh — SessionStart hook for the AI Workspace.
# Prints the business registry and the newest handover block of the most
# recently active business so /continue starts informed. Best-effort, always
# exits 0, never blocks a session, never touches the network, never writes.
# Claude Code: plain stdout is added to the session context.
# Codex: called with --json; emits {"additionalContext": "..."} instead.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REG="$ROOT/system/workspace.json"
[ -f "$REG" ] || REG="$ROOT/workspace.json"
[ -f "$REG" ] || exit 0

# Native sync: make sure the harness watcher is running. It regenerates every
# host folder within a second of any change in a canonical .agents/ folder.
if command -v node >/dev/null 2>&1; then (cd "$ROOT" && node .agents/tools/harness-watch.mjs --daemon >/dev/null 2>&1) || true; fi

render() {
  echo "=== AI WORKSPACE ==="
  if command -v node >/dev/null 2>&1; then
    node -e '
      const r = require(process.argv[1]);
      console.log(`${r.name} · operator=${r.operator && r.operator.id} · status=${r.status || "n/a"}`);
      for (const b of r.businesses || []) console.log(`  • ${b.id}  ${b.path}${b.contentDepartment ? "  [content: " + b.contentDepartment + "]" : ""}`);
    ' "$REG" 2>/dev/null
  fi

  # Location rule: a workspace is a regular folder, never inside a tool folder.
  case "$ROOT" in
    */Codex/*|*/.codex/*|*/.claude/*|*/node_modules/*) echo "WARNING: this workspace sits inside a tool folder ($ROOT). Move it to a regular folder you own, e.g. Documents/<brand>-ai-workspace." ;;
  esac

  # Newest handover.md among registered businesses.
  LATEST=""
  for h in "$ROOT"/businesses/*/handover.md "$ROOT"/businesses/clients/*/handover.md; do
    [ -f "$h" ] || continue
    if [ -z "$LATEST" ] || [ "$h" -nt "$LATEST" ]; then LATEST="$h"; fi
  done
  if [ -n "$LATEST" ]; then
    echo
    echo "--- last handover: ${LATEST#$ROOT/} ---"
    # Print the first Enriched block (header through the line before the next '## ').
    awk '/^## Enriched/{p=1; c++} c==2 && /^## /{exit} p' "$LATEST" | head -40
  fi
  echo 'Session rules: /continue (Claude Code) or $continue (Codex) at start, /done or $done at end. Business work runs here; content work opens a session at businesses/<b>/departments/content (its own continue/done). Canonical: .agents/. Map: AGENTS.md'
  echo "===================="
}

if [ "${1:-}" = "--json" ]; then
  if command -v node >/dev/null 2>&1; then
    render | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify({additionalContext:s})))'
  fi
else
  render
fi
exit 0
