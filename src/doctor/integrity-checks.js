const fs = require('fs');
const path = require('path');
const { renderCommandArtifacts } = require('../command-artifacts');
const { assertNoSymlinkInPath, safeResolveInside } = require('../fs-safe');
const {
  renderClaudeRulePointer,
  renderOpenCodeRulesInstruction,
  MANAGED_RULES_BEGIN,
  MANAGED_RULES_END,
} = require('../scaffold/rules-adapters-writer');
const { TEMPLATE_DIR } = require('../scaffold/manifest');
const { renderTemplate } = require('../scaffold/templates');
const { getAvailableRuleDirs, getRuleAdapterTargetsForAgent } = require('../rules');
const { getAvailableSkillDirs, getSkillFiles, getSkillTargetRootsForAgent } = require('../skills');
const { createTemplateVariables } = require('../template-variables');
const { addError, addOk } = require('./result');

function checkManagedContentIntegrity(context) {
  const { agent, commands, rules, skills } = context;
  if (!agent || !commands || !rules || !skills) {
    return;
  }

  const variables = createTemplateVariables(
    { agent, harnessDir: path.basename(context.harnessRoot) },
    context.templateManifest.workDirectory || 'agent-work'
  );
  checkManagedTemplates(context, variables);
  checkRuleSelection(context);
  checkSelectedSkills(context, variables);
  checkUnselectedSkills(context);
  checkRuleAdapters(context);
  checkCurrentCommandArtifacts(context, variables);
}

function checkManagedTemplates(context, variables) {
  for (const file of context.templateManifest.templateFiles || []) {
    if (file.managed === 'user') {
      continue;
    }
    checkExactContent(
      context,
      context.harnessRoot,
      file.target,
      renderTemplate(file.template, variables)
    );
  }
  for (const file of context.templateManifest.workTemplateFiles || []) {
    checkExactContent(
      context,
      context.workspaceRoot,
      file.target,
      renderTemplate(file.template, variables)
    );
  }
}

function checkRuleSelection(context) {
  const selected = new Set(context.rules);
  for (const ruleName of getAvailableRuleDirs(context.templateManifest.rulesRoot)) {
    if (selected.has(ruleName)) {
      continue;
    }
    checkKnownFilesAbsent(
      context,
      context.harnessRoot,
      `docs/rules/${ruleName}`,
      getRuleFiles(ruleName, context.templateManifest.rulesRoot)
    );
  }
}

function getRuleFiles(ruleName, rulesRoot) {
  const ruleRoot = path.join(TEMPLATE_DIR, ...rulesRoot.split('/'), ruleName);
  return listRelativeFiles(ruleRoot);
}

function checkSelectedSkills(context, variables) {
  for (const targetRoot of getSkillTargetRootsForAgent(context.agent)) {
    for (const skillName of context.skills) {
      for (const skillFile of getSkillFiles(skillName, context.templateManifest.skillsRoot)) {
        const sourceRelativePath = path.relative(TEMPLATE_DIR, skillFile.sourcePath).split(path.sep).join('/');
        const target = path.posix.join(targetRoot, skillName, skillFile.relativePath);
        checkExactContent(context, context.workspaceRoot, target, renderTemplate(sourceRelativePath, variables));
      }
    }
  }
}

function checkUnselectedSkills(context) {
  const selected = new Set(context.skills);
  for (const targetRoot of getSkillTargetRootsForAgent(context.agent)) {
    for (const skillName of getAvailableSkillDirs(context.templateManifest.skillsRoot)) {
      if (selected.has(skillName)) {
        continue;
      }
      checkKnownFilesAbsent(
        context,
        context.workspaceRoot,
        path.posix.join(targetRoot, skillName),
        getSkillFiles(skillName, context.templateManifest.skillsRoot).map((file) => file.relativePath)
      );
    }
  }
}

function checkRuleAdapters(context) {
  const targets = getRuleAdapterTargetsForAgent(context.agent);
  const claudeTarget = targets.find((target) => target.kind === 'claude-rule-pointer');
  if (claudeTarget) {
    const selected = new Set(context.rules);
    for (const ruleName of getAvailableRuleDirs(context.templateManifest.rulesRoot)) {
      const target = path.posix.join(claudeTarget.root, `niuma-${ruleName}.md`);
      if (!selected.has(ruleName)) {
        checkPathAbsent(context, context.workspaceRoot, target);
        continue;
      }
      checkExactContent(
        context,
        context.workspaceRoot,
        target,
        renderClaudeRulePointer(path.basename(context.harnessRoot), ruleName)
      );
    }
  }

  const openCodeTarget = targets.find((target) => target.kind === 'opencode-instructions');
  if (openCodeTarget) {
    checkOpenCodeManagedBlock(context, openCodeTarget.file);
  }
}

