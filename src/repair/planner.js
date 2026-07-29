const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../artifact/ledger');
const {
  CONTRACT_BEGIN,
  CONTRACT_END,
  analyzeContractBlock,
  analyzeModuleBlock,
  MODULE_BEGIN,
  MODULE_END,
  removeContractBlock,
  sliceContractBlock,
  replaceContractBlock,
} = require('../harness/contract');
const { createDesiredState } = require('./desired-state');
const { parseRegistry, sameModules } = require('../harness/topology');

function createRepairPlan(state, backupRoot) {
  const desired = createDesiredState({
    agent: state.selections.agent,
    harnessDir: state.harnessDir,
    manifest: state.manifest,
    runtimeLayout: state.runtimeLayout,
    topology: state.selections.topologyInvalid ? { mode: 'single', modules: [] } : state.selections.topology,
    moduleSupplements: state.selections.topologyInvalid ? [] : state.selections.moduleSupplements,
    workspaceDir: state.workspaceDir,
  });
  if (state.manifestInfo.value && typeof state.manifestInfo.value.createdAt === 'string') {
    desired.status.createdAt = state.manifestInfo.value.createdAt;
  }
  const collector = createCollector(state.workspaceDir);

  for (const directory of desired.directories) {
    planDirectory(collector, directory, 'directories');
  }
  for (const file of desired.files.filter((item) => item.domain === 'core' || item.domain === 'work' || item.domain === 'topology')) {
    planDesiredFile(collector, file, { preserveRegular: file.ownership === 'user' });
  }
  planEntries(collector, desired, state);
  planManifest(collector, desired, state);

  addTopologyDiagnostics(collector, state);

  return {
    backupRoot,
    desired,
    issues: collector.issues.sort(compareIssue),
    operations: normalizeOperations(collector.operations),
    selections: state.selections,
    state,
  };
}

function addTopologyDiagnostics(collector, state) {
  const status = state.manifestInfo.value;
  if (state.selections.topologyInvalid) {
    collector.add('topology', 'invalid-topology-state', state.manifestPath, 'installed topology ownership state is invalid and cannot be safely rebuilt');
    return;
  }
  if (!status || status.schemaVersion < 3 || !Array.isArray(status.moduleSupplements)
      || !status.topology || !Array.isArray(status.topology.modules)) return;
  const topologyInstalled = status.topology.modules.length > 0 || status.moduleSupplements.length > 0;
  const registryPath = path.join(state.targetDir, 'modules.json');
  const registry = inspectNode(registryPath);
  if (registry.type !== 'file') {
    if (topologyInstalled || registry.type !== 'missing') {
      collector.add('topology', 'module-registry-missing', registryPath, 'module registry is missing or unsafe; Repair does not own project-maintained topology');
    }
  } else {
    try {
      const modules = parseRegistry(fs.readFileSync(registryPath, 'utf8'), state.workspaceDir);
      if (!sameModules(modules, status.topology.modules)) {
        collector.add('topology', 'module-registry-drift', registryPath, 'module registry differs from installed topology; Repair does not own project-maintained topology');
      }
    } catch (error) {
      collector.add('topology', 'module-registry-invalid', registryPath, `module registry is invalid; Repair does not own project-maintained topology: ${error.message}`);
    }
  }
  for (const record of status.moduleSupplements) {
    let targetPath;
    try {
      const { safeResolveInside, assertNoSymlinkInPath } = require('../infrastructure/fs-safe');
      targetPath = safeResolveInside(state.workspaceDir, record.target, 'module supplement target');
      assertNoSymlinkInPath(targetPath);
    } catch (error) {
      collector.add('topology', 'invalid-topology-state', state.manifestPath, error.message);
      continue;
    }
    const observed = inspectNode(targetPath);
    if (observed.type === 'missing') {
      collector.add('topology', 'module-supplement-missing', targetPath, 'module supplement is missing; Repair does not own module-local files');
      continue;
    }
    if (observed.type !== 'file') {
      collector.add('topology', 'module-supplement-drift', targetPath, 'module supplement is not a regular file; Repair does not own module-local files');
      continue;
    }
    const content = fs.readFileSync(targetPath, 'utf8');
    const analysis = analyzeModuleBlock(content);
    if (analysis.status !== 'valid' || !analysis.block.includes(`module=${record.moduleId} root=${record.moduleRoot}`)
        || (record.blockDigest && digestBytes(analysis.block) !== record.blockDigest)) {
      collector.add('topology', 'module-supplement-drift', targetPath, 'module supplement managed block differs; Repair does not own module-local files');
    }
  }
}

