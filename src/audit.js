// Audit orchestration is intentionally read-only. Evaluation/reporting are layered later.
const fs = require('fs');
const path = require('path');
const { canonicalizeWorkspacePath, assertNoSymlinkInPath, safeResolveInside } = require('./fs-safe');
const { loadManifest, validateManifest } = require('./generator/template-manifest');
const { assertWorkDirBinding, getRuntimeLayout, resolveRuntimePaths } = require('./runtime-layout');
const { STATUS_FILE } = require('./harness-status');
const { locateStatusFile } = require('./doctor/status');
const { loadTaskRecords, selectTaskRecords } = require('./audit/records');
const { evaluateAudit } = require('./audit/evaluator');
const { printAuditReport } = require('./audit/report');

function runAudit(options) {
  const result = inspectAudit(options);
  if (result.dimensions) {
    printAuditReport(result);
  } else {
    printAuditError(result);
  }
  process.exitCode = result.status === 'FAIL' || (options.strict && result.status === 'PARTIAL') ? 1 : 0;
}

function inspectAudit(options) {
  try {
    return inspectAuditUnsafe(options);
  } catch (error) {
    return { status: 'FAIL', error: `audit evaluation failed: ${error.message}` };
  }
}

function inspectAuditUnsafe(options) {
  let workspaceRoot;
  try {
    workspaceRoot = canonicalizeWorkspacePath(options.targetDir || '.');
  } catch (error) {
    return { status: 'FAIL', error: error.message };
  }

  const location = locateStatusFile(workspaceRoot, options.harnessDir);
  if (!location) {
    return { status: 'FAIL', error: `missing ${STATUS_FILE}`, workspaceRoot };
  }

  try {
    assertNoSymlinkInPath(location.statusPath);
    if (!fs.lstatSync(location.statusPath).isFile()) {
      throw new Error(`Path exists but is not a regular file: ${location.statusPath}`);
    }
  } catch (error) {
    return { status: 'FAIL', error: error.message, workspaceRoot, harnessRoot: location.harnessRoot };
  }

  let status;
  try {
    status = JSON.parse(fs.readFileSync(location.statusPath, 'utf8'));
  } catch (error) {
    return { status: 'FAIL', error: `invalid ${STATUS_FILE}: ${error.message}`, workspaceRoot, harnessRoot: location.harnessRoot };
  }
  if (!status || Array.isArray(status) || typeof status !== 'object' || typeof status.workDir !== 'string') {
    return { status: 'FAIL', error: `invalid ${STATUS_FILE}: missing workDir`, workspaceRoot, harnessRoot: location.harnessRoot };
  }

  let records;
  let runtimeLayout;
  try {
    const templateManifest = loadManifest();
    validateManifest(templateManifest);
    runtimeLayout = getRuntimeLayout(templateManifest);
    assertWorkDirBinding(status.workDir, runtimeLayout);
    const runtimePaths = resolveRuntimePaths(location.workspaceDir, runtimeLayout);
    if (fs.existsSync(runtimePaths.workDir) && !fs.lstatSync(runtimePaths.workDir).isDirectory()) {
      throw new Error(`invalid workDir: expected a non-symlink directory: ${runtimePaths.workDir}`);
    }
    records = loadTaskRecords(runtimePaths.workDir);
  } catch (error) {
    return { status: 'FAIL', error: error.message, workspaceRoot: location.workspaceDir, harnessRoot: location.harnessRoot };
  }
  const selection = selectTaskRecords(records, options);
  let bootstrapContent;
  try {
    const bootstrapPath = safeResolveInside(location.harnessRoot, 'docs/project-context.md', 'project context');
    assertNoSymlinkInPath(bootstrapPath);
    if (!fs.lstatSync(bootstrapPath).isFile()) throw new Error(`Path exists but is not a regular file: ${bootstrapPath}`);
    bootstrapContent = fs.readFileSync(bootstrapPath, 'utf8');
  } catch (error) {
    return { status: 'FAIL', error: error.message, workspaceRoot: location.workspaceDir, harnessRoot: location.harnessRoot };
  }

  return evaluateAudit({
    workspaceRoot: location.workspaceDir,
    harnessRoot: location.harnessRoot,
    bootstrapContent,
    taskEntries: selection.records,
    workDirectory: runtimeLayout.workDirectory,
    selectionReason: selection.reason || (selection.status === 'none' ? 'No task execution records to evaluate.' : null),
  });
}

function printAuditError(result) {
  if (result.workspaceRoot) console.log(`Workspace: ${result.workspaceRoot}`);
  if (result.harnessRoot) console.log(`Harness: ${result.harnessRoot}`);
  if (result.error) console.error(`Error: ${result.error}`);
  console.log(`Audit: ${result.status}`);
}

module.exports = {
  inspectAudit,
  runAudit,
};
