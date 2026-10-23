import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = value => createHash('sha256').update(value).digest('hex');
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const fail = message => { throw new Error(message); };
const relative = (root, target) => path.relative(root, target).split(path.sep).join('/');
const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const sha256 = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

function identifier(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 100 || reserved.test(value)) fail(`Invalid ${label}`);
  return value;
}
function ownerName(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,99}$/.test(value) || value.endsWith('.')) fail('Invalid owner');
  return value;
}
function cleanRelative(value) {
  if (typeof value !== 'string' || !value || value.includes(':') || /[\x00-\x1f]/.test(value) || path.isAbsolute(value) || path.win32.isAbsolute(value)) fail('Path must be a safe relative path');
  const parts = value.split(/[\\/]/);
  if (parts.some(part => !part || part === '.' || part === '..' || /[ .]$/.test(part) || reserved.test(part))) fail('Path traversal or ambiguous path is not allowed');
  return parts.join('/');
}
function inside(root, target) {
  const rel = path.relative(root, target);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}
function pathKey(value) { return process.platform === 'win32' ? value.toLowerCase() : value; }

// Every existing component is checked. This is cooperative local coordination,
// not an OS sandbox against hostile processes changing directories concurrently.
function checkedPath(root, rel = '', { missing = false, kind } = {}) {
  const target = rel ? path.resolve(root, cleanRelative(rel)) : path.resolve(root);
  if (rel && !inside(path.resolve(root), target)) fail('Path escapes selected root');
  const parsed = path.parse(target);
  let current = parsed.root;
  let info;
  for (const part of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try { info = fs.lstatSync(current); }
    catch (error) {
      if (error.code === 'ENOENT' && missing) return target;
      throw error;
    }
    if (info.isSymbolicLink()) fail('Symlinks and junctions are not allowed');
    if (current !== target && !info.isDirectory()) fail('Path ancestor must be a directory');
    if (info.isFile() && info.nlink !== 1) fail('Hard-linked records are not allowed');
  }
  if (kind === 'file' && !info?.isFile()) fail('Expected a regular file');
  if (kind === 'directory' && !info?.isDirectory()) fail('Expected a directory');
  return target;
}
function readBytes(root, rel) {
  const file = checkedPath(root, rel, { kind: 'file' });
  const before = fs.lstatSync(file);
  if (before.size > 1024 * 1024) fail('Coordination record exceeds one megabyte');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1 || opened.ino !== before.ino || opened.dev !== before.dev) fail('Record changed while opening');
    const bytes = fs.readFileSync(fd);
    const after = fs.lstatSync(checkedPath(root, rel, { kind: 'file' }));
    if (after.ino !== opened.ino || after.dev !== opened.dev || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) fail('Record changed while reading');
    return bytes;
  } finally { fs.closeSync(fd); }
}
function readJson(root, rel) { return JSON.parse(readBytes(root, rel).toString('utf8').replace(/^\uFEFF/, '')); }
function exists(root, rel) {
  checkedPath(root, rel, { missing: true });
  return fs.existsSync(path.resolve(root, rel));
}
function writeExclusive(root, rel, bytes) {
  const file = checkedPath(root, rel, { missing: true });
  checkedPath(root, relative(root, path.dirname(file)), { kind: 'directory' });
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
}
function makeDirectory(root, rel) {
  const parts = cleanRelative(rel).split('/');
  for (let count = 1; count <= parts.length; count++) {
    const sub = parts.slice(0, count).join('/');
    const target = checkedPath(root, sub, { missing: true });
    try { fs.mkdirSync(target); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    checkedPath(root, sub, { kind: 'directory' });
  }
}

function scope(options) {
  const businessId = identifier(options.businessId, 'business identifier');
  const taskId = identifier(options.taskId, 'task identifier');
  const owner = ownerName(options.owner);
  if (!Number.isSafeInteger(options.expectedRevision) || options.expectedRevision < 0) fail('An explicit nonnegative expected revision is required');
  const root = checkedPath(options.root ?? defaultRoot, '', { kind: 'directory' });
  const registry = readJson(root, 'system/workspace.json');
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.businesses)) fail('Invalid workspace registry');
  identifier(registry.operator?.id, 'registered operator identifier');
  const matches = registry.businesses.filter(entry => entry.id === businessId);
  if (matches.length !== 1) fail('Business must be registered exactly once');
  const businessRel = cleanRelative(matches[0].path);
  const businessRoot = checkedPath(root, businessRel, { kind: 'directory' });
  for (const entry of registry.businesses) {
    if (entry === matches[0]) continue;
    const other = path.resolve(root, cleanRelative(entry.path));
    if (!inside(root, other)) fail('Invalid registered business path');
    if (pathKey(other) === pathKey(businessRoot) || inside(other, businessRoot) || inside(businessRoot, other)) fail('Registered businesses must not share or overlap storage');
  }
  const business = readJson(businessRoot, 'business.json');
  if (business.id !== businessId || business.operatorId !== registry.operator?.id) fail('Business identity or operator mismatch');
  const taskRel = `tasks/${taskId}/task.json`;
  const taskBytes = readBytes(businessRoot, taskRel);
  const task = JSON.parse(taskBytes.toString('utf8').replace(/^\uFEFF/, ''));
  if (task.id !== taskId || task.businessId !== businessId) fail('Task identity or business mismatch');
  if (!Number.isSafeInteger(task.revision) || task.revision < 0) fail('Task has invalid revision');
  if (task.revision !== options.expectedRevision) fail(`Stale revision: expected ${options.expectedRevision}, current ${task.revision}`);
  if (task.owner != null) ownerName(task.owner);
  if (task.departments !== undefined && !Array.isArray(task.departments)) fail('Task departments must be an array');
  if (task.coordination !== undefined) {
    const record = task.coordination;
    if (!record || record.schemaVersion !== 1 || !['claimed', 'released'].includes(record.state) || typeof record.claimId !== 'string' || !/^[0-9a-f-]{36}$/.test(record.claimId) || typeof record.mutationId !== 'string' || !/^[0-9a-f-]{36}$/.test(record.mutationId) || !record.latestCheckpoint) fail('Malformed task coordination record');
    if ((record.state === 'claimed') !== (task.owner != null)) fail('Task owner and claim state disagree; manual reconciliation required');
  }
  return { root, businessRoot, businessRel, businessId, taskId, owner, taskRel, taskBytes, task, lockRel: `tasks/${taskId}/.coordination-lock`, recoveryRel: `tasks/${taskId}/.coordination-recovery` };
}
function lockInfo(s) {
  if (!exists(s.businessRoot, s.lockRel)) return null;
  checkedPath(s.businessRoot, s.lockRel, { kind: 'directory' });
  const lock = readJson(s.businessRoot, `${s.lockRel}/owner.json`);
  if (lock.schemaVersion !== 1 || lock.businessId !== s.businessId || lock.taskId !== s.taskId || typeof lock.token !== 'string' || !/^[0-9a-f-]{36}$/.test(lock.token) || !Number.isSafeInteger(lock.pid) || lock.pid < 1 || typeof lock.host !== 'string') fail('Lock is malformed or belongs to another scope; manual inspection required');
  if (!['claim', 'checkpoint', 'release'].includes(lock.action) || !Number.isSafeInteger(lock.expectedRevision) || lock.expectedRevision < 0 || !sha256(lock.beforeSha256)) fail('Lock transaction metadata is malformed; manual inspection required');
  ownerName(lock.owner);
  return lock;
}
function checkpointReference(s) {
  const record = s.task.coordination?.latestCheckpoint;
  if (!record) return null;
  if (!/^sessions\/[a-z0-9-]+\/checkpoints\/[0-9a-f-]{36}\.json$/.test(record.path) || !record.path.startsWith(`sessions/${s.taskId}/checkpoints/`)) fail('Checkpoint reference escapes selected task');
  const bytes = readBytes(s.businessRoot, record.path);
  if (digest(bytes) !== record.sha256) fail('Checkpoint hash mismatch');
  const checkpoint = JSON.parse(bytes);
  if (checkpoint.businessId !== s.businessId || checkpoint.taskId !== s.taskId || checkpoint.revision !== s.task.revision) fail('Checkpoint identity or revision mismatch');
  const coordination = s.task.coordination;
  if (checkpoint.schemaVersion !== 1 || !Number.isSafeInteger(checkpoint.sourceRevision) || checkpoint.sourceRevision < 0 || checkpoint.sourceRevision !== checkpoint.revision - 1 || !['claim', 'checkpoint', 'release'].includes(checkpoint.action)) fail('Checkpoint transaction schema or source revision mismatch');
  if (checkpoint.claimId !== coordination.claimId || checkpoint.mutationId !== coordination.mutationId || record.path !== `sessions/${s.taskId}/checkpoints/${checkpoint.mutationId}.json` || checkpoint.createdAt !== coordination.updatedAt) fail('Checkpoint claim or mutation identity mismatch');
  ownerName(checkpoint.owner);
  if ((checkpoint.action === 'release') !== (coordination.state === 'released') || (coordination.state === 'claimed' && checkpoint.owner !== s.task.owner)) fail('Checkpoint owner or claim state mismatch');
  if (checkpoint.status !== s.task.status || checkpoint.nextAction !== (s.task.nextAction ?? '')) fail('Checkpoint task status or next action mismatch');
  return { path: `${s.businessRel}/${record.path}`, sha256: record.sha256, record: checkpoint };
}