function createCollector(workspaceDir) {
  const issues = [];
  const operations = [];
  return {
    issues,
    operations,
    add(domain, code, targetPath, message, operation) {
      const relativePath = relative(workspaceDir, targetPath);
      const issue = { code, domain, id: `issue-${issues.length + 1}`, message, path: relativePath };
      issues.push(issue);
      if (operation) {
        operations.push({
          ...operation,
          domain,
          id: `operation-${operations.length + 1}`,
          issueId: issue.id,
          relativePath,
          targetPath,
        });
      }
    },
    workspaceDir,
  };
}

function planDirectory(collector, targetPath, domain) {
  const observed = inspectNode(targetPath);
  if (observed.type === 'blocked') return;
  if (observed.type === 'directory') return;
  const code = observed.type === 'missing' ? 'missing' : 'type-conflict';
  collector.add(domain, code, targetPath, `expected directory, found ${observed.type}`, {
    action: observed.type === 'missing' ? 'create-directory' : 'replace-directory',
    expectedType: 'directory',
    observed,
    requiresBackup: observed.type !== 'missing',
  });
}

function planDesiredFile(collector, file, options = {}) {
  const observed = inspectNode(file.targetPath);
  if (observed.type === 'blocked') {
    collector.add(file.domain, 'blocked-by-parent', file.targetPath, `managed file is blocked by ${relative(collector.workspaceDir, observed.blockedBy)}`, {
      action: 'write-file', content: Buffer.from(file.content, 'utf8'), expectedType: 'file', observed: { type: 'missing' }, requiresBackup: false,
    });
    return;
  }
  if (observed.type === 'file') {
    if (options.preserveRegular) return;
    const expected = Buffer.from(file.content, 'utf8');
    if (observed.digest === digestBytes(expected)) return;
    collector.add(file.domain, 'drift', file.targetPath, 'managed file content differs from package content', {
      action: 'write-file', content: expected, expectedType: 'file', observed, requiresBackup: true,
    });
    return;
  }
  if (observed.type === 'missing') {
    collector.add(file.domain, 'missing', file.targetPath, 'managed file is missing', {
      action: 'write-file', content: Buffer.from(file.content, 'utf8'), expectedType: 'file', observed, requiresBackup: false,
    });
    return;
  }
  collector.add(file.domain, 'type-conflict', file.targetPath, `expected file, found ${observed.type}`, {
    action: 'replace-file', content: Buffer.from(file.content, 'utf8'), expectedType: 'file', observed, requiresBackup: true,
  });
}

function planEntries(collector, desired, state) {
  for (const entry of desired.activeEntries) {
    const canonical = desired.files.find((item) => item.domain === 'entry' && item.relativePath === entry)?.content;
    const block = canonical ? sliceContractBlock(canonical) : null;
    const targetPath = path.join(state.workspaceDir, entry);
    const observed = inspectNode(targetPath);
    if (observed.type === 'missing') {
      collector.add('entry', 'missing', targetPath, 'active entry is missing', {
        action: 'write-file', content: Buffer.from(canonical, 'utf8'), expectedType: 'file', observed, requiresBackup: false,
      });
      continue;
    }
    if (observed.type !== 'file') {
      collector.add('entry', 'type-conflict', targetPath, `expected file, found ${observed.type}`, {
        action: 'replace-file', content: Buffer.from(canonical, 'utf8'), expectedType: 'file', observed, requiresBackup: true,
      });
      continue;
    }
    const existing = fs.readFileSync(targetPath, 'utf8');
    const analysis = analyzeContractBlock(existing);
    let next;
    let code = 'drift';
    let message = analysis.status === 'valid' ? 'entry contract differs from canonical content' : `entry contract state is ${analysis.status}`;
    if (analysis.status === 'valid') {
      next = replaceContractBlock(existing, block);
    } else if (analysis.status === 'missing') next = `${block}\n\n${existing}`;
    else { next = canonical; code = 'ambiguous-markers'; }
    if (next !== existing) {
      collector.add('entry', code, targetPath, message, {
        action: 'write-file', content: Buffer.from(next, 'utf8'), expectedType: 'file', observed, requiresBackup: true,
      });
    }
  }
  for (const entry of desired.allEntries.filter((item) => !desired.activeEntries.includes(item))) {
    const targetPath = path.join(state.workspaceDir, entry);
    const observed = inspectNode(targetPath);
    if (observed.type !== 'file') continue;
    const existing = fs.readFileSync(targetPath, 'utf8');
    const analysis = analyzeContractBlock(existing);
    if (analysis.status === 'missing') continue;
    let action = 'write-file';
    let content;
    if (analysis.status === 'valid') {
      content = removeContractBlock(existing);
      if (isGeneratedInactiveEntry(existing, entry, desired, state)) {
        action = 'remove-node';
      }
    } else {
      content = neutralizeContractMarkers(existing);
    }
    collector.add('entry', analysis.status === 'valid' ? 'stale-entry' : 'ambiguous-markers', targetPath, `inactive entry contains contract state ${analysis.status}`, {
      action,
      ...(action === 'write-file' ? { content: Buffer.from(content, 'utf8') } : {}),
      expectedType: action === 'remove-node' ? 'absent' : 'file',
      observed,
      requiresBackup: true,
    });
  }
}

