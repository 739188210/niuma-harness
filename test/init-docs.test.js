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
  assert.match(index, /tool-managed navigation map/);
  assert.match(index, /stable project facts in `harness\/docs\/project-context\.md`/);
  assert.match(index, /task-local pointers in `agent-work\/`/);
  assert.match(index, /`harness\/README\.md` explains the harness structure and how to use it\./);
  assert.doesNotMatch(index, /Agents may add short runtime pointers/);

  assertNoPath(path.join(h, 'docs', 'automation'));
});

test('generated docs prioritize task facts and route context reading by need', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /## Fact priority/);
  assert.match(index, /1\. Current user instructions for this task decide the task objective, scope, and explicit constraints\./);
  assert.match(index, /2\. Current verifiable facts: current source, configuration, build definitions, tests, and actual command output\./);
  assert.match(index, /3\. Current project navigation and runtime material: current README, `harness\/docs\/project-context\.md`, and verified runbooks\./);
  assert.match(index, /4\. Governance and reusable knowledge: applicable Rules, accepted and unsuperseded ADRs, and active experience records\./);
  assert.match(index, /5\. Historical and task material: historical notes, migration material, old proposals, plans, task records, and superseded or expired experience\./);
  assert.match(index, /A file existing in the repository does not by itself make it a current fact/);
  assert.match(index, /## Policy exception/);
  assert.match(index, /Action permission, security boundaries, and ownership conflicts are not decided by ordinary fact priority/);
  assert.match(index, /more specific and stricter Policy rule decides/);
  assert.match(index, /Read only the task-relevant stable facts/);
  assert.match(index, /Before relying on a project-context fact, inspect task-relevant current README, build files, configuration, source, tests, or command output/);

  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  assert.match(context, /fact priority, and the Policy exception/);
  assert.match(context, /Classify each task-relevant source as current verifiable fact/);
  assert.match(context, /A file existing in the repository is not automatically a current fact/);
  assert.match(context, /Current verifiable evidence determines task-specific facts/);
  assert.match(context, /Use Rules, accepted and unsuperseded ADRs, and active experience/);
  assert.match(context, /historical materials only as background, search terms, or hypotheses/);
  assert.match(context, /more specific, stricter Policy rule/);

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /verified durable context, not an active-task override/);
  assert.match(projectContext, /Current user instructions and current workspace files take precedence/);
  assert.match(projectContext, /verify the current state, use the current facts for the task, and then update or mark the durable fact as stale/);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customIndex = read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md'));
  const customContext = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '01-context.md'));

  assert.match(customIndex, /`ai-harness\/docs\/project-context\.md`/);
  assert.match(customContext, /`ai-harness\/docs\/index\.md`/);
  const customEntry = read(path.join(customWorkspace, 'CLAUDE.md'));
  assert.match(customEntry, /Root or cross-module durable facts belong only in `ai-harness\/docs\/project-context\.md`/);
  assert.match(customEntry, /Their single source of truth is[\s\S]*ai-harness\/docs\/project-context\.md/);
  assert.match(customContext, /`ai-harness\/docs\/project-context\.md`/);
  assert.doesNotMatch(customIndex, /{{HARNESS_DIR}}|`harness\/docs\//);
  assert.doesNotMatch(customContext, /{{HARNESS_DIR}}|`harness\/docs\//);
});

test('generated docs route module knowledge by scope', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  const memory = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  const index = read(path.join(h, 'docs', 'index.md'));

  assert.doesNotMatch(entry, /module-topology|module-local|module entry|local supplements/i);
  assert.match(entry, /root or cross-module durable facts/);
  assert.match(context, /module knowledge area/);
  assert.match(context, /current module files/);
  assert.match(memory, /module-local durable facts/);
  assert.match(memory, /root or cross-module durable facts/);
  assert.match(memory, /`agent-work\//);
  assert.match(index, /marker-external module knowledge/);
  assert.match(index, /Cross-module verification triggers/);
  assert.match(index, /module-local checks alone are insufficient/);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  for (const body of [
    read(path.join(customWorkspace, 'CLAUDE.md')),
    read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '01-context.md')),
    read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '06-memory.md')),
    read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md')),
  ]) {
    assert.doesNotMatch(body, /{{HARNESS_DIR}}|`harness\//);
  }
});

