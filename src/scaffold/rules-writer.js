// Rule files are ownership-tracked artifacts. Plan every canonical file before any scaffold mutation.
const fs = require('fs');
const path = require('path');
const { renderRuleArtifacts } = require('../rule-artifacts');
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
const { getAvailableRuleDirs } = require('../rules');

function prepareRulePlan(context) {
  const current = renderRuleArtifacts(
    context.options.rules,
    context.options.harnessDir,
    context.manifest.rulesRoot,
    context.variables
  ).map((artifact) => prepareArtifact(context, artifact, 'write'));
  const allKnown = renderRuleArtifacts(
    getAvailableRuleDirs(context.manifest.rulesRoot),
    context.options.harnessDir,
    context.manifest.rulesRoot,
    context.variables
  );
  const knownByTarget = new Map(allKnown.map((artifact) => [artifact.target, artifact]));
  const activeTargets = new Set(current.map((artifact) => artifact.target));
  const previous = context.previousStatus
    ? context.previousStatus.artifacts.filter((record) => record.kind === 'rule')
    : [];

  validatePreviousRecords(previous, knownByTarget);
  const removals = [];
  for (const artifact of allKnown) {
    if (!activeTargets.has(artifact.target)) {
      removals.push(prepareArtifact(context, artifact, 'remove'));
    }
  }

  const plan = [...current, ...removals];
  preflightRulePlan(context.workspaceDir, plan, previous);
  return {
    artifacts: validateArtifactRecords(current.map((item) => item.record)),
    plan,
  };
}

function prepareArtifact(context, artifact, operation) {
  const bytes = Buffer.from(artifact.content, 'utf8');
  return {
    ...artifact,
    bytes,
    operation,
    record: {
      kind: artifact.kind,
      source: artifact.source,
      target: artifact.target,
      digest: artifact.digest,
    },
    targetPath: safeResolveInside(context.workspaceDir, artifact.target, 'rule target'),
    targetRoot: safeResolveInside(
      context.workspaceDir,
      path.posix.join(context.options.harnessDir, 'docs', 'rules'),
      'rule root'
    ),
  };
}

function validatePreviousRecords(previous, knownByTarget) {
  for (const record of previous) {
    const canonical = knownByTarget.get(record.target);
    if (!canonical || canonical.source !== record.source || canonical.kind !== record.kind) {
      throw rulePreflightError([`rule artifact record is not canonical: ${record.target}`]);
    }
  }
}

function preflightRulePlan(workspaceDir, plan, previous) {
  const errors = [];
  for (const item of plan) {
    try {
      preflightRuleArtifact(workspaceDir, item, previous);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw rulePreflightError(errors);
  }
}

function preflightRuleArtifact(workspaceDir, item, previousArtifacts) {
  const targetPath = safeResolveInside(workspaceDir, item.target, 'rule target');
  const exists = inspectFileTarget(targetPath);
  const previous = findArtifactRecord(previousArtifacts, item.kind, item.target);
  const observedDigest = exists ? digestBytes(fs.readFileSync(targetPath)) : null;
  item.observedDigest = observedDigest;

  if (item.operation === 'remove') {
    if (previous) {
      if (previous.source !== item.source) {
        throw new Error(`rule artifact record is not canonical: ${item.target}`);
      }
      if (exists && observedDigest !== previous.digest) {
        throw new Error(`owned rule artifact drifted: ${item.target}`);
      }
      item.action = exists ? 'remove' : 'skip';
      return;
    }
    if (exists) {
      throw new Error(`refusing to remove unowned rule artifact: ${item.target}`);
    }
    item.action = 'skip';
    return;
  }

  if (previous) {
    if (previous.source !== item.source) {
      throw new Error(`rule artifact record is not canonical: ${item.target}`);
    }
    if (!exists) {
      item.action = 'create';
      return;
    }
    if (observedDigest !== previous.digest) {
      throw new Error(`owned rule artifact drifted: ${item.target}`);
    }
    item.action = 'refresh';
    return;
  }

  if (!exists) {
    item.action = 'create';
    return;
  }
  if (observedDigest === item.record.digest) {
    item.action = 'adopt';
    return;
  }
  throw new Error(`refusing to overwrite unowned rule artifact: ${item.target}`);
}

function rulePreflightError(errors) {
  return new Error(`rule artifact preflight failed; run repair --dry-run to inspect recovery:\n- ${errors.join('\n- ')}`);
}

function revalidateRulePlan(plan) {
  const errors = [];
  for (const item of plan) {
    try {
      const exists = inspectFileTarget(item.targetPath);
      if (item.observedDigest === null) {
        if (exists) {
          throw new Error(`rule artifact appeared after preflight: ${item.target}`);
        }
      } else if (!exists) {
        throw new Error(`rule artifact disappeared after preflight: ${item.target}`);
      } else if (digestBytes(fs.readFileSync(item.targetPath)) !== item.observedDigest) {
        throw new Error(`rule artifact changed after preflight: ${item.target}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`rule artifact revalidation failed:\n- ${errors.join('\n- ')}`);
  }
}

function writeRuleFiles(context) {
  revalidateRulePlan(context.rulePlan);
  for (const item of context.rulePlan) {
    if (item.operation === 'remove') {
      const action = removeFile(item.targetPath, { dryRun: context.options.dryRun });
      context.printAction(action, item.targetPath);
      if (action === 'remove') {
        removeEmptyDirsUntil(path.dirname(item.targetPath), item.targetRoot, context.options.dryRun);
      }
      continue;
    }
    if (item.action === 'adopt') {
      context.printAction('skip', item.targetPath);
      continue;
    }
    writeFile(item.targetPath, item.content, {
      dryRun: context.options.dryRun,
      overwrite: item.action === 'refresh',
    });
    context.printAction(item.action, item.targetPath);
  }
}

module.exports = {
  prepareRulePlan,
  revalidateRulePlan,
  writeRuleFiles,
};
