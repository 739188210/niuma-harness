// 写入 agent 入口文件和普通模板文件。
const { getEntryFilesForAgent } = require('../agents');
const { safeResolveInside, writeFile } = require('../fs-safe');
const { renderTemplate } = require('./templates');

// 入口文件写到 workspace 根目录，让 Claude Code 等工具默认就能发现 harness。
function writeEntryFiles(context) {
  const { options, workspaceDir, variables, printAction } = context;
  for (const entryFile of getEntryFilesForAgent(options.agent)) {
    const targetPath = safeResolveInside(workspaceDir, entryFile, 'entry target');
    const content = renderTemplate('entry/entry.md', variables);
    const action = writeFile(targetPath, content, options);
    printAction(action, targetPath);
    // 根目录已有同名入口时不静默跳过：提示用户如何把 agent 引向 harness。
    if (action === 'skip') {
      console.log(
        `Note: kept your existing ${entryFile}. The generated entry normally carries the operating loop; to install it, re-run with --force, or point your existing file at ${variables.HARNESS_DIR}/docs/index.md.`
      );
    }
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
