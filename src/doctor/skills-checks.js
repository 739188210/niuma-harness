// 按 manifest.skills 声明校验已选择的技能包文件是否完整。
const path = require('path');
const {
  getAvailableSkillDirs,
  getSkillFiles,
  getSkillTargetRootsForAgent,
} = require('../skills');
const { checkDirectory, checkRegularFile } = require('./core-checks');
const { checkMarkdownMetadata, isRegularFile } = require('./markdown-checks');

function getAvailableSkills(skillsRoot) {
  return getAvailableSkillDirs(skillsRoot);
}

function checkSkillFiles(context) {
  const { agent, result, skills, templateManifest, workspaceRoot } = context;
  if (!agent || !skills) {
    return;
  }

  const targetRoots = getSkillTargetRootsForAgent(agent);
  const getCachedSkillFiles = createSkillFilesCache(templateManifest.skillsRoot);

  for (const targetRoot of targetRoots) {
    for (const skillName of skills) {
      checkSkillDirectory(workspaceRoot, result, getCachedSkillFiles, targetRoot, skillName);
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

function checkSkillDirectory(workspaceRoot, result, getCachedSkillFiles, targetRoot, skillName) {
  const targetDir = path.join(workspaceRoot, ...targetRoot.split('/'), skillName);
  const targetLabel = `${targetRoot}/${skillName}/`;
  checkDirectory(targetDir, targetLabel, result);

  for (const skillFile of getCachedSkillFiles(skillName)) {
    checkSkillFile(workspaceRoot, result, skillFile.relativePath, targetRoot, skillName);
  }
}

function checkSkillFile(workspaceRoot, result, relativePath, targetRoot, skillName) {
  const label = `${targetRoot}/${skillName}/${relativePath}`;
  const targetPath = path.join(workspaceRoot, ...targetRoot.split('/'), skillName, ...relativePath.split('/'));
  checkRegularFile(targetPath, label, result);

  if (relativePath === 'SKILL.md' && isRegularFile(targetPath)) {
    checkMarkdownMetadata(targetPath, label, skillName, result);
  }
}

module.exports = {
  getAvailableSkills,
  checkSkillFiles,
};
