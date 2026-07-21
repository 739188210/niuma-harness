// 多模块拓扑：只从明确的根声明读取候选；所有模块写入范围须经 CLI 显式选择或 TTY 确认。
const fs = require('fs');
const path = require('path');
const { assertNoSymlinkInPath, safeResolveInside, validateRelativePath } = require('./fs-safe');

const REGISTRY_FILE = 'modules.json';
const TOPOLOGY_VERSION = 1;
const MODULE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

function resolveTopology(workspaceDir, options) {
  if (options.modulesProvided) {
    return createTopology(workspaceDir, parseModuleList(options.modules), 'explicit');
  }
  if (options.topology === 'discover') {
    return createTopology(workspaceDir, discoverModules(workspaceDir), 'discover');
  }
  return { mode: 'single', modules: [] };
}

function createTopology(workspaceDir, candidates, mode) {
  const modules = normalizeModules(workspaceDir, candidates);
  return { mode, modules };
}

function parseModuleList(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
    .map((root) => ({ root, source: 'explicit' }));
}

function discoverModules(workspaceDir) {
  const candidates = [];
  const packageJson = readRootRegularFile(workspaceDir, 'package.json');
  if (packageJson) {
    let value;
    try { value = JSON.parse(packageJson); } catch (error) {
      throw new Error(`invalid root package.json for topology discovery: ${error.message}`);
    }
    const workspaces = Array.isArray(value.workspaces)
      ? value.workspaces
      : value.workspaces && Array.isArray(value.workspaces.packages) ? value.workspaces.packages : [];
    candidates.push(...expandWorkspacePatterns(workspaceDir, workspaces, 'package.json workspaces'));
  }

  const pnpm = readRootRegularFile(workspaceDir, 'pnpm-workspace.yaml');
  if (pnpm) {
    const patterns = parsePnpmPackages(pnpm);
    candidates.push(...expandWorkspacePatterns(workspaceDir, patterns, 'pnpm-workspace.yaml'));
  }

  const pom = readRootRegularFile(workspaceDir, 'pom.xml');
  if (pom) {
    for (const match of pom.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g)) {
      candidates.push({ root: match[1].trim(), source: 'Maven reactor' });
    }
  }

  for (const file of ['settings.gradle', 'settings.gradle.kts']) {
    const gradle = readRootRegularFile(workspaceDir, file);
    if (!gradle) continue;
    for (const statement of gradle.matchAll(/\binclude\s*\(?([^\n;)]*)\)?/g)) {
      for (const match of statement[1].matchAll(/['"]([^'"]+)['"]/g)) {
        candidates.push({ root: match[1].trim().replace(/:/g, '/').replace(/^\//, ''), source: file });
      }
    }
  }
  return candidates;
}

function parsePnpmPackages(content) {
  const start = content.match(/^packages:\s*$/m);
  if (!start) return [];
  const after = content.slice(start.index + start[0].length);
  const patterns = [];
  for (const line of after.split(/\r?\n/)) {
    if (/^\S/.test(line)) break;
    const match = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*(?:#.*)?$/);
    if (match) patterns.push(match[1].trim());
  }
  return patterns;
}

function expandWorkspacePatterns(workspaceDir, patterns, source) {
  const candidates = [];
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || !pattern.trim()) {
      throw new Error(`invalid ${source} module path`);
    }
    const value = pattern.trim().replace(/\\/g, '/');
    if (value.includes('**')) throw new Error(`unsupported recursive module pattern in ${source}: ${value}`);
    if (value.endsWith('/*')) {
      const parent = value.slice(0, -2);
      validateRelativePath(parent, `${source} module root`);
      const parentPath = safeResolveInside(workspaceDir, parent, `${source} module root`);
      assertNoSymlinkInPath(parentPath);
      if (!fs.existsSync(parentPath)) throw new Error(`module pattern parent does not exist: ${value}`);
      if (!fs.lstatSync(parentPath).isDirectory()) throw new Error(`module pattern parent is not a directory: ${value}`);
      for (const entry of fs.readdirSync(parentPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const childPath = path.join(parentPath, entry.name);
        const stat = fs.lstatSync(childPath);
        if (stat.isSymbolicLink()) throw new Error(`refusing module discovery through symlink: ${childPath}`);
        if (stat.isDirectory()) candidates.push({ root: `${parent}/${entry.name}`, source });
      }
      continue;
    }
    if (value.includes('*')) throw new Error(`unsupported module pattern in ${source}: ${value}`);
    candidates.push({ root: value, source });
  }
  return candidates;
}

function normalizeModules(workspaceDir, candidates) {
  const normalized = candidates.map((candidate) => normalizeModule(workspaceDir, candidate));
  normalized.sort((left, right) => left.root.localeCompare(right.root) || left.id.localeCompare(right.id));
  const roots = new Set();
  const ids = new Set();
  for (const module of normalized) {
    const key = normalizePathForPlatform(module.root);
    const idKey = normalizePathForPlatform(module.id);
    if (roots.has(key)) throw new Error(`duplicate module root: ${module.root}`);
    if (ids.has(idKey)) throw new Error(`duplicate module id: ${module.id}`);
    roots.add(key);
    ids.add(idKey);
  }
  for (let index = 0; index < normalized.length; index += 1) {
    for (let other = index + 1; other < normalized.length; other += 1) {
      const root = normalizePathForPlatform(normalized[index].root);
      const otherRoot = normalizePathForPlatform(normalized[other].root);
      if (otherRoot.startsWith(`${root}/`)) {
        throw new Error(`nested module roots are not supported: ${normalized[index].root} and ${normalized[other].root}`);
      }
    }
  }
  return normalized;
}

function normalizeModule(workspaceDir, candidate) {
  const input = String(candidate.root || '').trim().replace(/\\/g, '/');
  if (!input || input === '.') throw new Error('module root cannot be the workspace root');
  const root = path.posix.normalize(input).replace(/^\.\//, '').replace(/\/$/, '');
  if (!root || root === '.') throw new Error('module root cannot be the workspace root');
  if (process.platform === 'win32' && root.split('/').some((segment) => /[. ]$/.test(segment))) {
    throw new Error(`module root has a Windows path alias: ${root}`);
  }
  validateRelativePath(root, 'module root');
  const rootPath = safeResolveInside(workspaceDir, root, 'module root');
  assertNoSymlinkInPath(rootPath);
  if (!fs.existsSync(rootPath)) throw new Error(`module root does not exist: ${root}`);
  if (!fs.lstatSync(rootPath).isDirectory()) throw new Error(`module root is not a directory: ${root}`);
  return {
    id: candidate.id || root.split('/').map((part) => part.replace(/[^A-Za-z0-9]+/g, '-')).join('-'),
    root,
    ...(candidate.kind ? { kind: candidate.kind } : {}),
    ...(candidate.source ? { source: candidate.source } : {}),
  };
}

function readRootRegularFile(workspaceDir, name) {
  const filePath = safeResolveInside(workspaceDir, name, `topology descriptor ${name}`);
  assertNoSymlinkInPath(filePath);
  if (!fs.existsSync(filePath)) return null;
  if (!fs.lstatSync(filePath).isFile()) throw new Error(`topology descriptor is not a regular file: ${name}`);
  return fs.readFileSync(filePath, 'utf8');
}

function registryContent(modules) {
  return `${JSON.stringify({ schemaVersion: TOPOLOGY_VERSION, modules: modules.map(({ id, root, kind }) => ({ id, root, ...(kind ? { kind } : {}) })) }, null, 2)}\n`;
}

function parseRegistry(content, workspaceDir) {
  let value;
  try { value = JSON.parse(content); } catch (error) { throw new Error(`invalid module registry: ${error.message}`); }
  if (!value || Array.isArray(value) || value.schemaVersion !== TOPOLOGY_VERSION || !Array.isArray(value.modules)) {
    throw new Error('invalid module registry: expected schemaVersion 1 with modules array');
  }
  return normalizeModules(workspaceDir, value.modules.map((module, index) => {
    validateRegistryModule(module, index);
    return {
      id: module.id,
      root: module.root,
      ...(module.kind === undefined ? {} : { kind: module.kind }),
      source: 'registry',
    };
  }));
}

function validateRegistryModule(module, index) {
  if (!module || Array.isArray(module) || typeof module !== 'object') {
    throw new Error(`invalid module registry: modules[${index}] must be an object`);
  }
  if (typeof module.id !== 'string' || !MODULE_TOKEN.test(module.id)) {
    throw new Error(`invalid module registry: modules[${index}].id must be a safe token`);
  }
  if (typeof module.root !== 'string' || !module.root.trim()) {
    throw new Error(`invalid module registry: modules[${index}].root must be a non-empty string`);
  }
  if (module.kind !== undefined && (typeof module.kind !== 'string' || !MODULE_TOKEN.test(module.kind))) {
    throw new Error(`invalid module registry: modules[${index}].kind must be a safe token`);
  }
}

function minimalModule(module) {
  return {
    id: module.id,
    root: module.root,
    ...(module.kind ? { kind: module.kind } : {}),
  };
}

function sameModules(left, right) {
  return JSON.stringify(left.map(minimalModule)) === JSON.stringify(right.map(minimalModule));
}

function validateTopologyShape(topology, moduleSupplements) {
  if (!topology || (topology.mode !== 'single' && topology.mode !== 'discover' && topology.mode !== 'explicit')
      || !Array.isArray(topology.modules) || !Array.isArray(moduleSupplements)) {
    throw new Error('topology must contain a supported mode, modules array, and moduleSupplements array');
  }
  for (const module of topology.modules) {
    if (!module || typeof module !== 'object' || Array.isArray(module)
        || typeof module.id !== 'string' || !module.id || typeof module.root !== 'string' || !module.root) {
      throw new Error('topology modules must contain non-empty id and root strings');
    }
    validateRelativePath(module.root, 'topology module root');
  }
  for (const supplement of moduleSupplements) {
    if (!supplement || typeof supplement !== 'object' || Array.isArray(supplement)
        || ['moduleId', 'moduleRoot', 'entryFile', 'target'].some((field) => typeof supplement[field] !== 'string' || !supplement[field])) {
      throw new Error('moduleSupplements must contain moduleId, moduleRoot, entryFile, and target strings');
    }
    validateRelativePath(supplement.moduleRoot, 'module supplement root');
    validateRelativePath(supplement.target, 'module supplement target');
  }
}

function normalizePathForPlatform(value) { return process.platform === 'win32' ? value.toLowerCase() : value; }

module.exports = {
  REGISTRY_FILE,
  TOPOLOGY_VERSION,
  discoverModules,
  parseRegistry,
  registryContent,
  resolveTopology,
  sameModules,
  validateTopologyShape,
};
