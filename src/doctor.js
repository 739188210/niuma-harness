// doctor 的顶层编排层；具体检查逻辑放在 src/doctor/ 子模块中。
const path = require('path');
const { assertNoSymlinkInPath, canonicalizeWorkspacePath } = require('./fs-safe');
const { STATUS_FILE } = require('./harness-status');
const { checkRegularFile } = require('./doctor/core-checks');
const { checkHarness } = require('./doctor/checks');
const { createResult, addError } = require('./doctor/result');
const { printDoctorResult } = require('./doctor/report');
const { locateStatusFile, readStatus } = require('./doctor/status');
const {
  findCompetingHarnesses,
  formatCompetingHarnessError,
} = require('./workspace-harnesses');

function runDoctor(options) {
  const result = inspectHarness(options);
  printDoctorResult(result);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

// 先定位生成的 manifest.json，后续检查都基于它所在的 harness root。
function inspectHarness(options) {
  const result = createResult();
  let targetDir;
  try {
    targetDir = canonicalizeWorkspacePath(options.targetDir || '.');
  } catch (error) {
    result.harnessRoot = path.resolve(options.targetDir || '.');
    addError(result, error.message);
    return result;
  }
  const location = locateStatusFile(targetDir, options.harnessDir);

  if (!location) {
    result.harnessRoot = targetDir;
    addError(result, `missing ${STATUS_FILE}`);
    return result;
  }

  try {
    assertNoSymlinkInPath(location.statusPath);
  } catch (error) {
    result.harnessRoot = location.harnessRoot;
    addError(result, error.message);
    return result;
  }

  if (location.mode === 'workspace') {
    const conflicts = findCompetingHarnesses(
      location.workspaceDir,
      path.basename(location.harnessRoot)
    );
    if (conflicts.length > 0) {
      addError(
        result,
        formatCompetingHarnessError(
          location.workspaceDir,
          path.basename(location.harnessRoot),
          conflicts
        )
      );
    }
  }

  return inspectStatusFile(location.statusPath, result);
}

// 先确认 manifest.json 文件本身可读，再信任其中的字段。
function inspectStatusFile(statusPath, result) {
  const harnessRoot = path.dirname(statusPath);
  result.harnessRoot = harnessRoot;
  const errorsBeforeFileCheck = result.errors.length;
  checkRegularFile(statusPath, STATUS_FILE, result);

  if (result.errors.length > errorsBeforeFileCheck) {
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
};
