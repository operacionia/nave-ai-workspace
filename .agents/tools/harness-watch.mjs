// harness-watch.mjs — native, model-free sync daemon.
//
// Watches every canonical agent layer in this AI Workspace (the root .agents/,
// each registered content department's .agents/, and each department's
// overlay skills folder) and regenerates all host folders (.claude/, .codex/)
// for the whole workspace whenever a file changes. No harness, no model, no
// manual step: edit a skill in any editor and every host is updated within a
// second. Generated folders are never watched, so the daemon cannot loop.
//
//   node .agents/tools/harness-watch.mjs            # run in the foreground (VS Code task, terminal)
//   node .agents/tools/harness-watch.mjs --daemon   # start detached if not already running (session-start hook)
//   node .agents/tools/harness-watch.mjs --status   # is it running?
//   node .agents/tools/harness-watch.mjs --stop
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, runAll, departmentRoots } from './harness-bridges.mjs';

const pidFile = path.join(root, '.agents/.harness-watch.pid');
const logFile = path.join(root, '.agents/.harness-watch.log');
const self = fileURLToPath(import.meta.url);

function alive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function runningPid() {
  if (!fs.existsSync(pidFile)) return null;
  const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
  return pid && alive(pid) ? pid : null;
}
function watchTargets() {
  const targets = [path.join(root, '.agents')];
  for (const dept of departmentRoots()) {
    const dir = path.join(root, dept.dir);
    targets.push(path.join(dir, '.agents'));
    let dataRoot = 'nave-content-os';
    try { dataRoot = JSON.parse(fs.readFileSync(path.join(dir, fs.existsSync(path.join(dir, 'engine/nave.json')) ? 'engine/nave.json' : 'nave.json'), 'utf8')).dataRoot || dataRoot; } catch {}
    targets.push(path.join(dir, dataRoot, 'skills'));
  }
  return targets.filter(t => fs.existsSync(t));
}
const ignored = /[\\/]\.harness-watch\.(pid|log)$|[\\/]\.claude[\\/]|[\\/]\.codex[\\/]|~$|\.swp$|\.tmp$/;

function watch() {
  fs.writeFileSync(pidFile, String(process.pid));
  // Foreground: print to the terminal. Detached daemon: stdout already goes to the log file, so append only once.
  const log = line => { const msg = new Date().toISOString() + ' ' + line; if (process.stdout.isTTY) console.log(msg); else try { fs.appendFileSync(logFile, msg + '\n'); } catch {} };
  let timer = null, pending = new Set(), quietUntil = 0;
  const flush = () => {
    const changed = [...pending]; pending.clear(); timer = null;
    try {
      const result = runAll('write');
      const written = result.scopes.reduce((n, s) => n + (s.written || 0), 0);
      log(`sync ${result.status} (${written} file(s) rewritten) after ${changed.length} change(s): ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ', …' : ''}` + (result.issues.length ? ' — issues: ' + result.issues.join(' | ') : ''));
    } catch (error) { log('sync ERROR: ' + error.message); }
    // Writes are idempotent, but the events they raise arrive after the fact: ignore them for a moment.
    quietUntil = Date.now() + 1500;
  };
  const targets = watchTargets();
  for (const target of targets) {
    try {
      fs.watch(target, { recursive: true }, (_event, file) => {
        if (Date.now() < quietUntil) return;
        const rel = path.relative(root, path.join(target, file || '')).split(path.sep).join('/');
        if (ignored.test(rel)) return;
        pending.add(rel);
        clearTimeout(timer); timer = setTimeout(flush, 700);
      });
    } catch (error) { log('cannot watch ' + target + ': ' + error.message); }
  }
  log(`watching ${targets.length} canonical folder(s): ${targets.map(t => path.relative(root, t).split(path.sep).join('/')).join(', ')}`);
  const bye = () => { try { fs.unlinkSync(pidFile); } catch {} process.exit(0); };
  process.on('SIGINT', bye); process.on('SIGTERM', bye);
}

const mode = process.argv[2] || '';
if (mode === '--status') {
  const pid = runningPid();
  console.log(JSON.stringify({ running: Boolean(pid), pid, targets: watchTargets().map(t => path.relative(root, t)) }));
} else if (mode === '--stop') {
  const pid = runningPid();
  if (pid) { try { process.kill(pid); } catch {} try { fs.unlinkSync(pidFile); } catch {} }
  console.log(JSON.stringify({ stopped: Boolean(pid) }));
} else if (mode === '--daemon') {
  const pid = runningPid();
  if (pid) { console.log(JSON.stringify({ running: true, pid, started: false })); }
  else {
    const out = fs.openSync(logFile, 'a');
    const child = spawn(process.execPath, [self], { cwd: root, detached: true, stdio: ['ignore', out, out], windowsHide: true });
    child.unref();
    console.log(JSON.stringify({ running: true, pid: child.pid, started: true }));
  }
} else {
  watch();
}
