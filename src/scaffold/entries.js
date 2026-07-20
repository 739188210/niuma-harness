// 写入当前 agent 入口、退休旧入口契约，并处理普通模板文件。
const fs = require('fs');
const { getEntryFilesForAgent } = require('../agents');
const { digestBytes } = require('../artifact-ledger');
const {
  inspectFileTarget,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { renderEntry } = require('../entry-renderer');
const { renderTemplate } = require('./templates');
const {
  analyzeContractBlock,
  removeContractBlock,
  sliceContractBlock,
  replaceContractBlock,
} = require('../contract');

function prepareFilePlan(context) {
  assertFreshGuideTargetsAvailable(context);
  return [
    ...prepareEntryPlan(context),
    ...prepareTemplatePlan(context, context.manifest.templateFiles, context.targetDir, 'template target'),
    ...prepareTemplatePlan(context, context.manifest.workTemplateFiles || [], context.workspaceDir, 'work template target', true),
  ];
}

function assertFreshGuideTargetsAvailable(context) {
  if (context.previousStatus) return;
  const conflicts = context.manifest.templateFiles
    .filter((file) => file.initialCollision === 'error')
    .map((file) => ({
      target: file.target,
      targetPath: safeResolveInside(context.targetDir, file.target, 'template target'),
    }))
    .filter((item) => inspectFileTarget(item.targetPath));
  if (conflicts.length === 0) return;

  throw new Error([
    'first init cannot overwrite pre-existing knowledge guide files:',
    ...conflicts.map((item) => `- ${context.options.harnessDir}/${item.target}`),
    'Move, merge, rename, or remove the conflicting guide files, then retry.',
  ].join('\n'));
}

function prepareEntryPlan(context) {
  const currentEntries = getEntryFilesForAgent(context.options.agent);
  const current = currentEntries.map((entryFile) => {
    const freshFull = renderEntry(
      context.options.agent,
      entryFile,
      context.options.rules,
      context.options.harnessDir,
      context.workDirectory,
      context.manifest.rulesRoot
    );
    const freshBlock = sliceContractBlock(freshFull);
    if (!freshBlock) throw new Error('entry template is missing a valid contract zone');
    return prepareEntryWrite(context.workspaceDir, entryFile, freshFull, freshBlock);
  });
  if (!context.previousStatus) {
    return current;
  }

  const active = new Set(currentEntries);
  const retired = getEntryFilesForAgent(context.previousStatus.agent)
    .filter((entryFile) => !active.has(entryFile))
    .map((entryFile) => prepareEntryRetirement(
      context.workspaceDir,
      entryFile,
      renderEntry(
        context.previousStatus.agent,
        entryFile,
        context.previousStatus.rules || [],
        context.options.harnessDir,
        context.workDirectory,
        context.manifest.rulesRoot
      )
    ));
  return [...retired, ...current];
}

function prepareEntryWrite(workspaceDir, entryFile, freshFull, freshBlock) {
  const targetPath = safeResolveInside(workspaceDir, entryFile, 'entry target');
  if (!inspectFileTarget(targetPath)) {
    return { action: 'create', content: freshFull, kind: 'write', targetPath };
  }

  const existing = fs.readFileSync(targetPath, 'utf8');
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const block = eol === '\r\n' ? freshBlock.replace(/\n/g, '\r\n') : freshBlock;
  const analysis = analyzeContractBlock(existing);
  if (analysis.status === 'valid') {
    return { action: 'refresh', content: replaceContractBlock(existing, block), kind: 'write', targetPath };
  }
  if (analysis.status === 'missing') {
    return { action: 'merge', content: `${block}${eol}${eol}${existing}`, kind: 'write', targetPath };
  }
  throw new Error(contractMergeError(analysis.status, entryFile));
}

function prepareEntryRetirement(workspaceDir, entryFile, previousFull) {
  const targetPath = safeResolveInside(workspaceDir, entryFile, 'retired entry target');
  if (!inspectFileTarget(targetPath)) {
    return { action: 'skip', kind: 'retire-entry', observedDigest: null, targetPath };
  }

  const existing = fs.readFileSync(targetPath, 'utf8');
  const observedDigest = digestBytes(existing);
  if (existing === previousFull) {
    return { action: 'remove', kind: 'retire-entry', observedDigest, targetPath };
  }

  const analysis = analyzeContractBlock(existing);
  if (analysis.status === 'missing') {
    return { action: 'skip', kind: 'retire-entry', observedDigest, targetPath };
  }
  if (analysis.status !== 'valid') {
    throw new Error(contractRetirementError(analysis.status, entryFile));
  }
  return {
    action: 'retire',
    content: removeContractBlock(existing),
    kind: 'retire-entry',
    observedDigest,
    targetPath,
  };
}

function prepareTemplatePlan(context, files, baseDir, label, forceOverwrite = false) {
  return files.filter((file) => !file.dynamic).map((file) => {
    const targetPath = safeResolveInside(baseDir, file.target, label);
    const exists = inspectFileTarget(targetPath);
    const overwrite = forceOverwrite || file.managed !== 'user';
    return {
      action: exists ? (overwrite ? 'overwrite' : 'skip') : 'create',
      content: renderTemplate(file.template, context.variables),
      kind: 'write',
      targetPath,
    };
  });
}

function writeFilePlan(context) {
  revalidateRetiredEntries(context.filePlan);
  for (const item of context.filePlan) {
    if (item.kind === 'retire-entry') {
      writeRetiredEntry(context, item);
      continue;
    }
    if (item.action === 'skip') {
      inspectFileTarget(item.targetPath);
      context.printAction(item.action, item.targetPath);
      continue;
    }
    writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: item.action !== 'create' });
    context.printAction(item.action, item.targetPath);
  }
}

function writeRetiredEntry(context, item) {
  if (item.action === 'remove') {
    context.printAction(removeFile(item.targetPath, { dryRun: context.options.dryRun }), item.targetPath);
    return;
  }
  if (item.action === 'retire') {
    writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: true });
    context.printAction(item.action, item.targetPath);
    return;
  }
  context.printAction('skip', item.targetPath);
}

function revalidateRetiredEntries(plan) {
  const errors = [];
  for (const item of plan.filter((candidate) => candidate.kind === 'retire-entry')) {
    try {
      const exists = inspectFileTarget(item.targetPath);
      if (item.observedDigest === null) {
        if (exists) {
          throw new Error(`retired entry appeared after preflight: ${item.targetPath}`);
        }
        continue;
      }
      if (!exists) {
        throw new Error(`retired entry disappeared after preflight: ${item.targetPath}`);
      }
      if (digestBytes(fs.readFileSync(item.targetPath)) !== item.observedDigest) {
        throw new Error(`retired entry changed after preflight: ${item.targetPath}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`retired entry revalidation failed:\n- ${errors.join('\n- ')}`);
  }
}

function contractMergeError(status, entryFile) {
  const messages = {
    'missing-begin': `contract zone begin marker missing in ${entryFile}`,
    'missing-end': `contract zone end marker missing in ${entryFile}`,
    multiple: `multiple contract zones in ${entryFile}`,
    'out-of-order': `contract zone markers out of order in ${entryFile}`,
  };
  return messages[status] || `invalid contract zone in ${entryFile}`;
}

function contractRetirementError(status, entryFile) {
  return `cannot retire ${entryFile}: ${contractMergeError(status, entryFile)}`;
}

module.exports = {
  prepareFilePlan,
  writeFilePlan,
};
