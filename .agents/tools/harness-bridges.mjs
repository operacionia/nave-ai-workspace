// harness-bridges.mjs — one canonical agent layer, generated host bindings.
//
// Canonical (author here, nowhere else):
//   .agents/skills/<name>/SKILL.md   workspace skills (Agent Skills format; Codex reads this folder natively)
//   .agents/agents/<name>.md         subagent roles, if the workspace ever needs any (Claude format = canonical)
//   .agents/hooks/hooks.json         host-neutral hook manifest; scripts live beside it
// Generated (never edit by hand):
//   .claude/skills/<name>/SKILL.md   pointer bridge (Claude Code does not read .agents/)
//   .claude/agents/<name>.md         full copy with a marker
//   .claude/settings.json            only its "hooks" key; every other key is the operator's
//   .codex/agents/<name>.toml        Codex custom agent (name, description, developer_instructions)
//   .codex/hooks.json                Codex hooks (same event names and matchers as Claude Code)
// Same mechanism as the Nave package's tools/skill-bridges.mjs.
//
//   node .agents/tools/harness-bridges.mjs check   # exit 1 when stale/missing/extra
//   node .agents/tools/harness-bridges.mjs write   # (re)generate all host files
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canonicalDir = path.join(root, '.agents/skills');
const bridgeDir = path.join(root, '.claude/skills');
const MARKER = '<!-- Generated discovery bridge. Edit the canonical skill in .agents/skills, not this file. -->';
const AGENT_MARKER = '<!-- Generated host copy. Edit the canonical agent in .agents/agents, not this file. -->';
const TOML_MARKER = '# Generated host copy. Edit the canonical agent in .agents/agents/<name>.md, not this file.';

function splitFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return match ? { front: match[1], body: source.slice(match[0].length) } : null;
}
function yamlScalar(front, key) {
  const lines = front.split(/\r?\n/);
  const index = lines.findIndex(line => line.startsWith(key + ':'));
  if (index < 0) return undefined;
  let value = lines[index].slice(key.length + 1).trim();
  const continuation = [];
  for (let j = index + 1; j < lines.length && /^[ \t]+\S/.test(lines[j]); j++) continuation.push(lines[j].trim());
  if (['>', '>-', '|', '|-'].includes(value)) value = continuation.join(' ');
  else if (continuation.length) value = [value, ...continuation].join(' ');
  if (/^".*"$/s.test(value)) value = value.slice(1, -1).replace(/\\"/g, '"');
  else if (/^'.*'$/s.test(value)) value = value.slice(1, -1);
  return value.trim();
}

export function expectedBridges() {
  if (!fs.existsSync(canonicalDir)) return [];
  return fs.readdirSync(canonicalDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(canonicalDir, d.name, 'SKILL.md')))
    .map(d => {
      const source = fs.readFileSync(path.join(canonicalDir, d.name, 'SKILL.md'), 'utf8');
      const front = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
      if (!front) throw new Error('Missing frontmatter: ' + d.name);
      const description = front.match(/^description:\s*(.+)(?:\r?\n[ \t]+.*)*/m)?.[0];
      if (!description) throw new Error('Missing description: ' + d.name);
      const invocation = front.match(/^disable-model-invocation:\s*(true|false)\s*$/m)?.[0];
      const entry = '../../../.agents/skills/' + d.name + '/SKILL.md';
      const text = ['---', 'name: ' + d.name, description, invocation, '---', '',
        MARKER, '',
        'This is a compatibility entry for Claude Code, not a second implementation.',
        'Read [the canonical ' + d.name + ' skill](' + entry + ') completely and follow it.',
        'Resolve its relative references and scripts from that canonical directory, not from this bridge.',
        'The workspace [operating map](../../../AGENTS.md) defines scope, business selection and boundaries.', '']
        .filter(v => v !== undefined).join('\n');
      return { name: d.name, path: '.claude/skills/' + d.name + '/SKILL.md', text };
    });
}

