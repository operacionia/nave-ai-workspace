#!/usr/bin/env bash
# after-edit.sh — PostToolUse hook. Whenever a tool wrote under a canonical
# agent layer (.agents/ at the workspace root or in a department, or a
# business's nave-content-os/skills/ overlay), regenerate every host folder for
# the whole workspace so no harness is left behind. Best-effort: exits 0, no
# network, touches only generated files.
# Claude Code: plain stdout is shown as hook output.
# Codex: called with --json; emits {"additionalContext": "..."}.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PAYLOAD="$(cat 2>/dev/null || true)"
case "$PAYLOAD" in
  *".agents/"*|*".agents\\\\"*|*"nave-content-os/skills/"*|*"nave-content-os\\\\skills\\\\"*) ;;
  *) exit 0 ;;
esac
# Ignore writes to the generated folders themselves and to memory/records.
case "$PAYLOAD" in *"/memory/"*|*"\\\\memory\\\\"*) exit 0 ;; esac
OUT="$(cd "$ROOT" && node .agents/tools/harness-bridges.mjs write --all 2>&1)"
STATUS="$(printf '%s' "$OUT" | grep -o '"status": "[A-Z]*"' | head -1 | cut -d'"' -f4)"
ISSUES="$(printf '%s' "$OUT" | grep -A20 '"issues": \[' | grep -E '^\s+"' | head -5 | sed 's/^\s*//')"
MSG="harness sync after edit: ${STATUS:-unknown} (workspace + every department regenerated for Claude Code and Codex)"
[ -n "$ISSUES" ] && MSG="$MSG — issues: $ISSUES"
if [ "${1:-}" = "--json" ]; then
  printf '%s' "$MSG" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify({additionalContext:s})))'
else
  echo "$MSG"
fi
exit 0
