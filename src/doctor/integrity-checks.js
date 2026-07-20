const fs = require('fs');
const path = require('path');
const { renderCommandArtifacts } = require('../command-artifacts');
const { assertNoSymlinkInPath, safeResolveInside } = require('../fs-safe');
const { renderRuleArtifacts } = require('../rule-artifacts');
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
    if (file.managed === 'user' || file.dynamic) {
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
  const variables = createTemplateVariables(
    { agent: context.agent, harnessDir: path.basename(context.harnessRoot) },
    context.templateManifest.workDirectory || 'agent-work'
  );
  const known = renderRuleArtifacts(
    context.agent,
    getAvailableRuleDirs(context.templateManifest.rulesRoot),
    context.templateManifest.rulesRoot,
    variables
  );
  for (const artifact of known) {
    if (!selected.has(artifact.rule)) {
      checkPathAbsent(context, context.workspaceRoot, artifact.target);
    }
  }
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


module.exports = {
  checkManagedContentIntegrity,
};