function isGeneratedInactiveEntry(existing, entry, desired, state) {
  const { renderEntry } = require('../harness/entry-renderer');
  const { getEntryFilesForAgent } = require('../harness/agents');
  return ['claude', 'codex', 'opencode', 'multi'].some((agent) => {
    if (!getEntryFilesForAgent(agent).includes(entry)) return false;
    const canonical = renderEntry(
      agent,
      entry,
      state.harnessDir,
      state.runtimeLayout.workDirectory,
      desired.status.topology
    );
    return normalizeEol(existing) === normalizeEol(canonical);
  });
}

function planManifest(collector, desired, state) {
  const content = Buffer.from(`${JSON.stringify(desired.status, null, 2)}\n`);
  const observed = inspectNode(desired.statusPath);
  if (observed.type === 'file' && state.manifestInfo.usable
      && state.manifestInfo.value.schemaVersion === desired.status.schemaVersion) return;
  collector.add('manifest', state.manifestInfo.error ? 'invalid-manifest' : 'manifest-drift', desired.statusPath, state.manifestInfo.error || state.manifestInfo.errors.join('; ') || 'manifest must be regenerated', {
    action: observed.type === 'missing' ? 'write-file' : 'replace-file', content, expectedType: 'file', observed, requiresBackup: observed.type !== 'missing', manifest: true,
  });
}

function inspectNode(targetPath) {
  const ancestor = findBlockingAncestor(targetPath);
  if (ancestor && ancestor !== targetPath) {
    return { blockedBy: ancestor, type: 'blocked' };
  }
  let stat;
  try { stat = fs.lstatSync(targetPath); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return { type: 'missing' };
    throw error;
  }
  if (stat.isSymbolicLink()) return { linkTarget: fs.readlinkSync(targetPath), type: 'symlink' };
  if (stat.isFile()) return { digest: digestBytes(fs.readFileSync(targetPath)), mode: stat.mode, type: 'file' };
  if (stat.isDirectory()) return { mode: stat.mode, tree: snapshotDirectory(targetPath), type: 'directory' };
  return { mode: stat.mode, type: 'other' };
}

function findBlockingAncestor(targetPath) {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root;
  const parts = path.relative(root, resolved).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
      throw error;
    }
    if (current !== resolved && (stat.isSymbolicLink() || !stat.isDirectory())) return current;
  }
  return null;
}

function snapshotDirectory(root) {
  return fs.readdirSync(root).sort().map((name) => {
    const target = path.join(root, name);
    const node = inspectNode(target);
    return { name, node };
  });
}

function normalizeOperations(operations) {
  return [...operations].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function compareIssue(a, b) {
  const domains = ['manifest', 'directories', 'core', 'topology', 'entry', 'rules', 'adapters', 'skills', 'commands', 'work'];
  return domains.indexOf(a.domain) - domains.indexOf(b.domain) || a.path.localeCompare(b.path) || a.code.localeCompare(b.code);
}

function neutralizeContractMarkers(content) {
  return content.split(CONTRACT_BEGIN).join('niuma-harness contract begin')
    .split(CONTRACT_END).join('niuma-harness contract end');
}

function normalizeEol(value) { return value.replace(/\r\n/g, '\n'); }
function relative(root, target) { return path.relative(root, target).split(path.sep).join('/') || '.'; }

module.exports = { createRepairPlan, inspectNode };
