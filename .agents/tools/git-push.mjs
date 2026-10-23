// git-push.mjs — push a repository with a token, non-interactively, without ever printing the token.
//
// Why: on this PC no credential helper works from an agent session (the GitHub CLI login is dead and
// git prompts for a password). The token lives in the workspace's own `.env` (gitignored), read at
// push time (or from the process environment).
//
//   node .agents/tools/git-push.mjs                  # push the workspace root (HEAD -> origin main)
//   node .agents/tools/git-push.mjs --repo <path>    # push another repository listed in system/repos.json
//   node .agents/tools/git-push.mjs --all            # every entry in system/repos.json
//   node .agents/tools/git-push.mjs --status [--all] # ahead/behind and remote, no push
//
// Rules: pushes only what is already committed (never adds or commits); refuses a dirty tree unless
// --allow-dirty; masks the token in every message; updates the tracking ref after a URL push so
// `git status` stops saying "ahead".
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function git(cwd, args, extra = {}) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', ...extra });
}
function dotenv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}
export function resolveToken() {
  const env = { ...dotenv(path.join(root, '.env')), ...process.env };
  for (const key of ['GITHUB_TOKEN', 'GH_TOKEN']) if (env[key] && env[key].length >= 30) return { token: env[key], source: process.env[key] ? 'environment' : '.env', user: env.GITHUB_USER || 'x-access-token' };
  return null;
}
function parseRemote(url) {
  const m = url.match(/^https?:\/\/(?:[^@\/]+@)?github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/) || url.match(/^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/);
  return m ? { owner: m[1], repo: m[2] } : null;
}
export function repoStatus(repo, remote = 'origin', branch = 'main') {
  const cwd = path.resolve(root, repo);
  if (!fs.existsSync(path.join(cwd, '.git'))) return { repo, error: 'not a git repository' };
  const url = git(cwd, ['remote', 'get-url', remote]).stdout.trim();
  if (!url) return { repo, error: `no remote "${remote}"` };
  const head = git(cwd, ['rev-parse', '--short', 'HEAD']).stdout.trim();
  const dirty = git(cwd, ['status', '--porcelain']).stdout.trim().split('\n').filter(Boolean).length;
  // A remote branch that was never fetched (new repository) counts every local commit as ahead, never as in sync.
  const remoteKnown = git(cwd, ['rev-parse', '--verify', '--quiet', `${remote}/${branch}`]).status === 0;
  const ahead = remoteKnown ? Number(git(cwd, ['rev-list', '--count', `${remote}/${branch}..HEAD`]).stdout.trim() || 0) : Number(git(cwd, ['rev-list', '--count', 'HEAD']).stdout.trim() || 0);
  const behind = remoteKnown ? Number(git(cwd, ['rev-list', '--count', `HEAD..${remote}/${branch}`]).stdout.trim() || 0) : 0;
  const gh = parseRemote(url);
  return { repo, head, remote: gh ? `${gh.owner}/${gh.repo}` : url, branch, ahead, behind, dirty, remoteBranch: remoteKnown };
}
export function pushRepo(repo, { remote = 'origin', branch = 'main', allowDirty = false } = {}) {
  const status = repoStatus(repo, remote, branch);
  if (status.error) return { ...status, status: 'SKIPPED' };
  if (status.dirty && !allowDirty) return { ...status, status: 'REFUSED', reason: `${status.dirty} uncommitted change(s); commit first (explicit paths, never -A) or pass --allow-dirty` };
  if (!status.ahead && !status.behind) return { ...status, status: 'IN-SYNC' };
  const cwd = path.resolve(root, repo);
  const gh = parseRemote(git(cwd, ['remote', 'get-url', remote]).stdout.trim());
  if (!gh) return { ...status, status: 'SKIPPED', reason: 'remote is not a github.com URL' };
  const auth = resolveToken();
  if (!auth) return { ...status, status: 'NO-TOKEN', reason: 'set GITHUB_TOKEN in the workspace .env (gitignored); see system/git-access.md' };
  const url = `https://${auth.user}:${auth.token}@github.com/${gh.owner}/${gh.repo}.git`;
  const mask = s => (s || '').split(auth.token).join('***');
  const r = git(cwd, ['-c', 'credential.helper=', 'push', '-q', url, `HEAD:${branch}`]);
  if (r.status !== 0) return { ...status, status: 'FAILED', reason: mask(r.stderr).trim().slice(-300), tokenSource: auth.source };
  git(cwd, ['-c', 'credential.helper=', 'fetch', '-q', url, branch]);
  const fetched = git(cwd, ['rev-parse', 'FETCH_HEAD']).stdout.trim();
  if (fetched) git(cwd, ['update-ref', `refs/remotes/${remote}/${branch}`, fetched]);
  const after = repoStatus(repo, remote, branch);
  return { ...after, status: after.ahead === 0 ? 'PUSHED' : 'DIVERGED', tokenSource: auth.source };
}
export function repoList() {
  const file = path.join(root, 'system/repos.json');
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).repos || [] : [];
  return [{ id: 'workspace', path: '.', remote: 'origin', branch: 'main' }, ...list.filter(r => r.path && r.path !== '.')];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
  const all = args.includes('--all'), statusOnly = args.includes('--status'), allowDirty = args.includes('--allow-dirty');
  const targets = all ? repoList() : [{ id: opt('--repo') ? path.basename(opt('--repo')) : 'workspace', path: opt('--repo', '.'), remote: opt('--remote', 'origin'), branch: opt('--branch', 'main') }];
  const results = targets.map(t => ({ id: t.id, ...(statusOnly ? repoStatus(t.path, t.remote, t.branch) : pushRepo(t.path, { remote: t.remote, branch: t.branch, allowDirty })) }));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => ['FAILED', 'NO-TOKEN', 'REFUSED', 'DIVERGED'].includes(r.status))) process.exitCode = 1;
}