/** Read only. Returns scoped paths and task state, never loads all business context. */
export function readContext(options) {
  const s = scope(options);
  const refs = [];
  const add = (base, rel) => { if (exists(base, rel)) refs.push(relative(s.root, checkedPath(base, rel))); };
  add(s.root, 'AGENTS.md');
  add(s.root, 'system/workflows/session-lifecycle.md');
  add(s.root, 'system/policies/operating-boundaries.md');
  add(s.businessRoot, 'context/README.md');
  add(s.businessRoot, 'memory/index.md');
  for (const department of s.task.departments ?? []) {
    identifier(department, 'department identifier');
    add(s.businessRoot, `departments/${department}/README.md`);
  }
  const checkpoint = checkpointReference(s);
  if (!checkpoint) add(s.businessRoot, `sessions/${s.taskId}/handoff.md`);
  const lock = lockInfo(s);
  const recoveryBlocked = exists(s.businessRoot, s.recoveryRel);
  const continuationState = lock || recoveryBlocked ? 'blocked-by-operation'
    : s.task.owner && s.task.owner !== s.owner ? 'blocked-by-other-owner'
    : s.task.owner && !s.task.coordination ? 'legacy-ownership-needs-review'
    : s.task.owner ? 'owned-active-claim' : 'unclaimed';
  return {
    businessId: s.businessId, taskId: s.taskId, revision: s.task.revision,
    task: s.task, taskPath: `${s.businessRel}/${s.taskRel}`, taskSha256: digest(s.taskBytes),
    requestedOwner: s.owner, canClaim: !s.task.owner && !lock && !recoveryBlocked && !['complete', 'completed', 'cancelled'].includes(s.task.status),
    ownerMatches: s.task.owner === s.owner, continuationState, lock, recoveryBlocked, references: refs, checkpoint,
    authority: 'Task record is current authority; a handoff is supporting context. No agent, scheduler, connector or external action is executed.'
  };
}