test('generated docs route durable decisions without taking ownership of project ADRs', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const decisionReadme = path.join(h, 'docs', 'decisions', 'README.md');

  const guide = read(decisionReadme);
  assert.match(guide, /^# Decision Records$/m);
  assert.match(guide, /long-lived decision and its rationale/);
  assert.match(guide, /Do not create a record for every task/);
  assert.match(guide, /Current user instructions and current workspace files take precedence/);
  assert.match(guide, /verify the current state, use the higher-priority source for the task, and then update, supersede, or retire the record/);
  assert.match(guide, /Individual decision records are project-maintained/);
  for (const field of ['Status', 'Date', 'Scope', 'Source of truth', 'Context', 'Decision', 'Consequences', 'Alternatives considered', 'Verification or migration notes']) {
    assert.match(guide, new RegExp(`## ${field}`));
  }
  assert.match(guide, /Current source files, configuration, tests, verified runbooks, or command\/output evidence to re-check/);
  assert.match(guide, /This ADR records decision rationale; it is not the current-state authority/);

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /Governance and reusable knowledge: applicable Rules, accepted and unsuperseded ADRs, and active experience records/);
  assert.match(index, /Historical and task material: historical notes, migration material, old proposals, plans, task records/);

  const harnessReadme = read(path.join(h, 'README.md'));
  assert.match(harnessReadme, /`docs\/decisions\/`: project-maintained long-lived decision records and rationale/);
  assert.match(harnessReadme, /Only `docs\/decisions\/README\.md` is tool-managed; individual decision records are project-maintained/);

  const memory = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memory, /Put important long-lived decision rationale in project-maintained records under `harness\/docs\/decisions\//);
  assert.match(memory, /Do not promote every task decision, one-off log, unverified guess, or sensitive detail into a decision record/);

  const projectAdr = path.join(h, 'docs', 'decisions', '0001-example.md');
  const projectAdrContent = '# Project decision\n\nKeep this exact content.\n';
  fs.writeFileSync(projectAdr, projectAdrContent, 'utf8');
  const reinit = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(reinit.status, 0, reinit.stderr);
  assert.strictEqual(read(projectAdr), projectAdrContent);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customGuide = read(path.join(customWorkspace, 'ai-harness', 'docs', 'decisions', 'README.md'));
  const customIndex = read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md'));
  const customMemory = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '06-memory.md'));
  assert.match(customGuide, /`ai-harness\/docs\/decisions\//);
  assert.match(customIndex, /`ai-harness\/docs\/decisions\//);
  assert.match(customMemory, /`ai-harness\/docs\/decisions\//);
  for (const body of [customGuide, customIndex, customMemory]) {
    assert.doesNotMatch(body, /{{HARNESS_DIR}}|`harness\/docs\//);
  }
});

test('generated docs route reusable experience without taking ownership of project experience records', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const experienceReadme = path.join(h, 'docs', 'experience', 'README.md');

  const guide = read(experienceReadme);
  assert.match(guide, /^# Experience Library$/m);
  assert.match(guide, /reusable project-maintained experience/);
  assert.match(guide, /not a current-state source of truth, project fact index, ADR, or task execution record/);
  assert.match(guide, /Do not create a record for every task/);
  assert.match(guide, /Do not promote raw task notes, one-off failures, temporary logs, unverified guesses, or sensitive data/);
  assert.match(guide, /Current user instructions and current workspace files take precedence/);
  assert.match(guide, /Individual experience records are project-maintained/);
  for (const field of ['Status', 'Last verified', 'Scope', 'Source of truth', 'Applicable when', 'Scenario or symptoms', 'Verified approach', 'What not to assume', 'Invalidation conditions', 'Promotion notes']) {
    assert.match(guide, new RegExp(`## ${field}`));
  }

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /Governance and reusable knowledge: applicable Rules, accepted and unsuperseded ADRs, and active experience records/);
  assert.match(index, /superseded or expired experience/);

  const harnessReadme = read(path.join(h, 'README.md'));
  assert.match(harnessReadme, /`docs\/experience\/`: project-maintained reusable lessons/);
  assert.match(harnessReadme, /Only `docs\/experience\/README\.md` is tool-managed; individual experience records are project-maintained/);

  const memory = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memory, /Put verified reusable experience with clear applicability and invalidation conditions in project-maintained records under `harness\/docs\/experience\//);
  assert.match(memory, /Do not promote raw task notes, one-off failures, temporary logs, unverified guesses, or sensitive details into experience records/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /candidate reusable experience/);
  assert.match(workReadme, /`harness\/docs\/experience\//);

  const projectExperience = path.join(h, 'docs', 'experience', 'pagination.md');
  const projectExperienceContent = '# Pagination lesson\n\nKeep this exact content.\n';
  fs.writeFileSync(projectExperience, projectExperienceContent, 'utf8');
  const reinit = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(reinit.status, 0, reinit.stderr);
  assert.strictEqual(read(projectExperience), projectExperienceContent);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customGuide = read(path.join(customWorkspace, 'ai-harness', 'docs', 'experience', 'README.md'));
  const customIndex = read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md'));
  const customMemory = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '06-memory.md'));
  const customWorkReadme = read(path.join(customWorkspace, 'agent-work', 'README.md'));
  for (const body of [customGuide, customIndex, customMemory, customWorkReadme]) {
    assert.match(body, /`ai-harness\/docs\/experience\//);
    assert.doesNotMatch(body, /{{HARNESS_DIR}}|`harness\/docs\//);
  }
});

