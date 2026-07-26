const path = require('path');
const { renderTemplate } = require('./generator/template-renderer');

function renderModuleSupplement(module, entryFile, workspaceDir, harnessDir, agent) {
  const modulePath = path.join(workspaceDir, ...module.root.split('/'));
  const rootHarnessPath = path.join(workspaceDir, harnessDir);
  const rootHarnessDir = path.relative(modulePath, rootHarnessPath).split(path.sep).join('/') || '.';
  const template = agent === 'multi' && entryFile === 'CLAUDE.md'
    ? 'entry/module-supplement-claude-pointer.md'
    : 'entry/module-supplement.md';
  return renderTemplate(template, {
    MODULE_ID: module.id,
    MODULE_ROOT: module.root,
    ENTRY_FILE: entryFile,
    ROOT_HARNESS_DIR: rootHarnessDir,
  });
}

module.exports = { renderModuleSupplement };
