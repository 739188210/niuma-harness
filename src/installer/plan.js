const fs = require('fs');
const path = require('path');
const { digestBytes } = require('../infrastructure/content-digest');
const { safeResolveInside } = require('../infrastructure/fs-safe');

function createAssetInstallPlan({ workspaceDir, artifacts }) {
  return artifacts.map((artifact) => classifyArtifact(workspaceDir, artifact));
}

function formatAssetInstallPlan({ type, plan }) {
  const label = type ? `${type} install plan` : 'asset install plan';
  return [label, ...plan.map((item) => `${item.status} ${item.target}`)].join('\n');
}

function hasConflicts(plan) {
  return plan.some((item) => item.status === 'CONFLICT');
}

function hasUnsafeTargets(plan) {
  return plan.some((item) => item.status === 'UNSAFE');
}

function revalidateAssetInstallPlan({ workspaceDir, plan }) {
  for (const item of plan) {
    if (item.status === 'UNSAFE') throw new Error(`Unsafe target in install plan: ${item.target}`);
    const current = inspectTarget(workspaceDir, item.target);
    if (item.status === 'CREATE' && current.type !== 'missing') {
      throw new Error(`Asset install target changed since planning: ${item.target}`);
    }
    if ((item.status === 'UNCHANGED' || item.status === 'CONFLICT')
        && (current.type !== 'file' || current.digest !== item.observedDigest)) {
      throw new Error(`Asset install target changed since planning: ${item.target}`);
    }
  }
  return plan;
}

function classifyArtifact(workspaceDir, artifact) {
  const observation = inspectTarget(workspaceDir, artifact.target);
  const item = {
    kind: artifact.kind,
    source: artifact.source,
    target: artifact.target,
    content: artifact.content,
    bytes: Buffer.byteLength(artifact.content, 'utf8'),
    digest: artifact.digest,
    status: null,
    observedDigest: null,
  };
  if (observation.type === 'missing') {
    item.status = 'CREATE';
  } else if (observation.type === 'file') {
    item.observedDigest = observation.digest;
    item.status = observation.digest === artifact.digest ? 'UNCHANGED' : 'CONFLICT';
  } else {
    item.status = 'UNSAFE';
  }
  return item;
}

function inspectTarget(workspaceDir, target) {
  let targetPath;
  try {
    targetPath = safeResolveInside(workspaceDir, target, 'asset install target');
    const unsafeParent = findUnsafeParent(workspaceDir, targetPath);
    if (unsafeParent) return { type: 'unsafe' };
  } catch {
    return { type: 'unsafe' };
  }

  let stat;
  try {
    stat = fs.lstatSync(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        fs.statSync(targetPath);
      } catch (probeError) {
        if (probeError.code === 'ENOTDIR') return { type: 'unsafe' };
      }
      return { type: 'missing' };
    }
    if (error.code === 'ENOTDIR') return { type: 'unsafe' };
    throw error;
  }
  if (!stat.isFile() || stat.isSymbolicLink()) return { type: 'unsafe' };
  return { type: 'file', digest: digestBytes(fs.readFileSync(targetPath)) };
}

function findUnsafeParent(workspaceDir, targetPath) {
  const workspace = path.resolve(workspaceDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(workspace, path.dirname(target));
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) return workspace;
  let current = workspace;
  try {
    const workspaceStat = fs.lstatSync(workspace);
    if (workspaceStat.isSymbolicLink() || !workspaceStat.isDirectory()) return workspace;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  for (const segment of relative ? relative.split(path.sep) : []) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return current;
    try {
      const resolved = fs.statSync(current);
      if (!resolved.isDirectory()) return current;
    } catch (error) {
      if (error.code === 'ENOTDIR') return current;
      throw error;
    }
  }
  return null;
}

module.exports = {
  createAssetInstallPlan,
  formatAssetInstallPlan,
  hasConflicts,
  hasUnsafeTargets,
  revalidateAssetInstallPlan,
};
