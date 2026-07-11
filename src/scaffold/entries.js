// 写入 agent 入口文件和普通模板文件。
const fs = require('fs');
const { getEntryFilesForAgent } = require('../agents');
const { inspectFileTarget, safeResolveInside, writeFile } = require('../fs-safe');
const { renderTemplate } = require('./templates');
const { analyzeContractBlock, sliceContractBlock, replaceContractBlock } = require('../contract');

function prepareFilePlan(context) {
  return [
    ...prepareEntryPlan(context),
    ...prepareTemplatePlan(context, context.manifest.templateFiles, context.targetDir, 'template target'),
    ...prepareTemplatePlan(context, context.manifest.workTemplateFiles || [], context.workspaceDir, 'work template target', true),
  ];
}

function prepareEntryPlan(context) {
  const freshFull = renderTemplate('entry/entry.md', context.variables);
  const freshBlock = sliceContractBlock(freshFull);
  if (!freshBlock) {
    throw new Error('entry template is missing a valid contract zone');
  }
  return getEntryFilesForAgent(context.options.agent)
    .map((entryFile) => prepareEntryWrite(context.workspaceDir, entryFile, freshFull, freshBlock));
}

function prepareEntryWrite(workspaceDir, entryFile, freshFull, freshBlock) {
  const targetPath = safeResolveInside(workspaceDir, entryFile, 'entry target');
  if (!inspectFileTarget(targetPath)) {
    return { action: 'create', content: freshFull, targetPath };
  }

  const existing = fs.readFileSync(targetPath, 'utf8');
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const block = eol === '\r\n' ? freshBlock.replace(/\n/g, '\r\n') : freshBlock;
  const analysis = analyzeContractBlock(existing);
  if (analysis.status === 'valid') {
    return { action: 'refresh', content: replaceContractBlock(existing, block), targetPath };
  }
  if (analysis.status === 'missing') {
    return { action: 'merge', content: `${block}${eol}${eol}${existing}`, targetPath };
  }
  throw new Error(contractMergeError(analysis.status, entryFile));
}

function prepareTemplatePlan(context, files, baseDir, label, forceOverwrite = false) {
  return files.map((file) => {
    const targetPath = safeResolveInside(baseDir, file.target, label);
    const exists = inspectFileTarget(targetPath);
    const overwrite = forceOverwrite || file.managed !== 'user';
    return {
      action: exists ? (overwrite ? 'overwrite' : 'skip') : 'create',
      content: renderTemplate(file.template, context.variables),
      targetPath,
    };
  });
}

function writeFilePlan(context) {
  for (const item of context.filePlan) {
    if (item.action === 'skip') {
      inspectFileTarget(item.targetPath);
      context.printAction(item.action, item.targetPath);
      continue;
    }
    writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: item.action !== 'create' });
    context.printAction(item.action, item.targetPath);
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

module.exports = {
  prepareFilePlan,
  writeFilePlan,
};
