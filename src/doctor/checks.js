// doctor 的高层检查编排：只验证 Harness 核心状态，不接管 agent assets。
const path = require('path');
const { normalizeAgent } = require('../harness/agents');
const { loadManifest } = require('../generator/template-manifest');
const { parseCoreManifest } = require('../harness/manifest');
const { getRuntimeLayout } = require('../harness/runtime-layout');
const { addError, addOk } = require('./result');
const { checkManagedContentIntegrity } = require('./integrity-checks');
const {
  checkCoreDocs,
  checkEntryContractIntegrity,
  checkEntryFiles,
  checkWorkDir,
} = require('./core-checks');
const { checkTopology } = require('./topology-checks');

function checkHarness(harnessRoot, status, result) {
  const context = createCheckContext(harnessRoot, status, result);
  checkCoreManifest(context);
  checkEntryFiles(context);
  checkEntryContractIntegrity(context);
  checkCoreDocs(context);
  checkTopology(context);
  checkManagedContentIntegrity(context);
  checkWorkDir(context);
}

function createCheckContext(harnessRoot, status, result) {
  const templateManifest = loadManifest();
  return {
    agent: null,
    harnessRoot,
    result,
    runtimeLayout: getRuntimeLayout(templateManifest),
    status,
    templateManifest,
    workspaceRoot: path.dirname(harnessRoot),
  };
}

function checkCoreManifest(context) {
  const { harnessRoot, result, runtimeLayout, status } = context;
  let parsed;
  try {
    parsed = parseCoreManifest(status, {
      harnessDir: path.basename(harnessRoot),
      runtimeLayout,
    });
  } catch (error) {
    addError(result, error.message);
    return;
  }
  context.agent = parsed.agent;
  context.status = {
    ...status,
    ...parsed,
    entryFiles: parsed.entryFiles,
    topology: parsed.topology,
    moduleSupplements: parsed.moduleSupplements,
  };
  addOk(result, `schemaVersion ${parsed.schemaVersion}`);
  addOk(result, 'createdBy niuma-harness');
  addOk(result, `harnessDir ${path.basename(harnessRoot)}`);
  addOk(result, `workDir binding ${runtimeLayout.workDirectory}`);
  addOk(result, `agent ${parsed.agent}`);
}

module.exports = {
  checkHarness,
};
