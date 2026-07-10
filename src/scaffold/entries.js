// 写入 agent 入口文件和普通模板文件。
const fs = require('fs');
const path = require('path');
const { getEntryFilesForAgent } = require('../agents');
const { assertNoSymlinkInPath, safeResolveInside, writeFile } = require('../fs-safe');
const { renderTemplate } = require('./templates');
const { analyzeContractBlock, sliceContractBlock, replaceContractBlock } = require('../contract');

// 入口走 merge：无则生成完整 entry；有契约块则换块；无块则顶部插块。用户原有内容永远保留。
function writeEntryFiles(context) {
  const { options, workspaceDir, variables, printAction } = context;
  const freshFull = renderTemplate('entry/entry.md', variables);
  const freshBlock = sliceContractBlock(freshFull);
  const writes = getEntryFilesForAgent(options.agent)
    .map((entryFile) => prepareEntryWrite(workspaceDir, entryFile, freshFull, freshBlock));

  for (const { action, content, targetPath } of writes) {
    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf8');
    }
    printAction(action, targetPath);
  }
}

// 所有入口先完成类型、symlink 和 contract 预检，再开始写入，避免 multi 模式部分更新。
function prepareEntryWrite(workspaceDir, entryFile, freshFull, freshBlock) {
  const targetPath = safeResolveInside(workspaceDir, entryFile, 'entry target');
  const exists = fs.existsSync(targetPath);
  assertNoSymlinkInPath(targetPath);

  if (!exists) {
    return { action: 'create', content: freshFull, targetPath };
  }

  const existing = fs.readFileSync(targetPath, 'utf8');
  // 按现有文件的换行风格渲染块，避免在 CRLF 文件里拼入 LF 块造成混合换行。
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

function contractMergeError(status, entryFile) {
  const messages = {
    'missing-begin': `contract zone begin marker missing in ${entryFile}`,
    'missing-end': `contract zone end marker missing in ${entryFile}`,
    multiple: `multiple contract zones in ${entryFile}`,
    'out-of-order': `contract zone markers out of order in ${entryFile}`,
  };
  return messages[status] || `invalid contract zone in ${entryFile}`;
}

// 模板文件按分类写入：tool-managed 刷新（覆盖），user-maintained 已存在则保留。
function writeTemplateFiles(context) {
  const { manifest, options, targetDir, variables, printAction } = context;
  for (const file of manifest.templateFiles) {
    const targetPath = safeResolveInside(targetDir, file.target, 'template target');
    const content = renderTemplate(file.template, variables);
    const overwrite = file.managed !== 'user';
    printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite }), targetPath);
  }
}

// work 目录模板（agent-work/README.md）属 tool-managed，每次刷新。
function writeWorkTemplateFiles(context) {
  const { manifest, options, workspaceDir, variables, printAction } = context;
  for (const file of manifest.workTemplateFiles || []) {
    const targetPath = safeResolveInside(workspaceDir, file.target, 'work template target');
    const content = renderTemplate(file.template, variables);
    printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite: true }), targetPath);
  }
}

module.exports = {
  writeEntryFiles,
  writeTemplateFiles,
  writeWorkTemplateFiles,
};
