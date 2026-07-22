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
