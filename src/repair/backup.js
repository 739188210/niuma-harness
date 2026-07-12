const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../artifact-ledger');
const { assertNoSymlinkInPath, safeResolveInside } = require('../fs-safe');
const { inspectNode } = require('./planner');

function createRepairIdentity(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function resolveBackupRoot(state, options, repairId) {
  const parent = options.backupDir
    ? safeResolveInside(state.workspaceDir, options.backupDir, 'backup directory')
    : path.join(state.workspaceDir, '.niuma-harness', 'repairs');
  assertNoSymlinkInPath(parent);
  return path.join(parent, repairId);
}

function createVerifiedBackup(plan, metadata) {
  assertNoSymlinkInPath(plan.backupRoot);
  validateBackupLocation(plan);
  const backupFilesRoot = path.join(plan.backupRoot, 'files');
  if (fs.existsSync(plan.backupRoot)) {
    throw new Error(`Repair backup already exists: ${plan.backupRoot}`);
  }
  fs.mkdirSync(backupFilesRoot, { recursive: true });
  const entries = [];
  for (const operation of plan.operations.filter((item) => item.requiresBackup)) {
    const backupPath = path.join(backupFilesRoot, ...operation.relativePath.split('/'));
    copyNodeNoFollow(operation.targetPath, backupPath);
    verifyNodeCopy(operation.targetPath, backupPath);
    entries.push({
      action: operation.action,
      backup: path.relative(plan.backupRoot, backupPath).split(path.sep).join('/'),
      digest: operation.observed.digest || null,
      linkTarget: operation.observed.linkTarget || null,
      source: operation.relativePath,
      type: operation.observed.type,
      verified: true,
    });
  }
  const repairManifest = {
    schemaVersion: 1,
    createdBy: 'niuma-harness',
    createdAt: metadata.createdAt,
    harnessDir: plan.state.harnessDir,
    repairId: metadata.repairId,
    selections: plan.selections,
    workspace: plan.state.workspaceDir,
    entries,
    verified: true,
  };
  fs.writeFileSync(path.join(plan.backupRoot, 'repair-manifest.json'), `${JSON.stringify(repairManifest, null, 2)}\n`, 'utf8');
  return repairManifest;
}

function validateBackupLocation(plan) {
  const backup = path.resolve(plan.backupRoot);
  for (const operation of plan.operations) {
    const target = path.resolve(operation.targetPath);
    if (backup === target || backup.startsWith(`${target}${path.sep}`)) {
      throw new Error(`Repair backup directory overlaps affected target: ${operation.relativePath}`);
    }
  }
}

function copyNodeNoFollow(source, destination) {
  const stat = fs.lstatSync(source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (stat.isSymbolicLink()) {
    fs.symlinkSync(fs.readlinkSync(source), destination, process.platform === 'win32' ? inferWindowsLinkType(source) : undefined);
    return;
  }
  if (stat.isFile()) {
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, stat.mode);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { mode: stat.mode });
    fs.chmodSync(destination, stat.mode);
    for (const name of fs.readdirSync(source).sort()) {
      copyNodeNoFollow(path.join(source, name), path.join(destination, name));
    }
    return;
  }
  throw new Error(`Unsupported node type for backup: ${source}`);
}

function verifyNodeCopy(source, destination) {
  const left = fs.lstatSync(source);
  const right = fs.lstatSync(destination);
  if (left.isSymbolicLink()) {
    if (!right.isSymbolicLink() || fs.readlinkSync(source) !== fs.readlinkSync(destination)) {
      throw new Error(`Symlink backup verification failed: ${source}`);
    }
    return;
  }
  if (left.isFile()) {
    if (!right.isFile() || digestBytes(fs.readFileSync(source)) !== digestBytes(fs.readFileSync(destination))) {
      throw new Error(`File backup verification failed: ${source}`);
    }
    if ((left.mode & 0o7777) !== (right.mode & 0o7777)) {
      throw new Error(`File mode verification failed: ${source}`);
    }
    return;
  }
  if (left.isDirectory()) {
    if (!right.isDirectory()) throw new Error(`Directory backup verification failed: ${source}`);
    if ((left.mode & 0o7777) !== (right.mode & 0o7777)) {
      throw new Error(`Directory mode verification failed: ${source}`);
    }
    const leftNames = fs.readdirSync(source).sort();
    const rightNames = fs.readdirSync(destination).sort();
    if (JSON.stringify(leftNames) !== JSON.stringify(rightNames)) throw new Error(`Directory backup verification failed: ${source}`);
    for (const name of leftNames) verifyNodeCopy(path.join(source, name), path.join(destination, name));
    return;
  }
  throw new Error(`Unsupported node type for verification: ${source}`);
}

function revalidateOperations(plan) {
  for (const operation of plan.operations) {
    const current = inspectNode(operation.targetPath);
    if (operation.observed.type === 'missing' && (current.type === 'missing' || current.type === 'blocked')) {
      continue;
    }
    if (JSON.stringify(current) !== JSON.stringify(operation.observed)) {
      throw new Error(`Repair target changed after planning: ${operation.relativePath}`);
    }
  }
}

function inferWindowsLinkType(source) {
  try { return fs.statSync(source).isDirectory() ? 'junction' : 'file'; } catch { return 'file'; }
}

module.exports = {
  copyNodeNoFollow,
  createRepairIdentity,
  createVerifiedBackup,
  resolveBackupRoot,
  revalidateOperations,
  verifyNodeCopy,
};
