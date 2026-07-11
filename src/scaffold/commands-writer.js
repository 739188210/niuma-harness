// 将当前 command 产物和退出 agent 的已登记产物一起预检，再统一应用。
const fs = require('fs');
const path = require('path');
const { renderCommandArtifacts } = require('../command-artifacts');
const { getCommandArtifactDescriptors, getCommandTargetsForAgent } = require('../commands');
const {
  digestBytes,
  findArtifactRecord,
  validateArtifactRecords,
} = require('../artifact-ledger');
const {
  inspectFileTarget,
  removeEmptyDirsUntil,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');

function prepareCommandPlan(context) {
  const { commands, manifest, options, previousStatus } = context;
  const writes = renderCommandArtifacts(options.agent, commands, manifest.commandsRoot, context.variables)
    .map((artifact) => prepareRenderedArtifact(context, artifact));
  const activeTargets = new Set(writes.map((item) => item.target));
  const removals = prepareRetiredArtifacts(context, activeTargets);
  const plan = [...writes, ...removals];
  preflightCommandPlan(context.workspaceDir, plan, previousStatus ? previousStatus.artifacts : []);
  return {
    artifacts: validateArtifactRecords(writes.map((item) => item.record)),
    plan,
  };
}

function prepareRenderedArtifact(context, artifact) {
  const bytes = Buffer.from(artifact.content, 'utf8');
  return {
    ...artifact,
    bytes,
    operation: 'write',
    record: {
      kind: artifact.kind,
      source: artifact.source,
      target: artifact.target,
      digest: digestBytes(bytes),
    },
    targetPath: safeResolveInside(context.workspaceDir, artifact.target, 'command target'),
  };
}

function prepareRetiredArtifacts(context, activeTargets) {
  const { previousStatus } = context;
  if (!previousStatus) {
    return [];
  }

  const previousDescriptors = getCommandArtifactDescriptors(
    previousStatus.agent,
    previousStatus.commands
  );
  const previousTargets = new Set(previousDescriptors.map((item) => item.target));
  for (const record of previousStatus.artifacts) {
    if (!previousTargets.has(record.target)) {
      throw new Error(`inactive command artifact record cannot be reconciled: ${record.target}`);
    }
  }

  return previousDescriptors
    .filter((descriptor) => !activeTargets.has(descriptor.target))
    .map((descriptor) => ({
      ...descriptor,
      operation: 'remove',
      targetPath: safeResolveInside(context.workspaceDir, descriptor.target, 'command target'),
      targetRoot: getCommandTargetRoot(context.workspaceDir, previousStatus.agent, descriptor.target),
    }));
}

function getCommandTargetRoot(workspaceDir, agent, target) {
  const match = getCommandTargetsForAgent(agent)
    .find((candidate) => target === candidate.root || target.startsWith(`${candidate.root}/`));
  if (!match) {
    throw new Error(`command target is not canonical for agent ${agent}: ${target}`);
  }
  return safeResolveInside(workspaceDir, match.root, 'command root');
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

  if (item.operation === 'remove') {
    if (!previous || previous.source !== item.source) {
      throw new Error(`refusing to remove unowned command artifact: ${item.target}`);
    }
    item.action = exists ? 'remove' : 'skip';
    item.observedDigest = exists ? digestBytes(fs.readFileSync(targetPath)) : null;
    if (exists && item.observedDigest !== previous.digest) {
      throw new Error(`owned command artifact drifted: ${item.target}`);
    }
    return;
  }

  if (!exists) {
    item.action = 'create';
    item.observedDigest = null;
    return;
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
    if (item.operation === 'remove') {
      const action = removeFile(item.targetPath, { dryRun: options.dryRun });
      printAction(action, item.targetPath);
      if (action === 'remove') {
        removeEmptyDirsUntil(path.dirname(item.targetPath), item.targetRoot, options.dryRun);
      }
      continue;
    }
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
      if (!exists) {
        throw new Error(`command artifact disappeared after preflight: ${item.target}`);
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
