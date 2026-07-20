// 模块入口仅管理其独立 supplement 区块，始终保留区块外的项目内容。
const fs = require('fs');
const path = require('path');
const { getEntryFilesForAgent } = require('../agents');
const { digestBytes } = require('../artifact-ledger');
const { inspectFileTarget, removeFile, safeResolveInside, writeFile } = require('../fs-safe');
const { renderModuleSupplement } = require('../module-entry-renderer');
const {
  analyzeModuleBlock,
  removeMarkedBlock,
  replaceMarkedBlock,
  sliceMarkedBlock,
  MODULE_BEGIN,
  MODULE_END,
} = require('../contract');

function prepareModuleEntryPlan(context) {
  const previous = context.previousStatus && Array.isArray(context.previousStatus.moduleSupplements)
    ? context.previousStatus.moduleSupplements : [];
  const active = getActiveDescriptors(context, new Map(previous.map((item) => [item.target, item])));
  const activeTargets = new Set(active.map((item) => item.target));
  const retired = previous.filter((item) => !activeTargets.has(item.target))
    .map((item) => prepareRetirement(context, item));
  return [...retired, ...active.map((item) => prepareWrite(context, item))];
}

function getActiveDescriptors(context, previousByTarget) {
  return (context.topology.modules || []).flatMap((module) => getEntryFilesForAgent(context.options.agent).map((entryFile) => {
    const target = `${module.root}/${entryFile}`;
    return {
      entryFile,
      module,
      previous: previousByTarget.get(target),
      target,
    };
  }));
}

function prepareWrite(context, descriptor) {
  const { entryFile, module, previous, target } = descriptor;
  const targetPath = safeResolveInside(context.workspaceDir, target, 'module entry target');
  const fresh = renderModuleSupplement(module, entryFile, context.workspaceDir, context.options.harnessDir);
  const block = sliceMarkedBlock(fresh, MODULE_BEGIN, MODULE_END);
  if (!block) throw new Error('module supplement template is missing a valid managed block');
  if (!inspectFileTarget(targetPath)) {
    return makeRecord('create', fresh, descriptor, targetPath, block, true);
  }

  const existing = fs.readFileSync(targetPath, 'utf8');
  const analysis = analyzeModuleBlock(existing);
  if (analysis.status === 'missing') return makeRecord('merge', `${block}${existing.includes('\r\n') ? '\r\n\r\n' : '\n\n'}${existing}`, descriptor, targetPath, block, false);
  if (analysis.status !== 'valid') throw new Error(moduleBlockError(analysis.status, target));
  if (!analysis.block.includes(`module=${module.id} root=${module.root}`)) {
    throw new Error(`module supplement ownership does not match ${target}`);
  }
  const eolBlock = existing.includes('\r\n') ? block.replace(/\n/g, '\r\n') : block;
  return makeRecord('refresh', replaceMarkedBlock(existing, eolBlock, MODULE_BEGIN, MODULE_END), descriptor, targetPath, eolBlock, Boolean(previous && previous.createdByNiuma));
}

function prepareRetirement(context, record) {
  const targetPath = safeResolveInside(context.workspaceDir, record.target, 'retired module entry target');
  if (!inspectFileTarget(targetPath)) return { action: 'skip', kind: 'retire-module-entry', observedDigest: null, targetPath };
  const existing = fs.readFileSync(targetPath, 'utf8');
  const analysis = analyzeModuleBlock(existing);
  if (analysis.status === 'missing') return { action: 'skip', kind: 'retire-module-entry', observedDigest: digestBytes(existing), targetPath };
  if (analysis.status !== 'valid') throw new Error(moduleBlockError(analysis.status, record.target));
  if (!analysis.block.includes(`module=${record.moduleId} root=${record.moduleRoot}`)) {
    throw new Error(`module supplement ownership does not match ${record.target}`);
  }
  const observedDigest = digestBytes(existing);
  if (record.createdByNiuma && record.fileDigest && record.fileDigest === observedDigest) {
    return { action: 'remove', kind: 'retire-module-entry', observedDigest, targetPath };
  }
  return { action: 'retire', content: removeModuleBlockAndMergeSeparator(existing), kind: 'retire-module-entry', observedDigest, targetPath };
}

function removeModuleBlockAndMergeSeparator(content) {
  const analysis = analyzeModuleBlock(content);
  const remainder = removeMarkedBlock(content, MODULE_BEGIN, MODULE_END);
  if (!analysis || analysis.status !== 'valid' || !remainder) return remainder;
  if (analysis.begin === 0 && remainder.startsWith('\r\n\r\n')) return remainder.slice(4);
  if (analysis.begin === 0 && remainder.startsWith('\n\n')) return remainder.slice(2);
  return remainder;
}

function makeRecord(action, content, descriptor, targetPath, block, createdByNiuma) {
  return {
    action,
    blockDigest: digestBytes(block),
    createdByNiuma,
    content,
    entryFile: descriptor.entryFile,
    fileDigest: digestBytes(content),
    kind: 'module-entry',
    moduleId: descriptor.module.id,
    moduleRoot: descriptor.module.root,
    target: descriptor.target,
    targetPath,
  };
}

function writeModuleEntryPlan(context) {
  revalidateRetirements(context.moduleEntryPlan);
  for (const item of context.moduleEntryPlan) {
    if (item.kind === 'retire-module-entry') {
      if (item.action === 'remove') context.printAction(removeFile(item.targetPath, { dryRun: context.options.dryRun }), item.targetPath);
      else if (item.action === 'retire') context.printAction(writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: true }), item.targetPath);
      else context.printAction('skip', item.targetPath);
      continue;
    }
    context.printAction(writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: item.action !== 'create' }), item.targetPath);
  }
}

function revalidateRetirements(plan) {
  for (const item of plan.filter((candidate) => candidate.kind === 'retire-module-entry')) {
    const exists = inspectFileTarget(item.targetPath);
    if (item.observedDigest === null) {
      if (exists) throw new Error(`retired module entry appeared after preflight: ${item.targetPath}`);
      continue;
    }
    if (!exists || digestBytes(fs.readFileSync(item.targetPath)) !== item.observedDigest) {
      throw new Error(`retired module entry changed after preflight: ${item.targetPath}`);
    }
  }
}

function getModuleSupplementRecords(plan) {
  return plan.filter((item) => item.kind === 'module-entry').map((item) => ({
    blockDigest: item.blockDigest,
    createdByNiuma: item.createdByNiuma,
    entryFile: item.entryFile,
    fileDigest: item.fileDigest,
    moduleId: item.moduleId,
    moduleRoot: item.moduleRoot,
    target: item.target,
  })).sort((left, right) => left.target.localeCompare(right.target));
}

function moduleBlockError(status, target) {
  const messages = {
    'missing-begin': 'module supplement begin marker missing',
    'missing-end': 'module supplement end marker missing',
    multiple: 'multiple module supplement zones',
    'out-of-order': 'module supplement markers out of order',
  };
  return `${messages[status] || 'invalid module supplement'} in ${target}`;
}

module.exports = { getModuleSupplementRecords, prepareModuleEntryPlan, writeModuleEntryPlan };