function payloadFor(s, payload) {
  const allowed = new Set(['summary', 'nextAction', 'status', 'outputs', 'verification']);
  for (const key of Object.keys(payload)) if (!allowed.has(key)) fail(`Unsupported checkpoint field: ${key}`);
  const text = (value, label) => {
    if (typeof value !== 'string' || value.length > 12000) fail(`Invalid ${label}`);
    return value;
  };
  const result = {};
  for (const key of ['summary', 'nextAction']) if (payload[key] !== undefined) result[key] = text(payload[key], key);
  if (payload.status !== undefined) {
    if (!['in-progress', 'blocked', 'ready-for-review', 'complete', 'completed', 'cancelled'].includes(payload.status)) fail('Invalid task status');
    result.status = payload.status;
  }
  for (const key of ['outputs', 'verification']) {
    if (payload[key] === undefined) continue;
    if (!Array.isArray(payload[key]) || payload[key].length > 100) fail(`Invalid ${key}`);
    result[key] = payload[key].map(value => {
      text(value, key);
      if (key === 'outputs') {
        const rel = cleanRelative(value);
        checkedPath(s.businessRoot, rel, { kind: 'file' });
        return rel;
      }
      return value;
    });
  }
  if (jsonBytes(result).length > 256 * 1024) fail('Checkpoint payload exceeds 256 kilobytes');
  return result;
}
function validateMutation(s, action, options) {
  checkpointReference(s);
  if (action === 'claim') {
    if (s.task.owner != null) fail('Task already has an owner; no implicit takeover, including legacy ownership');
    if (['complete', 'completed', 'cancelled'].includes(s.task.status)) fail('Terminal task cannot be claimed without a separate authorized reopening');
  } else if (s.task.owner !== s.owner || s.task.coordination?.schemaVersion !== 1 || s.task.coordination?.state !== 'claimed' || !options.claimId || s.task.coordination.claimId !== options.claimId) {
    fail('Matching owner and active claim are required');
  }
}
function assertHeld(s, token) {
  const lock = lockInfo(s);
  if (!lock || lock.owner !== s.owner || lock.token !== token) fail('Operation lock ownership changed; no cleanup performed');
  return lock;
}
function cleanup(s, token) {
  assertHeld(s, token);
  const allowed = new Set(['owner.json', 'intent.json', 'task-next.json', 'failure.json']);
  const entries = fs.readdirSync(checkedPath(s.businessRoot, s.lockRel, { kind: 'directory' }));
  for (const name of entries) {
    if (!allowed.has(name)) fail('Unexpected lock contents; manual inspection required');
    checkedPath(s.businessRoot, `${s.lockRel}/${name}`, { kind: 'file' });
  }
  for (const name of entries.filter(name => name !== 'owner.json')) fs.unlinkSync(checkedPath(s.businessRoot, `${s.lockRel}/${name}`, { kind: 'file' }));
  fs.unlinkSync(checkedPath(s.businessRoot, `${s.lockRel}/owner.json`, { kind: 'file' }));
  fs.rmdirSync(checkedPath(s.businessRoot, s.lockRel, { kind: 'directory' }));
}

