const path = require('path');
const {
  getCommandArtifactDescriptors,
  getCommandsRootPath,
  parseCommandSpec,
} = require('./commands');
const { TEMPLATE_DIR } = require('./scaffold/manifest');
const { renderTemplate } = require('./scaffold/templates');

function renderCommandArtifacts(agent, commands, commandsRoot, variables) {
  const commandsRootPath = getCommandsRootPath(commandsRoot);
  const templates = new Map(commands.map((commandFile) => [
    commandFile,
    loadCommandTemplate(commandFile, commandsRootPath, variables),
  ]));
  return getCommandArtifactDescriptors(agent, commands)
    .map((descriptor) => renderCommandArtifact(descriptor, templates));
}

function loadCommandTemplate(commandFile, commandsRootPath, variables) {
  const sourcePath = path.join(commandsRootPath, commandFile);
  const sourceRelativePath = path.relative(TEMPLATE_DIR, sourcePath).split(path.sep).join('/');
  const specContent = renderTemplate(sourceRelativePath, variables);
  const commandSource = path.posix.join('commands', commandFile);
  return {
    content: sourceRelativePath === commandSource
      ? specContent
      : renderTemplate(commandSource, variables),
    spec: parseCommandSpec(commandFile, specContent),
  };
}

function renderCommandArtifact(descriptor, templates) {
  const commandFile = path.posix.basename(descriptor.source);
  const template = templates.get(commandFile);
  let content;
  if (descriptor.renderer === 'markdown') {
    content = template.content;
  } else if (descriptor.renderer === 'codex-skill') {
    content = renderCodexSkillMarkdown(template.spec);
  } else if (descriptor.renderer === 'codex-openai') {
    content = renderCodexOpenAiYaml(template.spec);
  } else {
    throw new Error(`unknown command renderer: ${descriptor.renderer}`);
  }
  return { ...descriptor, content };
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
  default_prompt: "Use $${escapeYamlDoubleQuoted(spec.id)} to run this workflow."
`;
}

function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

module.exports = {
  renderCommandArtifacts,
};