const tomlString = value => JSON.stringify(value);
function tomlMultiline(value) {
  if (!value.includes("'''")) return "'''\n" + value + "\n'''";
  return '"""\n' + value.replace(/\\/g, '\\\\').replace(/"""/g, '""\\"') + '\n"""';
}
export function expectedAgents() {
  const dir = path.join(root, '.agents/agents');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!d.isFile() || !d.name.endsWith('.md')) continue;
    const id = d.name.slice(0, -3);
    const source = fs.readFileSync(path.join(dir, d.name), 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFrontmatter(source);
    if (!parsed) throw new Error('Missing frontmatter: agent ' + id);
    const name = yamlScalar(parsed.front, 'name'), description = yamlScalar(parsed.front, 'description');
    if (name !== id) throw new Error('Agent name disagrees with its file name: ' + id);
    if (!description) throw new Error('Missing description: agent ' + id);
    const body = parsed.body.replace(/^\n+/, '');
    out.push({ name: id, path: '.claude/agents/' + id + '.md', text: '---\n' + parsed.front + '\n---\n\n' + AGENT_MARKER + '\n\n' + body });
    out.push({ name: id, path: '.codex/agents/' + id + '.toml', text: [TOML_MARKER.replace('<name>', id), 'name = ' + tomlString(name), 'description = ' + tomlString(description), 'developer_instructions = ' + tomlMultiline(body.trim()), ''].join('\n') });
  }
  return out;
}

export function expectedHooks() {
  const file = path.join(root, '.agents/hooks/hooks.json');
  if (!fs.existsSync(file)) return null;
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const render = host => {
    const hooks = {};
    for (const [event, groups] of Object.entries(manifest.hooks || {})) {
      hooks[event] = groups.map(group => {
        const rendered = {};
        if (group.matcher) rendered.matcher = group.matcher;
        rendered.hooks = (group.hooks || []).map(hook => {
          const { script, claude, codex, ...rest } = hook;
          if (typeof script !== 'string' || !script.startsWith('.agents/hooks/')) throw new Error('Hook scripts must live in .agents/hooks: ' + JSON.stringify(hook));
          if (!fs.existsSync(path.join(root, script))) throw new Error('Missing hook script: ' + script);
          const command = host === 'claude' ? `bash "$CLAUDE_PROJECT_DIR/${script}"` : `bash "${script}" --json`;
          return { type: 'command', command, ...rest, ...((host === 'claude' ? claude : codex) || {}) };
        });
        return rendered;
      });
    }
    return hooks;
  };
  return { claude: render('claude'), codex: render('codex') };
}
const readJson = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isGenerated = file => fs.existsSync(file) && /Generated (discovery bridge|host copy)/.test(fs.readFileSync(file, 'utf8'));

export function checkBridges() {
  const expected = expectedBridges(), agents = expectedAgents(), hooks = expectedHooks(); const issues = [];
  for (const item of expected) {
    const file = path.join(root, item.path);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== item.text) issues.push('Missing/stale bridge: ' + item.path);
    else if (fs.readdirSync(path.dirname(file)).length !== 1) issues.push('Extra files beside bridge: ' + item.path);
  }
  if (fs.existsSync(bridgeDir)) for (const name of fs.readdirSync(bridgeDir)) if (!expected.some(e => e.name === name)) issues.push('Bridge without canonical skill: ' + name);
  for (const item of agents) {
    const file = path.join(root, item.path);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== item.text) issues.push('Missing/stale agent copy: ' + item.path);
  }
  for (const [dir, ext] of [['.claude/agents', '.md'], ['.codex/agents', '.toml']]) {
    const parent = path.join(root, dir);
    if (!fs.existsSync(parent)) continue;
    for (const name of fs.readdirSync(parent)) {
      if (!name.endsWith(ext) || agents.some(a => a.path === dir + '/' + name)) continue;
      issues.push((isGenerated(path.join(parent, name)) ? 'Orphan generated agent copy: ' : 'Agent outside the canonical .agents/agents folder: ') + dir + '/' + name);
    }
  }
  if (hooks) {
    if (!sameJson(readJson(path.join(root, '.codex/hooks.json')), { hooks: hooks.codex })) issues.push('Missing/stale hooks: .codex/hooks.json');
    const settings = readJson(path.join(root, '.claude/settings.json'));
    if (!settings || !sameJson(settings.hooks, hooks.claude)) issues.push('Missing/stale hooks: .claude/settings.json#hooks');
  }
  return { status: issues.length ? 'FAIL' : 'PASS', bridges: expected.length, agents: agents.length / 2, hooks: Boolean(hooks), issues };
}