test('generated docs expose experimental task execution feedback guidance', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const feedbackDoc = read(path.join(h, 'docs', 'experiments', 'task-execution-record.md'));
  assert.match(feedbackDoc, /Task Execution Feedback Record/);
  assert.match(feedbackDoc, /enabled by the current Niuma Harness package/);
  assert.match(feedbackDoc, /not workspace-disableable/);
  assert.match(feedbackDoc, /deleting this document does not disable the requirement/);
  assert.match(feedbackDoc, /niuma-audit-record:begin/);
  assert.match(feedbackDoc, /"scopeChanges": \[\]/);
  assert.match(feedbackDoc, /"deviations": \[\]/);
  assert.match(feedbackDoc, /"authorizationReferences": \[\]/);
  assert.match(feedbackDoc, /"declaredResult": "success"/);
  assert.match(feedbackDoc, /"evidenceSources"/);
  assert.match(feedbackDoc, /structured task execution record/);
  assert.match(feedbackDoc, /Use a record for every non-trivial task/);
  assert.match(feedbackDoc, /For a trivial task, state in the final response that no separate record was needed/);
  assert.doesNotMatch(feedbackDoc, /For a trivial read-only task/);
  assert.doesNotMatch(feedbackDoc, /niuma-harness audit/);
  assert.doesNotMatch(feedbackDoc, /audit source of truth/);
  assert.doesNotMatch(feedbackDoc, /can be removed or disabled/i);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /Non-trivial tasks must maintain the structured execution record/);
  assert.doesNotMatch(entry, /niuma-harness audit/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /harness-feedback\.md/);
  assert.match(workReadme, /required structured execution record for non-trivial tasks/);
  assert.doesNotMatch(workReadme, /niuma-harness audit/);
  assert.match(workReadme, /Package-enabled experimental Harness execution records/);
  assert.doesNotMatch(workReadme, /while .*task-execution-record\.md.*exists/i);
  assert.match(workReadme, /niuma-verification-record:begin/);
  assert.match(workReadme, /"kind": "command"/);
  assert.match(workReadme, /"exitCode": 0/);
  assert.match(workReadme, /"remainingUnknowns": \[\]/);


  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /harness\/docs\/experiments\//);
  assert.match(index, /Task execution feedback: `harness\/docs\/experiments\/task-execution-record\.md`/);
});

