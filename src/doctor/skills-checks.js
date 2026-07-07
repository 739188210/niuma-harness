// 按 manifest.skills 声明校验已选择的技能包文件是否完整。
const fs = require('fs');
const path = require('path');
const { getAvailableSkillDirs, getSkillTargetRootsForAgent, getSkillsRootPath } = require('../skills');
const { listFilesRecursive } = require('../fs-safe');
const { parseMarkdownFrontmatter } = require('../frontmatter');
const { checkDirectory, checkRegularFile } = require('./core-checks');
const { addError, addOk } = require('./result');

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
  const targetPath = path.join(workspaceRoot, ...targetRoot.split('/'), skillName, ...relativePath.split('/'));
  checkRegularFile(targetPath, label, result);

  if (relativePath === 'SKILL.md' && isRegularFile(targetPath)) {
    checkSkillMetadata(targetPath, label, skillName, result);
  }
}

function isRegularFile(filePath) {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
}

function checkSkillMetadata(filePath, label, skillName, result) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseMarkdownFrontmatter(content);
  if (!parsed) {
    addError(result, `missing frontmatter in ${label}`);
    return;
  }

  const name = parsed.fields.name || '';
  const description = parsed.fields.description || '';
  if (!name) {
    addError(result, `missing name in ${label} frontmatter`);
  } else if (name !== skillName) {
    addError(result, `name mismatch in ${label} frontmatter: expected ${skillName}, got ${name}`);
  }

  if (!description) {
    addError(result, `missing description in ${label} frontmatter`);
  }

  if (!parsed.body.trim()) {
    addError(result, `empty body in ${label}`);
  }

  if (name === skillName && description && parsed.body.trim()) {
    addOk(result, `${label} metadata`);
  }
}


module.exports = {
  getAvailableSkills,
  checkSkillFiles,
};
