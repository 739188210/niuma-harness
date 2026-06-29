// doctor 的顶层编排层；具体检查逻辑放在 src/doctor/ 子模块中。
const path = require('path');
const { STATUS_FILE } = require('./harness-status');
const { checkRegularFile } = require('./doctor/core-checks');
const { checkHarness } = require('./doctor/checks');
const { createResult, addError } = require('./doctor/result');
const { printDoctorResult } = require('./doctor/report');
const { findStatusFile, readStatus } = require('./doctor/status');

function runDoctor(options) {
  const result = inspectHarness(options);
  printDoctorResult(result);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

// 先定位生成的 manifest.json，后续检查都基于它所在的 harness root。
function inspectHarness(options) {
  const targetDir = path.resolve(options.targetDir || '.');
  const result = createResult();
  const statusPath = findStatusFile(targetDir, options.harnessDir);

  if (!statusPath) {
    result.harnessRoot = targetDir;
    addError(result, `missing ${STATUS_FILE}`);
    return result;
  }

  return inspectStatusFile(statusPath, result);
}

// 先确认 manifest.json 文件本身可读，再信任其中的字段。
function inspectStatusFile(statusPath, result) {
  const harnessRoot = path.dirname(statusPath);
  result.harnessRoot = harnessRoot;
  checkRegularFile(statusPath, STATUS_FILE, result);

  if (result.errors.length > 0) {
    return result;
  }

  const status = readStatus(statusPath, result);
  if (status) {
    checkHarness(harnessRoot, status, result);
  }

  return result;
}

module.exports = {
  runDoctor,
  inspectHarness,
  findStatusFile,
  checkHarness,
};
