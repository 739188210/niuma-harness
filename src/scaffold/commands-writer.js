// 将 command 模板先渲染和完整预检，再统一写入各 agent 原生产物。
const fs = require('fs');
const { renderCommandArtifacts } = require('../command-artifacts');
const {
  digestBytes,
  findArtifactRecord,
  mergeArtifactRecords,
} = require('../artifact-ledger');
const { inspectFileTarget, safeResolveInside, writeFile } = require('../fs-safe');

function prepareCommandPlan(context, previousArtifacts) {
  const { commands, manifest, options } = context;
  const plan = renderCommandArtifacts(options.agent, commands, manifest.commandsRoot, context.variables)
    .map((artifact) => prepareRenderedArtifact(context, artifact));
  preflightCommandPlan(context.workspaceDir, plan, previousArtifacts);
  return {
    artifacts: mergeArtifactRecords(previousArtifacts, plan.map((item) => item.record)),
    plan,
  };
}

function prepareRenderedArtifact(context, artifact) {
  const bytes = Buffer.from(artifact.content, 'utf8');
  return {
    ...artifact,
    bytes,
    record: {
      kind: artifact.kind,
      source: artifact.source,
      target: artifact.target,
      digest: digestBytes(bytes),
    },
    targetPath: safeResolveInside(context.workspaceDir, artifact.target, 'command target'),
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
  const exists = inspectFileTarget(targetPath);
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
      const exists = inspectFileTarget(targetPath);
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

module.exports = {
  prepareCommandPlan,
  writeCommandFiles,
};