// Idempotent writes: an unchanged file is never touched, so file watchers see no event and cannot loop.
function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') === text.replace(/\r\n/g, '\n')) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
  return true;
}
export function writeBridges() {
  const expected = expectedBridges(), agents = expectedAgents(), hooks = expectedHooks(); const issues = []; let written = 0;
  // Remove bridges whose canonical skill is gone; keep the rest in place so unchanged files are untouched.
  if (fs.existsSync(bridgeDir)) for (const name of fs.readdirSync(bridgeDir)) if (!expected.some(e => e.name === name)) fs.rmSync(path.join(bridgeDir, name), { recursive: true, force: true });
  for (const item of expected) if (writeIfChanged(path.join(root, item.path), item.text)) written++;
  for (const item of agents) {
    const file = path.join(root, item.path);
    if (fs.existsSync(file) && !isGenerated(file)) { issues.push('Refusing to overwrite a real implementation: ' + item.path); continue; }
    if (writeIfChanged(file, item.text)) written++;
  }
  if (hooks) {
    if (writeIfChanged(path.join(root, '.codex/hooks.json'), JSON.stringify({ hooks: hooks.codex }, null, 2) + '\n')) written++;
    const settingsFile = path.join(root, '.claude/settings.json');
    const current = readJson(settingsFile) || { $schema: 'https://json.schemastore.org/claude-code-settings.json' };
    if (writeIfChanged(settingsFile, JSON.stringify({ ...current, hooks: hooks.claude }, null, 2) + '\n')) written++;
  }
  return { status: issues.length ? 'PARTIAL' : 'WRITTEN', bridges: expected.length, agents: agents.length / 2, hooks: Boolean(hooks), written, names: expected.map(e => e.name), issues };
}

// --- Whole-workspace mode: the root plus every registered content department that ships its own generator.
import { spawnSync } from 'node:child_process';
export function departmentRoots() {
  const registry = ['system/workspace.json', 'workspace.json'].map(p => path.join(root, p)).find(p => fs.existsSync(p));
  if (!registry) return [];
  const reg = JSON.parse(fs.readFileSync(registry, 'utf8'));
  return (reg.businesses || [])
    .filter(b => b.contentDepartment && (fs.existsSync(path.join(root, b.contentDepartment, 'engine/tools/skill-bridges.mjs')) || fs.existsSync(path.join(root, b.contentDepartment, 'tools/skill-bridges.mjs'))))
    .map(b => ({ business: b.id, dir: b.contentDepartment }));
}
export function runAll(mode) {
  const results = [{ scope: 'workspace', ...(mode === 'write' ? writeBridges() : checkBridges()) }];
  for (const dept of departmentRoots()) {
    const run = spawnSync(process.execPath, [fs.existsSync(path.join(root, dept.dir, 'engine/tools/skill-bridges.mjs')) ? 'engine/tools/skill-bridges.mjs' : 'tools/skill-bridges.mjs', mode], { cwd: path.join(root, dept.dir), encoding: 'utf8' });
    let parsed;
    try { parsed = JSON.parse(run.stdout); } catch { parsed = { status: 'ERROR', issues: [(run.stderr || run.stdout || 'generator failed').trim().split('\n').slice(-1)[0]] }; }
    results.push({ scope: dept.business + ' → ' + dept.dir, ...parsed });
  }
  const issues = results.flatMap(r => (r.issues || []).map(i => r.scope + ': ' + i));
  return { status: issues.length ? 'FAIL' : (mode === 'write' ? 'WRITTEN' : 'PASS'), scopes: results.map(r => ({ scope: r.scope, status: r.status, bridges: r.bridges, agents: r.agents, hooks: r.hooks, legacy: r.legacy, written: r.written })), issues };
}
export function installGitHook() {
  const hooksDir = path.join(root, '.git/hooks');
  if (!fs.existsSync(path.join(root, '.git'))) return { status: 'SKIPPED', reason: 'not a git repository' };
  fs.mkdirSync(hooksDir, { recursive: true });
  const file = path.join(hooksDir, 'pre-commit');
  fs.writeFileSync(file, ['#!/usr/bin/env bash', '# Installed by node .agents/tools/harness-bridges.mjs install-git-hook — refuses a commit while any host folder is stale.',
    'node .agents/tools/harness-bridges.mjs check --all >/tmp/harness-check.json 2>&1 || { echo "Host folders are stale. Run: node .agents/tools/harness-bridges.mjs write --all  (or the sync skill), then commit again."; cat /tmp/harness-check.json | grep -E "issues|: " | head -20; exit 1; }', ''].join('\n'), { mode: 0o755 });
  return { status: 'INSTALLED', file: '.git/hooks/pre-commit' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const mode = args.find(a => !a.startsWith('--')) || 'check';
  const all = args.includes('--all');
  const result = mode === 'install-git-hook' ? installGitHook() : all ? runAll(mode) : mode === 'write' ? writeBridges() : checkBridges();
  console.log(JSON.stringify(result, null, 2));
  if (result.issues?.length) process.exitCode = 1;
}
