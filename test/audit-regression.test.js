const test = require('node:test');
const {
  AUDIT_RECORD_BEGIN,
  AUDIT_RECORD_END,
  BOOTSTRAP_RECORD_BEGIN,
  BOOTSTRAP_RECORD_END,
  VERIFICATION_RECORD_BEGIN,
  VERIFICATION_RECORD_END,
  parseAuditRecord,
  parseBootstrapRecord,
  parseVerificationRecord,
} = require('../src/audit/records');
const {
  allRuleDirs,
  assert,
  assertTreeUnchanged,
  fs,
  path,
  read,
  readJson,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');

function replaceMarkerRecord(content, begin, end, record) {
  const start = content.indexOf(begin);
  const finish = content.indexOf(end, start);
  assert.ok(start >= 0 && finish > start, `expected ${begin} before ${end}`);
  return `${content.slice(0, start)}${markerRecord(begin, end, record)}${content.slice(finish + end.length)}`;
}

function markerRecord(begin, end, record) {
  return `${begin}\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n${end}`;
}

function materializeDocumentedPassingTask(workspace) {
  const projectContextPath = path.join(workspace, 'harness', 'docs', 'project-context.md');
  const projectContext = read(projectContextPath);
  const bootstrap = parseBootstrapRecord(projectContext, 'generated project-context.md');
  assert.strictEqual(bootstrap.status, 'pending');
  Object.assign(bootstrap, {
    status: 'complete',
    recordedAt: '2026-07-12T08:00:00Z',
    filesInspected: ['harness/manifest.json'],
    scanScope: 'Generated Harness manifest, documentation, and workspace task area.',
    knownGaps: [],
  });
  let completedContext = replaceMarkerRecord(projectContext, BOOTSTRAP_RECORD_BEGIN, BOOTSTRAP_RECORD_END, bootstrap);
  completedContext = completedContext
    .replace('## Project summary\n', '## Project summary\n\nA generated Niuma Harness test workspace.\n')
    .replace('## Technology stack\n', '## Technology stack\n\nNode.js CLI-generated Markdown documents.\n')
    .replace('## Code map\n', '## Code map\n\n`harness/` contains managed docs and `agent-work/` contains runtime records.\n')
    .replace('# test\n', 'npm test\n');
  fs.writeFileSync(projectContextPath, completedContext);
  assert.strictEqual(parseBootstrapRecord(read(projectContextPath)).status, 'complete');

  const feedbackDoc = read(path.join(workspace, 'harness', 'docs', 'experiments', 'task-execution-record.md'));
  const taskRecord = parseAuditRecord(feedbackDoc, 'generated task-execution-record.md');
  assert.strictEqual(taskRecord.task.id, 'example-task');

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  const documentedVerification = parseVerificationRecord(workReadme, 'generated agent-work/README.md');
  assert.strictEqual(documentedVerification.schemaVersion, 1);
  const evidenceTemplate = documentedVerification.evidence[0];
  const verificationRecord = {
    schemaVersion: 1,
    evidence: [
      { ...evidenceTemplate, id: 'focused-docs', check: 'node test/init-docs.test.js', actualResult: 'Focused documentation tests passed.' },
      { ...evidenceTemplate, id: 'full-tests', check: 'npm test', actualResult: 'The full regression suite passed.' },
    ],
  };

  const taskDir = path.join(workspace, 'agent-work', 'tasks', taskRecord.task.id);
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(
    path.join(taskDir, 'harness-feedback.md'),
    `${markerRecord(AUDIT_RECORD_BEGIN, AUDIT_RECORD_END, taskRecord)}\nDocumented example materialized verbatim.\n`,
  );
  fs.writeFileSync(
    path.join(taskDir, 'verification.md'),
    `${markerRecord(VERIFICATION_RECORD_BEGIN, VERIFICATION_RECORD_END, verificationRecord)}\n`,
  );
  return taskDir;
}

test('generated marker examples parse with production code and materialize to strict audit PASS', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);

  const taskDir = materializeDocumentedPassingTask(workspace);
  const before = snapshotTree(taskDir);
  result = run(['audit', workspace, '--task', 'example-task', '--strict']);
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /^Bootstrap: PASS$/m);
  assert.match(result.stdout, /^Audit: PASS$/m);
  assertTreeUnchanged(taskDir, before);
});

