const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const MANIFEST_PATH = path.join(TEMPLATE_DIR, 'manifest.json');
const STATUS_FILE = 'manifest.json';

function runInit(options) {
  const workspaceDir = path.resolve(options.targetDir || '.');
  const targetDir = options.flat ? workspaceDir : path.join(workspaceDir, options.harnessDir);
  const manifest = loadManifest();
  validateManifest(manifest);

  const variables = {
    ENTRY_FILES: getEntryFilesForAgent(options.agent).join(', '),
    HARNESS_DIR: options.flat ? '.' : options.harnessDir,
  };

  console.log(options.dryRun ? 'DRY RUN: preview scaffold changes' : 'Initializing niuma harness');
  console.log(`Workspace: ${workspaceDir}`);
  console.log(`Target: ${targetDir}`);
  console.log(`Agent: ${options.agent}`);
  console.log(`Rules: ${options.rules}`);

  printAction(ensureDir(targetDir, options.dryRun), targetDir);

  for (const directory of manifest.directories) {
    const targetPath = safeResolveInside(targetDir, directory, 'directory target');
    printAction(ensureDir(targetPath, options.dryRun), targetPath);
  }

  for (const entryFile of getEntryFilesForAgent(options.agent)) {
    const templatePath = entryFile === 'CLAUDE.md' ? 'entry/CLAUDE.md' : 'entry/AGENTS.md';
    const targetPath = safeResolveInside(targetDir, entryFile, 'entry target');
    const content = renderTemplate(templatePath, { ...variables, ENTRY_FILE: entryFile });
    printAction(writeFile(targetPath, content, options), targetPath);
  }

  for (const file of manifest.templateFiles) {
    const targetPath = safeResolveInside(targetDir, file.target, 'template target');
    const content = renderTemplate(file.template, variables);
    printAction(writeFile(targetPath, content, options), targetPath);
  }

  for (const file of manifest.ruleFiles) {
    const targetPath = safeResolveInside(targetDir, file.target, 'rule target');
    const content = options.rules === 'copy' ? renderTemplate(file.template, variables) : '';
    printAction(writeFile(targetPath, content, options), targetPath);
  }

  const statusPath = safeResolveInside(targetDir, STATUS_FILE, 'status target');
  const statusContent = `${JSON.stringify(createStatus(options), null, 2)}\n`;
  printAction(writeFile(statusPath, statusContent, options), statusPath);

  console.log('Done. Start task work from docs/index.md. Read HARNESS_GUIDE.md for harness maintenance.');
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function validateManifest(manifest) {
  for (const directory of manifest.directories || []) {
    validateRelativePath(directory, 'manifest directory');
  }

  for (const file of [...(manifest.templateFiles || []), ...(manifest.ruleFiles || [])]) {
    validateRelativePath(file.target, 'manifest target');
    validateRelativePath(file.template, 'manifest template');
    safeResolveInside(TEMPLATE_DIR, file.template, 'manifest template');
  }
}

function getEntryFilesForAgent(agent) {
  if (agent === 'claude') {
    return ['CLAUDE.md'];
  }

  if (agent === 'codex' || agent === 'opencode') {
    return ['AGENTS.md'];
  }

  if (agent === 'multi') {
    return ['CLAUDE.md', 'AGENTS.md'];
  }

  throw new Error(`Unsupported agent: ${agent}`);
}

function createStatus(options) {
  return {
    schemaVersion: 1,
    agent: options.agent,
    rules: options.rules,
    harnessDir: options.harnessDir,
    flat: Boolean(options.flat),
    entryFiles: getEntryFilesForAgent(options.agent),
    createdBy: 'niuma-harness',
    createdAt: new Date().toISOString(),
  };
}

function readTemplate(relativePath) {
  const templatePath = safeResolveInside(TEMPLATE_DIR, relativePath, 'template path');
  return fs.readFileSync(templatePath, 'utf8');
}

function renderTemplate(relativePath, variables) {
  let content = readTemplate(relativePath);
  for (const [key, value] of Object.entries(variables)) {
    content = content.split(`{{${key}}}`).join(value);
  }
  return content;
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

function safeResolveInside(baseDir, relativePath, label) {
  validateRelativePath(relativePath, label);
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Invalid ${label}: path escapes base directory: ${relativePath}`);
  }
  return resolved;
}

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

function printAction(action, targetPath) {
  const label = {
    create: 'CREATE',
    overwrite: 'OVERWRITE',
    skip: 'SKIP',
  }[action] || action.toUpperCase();

  console.log(`${label.padEnd(9)} ${targetPath}`);
}

module.exports = {
  runInit,
  loadManifest,
  validateManifest,
  getEntryFilesForAgent,
  createStatus,
  renderTemplate,
  ensureDir,
  writeFile,
  safeResolveInside,
  assertNoSymlinkInPath,
};
