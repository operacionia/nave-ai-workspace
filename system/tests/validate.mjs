import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(here, '../..');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function contained(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function resolveBusiness(root, registry, id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Invalid business identifier');
  const matches = registry.businesses.filter(item => item.id === id);
  if (matches.length !== 1) throw new Error('Business must be registered exactly once');
  const entry = matches[0];
  if (typeof entry.path !== 'string' || path.isAbsolute(entry.path)) throw new Error('Business path must be relative');
  const realRoot = fs.realpathSync(root);
  const candidate = path.resolve(realRoot, entry.path);
  if (!contained(realRoot, candidate)) throw new Error('Business path escapes workspace');
  const realCandidate = fs.realpathSync(candidate);
  if (!contained(realRoot, realCandidate)) throw new Error('Business link escapes workspace');
  const business = readJson(path.join(realCandidate, 'business.json'));
  if (business.id !== id) throw new Error('Business identity mismatch');
  return { directory: realCandidate, business };
}

// Optional context entry points. This validates records; it never launches agents
// or treats a route as permission to read another business.
export function validateSessionRoutes(root, registry) {
  if (!Object.hasOwn(registry, 'sessionRoutes')) return 0;
  if (!Array.isArray(registry.sessionRoutes)) throw new Error('Session routes must be an array');
  const ids = new Set();
  const names = new Map();
  const identifier = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\x00-\x1f]/.test(value);
  for (const route of registry.sessionRoutes) {
    if (!route || typeof route !== 'object' || Array.isArray(route) || !identifier(route.id)) throw new Error('Invalid session route identifier');
    if (ids.has(route.id)) throw new Error('Duplicate session route identifier');
    ids.add(route.id);
    if (!text(route.name) || route.scope !== 'business' || !identifier(route.department)) throw new Error('Invalid session route name, scope or department');
    if (route.aliases !== undefined && (!Array.isArray(route.aliases) || !route.aliases.every(text))) throw new Error('Session route aliases must be nonempty strings');
    for (const label of [route.id, route.name, ...(route.aliases ?? [])]) {
      const key = label.trim().toLowerCase();
      if (names.has(key) && names.get(key) !== route.id) throw new Error('Ambiguous session route name or alias');
      names.set(key, route.id);
    }
    const { directory, business } = resolveBusiness(root, registry, route.businessId);
    if (!Array.isArray(business.departments) || !business.departments.includes(route.department)) throw new Error('Session route department must be registered');
    if (typeof route.path !== 'string' || !route.path || /[:\x00-\x1f]/.test(route.path) || path.isAbsolute(route.path) || path.win32.isAbsolute(route.path) || route.path.split(/[\\/]/).some(part => !part || part === '.' || part === '..')) throw new Error('Session route path must be a safe relative path');
    const candidate = path.resolve(root, route.path);
    const entry = registry.businesses.find(item => item.id === route.businessId);
    const expected = path.resolve(root, entry.path, 'departments', route.department);
    if (candidate !== expected) throw new Error('Session route path must select its registered department');
    const realDepartment = fs.realpathSync(candidate);
    if (!contained(directory, realDepartment) || !fs.statSync(realDepartment).isDirectory()) throw new Error('Session route department escapes selected business');
    if (route.taskId !== undefined) {
      if (!identifier(route.taskId)) throw new Error('Invalid session route task identifier');
      const taskFile = fs.realpathSync(path.join(directory, 'tasks', route.taskId, 'task.json'));
      if (!contained(directory, taskFile) || !fs.statSync(taskFile).isFile()) throw new Error('Session route task escapes selected business');
      const task = readJson(taskFile);
      if (task.id !== route.taskId || task.businessId !== route.businessId) throw new Error('Session route task identity mismatch');
    }
  }
  return registry.sessionRoutes.length;
}

export function validate(root = workspaceRoot) {
  const registry = readJson(path.join(root, 'system/workspace.json'));
  if (registry.schemaVersion !== 1 || !registry.name || !registry.operator?.id) throw new Error('Invalid workspace header');
  if (!Array.isArray(registry.businesses) || registry.businesses.length === 0) throw new Error('Missing business registry');
  const paths = new Set();
  for (const entry of registry.businesses) {
    const resolved = resolveBusiness(root, registry, entry.id);
    const key = process.platform === 'win32' ? resolved.directory.toLowerCase() : resolved.directory;
    if (paths.has(key)) throw new Error('Businesses cannot share a canonical directory');
    paths.add(key);
    if (resolved.business.operatorId !== registry.operator.id) throw new Error('Unknown business operator');
    for (const department of resolved.business.departments) {
      if (!/^[a-z0-9-]+$/.test(department)) throw new Error('Invalid department name');
      if (!fs.statSync(path.join(resolved.directory, 'departments', department)).isDirectory()) throw new Error('Missing department');
    }
  }
  for (const required of ['AGENTS.md', 'CLAUDE.md', 'system/workflows/session-lifecycle.md', 'system/policies/operating-boundaries.md']) {
    if (!fs.statSync(path.join(root, required)).isFile()) throw new Error('Missing operating document');
  }
  validateSessionRoutes(root, registry);
  return { name: registry.name, businesses: registry.businesses.length, warnings: locationWarnings(root), scope: 'configuration and path routing only; not agent sandboxing or workflow execution' };
}

// A workspace is a regular folder the operator owns: never inside a tool folder, another repository or a placeholder cloud folder.
export function locationWarnings(root) {
  const warnings = [];
  const real = fs.realpathSync(root);
  const segments = real.split(/[\\/]+/).slice(0, -1);
  const bad = segments.find(s => /^(codex|\.codex|\.claude|node_modules)$/i.test(s));
  if (bad) warnings.push(`Workspace sits inside a tool folder ("${bad}"). Move it to a regular folder you own, for example Documents/<brand>-ai-workspace.`);
  let parent = path.dirname(real);
  while (parent !== path.dirname(parent)) {
    if (fs.existsSync(path.join(parent, '.git'))) { warnings.push(`Workspace is nested inside another git repository (${parent}).`); break; }
    parent = path.dirname(parent);
  }
  if (/[\\/](OneDrive|Dropbox)[\\/]/i.test(real)) warnings.push('Workspace is in a cloud-synced folder; make sure files are kept locally, not as online-only placeholders.');
  return warnings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify({ status: 'PASS', ...validate() }, null, 2)); }
  catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
}
