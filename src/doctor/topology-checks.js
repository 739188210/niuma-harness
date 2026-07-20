const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../artifact-ledger');
const { getEntryFilesForAgent } = require('../agents');
const { assertNoSymlinkInPath, safeResolveInside } = require('../fs-safe');
const { renderModuleSupplement } = require('../module-entry-renderer');
const { parseRegistry, REGISTRY_FILE, validateTopologyShape } = require('../topology');
const { analyzeModuleBlock, sliceMarkedBlock, MODULE_BEGIN, MODULE_END } = require('../contract');
const { renderTopologyRoute } = require('../scaffold/topology-writer');
const { addError, addOk } = require('./result');

function checkTopology(context) {
  const { status } = context;
  if (status.schemaVersion === 2) {
    addOk(context.result, 'legacy root-only topology');
    return;
  }
  try {
    validateTopologyShape(status.topology, status.moduleSupplements);
  } catch (error) {
    addError(context.result, `invalid topology ownership state: ${error.message}`);
    return;
  }
  if (status.topology.modules.length === 0 && status.moduleSupplements.length === 0) {
    addOk(context.result, 'root-only topology');
    return;
  }
  const registryPath = safeTopologyPath(context, path.posix.join(path.basename(context.harnessRoot), REGISTRY_FILE));
  if (!registryPath) return;
  if (!fs.existsSync(registryPath) || !fs.lstatSync(registryPath).isFile()) {
    addError(context.result, `missing module registry ${REGISTRY_FILE}`);
    return;
  }
  let modules;
  try { modules = parseRegistry(fs.readFileSync(registryPath, 'utf8'), context.workspaceRoot); } catch (error) {
    addError(context.result, error.message);
    return;
  }
  if (JSON.stringify(modules.map(minimalModule)) !== JSON.stringify(status.topology.modules.map(minimalModule))) {
    addError(context.result, 'module registry differs from installed topology');
    return;
  }
  addOk(context.result, `topology modules ${modules.length}`);
  checkRoute(context, modules);
  checkSupplements(context, modules);
}

function checkRoute(context, modules) {
  const target = path.posix.join(path.basename(context.harnessRoot), 'docs/module-topology.md');
  const routePath = safeTopologyPath(context, target);
  if (!routePath) return;
  if (!fs.existsSync(routePath)) {
    addError(context.result, 'missing module topology route');
    return;
  }
  if (!fs.lstatSync(routePath).isFile()) {
    addError(context.result, 'module topology route is not a regular file');
    return;
  }
  const expected = Buffer.from(renderTopologyRoute(path.basename(context.harnessRoot), modules, context.agent), 'utf8');
  if (!fs.readFileSync(routePath).equals(expected)) {
    addError(context.result, 'module topology route drifted');
  } else addOk(context.result, 'module topology route intact');
}

function checkSupplements(context, modules) {
  const expectedTargets = new Set();
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  for (const record of context.status.moduleSupplements) {
    const module = moduleById.get(record.moduleId);
    if (!module || module.root !== record.moduleRoot || !getEntryFilesForAgent(context.agent).includes(record.entryFile)) {
      addError(context.result, `stale module supplement record ${record.target}`);
      continue;
    }
    expectedTargets.add(record.target);
    const targetPath = safeTopologyPath(context, record.target);
    if (!targetPath || !fs.existsSync(targetPath) || !fs.lstatSync(targetPath).isFile()) {
      addError(context.result, `missing module supplement ${record.target}`);
      continue;
    }
    const content = fs.readFileSync(targetPath, 'utf8');
    const analysis = analyzeModuleBlock(content);
    if (analysis.status !== 'valid' || !analysis.block.includes(`module=${module.id} root=${module.root}`)) {
      addError(context.result, `invalid module supplement ${record.target}`);
      continue;
    }
    const canonicalBlock = sliceMarkedBlock(renderModuleSupplement(module, record.entryFile, context.workspaceRoot, path.basename(context.harnessRoot)), MODULE_BEGIN, MODULE_END);
    if (!canonicalBlock || digestBytes(analysis.block.replace(/\r\n/g, '\n')) !== digestBytes(canonicalBlock)) {
      addError(context.result, `module supplement drifted ${record.target}`);
      continue;
    }
    addOk(context.result, `module supplement intact ${record.target}`);
  }
  for (const module of modules) {
    for (const entryFile of getEntryFilesForAgent(context.agent)) {
      const target = `${module.root}/${entryFile}`;
      if (!expectedTargets.has(target)) addError(context.result, `missing module supplement ownership record ${target}`);
    }
  }
}

function safeTopologyPath(context, target) {
  try {
    const targetPath = safeResolveInside(context.workspaceRoot, target, `topology target ${target}`);
    assertNoSymlinkInPath(targetPath);
    return targetPath;
  } catch (error) {
    addError(context.result, error.message);
    return null;
  }
}

function minimalModule(module) { return { id: module.id, root: module.root, ...(module.kind ? { kind: module.kind } : {}) }; }

module.exports = { checkTopology };
