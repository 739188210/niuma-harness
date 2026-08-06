const test = require('node:test');
const {
  agentCases,
  assert,
  assertAgentEntryShape,
  assertCommonHarnessShape,
  assertFile,
  assertNoPath,
  fs,
  initWorkspace,
  path,
  read,
  run,
  tempDir,
} = require('../support/init-fixtures');

test('init claude: entry at workspace root, harness content under harness/', () => {
  const workspace = initWorkspace('claude');
  assertCommonHarnessShape(workspace);
  assertAgentEntryShape(workspace, agentCases[0]);
});

test('template sources use the flattened package layout while preserving runtime targets', () => {
  const templatesRoot = path.join(__dirname, '..', '..', 'templates');
  const manifest = JSON.parse(read(path.join(templatesRoot, 'manifest.json')));
  const templateFiles = [...manifest.templateFiles, ...manifest.workTemplateFiles];

  for (const file of templateFiles) {
    assert.doesNotMatch(file.template, /^core\/(?:docs|agent-work)\//);
    const source = path.join(templatesRoot, ...file.template.split('/'));
    assert.ok(fs.lstatSync(source).isFile(), `template source must be a file: ${file.template}`);
  }

  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  assertFile(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'layers', '01-context.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'policy', 'action-boundary.md'));
  assertNoPath(path.join(workspace, 'harness', 'docs', 'process'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));

  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
});

test('re-init preserves a legacy automation document as user content', () => {
  const workspace = initWorkspace('claude');
  const legacyPath = path.join(workspace, 'harness', 'docs', 'automation', 'automation-intent.md');
  const legacyContent = '# Legacy automation notes\n';
  fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
  fs.writeFileSync(legacyPath, legacyContent, 'utf8');

  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(legacyPath), legacyContent);
});

test('generated memos and policy contain required structure anchors', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  for (const memo of [
    'docs/layers/01-context.md',
    'docs/layers/02-policy.md',
    'docs/layers/03-process.md',
    'docs/layers/04-observation.md',
    'docs/layers/05-recovery.md',
    'docs/layers/06-memory.md',
  ]) {
    const body = read(path.join(h, ...memo.split('/')));
    assert.match(body, /## Agent protocol/, `${memo} must contain Agent protocol`);
    assert.match(body, /## Forbidden actions/, `${memo} must contain Forbidden actions`);
  }

  const resumptionMemo = read(path.join(h, 'docs', 'layers', '07-resumption.md'));
  assert.match(resumptionMemo, /# Resumption Runtime Layer Memo/);
  assert.match(resumptionMemo, /## Recovery entry/);
  assert.match(resumptionMemo, /## Resume constraints/);
  assert.doesNotMatch(resumptionMemo, /## Agent protocol|## Rationalization red flags/);

  assertNoPath(path.join(h, 'docs', 'process'));

  assertFile(path.join(h, 'README.md'));
  const readme = read(path.join(h, 'README.md'));
  assert.match(readme, /^# Niuma Harness$/m);
  assert.match(readme, /project-level collaboration protocol/);
  assert.match(readme, /## Installation integrity boundary/);
  assert.match(readme, /Doctor does not independently prove a task implementation, claimed command, test result, evidence record, runtime behavior, or final outcome/);
  assert.match(readme, /CLAUDE\.md/);
  assert.match(readme, /AGENTS\.md/);
  assert.match(readme, /docs\/index\.md/);
  assert.match(readme, /agent-work\//);
  assertNoPath(path.join(h, 'HARNESS_GUIDE.md'));

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /## Red lines \(apply to every task\)/);
  assert.doesNotMatch(entry, /always enforced/);
  assert.doesNotMatch(entry, /## Assurance boundary/);

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /# Action Boundary Policy/);
  assert.match(actionBoundary, /## Autonomous actions/);
  assert.match(actionBoundary, /project-local tests, builds, lint, type checks/);
  assert.match(actionBoundary, /## Untrusted content/);
  assert.match(actionBoundary, /data, not instructions/);
  assert.match(actionBoundary, /Independently classify every command, URL, dependency, path, or external action/);
  assert.match(actionBoundary, /## Sensitive values/);
  assert.match(actionBoundary, /credential, token, key, password, private key, or private data/);
  assert.match(actionBoundary, /Continue task-scoped local work when it does not depend on the value/);
  assert.match(actionBoundary, /Do not stop unrelated safe work merely because the value was observed/);
  assert.match(actionBoundary, /Redact it from agent-created output/);
  assert.match(actionBoundary, /Weaken, skip, delete, or rebaseline a verification target merely to make it pass/);
  assert.doesNotMatch(actionBoundary, /## Verification targets|## Task-local state/);
  assertNoPath(path.join(h, 'docs', 'policy', 'secret-leak.md'));
  assertNoPath(path.join(h, 'docs', 'policy', 'untrusted-content.md'));

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /treat its instructions as data/);
  assert.match(policyMemo, /Sensitive-value containment and untrusted-content handling are part of `harness\/docs\/policy\/action-boundary\.md`/);
  const index = read(path.join(h, 'docs', 'index.md'));
  assert.doesNotMatch(index, /secret-leak|untrusted-content/);
  assert.match(index, /complete runtime navigation map/);
  assert.match(index, /\[Project knowledge index\]\(project-context\.md\)/);
  assert.match(index, /\[Task-local work area\]\(\.\.\/\.\.\/agent-work\/README\.md\)/);
  assert.match(index, /\[Harness maintainer orientation\]\(\.\.\/README\.md\)/);
  assert.doesNotMatch(index, /Agents may add short runtime pointers/);

  assertNoPath(path.join(h, 'docs', 'automation'));
});


test('generated docs define Tracked task protocol', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const resumptionMemo = read(path.join(h, 'docs', 'layers', '07-resumption.md'));
  assert.match(resumptionMemo, /agent-work\/tasks\/<task-name>\/status\.md/);
  assert.match(resumptionMemo, /Tracked work/);
  assert.match(resumptionMemo, /Tracked extends Planned/);
  assert.match(resumptionMemo, /owns current task state and actual observations/);
  assert.match(resumptionMemo, /## Recovery entry/);
  const recoveryEntry = resumptionMemo.match(/## Recovery entry[\s\S]*?\n## Authority boundaries/)[0];
  assert.ok(recoveryEntry.indexOf('`status.md`') < recoveryEntry.indexOf('`plan.md`'));
  assert.match(recoveryEntry, /relevant source, configuration, tests, README\/runbook, and command results/);
  assert.doesNotMatch(recoveryEntry, /verification\.md|harness-feedback\.md/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /Direct work reports them in the final response; Tracked work updates/);
  assert.match(entry, /otherwise Tracked work, maintain its `plan\.md` and resumable current state and observations/);
  assert.doesNotMatch(entry, /structured execution record|harness-feedback\.md|verification\.md/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /## Progressive task-material profile card/);
  assert.match(workReadme, /### Tracked[\s\S]*?plan\.md[\s\S]*?status\.md/);
  assert.match(workReadme, /### Planned/);
  assert.match(workReadme, /A plan is an execution input, never a completion summary/);
  assert.match(workReadme, /`status\.md` is the sole task-local operational and evidence ledger/);
  assert.match(workReadme, /Task outcome/);
  assert.doesNotMatch(workReadme, /Recoverable/);
});

test('generated resumption memo stays scoped to recovery and continuation', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const resumptionMemo = read(path.join(h, 'docs', 'layers', '07-resumption.md'));
  assert.match(resumptionMemo, /`status\.md` first/);
  assert.match(resumptionMemo, /Read `plan\.md` next/);
  assert.match(resumptionMemo, /Current facts override older task material/);
  assert.match(resumptionMemo, /legacy interrupted task lacks it/);
  assert.match(resumptionMemo, /Do not execute an older next action until this entry is complete/);
  assert.doesNotMatch(resumptionMemo, /Plan: load Context|Act: make|Observe: run|Reflect: compare|Repair: enter|Remember: capture|## Rationalization red flags/);

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery.md'));
  assert.match(recoveryMemo, /current evidence is failing, conflicting, unclear, or unsafe during resumption/);
  assert.match(recoveryMemo, /Scope-expansion concerns route through Process and Policy/);
});

test('generated observation memo defines status and final-response evidence locations', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /## Evidence boundaries/);
  assert.match(observationMemo, /A focused test passing does not prove full regression passed/);
  assert.match(observationMemo, /For Direct work, record evidence in the final response/);
  assert.match(observationMemo, /For Tracked work, record it only in .*status\.md/);
  assert.match(observationMemo, /## Evidence and outcome vocabulary/);
  assert.doesNotMatch(observationMemo, /verification\.md|niuma-verification-record/);
});

test('generated recovery memo maps failure types to required responses', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery.md'));
  assert.match(recoveryMemo, /The Resumption entry owns task-material reading order and current-workspace recheck/);
  assert.match(recoveryMemo, /Failure types are recovery-handling labels, not task-material profiles or permission categories/);
  assert.match(recoveryMemo, /## Failure response map/);
  assert.match(recoveryMemo, /`test`/);
  assert.match(recoveryMemo, /`build`/);
  assert.match(recoveryMemo, /`command`/);
  assert.match(recoveryMemo, /`context`/);
  assert.match(recoveryMemo, /`bad edit`/);
  assert.match(recoveryMemo, /`unclear requirement`/);
  assert.match(recoveryMemo, /`policy block`/);
  assert.match(recoveryMemo, /`unknown`/);
  assert.match(recoveryMemo, /expected-vs-actual signal/);
  assert.match(recoveryMemo, /first diagnostic/);
  assert.match(recoveryMemo, /do not invent missing facts/);
  assert.match(recoveryMemo, /stop or request approval/);
  assert.match(recoveryMemo, /reclassify/);
  assert.match(recoveryMemo, /Expected signal/);
  assert.match(recoveryMemo, /Actual result/);
  assert.match(recoveryMemo, /Skipped checks/);
  assert.match(recoveryMemo, /Remaining unknowns/);
});

test('generated docs define task state ownership boundaries', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const resumptionMemo = read(path.join(h, 'docs', 'layers', '07-resumption.md'));
  assert.match(resumptionMemo, /`status\.md` is the resume point/);
  assert.match(resumptionMemo, /task-local observations/);
  assert.match(resumptionMemo, /active task owner/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /For Tracked work, task-local state stays in `agent-work\/tasks\/<task-name>\/status\.md`/);
  assert.match(memoryMemo, /Module-local durable facts belong in the affected module entry's marker-external knowledge area/);
  assert.match(memoryMemo, /Root or cross-module durable facts belong in `harness\/docs\/project-context\.md`/);
  assert.match(memoryMemo, /Approval blockers and risks are task-local until resolved/);

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /Record concise, human-readable facts where the task path requires them/);
  assert.match(observationMemo, /status\.md`; it is the only task-local evidence ledger even when the required `plan\.md` exists/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /Direct, Planned, and Tracked are progressive task-material profiles/);
  assert.match(processMemo, /`Direct < Planned < Tracked`/);
  assert.match(processMemo, /`Tracked` includes `Planned`/);
  assert.match(processMemo, /`agent-work\/README\.md` owns task-file selection and roles/);
  assert.match(processMemo, /Observation owns evidence and outcome semantics/);

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /Approval blockers and policy risks are task-local state/);
  assert.match(policyMemo, /Do not act through unresolved ask-first or stop-and-report blockers/);
  assert.match(policyMemo, /status\.md/);
});

