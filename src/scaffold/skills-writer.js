// 根据已规范化的 skills 数组复制对应技能目录；重复 init 时技能目录按本次选择收敛。
const path = require('path');
const {
  getAvailableSkillDirs,
  getSkillFiles,
  getSkillsRootPath,
  getSkillTargetRootsForAgent,
} = require('../skills');
const {
  removeEmptyDirsUntil,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function writeSkillFiles(context) {
  const { manifest, options } = context;
  const skillsRootPath = getSkillsRootPath(manifest.skillsRoot);
  const availableSkills = getAvailableSkillDirs(manifest.skillsRoot);
  const getCachedSkillFiles = createSkillFilesCache(manifest.skillsRoot);
  const targetRoots = getSkillTargetRootsForAgent(options.agent);

  for (const targetRoot of targetRoots) {
    cleanupUnselectedSkillFiles(context, availableSkills, getCachedSkillFiles, targetRoot);
  }

  for (const targetRoot of targetRoots) {
    for (const skillName of options.skills) {
      writeSkillDirectory(context, skillName, getCachedSkillFiles(skillName), skillsRootPath, targetRoot);
    }
  }
}

function createSkillFilesCache(skillsRoot) {
  const cache = new Map();
  return (skillName) => {
    if (!cache.has(skillName)) {
      cache.set(skillName, getSkillFiles(skillName, skillsRoot));
    }
    return cache.get(skillName);
  };
}

function cleanupUnselectedSkillFiles(context, availableSkills, getCachedSkillFiles, targetRoot) {
  const selected = new Set(context.options.skills);
  for (const skillName of availableSkills) {
    if (!selected.has(skillName)) {
      removeSkillDirectoryFiles(context, targetRoot, skillName, getCachedSkillFiles(skillName));
    }
  }
}

function removeSkillDirectoryFiles(context, targetRoot, skillName, skillFiles) {
  const { options, printAction, workspaceDir } = context;
  const targetSkillDir = safeResolveInside(workspaceDir, path.join(targetRoot, skillName), 'skill target');

  for (const skillFile of skillFiles) {
    if (skillFile.ownership !== 'tool') {
      continue;
    }
    const targetRelativePath = path.join(skillName, skillFile.relativePath);
    const targetPath = safeResolveInside(workspaceDir, path.join(targetRoot, targetRelativePath), 'skill target');
    printAction(removeFile(targetPath, { dryRun: options.dryRun }), targetPath);
    removeEmptyDirsUntil(path.dirname(targetPath), targetSkillDir, options.dryRun);
  }
  removeEmptyDirsUntil(targetSkillDir, path.join(workspaceDir, targetRoot), options.dryRun);
}

function writeSkillDirectory(context, skillName, skillFiles, skillsRootPath, targetRoot) {
  for (const skillFile of skillFiles) {
    writeSkillFile(context, skillName, skillFile, skillsRootPath, targetRoot);
  }
}

function writeSkillFile(context, skillName, skillFile, skillsRootPath, targetRoot) {
  const { options, printAction, variables, workspaceDir } = context;
  const sourceRelativePath = path.relative(TEMPLATE_DIR, skillFile.sourcePath).split(path.sep).join('/');
  const targetRelativePath = path.join(skillName, skillFile.relativePath);
  const targetPath = safeResolveInside(workspaceDir, path.join(targetRoot, targetRelativePath), 'skill target');
  const content = renderTemplate(sourceRelativePath, variables);
  printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite: skillFile.ownership === 'tool' }), targetPath);
}

module.exports = {
  writeSkillFiles,
};
