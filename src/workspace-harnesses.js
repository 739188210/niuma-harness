// 发现 workspace 直接子目录中的 Niuma harness；不跟随 sibling symlink。
const fs = require('fs');
const path = require('path');

const DAMAGED_HARNESS_MARKERS = [
  {
    fragments: ['# Niuma Harness Guide', 'stable 7-layer operating context'],
    relativePath: 'HARNESS_GUIDE.md',
  },
  {
    fragments: ['# Harness Runtime Index', '## 7-layer harness model'],
    relativePath: 'docs/index.md',
  },
  {
    fragments: ['# Loop Runtime Layer Memo', 'agent-work/tasks/<task-name>/status.md'],
    relativePath: 'docs/layers/07-loop.md',
  },
  {
    fragments: ['# Action Boundary Policy', '## Autonomous actions'],
    relativePath: 'docs/policy/action-boundary.md',
  },
];

function scanWorkspaceHarnesses(workspaceDir, options = {}) {
  if (!fs.existsSync(workspaceDir) || !fs.lstatSync(workspaceDir).isDirectory()) {
    return [];
  }

  const candidates = [];
  for (const entry of fs.readdirSync(workspaceDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }
    const candidate = inspectHarnessCandidate(workspaceDir, entry.name, options);
    if (candidate) {
      candidates.push(candidate);
    }
  }
  return candidates.sort((left, right) => left.directoryName.localeCompare(right.directoryName));
}

function inspectHarnessCandidate(workspaceDir, directoryName, options = {}) {
  const directoryPath = path.join(workspaceDir, directoryName);
  const manifestPath = path.join(directoryPath, 'manifest.json');
  if (!isRegularFileWithoutSymlink(manifestPath)) {
    return options.includeMissingManifest && hasDamagedHarnessStructure(directoryPath)
      ? { damaged: true, directoryName, directoryPath, manifestPath }
      : null;
  }

  let status;
  try {
    status = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return hasDamagedHarnessStructure(directoryPath)
      ? { damaged: true, directoryName, directoryPath, manifestPath }
      : null;
  }

  if (status && !Array.isArray(status) && typeof status === 'object'
      && status.createdBy === 'niuma-harness') {
    return { damaged: false, directoryName, directoryPath, manifestPath };
  }
  return hasDamagedHarnessStructure(directoryPath)
    ? { damaged: true, directoryName, directoryPath, manifestPath }
    : null;
}

function hasDamagedHarnessStructure(directoryPath) {
  return DAMAGED_HARNESS_MARKERS.every(({ fragments, relativePath }) => {
    if (!isRegularFileInsideWithoutSymlink(directoryPath, relativePath)) return false;
    const content = fs.readFileSync(path.join(directoryPath, ...relativePath.split('/')), 'utf8');
    return fragments.every((fragment) => content.includes(fragment));
  });
}

function isRegularFileInsideWithoutSymlink(baseDir, relativePath) {
  let current = baseDir;
  for (const segment of relativePath.split('/')) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      return false;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      return false;
    }
  }
  return fs.lstatSync(current).isFile();
}

function isRegularFileWithoutSymlink(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stat = fs.lstatSync(filePath);
  return !stat.isSymbolicLink() && stat.isFile();
}

function findCompetingHarnesses(workspaceDir, requestedHarnessDir) {
  return scanWorkspaceHarnesses(workspaceDir)
    .filter((candidate) => !sameDirectoryName(candidate.directoryName, requestedHarnessDir));
}

function sameDirectoryName(left, right) {
  if (process.platform !== 'win32') {
    return left === right;
  }
  return left.toLowerCase().replace(/[.]+$/u, '')
    === right.toLowerCase().replace(/[.]+$/u, '');
}

function formatCompetingHarnessError(workspaceDir, requestedHarnessDir, conflicts) {
  const entries = conflicts
    .map((candidate) => `- ${candidate.directoryName}${candidate.damaged ? ' (owned manifest has invalid JSON)' : ''}`)
    .join('\n');
  return `competing Niuma harnesses found in workspace ${workspaceDir}:\n${entries}\nRequested --harness-dir "${requestedHarnessDir}" is only for first-time naming or same-name re-init; it does not migrate an existing harness. Resolve the duplicate directories explicitly, then retry.`;
}

module.exports = {
  findCompetingHarnesses,
  formatCompetingHarnessError,
  hasDamagedHarnessStructure,
  scanWorkspaceHarnesses,
};
