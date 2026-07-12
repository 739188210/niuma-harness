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
const { getAvailableRuleDirs } = require('../rules');
const { getAvailableSkillDirs, getSkillFiles, getSkillTargetRootsForAgent } = require('../skills');
const { renderOpenCodeRulesInstruction, MANAGED_RULES_BEGIN, MANAGED_RULES_END } = require('../scaffold/rules-adapters-writer');
const { createDesiredState } = require('../scaffold/desired-state');

function createRepairPlan(state, backupRoot) {
  const desired = createDesiredState({
    agent: state.selections.agent,
    commands: state.selections.commands,
    harnessDir: state.harnessDir,
    manifest: state.manifest,
    rules: state.selections.rules,
    skills: state.selections.skills,
    workspaceDir: state.workspaceDir,
  });
  if (state.manifestInfo.value && typeof state.manifestInfo.value.createdAt === 'string') {
    desired.status.createdAt = state.manifestInfo.value.createdAt;
  }
  const collector = createCollector(state.workspaceDir);

  for (const directory of desired.directories) {
    planDirectory(collector, directory, 'directories');
  }
  for (const file of desired.files.filter((item) => item.domain === 'core' || item.domain === 'work')) {
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

  return {
    backupRoot,
    desired,
    issues: collector.issues.sort(compareIssue),
    operations: normalizeOperations(collector.operations),
    selections: state.selections,
    state,
  };
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
  const canonical = desired.files.find((item) => item.domain === 'entry')?.content;
  const block = canonical ? sliceContractBlock(canonical) : null;
  for (const entry of desired.activeEntries) {
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
      if (canonical && normalizeEol(existing) === normalizeEol(canonical)) {
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
  const targetPrefix = `${state.harnessDir}/docs/rules/`;
  if (!record.source.startsWith(sourcePrefix) || !record.target.startsWith(targetPrefix)) return false;
  const sourceSuffix = record.source.slice(sourcePrefix.length);
  const targetSuffix = record.target.slice(targetPrefix.length);
  if (sourceSuffix !== targetSuffix) return false;
  const rule = sourceSuffix.split('/')[0];
  return Boolean(rule) && state.manifestInfo.value && Array.isArray(state.manifestInfo.value.rules)
    && state.manifestInfo.value.rules.includes(rule);
}

function renderAllRuleArtifacts(desired, state) {
  const { renderRuleArtifacts } = require('../rule-artifacts');
  return renderRuleArtifacts(desired.availableRules, state.harnessDir, state.manifest.rulesRoot, desired.variables);
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
    if (desired.openCode.block) {
      const content = Buffer.from(`${JSON.stringify({ instructions: desired.openCode.block }, null, 2)}\n`);
      collector.add('adapters', 'missing', targetPath, 'OpenCode config with managed rules block is missing', {
        action: 'write-file', content, expectedType: 'file', observed, requiresBackup: false,
      });
    }
    return;
  }
  if (observed.type !== 'file') {
    const value = desired.openCode.block ? { instructions: desired.openCode.block } : {};
    collector.add('adapters', 'type-conflict', targetPath, `expected OpenCode config file, found ${observed.type}`, {
      action: 'replace-file', content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`), expectedType: 'file', observed, requiresBackup: true,
    });
    return;
  }
  const raw = fs.readFileSync(targetPath, 'utf8');
  let config;
  try { config = JSON.parse(raw); } catch {
    config = null;
  }
  const validObject = config && !Array.isArray(config) && typeof config === 'object';
  if (validObject && !desired.openCode.block && !hasOpenCodeInstructionMarkers(config.instructions)) {
    return;
  }
  const marker = validObject ? analyzeOpenCodeMarkers(config.instructions) : { valid: false };
  let next;
  let code;
  if (!validObject || !marker.valid) {
    next = desired.openCode.block ? { instructions: desired.openCode.block } : {};
    code = !validObject ? 'invalid-json' : 'ambiguous-markers';
  } else {
    next = { ...config };
    if (desired.openCode.block) next.instructions = mergeInstruction(config.instructions, desired.openCode.block);
    else next.instructions = removeManagedInstructions(config.instructions);
    if (next.instructions === undefined) delete next.instructions;
    code = 'drift';
  }
  const content = `${JSON.stringify(next, null, 2)}\n`;
  if (content !== raw) {
    collector.add('adapters', code, targetPath, code === 'drift' ? 'OpenCode managed rules block differs' : 'OpenCode config cannot be safely merged', {
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

function hasOpenCodeInstructionMarkers(instructions) {
  const values = typeof instructions === 'string' ? [instructions]
    : (Array.isArray(instructions) ? instructions.filter((item) => typeof item === 'string') : []);
  return values.some((value) => value.includes(MANAGED_RULES_BEGIN) || value.includes(MANAGED_RULES_END));
}

function analyzeOpenCodeMarkers(instructions) {
  const supported = instructions === undefined
    || typeof instructions === 'string'
    || (Array.isArray(instructions) && instructions.every((item) => typeof item === 'string'));
  if (!supported) return { valid: false };
  const values = typeof instructions === 'string' ? [instructions] : (instructions || []);
  let blocks = 0;
  for (const value of values) {
    const begins = value.split(MANAGED_RULES_BEGIN).length - 1;
    const ends = value.split(MANAGED_RULES_END).length - 1;
    if (begins !== ends || begins > 1 || (begins === 1 && value.indexOf(MANAGED_RULES_BEGIN) > value.indexOf(MANAGED_RULES_END))) return { valid: false };
    blocks += begins;
  }
  return { valid: blocks <= 1 };
}

function mergeInstruction(instructions, block) {
  if (instructions === undefined) return block;
  if (typeof instructions === 'string') {
    if (!instructions.includes(MANAGED_RULES_BEGIN)) return instructions ? `${instructions}\n\n${block}` : block;
    return instructions.replace(new RegExp(`${escape(MANAGED_RULES_BEGIN)}[\\s\\S]*?${escape(MANAGED_RULES_END)}`), block);
  }
  const result = instructions.filter((item) => !item.includes(MANAGED_RULES_BEGIN));
  result.push(block);
  return result;
}

function removeManagedInstructions(instructions) {
  if (typeof instructions === 'string') {
    const value = instructions.replace(new RegExp(`\\n?${escape(MANAGED_RULES_BEGIN)}[\\s\\S]*?${escape(MANAGED_RULES_END)}\\n?`), '\n').trim();
    return value || undefined;
  }
  if (Array.isArray(instructions)) {
    const values = instructions.filter((item) => !item.includes(MANAGED_RULES_BEGIN));
    return values.length ? values : undefined;
  }
  return instructions;
}

function normalizeOperations(operations) {
  return [...operations].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function compareIssue(a, b) {
  const domains = ['manifest', 'directories', 'core', 'entry', 'rules', 'adapters', 'skills', 'commands', 'work'];
  return domains.indexOf(a.domain) - domains.indexOf(b.domain) || a.path.localeCompare(b.path) || a.code.localeCompare(b.code);
}

function neutralizeContractMarkers(content) {
  return content.split(CONTRACT_BEGIN).join('niuma-harness contract begin')
    .split(CONTRACT_END).join('niuma-harness contract end');
}

function normalizeEol(value) { return value.replace(/\r\n/g, '\n'); }
function relative(root, target) { return path.relative(root, target).split(path.sep).join('/') || '.'; }
function escape(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = { createRepairPlan, inspectNode };
