// 生成态 artifact ownership ledger：统一校验目标路径、摘要和记录合并。
const crypto = require('crypto');
const path = require('path');
const { validateRelativePath } = require('./fs-safe');

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function digestBytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function validateArtifactRecords(records) {
  if (!Array.isArray(records)) {
    throw new Error('artifacts must be an array');
  }

  const targets = new Set();
  const validated = records.map((record, index) => validateArtifactRecord(record, index));
  for (const record of validated) {
    if (targets.has(record.target)) {
      throw new Error(`duplicate artifact target: ${record.target}`);
    }
    targets.add(record.target);
  }
  return sortArtifactRecords(validated);
}

function validateArtifactRecord(record, index) {
  if (!record || Array.isArray(record) || typeof record !== 'object') {
    throw new Error(`artifact record ${index} must be an object`);
  }
  for (const field of ['kind', 'source', 'target', 'digest']) {
    if (typeof record[field] !== 'string' || !record[field]) {
      throw new Error(`artifact record ${index} has invalid ${field}`);
    }
  }

  validateArtifactPath(record.source, `artifact source ${index}`);
  validateArtifactPath(record.target, `artifact target ${index}`);
  if (!DIGEST_PATTERN.test(record.digest)) {
    throw new Error(`artifact record ${index} has invalid digest`);
  }
  return {
    kind: record.kind,
    source: record.source,
    target: record.target,
    digest: record.digest,
  };
}

function validateArtifactPath(value, label) {
  if (value.includes('\\')) {
    throw new Error(`Invalid ${label}: backslashes are not allowed: ${value}`);
  }
  validateRelativePath(value, label);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || value === '.' || value.startsWith('./')) {
    throw new Error(`Invalid ${label}: path must be canonical: ${value}`);
  }
}

function sortArtifactRecords(records) {
  return [...records].sort((left, right) =>
    left.target.localeCompare(right.target)
      || left.kind.localeCompare(right.kind)
      || left.source.localeCompare(right.source)
  );
}

function findArtifactRecord(records, kind, target) {
  return records.find((record) => record.kind === kind && record.target === target) || null;
}

function mergeArtifactRecords(previousRecords, plannedRecords) {
  const previous = validateArtifactRecords(previousRecords);
  const planned = validateArtifactRecords(plannedRecords);
  const plannedTargets = new Set(planned.map((record) => record.target));
  return validateArtifactRecords([
    ...previous.filter((record) => !plannedTargets.has(record.target)),
    ...planned,
  ]);
}

module.exports = {
  digestBytes,
  findArtifactRecord,
  mergeArtifactRecords,
  validateArtifactRecords,
};