test('generated project context defines first-use bootstrap protocol', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /niuma-bootstrap-record:begin/);
  assert.match(projectContext, /"schemaVersion": 1/);
  assert.match(projectContext, /"status": "pending"/);
  assert.match(projectContext, /"recordedAt": null/);
  assert.match(projectContext, /"filesInspected": \[\]/);
  assert.match(projectContext, /"scanScope": "Not scanned"/);
  assert.match(projectContext, /"knownGaps"/);
  assert.match(projectContext, /## Bootstrap protocol/);
  assert.match(projectContext, /one-time full initial project scan after `niuma-harness init`/);
  assert.match(projectContext, /not scoped to the current user request/);
  assert.match(projectContext, /A small task, an obvious reference implementation, or a task-local shortcut is not a valid reason to skip bootstrap/);
  assert.match(projectContext, /Minimum bootstrap scan/);
  assert.match(projectContext, /package manifests, lockfiles, workspace or monorepo config/);
  assert.match(projectContext, /Set `status` to `complete` only when the basic project map, stack, commands, and known gaps are usefully initialized/);
  assert.match(projectContext, /Set `status` to `partial` only when the scan is blocked/);
  assert.match(projectContext, /Remove only this explanatory `Bootstrap protocol` section/);
  assert.match(projectContext, /## Maintenance standard/);
  assert.match(projectContext, /Update this file after bootstrap only when a task verifies a durable fact/);
  assert.match(projectContext, /Maintain these categories when evidence exists/);
  assert.match(projectContext, /Do not store/);
  assert.doesNotMatch(projectContext, /Unknown until verified/);
  assert.doesNotMatch(projectContext, /Record the product purpose/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /if bootstrap status is `pending`, complete its one-time initial project scan before non-trivial work/);
  assert.match(entry, /# Project overrides/);
  assert.match(entry, /Root or cross-module durable facts belong only in `harness\/docs\/project-context\.md`/);
  assert.match(entry, /Do not duplicate root project structure, code maps, commands, dependency or tooling state/);
  assert.match(entry, /Their single source of truth is[\s\S]*harness\/docs\/project-context\.md/);
  assert.match(projectContext, /is the single source of truth for durable root or cross-module project facts/);
  assert.match(projectContext, /Do not copy its project summary, code map, commands, dependency or tooling state, known gaps, or architecture facts into the root entry file's Project overrides area/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /Bootstrap `harness\/docs\/project-context\.md` when its structured bootstrap record has `"status": "pending"`/);
  assert.match(memoryMemo, /perform the one-time initial project scan defined in that file/);
  assert.match(memoryMemo, /record only verified durable facts/);
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
});

test('generated feature docs define pre-plan confirmation gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const featurePlaybook = read(path.join(h, 'docs', 'process', 'feature-development.md'));
  assert.match(featurePlaybook, /Confirm understanding before planning/);
  assert.match(featurePlaybook, /Before writing a detailed plan, PRD, architecture note, task list, or implementation/);
  assert.match(featurePlaybook, /unclear scope, missing acceptance criteria, or meaningful design choices/);
  assert.match(featurePlaybook, /If an open question can change the implementation direction, ask the user/);
  assert.match(featurePlaybook, /already gave complete requirements and approval/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /confirmation gate defined by the selected workflow/);
});

test('generated process memo maps triggers to workflows and artifacts', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /## Trigger and artifact routing/);
  assert.match(processMemo, /harness\/docs\/process\/bugfix\.md/);
  assert.match(processMemo, /Reproduction signal/);
  assert.match(processMemo, /harness\/docs\/process\/feature-development\.md/);
  assert.match(processMemo, /Acceptance criteria/);
  assert.match(processMemo, /harness\/docs\/process\/refactor\.md/);
  assert.match(processMemo, /Behavior baseline/);
  assert.match(processMemo, /harness\/docs\/process\/review\.md/);
  assert.match(processMemo, /Findings with severity/);
  assert.match(processMemo, /harness\/docs\/process\/release\.md/);
  assert.match(processMemo, /package or artifact scope/);
  assert.match(processMemo, /Observation schema/);
  assert.match(processMemo, /Trigger words are routing hints, not permission to bypass Policy/);
  assert.match(processMemo, /If multiple rows match, start with `harness\/docs\/process\/task-triage\.md`/);
  assert.match(processMemo, /Do not duplicate/);
});

