const test = require('node:test');
const { assert, fs, path, tempDir } = require('./helpers');
const {
  AUDIT_RECORD_BEGIN,
  AUDIT_RECORD_END,
  loadTaskRecords,
  parseAuditRecord,
  selectTaskRecords,
} = require('../src/audit/records');

function record(value) {
  return `${AUDIT_RECORD_BEGIN}\n\`\`\`json\n${JSON.stringify(value)}\n\`\`\`\n${AUDIT_RECORD_END}\n`;
}

test('parses exactly one marker JSON record', () => {
  const parsed = parseAuditRecord(record({ task: { recordedAt: '2026-07-12T08:00:00Z' } }), 'task-one/harness-feedback.md');

  assert.strictEqual(parsed.task.recordedAt, '2026-07-12T08:00:00Z');
});

test('rejects missing, duplicate, and invalid marker JSON records', () => {
  assert.throws(() => parseAuditRecord('legacy notes', 'task/harness-feedback.md'), /missing audit record markers/);
  assert.throws(() => parseAuditRecord(`${record({})}${record({})}`, 'task/harness-feedback.md'), /exactly one audit record block/);
  assert.throws(
    () => parseAuditRecord(`${AUDIT_RECORD_BEGIN}\n\`\`\`json\n{bad}\n\`\`\`\n${AUDIT_RECORD_END}`, 'task/harness-feedback.md'),
    /invalid audit record JSON/
  );
});

test('loads only direct regular task records without following task-directory or feedback-file symlinks', () => {
  const workDir = path.join(tempDir(), 'agent-work');
  const tasksDir = path.join(workDir, 'tasks');
  fs.mkdirSync(path.join(tasksDir, 'valid'), { recursive: true });
  fs.writeFileSync(path.join(tasksDir, 'valid', 'harness-feedback.md'), record({ task: { recordedAt: '2026-07-12T08:00:00Z' } }));
  fs.mkdirSync(path.join(tasksDir, 'legacy'), { recursive: true });
  fs.writeFileSync(path.join(tasksDir, 'legacy', 'harness-feedback.md'), 'old free-form record');
  fs.mkdirSync(path.join(tasksDir, 'nested', 'child'), { recursive: true });
  fs.writeFileSync(path.join(tasksDir, 'nested', 'child', 'harness-feedback.md'), record({ task: { recordedAt: '2026-07-13T08:00:00Z' } }));
  fs.mkdirSync(path.join(tasksDir, 'unrecorded'));
  fs.writeFileSync(path.join(tasksDir, 'unrecorded', 'status.md'), '# Task status\n');

  const outside = path.join(tempDir(), 'outside.md');
  fs.writeFileSync(outside, record({ task: { recordedAt: '2026-07-14T08:00:00Z' } }));
  fs.symlinkSync(path.dirname(outside), path.join(tasksDir, 'linked-task'));
  fs.mkdirSync(path.join(tasksDir, 'linked-feedback'), { recursive: true });
  fs.symlinkSync(outside, path.join(tasksDir, 'linked-feedback', 'harness-feedback.md'));

  const originalRead = fs.readFileSync;
  const reads = [];
  fs.readFileSync = (filePath, ...args) => {
    reads.push(path.resolve(filePath));
    return originalRead(filePath, ...args);
  };
  let records;
  try {
    records = loadTaskRecords(workDir);
  } finally {
    fs.readFileSync = originalRead;
  }
  assert.deepStrictEqual(records.map((entry) => [entry.taskName, entry.kind]), [
    ['legacy', 'legacy'],
    ['linked-feedback', 'invalid'],
    ['linked-task', 'invalid'],
    ['nested', 'missing'],
    ['unrecorded', 'missing'],
    ['valid', 'structured'],
  ]);
  assert.ok(!reads.includes(path.resolve(outside)), 'audit must not read outside symlink targets');
});

