import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readContext, mutate, recover } from '../operations/workspace-operations.mjs';

// All mutation tests use synthetic, uniquely created temporary fixtures.
// No test reads or mutates a live business task. Fixtures are retained for inspection.
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-operations-test-'));
const moduleUrl = new URL('../operations/workspace-operations.mjs', import.meta.url).href;
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
}
function fixture() {
  const root = fs.mkdtempSync(path.join(sandbox, 'fixture-'));
  write(path.join(root, 'system/workspace.json'), { schemaVersion: 1, operator: { id: 'operator' }, businesses: ['alpha', 'beta'].map(id => ({ id, path: `businesses/${id}` })) });
  write(path.join(root, 'AGENTS.md'), 'Synthetic operating map');
  write(path.join(root, 'system/workflows/session-lifecycle.md'), 'Synthetic lifecycle');
  write(path.join(root, 'system/policies/operating-boundaries.md'), 'Synthetic boundaries');
  for (const id of ['alpha', 'beta']) {
    const base = path.join(root, 'businesses', id);
    write(path.join(base, 'business.json'), { id, operatorId: 'operator', departments: ['content'] });
    write(path.join(base, 'context/README.md'), `Synthetic ${id} context`);
    write(path.join(base, 'departments/content/README.md'), `Synthetic ${id} department`);
    write(path.join(base, 'tasks/one/task.json'), { id: 'one', businessId: id, revision: 1, owner: null, title: 'Synthetic task', status: 'ready', departments: ['content'], nextAction: 'Review fixture' });
    write(path.join(base, 'sessions/one/handoff.md'), `Synthetic ${id} handoff`);
  }
  const options = { root, businessId: 'alpha', taskId: 'one', owner: 'session-one', expectedRevision: 1 };
  return { root, options, task: path.join(root, 'businesses/alpha/tasks/one/task.json'), lock: path.join(root, 'businesses/alpha/tasks/one/.coordination-lock') };
}
function snapshot(root) {
  const values = {};
  function walk(directory) {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const info = fs.lstatSync(file);
      values[path.relative(root, file)] = info.isFile() ? `${info.mtimeMs}:${fs.readFileSync(file).toString('base64')}` : info.isSymbolicLink() ? `link:${fs.readlinkSync(file)}` : 'directory';
      if (info.isDirectory() && !info.isSymbolicLink()) walk(file);
    }
  }
  walk(root);
  return values;
}
function get(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function crash(f, stage, action = 'claim', options = f.options) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `import { mutate } from ${JSON.stringify(moduleUrl)}; mutate(${JSON.stringify(action)}, ${JSON.stringify(options)}, {}, { onStage(stage) { if(stage === ${JSON.stringify(stage)}) process.exit(88); } });`], { encoding: 'utf8', windowsHide: true });
}
function child(script) {
  return new Promise((resolve, reject) => {
    const processChild = spawn(process.execPath, ['--input-type=module', '-e', script], { windowsHide: true });
    let output = '';
    processChild.stdout.on('data', chunk => { output += chunk; });
    processChild.stderr.on('data', chunk => { output += chunk; });
    processChild.on('error', reject);
    processChild.on('exit', code => resolve({ code, output }));
  });
}

