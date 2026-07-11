// 所有写入路径都经过这里，集中处理路径包含和 symlink 防护。
const fs = require('fs');
const path = require('path');

function canonicalizeWorkspacePath(targetPath) {
  const resolved = path.resolve(targetPath || '.');
  const missingSegments = [];
  let current = resolved;
  let stat;

  while (true) {
    try {
      stat = fs.lstatSync(current);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        throw error;
      }
      missingSegments.unshift(path.basename(current));
      current = parent;
    }
  }

  if (missingSegments.length > 0 && !stat.isDirectory() && !stat.isSymbolicLink()) {
    throw new Error(`Parent path exists but is not a directory: ${current}`);
  }

  const realpath = fs.realpathSync.native || fs.realpathSync;
  const canonicalAncestor = realpath(current);
  if (missingSegments.length === 0) {
    return canonicalAncestor;
  }

  if (!fs.statSync(canonicalAncestor).isDirectory()) {
    throw new Error(`Parent path exists but is not a directory: ${current}`);
  }
  return path.join(canonicalAncestor, ...missingSegments);
}

function validateRelativePath(relativePath, label) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error(`Invalid ${label}: path must be a non-empty string.`);
  }

  if (path.isAbsolute(relativePath)) {
    throw new Error(`Invalid ${label}: absolute paths are not allowed: ${relativePath}`);
  }

  const segments = relativePath.split(/[\\/]+/);
  if (segments.includes('..') || segments.includes('')) {
    throw new Error(`Invalid ${label}: path must stay inside the scaffold: ${relativePath}`);
  }
}

// 把 manifest 或用户输入的相对路径限制在指定根目录内。
function safeResolveInside(baseDir, relativePath, label) {
  validateRelativePath(relativePath, label);
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Invalid ${label}: path escapes base directory: ${relativePath}`);
  }
  return resolved;
}

// 写入前逐级拒绝 symlink，避免通过链接把文件写到 workspace 外。
function assertNoSymlinkInPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root;
  const relative = path.relative(root, resolved);
  const parts = relative ? relative.split(path.sep) : [];
  let current = root;

  for (const part of parts) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlink: ${current}`);
    }
  }
}

function listFilesRecursive(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function inspectParentDirectories(targetPath) {
  const resolved = path.resolve(targetPath);
  const root = path.parse(resolved).root;
  const parts = path.relative(root, path.dirname(resolved)).split(path.sep).filter(Boolean);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      continue;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlink: ${current}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`Parent path exists but is not a directory: ${current}`);
    }
  }
}

function inspectFileTarget(filePath) {
  inspectParentDirectories(filePath);
  assertNoSymlinkInPath(filePath);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  if (!fs.lstatSync(filePath).isFile()) {
    throw new Error(`Path exists but is not a regular file: ${filePath}`);
  }
  return true;
}

function inspectDirectoryTarget(dirPath) {
  inspectParentDirectories(dirPath);
  assertNoSymlinkInPath(dirPath);
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  if (!fs.lstatSync(dirPath).isDirectory()) {
    throw new Error(`Path exists but is not a directory: ${dirPath}`);
  }
  return true;
}

function ensureDir(dirPath, dryRun) {
  if (inspectDirectoryTarget(dirPath)) {
    return 'skip';
  }

  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return 'create';
}

// 所有 scaffold 文件写入都走这里，统一处理 skip/overwrite/dry-run。
// 调用方决定是否覆盖：tool-managed 传 overwrite=true，user-maintained 传 false（已存在则保留）。
function writeFile(filePath, content, writeOptions = {}) {
  const { dryRun = false, overwrite = false } = writeOptions;
  const exists = inspectFileTarget(filePath);
  if (exists && !overwrite) {
    return 'skip';
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  if (exists && overwrite) {
    return 'overwrite';
  }
  return 'create';
}

// 只删除 scaffold 已知的普通文件，避免跟随 symlink 或误删目录。
function removeFile(filePath, options) {
  assertNoSymlinkInPath(filePath);

  if (!fs.existsSync(filePath)) {
    return 'skip';
  }

  const stat = fs.lstatSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Path exists but is not a regular file: ${filePath}`);
  }

  if (!options.dryRun) {
    fs.unlinkSync(filePath);
  }

  return 'remove';
}

// 删除已知 scaffold 目录，用于让可再生目录按 manifest/参数收敛。
function removeDirectory(dirPath, options) {
  assertNoSymlinkInPath(dirPath);

  if (!fs.existsSync(dirPath)) {
    return 'skip';
  }

  const stat = fs.lstatSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`Path exists but is not a directory: ${dirPath}`);
  }

  if (!options.dryRun) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }

  return 'remove';
}

// 清理删除文件后留下的空目录，但不会越过传入的 stopDir。
function removeEmptyDirsUntil(dirPath, stopDir, dryRun) {
  const resolvedDir = path.resolve(dirPath);
  const resolvedStop = path.resolve(stopDir);
  if (resolvedDir === resolvedStop || !resolvedDir.startsWith(`${resolvedStop}${path.sep}`)) {
    return;
  }

  assertNoSymlinkInPath(resolvedDir);
  if (!fs.existsSync(resolvedDir)) {
    return;
  }

  const stat = fs.lstatSync(resolvedDir);
  if (!stat.isDirectory() || fs.readdirSync(resolvedDir).length > 0) {
    return;
  }

  if (!dryRun) {
    fs.rmdirSync(resolvedDir);
  }

  removeEmptyDirsUntil(path.dirname(resolvedDir), resolvedStop, dryRun);
}

module.exports = {
  canonicalizeWorkspacePath,
  validateRelativePath,
  safeResolveInside,
  assertNoSymlinkInPath,
  inspectFileTarget,
  inspectDirectoryTarget,
  listFilesRecursive,
  ensureDir,
  writeFile,
  removeFile,
  removeDirectory,
  removeEmptyDirsUntil,
};
