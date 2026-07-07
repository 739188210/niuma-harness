// 校验 manifest.commands 声明的命令源模板是否生成到当前 agent 对应的命令产物。
const fs = require('fs');
const path = require('path');
const {
  getAvailableCommandFiles,
  getCommandId,
  getCommandTargetsForAgent,
} = require('../commands');
const { parseMarkdownFrontmatter } = require('../frontmatter');
const { checkDirectory, checkRegularFile } = require('./core-checks');
const { addError, addOk } = require('./result');

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
    checkCommandSkillMetadata(skillFile, skillFileLabel, commandId, result);
  }

  const openAiLabel = `${targetRoot}/${commandId}/agents/openai.yaml`;
  checkRegularFile(path.join(skillDir, 'agents', 'openai.yaml'), openAiLabel, result);
}

function checkCommandSkillMetadata(filePath, label, commandId, result) {
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
  } else if (name !== commandId) {
    addError(result, `name mismatch in ${label} frontmatter: expected ${commandId}, got ${name}`);
  }

  if (!description) {
    addError(result, `missing description in ${label} frontmatter`);
  }

  if (!parsed.body.trim()) {
    addError(result, `empty body in ${label}`);
  }

  if (name === commandId && description && parsed.body.trim()) {
    addOk(result, `${label} metadata`);
  }
}

function isRegularFile(filePath) {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
}

module.exports = {
  getAvailableCommands,
  checkCommandFiles,
};
