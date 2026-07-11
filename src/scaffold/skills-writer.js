// 根据已规范化的 skills 数组复制对应技能目录；重复 init 时技能目录按本次选择收敛。
const path = require('path');
const {
  getAvailableSkillDirs,
  getSkillFiles,
  getSkillTargetRootsForAgent,
} = require('../skills');
const {
  inspectFileTarget,
  removeEmptyDirsUntil,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function prepareSkillPlan(context) {
  const availableSkills = getAvailableSkillDirs(context.manifest.skillsRoot);
  const selected = new Set(context.options.skills);
  const filesBySkill = new Map(availableSkills.map((name) => [name, getSkillFiles(name, context.manifest.skillsRoot)]));
  const plan = [];

  for (const targetRoot of getSkillTargetRootsForAgent(context.options.agent)) {
    for (const skillName of availableSkills) {
      const skillFiles = filesBySkill.get(skillName);
      const targetSkillDir = safeResolveInside(context.workspaceDir, path.join(targetRoot, skillName), 'skill target');
      for (const skillFile of skillFiles) {
        const targetPath = safeResolveInside(context.workspaceDir, path.join(targetRoot, skillName, skillFile.relativePath), 'skill target');
        const exists = inspectFileTarget(targetPath);
        if (!selected.has(skillName)) {
          plan.push({ kind: 'remove', targetPath, targetSkillDir, targetRoot: path.join(context.workspaceDir, targetRoot) });
          continue;
        }
        const sourceRelativePath = path.relative(TEMPLATE_DIR, skillFile.sourcePath).split(path.sep).join('/');
        plan.push({ kind: 'write', content: renderTemplate(sourceRelativePath, context.variables), targetPath, action: exists ? 'overwrite' : 'create' });
      }
    }
  }
  return plan;
}

function writeSkillFiles(context) {
  for (const item of context.skillPlan) {
    if (item.kind === 'write') {
      context.printAction(writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: true }), item.targetPath);
      continue;
    }
    context.printAction(removeFile(item.targetPath, { dryRun: context.options.dryRun }), item.targetPath);
    removeEmptyDirsUntil(path.dirname(item.targetPath), item.targetSkillDir, context.options.dryRun);
    removeEmptyDirsUntil(item.targetSkillDir, item.targetRoot, context.options.dryRun);
  }
}

module.exports = {
  prepareSkillPlan,
  writeSkillFiles,
};
