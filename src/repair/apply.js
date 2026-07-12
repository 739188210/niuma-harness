const fs = require('fs');
const path = require('path');
const { copyNodeNoFollow } = require('./backup');

function applyRepairPlan(plan, dependencies = {}) {
  const applied = [];
  try {
    const operations = sortOperations(plan.operations);
    for (const operation of operations) {
      applyOperation(plan, operation, dependencies);
      applied.push(operation);
    }
  } catch (error) {
    const rollbackErrors = rollback(plan, applied);
    if (rollbackErrors.length > 0) {
      throw new Error(`${error.message}\nRollback errors:\n- ${rollbackErrors.join('\n- ')}`);
    }
    throw error;
  }
}

function applyOperation(plan, operation, dependencies = {}) {
  const makeDirectory = dependencies.makeDirectory || ((targetPath, options) => fs.mkdirSync(targetPath, options));
  const writeFile = dependencies.writeFile || ((targetPath, content) => fs.writeFileSync(targetPath, content));
  try {
    if (operation.action === 'remove-node') {
      removeNodeNoFollow(operation.targetPath);
      return;
    }
    if (operation.action === 'create-directory' || operation.action === 'replace-directory') {
      if (operation.action === 'replace-directory') removeNodeNoFollow(operation.targetPath);
      makeDirectory(operation.targetPath, { recursive: true });
      return;
    }
    if (operation.action === 'write-file' || operation.action === 'replace-file') {
      if (operation.action === 'replace-file') removeNodeNoFollow(operation.targetPath);
      makeDirectory(path.dirname(operation.targetPath), { recursive: true });
      writeFile(operation.targetPath, operation.content);
      return;
    }
    throw new Error(`Unknown repair action: ${operation.action}`);
  } catch (error) {
    const rollbackErrors = rollback(plan, [operation]);
    if (rollbackErrors.length > 0) {
      throw new Error(`${error.message}\nRollback errors:\n- ${rollbackErrors.join('\n- ')}`);
    }
    throw error;
  }
}

function rollback(plan, applied) {
  const errors = [];
  for (const operation of [...applied].reverse()) {
    try {
      removeNodeNoFollow(operation.targetPath);
      if (operation.requiresBackup) {
        const backupPath = path.join(plan.backupRoot, 'files', ...operation.relativePath.split('/'));
        copyNodeNoFollow(backupPath, operation.targetPath);
      }
    } catch (error) {
      errors.push(`${operation.relativePath}: ${error.message}`);
    }
  }
  return errors;
}

function removeNodeNoFollow(targetPath) {
  let stat;
  try { stat = fs.lstatSync(targetPath); } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return;
    throw error;
  }
  if (stat.isDirectory() && !stat.isSymbolicLink()) fs.rmSync(targetPath, { recursive: true, force: true });
  else fs.unlinkSync(targetPath);
}

function sortOperations(operations) {
  const manifest = operations.filter((item) => item.manifest);
  const others = operations.filter((item) => !item.manifest);
  const removals = others.filter((item) => item.action === 'remove-node' || item.action === 'replace-directory' || item.action === 'replace-file')
    .sort((a, b) => b.targetPath.length - a.targetPath.length);
  const directories = others.filter((item) => item.action === 'create-directory')
    .sort((a, b) => a.targetPath.length - b.targetPath.length);
  const files = others.filter((item) => item.action === 'write-file');
  const unsupported = others.filter((item) => ![
    'remove-node', 'replace-directory', 'replace-file', 'create-directory', 'write-file',
  ].includes(item.action));
  return [...removals, ...directories, ...files, ...unsupported, ...manifest];
}

module.exports = { applyRepairPlan, removeNodeNoFollow, rollback };
