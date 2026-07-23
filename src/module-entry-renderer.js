const path = require('path');
const { renderTemplate } = require('./generator/template-renderer');

function renderModuleSupplement(module, entryFile, workspaceDir, harnessDir) {
  const modulePath = path.join(workspaceDir, ...module.root.split('/'));
  const rootHarnessPath = path.join(workspaceDir, harnessDir);
  const rootHarnessDir = path.relative(modulePath, rootHarnessPath).split(path.sep).join('/') || '.';
  return renderTemplate('entry/module-supplement.md', {
    MODULE_ID: module.id,
    MODULE_ROOT: module.root,
    ENTRY_FILE: entryFile,
    ROOT_HARNESS_DIR: rootHarnessDir,
  });
}

module.exports = { renderModuleSupplement };