test('generated process playbooks define required artifact contracts', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const triage = read(path.join(h, 'docs', 'process', 'task-triage.md'));
  assert.match(triage, /## Required artifact\/checklist/);
  assert.match(triage, /Task classification/);
  assert.match(triage, /Whether a `status\.md` ledger is needed/);

  const feature = read(path.join(h, 'docs', 'process', 'feature-development.md'));
  assert.match(feature, /## Required artifact\/checklist/);
  assert.match(feature, /Acceptance criteria/);
  assert.match(feature, /keep status, context, plan, verification, and handoff notes/);

  const bugfix = read(path.join(h, 'docs', 'process', 'bugfix.md'));
  assert.match(bugfix, /## Required artifact\/checklist/);
  assert.match(bugfix, /Reproduction signal/);

  const refactor = read(path.join(h, 'docs', 'process', 'refactor.md'));
  assert.match(refactor, /## Required artifact\/checklist/);
  assert.match(refactor, /Behavior baseline/);
  assert.match(refactor, /keep status, context, plan, verification, and handoff notes/);

  const review = read(path.join(h, 'docs', 'process', 'review.md'));
  assert.match(review, /## Required artifact\/checklist/);
  assert.match(review, /Findings grouped by severity/);
  assert.match(review, /## Fix boundary/);
  assert.match(review, /Fixing findings is a separate action/);

  const release = read(path.join(h, 'docs', 'process', 'release.md'));
  assert.match(release, /## Required artifact\/checklist/);
  assert.match(release, /Release target/);
  assert.match(release, /Package or artifact scope/);
  assert.match(release, /touch external systems, credentials, quotas, or release infrastructure/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /shared tree would create avoidable risk or coordination cost/);
  assert.match(processMemo, /Do not isolate merely because a task has more than one step/);
  assert.doesNotMatch(processMemo, /If the work is multi-step, risky, or parallel, isolate/);
});

test('generated subagent playbook defines parent integration gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const isolation = read(path.join(h, 'docs', 'process', 'isolation.md'));
  assert.match(isolation, /shared workspace would create avoidable risk or coordination cost/);
  assert.match(isolation, /Do not isolate merely because a task has more than one step/);
  assert.match(isolation, /materially reduces risk or coordination cost/);
  assert.match(isolation, /Overlap with another active task in the shared tree/);
  assert.match(isolation, /local worktree isolation rules/);
  assert.match(isolation, /newly created local task branch/);
  assert.match(isolation, /shared working tree does not need to be clean/);
  assert.match(isolation, /must not stage, revert, overwrite, clean, or otherwise modify shared-tree files/);
  assert.match(isolation, /Copying local-only config or using credentials is not part of worktree creation/);
  assert.match(isolation, /invalid isolation path/);
  assert.match(isolation, /fall back to task-scoped work in the shared tree/);
  assert.doesNotMatch(isolation, /Use this playbook to isolate multi-step, risky, or parallel work/);
  assert.doesNotMatch(isolation, /dirty tree/);
  assert.doesNotMatch(isolation, /task-scoped commits in the shared tree/);

  const subagent = read(path.join(h, 'docs', 'process', 'subagent-development.md'));
  assert.match(subagent, /## Default review/);
  assert.match(subagent, /one read-only review covering specification compliance and code quality/);
  assert.match(subagent, /large, high-risk, or cross-cutting work/);
  assert.match(subagent, /two focused passes/);
  assert.match(subagent, /independent reviewer is available/);
  assert.match(subagent, /did not write the code it reviews/);
  assert.match(subagent, /no suitable reviewer capability exists/);
  assert.match(subagent, /clearly labeled self-review/);
  assert.match(subagent, /Do not claim independent review occurred/);
  assert.match(subagent, /## Parent integration gate/);
  assert.match(subagent, /parent `status\.md` updates/);
  assert.match(subagent, /active task owner owns the final integrated result/);
  assert.match(subagent, /changed or reviewed files/);
  assert.match(subagent, /verification evidence/);
  assert.match(subagent, /Overlapping edits/);
  assert.match(subagent, /conflicting verification claims/);
  assert.match(subagent, /CRITICAL or HIGH review findings/);
  assert.match(subagent, /enter Recovery instead of silently choosing one/);
  assert.match(subagent, /final Observation over the integrated workspace/);
  assert.match(subagent, /supporting evidence, not a replacement/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(processMemo, /parent flow or active task owner is responsible for integrating delegated outputs/);

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loopMemo, /integrated delegated state, conflicts, and next action/);

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /final Observation verifies the integrated result/);
});

test('generated docs define external side-effect network gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /## Local worktree isolation/);
  assert.match(actionBoundary, /avoid[a-z ]*risk or coordination cost/);
  assert.match(actionBoundary, /outside the target repository's shared working tree/);
  assert.match(actionBoundary, /dedicated agent-owned isolation directory/);
  assert.match(actionBoundary, /do not create worktrees inside normal source, docs, config, output, or other repository-owned paths/);
  assert.doesNotMatch(actionBoundary, /such as `\.claude\/worktrees\/`/);
  assert.match(actionBoundary, /newly created task branch remains local-only/);
  assert.match(actionBoundary, /no upstream tracking, PR, or remote branch creation/);
  assert.match(actionBoundary, /does not push to or otherwise touch remotes/);
  assert.match(actionBoundary, /does not merge, delete, force-clean, rewrite history, or modify existing files in the shared working tree/);
  assert.match(actionBoundary, /shared working tree does not need to be clean/);
  assert.match(actionBoundary, /Existing uncommitted files do not block autonomous worktree creation/);
  assert.match(actionBoundary, /copy local-only config, or use credentials/);
  assert.match(actionBoundary, /## External side-effect \/ network gate/);
  assert.match(actionBoundary, /Public documentation and web lookup is autonomous/);
  assert.match(actionBoundary, /read-only, unauthenticated/);
  assert.match(actionBoundary, /does not upload/);
  assert.match(actionBoundary, /does not write to an external system/);
  assert.match(actionBoundary, /does not consume limited quota/);
  assert.match(actionBoundary, /Calling external APIs or services/);
  assert.match(actionBoundary, /authenticated access, credentials, cookies, tokens/);
  assert.match(actionBoundary, /Uploading files, logs, code, artifacts/);
  assert.match(actionBoundary, /Installing dependencies, running remote install scripts/);
  assert.match(actionBoundary, /CI jobs, remote jobs, deploy previews/);
  assert.match(actionBoundary, /Writing comments, issues, pull requests/);
  assert.match(actionBoundary, /Publish, deploy, tag, release, push, or bump package versions/);
  assert.match(actionBoundary, /Delete, overwrite, revoke, rotate, mutate/);
  assert.match(actionBoundary, /Transmit secrets, credentials, tokens, private data/);
  assert.match(actionBoundary, /large-scale crawling, load testing, scraping/);

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy.md'));
  assert.match(policyMemo, /before network or external-service actions/);
  assert.doesNotMatch(policyMemo, /## External side-effect \/ network gate/);
});

test('generated docs define test-change gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /## Test-change gate/);
  assert.match(actionBoundary, /Verification targets include tests, assertions, snapshots/);
  assert.match(actionBoundary, /Agents may add new tests or strengthen existing checks/);
  assert.match(actionBoundary, /do not edit, delete, skip, weaken, or rebaseline verification targets/);
  assert.match(actionBoundary, /Changing an existing verification target is ask-first/);
  assert.match(actionBoundary, /task explicitly requests test maintenance/);
  assert.match(actionBoundary, /target conflicts with verified intended behavior/);
  assert.match(actionBoundary, /replacement coverage/);
  assert.match(actionBoundary, /A request to turn red into green by weakening, skipping, deleting, or rebaselining verification targets is not valid test maintenance/);
  assert.match(actionBoundary, /The user asks to turn red into green by weakening, skipping, deleting, or rebaselining verification targets/);
  const forbiddenUnlessRequested = actionBoundary.match(
    /## Forbidden unless explicitly requested[\s\S]*?## Always stop and escalate/,
  )[0];
  assert.doesNotMatch(
    forbiddenUnlessRequested,
    /verification targets|weaken tests|loosen assertions|remove assertions|delete failing checks|skip tests|rebaseline snapshots|lower coverage|just to pass/,
  );

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observationMemo, /If verification fails, treat the failing check as evidence/);
  assert.match(observationMemo, /Do not move verification targets after a failure/);
  assert.match(observationMemo, /test-change gate in `harness\/docs\/policy\/action-boundary\.md`/);
  assert.match(observationMemo, /replacement coverage preserves the behavior contract/);

  const bugfix = read(path.join(h, 'docs', 'process', 'bugfix.md'));
  assert.match(bugfix, /The reproduction check is a verification target/);
  assert.match(bugfix, /never remove the only reproduction without a replacement/);

  const refactor = read(path.join(h, 'docs', 'process', 'refactor.md'));
  assert.match(refactor, /baseline verification as the behavior boundary/);
  assert.match(refactor, /Changing tests during a refactor is ask-first/);
  assert.match(refactor, /purely mechanical and preserves the same assertions/);
});

test('generated docs require practical TDD for eligible behavior work', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const protocol = read(path.join(h, 'docs', 'process', 'test-driven-development.md'));
  assert.match(protocol, /stable automated test/);
  assert.match(protocol, /## RED → same-target GREEN → optional REFACTOR/);
  assert.match(protocol, /must genuinely fail/);
  assert.match(protocol, /same target/);
  assert.match(protocol, /time pressure, convenience, inability to find a test, and test complexity/i);
  assert.match(protocol, /not trusted proof of the agent's chronological execution order/);

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /Test-driven development: `harness\/docs\/process\/test-driven-development\.md`/);

  const process = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(process, /test-first versus alternative verification decision before implementation/);
  assert.match(process, /harness\/docs\/process\/test-driven-development\.md/);

  const feature = read(path.join(h, 'docs', 'process', 'feature-development.md'));
  assert.match(feature, /Classify each acceptance criterion before implementation/);
  assert.match(feature, /automation-unsuitability reason and replacement evidence before implementation/);

  const bugfix = read(path.join(h, 'docs', 'process', 'bugfix.md'));
  assert.match(bugfix, /focused failing regression test before the fix/);
  assert.match(bugfix, /same target pass afterward/);
  assert.match(bugfix, /valid alternative-verification plan/);

  const refactor = read(path.join(h, 'docs', 'process', 'refactor.md'));
  assert.match(refactor, /Do not manufacture an artificial RED for a pure refactor/);
  assert.match(refactor, /Route behavior changes or behavior-changing tests through feature\/bugfix plus `harness\/docs\/process\/test-driven-development\.md`/);

  const observation = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observation, /## Test-first evidence/);
  assert.match(observation, /focused RED and GREEN as separate truthful evidence entries/);
  assert.match(observation, /do not prove execution order/);
  assert.match(observation, /record Recovery as applicable and link the GREEN recheck/);

  const policy = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(policy, /task-scoped test creation or updates needed to express approved changed behavior or regression coverage/);
  assert.match(policy, /prior behavior contract is preserved or strengthened/);
});
