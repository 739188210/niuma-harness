const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../infrastructure/content-digest');
const { safeResolveInside } = require('../infrastructure/fs-safe');
const { readRegularFileNoFollow, writeRegularFileNoFollow } = require('./safe-fs');

function createAssetInstallBackup({ workspaceDir, conflicts, now = new Date(), dependencies = {} }) {
  const conflictItems = getConflicts(conflicts);
  const backupParent = safeResolveInside(workspaceDir, '.niuma-harness/asset-installs', 'asset install backup directory');
  const backupRoot = createBackupRoot(workspaceDir, backupParent, now);
  const originalBytes = new Map();

  try {
    ensureBackupDirectory(workspaceDir, backupParent, 'asset install backup directory');
    ensureBackupDirectory(workspaceDir, backupRoot, 'asset install backup root');
    for (const item of conflictItems) {
      const sourcePath = resolveWorkspaceTarget(workspaceDir, item.target);
      const sourceBytes = readRegularFileNoFollow({ workspaceDir, filePath: sourcePath, label: `conflict target ${item.target}` });
      if (item.observedDigest && digestBytes(sourceBytes) !== item.observedDigest) {
        throw new Error(`Asset install target changed since planning: ${item.target}`);
      }
      originalBytes.set(item.target, Buffer.from(sourceBytes));
      const backupPath = safeResolveInside(backupRoot, item.target, 'asset install backup target');
      writeRegularFileNoFollow({
        workspaceDir,
        filePath: backupPath,
        content: sourceBytes,
        mode: 'create',
        label: `asset install backup ${item.target}`,
        beforeOpen: dependencies.beforeBackupWrite && (({ filePath }) => dependencies.beforeBackupWrite({ backupPath: filePath, item })),
      });
    }
  } catch (error) {
    fs.rmSync(backupRoot, { recursive: true, force: true });
    throw error;
  }

  return { backupRoot, originalBytes };
}

function verifyAssetInstallBackup({ workspaceDir, backupRoot, conflicts, originalBytes, dependencies = {} }) {
  const resolvedWorkspaceDir = workspaceDir || workspaceFromBackupRoot(backupRoot);
  for (const item of getConflicts(conflicts)) {
    const backupPath = safeResolveInside(backupRoot, item.target, 'asset install backup target');
    const backupBytes = readBackupBytes({
      workspaceDir: resolvedWorkspaceDir,
      backupRoot,
      backupPath,
      item,
      dependencies,
    });
    const expectedBytes = originalBytes && originalBytes.get(item.target);
    const sourceBytes = expectedBytes || readRegularFileNoFollow({
      workspaceDir: resolvedWorkspaceDir,
      filePath: resolveWorkspaceTarget(resolvedWorkspaceDir, item.target),
      label: `conflict target ${item.target}`,
    });
    if (!backupBytes.equals(sourceBytes)) {
      throw new Error(`Asset install backup verification failed: ${item.target}`);
    }
  }
}

function restoreAssetInstallBackup({ workspaceDir, backupRoot, conflicts, originalBytes, dependencies = {} }) {
  const failures = [];
  for (const item of getConflicts(conflicts)) {
    try {
      const backupPath = safeResolveInside(backupRoot, item.target, 'asset install backup target');
          const backupBytes = readBackupBytes({ workspaceDir, backupRoot, backupPath, item, dependencies, purpose: 'restore' });
      const memoryBytes = originalBytes && originalBytes.get(item.target);
      if (memoryBytes && !backupBytes.equals(memoryBytes)) {
        throw new Error(`Asset install backup verification failed before restore: ${item.target}`);
      }
      const targetPath = resolveWorkspaceTarget(workspaceDir, item.target);
      writeRegularFileNoFollow({
        workspaceDir,
        filePath: targetPath,
        content: memoryBytes || backupBytes,
        mode: 'overwrite',
        label: `asset install rollback target ${item.target}`,
      });
    } catch (error) {
      failures.push({ target: item.target, message: error.message, error });
    }
  }
  return { failures };
}

function readBackupBytes({ workspaceDir, backupRoot, backupPath, item, dependencies, purpose = 'verify' }) {
  assertBackupPathInsideWorkspace(workspaceDir, backupRoot);
  const hook = purpose === 'restore' ? dependencies.beforeBackupRestore || dependencies.beforeBackupRead : dependencies.beforeBackupRead;
  const beforeRead = hook
    && (({ filePath }) => hook({ backupPath: filePath, backupRoot, item, purpose }));
  return readRegularFileNoFollow({
    workspaceDir,
    filePath: backupPath,
    label: `asset install backup ${item.target}`,
    beforeRead,
  });
}

function ensureBackupDirectory(workspaceDir, directoryPath, label) {
  const relative = path.relative(path.resolve(workspaceDir), path.resolve(directoryPath));
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) throw new Error(`${label} escapes workspace: ${directoryPath}`);
  let current = path.resolve(workspaceDir);
  for (const segment of relative ? relative.split(path.sep) : []) {
    current = path.join(current, segment);
    const stat = tryLstat(current);
    if (!stat) {
      fs.mkdirSync(current);
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Refusing ${label} through unsafe path: ${current}`);
  }
}

function createBackupRoot(workspaceDir, backupParent, now) {
  const timestamp = new Date(now).toISOString().replace(/[:.]/g, '-');
  let suffix = 0;
  while (true) {
    const name = suffix === 0 ? timestamp : `${timestamp}-${suffix}`;
    const candidate = safeResolveInside(backupParent, name, 'asset install backup root');
    if (!tryLstat(candidate)) return candidate;
    suffix += 1;
  }
}

function resolveWorkspaceTarget(workspaceDir, target) {
  return safeResolveInside(workspaceDir, target, 'asset install target');
}

function assertBackupPathInsideWorkspace(workspaceDir, backupRoot) {
  const workspace = path.resolve(workspaceDir);
  const root = path.resolve(backupRoot);
  if (root === workspace || !root.startsWith(`${workspace}${path.sep}`)) {
    throw new Error(`Asset install backup escapes workspace: ${backupRoot}`);
  }
}

function workspaceFromBackupRoot(backupRoot) {
  return path.dirname(path.dirname(path.dirname(backupRoot)));
}

function getConflicts(items) {
  return items.filter((item) => item.status === 'CONFLICT').sort((left, right) => left.target.localeCompare(right.target));
}

function tryLstat(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

module.exports = {
  createAssetInstallBackup,
  verifyAssetInstallBackup,
  restoreAssetInstallBackup,
};
