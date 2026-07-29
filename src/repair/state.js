const fs = require('fs');
const path = require('path');
const { canonicalizeWorkspacePath } = require('../infrastructure/fs-safe');
const { parseCoreManifest } = require('../harness/manifest');
const { loadManifest, validateManifest } = require('../generator/template-manifest');
const { getRuntimeLayout } = require('../harness/runtime-layout');
const { hasDamagedHarnessStructure, scanWorkspaceHarnesses } = require('../harness/workspace-harnesses');

async function resolveRepairState(options, chooseAgent) {
  const target = canonicalizeWorkspacePath(options.targetDir || '.');
  const manifest = loadManifest();
  validateManifest(manifest);
  const location = resolveHarnessLocation(target, options);
  if (!location.recognized) {
    throw new Error(`No Niuma harness found at ${location.harnessRoot}. Run init before repair.`);
  }
  const runtimeLayout = getRuntimeLayout(manifest);
  const manifestInfo = readRepairManifest(location.manifestPath);
  const parsed = parseRepairCoreState(manifestInfo.value, location.harnessDir, runtimeLayout);
  if (parsed.usable && options.agentProvided) {
    throw new Error('Recovery --agent is only allowed when the generated manifest is unusable.');
  }

  let agent = parsed.agent;
  let agentSource = agent ? 'manifest' : null;
  if (!agent && options.agentProvided) {
    agent = options.agent;
    agentSource = 'explicit';
  }
  if (!agent) {
    if (options.yes) throw new Error('Cannot determine repair agent from manifest. Re-run repair with --agent.');
    agent = await chooseAgent(null);
    agentSource = 'interactive';
  }

  return {
    harnessDir: location.harnessDir,
    manifest,
    manifestInfo: { ...manifestInfo, errors: parsed.errors, usable: parsed.usable },
    runtimeLayout,
    manifestPath: location.manifestPath,
    selections: {
      agent,
      agentSource,
      moduleSupplements: parsed.moduleSupplements,
      topology: parsed.topology,
      topologyInvalid: parsed.topologyInvalid,
    },
    targetDir: location.harnessRoot,
    workspaceDir: location.workspaceDir,
  };
}

function parseRepairCoreState(value, harnessDir, runtimeLayout) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return { agent: null, errors: ['manifest must be an object'], moduleSupplements: [], topology: { mode: 'single', modules: [] }, topologyInvalid: false, usable: false };
  }
  try {
    const parsed = parseCoreManifest(value, { harnessDir, runtimeLayout });
    return { ...parsed, errors: [], topologyInvalid: false, usable: true };
  } catch (error) {
    const recovered = recoverCoreWithoutTopology(value, harnessDir, runtimeLayout);
    if (recovered) {
      return {
        ...recovered,
        errors: [error.message],
        topologyInvalid: true,
        usable: false,
      };
    }
    return {
      agent: null,
      errors: [error.message],
      moduleSupplements: [],
      topology: { mode: 'single', modules: [] },
      topologyInvalid: false,
      usable: false,
    };
  }
}

function recoverCoreWithoutTopology(value, harnessDir, runtimeLayout) {
  if (value.schemaVersion < 3) return null;
  try {
    return parseCoreManifest({
      ...value,
      topology: { mode: 'single', modules: [] },
      moduleSupplements: [],
    }, { harnessDir, runtimeLayout });
  } catch {
    return null;
  }
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
    if (process.platform === 'win32' && selected && selected.directoryName !== options.harnessDir) {
      throw new Error(`Requested --harness-dir "${options.harnessDir}" does not exactly match existing harness directory "${selected.directoryName}". Use the existing directory name exactly.`);
    }
    const harnessRoot = selected ? selected.directoryPath : path.join(target, options.harnessDir);
    return { harnessDir: options.harnessDir, harnessRoot, manifestPath: path.join(harnessRoot, 'manifest.json'), recognized: Boolean(selected), workspaceDir: target };
  }
  if (candidates.length > 1) {
    throw new Error(`Multiple Niuma harnesses found: ${candidates.map((item) => item.directoryName).join(', ')}. Re-run with --harness-dir.`);
  }
  const selected = candidates[0];
  const harnessDir = selected ? selected.directoryName : options.harnessDir;
  const harnessRoot = selected ? selected.directoryPath : path.join(target, harnessDir);
  return { harnessDir, harnessRoot, manifestPath: path.join(harnessRoot, 'manifest.json'), recognized: Boolean(selected), workspaceDir: target };
}

function isTrustedDirectManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return false;
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink()) return false;
  try {
    const value = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return value && !Array.isArray(value) && typeof value === 'object' && value.createdBy === 'niuma-harness';
  } catch {
    return false;
  }
}

function readRepairManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return { error: 'generated manifest is missing', raw: null, value: null };
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink()) return { error: 'generated manifest is not a regular file', raw: null, value: null };
  const raw = fs.readFileSync(manifestPath, 'utf8');
  try {
    return { error: null, raw, value: JSON.parse(raw) };
  } catch (error) {
    return { error: `generated manifest is invalid JSON: ${error.message}`, raw, value: null };
  }
}

function sameName(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

module.exports = { resolveRepairState };
