// Runtime task records are user-owned. These helpers only read direct children.
const fs = require('fs');
const path = require('path');
const { safeResolveInside } = require('../fs-safe');

const AUDIT_RECORD_BEGIN = '<!-- niuma-audit-record:begin -->';
const AUDIT_RECORD_END = '<!-- niuma-audit-record:end -->';
const BOOTSTRAP_RECORD_BEGIN = '<!-- niuma-bootstrap-record:begin -->';
const BOOTSTRAP_RECORD_END = '<!-- niuma-bootstrap-record:end -->';
const VERIFICATION_RECORD_BEGIN = '<!-- niuma-verification-record:begin -->';
const VERIFICATION_RECORD_END = '<!-- niuma-verification-record:end -->';
const RECORD_FILE = 'harness-feedback.md';

function parseAuditRecord(content, label = RECORD_FILE) {
  return parseMarkerRecord(content, AUDIT_RECORD_BEGIN, AUDIT_RECORD_END, 'audit record', label);
}

function parseBootstrapRecord(content, label = 'project-context.md') {
  return parseMarkerRecord(content, BOOTSTRAP_RECORD_BEGIN, BOOTSTRAP_RECORD_END, 'bootstrap record', label);
}

function parseVerificationRecord(content, label = 'verification.md') {
  return parseMarkerRecord(content, VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END, 'verification record', label);
}

function parseMarkerRecord(content, beginMarker, endMarker, kind, label) {
  const beginCount = countOccurrences(content, beginMarker);
  const endCount = countOccurrences(content, endMarker);
  if (beginCount === 0 && endCount === 0) {
    throw new Error(`missing ${kind} markers in ${label}`);
  }
  if (beginCount !== 1 || endCount !== 1) {
    throw new Error(`expected exactly one ${kind} block in ${label}`);
  }

  const begin = content.indexOf(beginMarker) + beginMarker.length;
  const end = content.indexOf(endMarker);
  if (end < begin) {
    throw new Error(`invalid ${kind} marker order in ${label}`);
  }

  const block = content.slice(begin, end).trim();
  const fenced = /^```json\s*\n([\s\S]*?)\n```$/u.exec(block);
  if (!fenced) {
    throw new Error(`${kind} must contain one JSON fenced block in ${label}`);
  }

  try {
    const record = JSON.parse(fenced[1]);
    if (!record || Array.isArray(record) || typeof record !== 'object') {
      throw new Error('must be a JSON object');
    }
    return record;
  } catch (error) {
    throw new Error(`invalid ${kind} JSON in ${label}: ${error.message}`);
  }
}

