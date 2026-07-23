// Skill 文件也作为可验证的 artifact 管理，避免仅按已知路径删除用户内容。
const path = require('path');
const { digestBytes } = require('./artifact-ledger');
const {
  getAvailableSkillDirs,
  getAllSkillTargetRoots,
  getSkillFiles,
  getSkillTargetRootsForAgent,
} = require('./skills');
const { TEMPLATE_DIR } = require('./generator/template-manifest');
const { renderTemplate } = require('./generator/template-renderer');

function renderSkillArtifacts(agent, skills, skillsRoot, variables) {
  return renderSkillArtifactsForRoots(
    getSkillTargetRootsForAgent(agent),
    skills,
    skillsRoot,
    variables
  );
}

function renderAllSkillArtifacts(skillsRoot, variables) {
  return renderSkillArtifactsForRoots(
    getAllSkillTargetRoots(),
    getAvailableSkillDirs(skillsRoot),
    skillsRoot,
    variables
  );
}

function renderSkillArtifactsForRoots(roots, skills, skillsRoot, variables) {
  const artifacts = [];
  for (const root of roots) {
    for (const skill of skills) {
      for (const file of getSkillFiles(skill, skillsRoot)) {
        const source = path.relative(TEMPLATE_DIR, file.sourcePath).split(path.sep).join('/');
        const content = renderTemplate(source, variables);
        artifacts.push({
          content,
          digest: digestBytes(content),
          kind: 'skill',
          source,
          target: path.posix.join(root, skill, file.relativePath),
        });
      }
    }
  }
  return artifacts;
}

module.exports = {
  renderAllSkillArtifacts,
  renderSkillArtifacts,
};
