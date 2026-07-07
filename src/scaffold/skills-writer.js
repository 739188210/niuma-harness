// 根据已规范化的 skills 数组复制对应技能目录；重复 init 时技能目录按本次选择收敛。
const path = require('path');
const { getAvailableSkillDirs, getSkillsRootPath, getSkillTargetRootsForAgent } = require('../skills');
const {
  listFilesRecursive,
  removeDirectory,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function writeSkillFiles(context) {
  const { manifest, options } = context;
  const skillsRootPath = getSkillsRootPath(manifest.skillsRoot);
  const availableSkills = getAvailableSkillDirs(manifest.skillsRoot);
  const cleanupRoots = getSkillTargetRootsForAgent(options.agent);
  const writeRoots = getSkillTargetRootsForAgent(options.agent);

  for (const targetRoot of cleanupRoots) {
    cleanupUnselectedSkillFiles(context, availableSkills, targetRoot);
  }

  for (const targetRoot of writeRoots) {
    for (const skillName of options.skills) {
      writeSkillDirectory(context, skillName, skillsRootPath, targetRoot);
    }
  }
}

function cleanupUnselectedSkillFiles(context, availableSkills, targetRoot) {
  const selected = new Set(context.options.skills);
  for (const skillName of availableSkills) {
    if (!selected.has(skillName)) {
      removeSkillDirectoryFiles(context, targetRoot, skillName);
    }
  }
}

function removeSkillDirectoryFiles(context, targetRoot, skillName) {
  const { options, printAction, workspaceDir } = context;
  const targetPath = safeResolveInside(workspaceDir, path.join(targetRoot, skillName), 'skill target');
  printAction(removeDirectory(targetPath, { dryRun: options.dryRun }), targetPath);
}

function writeSkillDirectory(context, skillName, skillsRootPath, targetRoot) {
  const skillSourceDir = path.join(skillsRootPath, skillName);
  for (const skillFile of listFilesRecursive(skillSourceDir)) {
    writeSkillFile(context, skillFile, skillsRootPath, targetRoot);
  }
}

function writeSkillFile(context, skillFile, skillsRootPath, targetRoot) {
  const { options, printAction, variables, workspaceDir } = context;
  const sourceRelativePath = path.relative(TEMPLATE_DIR, skillFile).split(path.sep).join('/');
  const targetRelativePath = path.relative(skillsRootPath, skillFile).split(path.sep).join('/');
  const targetPath = safeResolveInside(workspaceDir, path.join(targetRoot, targetRelativePath), 'skill target');
  const content = renderTemplate(sourceRelativePath, variables);
  printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite: isManagedSkillFile(targetRelativePath) }), targetPath);
}

function isManagedSkillFile(targetRelativePath) {
  return path.basename(targetRelativePath) !== 'zentao.config.json';
}

module.exports = {
  writeSkillFiles,
};
