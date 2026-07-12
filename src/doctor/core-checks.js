// doctor 的通用文件/目录检查，以及入口文件、核心文档和 workDir 校验。
const fs = require('fs');
const path = require('path');
const { getAllEntryFiles, getEntryFilesForAgent } = require('../agents');
const { assertNoSymlinkInPath, safeResolveInside } = require('../fs-safe');
const { renderTemplate } = require('../scaffold/templates');
const { analyzeContractBlock, sliceContractBlock } = require('../contract');
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
  for (const entryFile of expected) {
    checkRelativeFile(workspaceRoot, entryFile, `entry file ${entryFile}`, result);
  }
  checkInactiveEntryContracts(context, new Set(expected));
}

function checkInactiveEntryContracts(context, activeEntries) {
  const { result, workspaceRoot } = context;
  const harnessDir = path.basename(context.harnessRoot);
  const canonicalBlock = sliceContractBlock(
    renderTemplate('entry/entry.md', { HARNESS_DIR: harnessDir })
  );
  const normalize = (value) => value.replace(/\r\n/g, '\n');
  for (const entryFile of getAllEntryFiles()) {
    if (activeEntries.has(entryFile)) {
      continue;
    }
    const content = readOptionalEntry(workspaceRoot, entryFile, result);
    if (content === null) {
      continue;
    }
    const analysis = analyzeContractBlock(content);
    if (analysis.status === 'missing') {
      continue;
    }
    if (analysis.status === 'valid') {
      if (canonicalBlock && contractBelongsToOtherHarness(analysis.block, canonicalBlock, harnessDir, normalize)) {
        continue;
      }
      addError(result, `stale contract zone in ${entryFile}`);
      continue;
    }
    addError(result, staleContractAnalysisError(analysis.status, entryFile));
  }
}

function contractBelongsToOtherHarness(block, canonicalBlock, harnessDir, normalize) {
  const placeholder = '__NIUMA_HARNESS_DIR__';
  const expected = normalize(canonicalBlock).split(`${harnessDir}/`).join(`${placeholder}/`);
  const actual = normalize(block);
  const match = actual.match(/(?:^|[\s`(])([A-Za-z0-9._-]+)\/docs\//);
  if (!match || match[1] === harnessDir) {
    return false;
  }
  return actual.split(`${match[1]}/`).join(`${placeholder}/`) === expected;
}

function staleContractAnalysisError(status, entryFile) {
  const messages = {
    'missing-begin': `stale contract zone begin marker missing in ${entryFile}`,
    'missing-end': `stale contract zone end marker missing in ${entryFile}`,
    multiple: `multiple stale contract zones in ${entryFile}`,
    'out-of-order': `stale contract zone markers out of order in ${entryFile}`,
  };
  return messages[status] || `invalid stale contract zone in ${entryFile}`;
}

function checkEntryListMatches(result, actual, expected, agent) {
  if (!sameStringArray(actual, expected)) {
    addError(result, `entryFiles must match agent ${agent}: ${expected.join(', ')}`);
    return;
  }

  addOk(result, 'entryFiles match agent');
}

// 契约区完整性：manifest 声明的每个入口都必须包含唯一、完整且和模板一致的 contract 块。
function checkEntryContractIntegrity(context) {
  const { agent, result, status, workspaceRoot } = context;
  if (!agent) {
    return;
  }
  const harnessDir = path.basename(context.harnessRoot);
  const canonicalBlock = sliceContractBlock(
    renderTemplate('entry/entry.md', { HARNESS_DIR: harnessDir })
  );
  if (!canonicalBlock) {
    addError(result, 'entry template source has no unique contract block');
    return;
  }

  for (const entryFile of getEntryFilesForAgent(agent)) {
    const content = readOptionalEntry(workspaceRoot, entryFile, result);
    if (content === null) {
      continue; // 缺失已由 checkEntryFiles 报告
    }

    const analysis = analyzeContractBlock(content);
    const error = contractAnalysisError(analysis.status, entryFile);
    if (error) {
      addError(result, error);
      continue;
    }

    // 比对前归一化换行符：用户文件可能被 git autocrlf 或编辑器转成 CRLF，避免误报 drift。
    const normalize = (value) => value.replace(/\r\n/g, '\n');
    if (normalize(analysis.block) !== normalize(canonicalBlock)) {
      addError(result, `contract zone drifted in ${entryFile}`);
      continue;
    }
    addOk(result, `contract intact in ${entryFile}`);
  }
}

function contractAnalysisError(status, entryFile) {
  const messages = {
    missing: `contract zone missing in ${entryFile}`,
    'missing-begin': `contract zone begin marker missing in ${entryFile}`,
    'missing-end': `contract zone end marker missing in ${entryFile}`,
    multiple: `multiple contract zones in ${entryFile}`,
    'out-of-order': `contract zone markers out of order in ${entryFile}`,
  };
  return messages[status] || null;
}

function readOptionalEntry(workspaceRoot, entryFile, result) {
  let filePath;
  try {
    filePath = safeResolveInside(workspaceRoot, entryFile, `entry file ${entryFile}`);
    assertNoSymlinkInPath(filePath);
  } catch (error) {
    if (result) {
      addError(result, error.message);
    }
    return null;
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  if (!fs.lstatSync(filePath).isFile()) {
    if (result) {
      addError(result, `not a regular file entry file ${entryFile}`);
    }
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
  checkWorkDir,
  checkRegularFile,
  checkDirectory,
};
