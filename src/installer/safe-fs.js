const fs = require('fs');
const path = require('path');

const NO_FOLLOW = fs.constants.O_NOFOLLOW;
const OPEN_RACE_CODES = new Set(['EEXIST', 'ELOOP', 'ENOENT', 'ENOTDIR']);

function writeRegularFileNoFollow({ workspaceDir, filePath, content, mode, label, beforeOpen, afterWrite }) {
  if (!NO_FOLLOW) throw new Error(`O_NOFOLLOW is unavailable; refusing ${label}`);
  const parents = prepareSafeParents(workspaceDir, filePath, label);
  assertExpectedLeaf(filePath, mode, label);
  if (beforeOpen) beforeOpen({ filePath, parents });
  verifySafeParents(parents, label);

  let fd;
  try {
    fd = fs.openSync(filePath, getWriteFlags(mode), 0o600);
  } catch (error) {
    throw invalidPathRace(label, filePath, error);
  }

  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error(`Refusing non-regular ${label}: ${filePath}`);
    fs.writeFileSync(fd, content, 'utf8');
    if (afterWrite) afterWrite({ filePath, fd, stat });
    return { dev: stat.dev, ino: stat.ino };
  } finally {
    fs.closeSync(fd);
  }
}

function readRegularFileNoFollow({ workspaceDir, filePath, label, beforeRead }) {
  if (!NO_FOLLOW) throw new Error(`O_NOFOLLOW is unavailable; refusing ${label}`);
  const parents = prepareSafeParents(workspaceDir, filePath, label, { createParents: false });
  assertExpectedLeaf(filePath, 'read', label);
  if (beforeRead) beforeRead({ filePath, parents });
  verifySafeParents(parents, label);

  let fd;
  try {
    fd = fs.openSync(filePath, fs.constants.O_RDONLY | NO_FOLLOW);
  } catch (error) {
    throw invalidPathRace(label, filePath, error);
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error(`Expected regular file for ${label}: ${filePath}`);
    const bytes = fs.readFileSync(fd);
    verifySafeParents(parents, label);
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function prepareSafeParents(workspaceDir, filePath, label, options = {}) {
  const { createParents = true } = options;
  const workspace = path.resolve(workspaceDir);
  const target = path.resolve(filePath);
  const relative = path.relative(workspace, path.dirname(target));
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`${label} escapes workspace: ${filePath}`);
  }

  const parents = [{ path: workspace, identity: directoryIdentity(workspace, label) }];
  let current = workspace;
  for (const segment of relative ? relative.split(path.sep) : []) {
    current = path.join(current, segment);
    let stat = tryLstat(current);
    if (!stat) {
      if (!createParents) throw new Error(`Missing parent for ${label}: ${current}`);
      try {
        fs.mkdirSync(current);
      } catch (error) {
        if (error.code !== 'EEXIST') throw invalidPathRace(label, current, error);
      }
      stat = tryLstat(current);
    }
    if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Refusing ${label} through unsafe parent: ${current}`);
    }
    parents.push({ path: current, identity: identity(stat) });
  }
  return parents;
}

function verifySafeParents(parents, label) {
  for (const parent of parents) {
    const stat = tryLstat(parent.path);
    if (!stat || stat.isSymbolicLink() || !stat.isDirectory() || !sameIdentity(identity(stat), parent.identity)) {
      throw new Error(`${label} parent path changed; refusing race-invalid operation: ${parent.path}`);
    }
  }
}

function assertExpectedLeaf(filePath, mode, label) {
  const stat = tryLstat(filePath);
  if (mode === 'create') {
    if (stat) throw new Error(`${label} changed; refusing race-invalid create: ${filePath}`);
    return;
  }
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`Refusing unsafe ${label} leaf: ${filePath}`);
  }
}

function removeCreatedFileNoFollow({ workspaceDir, filePath, identity: expectedIdentity, label }) {
  const parents = prepareSafeParents(workspaceDir, filePath, label, { createParents: false });
  verifySafeParents(parents, label);
  const stat = tryLstat(filePath);
  if (!stat) return;
  if (!stat.isFile() || stat.isSymbolicLink() || !sameIdentity(identity(stat), expectedIdentity)) {
    throw new Error(`Refusing to remove changed ${label}: ${filePath}`);
  }
  fs.unlinkSync(filePath);
}

function getWriteFlags(mode) {
  if (mode === 'create') return fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | NO_FOLLOW;
  if (mode === 'overwrite') return fs.constants.O_WRONLY | fs.constants.O_TRUNC | NO_FOLLOW;
  throw new Error(`Unknown no-follow write mode: ${mode}`);
}

function invalidPathRace(label, filePath, error) {
  const code = error && error.code;
  const suffix = code ? ` (${code})` : '';
  const prefix = OPEN_RACE_CODES.has(code) ? `${label} race invalid` : `${label} open failed`;
  return new Error(`${prefix}: ${filePath}${suffix}`, { cause: error });
}

function directoryIdentity(directoryPath, label) {
  const stat = tryLstat(directoryPath);
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Refusing unsafe ${label} workspace parent: ${directoryPath}`);
  }
  return identity(stat);
}

function identity(stat) {
  return { dev: stat.dev, ino: stat.ino };
}

function sameIdentity(left, right) {
  return left && right && left.dev === right.dev && left.ino === right.ino;
}

function tryLstat(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

module.exports = {
  readRegularFileNoFollow,
  removeCreatedFileNoFollow,
  writeRegularFileNoFollow,
};
