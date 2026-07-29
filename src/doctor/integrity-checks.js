const fs = require('fs');
const path = require('path');
const { assertNoSymlinkInPath, safeResolveInside } = require('../infrastructure/fs-safe');
const { renderTemplate } = require('../generator/template-renderer');
const { createTemplateVariables } = require('../harness/template-variables');
const { addError, addOk } = require('./result');

function checkManagedContentIntegrity(context) {
  const { agent } = context;
  if (!agent) return;
  const variables = createTemplateVariables(
    { agent, harnessDir: path.basename(context.harnessRoot) },
    context.runtimeLayout.workDirectory
  );
  checkManagedTemplates(context, variables);
}

function checkManagedTemplates(context, variables) {
  for (const file of context.templateManifest.templateFiles || []) {
    if (file.managed === 'user' || file.dynamic) continue;
    checkExactContent(context, context.harnessRoot, file.target, renderTemplate(file.template, variables));
  }
  for (const file of context.templateManifest.workTemplateFiles || []) {
    checkExactContent(context, context.workspaceRoot, file.target, renderTemplate(file.template, variables));
  }
}

function checkExactContent(context, baseDir, target, expected) {
  const targetPath = safeManagedPath(context, baseDir, target);
  if (!targetPath || !isRegularFile(targetPath)) return;
  const actual = fs.readFileSync(targetPath);
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (!actual.equals(expectedBytes)) {
    addError(context.result, `managed content drifted ${target}`);
    return;
  }
  addOk(context.result, `managed content intact ${target}`);
}

function safeManagedPath(context, baseDir, target) {
  try {
    const targetPath = safeResolveInside(baseDir, target, `managed content ${target}`);
    assertNoSymlinkInPath(targetPath);
    return targetPath;
  } catch (error) {
    addError(context.result, error.message);
    return null;
  }
}

function isRegularFile(filePath) {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
}

module.exports = {
  checkManagedContentIntegrity,
};
