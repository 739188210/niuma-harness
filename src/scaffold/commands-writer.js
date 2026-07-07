// 将 templates/commands 下的命令源模板渲染为各 agent 的原生命令产物。
const path = require('path');
const {
  getCommandId,
  getCommandsRootPath,
  getCommandTargetsForAgent,
  parseCommandSpec,
} = require('../commands');
const { safeResolveInside, writeFile } = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function writeCommandFiles(context) {
  const { commands, manifest, options } = context;
  const commandsRootPath = getCommandsRootPath(manifest.commandsRoot);
  const targets = getCommandTargetsForAgent(options.agent);

  for (const commandFile of commands) {
    const spec = loadCommandSpec(context, commandFile, commandsRootPath);
    for (const target of targets) {
      writeCommandArtifact(context, spec, target);
    }
  }
}

function loadCommandSpec(context, commandFile, commandsRootPath) {
  const sourcePath = path.join(commandsRootPath, commandFile);
  const sourceRelativePath = path.relative(TEMPLATE_DIR, sourcePath).split(path.sep).join('/');
  return parseCommandSpec(commandFile, renderTemplate(sourceRelativePath, context.variables));
}

function writeCommandArtifact(context, spec, target) {
  if (target.kind === 'claude-command') {
    writeMarkdownCommand(context, spec, target.root);
    return;
  }

  if (target.kind === 'opencode-command') {
    writeMarkdownCommand(context, spec, target.root);
    return;
  }

  if (target.kind === 'codex-skill-command') {
    writeCodexSkillCommand(context, spec, target.root);
    return;
  }

  throw new Error(`unknown command target kind: ${target.kind}`);
}

function writeMarkdownCommand(context, spec, targetRoot) {
  const { options, printAction, variables, workspaceDir } = context;
  const sourceRelativePath = path.posix.join('commands', spec.fileName);
  const targetPath = safeResolveInside(workspaceDir, path.join(targetRoot, spec.fileName), 'command target');
  const content = renderTemplate(sourceRelativePath, variables);
  printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite: true }), targetPath);
}

function writeCodexSkillCommand(context, spec, targetRoot) {
  const skillRoot = path.join(targetRoot, spec.id);
  writeGeneratedCommandFile(context, path.join(skillRoot, 'SKILL.md'), renderCodexSkillMarkdown(spec));
  writeGeneratedCommandFile(context, path.join(skillRoot, 'agents', 'openai.yaml'), renderCodexOpenAiYaml(spec));
}

function writeGeneratedCommandFile(context, relativePath, content) {
  const { options, printAction, workspaceDir } = context;
  const targetPath = safeResolveInside(workspaceDir, relativePath, 'command target');
  printAction(writeFile(targetPath, content, { dryRun: options.dryRun, overwrite: true }), targetPath);
}

function renderCodexSkillMarkdown(spec) {
  const argumentHint = spec.argumentHint || '';
  return `---
name: ${spec.id}
description: ${spec.description}
---

# ${spec.id}

Generated from \`templates/commands/${spec.fileName}\`.

## Arguments

Argument hint: \`${argumentHint}\`

When the workflow mentions \`$ARGUMENTS\`, treat it as the user-supplied invocation arguments. If no arguments were supplied, \`$ARGUMENTS\` is empty.

## Workflow

${spec.body.trim()}
`;
}

function renderCodexOpenAiYaml(spec) {
  return `interface:
  display_name: "${escapeYamlDoubleQuoted(spec.id)}"
  short_description: "${escapeYamlDoubleQuoted(spec.description)}"
  default_prompt: "Use $${escapeYamlDoubleQuoted(getCommandId(spec.fileName))} to run this workflow."
`;
}

function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

module.exports = {
  writeCommandFiles,
};
