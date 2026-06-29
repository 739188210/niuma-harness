// 所有写入路径都经过这里，集中处理路径包含和 symlink 防护。
const fs = require('fs');
const path = require('path');

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

function ensureDir(dirPath, dryRun) {
  assertNoSymlinkInPath(dirPath);

  if (fs.existsSync(dirPath)) {
    const stat = fs.lstatSync(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
    return 'skip';
  }

  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return 'create';
}

// 所有 scaffold 文件写入都走这里，统一处理 skip/overwrite/dry-run。
function writeFile(filePath, content, options) {
  assertNoSymlinkInPath(filePath);

  const exists = fs.existsSync(filePath);
  if (exists && !options.force) {
    return 'skip';
  }

  if (exists) {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile()) {
      throw new Error(`Path exists but is not a regular file: ${filePath}`);
    }
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  if (exists && options.force) {
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
  validateRelativePath,
  safeResolveInside,
  assertNoSymlinkInPath,
  listFilesRecursive,
  ensureDir,
  writeFile,
  removeFile,
  removeEmptyDirsUntil,
};
