// 校验 manifest.commands 声明的命令源模板是否生成到当前 agent 对应的命令产物。
const path = require('path');
const {
  getAvailableCommandFiles,
  getCommandId,
  getCommandTargetsForAgent,
} = require('../commands');
const { checkDirectory, checkRegularFile } = require('./core-checks');
const { checkMarkdownMetadata, isRegularFile } = require('./markdown-checks');
const { addError } = require('./result');

function getAvailableCommands(commandsRoot) {
  return getAvailableCommandFiles(commandsRoot);
}

function checkCommandFiles(context) {
  const { agent, commands, result, workspaceRoot } = context;
  if (!agent || !commands) {
    return;
  }

  for (const target of getCommandTargetsForAgent(agent)) {
    for (const commandFile of commands) {
      checkCommandArtifact(workspaceRoot, result, target, commandFile);
    }
  }
}

function checkCommandArtifact(workspaceRoot, result, target, commandFile) {
  if (target.kind === 'claude-command' || target.kind === 'opencode-command') {
    const label = `${target.root}/${commandFile}`;
    checkRegularFile(path.join(workspaceRoot, ...target.root.split('/'), commandFile), label, result);
    return;
  }

  if (target.kind === 'codex-skill-command') {
    checkCodexSkillCommand(workspaceRoot, result, target.root, commandFile);
    return;
  }

  addError(result, `unknown command target kind: ${target.kind}`);
}

function checkCodexSkillCommand(workspaceRoot, result, targetRoot, commandFile) {
  const commandId = getCommandId(commandFile);
  const skillDir = path.join(workspaceRoot, ...targetRoot.split('/'), commandId);
  const skillLabel = `${targetRoot}/${commandId}/`;
  checkDirectory(skillDir, skillLabel, result);

  const skillFile = path.join(skillDir, 'SKILL.md');
  const skillFileLabel = `${targetRoot}/${commandId}/SKILL.md`;
  checkRegularFile(skillFile, skillFileLabel, result);
  if (isRegularFile(skillFile)) {
    checkMarkdownMetadata(skillFile, skillFileLabel, commandId, result);
  }

  const openAiLabel = `${targetRoot}/${commandId}/agents/openai.yaml`;
  checkRegularFile(path.join(skillDir, 'agents', 'openai.yaml'), openAiLabel, result);
}

module.exports = {
  getAvailableCommands,
  checkCommandFiles,
};
