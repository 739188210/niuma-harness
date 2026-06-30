// doctor 的通用文件/目录检查，以及入口文件、核心文档和 workDir 校验。
const fs = require('fs');
const path = require('path');
const { getEntryFilesForAgent } = require('../agents');
const { safeResolveInside } = require('../fs-safe');
const { renderTemplate } = require('../scaffold/templates');
const { addError, addOk } = require('./result');

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

// 契约区完整性：入口文件里的 contract 块必须和模板渲染结果一致，防止被 agent 或人改坏。
// 没有 begin 标记的入口（用户自管文件）直接跳过，不误报。
const CONTRACT_BEGIN = '<!-- niuma-harness:contract begin';
const CONTRACT_END = '<!-- niuma-harness:contract end -->';

function checkEntryContractIntegrity(context) {
  const { result, status, workspaceRoot } = context;
  const harnessDir = status.harnessDir || 'harness';
  const canonicalBlock = sliceContractBlock(
    renderTemplate('entry/entry.md', { HARNESS_DIR: harnessDir })
  );
  if (!canonicalBlock) {
    addError(result, 'entry template source has no contract block');
    return;
  }

  for (const entryFile of status.entryFiles) {
    const content = readOptionalEntry(workspaceRoot, entryFile);
    if (content === null) {
      continue; // 缺失已由 checkEntryFiles 报告
    }
    if (!content.includes(CONTRACT_BEGIN)) {
      continue; // 用户自管入口，无契约块，不强制
    }
    const block = sliceContractBlock(content);
    if (!block) {
      addError(result, `contract zone end marker missing in ${entryFile}`);
      continue;
    }
    if (block !== canonicalBlock) {
      addError(result, `contract zone drifted in ${entryFile}`);
      continue;
    }
    addOk(result, `contract intact in ${entryFile}`);
  }
}

function sliceContractBlock(content) {
  const beginIdx = content.indexOf(CONTRACT_BEGIN);
  if (beginIdx === -1) {
    return null;
  }
  const endIdx = content.indexOf(CONTRACT_END, beginIdx);
  if (endIdx === -1) {
    return null;
  }
  return content.slice(beginIdx, endIdx + CONTRACT_END.length);
}

function readOptionalEntry(workspaceRoot, entryFile) {
  let filePath;
  try {
    filePath = safeResolveInside(workspaceRoot, entryFile, `entry file ${entryFile}`);
  } catch (error) {
    return null;
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function checkCoreDocs(context) {
  checkTemplateDirectories(context);
  checkTemplateFiles(context);
}

// 核心目录以 templates/manifest.json 为准，避免 doctor 和 scaffold 各维护一份清单。
function checkTemplateDirectories(context) {
  const { harnessRoot, result, templateManifest } = context;
  for (const directory of templateManifest.directories || []) {
    checkDirectory(path.join(harnessRoot, ...directory.split('/')), `${directory}/`, result);
  }
}

// templateFiles 都生成在 harness root 下；workTemplateFiles 由 workDir 校验负责。
function checkTemplateFiles(context) {
  const { harnessRoot, result, templateManifest } = context;
  for (const file of templateManifest.templateFiles || []) {
    checkRegularFile(path.join(harnessRoot, ...file.target.split('/')), file.target, result);
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
  checkEntryFiles,
  checkEntryContractIntegrity,
  checkCoreDocs,
  checkTemplateDirectories,
  checkTemplateFiles,
  checkWorkDir,
  checkRegularFile,
  checkDirectory,
  checkRelativeFile,
  sameStringArray,
};
