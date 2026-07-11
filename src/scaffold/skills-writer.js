// 当前 agent roots 按选择收敛；退出 agent roots 只清理 previous selection 的模板已知文件。
const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../artifact-ledger');
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
          plan.push(createRemoveItem(context, targetRoot, targetSkillDir, targetPath, false, exists));
          continue;
        }
        const sourceRelativePath = path.relative(TEMPLATE_DIR, skillFile.sourcePath).split(path.sep).join('/');
        plan.push({ kind: 'write', content: renderTemplate(sourceRelativePath, context.variables), targetPath, action: exists ? 'overwrite' : 'create' });
      }
    }
  }

  if (context.previousStatus) {
    const currentRoots = new Set(getSkillTargetRootsForAgent(context.options.agent));
    const retiredRoots = getSkillTargetRootsForAgent(context.previousStatus.agent)
      .filter((targetRoot) => !currentRoots.has(targetRoot));
    for (const targetRoot of retiredRoots) {
      for (const skillName of context.previousStatus.skills) {
        const targetSkillDir = safeResolveInside(context.workspaceDir, path.join(targetRoot, skillName), 'retired skill target');
        for (const skillFile of filesBySkill.get(skillName)) {
          const targetPath = safeResolveInside(context.workspaceDir, path.join(targetRoot, skillName, skillFile.relativePath), 'retired skill target');
          const exists = inspectFileTarget(targetPath);
          plan.push(createRemoveItem(context, targetRoot, targetSkillDir, targetPath, true, exists));
        }
      }
    }
  }
  return plan;
}

function createRemoveItem(context, targetRoot, targetSkillDir, targetPath, retired, exists) {
  return {
    kind: 'remove',
    observedDigest: retired && exists ? digestBytes(fs.readFileSync(targetPath)) : null,
    observedMissing: retired && !exists,
    retired,
    targetPath,
    targetSkillDir,
    targetRoot: path.join(context.workspaceDir, targetRoot),
  };
}

function writeSkillFiles(context) {
  revalidateRetiredSkills(context.skillPlan);
  for (const item of context.skillPlan) {
    if (item.kind === 'write') {
      context.printAction(writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: true }), item.targetPath);
      continue;
    }
    const action = removeFile(item.targetPath, { dryRun: context.options.dryRun });
    context.printAction(action, item.targetPath);
    if (action === 'remove') {
      removeEmptyDirsUntil(path.dirname(item.targetPath), item.targetSkillDir, context.options.dryRun);
      removeEmptyDirsUntil(item.targetSkillDir, item.targetRoot, context.options.dryRun);
    }
  }
}

function revalidateRetiredSkills(plan) {
  const errors = [];
  for (const item of plan.filter((candidate) => candidate.kind === 'remove' && candidate.retired)) {
    try {
      const exists = inspectFileTarget(item.targetPath);
      if (item.observedMissing) {
        if (exists) {
          throw new Error(`retired skill file appeared after preflight: ${item.targetPath}`);
        }
        continue;
      }
      if (!exists) {
        throw new Error(`retired skill file disappeared after preflight: ${item.targetPath}`);
      }
      if (digestBytes(fs.readFileSync(item.targetPath)) !== item.observedDigest) {
        throw new Error(`retired skill file changed after preflight: ${item.targetPath}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`retired skill revalidation failed:\n- ${errors.join('\n- ')}`);
  }
}

module.exports = {
  prepareSkillPlan,
  writeSkillFiles,
};
