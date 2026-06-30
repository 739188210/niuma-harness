// doctor 的通用文件/目录检查，以及入口文件、核心文档和 workDir 校验。
const fs = require('fs');
const path = require('path');
const { getEntryFilesForAgent } = require('../agents');
const { safeResolveInside } = require('../fs-safe');
const { addError, addOk } = require('./result');

const LAYER_MEMOS = [
  'docs/layers/01-context/memo.md',
  'docs/layers/02-policy/memo.md',
  'docs/layers/03-process/memo.md',
  'docs/layers/04-observation/memo.md',
  'docs/layers/05-recovery/memo.md',
  'docs/layers/06-memory/memo.md',
  'docs/layers/07-loop/memo.md',
];

// 入口文件在 workspace 根（harness 目录的父级），不在 harness root。
function checkEntryFiles(context) {
  const { agent, result, status, workspaceRoot } = context;
  if (!Array.isArray(status.entryFiles)) {
    addError(result, 'entryFiles must be an array');
    return;
  }

  if (!agent) {
    return;
  }

  const expected = getEntryFilesForAgent(agent);
  checkEntryListMatches(result, status.entryFiles, expected, agent);
  for (const entryFile of status.entryFiles) {
    checkRelativeFile(workspaceRoot, entryFile, `entry file ${entryFile}`, result);
  }
}

function checkEntryListMatches(result, actual, expected, agent) {
  if (!sameStringArray(actual, expected)) {
    addError(result, `entryFiles must match agent ${agent}: ${expected.join(', ')}`);
    return;
  }

  addOk(result, 'entryFiles match agent');
}

function checkCoreDocs(context) {
  const { harnessRoot, result } = context;
  checkRegularFile(path.join(harnessRoot, 'HARNESS_GUIDE.md'), 'HARNESS_GUIDE.md', result);
  checkRegularFile(path.join(harnessRoot, 'docs', 'index.md'), 'docs/index.md', result);
  checkRegularFile(path.join(harnessRoot, 'docs', 'project-context.md'), 'docs/project-context.md', result);
  checkDirectory(path.join(harnessRoot, 'docs'), 'docs/', result);
  checkDirectory(path.join(harnessRoot, 'docs', 'layers'), 'docs/layers/', result);
  checkDirectory(path.join(harnessRoot, 'docs', 'rules'), 'docs/rules/', result);
}

function checkLayerMemos(context) {
  const { harnessRoot, result } = context;
  for (const layerMemo of LAYER_MEMOS) {
    checkRegularFile(path.join(harnessRoot, ...layerMemo.split('/')), layerMemo, result);
  }
}

// workDir 位于 workspace 根（harness 目录的父级）。
function checkWorkDir(context) {
  const { result, status, workspaceRoot } = context;
  if (!status.workDir) {
    addError(result, 'missing workDir');
    return;
  }

  const workDir = resolveWorkDir(workspaceRoot, status.workDir, result);
  if (!workDir) {
    return;
  }

  checkDirectory(workDir, `${status.workDir}/`, result);
  checkRegularFile(path.join(workDir, 'README.md'), `${status.workDir}/README.md`, result);
  checkDirectory(path.join(workDir, 'tasks'), `${status.workDir}/tasks/`, result);
}

function resolveWorkDir(workspaceRoot, workDir, result) {
  try {
    return safeResolveInside(workspaceRoot, workDir, 'workDir');
  } catch (error) {
    addError(result, error.message);
    return null;
  }
}

function checkRelativeFile(harnessRoot, relativePath, label, result) {
  let filePath;
  try {
    filePath = safeResolveInside(harnessRoot, relativePath, label);
  } catch (error) {
    addError(result, error.message);
    return;
  }

  checkRegularFile(filePath, label, result);
}

function checkRegularFile(filePath, label, result) {
  if (!fs.existsSync(filePath)) {
    addError(result, `missing ${label}`);
    return;
  }

  const stat = fs.lstatSync(filePath);
  if (!stat.isFile()) {
    addError(result, `not a regular file ${label}`);
    return;
  }

  addOk(result, label);
}

function checkDirectory(dirPath, label, result) {
  if (!fs.existsSync(dirPath)) {
    addError(result, `missing ${label}`);
    return;
  }

  const stat = fs.lstatSync(dirPath);
  if (!stat.isDirectory()) {
    addError(result, `not a directory ${label}`);
    return;
  }

  addOk(result, label);
}

function sameStringArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

module.exports = {
  LAYER_MEMOS,
  checkEntryFiles,
  checkCoreDocs,
  checkLayerMemos,
  checkWorkDir,
  checkRegularFile,
  checkDirectory,
  checkRelativeFile,
  sameStringArray,
};
