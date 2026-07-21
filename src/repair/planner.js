const fs = require('fs');
const path = require('path');
const { digestBytes, validateArtifactRecords } = require('../artifact-ledger');
const {
  CONTRACT_BEGIN,
  CONTRACT_END,
  analyzeContractBlock,
  removeContractBlock,
  sliceContractBlock,
  replaceContractBlock,
} = require('../contract');
const { getCommandArtifactDescriptors } = require('../commands');
const {
  getAvailableRuleDirs,
  getLegacyRuleTargetRootsForAgent,
  getRuleTargetRootsForAgent,
} = require('../rules');
const { getAvailableSkillDirs, getSkillFiles, getSkillTargetRootsForAgent } = require('../skills');
const {
  assertNoLossyJsonNumbers,
  reconcileOpenCodeInstructions,
} = require('../opencode-instructions');
const { createDesiredState } = require('../scaffold/desired-state');
const { analyzeModuleBlock, MODULE_BEGIN, MODULE_END } = require('../contract');
const { parseRegistry, sameModules } = require('../topology');

function createRepairPlan(state, backupRoot) {
  const desired = createDesiredState({
    agent: state.selections.agent,
    commands: state.selections.commands,
    harnessDir: state.harnessDir,
    manifest: state.manifest,
    rules: state.selections.rules,
    skills: state.selections.skills,
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
  planRules(collector, desired, state);
  planOpenCode(collector, desired, state);
  for (const file of desired.files.filter((item) => item.domain === 'adapters' || item.domain === 'skills' || item.domain === 'commands')) {
    planDesiredFile(collector, file);
  }
  planUnselectedAdapters(collector, desired, state);
  planUnselectedSkills(collector, desired, state);
  planStaleSkills(collector, desired, state);
  planStaleCommands(collector, desired, state);
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
  if (!status || status.schemaVersion !== 3 || !Array.isArray(status.moduleSupplements)
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
      const { safeResolveInside, assertNoSymlinkInPath } = require('../fs-safe');
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
    if (analysis.status === 'valid') next = replaceContractBlock(existing, block);
    else if (analysis.status === 'missing') next = `${block}\n\n${existing}`;
    else { next = canonical; code = 'ambiguous-markers'; }
    if (next !== existing) {
      collector.add('entry', code, targetPath, analysis.status === 'valid' ? 'entry contract differs from canonical content' : `entry contract state is ${analysis.status}`, {
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
  const { renderEntry } = require('../entry-renderer');
  const { getEntryFilesForAgent } = require('../agents');
  return ['claude', 'codex', 'opencode', 'multi'].some((agent) => {
    if (!getEntryFilesForAgent(agent).includes(entry)) return false;
    const canonical = renderEntry(
      agent,
      entry,
      state.selections.rules,
      state.harnessDir,
      state.manifest.workDirectory || 'agent-work',
      state.manifest.rulesRoot
    );
    return normalizeEol(existing) === normalizeEol(canonical);
  });
}

function planRules(collector, desired, state) {
  const previous = readArtifactRecords(state.manifestInfo.value);
  const previousByTarget = new Map(previous.filter((record) => record.kind === 'rule')
    .map((record) => [record.target, record]));
  const selectedTargets = new Set(desired.ruleArtifacts.map((artifact) => artifact.target));
  const canonicalByTarget = new Map(renderAllRuleArtifacts(desired, state)
    .map((artifact) => [artifact.target, artifact]));

  for (const artifact of desired.ruleArtifacts) {
    const observed = inspectNode(artifact.targetPath);
    const record = previousByTarget.get(artifact.target);
    const canonical = Buffer.from(artifact.content, 'utf8');
    const canonicalOnDisk = observed.type === 'file' && observed.digest === artifact.digest;
    const validRecord = record && record.source === artifact.source && record.digest === artifact.digest;
    if (canonicalOnDisk) continue;
    if (observed.type === 'missing' || observed.type === 'blocked') {
      collector.add('rules', 'missing', artifact.targetPath, 'selected managed rule is missing', {
        action: 'write-file', content: canonical, expectedType: 'file', observed: { type: 'missing' }, requiresBackup: false,
      });
      continue;
    }
    const legacy = !validRecord;
    collector.add('rules', observed.type === 'file' ? 'drift' : 'type-conflict', artifact.targetPath,
      legacy ? 'modified legacy rule differs from canonical content' : 'owned rule artifact differs from canonical content', {
        action: observed.type === 'file' ? 'write-file' : 'replace-file', content: canonical, expectedType: 'file', observed, requiresBackup: true,
      });
  }

  const staleCandidates = previous.filter((item) => item.kind === 'rule' && !selectedTargets.has(item.target));
  for (const candidate of staleCandidates) {
    const canonical = canonicalByTarget.get(candidate.target);
    const currentCanonical = canonical && candidate.kind === canonical.kind && candidate.source === canonical.source
      && candidate.target === canonical.target;
    const removedPackageCanonical = !canonical && isCanonicalPriorRuleRecord(candidate, state);
    if (!currentCanonical && !removedPackageCanonical) continue;
    const targetPath = path.join(state.workspaceDir, ...candidate.target.split('/'));
    const observed = inspectNode(targetPath);
    if (observed.type === 'file' && observed.digest === candidate.digest) {
      collector.add('rules', 'stale-rule', targetPath, removedPackageCanonical
        ? 'obsolete exact-owned rule package template was removed'
        : 'deselected ledger-owned rule file remains', {
        action: 'remove-node', expectedType: 'absent', observed, requiresBackup: true,
      });
    } else if (removedPackageCanonical && observed.type !== 'missing') {
      collector.add('rules', 'stale-rule-drift', targetPath, 'drifted obsolete rule is preserved and requires manual resolution');
    }
  }
}

function isCanonicalPriorRuleRecord(record, state) {
  const sourcePrefix = 'rules/';
  const targetPrefixes = [
    `${state.harnessDir}/docs/rules/`,
    ...getRuleTargetRootsForAgent(state.selections.agent).map((root) => `${root}/`),
    ...getLegacyRuleTargetRootsForAgent(state.selections.agent).map((root) => `${root}/`),
  ];
  if (!record.source.startsWith(sourcePrefix)) return false;
  const sourceSuffix = record.source.slice(sourcePrefix.length);
  const targetPrefix = targetPrefixes.find((prefix) => record.target.startsWith(prefix));
  if (!targetPrefix || sourceSuffix !== record.target.slice(targetPrefix.length)) return false;
  const rule = sourceSuffix.split('/')[0];
  return Boolean(rule) && state.manifestInfo.value && Array.isArray(state.manifestInfo.value.rules)
    && state.manifestInfo.value.rules.includes(rule);
}

function renderAllRuleArtifacts(desired, state) {
  const { renderRuleArtifacts } = require('../rule-artifacts');
  return renderRuleArtifacts(state.selections.agent, desired.availableRules, state.manifest.rulesRoot, desired.variables);
}

function readArtifactRecords(manifest) {
  try {
    return validateArtifactRecords(manifest && manifest.artifacts);
  } catch {
    return [];
  }
}

function planOpenCode(collector, desired, state) {
  const targetPath = path.join(state.workspaceDir, desired.openCode.target);
  const observed = inspectNode(targetPath);
  if (observed.type === 'missing') {
    if (desired.openCode.paths.length > 0) {
      const content = Buffer.from(`${JSON.stringify({ instructions: desired.openCode.paths }, null, 2)}\n`);
      collector.add('adapters', 'missing', targetPath, 'OpenCode config with managed rule paths is missing', {
        action: 'write-file', content, expectedType: 'file', observed, requiresBackup: false,
      });
    }
    return;
  }
  if (observed.type !== 'file') {
    const value = desired.openCode.paths.length > 0 ? { instructions: desired.openCode.paths } : {};
    collector.add('adapters', 'type-conflict', targetPath, `expected OpenCode config file, found ${observed.type}`, {
      action: 'replace-file', content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`), expectedType: 'file', observed, requiresBackup: true,
    });
    return;
  }

  const raw = fs.readFileSync(targetPath, 'utf8');
  let config;
  try {
    assertNoLossyJsonNumbers(raw);
    config = JSON.parse(raw);
  } catch (error) {
    collector.add('adapters', 'invalid-json', targetPath, error.message || 'OpenCode config is invalid JSON and cannot be safely merged');
    return;
  }
  if (!config || Array.isArray(config) || typeof config !== 'object') {
    collector.add('adapters', 'type-conflict', targetPath, 'OpenCode config must contain a JSON object');
    return;
  }

  let next;
  let nextOwnedPaths;
  let code = 'drift';
  let message = 'OpenCode managed rule paths differ';
  try {
    const reconciled = reconcileOpenCodeInstructions(
      config,
      desired.openCode.paths,
      state.selections.openCodeInstructions || []
    );
    next = reconciled.config;
    nextOwnedPaths = reconciled.ownedPaths;
  } catch (error) {
    if (desired.openCode.paths.length === 0) {
      return;
    }
    next = { ...config, instructions: desired.openCode.paths };
    nextOwnedPaths = desired.openCode.paths;
    code = 'invalid-instructions';
    message = error.message;
  }
  desired.status.openCodeInstructions = nextOwnedPaths;
  const content = `${JSON.stringify(next, null, 2)}\n`;
  if (content !== raw) {
    collector.add('adapters', code, targetPath, message, {
      action: 'write-file', content: Buffer.from(content), expectedType: 'file', observed, requiresBackup: true,
    });
  }
}

function planUnselectedAdapters(collector, desired, state) {
  const selected = new Set(state.selections.rules);
  for (const rule of getAvailableRuleDirs(state.manifest.rulesRoot)) {
    if (selected.has(rule)) continue;
    const targetPath = path.join(state.workspaceDir, '.claude', 'rules', `niuma-${rule}.md`);
    const observed = inspectNode(targetPath);
    if (observed.type !== 'missing' && observed.type !== 'blocked') {
      collector.add('adapters', 'stale-adapter', targetPath, 'unselected Claude rule pointer remains', {
        action: 'remove-node', expectedType: 'absent', observed, requiresBackup: true,
      });
    }
  }
}

function planUnselectedSkills(collector, desired, state) {
  const selected = new Set(state.selections.skills);
  for (const root of getSkillTargetRootsForAgent(state.selections.agent)) {
    for (const skill of getAvailableSkillDirs(state.manifest.skillsRoot)) {
      if (selected.has(skill)) continue;
      for (const file of getSkillFiles(skill, state.manifest.skillsRoot)) {
        const targetPath = path.join(state.workspaceDir, ...root.split('/'), skill, ...file.relativePath.split('/'));
        const observed = inspectNode(targetPath);
        if (observed.type !== 'missing' && observed.type !== 'blocked') {
          collector.add('skills', 'stale-skill', targetPath, 'unselected skill template remains', {
            action: 'remove-node', expectedType: 'absent', observed, requiresBackup: true,
          });
        }
      }
    }
  }
}

function planStaleSkills(collector, desired, state) {
  const active = new Set(getSkillTargetRootsForAgent(state.selections.agent));
  const roots = ['.claude/skills', '.agents/skills', '.opencode/skills'];
  for (const root of roots.filter((item) => !active.has(item))) {
    for (const skill of getAvailableSkillDirs(state.manifest.skillsRoot)) {
      for (const file of getSkillFiles(skill, state.manifest.skillsRoot)) {
        const targetPath = path.join(state.workspaceDir, ...root.split('/'), skill, ...file.relativePath.split('/'));
        const observed = inspectNode(targetPath);
        if (observed.type !== 'missing' && observed.type !== 'blocked') {
          collector.add('skills', 'stale-skill', targetPath, 'inactive agent skill template remains', {
            action: 'remove-node', expectedType: 'absent', observed, requiresBackup: true,
          });
        }
      }
    }
  }
}

function planStaleCommands(collector, desired, state) {
  const previousManifest = state.manifestInfo.value;
  if (!previousManifest || !previousManifest.agent || !Array.isArray(previousManifest.commands)) return;
  let canonical;
  try {
    canonical = new Map(getCommandArtifactDescriptors(previousManifest.agent, previousManifest.commands)
      .map((descriptor) => [descriptor.target, descriptor]));
  } catch {
    return;
  }
  const active = new Set(desired.artifacts.map((item) => item.target));
  for (const record of readArtifactRecords(previousManifest)) {
    if (record.kind !== 'command' || active.has(record.target)) continue;
    const descriptor = canonical.get(record.target);
    if (!descriptor || descriptor.kind !== record.kind || descriptor.source !== record.source) continue;
    const targetPath = path.join(state.workspaceDir, ...record.target.split('/'));
    const observed = inspectNode(targetPath);
    if (observed.type === 'file' && observed.digest === record.digest) {
      collector.add('commands', 'stale-command', targetPath, 'inactive ledger-owned command artifact remains', {
        action: 'remove-node', expectedType: 'absent', observed, requiresBackup: true,
      });
    }
  }
}

function planManifest(collector, desired, state) {
  const content = Buffer.from(`${JSON.stringify(desired.status, null, 2)}\n`);
  const observed = inspectNode(desired.statusPath);
  if (observed.type === 'file' && state.manifestInfo.usable) return;
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