function checkOpenCodeManagedBlock(context, target) {
  const targetPath = safeManagedPath(context, context.workspaceRoot, target);
  if (!targetPath || !isRegularFile(targetPath)) {
    return;
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (error) {
    return; // structural adapter check reports invalid JSON
  }
  const instructions = config && config.instructions;
  if (instructions !== undefined
      && typeof instructions !== 'string'
      && !(Array.isArray(instructions) && instructions.every((value) => typeof value === 'string'))) {
    return; // structural adapter check reports the invalid type
  }
  const markers = analyzeManagedMarkers(instructions);
  if (context.rules.length === 0) {
    if (markers.beginCount !== 0 || markers.endCount !== 0) {
      addError(context.result, `managed content drifted ${target} rules instructions`);
    }
    return;
  }

  const expected = renderOpenCodeRulesInstruction(context.rules, path.basename(context.harnessRoot));
  if (markers.beginCount !== 1 || markers.endCount !== 1 || markers.blocks.length !== 1 || markers.blocks[0] !== expected) {
    addError(context.result, `managed content drifted ${target} rules instructions`);
    return;
  }
  addOk(context.result, `managed content intact ${target} rules instructions`);
}

function analyzeManagedMarkers(instructions) {
  const values = typeof instructions === 'string'
    ? [instructions]
    : (Array.isArray(instructions) ? instructions.filter((value) => typeof value === 'string') : []);
  const pattern = new RegExp(`${escapeRegExp(MANAGED_RULES_BEGIN)}[\\s\\S]*?${escapeRegExp(MANAGED_RULES_END)}`, 'g');
  return {
    beginCount: countOccurrences(values, MANAGED_RULES_BEGIN),
    blocks: values.flatMap((value) => value.match(pattern) || []),
    endCount: countOccurrences(values, MANAGED_RULES_END),
  };
}

function countOccurrences(values, marker) {
  return values.reduce((count, value) => count + value.split(marker).length - 1, 0);
}

function checkCurrentCommandArtifacts(context, variables) {
  const artifacts = renderCommandArtifacts(
    context.agent,
    context.commands,
    context.templateManifest.commandsRoot,
    variables
  );
  for (const artifact of artifacts) {
    checkExactContent(context, context.workspaceRoot, artifact.target, artifact.content);
  }
}

function checkExactContent(context, baseDir, target, expected) {
  const targetPath = safeManagedPath(context, baseDir, target);
  if (!targetPath || !isRegularFile(targetPath)) {
    return; // structural checks report missing and non-file targets
  }
  const actual = fs.readFileSync(targetPath);
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (!actual.equals(expectedBytes)) {
    addError(context.result, `managed content drifted ${target}`);
    return;
  }
  addOk(context.result, `managed content intact ${target}`);
}

function checkKnownFilesAbsent(context, baseDir, root, relativeFiles) {
  for (const relativePath of relativeFiles) {
    checkPathAbsent(context, baseDir, path.posix.join(root, relativePath));
  }
}

function checkPathAbsent(context, baseDir, target) {
  const targetPath = safeManagedPath(context, baseDir, target);
  if (targetPath && fs.existsSync(targetPath)) {
    addError(context.result, `unexpected managed content ${target}`);
  }
}

function listRelativeFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRelativeFiles(entryPath).map((relative) => path.posix.join(entry.name, relative)));
    } else if (entry.isFile()) {
      files.push(entry.name);
    }
  }
  return files.sort();
}

function safeManagedPath(context, baseDir, target) {
  try {
    const targetPath = safeResolveInside(baseDir, target, `managed content ${target}`);
    assertNoSymlinkInPath(targetPath);
    return targetPath;
  } catch (error) {
    addError(context.result, error.message);
    return null;
  }
}

function isRegularFile(filePath) {
  return fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  checkManagedContentIntegrity,
};
