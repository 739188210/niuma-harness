const test = require('node:test');
const { parseArgs } = require('../src/args');
const { runAudit } = require('../src/audit');
const { assert, assertTreeUnchanged, fs, path, run, snapshotTree, tempDir } = require('./helpers');

test('audit parses task selection and strict mode', () => {
  const options = parseArgs(['audit', 'workspace', '--harness-dir', 'ai-harness', '--task', 'release-42', '--strict']);

  assert.strictEqual(options.command, 'audit');
  assert.strictEqual(options.targetDir, 'workspace');
  assert.strictEqual(options.harnessDir, 'ai-harness');
  assert.strictEqual(options.task, 'release-42');
  assert.strictEqual(options.all, false);
  assert.strictEqual(options.strict, true);
});

test('audit rejects conflicting task selectors, duplicate task, and unsupported command options', () => {
  assert.throws(
    () => parseArgs(['audit', '--task', 'one', '--all']),
    /--task and --all cannot be used together/
  );
  assert.throws(
    () => parseArgs(['audit', '--task', 'one', '--task', 'two']),
    /--task may only be provided once/
  );
  assert.throws(
    () => parseArgs(['audit', '--task', '../escape']),
    /--task must be a simple directory name/
  );
  assert.throws(
    () => parseArgs(['audit', '--agent', 'claude']),
    /audit only supports --harness-dir, --task, --all, and --strict/
  );
});

test('audit-only selectors are rejected for non-audit and unknown commands', () => {
  for (const command of ['init', 'doctor', 'check', 'repair', 'unknown']) {
    for (const option of [['--task', 'release-42'], ['--all'], ['--strict']]) {
      assert.throws(
        () => parseArgs([command, ...option]),
        /--task, --all, and --strict are only available for audit/,
        `${command} should reject ${option.join(' ')}`
      );
    }
  }
});

test('audit selects the newest structured record by recordedAt without modifying task files', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const tasks = path.join(workspace, 'agent-work', 'tasks');
  const earlier = path.join(tasks, 'earlier');
  const latest = path.join(tasks, 'latest');
  fs.mkdirSync(earlier, { recursive: true });
  fs.mkdirSync(latest, { recursive: true });
  const start = '<!-- niuma-audit-record:begin -->';
  const end = '<!-- niuma-audit-record:end -->';
  const body = (recordedAt) => `${start}\n\`\`\`json\n${JSON.stringify({ task: { recordedAt } })}\n\`\`\`\n${end}\n`;
  fs.writeFileSync(path.join(earlier, 'harness-feedback.md'), body('2026-07-11T08:00:00Z'));
  const latestPath = path.join(latest, 'harness-feedback.md');
  fs.writeFileSync(latestPath, body('2026-07-12T08:00:00Z'));
  const before = snapshotTree(tasks);

  result = run(['audit', workspace]);
  assert.strictEqual(result.status, 1, result.stderr);
  assert.match(result.stdout, /Selected task: latest \(2026-07-12T08:00:00Z\)/);
  assert.match(result.stdout, /Audit: FAIL/);
  assertTreeUnchanged(tasks, before);

  result = run(['audit', workspace, '--strict']);
  assert.strictEqual(result.status, 1, result.stderr);
  assertTreeUnchanged(tasks, before);
});

test('public audit CLI reports a partial task as Outcome and overall PARTIAL', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const taskDir = path.join(workspace, 'agent-work', 'tasks', 'partial-task');
  fs.mkdirSync(taskDir, { recursive: true });
  const record = passingAuditRecord('partial-task');
  record.task.declaredResult = 'partial';
  fs.writeFileSync(path.join(taskDir, 'harness-feedback.md'), markedAuditRecord(record));
  fs.writeFileSync(path.join(taskDir, 'verification.md'), markedVerificationRecord());

  result = run(['audit', workspace, '--task', 'partial-task']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Outcome: PARTIAL$/m);
  assert.match(result.stdout, /^Audit: PARTIAL$/m);
  assert.doesNotMatch(result.stdout, /^Audit: PASS$/m);
});

test('audit supports custom harness directories and direct harness invocation without changing tasks', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  const tasks = path.join(workspace, 'agent-work', 'tasks');
  fs.mkdirSync(path.join(tasks, 'release-42'), { recursive: true });
  fs.writeFileSync(
    path.join(tasks, 'release-42', 'harness-feedback.md'),
    auditRecord('2026-07-12T08:00:00.000Z')
  );
  const before = snapshotTree(tasks);

  result = run(['audit', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 1, result.stderr);
  assert.match(result.stdout, /Harness: .*ai-harness/);
  assert.match(result.stdout, /Selected task: release-42/);
  assertTreeUnchanged(tasks, before);

  result = run(['audit', path.join(workspace, 'ai-harness')]);
  assert.strictEqual(result.status, 1, result.stderr);
  assert.match(result.stdout, /Selected task: release-42/);
  assertTreeUnchanged(tasks, before);
});

