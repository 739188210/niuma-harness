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
} = require('./init-fixtures');

test('init claude: entry at workspace root, harness content under harness/', () => {
  const workspace = initWorkspace('claude');
  assertCommonHarnessShape(workspace);
  assertAgentEntryShape(workspace, agentCases[0]);
});

test('template sources use the flattened package layout while preserving runtime targets', () => {
  const templatesRoot = path.join(__dirname, '..', 'templates');
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
    'docs/process/release.md',
  ]) {
    const body = read(path.join(h, ...pb.split('/')));
    assert.match(body, /## Goal/, `${pb} must contain Goal`);
    assert.match(body, /## Recovery/, `${pb} must contain Recovery`);
  }

  assertFile(path.join(h, 'README.md'));
  const readme = read(path.join(h, 'README.md'));
  assert.match(readme, /^# Niuma Harness$/m);
  assert.match(readme, /general entry/);
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
  assert.match(index, /harness\/docs\/policy\/untrusted-content\.md/);
  assert.match(index, /navigation map for the harness/);
  assert.match(index, /`harness\/docs\/project-context\.md` stores verified stable project facts/);
  assert.match(index, /`agent-work\/` stores task-local notes, plans, verification evidence, and handoff state/);
  assert.match(index, /`harness\/README\.md` explains the harness structure and how to use it\./);
  assert.doesNotMatch(index, /Agents may add short runtime pointers/);

  assertNoPath(path.join(h, 'docs', 'automation'));
});


test('generated docs define task status ledger protocol and guide task record shape', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loopMemo, /agent-work\/tasks\/<task-name>\/status\.md/);
  assert.match(loopMemo, /multi-step, risky, parallel, or interruptible/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /status\.md/);
  assert.match(memoryMemo, /task-local operational state/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /status\.md/);

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

test('generated observation memo defines evidence schema', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /## Evidence schema/);
  assert.match(observationMemo, /niuma-verification-record:begin/);
  assert.match(observationMemo, /"kind": "command"/);
  assert.match(observationMemo, /"check"/);
  assert.match(observationMemo, /"expectedSignal"/);
  assert.match(observationMemo, /"actualResult"/);
  assert.match(observationMemo, /"outcome": "passed"/);
  assert.match(observationMemo, /"exitCode": 0/);
  assert.match(observationMemo, /"remainingUnknowns"/);
  assert.match(observationMemo, /outcome: "skipped"/);
  assert.match(observationMemo, /`status\.md` may summarize verification state, but it does not replace evidence/);
  assert.match(observationMemo, /project-local commands documented in `harness\/docs\/project-context\.md`/);
  assert.match(observationMemo, /use `harness\/docs\/index\.md` only as navigation/);
  assert.doesNotMatch(observationMemo, /project-local commands documented in `harness\/docs\/index\.md`/);
  assert.match(observationMemo, /final Observation verifies the integrated result/);
});

test('generated recovery memo maps failure types to required responses', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery.md'));
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
  assert.match(loopMemo, /`status\.md` owns the operational resume state/);
  assert.match(loopMemo, /does not own detailed verification evidence, task notes, or durable project facts/);
  assert.match(loopMemo, /active task owner/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /Task-local state stays in `agent-work\/tasks\/<task-name>\/`/);
  assert.match(memoryMemo, /Module-local durable facts belong in the affected module entry's marker-external knowledge area/);
  assert.match(memoryMemo, /Root or cross-module durable facts belong in `harness\/docs\/project-context\.md`/);
  assert.match(memoryMemo, /Approval blockers and risks are task-local until resolved/);

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /Verification evidence owns exact commands, expected signals, actual results, skipped checks with reasons, and remaining unknowns/);
  assert.match(observationMemo, /`status\.md` may summarize verification state, but it does not replace evidence/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /The selected workflow owns the success criteria and required task state/);
  assert.match(processMemo, /Parallel or delegated work must keep ownership explicit/);

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /Approval blockers and policy risks are task-local state/);
  assert.match(policyMemo, /Do not act through unresolved ask-first or stop-and-escalate blockers/);
  assert.match(policyMemo, /record explicit-request exceptions and stop-blocker resolutions/);
});

