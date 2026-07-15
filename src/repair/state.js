const fs = require('fs');
const path = require('path');
const { getEntryFilesForAgent, normalizeAgent } = require('../agents');
const { digestBytes, validateArtifactRecords } = require('../artifact-ledger');
const { renderCommandArtifacts } = require('../command-artifacts');
const { renderRuleArtifacts } = require('../rule-artifacts');
const { canonicalizeWorkspacePath } = require('../fs-safe');
const { getAvailableCommandFiles, getDefaultCommandsForAgent } = require('../commands');
const { getAvailableRuleDirs, getDefaultRulesForAgent, normalizeConcreteRules } = require('../rules');
const { getAvailableSkillDirs, normalizeConcreteSkills } = require('../skills');
const { loadManifest, validateManifest } = require('../scaffold/manifest');
const { createTemplateVariables } = require('../template-variables');
const { hasDamagedHarnessStructure, scanWorkspaceHarnesses } = require('../workspace-harnesses');

async function resolveRepairState(options, chooseAgent) {
  const target = canonicalizeWorkspacePath(options.targetDir || '.');
  const manifest = loadManifest();
  validateManifest(manifest);
  const location = resolveHarnessLocation(target, options);
  const manifestInfo = readRepairManifest(location.manifestPath);
  const availableCommands = getAvailableCommandFiles(manifest.commandsRoot);
  const availableRules = getAvailableRuleDirs(manifest.rulesRoot);
  const availableSkills = getAvailableSkillDirs(manifest.skillsRoot);
  if (!location.recognized) {
    throw new Error(`No Niuma harness found at ${location.harnessRoot}. Run init before repair.`);
  }
  const parsed = parseManifestSelections(
    manifestInfo.value,
    location.harnessDir,
    manifest,
    availableCommands,
    availableRules,
    availableSkills
  );

  if (parsed.usable && (options.agentProvided || options.rulesProvided || options.rulesOutProvided || options.skillsProvided)) {
    throw new Error('Recovery selection options are only allowed when the generated manifest is unusable.');
  }

  let agent = parsed.agent;
  let agentSource = agent ? 'manifest' : null;
  if (!parsed.usable && options.agentProvided) {
    agent = options.agent;
    agentSource = 'explicit';
  }
  if (!agent) {
    if (options.yes) {
      throw new Error('Cannot determine repair agent from manifest. Re-run repair with --agent.');
    }
    agent = await chooseAgent(null);
    agentSource = 'interactive';
  }

  const rules = resolveRules(options, parsed, agent, availableRules);
  const skills = resolveSkills(options, parsed, availableSkills);
  return {
    availableCommands,
    availableRules,
    availableSkills,
    harnessDir: location.harnessDir,
    manifest,
    manifestInfo: { ...manifestInfo, errors: parsed.errors, usable: parsed.usable },
    manifestPath: location.manifestPath,
    selections: {
      agent,
      agentSource,
      commands: getDefaultCommandsForAgent(agent, availableCommands),
      commandsSource: 'package-default',
      openCodeInstructions: parsed.openCodeInstructions,
      rules: rules.value,
      rulesSource: rules.source,
      skills: skills.value,
      skillsSource: skills.source,
    },
    targetDir: location.harnessRoot,
    workspaceDir: location.workspaceDir,
  };
}

function resolveHarnessLocation(target, options) {
  const directManifest = path.join(target, 'manifest.json');
  if (isTrustedDirectManifest(directManifest) || hasDamagedHarnessStructure(target)) {
    return {
      harnessDir: path.basename(target),
      harnessRoot: target,
      manifestPath: directManifest,
      recognized: true,
      workspaceDir: path.dirname(target),
    };
  }

  const candidates = scanWorkspaceHarnesses(target, { includeMissingManifest: true });
  if (options.harnessDirProvided) {
    const selected = candidates.find((candidate) => sameName(candidate.directoryName, options.harnessDir));
    if (
      process.platform === 'win32'
      && selected
      && selected.directoryName !== options.harnessDir
    ) {
      throw new Error(
        `Requested --harness-dir "${options.harnessDir}" does not exactly match existing harness directory "${selected.directoryName}". Use the existing directory name exactly.`
      );
    }
    const harnessRoot = selected ? selected.directoryPath : path.join(target, options.harnessDir);
    return {
      harnessDir: options.harnessDir,
      harnessRoot,
      manifestPath: path.join(harnessRoot, 'manifest.json'),
      recognized: Boolean(selected),
      workspaceDir: target,
    };
  }
  if (candidates.length > 1) {
    throw new Error(`Multiple Niuma harnesses found: ${candidates.map((item) => item.directoryName).join(', ')}. Re-run with --harness-dir.`);
  }
  const selected = candidates[0];
  const harnessDir = selected ? selected.directoryName : options.harnessDir;
  const harnessRoot = selected ? selected.directoryPath : path.join(target, harnessDir);
  return {
    harnessDir,
    harnessRoot,
    manifestPath: path.join(harnessRoot, 'manifest.json'),
    recognized: Boolean(selected),
    workspaceDir: target,
  };
}

function isTrustedDirectManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return false;
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink()) return false;
  try {
    const value = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return value && !Array.isArray(value) && typeof value === 'object'
      && value.createdBy === 'niuma-harness';
  } catch {
    return false;
  }
}

function readRepairManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return { error: 'generated manifest is missing', raw: null, value: null };
  }
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return { error: 'generated manifest is not a regular file', raw: null, value: null };
  }
  const raw = fs.readFileSync(manifestPath, 'utf8');
  try {
    const value = JSON.parse(raw);
    return { error: null, raw, value };
  } catch (error) {
    return { error: `generated manifest is invalid JSON: ${error.message}`, raw, value: null };
  }
}

function parseManifestSelections(value, harnessDir, manifest, commands, rules, skills) {
  const errors = [];
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return { agent: null, errors: ['manifest must be an object'], rules: null, skills: null, usable: false };
  }
  if (value.schemaVersion !== 2) errors.push('schemaVersion must be 2');
  if (value.createdBy !== 'niuma-harness') errors.push('createdBy must be niuma-harness');
  if (value.harnessDir !== harnessDir) errors.push(`harnessDir must be ${harnessDir}`);
  if (value.workDir !== 'agent-work') errors.push('workDir must match package manifest: agent-work');
  let agent = null;
  try { agent = normalizeAgent(value.agent); } catch (error) { errors.push(error.message); }
  if (!agent) errors.push('agent is missing');
  let normalizedRules = null;
  let normalizedSkills = null;
  let openCodeInstructions = [];
  try { normalizedRules = normalizeConcreteRules(value.rules, rules, 'rules'); } catch (error) { errors.push(error.message); }
  try { normalizedSkills = normalizeConcreteSkills(value.skills, skills, 'skills'); } catch (error) { errors.push(error.message); }
  try {
    if (value.openCodeInstructions !== undefined) {
      if (!Array.isArray(value.openCodeInstructions)
          || value.openCodeInstructions.some((item) => typeof item !== 'string')) {
        throw new Error('openCodeInstructions must be an array of strings');
      }
      openCodeInstructions = [...value.openCodeInstructions];
      if (!['opencode', 'multi'].includes(agent) && openCodeInstructions.length > 0) {
        throw new Error('openCodeInstructions must be empty for the active agent');
      }
    }
  } catch (error) { errors.push(error.message); }
  if (!agent || !Array.isArray(value.commands)) {
    errors.push('commands must match package commands');
  } else {
    const expectedCommands = getDefaultCommandsForAgent(agent, commands);
    if (value.commands.length !== expectedCommands.length
        || value.commands.some((item, index) => item !== expectedCommands[index])) {
      errors.push('commands must match package commands');
    }
  }
  if (!agent || !Array.isArray(value.entryFiles)
      || value.entryFiles.length !== getEntryFilesForAgent(agent).length
      || value.entryFiles.some((item, index) => item !== getEntryFilesForAgent(agent)[index])) {
    errors.push('entryFiles must match agent');
  }
  try {
    const actual = validateArtifactRecords(value.artifacts);
    if (agent) {
      const expectedCommands = getDefaultCommandsForAgent(agent, commands);
      const variables = createTemplateVariables({ agent, harnessDir }, manifest.workDirectory || 'agent-work');
      const commandRecords = renderCommandArtifacts(agent, expectedCommands, manifest.commandsRoot, variables)
        .map((artifact) => ({
          digest: digestBytes(Buffer.from(artifact.content, 'utf8')),
          kind: artifact.kind,
          source: artifact.source,
          target: artifact.target,
        }));
      const ruleRecords = normalizedRules
        ? renderRuleArtifacts(agent, normalizedRules, manifest.rulesRoot, variables)
          .map((artifact) => ({
            digest: artifact.digest,
            kind: artifact.kind,
            source: artifact.source,
            target: artifact.target,
          }))
        : [];
      const expected = validateArtifactRecords([...commandRecords, ...ruleRecords]);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push('artifacts must match package commands and selected rules');
    }
  } catch (error) { errors.push(error.message); }
  return {
    agent,
    errors,
    openCodeInstructions,
    rules: normalizedRules,
    skills: normalizedSkills,
    usable: errors.length === 0,
  };
}

function resolveRules(options, parsed, agent, available) {
  if (parsed.usable) return { source: 'manifest', value: parsed.rules };
  if (options.rulesOutProvided) return { source: 'explicit', value: options.rules };
  if (options.rulesProvided) {
    const { normalizeSelectedRules } = require('../rules');
    return { source: 'explicit', value: normalizeSelectedRules(options.rules, available) };
  }
  if (parsed.rules) return { source: 'manifest', value: parsed.rules };
  return { source: 'agent-default', value: getDefaultRulesForAgent(agent, available) };
}

function resolveSkills(options, parsed, available) {
  if (parsed.usable) return { source: 'manifest', value: parsed.skills };
  if (options.skillsProvided) return { source: 'explicit', value: options.skills };
  if (parsed.skills) return { source: 'manifest', value: parsed.skills };
  return { source: 'agent-default', value: [...available] };
}

function sameName(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

module.exports = { resolveRepairState };
