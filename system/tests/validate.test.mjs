import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveBusiness, validate, validateSessionRoutes, workspaceRoot } from './validate.mjs';

// Synthetic fixtures only. Retained in a task-specific temporary directory.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-workspace-routing-test-'));
const registry = { businesses: ['sample-one', 'sample-two'].map(id => ({ id, path: `businesses/${id}` })) };
for (const entry of registry.businesses) {
  const directory = path.join(root, entry.path);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'business.json'), JSON.stringify({ id: entry.id }));
}

test('current multi-business workspace foundation is internally consistent', () => {
  const registered = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'system/workspace.json'), 'utf8')).businesses;
  assert.ok(registered.length > 0);
  assert.equal(validate().businesses, registered.length);
});
test('two fixture businesses resolve to distinct records', () => {
  const first = resolveBusiness(root, registry, 'sample-one');
  const second = resolveBusiness(root, registry, 'sample-two');
  assert.notEqual(first.directory, second.directory);
  assert.equal(first.business.id, 'sample-one');
  assert.equal(second.business.id, 'sample-two');
});
test('unknown business is rejected', () => assert.throws(() => resolveBusiness(root, registry, 'unknown'), /registered/));
test('duplicate business registration is rejected', () => assert.throws(() => resolveBusiness(root, { businesses: [registry.businesses[0], registry.businesses[0]] }, 'sample-one'), /exactly once/));
test('identifier traversal is rejected', () => assert.throws(() => resolveBusiness(root, registry, '../sample-one'), /identifier/));
test('out-of-workspace registry path is rejected', () => assert.throws(() => resolveBusiness(root, { businesses: [{ id: 'sample-one', path: '../outside' }] }, 'sample-one'), /escapes/));
test('wrong business identity is rejected', () => assert.throws(() => resolveBusiness(root, { businesses: [{ id: 'sample-one', path: 'businesses/sample-two' }] }, 'sample-one'), /identity mismatch/));

function routeFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-workspace-session-routes-'));
  const data = {
    schemaVersion: 1, name: 'Sample workspace', operator: { id: 'sample-operator' },
    businesses: ['sample-one', 'sample-two'].map(id => ({ id, path: `businesses/${id}` }))
  };
  for (const entry of data.businesses) {
    const target = path.join(directory, entry.path);
    fs.mkdirSync(path.join(target, 'departments/community'), { recursive: true });
    fs.mkdirSync(path.join(target, 'tasks/weekly-review'), { recursive: true });
    fs.writeFileSync(path.join(target, 'business.json'), JSON.stringify({ id: entry.id, operatorId: data.operator.id, departments: ['community'] }));
    fs.writeFileSync(path.join(target, 'tasks/weekly-review/task.json'), JSON.stringify({ id: 'weekly-review', businessId: entry.id }));
  }
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'system/workflows/session-lifecycle.md', 'system/policies/operating-boundaries.md']) {
    fs.mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    fs.writeFileSync(path.join(directory, file), '# Synthetic fixture\n');
  }
  const route = { id: 'community-review', name: 'Community Review', aliases: ['Community', 'community review'], businessId: 'sample-one', department: 'community', path: 'businesses/sample-one/departments/community', scope: 'business' };
  return { directory, data, route };
}

test('old workspaces and explicitly empty routes retain their validation behavior', () => {
  const { directory, data } = routeFixture();
  assert.equal(validateSessionRoutes(directory, data), 0);
  data.sessionRoutes = [];
  fs.writeFileSync(path.join(directory, 'system/workspace.json'), JSON.stringify(data));
  assert.equal(validate(directory).businesses, 2);
});

test('valid named department route accepts aliases for the same route and an existing optional task', () => {
  const { directory, data, route } = routeFixture();
  data.sessionRoutes = [route];
  assert.equal(validateSessionRoutes(directory, data), 1);
  route.taskId = 'weekly-review';
  fs.writeFileSync(path.join(directory, 'system/workspace.json'), JSON.stringify(data));
  assert.equal(validate(directory).businesses, 2);
});

