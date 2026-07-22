const test = require('node:test');
const { assert, path } = require('./helpers');
const { DIMENSIONS, evaluateAudit, evaluateBootstrap } = require('../src/audit/evaluator');
const { formatAuditReport } = require('../src/audit/report');
const {
  completeBootstrapContent,
  evaluateFixture,
  workspaceFixture,
} = require('./support/audit-evaluator-fixtures');

test('all-task findings retain task name and record path attribution in stable reports', () => {
  const fixture = workspaceFixture();
  const entries = ['alpha', 'beta'].map((taskName) => ({
    taskName,
    kind: 'structured',
    path: path.join(fixture.workspaceRoot, 'agent-work', 'tasks', taskName, 'harness-feedback.md'),
    record: { schemaVersion: 1, task: { id: taskName, recordedAt: '2026-07-12T09:00:00Z' } },
  }));
  const result = evaluateAudit({
    workspaceRoot: fixture.workspaceRoot,
    harnessRoot: fixture.harnessRoot,
    bootstrapContent: completeBootstrapContent(),
    taskEntries: entries,
  });
  assert.ok(result.findings.length > 0);
  assert.ok(result.findings.every((finding) => finding.taskName && finding.taskPath));
  const report = formatAuditReport(result);
  assert.strictEqual(report, formatAuditReport(result));
  assert.match(report, /Task: alpha/);
  assert.match(report, /Path: .*alpha.*harness-feedback\.md/);
  assert.match(report, /Task: beta/);
});

test('stable report includes locations selected task every dimension findings limitation and status', () => {
  const fixture = workspaceFixture();
  const task = evaluateFixture();
  const bootstrap = evaluateBootstrap({ workspaceRoot: fixture.workspaceRoot, content: completeBootstrapContent() });
  const result = {
    status: 'PASS',
    workspaceRoot: fixture.workspaceRoot,
    harnessRoot: fixture.harnessRoot,
    selectedTasks: [{ taskName: 'task-213', recordedAt: '2026-07-12T09:00:00Z' }],
    dimensions: { Bootstrap: bootstrap, ...task.result.dimensions },
    findings: [],
  };
  const first = formatAuditReport(result);
  const second = formatAuditReport(result);
  assert.strictEqual(first, second);
  assert.match(first, /^Workspace: /m);
  assert.match(first, /^Harness: /m);
  assert.match(first, /^Selected task: task-213 \(2026-07-12T09:00:00Z\)$/m);
  for (const dimension of DIMENSIONS) assert.match(first, new RegExp(`^${dimension}: `, 'm'));
  assert.match(first, /^Findings: None$/m);
  assert.match(first, /Evidence limitation:.*self-reported.*cannot prove actual reads, command execution, or objective correctness/i);
  assert.match(first, /^Audit: PASS$/m);
});
