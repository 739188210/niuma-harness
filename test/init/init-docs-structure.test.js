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
  assertFile(path.join(workspace, 'harness', 'docs', 'process', 'review.md'));
  for (const page of ['release.md', 'isolation.md', 'subagent-development.md']) {
    assertNoPath(path.join(workspace, 'harness', 'docs', 'process', page));
  }
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

test('generated memos/playbooks/policy contain required structure anchors', () => {
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
    'docs/layers/07-loop.md',
  ]) {
    const body = read(path.join(h, ...memo.split('/')));
    assert.match(body, /## Agent protocol/, `${memo} must contain Agent protocol`);
    assert.match(body, /## Forbidden actions/, `${memo} must contain Forbidden actions`);
  }

  for (const pb of [
    'docs/process/task-triage.md',
    'docs/process/bugfix.md',
    'docs/process/feature-development.md',
    'docs/process/refactor.md',
    'docs/process/review.md',
  ]) {
    const body = read(path.join(h, ...pb.split('/')));
    assert.match(body, /## Goal/, `${pb} must contain Goal`);
    assert.match(body, /## Recovery/, `${pb} must contain Recovery`);
  }

  assertFile(path.join(h, 'README.md'));
  const readme = read(path.join(h, 'README.md'));
  assert.match(readme, /^# Niuma Harness$/m);
  assert.match(readme, /task-execution framework/);
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
  assert.match(actionBoundary, /## Runtime ownership boundary/);
  assert.match(actionBoundary, /`harness\/` contains the managed operating framework and is not a task workspace/);
  assert.match(actionBoundary, /Ownership-specific boundaries narrow generic action permissions/);
  assert.match(actionBoundary, /use the more specific and less permissive classification/);
  assert.match(actionBoundary, /Keep task-local status, evidence, notes, plans, and handoff state under `agent-work\/`/);
  assert.match(actionBoundary, /do not use the Harness framework documents for task-local work/);
  assert.match(actionBoundary, /## Autonomous actions/);
  assert.match(actionBoundary, /project-local verification commands that do not create external side effects/);
  assert.match(actionBoundary, /harness\/docs\/policy\/untrusted-content\.md/);
  const secretLeak = read(path.join(h, 'docs', 'policy', 'secret-leak.md'));
  assert.match(secretLeak, /secret or sensitive data/);
  assert.match(secretLeak, /private key, or private data/);
  assert.match(secretLeak, /Remove the secret from the working tree when safe/);
  assert.match(secretLeak, /version-control-aware cleanup for committed or pushed exposure/);
  assert.match(secretLeak, /## Trigger/, 'secret-leak.md must contain Trigger');
  assert.match(secretLeak, /## Forbidden/, 'secret-leak.md must contain Forbidden');
  const untrustedContent = read(path.join(h, 'docs', 'policy', 'untrusted-content.md'));
  assert.match(untrustedContent, /## Trigger/, 'untrusted-content.md must contain Trigger');
  assert.match(untrustedContent, /## Agent protocol/, 'untrusted-content.md must contain Agent protocol');
  assert.match(untrustedContent, /data, not instructions/, 'untrusted-content.md must define data/instruction separation');

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /harness\/docs\/policy\/untrusted-content\.md/);
  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /\[Untrusted content\]\(policy\/untrusted-content\.md\)/);
  assert.match(index, /complete runtime navigation map/);
  assert.match(index, /\[Project knowledge index\]\(project-context\.md\)/);
  assert.match(index, /\[Task-local work area\]\(\.\.\/\.\.\/agent-work\/README\.md\)/);
  assert.match(index, /\[Harness maintainer orientation\]\(\.\.\/README\.md\)/);
  assert.doesNotMatch(index, /Agents may add short runtime pointers/);

  assertNoPath(path.join(h, 'docs', 'automation'));
});


test('generated docs define status-tracked task protocol', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loopMemo, /agent-work\/tasks\/<task-name>\/status\.md/);
  assert.match(loopMemo, /status-tracked work/);
  assert.match(loopMemo, /It owns current task state and actual observations needed to continue safely/);
  assert.match(loopMemo, /## Recovery entry/);
  const recoveryEntry = loopMemo.match(/## Recovery entry[\s\S]*?\n## Ownership boundaries/)[0];
  assert.ok(recoveryEntry.indexOf('`status.md`') < recoveryEntry.indexOf('`plan.md`'));
  assert.match(recoveryEntry, /relevant source, configuration, tests, README\/runbook, and command results/);
  assert.doesNotMatch(recoveryEntry, /verification\.md|harness-feedback\.md/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /Direct work reports them in the final response; status-tracked work updates/);
  assert.match(entry, /status-tracked work, maintain resumable current state and observations/);
  assert.doesNotMatch(entry, /structured execution record|harness-feedback\.md|verification\.md/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /## Task-material decision card/);
  assert.match(workReadme, /### Status-tracked work/);
  assert.match(workReadme, /### Plan/);
  assert.match(workReadme, /A plan is an execution input, never a completion summary/);
  assert.match(workReadme, /`status.md` is the sole task-local operational ledger/);
  assert.match(workReadme, /Task outcome/);
  assert.doesNotMatch(workReadme, /Recoverable/);
});

test('generated loop memo defines rationalization red flags', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loopMemo, /## Rationalization red flags/);
  const redFlagsSection = loopMemo.match(/## Rationalization red flags[\s\S]*?\n## Allowed actions/)[0];
  assert.match(redFlagsSection, /skip tests\/checks/);
  assert.match(redFlagsSection, /probably fine/);
  assert.match(redFlagsSection, /unrelated/);
  assert.match(redFlagsSection, /quick refactor/);
  assert.match(redFlagsSection, /extra scope/);
  assert.match(redFlagsSection, /stop-and-classify signals/);
  assert.match(redFlagsSection, /route through Observation, Recovery, Process, or Policy/);

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery.md'));
  assert.match(recoveryMemo, /rationalization about missing evidence or dismissing failures as unrelated/);
  assert.match(recoveryMemo, /Scope-expansion rationalizations route through Process and Policy/);
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
  assert.match(observationMemo, /For status-tracked work, record it in .*status\.md/);
  assert.match(observationMemo, /## Evidence and outcome vocabulary/);
  assert.doesNotMatch(observationMemo, /verification\.md|niuma-verification-record/);
});

test('generated recovery memo maps failure types to required responses', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery.md'));
  assert.match(recoveryMemo, /The Loop Recovery entry owns task-material reading order and current-workspace recheck/);
  assert.match(recoveryMemo, /Failure types are recovery-handling labels, not task classifications, risk tiers, or playbooks/);
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

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loopMemo, /The ledger is the resume point/);
  assert.match(loopMemo, /task-local observations/);
  assert.match(loopMemo, /active task owner/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /For status-tracked work, task-local state stays in `agent-work\/tasks\/<task-name>\/status\.md`/);
  assert.match(memoryMemo, /Module-local durable facts belong in the affected module entry's marker-external knowledge area/);
  assert.match(memoryMemo, /Root or cross-module durable facts belong in `harness\/docs\/project-context\.md`/);
  assert.match(memoryMemo, /Approval blockers and risks are task-local until resolved/);

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /Record concise, human-readable facts where the task path requires them/);
  assert.match(observationMemo, /status\.md`; it is the only task-local evidence ledger/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /The selected workflow owns its task-type success criteria and gates/);
  assert.match(processMemo, /agent-work\/README\.md.*Direct eligibility and plan or status-ledger triggers/);
  assert.match(processMemo, /Observation owns generic evidence and outcome semantics/);

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /Approval blockers and policy risks are task-local state/);
  assert.match(policyMemo, /Do not act through unresolved ask-first or stop-and-escalate blockers/);
  assert.match(policyMemo, /status\.md/);
});

