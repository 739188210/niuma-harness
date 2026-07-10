// 读取并校验包内 templates/manifest.json，确保模板声明不能越界。
const fs = require('fs');
const path = require('path');
const { safeResolveInside, validateRelativePath } = require('../fs-safe');
const { getAvailableSkillDirs, loadSkillMetadata } = require('../skills');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const MANIFEST_PATH = path.join(TEMPLATE_DIR, 'manifest.json');

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`invalid package manifest at ${MANIFEST_PATH}: ${error.message}`);
  }
}

// 先验证模板清单自身，避免坏 manifest 驱动后续写入。
function validateManifest(manifest) {
  validateDirectories(manifest);
  validateRulesRoot(manifest.rulesRoot);
  validateSkillsRoot(manifest.skillsRoot);
  validateCommandsRoot(manifest.commandsRoot);
  validateTemplateFiles(manifest);
}

function validateDirectories(manifest) {
  for (const directory of manifest.directories || []) {
    validateRelativePath(directory, 'manifest directory');
  }

  for (const directory of manifest.workDirectories || []) {
    validateRelativePath(directory, 'manifest work directory');
  }

  if (manifest.workDirectory) {
    validateRelativePath(manifest.workDirectory, 'manifest work directory');
  }
}

function validateRulesRoot(rulesRoot) {
  if (!rulesRoot) {
    return;
  }

  validateRelativePath(rulesRoot, 'manifest rules root');
  safeResolveInside(TEMPLATE_DIR, rulesRoot, 'manifest rules root');
}

function validateSkillsRoot(skillsRoot) {
  if (!skillsRoot) {
    return;
  }

  validateRelativePath(skillsRoot, 'manifest skills root');
  safeResolveInside(TEMPLATE_DIR, skillsRoot, 'manifest skills root');
  for (const skillName of getAvailableSkillDirs(skillsRoot)) {
    loadSkillMetadata(skillName, skillsRoot);
  }
}

function validateCommandsRoot(commandsRoot) {
  if (!commandsRoot) {
    return;
  }

  validateRelativePath(commandsRoot, 'manifest commands root');
  safeResolveInside(TEMPLATE_DIR, commandsRoot, 'manifest commands root');
}

function validateTemplateFiles(manifest) {
  for (const file of [...(manifest.templateFiles || []), ...(manifest.workTemplateFiles || [])]) {
    validateRelativePath(file.target, 'manifest target');
    validateRelativePath(file.template, 'manifest template');
    safeResolveInside(TEMPLATE_DIR, file.template, 'manifest template');
  }
}

module.exports = {
  TEMPLATE_DIR,
  loadManifest,
  validateManifest,
};