test('reports unsafe tasks container task directories and feedback files without following targets', () => {
  const root = tempDir();
  const workDir = path.join(root, 'agent-work');
  const outsideDir = tempDir();
  const outside = path.join(outsideDir, 'outside.md');
  fs.writeFileSync(outside, record({ task: { recordedAt: '2026-07-14T08:00:00Z' } }));
  fs.mkdirSync(workDir, { recursive: true });

  fs.symlinkSync(outsideDir, path.join(workDir, 'tasks'));
  let reads = 0;
  const originalRead = fs.readFileSync;
  fs.readFileSync = (filePath, ...args) => {
    if (path.resolve(filePath) === path.resolve(outside)) reads += 1;
    return originalRead(filePath, ...args);
  };
  try {
    const records = loadTaskRecords(workDir);
    assert.strictEqual(reads, 0);
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].kind, 'invalid');
    assert.match(records[0].error, /symlink/i);
  } finally {
    fs.readFileSync = originalRead;
  }

  fs.unlinkSync(path.join(workDir, 'tasks'));
  fs.mkdirSync(path.join(workDir, 'tasks', 'valid'), { recursive: true });
  fs.symlinkSync(outsideDir, path.join(workDir, 'tasks', 'linked-task'));
  fs.mkdirSync(path.join(workDir, 'tasks', 'linked-feedback'));
  fs.symlinkSync(outside, path.join(workDir, 'tasks', 'linked-feedback', 'harness-feedback.md'));
  const records = loadTaskRecords(workDir);
  assert.deepStrictEqual(records.map((entry) => [entry.taskName, entry.kind]), [
    ['linked-feedback', 'invalid'],
    ['linked-task', 'invalid'],
    ['valid', 'missing'],
  ]);
  assert.ok(records.filter((entry) => entry.kind === 'invalid').every((entry) => /symlink/i.test(entry.error)));
});

test('selects only an unambiguous latest strict UTC record without mtime fallback', () => {
  const records = [
    { taskName: 'earlier', kind: 'structured', record: { task: { recordedAt: '2026-07-11T08:00:00Z' } } },
    { taskName: 'latest', kind: 'structured', record: { task: { recordedAt: '2026-07-12T08:00:00.000Z' } } },
  ];

  const selected = selectTaskRecords(records, {});
  assert.deepStrictEqual(selected.records.map((entry) => entry.taskName), ['latest']);
  assert.strictEqual(selected.status, 'ok');

  const ambiguous = selectTaskRecords([...records, { taskName: 'legacy', kind: 'legacy' }], {});
  assert.strictEqual(ambiguous.status, 'partial');
  assert.match(ambiguous.reason, /cannot choose the latest/);
  assert.deepStrictEqual(selectTaskRecords(records, { task: 'earlier' }).records.map((entry) => entry.taskName), ['earlier']);
  assert.deepStrictEqual(selectTaskRecords(records, { all: true }).records.map((entry) => entry.taskName), ['earlier', 'latest']);
});

test('rejects non-UTC, impossible, and non-canonical recordedAt values for automatic selection', () => {
  const invalidRecordedAts = [
    '2026-07-12T08:00:00',
    '2026-07-12T08:00:00+08:00',
    '2026-02-30T08:00:00Z',
    '2026-07-12T08:00:00Z trailing',
  ];

  for (const recordedAt of invalidRecordedAts) {
    const selected = selectTaskRecords([
      { taskName: 'valid', kind: 'structured', record: { task: { recordedAt: '2026-07-11T08:00:00Z' } } },
      { taskName: 'invalid', kind: 'structured', record: { task: { recordedAt } } },
    ], {});
    assert.strictEqual(selected.status, 'partial', recordedAt);
    assert.match(selected.reason, /missing or invalid recordedAt/, recordedAt);
  }
});

test('requires explicit selection when multiple records share the maximum recordedAt', () => {
  const records = [
    { taskName: 'first', kind: 'structured', record: { task: { recordedAt: '2026-07-12T08:00:00Z' } } },
    { taskName: 'second', kind: 'structured', record: { task: { recordedAt: '2026-07-12T08:00:00.000Z' } } },
  ];

  const selected = selectTaskRecords(records, {});
  assert.strictEqual(selected.status, 'partial');
  assert.deepStrictEqual(selected.records, []);
  assert.match(selected.reason, /multiple task records share the latest recordedAt; use --task or --all/);
});