test('the main validator rejects malformed route records rather than silently ignoring them', () => {
  const { directory, data, route } = routeFixture();
  for (const routes of [null, {}, [null], [{ ...route, name: ' ' }], [{ ...route, aliases: 'community' }], [{ ...route, aliases: [''] }], [{ ...route, scope: 'content' }]]) {
    data.sessionRoutes = routes;
    fs.writeFileSync(path.join(directory, 'system/workspace.json'), JSON.stringify(data));
    assert.throws(() => validate(directory), /route/i);
  }
});

test('route identities and cross-route labels must be unambiguous ignoring case', () => {
  const { directory, data, route } = routeFixture();
  data.sessionRoutes = [route, { ...route }];
  assert.throws(() => validateSessionRoutes(directory, data), /Duplicate/);
  for (const other of [
    { id: 'second-route', name: 'Second route', aliases: [' COMMUNITY '] },
    { id: 'second-route', name: 'COMMUNITY REVIEW', aliases: [] },
    { id: 'second-route', name: 'Second route', aliases: ['Community-Review'] }
  ]) {
    data.sessionRoutes = [route, { ...route, ...other }];
    assert.throws(() => validateSessionRoutes(directory, data), /Ambiguous/);
  }
});

test('a route must reference an existing business and one of its registered departments', () => {
  const { directory, data, route } = routeFixture();
  data.sessionRoutes = [{ ...route, businessId: 'unknown' }];
  assert.throws(() => validateSessionRoutes(directory, data), /registered/);
  data.sessionRoutes = [{ ...route, department: 'unknown' }];
  assert.throws(() => validateSessionRoutes(directory, data), /department must be registered/);
  data.sessionRoutes = [{ ...route, path: 'businesses/sample-two/departments/community' }];
  assert.throws(() => validateSessionRoutes(directory, data), /registered department/);
});

test('route paths cannot traverse, use absolute paths, or select a different folder', () => {
  const { directory, data, route } = routeFixture();
  for (const routePath of ['../outside', 'businesses/sample-one/departments/../community', 'C:\\other\\workspace', '/tmp/another-workspace', 'businesses/sample-one/tasks', 'businesses//sample-one/departments/community']) {
    data.sessionRoutes = [{ ...route, path: routePath }];
    assert.throws(() => validateSessionRoutes(directory, data), /path/i);
  }
});

test('a registered department link cannot route into a different business', () => {
  const { directory, data, route } = routeFixture();
  const businessFile = path.join(directory, 'businesses/sample-one/business.json');
  const business = JSON.parse(fs.readFileSync(businessFile, 'utf8'));
  business.departments.push('linked');
  fs.writeFileSync(businessFile, JSON.stringify(business));
  fs.symlinkSync(path.join(directory, 'businesses/sample-two/departments/community'), path.join(directory, 'businesses/sample-one/departments/linked'), process.platform === 'win32' ? 'junction' : 'dir');
  data.sessionRoutes = [{ ...route, department: 'linked', path: 'businesses/sample-one/departments/linked' }];
  assert.throws(() => validateSessionRoutes(directory, data), /escapes selected business/);
});

test('optional task references must exist and belong to the selected business', () => {
  const { directory, data, route } = routeFixture();
  for (const taskId of ['../sample-two', 'missing-task']) {
    data.sessionRoutes = [{ ...route, taskId }];
    assert.throws(() => validateSessionRoutes(directory, data));
  }
  data.sessionRoutes = [{ ...route, taskId: 'weekly-review' }];
  const file = path.join(directory, 'businesses/sample-one/tasks/weekly-review/task.json');
  for (const task of [{ id: 'different-task', businessId: 'sample-one' }, { id: 'weekly-review', businessId: 'sample-two' }]) {
    fs.writeFileSync(file, JSON.stringify(task));
    assert.throws(() => validateSessionRoutes(directory, data), /task identity mismatch/);
  }
});

test('task directory links cannot select another business even if a record claims the expected identity', () => {
  const { directory, data, route } = routeFixture();
  const target = path.join(directory, 'businesses/sample-two/tasks/linked-review');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'task.json'), JSON.stringify({ id: 'linked-review', businessId: 'sample-one' }));
  fs.symlinkSync(target, path.join(directory, 'businesses/sample-one/tasks/linked-review'), process.platform === 'win32' ? 'junction' : 'dir');
  data.sessionRoutes = [{ ...route, taskId: 'linked-review' }];
  assert.throws(() => validateSessionRoutes(directory, data), /task escapes selected business/);
});