/** Explicit local mutation. hooks is only for deterministic fault tests; CLI has no hooks. */
export function mutate(action, options, payload = {}, hooks = {}) {
  if (!['claim', 'checkpoint', 'release'].includes(action)) fail('Unknown mutation');
  let s = scope(options);
  const sanitized = payloadFor(s, payload);
  if (action === 'claim' && Object.keys(sanitized).length) fail('Claim does not accept a checkpoint payload');
  validateMutation(s, action, options);
  if (exists(s.businessRoot, s.recoveryRel)) fail('Recovery gate exists; mutation blocked until recovery finishes or an operator inspects its residue');
  const token = randomUUID();
  const lock = {
    schemaVersion: 1, businessId: s.businessId, taskId: s.taskId, owner: s.owner,
    token, pid: process.pid, host: os.hostname(), action, expectedRevision: s.task.revision,
    beforeSha256: digest(s.taskBytes), createdAt: new Date().toISOString()
  };
  // mkdir is the mutual-exclusion point. Existing/stale locks are never stolen.
  try { fs.mkdirSync(checkedPath(s.businessRoot, s.lockRel, { missing: true })); }
  catch (error) { if (error.code === 'EEXIST') fail('Task operation is locked; inspect status and use explicit same-owner recovery if needed'); throw error; }
  try {
    writeExclusive(s.businessRoot, `${s.lockRel}/owner.json`, jsonBytes(lock));
    if (exists(s.businessRoot, s.recoveryRel)) fail('Recovery began while acquiring this operation; mutation refused');
    hooks.onStage?.('locked', { lock });
    const fresh = scope(options);
    if (pathKey(fresh.businessRoot) !== pathKey(s.businessRoot) || digest(fresh.taskBytes) !== lock.beforeSha256) fail('Task or registry changed before claim validation');
    s = fresh;
    validateMutation(s, action, options);
    const now = new Date().toISOString();
    const revision = s.task.revision + 1;
    if (!Number.isSafeInteger(revision)) fail('Task revision overflow');
    const claimId = action === 'claim' ? randomUUID() : options.claimId;
    const checkpointRel = `sessions/${s.taskId}/checkpoints/${token}.json`;
    const record = {
      schemaVersion: 1, businessId: s.businessId, taskId: s.taskId, owner: s.owner,
      action, claimId, mutationId: token, sourceRevision: s.task.revision, revision, createdAt: now,
      status: sanitized.status ?? s.task.status, nextAction: sanitized.nextAction ?? s.task.nextAction ?? '',
      previousCheckpoint: s.task.coordination?.latestCheckpoint ?? null, ...sanitized
    };
    const bytes = jsonBytes(record);
    const next = {
      ...s.task,
      ...(sanitized.status ? { status: sanitized.status } : {}),
      ...(sanitized.nextAction !== undefined ? { nextAction: sanitized.nextAction } : {}),
      revision, owner: action === 'release' ? null : s.owner,
      coordination: {
        schemaVersion: 1, state: action === 'release' ? 'released' : 'claimed', claimId,
        mutationId: token, updatedAt: now,
        latestCheckpoint: { path: checkpointRel, sha256: digest(bytes) }
      }
    };
    const nextBytes = jsonBytes(next);
    const intent = { schemaVersion: 1, token, beforeSha256: lock.beforeSha256, afterSha256: digest(nextBytes), checkpointPath: checkpointRel, checkpointSha256: digest(bytes), revision };
    writeExclusive(s.businessRoot, `${s.lockRel}/intent.json`, jsonBytes(intent));
    makeDirectory(s.businessRoot, `sessions/${s.taskId}/checkpoints`);
    writeExclusive(s.businessRoot, checkpointRel, bytes);
    writeExclusive(s.businessRoot, `${s.lockRel}/task-next.json`, nextBytes);
    hooks.onStage?.('prepared', { lock, intent });
    assertHeld(s, token);
    const precommit = scope(options);
    if (pathKey(precommit.businessRoot) !== pathKey(s.businessRoot) || digest(precommit.taskBytes) !== lock.beforeSha256) fail('Concurrent uncoordinated task edit detected; commit refused');
    // Same-volume atomic task replacement: this pointer is the commit point.
    fs.renameSync(checkedPath(s.businessRoot, `${s.lockRel}/task-next.json`, { kind: 'file' }), checkedPath(s.businessRoot, s.taskRel, { kind: 'file' }));
    hooks.onStage?.('committed', { lock, intent });
    cleanup(s, token);
    return { action, committed: true, businessId: s.businessId, taskId: s.taskId, revision, claimId, checkpoint: `${s.businessRel}/${checkpointRel}` };
  } catch (error) {
    try {
      assertHeld(s, token);
      if (!exists(s.businessRoot, `${s.lockRel}/failure.json`)) writeExclusive(s.businessRoot, `${s.lockRel}/failure.json`, jsonBytes({ token, at: new Date().toISOString(), failed: true }));
    } catch { /* Incomplete/corrupt lock is deliberately retained for manual inspection. */ }
    const wrapped = new Error(`${error.message}. Operation residue retained; inspect task revision before retrying, then recover explicitly with the same owner and lock token.`);
    wrapped.lockToken = token;
    throw wrapped;
  }
}

