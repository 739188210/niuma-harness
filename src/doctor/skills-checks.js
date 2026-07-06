// 按 manifest.skills 声明校验已选择的技能包文件是否完整。
const path = require('path');
const { getAvailableSkillDirs, getSkillTargetRootsForAgent, getSkillsRootPath } = require('../skills');
const { listFilesRecursive } = require('../fs-safe');
const { checkDirectory, checkRegularFile } = require('./core-checks');

function getAvailableSkills(skillsRoot) {
  return getAvailableSkillDirs(skillsRoot);
}

function checkSkillFiles(context) {
  const { agent, result, skills, templateManifest, workspaceRoot } = context;
  if (!agent || !skills) {
    return;
  }

  const skillsRootPath = getSkillsRootPath(templateManifest.skillsRoot);
  const targetRoots = getSkillTargetRootsForAgent(agent);

  for (const targetRoot of targetRoots) {
    for (const skillName of skills) {
      checkSkillDirectory(workspaceRoot, result, skillsRootPath, targetRoot, skillName);
    }
  }
}

function checkSkillDirectory(workspaceRoot, result, skillsRootPath, targetRoot, skillName) {
  const sourceDir = path.join(skillsRootPath, skillName);
  const targetDir = path.join(workspaceRoot, ...targetRoot.split('/'), skillName);
  const targetLabel = `${targetRoot}/${skillName}/`;
  checkDirectory(targetDir, targetLabel, result);

  for (const sourceFile of listFilesRecursive(sourceDir)) {
    checkSkillFile(workspaceRoot, result, sourceDir, sourceFile, targetRoot, skillName);
  }
}

function checkSkillFile(workspaceRoot, result, sourceDir, sourceFile, targetRoot, skillName) {
  const relativePath = path.relative(sourceDir, sourceFile).split(path.sep).join('/');
  const label = `${targetRoot}/${skillName}/${relativePath}`;
  checkRegularFile(path.join(workspaceRoot, ...targetRoot.split('/'), skillName, ...relativePath.split('/')), label, result);
}

module.exports = {
  getAvailableSkills,
  checkSkillFiles,
};