test('audit exit code is reset deterministically for PARTIAL strictness', () => {
  const originalExitCode = process.exitCode;
  const originalLog = console.log;
  const originalError = console.error;
  const workspace = tempDir();
  let init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  console.log = () => {};
  console.error = () => {};
  try {
    process.exitCode = 1;
    runAudit({ targetDir: workspace, harnessDir: 'harness', strict: false });
    assert.strictEqual(process.exitCode, 0);

    runAudit({ targetDir: workspace, harnessDir: 'harness', strict: true });
    assert.strictEqual(process.exitCode, 1);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});

function markedAuditRecord(record) {
  return [
    '<!-- niuma-audit-record:begin -->',
    '```json',
    JSON.stringify(record),
    '```',
    '<!-- niuma-audit-record:end -->',
    '',
  ].join('\n');
}

function markedVerificationRecord() {
  return [
    '<!-- niuma-verification-record:begin -->',
    '```json',
    JSON.stringify({
      schemaVersion: 1,
      evidence: [{
        id: 'tests',
        kind: 'command',
        check: 'npm test',
        expectedSignal: 'Exit code 0',
        actualResult: 'All tests passed.',
        outcome: 'passed',
        exitCode: 0,
        remainingUnknowns: [],
      }],
    }),
    '```',
    '<!-- niuma-verification-record:end -->',
    '',
  ].join('\n');
}

function passingAuditRecord(taskId) {
  return {
    schemaVersion: 1,
    task: { id: taskId, recordedAt: '2026-07-12T09:00:00Z', tool: 'claude-code', requestSummary: 'Audit a fixture.', declaredResult: 'complete' },
    rating: { classification: 'bugfix', tier: 'normal', rationale: 'Localized evaluator fixture.', riskFactors: [], reclassified: false },
    context: {
      projectFiles: [{ path: 'CLAUDE.md', purpose: 'Confirm the generated entry contract.' }],
      harnessDocs: [{ path: 'harness/docs/process/bugfix.md', purpose: 'Select the bugfix process.' }],
      reusedImplementations: ['src/audit/evaluator.js'],
      knownGaps: [],
      sufficiency: 'sufficient',
    },
    boundary: {
      plannedActions: [{ id: 'audit-fixture', action: 'Audit fixture.', classification: 'autonomous', scope: 'Fixture files.' }],
      performedActions: [{ id: 'audit-fixture', action: 'Audit fixture.', classification: 'autonomous', scope: 'Fixture files.' }],
      authorizationReferences: [],
      scopeChanges: [],
    },
    execution: {
      playbook: 'bugfix',
      successCriteria: [{ id: 'criteria-1', description: 'Fixture test passes.' }],
      performedSteps: ['Created fixture.'],
      skippedSteps: [],
      decisionImpact: 'The fixture exercises public output.',
      alignment: 'aligned',
    },
    verification: {
      path: `agent-work/tasks/${taskId}/verification.md`,
      criteria: [{ criterionId: 'criteria-1', evidenceIds: ['tests'] }],
      declaredConclusion: 'passed',
    },
    recovery: { applicable: false },
    outcome: {
      criteria: [{ criterionId: 'criteria-1', status: 'passed', evidenceIds: ['tests'] }],
      knownGaps: [],
      regressionRisks: [],
      reviewResult: 'accepted',
    },
    evidenceSources: [{ kind: 'self-report' }],
  };
}

function auditRecord(recordedAt) {
  return [
    '<!-- niuma-audit-record:begin -->',
    '```json',
    JSON.stringify({ task: { recordedAt } }),
    '```',
    '<!-- niuma-audit-record:end -->',
    '',
  ].join('\n');
}

test('audit is documented and dispatched instead of reported as an unknown command', () => {
  const help = run(['--help']);
  assert.strictEqual(help.status, 0, help.stderr);
  assert.match(help.stdout, /niuma-harness audit \[target\]/);
  assert.match(help.stdout, /--task <name>/);
  assert.match(help.stdout, /--all/);
  assert.match(help.stdout, /--strict/);

  const result = run(['audit', tempDir()]);
  assert.notStrictEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /Unknown command: audit/);
  assert.match(result.stderr, /missing manifest\.json/);
});