/** Reconcile a failed/dead operation without retrying it or releasing its task claim. */
export function recover(options, token, hooks = {}) {
  const s = scope(options);
  assertHeld(s, token);
  // Serialize recovery separately from the stale operation lock. New mutations
  // honor this gate, preventing one recovery from deleting a later owner's lock.
  try { fs.mkdirSync(checkedPath(s.businessRoot, s.recoveryRel, { missing: true })); }
  catch (error) { if (error.code === 'EEXIST') fail('Another recovery or recovery residue exists; no recovery gate is automatically stolen'); throw error; }
  const gate = { token: randomUUID(), owner: s.owner, pid: process.pid, host: os.hostname(), operationToken: token };
  let gateWritten = false;
  try {
    writeExclusive(s.businessRoot, `${s.recoveryRel}/owner.json`, jsonBytes(gate));
    gateWritten = true;
    hooks.onStage?.('recovery-locked');
    return reconcile(s, options, token);
  } finally {
    if (gateWritten) {
      const current = readJson(s.businessRoot, `${s.recoveryRel}/owner.json`);
      if (current.token !== gate.token) fail('Recovery gate identity changed; manual inspection required');
      const entries = fs.readdirSync(checkedPath(s.businessRoot, s.recoveryRel, { kind: 'directory' }));
      if (entries.length !== 1 || entries[0] !== 'owner.json') fail('Unexpected recovery gate contents; retained for manual inspection');
      fs.unlinkSync(checkedPath(s.businessRoot, `${s.recoveryRel}/owner.json`, { kind: 'file' }));
      fs.rmdirSync(checkedPath(s.businessRoot, s.recoveryRel, { kind: 'directory' }));
    }
  }
}
function reconcile(s, options, token) {
  const lock = assertHeld(s, token);
  if (lock.host !== os.hostname()) fail('Lock host differs; manual recovery required');
  let alive = true;
  try { process.kill(lock.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
  const recordedFailure = exists(s.businessRoot, `${s.lockRel}/failure.json`) && readJson(s.businessRoot, `${s.lockRel}/failure.json`).token === token;
  if (alive && !(lock.pid === process.pid && recordedFailure)) fail('Lock process is still alive or PID was reused; no recovery performed');
  const current = scope(options);
  if (pathKey(current.businessRoot) !== pathKey(s.businessRoot)) fail('Registry routing changed during recovery');
  s = current;
  const hash = digest(s.taskBytes);
  let outcome;
  let orphan = null;
  if (exists(s.businessRoot, `${s.lockRel}/intent.json`)) {
    const intent = readJson(s.businessRoot, `${s.lockRel}/intent.json`);
    if (intent.schemaVersion !== 1 || intent.token !== token || intent.beforeSha256 !== lock.beforeSha256 || !sha256(intent.afterSha256) || !sha256(intent.checkpointSha256) || !Number.isSafeInteger(intent.revision) || intent.revision !== lock.expectedRevision + 1 || intent.checkpointPath !== `sessions/${s.taskId}/checkpoints/${token}.json`) fail('Recovery intent is inconsistent; manual inspection required');
    if (exists(s.businessRoot, intent.checkpointPath) && digest(readBytes(s.businessRoot, intent.checkpointPath)) !== intent.checkpointSha256) fail('Recovery checkpoint hash mismatch; evidence retained for manual inspection');
    if (exists(s.businessRoot, `${s.lockRel}/task-next.json`) && digest(readBytes(s.businessRoot, `${s.lockRel}/task-next.json`)) !== intent.afterSha256) fail('Recovery staged task hash mismatch; evidence retained for manual inspection');
    if (hash === intent.afterSha256) {
      if (s.task.coordination?.mutationId !== token) fail('Committed mutation identity mismatch');
      if (s.task.revision !== intent.revision || s.task.coordination.latestCheckpoint.path !== intent.checkpointPath || s.task.coordination.latestCheckpoint.sha256 !== intent.checkpointSha256) fail('Recovery intent and committed checkpoint are inconsistent; manual inspection required');
      outcome = 'already-committed';
    } else if (hash === lock.beforeSha256) {
      outcome = 'not-committed';
      if (exists(s.businessRoot, intent.checkpointPath)) orphan = `${s.businessRel}/${intent.checkpointPath}`;
    } else fail('Task differs from both transaction states; manual reconciliation required');
  } else {
    if (hash !== lock.beforeSha256) fail('Task changed without a prepared intent; manual reconciliation required');
    outcome = 'not-committed';
  }
  checkpointReference(s);
  cleanup(s, token);
  return { recovered: true, outcome, revision: s.task.revision, owner: s.task.owner ?? null, preservedOrphanCheckpoint: orphan, note: 'Only this operation lock was removed. No task claim was stolen or released; no operation was replayed.' };
}

function parseArgs(args) {
  const result = {};
  const allowed = new Set(['root', 'business', 'task', 'owner', 'revision', 'claim', 'lock', 'summary', 'next', 'state', 'outputs', 'verification']);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '');
    if (!args[index]?.startsWith('--') || !allowed.has(key) || result[key] !== undefined || args[index + 1] === undefined) fail('Invalid, duplicate or incomplete CLI option');
    result[key] = args[index + 1];
  }
  if (!/^\d+$/.test(result.revision ?? '')) fail('Explicit numeric --revision is required');
  const options = { root: result.root ?? defaultRoot, businessId: result.business, taskId: result.task, owner: result.owner, expectedRevision: Number(result.revision), claimId: result.claim };
  const payload = {};
  for (const [flag, field] of [['summary', 'summary'], ['next', 'nextAction'], ['state', 'status'], ['outputs', 'outputs'], ['verification', 'verification']]) {
    if (result[flag] !== undefined) payload[field] = ['outputs', 'verification'].includes(flag) ? JSON.parse(result[flag]) : result[flag];
  }
  return { options, payload, token: result.lock };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const action = process.argv[2];
    const { options, payload, token } = parseArgs(process.argv.slice(3));
    if (!['status', 'continue', 'claim', 'checkpoint', 'release', 'recover'].includes(action)) fail('Use status, continue, claim, checkpoint, release or recover');
    if (['status', 'continue', 'recover'].includes(action) && Object.keys(payload).length) fail('Read/recovery actions do not accept payload fields');
    const result = ['status', 'continue'].includes(action) ? readContext(options) : action === 'recover' ? recover(options, token) : mutate(action, options, payload);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message, ...(error.lockToken ? { lockToken: error.lockToken } : {}) }));
    process.exitCode = 1;
  }
}
