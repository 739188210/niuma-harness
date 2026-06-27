const fs = require('fs');
const path = require('path');

const { normalizeAgent, normalizeRules } = require('./args');
const { getEntryFilesForAgent, safeResolveInside } = require('./scaffold');

const STATUS_FILE = 'manifest.json';
const LAYER_MEMOS = [
  'docs/layers/01-context/memo.md',
  'docs/layers/02-policy/memo.md',
  'docs/layers/03-process/memo.md',
  'docs/layers/04-observation/memo.md',
  'docs/layers/05-recovery/memo.md',
  'docs/layers/06-memory/memo.md',
  'docs/layers/07-loop/memo.md',
];

function runDoctor(options) {
  const result = inspectHarness(options);
  printDoctorResult(result);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

function inspectHarness(options) {
  const targetDir = path.resolve(options.targetDir || '.');
  const result = {
    harnessRoot: null,
    checks: [],
    errors: [],
  };

  const statusPath = findStatusFile(targetDir, options.harnessDir);
  if (!statusPath) {
    result.harnessRoot = targetDir;
    addError(result, `missing ${STATUS_FILE}`);
    return result;
  }

  const harnessRoot = path.dirname(statusPath);
  result.harnessRoot = harnessRoot;
  checkRegularFile(statusPath, STATUS_FILE, result);

  if (result.errors.length > 0) {
    return result;
  }

  const status = readStatus(statusPath, result);
  if (!status) {
    return result;
  }

  checkHarness(harnessRoot, status, result);
  return result;
}

function findStatusFile(targetDir, harnessDir) {
  const direct = path.join(targetDir, STATUS_FILE);
  if (fs.existsSync(direct)) {
    return direct;
  }

  const nested = path.join(targetDir, harnessDir || 'harness', STATUS_FILE);
  if (fs.existsSync(nested)) {
    return nested;
  }

  return null;
}

function readStatus(statusPath, result) {
  try {
    return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (error) {
    addError(result, `invalid ${STATUS_FILE}: ${error.message}`);
    return null;
  }
}

function checkHarness(harnessRoot, status, result) {
  if (status.schemaVersion !== 1) {
    addError(result, `unsupported schemaVersion: ${status.schemaVersion}`);
  } else {
    addOk(result, 'schemaVersion 1');
  }

  const agent = status.agent ? normalizeStatusField(result, () => normalizeAgent(status.agent), 'agent') : null;
  const rules = status.rules ? normalizeStatusField(result, () => normalizeRules(status.rules), 'rules') : null;

  if (agent) {
    addOk(result, `agent ${agent}`);
  } else if (!status.agent) {
    addError(result, 'missing agent');
  }

  if (rules) {
    addOk(result, `rules ${rules}`);
  } else if (!status.rules) {
    addError(result, 'missing rules');
  }

  if (!Array.isArray(status.entryFiles)) {
    addError(result, 'entryFiles must be an array');
  } else if (agent) {
    const expected = getEntryFilesForAgent(agent);
    if (!sameStringArray(status.entryFiles, expected)) {
      addError(result, `entryFiles must match agent ${agent}: ${expected.join(', ')}`);
    } else {
      addOk(result, 'entryFiles match agent');
    }

    for (const entryFile of status.entryFiles) {
      checkRelativeFile(harnessRoot, entryFile, `entry file ${entryFile}`, result);
    }
  }

  checkRegularFile(path.join(harnessRoot, 'HARNESS_GUIDE.md'), 'HARNESS_GUIDE.md', result);
  checkRegularFile(path.join(harnessRoot, 'docs', 'index.md'), 'docs/index.md', result);
  checkRegularFile(path.join(harnessRoot, 'docs', 'project-context.md'), 'docs/project-context.md', result);
  checkRegularFile(path.join(harnessRoot, 'docs', 'tasks', 'README.md'), 'docs/tasks/README.md', result);
  checkDirectory(path.join(harnessRoot, 'docs'), 'docs/', result);
  checkDirectory(path.join(harnessRoot, 'docs', 'layers'), 'docs/layers/', result);
  checkDirectory(path.join(harnessRoot, 'docs', 'rules'), 'docs/rules/', result);
  checkDirectory(path.join(harnessRoot, 'docs', 'tasks'), 'docs/tasks/', result);

  for (const layerMemo of LAYER_MEMOS) {
    checkRegularFile(path.join(harnessRoot, ...layerMemo.split('/')), layerMemo, result);
  }
}

function normalizeStatusField(result, normalize, label) {
  try {
    return normalize();
  } catch (error) {
    addError(result, `invalid ${label}: ${error.message}`);
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

function addOk(result, message) {
  result.checks.push({ status: 'OK', message });
}

function addError(result, message) {
  result.errors.push(message);
  result.checks.push({ status: 'ERROR', message });
}

function printDoctorResult(result) {
  console.log('Niuma Harness doctor');
  console.log(`Harness: ${result.harnessRoot || 'unknown'}`);
  console.log(`Status: ${result.errors.length > 0 ? 'ERROR' : 'OK'}`);

  for (const check of result.checks) {
    console.log(`${check.status} ${check.message}`);
  }
}

module.exports = {
  runDoctor,
  inspectHarness,
  findStatusFile,
  checkHarness,
};