function loadTaskRecords(workDir) {
  // Audit assumes this workspace is not concurrently mutated; static no-follow checks prevent known symlink traversal.
  const tasksDir = safeResolveInside(workDir, 'tasks', 'task records directory');
  if (fs.existsSync(tasksDir)) {
    const tasksStat = fs.lstatSync(tasksDir);
    if (tasksStat.isSymbolicLink()) {
      return [{ taskName: '(tasks)', kind: 'invalid', path: tasksDir, label: 'tasks', error: `unsafe symlink task records directory: ${tasksDir}` }];
    }
    if (!tasksStat.isDirectory()) {
      return [{ taskName: '(tasks)', kind: 'invalid', path: tasksDir, label: 'tasks', error: `task records path is not a directory: ${tasksDir}` }];
    }
  } else {
    return [];
  }

  const records = [];
  for (const entry of fs.readdirSync(tasksDir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const taskDir = safeResolveInside(tasksDir, entry.name, 'task directory');
    if (entry.isSymbolicLink()) {
      records.push({ taskName: entry.name, kind: 'invalid', path: taskDir, label: entry.name, error: `unsafe symlink task directory: ${taskDir}` });
      continue;
    }
    if (!entry.isDirectory()) continue;
    const feedbackPath = safeResolveInside(taskDir, RECORD_FILE, 'task record');
    if (fs.existsSync(feedbackPath) && fs.lstatSync(feedbackPath).isSymbolicLink()) {
      records.push({ taskName: entry.name, kind: 'invalid', path: feedbackPath, label: path.posix.join(entry.name, RECORD_FILE), error: `unsafe symlink task record: ${feedbackPath}` });
      continue;
    }
    if (!isRegularFileWithoutSymlink(feedbackPath)) {
      records.push({
        taskName: entry.name,
        kind: 'missing',
        path: feedbackPath,
        label: path.posix.join(entry.name, RECORD_FILE),
        error: `missing task execution record: ${path.posix.join(entry.name, RECORD_FILE)}`,
      });
      continue;
    }

    const label = path.posix.join(entry.name, RECORD_FILE);
    const content = fs.readFileSync(feedbackPath, 'utf8');
    try {
      records.push({
        taskName: entry.name,
        kind: 'structured',
        path: feedbackPath,
        label,
        record: parseAuditRecord(content, label),
      });
    } catch (error) {
      if (/missing audit record markers/u.test(error.message)) {
        records.push({ taskName: entry.name, kind: 'legacy', path: feedbackPath, label });
      } else {
        records.push({ taskName: entry.name, kind: 'invalid', path: feedbackPath, label, error: error.message });
      }
    }
  }
  return records;
}

function selectTaskRecords(records, options = {}) {
  if (options.task) {
    const selected = records.filter((entry) => entry.taskName === options.task);
    return selected.length > 0
      ? { status: 'ok', records: selected }
      : { status: 'partial', records: [], reason: `task record not found: ${options.task}` };
  }
  if (options.all) return { status: 'ok', records: records.slice().sort(byTaskName) };
  if (records.length === 0) return { status: 'none', records: [] };

  const dated = records.map((entry) => ({ entry, recordedAt: getRecordedAt(entry) }));
  if (dated.some(({ recordedAt }) => recordedAt === null)) {
    return {
      status: 'partial',
      records: [],
      reason: 'cannot choose the latest task because one or more records have missing or invalid recordedAt; use --task.',
    };
  }
  dated.sort((left, right) => right.recordedAt - left.recordedAt || left.entry.taskName.localeCompare(right.entry.taskName));
  if (dated.length > 1 && dated[0].recordedAt === dated[1].recordedAt) {
    return {
      status: 'partial',
      records: [],
      reason: 'multiple task records share the latest recordedAt; use --task or --all.',
    };
  }
  return { status: 'ok', records: [dated[0].entry] };
}

function getRecordedAt(entry) {
  const value = entry.kind === 'structured' && entry.record && entry.record.task && entry.record.task.recordedAt;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  const canonical = new Date(timestamp).toISOString();
  return value === canonical || value === canonical.replace('.000Z', 'Z') ? timestamp : null;
}

function isRegularFileWithoutSymlink(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.lstatSync(filePath);
  return stat.isFile() && !stat.isSymbolicLink();
}

function isDirectoryWithoutSymlink(dirPath) {
  if (!fs.existsSync(dirPath)) return false;
  const stat = fs.lstatSync(dirPath);
  return stat.isDirectory() && !stat.isSymbolicLink();
}

function countOccurrences(value, marker) {
  return value.split(marker).length - 1;
}

function byTaskName(left, right) {
  return left.taskName.localeCompare(right.taskName);
}

module.exports = {
  AUDIT_RECORD_BEGIN,
  AUDIT_RECORD_END,
  BOOTSTRAP_RECORD_BEGIN,
  BOOTSTRAP_RECORD_END,
  RECORD_FILE,
  VERIFICATION_RECORD_BEGIN,
  VERIFICATION_RECORD_END,
  getRecordedAt,
  loadTaskRecords,
  parseAuditRecord,
  parseBootstrapRecord,
  parseVerificationRecord,
  selectTaskRecords,
};