test('unrecorded direct task directories remain visible and prevent implicit latest selection', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);

  const passingTaskDir = materializeDocumentedPassingTask(workspace);
  const unrecordedName = 'unrecorded-task';
  const unrecordedTaskDir = path.join(path.dirname(passingTaskDir), unrecordedName);
  fs.mkdirSync(unrecordedTaskDir, { recursive: true });
  fs.writeFileSync(path.join(unrecordedTaskDir, 'notes.md'), 'No harness-feedback record exists.\n');

  result = run(['audit', workspace, '--all', '--strict']);
  assert.strictEqual(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /^Selected task: example-task \(2026-07-12T09:00:00Z\)$/m);
  assert.match(result.stdout, /^Selected task: unrecorded-task$/m);
  assert.match(result.stdout, /missing task execution record: unrecorded-task\/harness-feedback\.md/);
  assert.match(result.stdout, /^Audit: PARTIAL$/m);
  assert.doesNotMatch(result.stdout, /^Audit: PASS$/m);

  result = run(['audit', workspace, '--task', unrecordedName, '--strict']);
  assert.strictEqual(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /^Selected task: unrecorded-task$/m);
  assert.match(result.stdout, /missing task execution record: unrecorded-task\/harness-feedback\.md/);
  assert.match(result.stdout, /^Audit: PARTIAL$/m);
  assert.doesNotMatch(result.stdout, /^Audit: PASS$/m);

  result = run(['audit', workspace]);
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /^Selected task: None$/m);
  assert.match(result.stdout, /cannot choose the latest task because one or more records have missing or invalid recordedAt; use --task\./);
  assert.match(result.stdout, /^Audit: PARTIAL$/m);
  assert.doesNotMatch(result.stdout, /^Selected task: example-task/m);
});

test('runtime task trees and legacy records survive every managed lifecycle operation byte-identically', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const passingTaskDir = materializeDocumentedPassingTask(workspace);
  const tasksDir = path.dirname(passingTaskDir);
  const legacyDir = path.join(tasksDir, 'legacy-task');
  fs.mkdirSync(path.join(legacyDir, 'nested'), { recursive: true });
  const legacyBytes = Buffer.from('# Legacy feedback\r\n\r\nFree-form evidence stays untouched.\r\n', 'utf8');
  fs.writeFileSync(path.join(legacyDir, 'harness-feedback.md'), legacyBytes);
  fs.writeFileSync(path.join(legacyDir, 'nested', 'opaque.bin'), Buffer.from([0, 255, 1, 2, 3]));
  const before = snapshotTree(tasksDir);

  result = run(['audit', workspace, '--task', 'legacy-task']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /^Audit: PARTIAL$/m);
  assert.deepStrictEqual(fs.readFileSync(path.join(legacyDir, 'harness-feedback.md')), legacyBytes);
  assertTreeUnchanged(tasksDir, before);

  const selectedRule = allRuleDirs.find((name) => name === 'common') || allRuleDirs[0];
  result = run(['init', workspace, '--agent', 'multi', '--rules', selectedRule, '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertTreeUnchanged(tasksDir, before);

  result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stdout);
  assertTreeUnchanged(tasksDir, before);

  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /(?:BACKUP|CREATE|REPLACE|REMOVE)\s+agent-work\/tasks(?:\/|\b)/);
  assertTreeUnchanged(tasksDir, before);

  fs.appendFileSync(path.join(workspace, 'harness', 'docs', 'layers', '04-observation.md'), '\nmanaged drift\n');
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /04-observation\.md/);
  assert.doesNotMatch(result.stdout, /(?:BACKUP|CREATE|REPLACE|REMOVE)\s+agent-work\/tasks(?:\/|\b)/);
  assertTreeUnchanged(tasksDir, before);

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repair completed\. Doctor passed/);
  assertTreeUnchanged(tasksDir, before);

  const manifest = readJson(path.join(workspace, 'harness', 'manifest.json'));
  assert.ok(manifest.artifacts.every((artifact) => !artifact.target.startsWith('agent-work/tasks/')));
  assert.deepStrictEqual(fs.readFileSync(path.join(legacyDir, 'harness-feedback.md')), legacyBytes);
});