test('continue/status reads scoped routes and makes zero filesystem changes', () => {
  const f = fixture();
  const before = snapshot(f.root);
  const result = readContext(f.options);
  assert.equal(result.taskId, 'one');
  assert.equal(result.canClaim, true);
  assert.equal(result.references.includes('businesses/alpha/context/README.md'), true);
  assert.equal(result.references.some(ref => ref.includes('/beta/')), false);
  assert.deepEqual(snapshot(f.root), before);
});
test('unselected business records are not read', () => {
  const f = fixture();
  write(path.join(f.root, 'businesses/beta/business.json'), 'invalid JSON that must not be read');
  assert.equal(readContext(f.options).businessId, 'alpha');
});
test('business/task/owner and expected revision are explicit', () => {
  const f = fixture();
  for (const key of ['businessId', 'taskId', 'owner', 'expectedRevision']) assert.throws(() => readContext({ ...f.options, [key]: undefined }));
  assert.throws(() => readContext({ ...f.options, businessId: 'unknown' }), /registered/);
  assert.throws(() => readContext({ ...f.options, taskId: 'missing' }), /ENOENT/);
  assert.throws(() => readContext({ ...f.options, expectedRevision: 0 }), /Stale revision/);
});
test('traversal, absolute paths, alternate separators and Windows device names fail', () => {
  const f = fixture();
  for (const id of ['../beta', '..\\beta', '/beta', 'C:\\beta', 'con', 'one:stream']) assert.throws(() => readContext({ ...f.options, taskId: id }), /identifier/);
  for (const bad of ['../outside', 'businesses/../alpha', 'C:\\outside', 'businesses\\..\\alpha', 'businesses/alpha.', 'businesses//alpha']) {
    write(path.join(f.root, 'system/workspace.json'), { schemaVersion: 1, operator: { id: 'operator' }, businesses: [{ id: 'alpha', path: bad }] });
    assert.throws(() => readContext(f.options), /path|Path/);
  }
});
test('duplicate registration, overlapping storage and cross-business identities fail', () => {
  const f = fixture();
  const registryPath = path.join(f.root, 'system/workspace.json');
  const original = get(registryPath);
  write(registryPath, { ...original, businesses: [original.businesses[0], original.businesses[0]] });
  assert.throws(() => readContext(f.options), /exactly once/);
  for (const bad of ['businesses/alpha', 'businesses/alpha/nested', 'businesses']) {
    write(registryPath, { ...original, businesses: [original.businesses[0], { id: 'beta', path: bad }] });
    assert.throws(() => readContext(f.options), /overlap storage/);
  }
  write(registryPath, original);
  write(f.task, { ...get(f.task), businessId: 'beta' });
  assert.throws(() => readContext(f.options), /business mismatch/);
});
test('junction or symlink business root is rejected, including in-workspace links', () => {
  const f = fixture();
  fs.symlinkSync(path.join(f.root, 'businesses/alpha'), path.join(f.root, 'businesses/alias'), process.platform === 'win32' ? 'junction' : 'dir');
  const file = path.join(f.root, 'system/workspace.json');
  const registry = get(file);
  registry.businesses[0].path = 'businesses/alias';
  write(file, registry);
  assert.throws(() => readContext(f.options), /Symlinks and junctions/);
});
test('junction or symlink session directory cannot redirect checkpoint writes', () => {
  const f = fixture();
  fs.renameSync(path.join(f.root, 'businesses/alpha/sessions/one'), path.join(f.root, 'saved-session'));
  fs.symlinkSync(path.join(f.root, 'businesses/beta/sessions/one'), path.join(f.root, 'businesses/alpha/sessions/one'), process.platform === 'win32' ? 'junction' : 'dir');
  const before = snapshot(path.join(f.root, 'businesses/beta'));
  assert.throws(() => mutate('claim', f.options), /Symlinks and junctions/);
  assert.equal(get(f.task).revision, 1);
  assert.deepEqual(snapshot(path.join(f.root, 'businesses/beta')), before);
});
test('hard-linked task file is rejected', () => {
  const f = fixture();
  fs.linkSync(f.task, path.join(f.root, 'alias-task.json'));
  assert.throws(() => readContext(f.options), /Hard-linked/);
});
test('claim/checkpoint/release advances revisions and preserves a verified handoff chain', () => {
  const f = fixture();
  const claim = mutate('claim', f.options);
  assert.equal(claim.revision, 2);
  const claimed = { ...f.options, expectedRevision: 2, claimId: claim.claimId };
  const checkpoint = mutate('checkpoint', claimed, { summary: 'Synthetic work checked', nextAction: 'Review output', status: 'ready-for-review', outputs: ['departments/content/README.md'], verification: ['Synthetic validation passed'] });
  assert.equal(checkpoint.revision, 3);
  const result = readContext({ ...claimed, expectedRevision: 3 });
  assert.equal(result.checkpoint.record.summary, 'Synthetic work checked');
  assert.equal(result.checkpoint.record.previousCheckpoint.path.endsWith('.json'), true);
  assert.equal(result.references.some(ref => ref.endsWith('handoff.md')), false);
  const released = mutate('release', { ...claimed, expectedRevision: 3 });
  assert.equal(released.revision, 4);
  assert.equal(get(f.task).owner, null);
  assert.equal(get(f.task).status, 'ready-for-review');
  assert.equal(fs.existsSync(f.lock), false);
});
test('stale revisions and conflicting claims cannot mutate the authoritative task', () => {
  const f = fixture();
  mutate('claim', f.options);
  const before = snapshot(f.root);
  assert.throws(() => mutate('claim', f.options), /Stale revision/);
  assert.throws(() => mutate('claim', { ...f.options, expectedRevision: 2, owner: 'session-two' }), /already has an owner/);
  assert.deepEqual(snapshot(f.root), before);
});
test('legacy owners are not adopted or silently cleared', () => {
  const f = fixture();
  write(f.task, { ...get(f.task), owner: 'legacy-session' });
  assert.throws(() => mutate('claim', { ...f.options, owner: 'legacy-session' }), /legacy ownership/);
  assert.throws(() => mutate('release', { ...f.options, owner: 'legacy-session' }), /active claim/);
  assert.equal(get(f.task).owner, 'legacy-session');
  assert.equal(readContext({ ...f.options, owner: 'legacy-session' }).continuationState, 'legacy-ownership-needs-review');
});
test('read-only continuation explicitly reports another active owner as blocked', () => {
  const f = fixture(); mutate('claim', f.options);
  const before = snapshot(f.root);
  assert.equal(readContext({ ...f.options, expectedRevision: 2, owner: 'session-two' }).continuationState, 'blocked-by-other-owner');
  assert.deepEqual(snapshot(f.root), before);
});
test('inconsistent owner/claim state fails closed rather than silently adopting it', () => {
  const f = fixture(); mutate('claim', f.options);
  write(f.task, { ...get(f.task), owner: null });
  assert.throws(() => mutate('claim', { ...f.options, expectedRevision: 2 }), /owner and claim state disagree/);
});
test('release/checkpoint require both owner and current claim ID', () => {
  const f = fixture(); const claim = mutate('claim', f.options);
  const options = { ...f.options, expectedRevision: 2, claimId: claim.claimId };
  const before = snapshot(f.root);
  for (const action of ['release', 'checkpoint']) {
    assert.throws(() => mutate(action, { ...options, owner: 'session-two' }), /Matching owner/);
    assert.throws(() => mutate(action, { ...options, claimId: 'wrong' }), /Matching owner/);
  }
  assert.deepEqual(snapshot(f.root), before);
});
test('a released old claim cannot be reused after a new claim', () => {
  const f = fixture(); const first = mutate('claim', f.options);
  mutate('release', { ...f.options, expectedRevision: 2, claimId: first.claimId });
  const second = mutate('claim', { ...f.options, expectedRevision: 3 });
  assert.notEqual(second.claimId, first.claimId);
  assert.throws(() => mutate('checkpoint', { ...f.options, expectedRevision: 4, claimId: first.claimId }), /active claim/);
});
test('invalid checkpoint fields and output paths fail without writes', () => {
  const f = fixture(); const claim = mutate('claim', f.options);
  const options = { ...f.options, expectedRevision: 2, claimId: claim.claimId };
  const before = snapshot(f.root);
  for (const payload of [{ businessId: 'beta' }, { outputs: ['../beta/context/README.md'] }, { outputs: ['C:\\outside.md'] }, { status: 'fake-status' }, { owner: 'someone' }, { verification: ['x'.repeat(12001)] }]) assert.throws(() => mutate('checkpoint', options, payload));
  assert.deepEqual(snapshot(f.root), before);
});
test('terminal tasks are not implicitly reopened', () => {
  const f = fixture(); write(f.task, { ...get(f.task), status: 'complete' });
  assert.equal(readContext(f.options).canClaim, false);
  assert.throws(() => mutate('claim', f.options), /Terminal task/);
});
test('two real concurrent processes produce exactly one claim commit', async () => {
  const f = fixture();
  const script = owner => `import { mutate } from ${JSON.stringify(moduleUrl)}; try { const result = mutate('claim', ${JSON.stringify({ ...f.options, owner })}, {}, {onStage(stage) { if(stage==='locked') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150); }}); console.log(JSON.stringify(result)); } catch(error) { console.error(error.message); process.exitCode=1; }`;
  const results = await Promise.all([child(script('session-one')), child(script('session-two'))]);
  assert.deepEqual(results.map(result => result.code).sort(), [0, 1]);
  assert.equal(get(f.task).revision, 2);
  assert.equal(fs.existsSync(f.lock), false);
});
test('prepared failure retains evidence; exact same owner can explicitly recover without replay', () => {
  const f = fixture(); let failure;
  try { mutate('claim', f.options, {}, { onStage(stage) { if (stage === 'prepared') throw new Error('Synthetic failure'); } }); } catch (error) { failure = error; }
  assert.match(failure.message, /residue retained/);
  assert.equal(get(f.task).revision, 1);
  const before = snapshot(f.root);
  assert.throws(() => recover({ ...f.options, owner: 'session-two' }, failure.lockToken), /ownership changed/);
  assert.throws(() => recover(f.options, 'wrong-token'), /ownership changed/);
  assert.deepEqual(snapshot(f.root), before);
  const result = recover(f.options, failure.lockToken);
  assert.equal(result.outcome, 'not-committed');
  assert.equal(fs.existsSync(path.join(f.root, result.preservedOrphanCheckpoint)), true);
  assert.equal(fs.existsSync(f.lock), false);
  assert.equal(mutate('claim', f.options).revision, 2);
});
for (const stage of ['locked', 'prepared', 'committed']) {
  test(`process crash at ${stage} is recoverable without automatic ownership takeover`, () => {
    const f = fixture(); const result = crash(f, stage);
    assert.equal(result.status, 88, result.stderr);
    const revision = stage === 'committed' ? 2 : 1;
    const options = { ...f.options, expectedRevision: revision };
    const lock = get(path.join(f.lock, 'owner.json'));
    const current = readContext(options);
    assert.equal(current.lock.token, lock.token);
    assert.equal(current.canClaim, false);
    assert.throws(() => mutate('claim', options), /locked|already has an owner/);
    const recovered = recover(options, lock.token);
    assert.equal(recovered.outcome, stage === 'committed' ? 'already-committed' : 'not-committed');
    assert.equal(get(f.task).revision, revision);
    assert.equal(get(f.task).owner, stage === 'committed' ? 'session-one' : null);
  });
}
test('old timestamps do not permit stealing an active process lock', () => {
  const f = fixture();
  mutate('claim', f.options, {}, { onStage(stage, details) {
    if (stage !== 'locked') return;
    const file = path.join(f.lock, 'owner.json');
    write(file, { ...get(file), createdAt: '2000-01-01T00:00:00.000Z' });
    assert.throws(() => recover(f.options, details.lock.token), /still alive/);
  } });
  assert.equal(get(f.task).revision, 2);
});
test('recovery gate serializes recovery and blocks new mutations until reconciliation ends', () => {
  const f = fixture(); assert.equal(crash(f, 'prepared').status, 88);
  const token = get(path.join(f.lock, 'owner.json')).token;
  const result = recover(f.options, token, { onStage(stage) {
    assert.equal(stage, 'recovery-locked');
    assert.equal(readContext(f.options).recoveryBlocked, true);
    assert.throws(() => recover(f.options, token), /Another recovery/);
    assert.throws(() => mutate('claim', { ...f.options, owner: 'session-two' }), /Recovery gate/);
  } });
  assert.equal(result.outcome, 'not-committed');
  const second = mutate('claim', { ...f.options, owner: 'session-two' });
  assert.equal(second.revision, 2);
  assert.throws(() => recover({ ...f.options, expectedRevision: 2 }, token), /ownership changed/);
  assert.equal(get(f.task).owner, 'session-two');
});
test('competing real recovery processes never both clear the same operation', async () => {
  const f = fixture(); assert.equal(crash(f, 'prepared').status, 88);
  const token = get(path.join(f.lock, 'owner.json')).token;
  const script = `import { recover } from ${JSON.stringify(moduleUrl)}; try { const result = recover(${JSON.stringify(f.options)}, ${JSON.stringify(token)}, { onStage() { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150); } }); console.log(JSON.stringify(result)); } catch(error) { console.error(error.message); process.exitCode=1; }`;
  const results = await Promise.all([child(script), child(script)]);
  assert.deepEqual(results.map(result => result.code).sort(), [0, 1]);
  assert.equal(get(f.task).revision, 1);
  assert.equal(fs.existsSync(f.lock), false);
});
test('a crash during recovery leaves an explicit manual-inspection gate, never an expiring lease', () => {
  const f = fixture(); assert.equal(crash(f, 'prepared').status, 88);
  const token = get(path.join(f.lock, 'owner.json')).token;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { recover } from ${JSON.stringify(moduleUrl)}; recover(${JSON.stringify(f.options)}, ${JSON.stringify(token)}, { onStage() { process.exit(89); } });`], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 89, result.stderr);
  assert.equal(readContext(f.options).recoveryBlocked, true);
  assert.throws(() => mutate('claim', f.options), /Recovery gate/);
  assert.throws(() => recover(f.options, token), /Another recovery/);
  assert.equal(get(f.task).revision, 1);
});
test('failure after commit is reconciled as committed, without double revision advance', () => {
  const f = fixture(); let failure;
  try { mutate('claim', f.options, {}, { onStage(stage) { if (stage === 'committed') throw new Error('Synthetic postcommit failure'); } }); } catch (error) { failure = error; }
  assert.equal(get(f.task).revision, 2);
  assert.equal(recover({ ...f.options, expectedRevision: 2 }, failure.lockToken).outcome, 'already-committed');
  assert.equal(get(f.task).owner, 'session-one');
});
test('uncoordinated task edits prevent commit and block automatic reconciliation', () => {
  const f = fixture(); let failure;
  try { mutate('claim', f.options, {}, { onStage(stage) { if (stage === 'prepared') write(f.task, { ...get(f.task), title: 'Conflicting edit' }); } }); } catch (error) { failure = error; }
  assert.match(failure.message, /Concurrent uncoordinated/);
  assert.equal(get(f.task).revision, 1);
  assert.throws(() => recover(f.options, failure.lockToken), /both transaction states/);
  assert.equal(fs.existsSync(f.lock), true);
});
test('unrecognized lock contents are never deleted by recovery', () => {
  const f = fixture(); const result = crash(f, 'prepared'); assert.equal(result.status, 88);
  write(path.join(f.lock, 'unknown.txt'), 'Synthetic foreign file');
  const token = get(path.join(f.lock, 'owner.json')).token;
  assert.throws(() => recover(f.options, token), /Unexpected lock contents/);
  assert.equal(fs.existsSync(path.join(f.lock, 'unknown.txt')), true);
});
test('cross-host and corrupt locks fail closed', () => {
  const f = fixture(); assert.equal(crash(f, 'locked').status, 88);
  const file = path.join(f.lock, 'owner.json'); const lock = get(file);
  write(file, { ...lock, host: 'another-host' });
  assert.throws(() => recover(f.options, lock.token), /host differs/);
  write(file, { ...lock, businessId: 'beta' });
  assert.throws(() => readContext(f.options), /another scope/);
});
test('missing or tampered committed checkpoint blocks continuation', () => {
  const f = fixture(); mutate('claim', f.options);
  const record = get(f.task).coordination.latestCheckpoint;
  write(path.join(f.root, 'businesses/alpha', record.path), { businessId: 'beta' });
  assert.throws(() => readContext({ ...f.options, expectedRevision: 2 }), /hash mismatch/);
});

test('task fields cannot silently disagree with the committed checkpoint', () => {
  for (const field of ['owner', 'claimId', 'mutationId', 'status', 'nextAction']) {
    const f = fixture(); const claim = mutate('claim', f.options);
    const task = get(f.task);
    if (field === 'claimId' || field === 'mutationId') task.coordination[field] = '00000000-0000-0000-0000-000000000000';
    else task[field] = field === 'owner' ? 'session-two' : 'Conflicting manual edit';
    write(f.task, task);
    const options = { ...f.options, owner: task.owner, expectedRevision: 2, claimId: task.coordination.claimId };
    const before = snapshot(f.root);
    assert.throws(() => readContext(options), /Checkpoint.*mismatch/, field);
    assert.throws(() => mutate('checkpoint', options), /Checkpoint.*mismatch/, field);
    assert.deepEqual(snapshot(f.root), before, field);
    assert.ok(claim.claimId);
  }
});

test('a matching checksum does not validate malformed checkpoint transaction fields', () => {
  for (const [field, value] of [['schemaVersion', 2], ['sourceRevision', 0], ['action', 'release'], ['mutationId', '00000000-0000-0000-0000-000000000000']]) {
    const f = fixture(); mutate('claim', f.options);
    const task = get(f.task);
    const file = path.join(f.root, 'businesses/alpha', task.coordination.latestCheckpoint.path);
    write(file, { ...get(file), [field]: value });
    task.coordination.latestCheckpoint.sha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    write(f.task, task);
    assert.throws(() => readContext({ ...f.options, expectedRevision: 2 }), /Checkpoint.*mismatch/, field);
  }
});

test('recovery preserves incomplete or inconsistent transaction metadata', () => {
  for (const [field, value] of [['schemaVersion', 2], ['revision', 17], ['afterSha256', 'invalid'], ['checkpointSha256', 'invalid']]) {
    const f = fixture(); assert.equal(crash(f, 'prepared').status, 88);
    const intentFile = path.join(f.lock, 'intent.json');
    write(intentFile, { ...get(intentFile), [field]: value });
    const token = get(path.join(f.lock, 'owner.json')).token;
    const before = snapshot(f.root);
    assert.throws(() => recover(f.options, token), /Recovery intent.*inconsistent/, field);
    assert.deepEqual(snapshot(f.root), before, field);
  }
});

test('recovery preserves corrupted prepared checkpoint or staged task evidence', () => {
  for (const target of ['checkpoint', 'task-next']) {
    const f = fixture(); assert.equal(crash(f, 'prepared').status, 88);
    const intent = get(path.join(f.lock, 'intent.json'));
    const file = target === 'checkpoint' ? path.join(f.root, 'businesses/alpha', intent.checkpointPath) : path.join(f.lock, 'task-next.json');
    fs.appendFileSync(file, '\ncorrupted');
    const token = get(path.join(f.lock, 'owner.json')).token;
    const before = snapshot(f.root);
    assert.throws(() => recover(f.options, token), /Recovery.*hash mismatch/, target);
    assert.deepEqual(snapshot(f.root), before, target);
  }
});

test('recovery refuses malformed operation metadata before taking a recovery gate', () => {
  for (const [field, value] of [['action', 'unknown'], ['expectedRevision', -1], ['beforeSha256', 'invalid']]) {
    const f = fixture(); assert.equal(crash(f, 'locked').status, 88);
    const file = path.join(f.lock, 'owner.json'); const lock = get(file);
    write(file, { ...lock, [field]: value });
    const before = snapshot(f.root);
    assert.throws(() => recover(f.options, lock.token), /Lock transaction metadata.*malformed/, field);
    assert.deepEqual(snapshot(f.root), before, field);
  }
});

test('a committed release crash recovers without reinstating its former owner', () => {
  const f = fixture(); const claim = mutate('claim', f.options);
  const options = { ...f.options, expectedRevision: 2, claimId: claim.claimId };
  assert.equal(crash(f, 'committed', 'release', options).status, 88);
  const token = get(path.join(f.lock, 'owner.json')).token;
  const current = { ...options, expectedRevision: 3 };
  assert.equal(readContext(current).checkpoint.record.action, 'release');
  assert.equal(recover(current, token).outcome, 'already-committed');
  assert.equal(get(f.task).owner, null);
  assert.equal(readContext(current).canClaim, true);
});
test('cross-task checkpoint references are rejected before reading', () => {
  const f = fixture(); mutate('claim', f.options);
  const task = get(f.task);
  task.coordination.latestCheckpoint.path = 'sessions/other/checkpoints/00000000-0000-0000-0000-000000000000.json';
  write(f.task, task);
  assert.throws(() => readContext({ ...f.options, expectedRevision: 2 }), /escapes selected task/);
});
test('CLI continue is read-only and rejects missing revision', () => {
  const f = fixture(); const before = snapshot(f.root);
  const cli = fileURLToPath(new URL('../operations/workspace-operations.mjs', import.meta.url));
  const args = [cli, 'continue', '--root', f.root, '--business', 'alpha', '--task', 'one', '--owner', 'session-one'];
  const bad = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
  assert.equal(bad.status, 1);
  const good = spawnSync(process.execPath, [...args, '--revision', '1'], { encoding: 'utf8', windowsHide: true });
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).revision, 1);
  assert.deepEqual(snapshot(f.root), before);
});
