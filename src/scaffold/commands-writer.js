// 将 command 模板先渲染和完整预检，再统一写入各 agent 原生产物。
const fs = require('fs');
const path = require('path');
const {
  getCommandArtifactDescriptors,
  getCommandsRootPath,
  parseCommandSpec,
} = require('../commands');
const {
  digestBytes,
  findArtifactRecord,
  mergeArtifactRecords,
} = require('../artifact-ledger');
const { assertNoSymlinkInPath, safeResolveInside, writeFile } = require('../fs-safe');
const { TEMPLATE_DIR } = require('./manifest');
const { renderTemplate } = require('./templates');

function prepareCommandPlan(context, previousArtifacts) {
  const { commands, manifest, options } = context;
  const commandsRootPath = getCommandsRootPath(manifest.commandsRoot);
  const templates = new Map(commands.map((commandFile) => [
    commandFile,
    loadCommandTemplate(context, commandFile, commandsRootPath),
  ]));
  const plan = getCommandArtifactDescriptors(options.agent, commands)
    .map((descriptor) => renderCommandArtifact(context, descriptor, templates));
  preflightCommandPlan(context.workspaceDir, plan, previousArtifacts);
  return {
    artifacts: mergeArtifactRecords(previousArtifacts, plan.map((item) => item.record)),
    plan,
  };
}

function loadCommandTemplate(context, commandFile, commandsRootPath) {
  const sourcePath = path.join(commandsRootPath, commandFile);
  const sourceRelativePath = path.relative(TEMPLATE_DIR, sourcePath).split(path.sep).join('/');
  const specContent = renderTemplate(sourceRelativePath, context.variables);
  const commandSource = path.posix.join('commands', commandFile);
  return {
    content: sourceRelativePath === commandSource
      ? specContent
      : renderTemplate(commandSource, context.variables),
    spec: parseCommandSpec(commandFile, specContent),
  };
}

function renderCommandArtifact(context, descriptor, templates) {
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

  const bytes = Buffer.from(content, 'utf8');
  return {
    ...descriptor,
    bytes,
    content,
    record: {
      kind: descriptor.kind,
      source: descriptor.source,
      target: descriptor.target,
      digest: digestBytes(bytes),
    },
    targetPath: safeResolveInside(context.workspaceDir, descriptor.target, 'command target'),
  };
}

function preflightCommandPlan(workspaceDir, plan, previousArtifacts) {
  const errors = [];
  for (const item of plan) {
    try {
      preflightCommandArtifact(workspaceDir, item, previousArtifacts);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`command artifact preflight failed:\n- ${errors.join('\n- ')}`);
  }
}

function preflightCommandArtifact(workspaceDir, item, previousArtifacts) {
  const targetPath = safeResolveInside(workspaceDir, item.target, 'command target');
  assertNoSymlinkInPath(targetPath);
  const exists = fs.existsSync(targetPath);
  const previous = findArtifactRecord(previousArtifacts, item.kind, item.target);

  if (!exists) {
    item.action = 'create';
    item.observedDigest = null;
    return;
  }
  const stat = fs.lstatSync(targetPath);
  if (!stat.isFile()) {
    throw new Error(`command artifact target is not a regular file: ${item.target}`);
  }
  if (!previous || previous.source !== item.source) {
    throw new Error(`refusing to overwrite unowned command artifact: ${item.target}`);
  }

  const actualDigest = digestBytes(fs.readFileSync(targetPath));
  if (actualDigest !== previous.digest) {
    throw new Error(`owned command artifact drifted: ${item.target}`);
  }
  item.action = 'refresh';
  item.observedDigest = actualDigest;
}

function writeCommandFiles(context) {
  const { commandPlan, options, printAction } = context;
  revalidateCommandPlan(context.workspaceDir, commandPlan);
  for (const item of commandPlan) {
    writeFile(item.targetPath, item.content, { dryRun: options.dryRun, overwrite: item.action === 'refresh' });
    printAction(item.action, item.targetPath);
  }
}

function revalidateCommandPlan(workspaceDir, plan) {
  const errors = [];
  for (const item of plan) {
    try {
      const targetPath = safeResolveInside(workspaceDir, item.target, 'command target');
      assertNoSymlinkInPath(targetPath);
      const exists = fs.existsSync(targetPath);
      if (item.observedDigest === null) {
        if (exists) {
          throw new Error(`command artifact appeared after preflight: ${item.target}`);
        }
        continue;
      }
      if (!exists || !fs.lstatSync(targetPath).isFile()) {
        throw new Error(`command artifact changed type after preflight: ${item.target}`);
      }
      if (digestBytes(fs.readFileSync(targetPath)) !== item.observedDigest) {
        throw new Error(`command artifact changed after preflight: ${item.target}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`command artifact revalidation failed:\n- ${errors.join('\n- ')}`);
  }
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
  prepareCommandPlan,
  writeCommandFiles,
};
