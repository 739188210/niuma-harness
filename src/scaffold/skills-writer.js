// Skill 文件作为 ledger-owned artifacts 写入；移除必须有精确 ownership 证据。
const fs = require('fs');
const path = require('path');
const { digestBytes, findArtifactRecord, validateArtifactRecords } = require('../artifact-ledger');
const { renderAllSkillArtifacts, renderSkillArtifacts } = require('../skill-artifacts');
const {
  inspectFileTarget,
  removeEmptyDirsUntil,
  removeFile,
  safeResolveInside,
  writeFile,
} = require('../fs-safe');

function prepareSkillPlan(context) {
  const current = renderSkillArtifacts(
    context.options.agent,
    context.options.skills,
    context.manifest.skillsRoot,
    context.variables
  ).map((artifact) => prepareArtifact(context, artifact, 'write'));
  const activeTargets = new Set(current.map((item) => item.target));
  const previous = context.previousStatus && context.previousStatus.schemaVersion >= 4
    ? context.previousStatus.artifacts.filter((record) => record.kind === 'skill')
    : [];
  const selectedPreviousSkills = new Set(
    context.previousStatus && context.previousStatus.schemaVersion >= 4
      ? context.previousStatus.skills
      : []
  );
  const knownByTarget = new Map(renderAllSkillArtifacts(context.manifest.skillsRoot, context.variables)
    .map((artifact) => [artifact.target, artifact]));
  const removals = previous
    .filter((record) => !activeTargets.has(record.target) && selectedPreviousSkills.has(skillNameForArtifact(record)))
    .map((record) => knownByTarget.get(record.target))
    .filter(Boolean)
    .map((artifact) => prepareArtifact(context, artifact, 'remove'));
  const plan = [...current, ...removals];
  preflightSkillPlan(plan, previous);
  return {
    artifacts: validateArtifactRecords(current.map((item) => item.record)),
    plan,
  };
}

function skillNameForArtifact(artifact) {
  const segments = artifact.target.split('/');
  return segments[2] || null;
}

function prepareArtifact(context, artifact, operation) {
  const targetPath = safeResolveInside(context.workspaceDir, artifact.target, 'skill target');
  const segments = artifact.target.split('/');
  const targetRoot = safeResolveInside(
    context.workspaceDir,
    segments.slice(0, 2).join('/'),
    'skill target root'
  );
  return {
    ...artifact,
    operation,
    record: {
      digest: artifact.digest,
      kind: artifact.kind,
      source: artifact.source,
      target: artifact.target,
    },
    targetPath,
    targetRoot,
  };
}

function preflightSkillPlan(plan, previous) {
  const errors = [];
  for (const item of plan) {
    try {
      preflightSkillArtifact(item, previous);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`skill artifact preflight failed; run repair --dry-run to inspect recovery:\n- ${errors.join('\n- ')}`);
  }
}

function preflightSkillArtifact(item, previous) {
  const exists = inspectFileTarget(item.targetPath);
  const record = findArtifactRecord(previous, 'skill', item.target);
  const observedDigest = exists ? digestBytes(fs.readFileSync(item.targetPath)) : null;
  item.observedDigest = observedDigest;

  if (item.operation === 'remove') {
    if (!record || record.source !== item.source || record.digest !== item.digest) {
      throw new Error(`refusing to remove unowned skill artifact: ${item.target}`);
    }
    if (exists && observedDigest !== record.digest) {
      throw new Error(`owned skill artifact drifted: ${item.target}`);
    }
    item.action = exists ? 'remove' : 'skip';
    return;
  }

  if (!exists) {
    item.action = 'create';
    return;
  }
  if (record) {
    if (record.source !== item.source || record.digest !== item.digest) {
      throw new Error(`skill artifact record is not canonical: ${item.target}`);
    }
    if (observedDigest !== record.digest) {
      throw new Error(`owned skill artifact drifted: ${item.target}`);
    }
    item.action = 'refresh';
    return;
  }
  if (observedDigest === item.digest) {
    item.action = 'adopt';
    return;
  }
  throw new Error(`refusing to overwrite unowned skill artifact: ${item.target}`);
}

function writeSkillFiles(context) {
  revalidateSkillPlan(context.skillPlan);
  for (const item of context.skillPlan) {
    if (item.operation === 'remove') {
      const action = removeFile(item.targetPath, { dryRun: context.options.dryRun });
      context.printAction(action, item.targetPath);
      if (action === 'remove') {
        removeEmptyDirsUntil(path.dirname(item.targetPath), item.targetRoot, context.options.dryRun);
      }
      continue;
    }
    writeFile(item.targetPath, item.content, { dryRun: context.options.dryRun, overwrite: item.action === 'refresh' });
    context.printAction(item.action, item.targetPath);
  }
}

function revalidateSkillPlan(plan) {
  const errors = [];
  for (const item of plan) {
    try {
      const exists = inspectFileTarget(item.targetPath);
      if (item.observedDigest === null) {
        if (exists) throw new Error(`skill artifact appeared after preflight: ${item.target}`);
      } else if (!exists) {
        throw new Error(`skill artifact disappeared after preflight: ${item.target}`);
      } else if (digestBytes(fs.readFileSync(item.targetPath)) !== item.observedDigest) {
        throw new Error(`skill artifact changed after preflight: ${item.target}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length > 0) {
    throw new Error(`skill artifact revalidation failed:\n- ${errors.join('\n- ')}`);
  }
}

module.exports = {
  prepareSkillPlan,
  writeSkillFiles,
};
