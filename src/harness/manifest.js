// 生成 harness/manifest.json 的核心状态结构，供 init、doctor 与 repair 使用。
const { getEntryFilesForAgent, normalizeAgent } = require('./agents');
const { assertWorkDirBinding } = require('./runtime-layout');
const { validateTopologyShape } = require('./topology');

const STATUS_FILE = 'manifest.json';
const CURRENT_SCHEMA_VERSION = 5;
const LEGACY_CORE_SCHEMA_VERSIONS = new Set([2, 3, 4]);
const SUPPORTED_CORE_SCHEMA_VERSIONS = new Set([...LEGACY_CORE_SCHEMA_VERSIONS, CURRENT_SCHEMA_VERSION]);
const LEGACY_ASSET_FIELDS = ['rules', 'skills', 'commands', 'artifacts', 'openCodeInstructions'];

function createStatus(options, runtimeLayout) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    agent: options.agent,
    harnessDir: options.harnessDir,
    workDir: runtimeLayout.workDirectory,
    entryFiles: getEntryFilesForAgent(options.agent),
    topology: options.topology || { mode: 'single', modules: [] },
    moduleSupplements: options.moduleSupplements || [],
    createdBy: 'niuma-harness',
    createdAt: options.createdAt || new Date().toISOString(),
  };
}

function parseCoreManifest(value, { harnessDir, runtimeLayout }) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('manifest must be an object');
  }
  if (!SUPPORTED_CORE_SCHEMA_VERSIONS.has(value.schemaVersion)) {
    throw new Error(`unsupported schemaVersion: ${value.schemaVersion}`);
  }
  if (value.createdBy !== 'niuma-harness') {
    throw new Error('createdBy must be niuma-harness');
  }
  if (value.harnessDir !== harnessDir) {
    throw new Error(`harnessDir must be ${harnessDir}`);
  }
  if (!value.workDir) throw new Error('missing workDir');
  assertWorkDirBinding(value.workDir, runtimeLayout);
  if (!value.agent) throw new Error('missing agent');
  let agent;
  try {
    agent = normalizeAgent(value.agent);
  } catch (error) {
    throw new Error(`invalid agent: ${error.message}`);
  }
  const entryFiles = getEntryFilesForAgent(agent);
  if (!sameStringArray(value.entryFiles, entryFiles)) {
    throw new Error(`entryFiles must match agent ${agent}`);
  }
  if (value.schemaVersion === CURRENT_SCHEMA_VERSION) {
    const retained = LEGACY_ASSET_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(value, field));
    if (retained.length > 0) {
      throw new Error(`schemaVersion ${CURRENT_SCHEMA_VERSION} must not contain asset ownership fields: ${retained.join(', ')}`);
    }
  }

  let topology = { mode: 'single', modules: [] };
  let moduleSupplements = [];
  if (value.schemaVersion >= 3) {
    validateTopologyShape(value.topology, value.moduleSupplements);
    topology = value.topology;
    moduleSupplements = value.moduleSupplements;
  }
  return {
    agent,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    entryFiles,
    moduleSupplements,
    schemaVersion: value.schemaVersion,
    topology,
  };
}

function sameStringArray(left, right) {
  return Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  LEGACY_ASSET_FIELDS,
  LEGACY_CORE_SCHEMA_VERSIONS,
  STATUS_FILE,
  SUPPORTED_CORE_SCHEMA_VERSIONS,
  createStatus,
  parseCoreManifest,
};
