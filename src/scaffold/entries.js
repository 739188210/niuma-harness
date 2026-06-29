// 写入 agent 入口文件和普通模板文件。
const { getEntryFilesForAgent } = require('../agents');
const { safeResolveInside, writeFile } = require('../fs-safe');
const { renderTemplate } = require('./templates');

function writeEntryFiles(context) {
  const { options, targetDir, variables, printAction } = context;
  for (const entryFile of getEntryFilesForAgent(options.agent)) {
    const templatePath = entryFile === 'CLAUDE.md' ? 'entry/CLAUDE.md' : 'entry/AGENTS.md';
    const targetPath = safeResolveInside(targetDir, entryFile, 'entry target');
    const content = renderTemplate(templatePath, { ...variables, ENTRY_FILE: entryFile });
    printAction(writeFile(targetPath, content, options), targetPath);
  }
}

function writeTemplateFiles(context) {
  const { manifest, options, targetDir, variables, printAction } = context;
  for (const file of manifest.templateFiles) {
    const targetPath = safeResolveInside(targetDir, file.target, 'template target');
    const content = renderTemplate(file.template, variables);
    printAction(writeFile(targetPath, content, options), targetPath);
  }
}

function writeWorkTemplateFiles(context) {
  const { manifest, options, workspaceDir, variables, printAction } = context;
  for (const file of manifest.workTemplateFiles || []) {
    const targetPath = safeResolveInside(workspaceDir, file.target, 'work template target');
    const content = renderTemplate(file.template, variables);
    printAction(writeFile(targetPath, content, options), targetPath);
  }
}

module.exports = {
  writeEntryFiles,
  writeTemplateFiles,
  writeWorkTemplateFiles,
};
