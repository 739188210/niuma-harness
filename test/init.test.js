const test = require('node:test');
const {
  allCommandFiles,
  allRuleDirs,
  allSkillDirs,
  assert,
  assertClaudeRulePointers,
  assertCommandFiles,
  assertDir,
  assertFile,
  assertLayerMemos,
  assertManifest,
  assertNoCodexRulesDir,
  assertNoOpenCodeManagedRulesInstruction,
  assertNoPath,
  assertOpenCodeRulesInstruction,
  assertRuleDirs,
  assertSkillDirs,
  getCommandId,
  expectedDefaultRules,
  fs,
  path,
  read,
  readJson,
  run,
  tempDir,
} = require('./helpers');
const { addAgentRules, getDefaultRulesForAgent, normalizeRules, normalizeRulesOut } = require('../src/rules');
const { normalizeSkills } = require('../src/skills');

const agentCases = [
  { agent: 'claude', entryFiles: ['CLAUDE.md'], absentEntryFiles: ['AGENTS.md'] },
  { agent: 'codex', entryFiles: ['AGENTS.md'], absentEntryFiles: ['CLAUDE.md'] },
  { agent: 'opencode', entryFiles: ['AGENTS.md'], absentEntryFiles: ['CLAUDE.md'] },
  { agent: 'multi', entryFiles: ['CLAUDE.md', 'AGENTS.md'], absentEntryFiles: [] },
];
const primarySkill = allSkillDirs[0];
const gitSyncCommand = allCommandFiles.includes('git-sync.md') ? 'git-sync.md' : allCommandFiles[0];

function assertCommonHarnessShape(workspace, options = {}) {
  const harnessDir = options.harnessDir || 'harness';
  const harnessRoot = path.join(workspace, harnessDir);

  assertFile(path.join(harnessRoot, 'HARNESS_GUIDE.md'));
  assertFile(path.join(harnessRoot, 'docs', 'index.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'action-boundary.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'secret-leak.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'untrusted-content.md'));
  assertDir(path.join(harnessRoot, 'docs', 'experiments'));
  assertFile(path.join(harnessRoot, 'docs', 'experiments', 'task-execution-record.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'refactor.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'review.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'release.md'));
  assertLayerMemos(harnessRoot);
  assertNoPath(path.join(harnessRoot, 'docs', 'layers', '01-context'));
  assertDir(path.join(workspace, 'agent-work'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));
  assertDir(path.join(workspace, 'agent-work', 'tasks'));
  assertNoPath(path.join(harnessRoot, 'docs', 'tasks'));
  assertNoPath(path.join(harnessRoot, 'agent-work'));
}

function assertAgentEntryShape(workspace, scenario, options = {}) {
  const harnessDir = options.harnessDir || 'harness';
  const harnessRoot = path.join(workspace, harnessDir);

  for (const entryFile of scenario.entryFiles) {
    assertFile(path.join(workspace, entryFile));
  }

  for (const entryFile of scenario.absentEntryFiles) {
    assertNoPath(path.join(workspace, entryFile));
  }

  for (const entryFile of ['CLAUDE.md', 'AGENTS.md']) {
    assertNoPath(path.join(harnessRoot, entryFile));
  }

  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: scenario.agent,
    entryFiles: scenario.entryFiles,
    harnessDir,
  });
}

function initWorkspace(agent) {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', agent]);
  assert.strictEqual(result.status, 0, result.stderr);
  return workspace;
}

function readTextTree(root, options = {}) {
  const tree = {};
  const excludedPrefixes = options.exclude || [];

  function walk(currentDir, prefix) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excludedPrefixes.some((excludedPrefix) => relativePath === excludedPrefix || relativePath.startsWith(`${excludedPrefix}/`))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(entryPath, relativePath);
      } else if (entry.isFile()) {
        tree[relativePath] = read(entryPath);
      }
    }
  }

  walk(root, '');
  return tree;
}

test('init claude: entry at workspace root, harness content under harness/', () => {
  const workspace = initWorkspace('claude');
  assertCommonHarnessShape(workspace);
  assertAgentEntryShape(workspace, agentCases[0]);
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

  const guide = read(path.join(h, 'HARNESS_GUIDE.md'));
  assert.match(guide, /### Tool-managed scaffold files/);
  assert.match(guide, /`docs\/policy\/action-boundary\.md`: core action permission boundary/);
  assert.doesNotMatch(guide, /team-maintained action permission boundaries/);

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /## Autonomous actions/);
  assert.match(actionBoundary, /project-local verification commands that do not create external side effects/);
  assert.match(actionBoundary, /docs\/policy\/untrusted-content\.md/);
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
  assert.match(policyMemo, /docs\/policy\/untrusted-content\.md/);
  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /docs\/policy\/untrusted-content\.md/);
  assert.match(index, /tool-managed navigation map/);
  assert.match(index, /stable project facts in `docs\/project-context\.md`/);
  assert.match(index, /task-local pointers in `agent-work\/`/);
  assert.doesNotMatch(index, /Agents may add short runtime pointers/);

  assertNoPath(path.join(h, 'docs', 'automation', 'hooks.md'));
  const automationIntent = read(path.join(h, 'docs', 'automation', 'automation-intent.md'));
  assert.match(automationIntent, /# Automation Intent/);
  assert.match(automationIntent, /## Ownership/);
  assert.match(automationIntent, /Agents maintain this file during normal work/);
  assert.match(automationIntent, /Human maintainers retain final policy control/);
  assert.match(automationIntent, /human participation is not required for routine evidence-based updates/);
});

test('generated docs expose experimental task execution feedback guidance', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const feedbackDoc = read(path.join(h, 'docs', 'experiments', 'task-execution-record.md'));
  assert.match(feedbackDoc, /Task Execution Feedback Record/);
  assert.match(feedbackDoc, /active experimental requirement/);
  assert.match(feedbackDoc, /harness-feedback\.md/);
  assert.match(feedbackDoc, /While this file exists/);
  assert.match(feedbackDoc, /Justified\?/);
  assert.match(feedbackDoc, /## Decision impact/);
  assert.match(feedbackDoc, /Changed decision\?/);
  assert.match(feedbackDoc, /## Candidate project-context updates/);
  assert.match(feedbackDoc, /Suggested action/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /docs\/experiments\/task-execution-record\.md` exists/);
  assert.match(entry, /non-trivial tasks must record skipped harness steps, deviations, and friction/);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /harness-feedback\.md/);
  assert.match(workReadme, /required for non-trivial tasks while `harness\/docs\/experiments\/task-execution-record\.md` exists/);

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /docs\/experiments\//);
  assert.match(index, /Task execution feedback: `docs\/experiments\/task-execution-record\.md`/);
});

test('generated project context defines first-use bootstrap protocol', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /Bootstrap status: pending/);
  assert.match(projectContext, /## Bootstrap protocol/);
  assert.match(projectContext, /one-time full initial project scan after `niuma-harness init`/);
  assert.match(projectContext, /not scoped to the current user request/);
  assert.match(projectContext, /A small task, an obvious reference implementation, or a task-local shortcut is not a valid reason to skip bootstrap/);
  assert.match(projectContext, /Minimum bootstrap scan/);
  assert.match(projectContext, /package manifests, lockfiles, workspace or monorepo config/);
  assert.match(projectContext, /Set Bootstrap status to `complete` only when the basic project map, stack, commands, and known gaps are usefully initialized/);
  assert.match(projectContext, /Set Bootstrap status to `partial` only when the scan is blocked/);
  assert.match(projectContext, /remove this `Bootstrap protocol` section/);
  assert.match(projectContext, /## Maintenance standard/);
  assert.match(projectContext, /Update this file after bootstrap only when a task verifies a durable fact/);
  assert.match(projectContext, /Maintain these categories when evidence exists/);
  assert.match(projectContext, /Do not store/);
  assert.doesNotMatch(projectContext, /Unknown until verified/);
  assert.doesNotMatch(projectContext, /Record the product purpose/);

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /if bootstrap status is `pending`, complete its one-time initial project scan before non-trivial work/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /Bootstrap `docs\/project-context\.md` when its metadata says `Bootstrap status: pending`/);
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

  const guide = read(path.join(h, 'HARNESS_GUIDE.md'));
  assert.match(guide, /agent-work\/tasks\/<task-name>\//);
  assert.match(guide, /status\.md/);
  assert.match(guide, /explicit status/);
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
  assert.match(observationMemo, /Check/);
  assert.match(observationMemo, /Expected signal/);
  assert.match(observationMemo, /Actual result/);
  assert.match(observationMemo, /Skipped checks/);
  assert.match(observationMemo, /Remaining unknowns/);
  assert.match(observationMemo, /`status\.md` may summarize verification state, but it does not replace evidence/);
  assert.match(observationMemo, /project-local commands documented in `docs\/project-context\.md`/);
  assert.match(observationMemo, /use `docs\/index\.md` only as navigation/);
  assert.doesNotMatch(observationMemo, /project-local commands documented in `docs\/index\.md`/);
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
  assert.match(memoryMemo, /Durable facts belong in `docs\/project-context\.md` only after verification/);
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
  assert.match(processMemo, /docs\/process\/bugfix\.md/);
  assert.match(processMemo, /Reproduction signal/);
  assert.match(processMemo, /docs\/process\/feature-development\.md/);
  assert.match(processMemo, /Acceptance criteria/);
  assert.match(processMemo, /docs\/process\/refactor\.md/);
  assert.match(processMemo, /Behavior baseline/);
  assert.match(processMemo, /docs\/process\/review\.md/);
  assert.match(processMemo, /Findings with severity/);
  assert.match(processMemo, /docs\/process\/release\.md/);
  assert.match(processMemo, /package or artifact scope/);
  assert.match(processMemo, /Observation schema/);
  assert.match(processMemo, /Trigger words are routing hints, not permission to bypass Policy/);
  assert.match(processMemo, /If multiple rows match, start with `docs\/process\/task-triage\.md`/);
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
  assert.match(observationMemo, /test-change gate in `docs\/policy\/action-boundary\.md`/);
  assert.match(observationMemo, /replacement coverage preserves the behavior contract/);

  const bugfix = read(path.join(h, 'docs', 'process', 'bugfix.md'));
  assert.match(bugfix, /The reproduction check is a verification target/);
  assert.match(bugfix, /never remove the only reproduction without a replacement/);

  const refactor = read(path.join(h, 'docs', 'process', 'refactor.md'));
  assert.match(refactor, /baseline verification as the behavior boundary/);
  assert.match(refactor, /Changing tests during a refactor is ask-first/);
  assert.match(refactor, /purely mechanical and preserves the same assertions/);
});

test('--tool is an alias for --agent', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--tool', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
});

for (const scenario of agentCases.filter((entry) => entry.agent === 'codex' || entry.agent === 'opencode')) {
  test(`init ${scenario.agent}: AGENTS.md at root`, () => {
    const workspace = initWorkspace(scenario.agent);
    assertAgentEntryShape(workspace, scenario);
  });
}

test('init multi: both CLAUDE.md and AGENTS.md', () => {
  const workspace = initWorkspace('multi');
  assertAgentEntryShape(workspace, agentCases.find((scenario) => scenario.agent === 'multi'));
});

test('entry file carries the operating contract zone', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const body = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(body, /<!-- niuma-harness:contract begin/, 'entry must open the contract zone');
  assert.match(body, /<!-- niuma-harness:contract end/, 'entry must close the contract zone');
  assert.match(body, /Operating Loop/, 'entry must contain the operating loop');
  assert.match(body, /harness\/docs\/index\.md/, 'entry must point agents to the harness index');
  assert.match(body, /harness\/docs\/layers\/01-context\.md/, 'entry depth links must include the harness directory');
  assert.doesNotMatch(body, /\(depth: `docs\//, 'entry depth links must not use workspace-root docs paths');
});

test('multi mode shares one entry source so both files are identical', () => {
  const workspace = initWorkspace('multi');
  const claude = read(path.join(workspace, 'CLAUDE.md'));
  const agents = read(path.join(workspace, 'AGENTS.md'));
  assert.strictEqual(claude, agents, 'CLAUDE.md and AGENTS.md must share one source');
});

test('init produces parity scaffold across supported agents', () => {
  for (const scenario of agentCases) {
    const workspace = initWorkspace(scenario.agent);
    assertCommonHarnessShape(workspace);
    assertAgentEntryShape(workspace, scenario);

    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, `${scenario.agent} doctor failed: ${doctor.stderr}`);
  }
});

test('all agent entry files share the same generated contract source', () => {
  const baselineWorkspace = initWorkspace('claude');
  const baseline = read(path.join(baselineWorkspace, 'CLAUDE.md'));

  for (const scenario of agentCases) {
    const workspace = scenario.agent === 'claude' ? baselineWorkspace : initWorkspace(scenario.agent);

    for (const entryFile of scenario.entryFiles) {
      assert.strictEqual(
        read(path.join(workspace, entryFile)),
        baseline,
        `${scenario.agent} ${entryFile} should match the claude entry contract`,
      );
    }
  }
});

test('all agents generate the same runtime-neutral docs', () => {
  const baselineWorkspace = initWorkspace('claude');
  const baselineDocs = readTextTree(path.join(baselineWorkspace, 'harness', 'docs'), { exclude: ['rules'] });
  const baselineWorkReadme = read(path.join(baselineWorkspace, 'agent-work', 'README.md'));

  for (const scenario of agentCases.filter((entry) => entry.agent !== 'claude')) {
    const workspace = initWorkspace(scenario.agent);
    assert.deepStrictEqual(
      readTextTree(path.join(workspace, 'harness', 'docs'), { exclude: ['rules'] }),
      baselineDocs,
      `${scenario.agent} docs should match claude docs`,
    );
    assert.strictEqual(
      read(path.join(workspace, 'agent-work', 'README.md')),
      baselineWorkReadme,
      `${scenario.agent} agent-work README should match claude agent-work README`,
    );
  }
});

test('default rules include common and agent-specific adapters', () => {
  for (const scenario of agentCases) {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    const expectedRules = expectedDefaultRules(scenario.agent);

    assertFile(path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md'));
    assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'common', 'hooks.md'));
    assertRuleDirs(harnessRoot, expectedRules);
    if (scenario.agent === 'claude' || scenario.agent === 'multi') {
      assertClaudeRulePointers(workspace, 'harness', expectedRules);
    }
    if (scenario.agent === 'opencode' || scenario.agent === 'multi') {
      assertOpenCodeRulesInstruction(workspace, 'harness', expectedRules);
    }
    if (scenario.agent === 'codex' || scenario.agent === 'multi') {
      assert.match(read(path.join(workspace, 'AGENTS.md')), /harness\/docs\/rules\//);
      assertNoCodexRulesDir(workspace);
    }
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: scenario.agent,
      rules: expectedRules,
      entryFiles: scenario.entryFiles,
    });
  }
});

test('--rules none installs no rule files', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const contextMemo = path.join(harnessRoot, 'docs', 'layers', '01-context.md');
  assertDir(path.join(harnessRoot, 'docs', 'rules'));
  assertRuleDirs(harnessRoot, []);
  assertClaudeRulePointers(workspace, 'harness', []);
  assert.ok(read(contextMemo).length > 0, 'layer memos should not be affected by --rules none');
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: [],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

test('re-init preserves selected rule files', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const ruleFile = path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md');
  fs.writeFileSync(ruleFile, 'custom rule\n', 'utf8');

  const pointerFile = path.join(workspace, '.claude', 'rules', 'niuma-common.md');
  fs.writeFileSync(pointerFile, 'custom pointer\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(ruleFile), 'custom rule\n', 'selected rule file should be preserved on re-init');
  assert.match(read(pointerFile), /harness\/docs\/rules\/common\//, 'native rule pointer should be refreshed on re-init');
  assertRuleDirs(harnessRoot, expectedDefaultRules('claude'));
});

test('re-init converges rules from common to none', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, expectedDefaultRules('claude'));
  fs.writeFileSync(path.join(harnessRoot, 'docs', 'rules', 'common', 'local.md'), 'local rule\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, []);
  assertClaudeRulePointers(workspace, 'harness', []);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: [],
    entryFiles: ['CLAUDE.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

if (allRuleDirs.length > 1) {
  test('--rules all then a specific rule converges on re-init', () => {
    const workspace = tempDir();
    const selectedRule = 'common';
    const expectedRules = addAgentRules([selectedRule], 'claude', allRuleDirs);
    let result = run(['init', workspace, '--agent', 'claude', '--rules', 'all']);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, allRuleDirs);

    result = run(['init', workspace, '--agent', 'claude', '--rules', selectedRule]);
    assert.strictEqual(result.status, 0, result.stderr);
    assertRuleDirs(harnessRoot, expectedRules);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: expectedRules,
      entryFiles: ['CLAUDE.md'],
    });
    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, doctor.stderr);
  });
}

for (const scenario of [
  { rules: 'common', expected: addAgentRules(['common'], 'claude', allRuleDirs) },
  { rules: 'web', expected: addAgentRules(['web'], 'claude', allRuleDirs) },
  { rules: 'typescript', expected: addAgentRules(['typescript'], 'claude', allRuleDirs) },
  { rules: 'java', expected: addAgentRules(['java'], 'claude', allRuleDirs) },
  { rules: 'python', expected: addAgentRules(['python'], 'claude', allRuleDirs) },
  { rules: 'fastapi', expected: addAgentRules(['fastapi'], 'claude', allRuleDirs) },
  { rules: 'web,typescript', expected: addAgentRules(['web', 'typescript'], 'claude', allRuleDirs) },
  { rules: 'java,web', expected: addAgentRules(['java', 'web'], 'claude', allRuleDirs) },
  { rules: 'java,typescript', expected: addAgentRules(['java', 'typescript'], 'claude', allRuleDirs) },
  { rules: 'python,fastapi', expected: addAgentRules(['python', 'fastapi'], 'claude', allRuleDirs) },
  { rules: 'all', expected: allRuleDirs },
]) {
  test(`--rules ${scenario.rules} installs expected dirs`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules', scenario.rules]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, scenario.expected);
    if (scenario.expected.includes('typescript')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'coding-style.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'patterns.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'typescript', 'hooks.md'));
    }
    if (scenario.expected.includes('java')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'coding-style.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'patterns.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'java', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'java', 'hooks.md'));
    }
    if (scenario.expected.includes('python')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'python', 'coding-style.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'python', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'python', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'python', 'patterns.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'python', 'hooks.md'));
    }
    if (scenario.expected.includes('fastapi')) {
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'patterns.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'testing.md'));
      assertFile(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'security.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'coding-style.md'));
      assertNoPath(path.join(harnessRoot, 'docs', 'rules', 'fastapi', 'hooks.md'));
    }
    assertClaudeRulePointers(workspace, 'harness', scenario.expected);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: scenario.expected,
      entryFiles: ['CLAUDE.md'],
    });
  });
}

test('rule normalization sorts, excludes, and adds agent adapters', () => {
  const availableRules = ['common', 'claude', 'codex', 'opencode', 'extra'];
  assert.deepStrictEqual(normalizeRules('extra,common', availableRules), ['common', 'extra']);
  assert.deepStrictEqual(normalizeRulesOut('common', availableRules), ['claude', 'codex', 'opencode', 'extra']);
  assert.deepStrictEqual(getDefaultRulesForAgent('claude', availableRules), ['common', 'claude']);
  assert.deepStrictEqual(getDefaultRulesForAgent('multi', availableRules), ['common', 'claude', 'codex', 'opencode']);
  assert.deepStrictEqual(addAgentRules(['common'], 'codex', availableRules), ['common', 'codex']);
  assert.deepStrictEqual(addAgentRules([], 'codex', availableRules), []);
});

for (const scenario of [
  { rulesOut: allRuleDirs[0], expected: allRuleDirs.slice(1) },
  { rulesOut: 'claude', expected: allRuleDirs.filter((rule) => rule !== 'claude') },
]) {
  test(`--rules-out ${scenario.rulesOut} excludes the selected dir`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules-out', scenario.rulesOut]);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, scenario.expected);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: scenario.expected,
      entryFiles: ['CLAUDE.md'],
    });
  });
}

for (const invalidRules of ['copy', 'empty', 'unknown', 'common,,common', '../common', 'none,common', 'all,common']) {
  test(`--rules ${invalidRules} fails`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules', invalidRules]);
    assert.notStrictEqual(result.status, 0, `--rules ${invalidRules} should fail`);
  });
}

for (const invalidRulesOut of ['none', 'all', 'unknown']) {
  test(`--rules-out ${invalidRulesOut} fails`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules-out', invalidRulesOut]);
    assert.notStrictEqual(result.status, 0, `--rules-out ${invalidRulesOut} should fail`);
  });
}

test('agent-native command files are installed for supported agents', () => {
  for (const scenario of [
    { agent: 'claude', commands: allCommandFiles, entryFiles: ['CLAUDE.md'] },
    { agent: 'codex', commands: allCommandFiles, entryFiles: ['AGENTS.md'] },
    { agent: 'opencode', commands: allCommandFiles, entryFiles: ['AGENTS.md'] },
    { agent: 'multi', commands: allCommandFiles, entryFiles: ['CLAUDE.md', 'AGENTS.md'] },
  ]) {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent]);
    assert.strictEqual(result.status, 0, result.stderr);
    assertCommandFiles(workspace, scenario.agent, scenario.commands);
    assertNoPath(path.join(workspace, '.agents', 'commands'));
    assertNoPath(path.join(workspace, '.opencode', 'command'));
    assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
      agent: scenario.agent,
      commands: scenario.commands,
      entryFiles: scenario.entryFiles,
    });
  }
});

test('re-init refreshes known command files and preserves unknown user commands', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const knownCommand = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  const originalCommand = read(knownCommand);
  const unknownCommand = path.join(workspace, '.claude', 'commands', 'local-user-command.md');
  fs.writeFileSync(knownCommand, 'custom command\n', 'utf8');
  fs.writeFileSync(unknownCommand, 'local command\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(knownCommand), originalCommand, 'known command file should be refreshed on re-init');
  assertFile(unknownCommand);
  assertCommandFiles(workspace, 'claude', allCommandFiles);
});

test('codex command skills are generated from command templates', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  const commandId = getCommandId(gitSyncCommand);
  const skillPath = path.join(workspace, '.agents', 'skills', commandId, 'SKILL.md');
  const openAiPath = path.join(workspace, '.agents', 'skills', commandId, 'agents', 'openai.yaml');
  const skill = read(skillPath);
  const openAi = read(openAiPath);

  assert.match(skill, new RegExp(`name: ${commandId}`));
  assert.match(skill, /Generated from `templates\/commands\/git-sync\.md`/);
  assert.match(skill, /只有用户明确确认后，才能执行 fetch、push、stash、merge 或 stash pop/);
  assert.match(skill, /不要自动 push 合并后的结果/);
  assert.match(skill, /\$ARGUMENTS/);
  assert.match(openAi, /interface:/);
  assert.match(openAi, new RegExp(`display_name: "${commandId}"`));
  assert.doesNotMatch(openAi, /只有用户明确确认后/);
});

test('re-init refreshes codex command skills and preserves unknown user skills', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  const commandId = getCommandId(allCommandFiles[0]);
  const knownSkill = path.join(workspace, '.agents', 'skills', commandId, 'SKILL.md');
  const originalSkill = read(knownSkill);
  const unknownSkill = path.join(workspace, '.agents', 'skills', 'local-user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(unknownSkill), { recursive: true });
  fs.writeFileSync(knownSkill, 'custom command skill\n', 'utf8');
  fs.writeFileSync(unknownSkill, 'local skill\n', 'utf8');

  result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(knownSkill), originalSkill, 'known codex command skill should be refreshed on re-init');
  assertFile(unknownSkill);
  assertCommandFiles(workspace, 'codex', allCommandFiles);
});

test('default skills selection installs all known skills', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertSkillDirs(workspace, 'claude', allSkillDirs);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: allSkillDirs,
    entryFiles: ['CLAUDE.md'],
  });
});

test('--skills none installs no known skills', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertSkillDirs(workspace, 'claude', []);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: [],
    entryFiles: ['CLAUDE.md'],
  });
});

test('--skills installs selected skills to agent-native target roots', () => {
  for (const scenario of [
    { agent: 'claude', targetRoot: '.claude/skills', entryFiles: ['CLAUDE.md'] },
    { agent: 'codex', targetRoot: '.agents/skills', entryFiles: ['AGENTS.md'] },
    { agent: 'opencode', targetRoot: '.opencode/skills', entryFiles: ['AGENTS.md'] },
  ]) {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', scenario.agent, '--skills', primarySkill]);
    assert.strictEqual(result.status, 0, result.stderr);
    assertFile(path.join(workspace, ...scenario.targetRoot.split('/'), primarySkill, 'SKILL.md'));
    assertSkillDirs(workspace, scenario.agent, [primarySkill]);
    assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
      agent: scenario.agent,
      skills: [primarySkill],
      entryFiles: scenario.entryFiles,
    });
  }
});

if (allSkillDirs.includes('zentao-bug-workflow')) {
  test('zentao skill distributes editable zentao.config.json directly', () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
    assertFile(path.join(skillRoot, 'zentao.config.json'));
    assertNoPath(path.join(skillRoot, 'zentao.config.default.json'));
  });

  test('zentao helper refuses placeholder config values before network requests', () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const helper = read(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'scripts', 'zentao_bug.py'));
    assert.match(helper, /PLACEHOLDER_CONFIG_VALUES/);
    assert.match(helper, /PLACEHOLDER_HOSTS/);
    assert.match(helper, /zentao\.example\.com/);
    assert.match(helper, /normalize_hostname\(parse\.urlparse\(value\.strip\(\)\)\.hostname or ""\)/);
    assert.match(helper, /host\.endswith\("\.example\.com"\)/);
    assert.match(helper, /assert_not_placeholder_config\(section, key, value\)/);
    assert.match(helper, /Edit the local config file before running ZenTao network requests/);
  });

  test('zentao local config is preserved while managed skill files refresh on re-init', () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
    const configPath = path.join(skillRoot, 'zentao.config.json');
    const scriptPath = path.join(skillRoot, 'scripts', 'zentao_bug.py');
    const originalScript = read(scriptPath);
    fs.writeFileSync(configPath, '{"local": true}\n', 'utf8');
    fs.writeFileSync(scriptPath, 'old unsafe script\n', 'utf8');

    result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(read(configPath), '{"local": true}\n', 'local zentao config should be preserved');
    assert.strictEqual(read(scriptPath), originalScript, 'managed ZenTao helper should be refreshed');
  });

  test('zentao helper refuses external image URLs before sending token headers', () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const helper = read(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'scripts', 'zentao_bug.py'));
    assert.match(helper, /def same_origin\(left: str, right: str\) -> bool:/);
    assert.match(helper, /Refusing to download external image URL from ZenTao bug content/);
    assert.match(helper, /request\.Request\(url, headers=\{"Token": token\}\)/);
    assert.match(helper, /request\.build_opener\(NoRedirectHandler\)/);
    assert.match(helper, /download_file\(ref\["url"\], target, token, config\)/);
  });
}

test('multi installs selected skills to all native target roots', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi', '--skills', primarySkill]);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.agents', 'skills', primarySkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.opencode', 'skills', primarySkill, 'SKILL.md'));
  assertSkillDirs(workspace, 'multi', [primarySkill]);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'multi',
    skills: [primarySkill],
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
});

test('--skills all installs all available skills', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertSkillDirs(workspace, 'claude', allSkillDirs);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: allSkillDirs,
    entryFiles: ['CLAUDE.md'],
  });
});

test('re-init refreshes managed skill files and removes unselected known skills', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);
  const selectedSkillFile = path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md');
  const originalSkill = read(selectedSkillFile);
  const unknownSkill = path.join(workspace, '.claude', 'skills', 'local-user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(unknownSkill), { recursive: true });
  fs.writeFileSync(selectedSkillFile, 'custom skill\n', 'utf8');
  fs.writeFileSync(unknownSkill, 'local skill\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(selectedSkillFile), originalSkill, 'managed skill file should be refreshed on re-init');
  assertFile(unknownSkill);
  assertSkillDirs(workspace, 'claude', [primarySkill]);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: [primarySkill],
    entryFiles: ['CLAUDE.md'],
  });
});

test('single-agent re-init does not remove other agent skill roots', () => {
  assert.ok(allSkillDirs.length > 1, 'test requires at least two known skills');
  const selectedSkill = allSkillDirs[0];
  const otherAgentSkill = allSkillDirs.find((skillDir) => skillDir !== selectedSkill);
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);

  result = run(['init', workspace, '--agent', 'claude', '--skills', selectedSkill]);
  assert.strictEqual(result.status, 0, result.stderr);

  assertSkillDirs(workspace, 'claude', [selectedSkill]);
  assertFile(path.join(workspace, '.agents', 'skills', otherAgentSkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.opencode', 'skills', otherAgentSkill, 'SKILL.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: [selectedSkill],
    entryFiles: ['CLAUDE.md'],
  });
});

test('skill normalization handles defaults, lists, and invalid values', () => {
  assert.deepStrictEqual(normalizeSkills(null, allSkillDirs), allSkillDirs);
  assert.deepStrictEqual(normalizeSkills('none', allSkillDirs), []);
  assert.deepStrictEqual(normalizeSkills('all', allSkillDirs), allSkillDirs);
  assert.deepStrictEqual(normalizeSkills(`${primarySkill},${primarySkill}`, allSkillDirs), [primarySkill]);
  for (const invalidSkills of ['unknown', `${primarySkill},,${primarySkill}`, `../${primarySkill}`, `none,${primarySkill}`, `all,${primarySkill}`]) {
    assert.throws(() => normalizeSkills(invalidSkills, allSkillDirs));
  }
});

test('--skills invalid selection fails', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--skills', 'unknown']);
  assert.notStrictEqual(result.status, 0, '--skills unknown should fail');
});

test('--skills dry-run writes nothing', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(path.join(workspace, '.claude'));
  assert.match(result.stdout, new RegExp(primarySkill));
});

test('re-init with a different agent converges agent-specific rules', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, expectedDefaultRules('claude'));

  const localClaudeRule = path.join(workspace, '.claude', 'rules', 'local.md');
  fs.mkdirSync(path.dirname(localClaudeRule), { recursive: true });
  fs.writeFileSync(localClaudeRule, 'local rule pointer\n', 'utf8');

  result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, expectedDefaultRules('codex'));
  assertClaudeRulePointers(workspace, 'harness', []);
  assertFile(localClaudeRule);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'codex',
    entryFiles: ['AGENTS.md'],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

test('multi --rules none installs no agent adapters', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, []);
  assertClaudeRulePointers(workspace, 'harness', []);
  assertNoOpenCodeManagedRulesInstruction(workspace);
  assertNoCodexRulesDir(workspace);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'multi',
    rules: [],
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
});

test('opencode rules instructions merge with existing config', () => {
  const workspace = tempDir();
  fs.writeFileSync(path.join(workspace, 'opencode.json'), JSON.stringify({
    provider: 'local',
    instructions: ['keep this instruction'],
  }, null, 2), 'utf8');

  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  const config = readJson(path.join(workspace, 'opencode.json'));
  assert.strictEqual(config.provider, 'local');
  assert.deepStrictEqual(config.instructions.filter((instruction) => instruction === 'keep this instruction'), ['keep this instruction']);
  assertOpenCodeRulesInstruction(workspace, 'harness', expectedDefaultRules('opencode'));
});

test('opencode rules instructions support string instructions', () => {
  const workspace = tempDir();
  fs.writeFileSync(path.join(workspace, 'opencode.json'), JSON.stringify({
    instructions: 'keep this instruction',
  }, null, 2), 'utf8');

  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.strictEqual(result.status, 0, result.stderr);
  const config = readJson(path.join(workspace, 'opencode.json'));
  assert.match(config.instructions, /keep this instruction/);
  assertOpenCodeRulesInstruction(workspace, 'harness', expectedDefaultRules('opencode'));
});

test('opencode invalid json fails without overwriting config', () => {
  const workspace = tempDir();
  const configPath = path.join(workspace, 'opencode.json');
  fs.writeFileSync(configPath, '{bad json', 'utf8');
  const result = run(['init', workspace, '--agent', 'opencode']);
  assert.notStrictEqual(result.status, 0, 'invalid opencode.json should fail');
  assert.strictEqual(read(configPath), '{bad json');
});

test('--rules and --rules-out are mutually exclusive', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'common', '--rules-out', 'common']);
  assert.notStrictEqual(result.status, 0, '--rules and --rules-out should be mutually exclusive');
});

test('--dry-run writes nothing', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'manifest.json'));
  assertNoPath(path.join(workspace, 'agent-work'));
  assert.match(result.stdout, /manifest\.json/);
  assert.match(result.stdout, /agent-work/);
});

test('--harness-dir uses a custom directory name', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'ai-harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'ai-harness', 'HARNESS_GUIDE.md'));
  assertDir(path.join(workspace, 'agent-work'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));
  assertDir(path.join(workspace, 'agent-work', 'tasks'));
  assertNoPath(path.join(workspace, 'ai-harness', 'docs', 'tasks'));
  assertNoPath(path.join(workspace, 'ai-harness', 'agent-work'));
  assertManifest(path.join(workspace, 'ai-harness', 'manifest.json'), {
    agent: 'claude',
    harnessDir: 'ai-harness',
    entryFiles: ['CLAUDE.md'],
  });
  assertClaudeRulePointers(workspace, 'ai-harness', expectedDefaultRules('claude'));
  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /ai-harness\/docs\/index\.md/);
  assert.match(entry, /ai-harness\/docs\/layers\/01-context\.md/);
  assert.match(entry, /ai-harness\/docs\/experiments\/task-execution-record\.md/);
  assert.doesNotMatch(entry, /\(depth: `docs\//);

  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /ai-harness\/docs\/experiments\/task-execution-record\.md/);
  assert.doesNotMatch(workReadme, /`docs\/experiments\/task-execution-record\.md`/);
  const doctor = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

for (const harnessDir of ['.', '../outside', 'bad/name', 'agent-work', 'AGENT-WORK', 'agent-work.']) {
  test(`--harness-dir ${harnessDir} fails`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', harnessDir]);
    assert.notStrictEqual(result.status, 0, `--harness-dir ${harnessDir} should fail`);
  });
}

test('existing root entry gets the contract merged in (user content preserved)', () => {
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'CLAUDE.md');
  fs.writeFileSync(targetFile, 'my project notes\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const body = read(targetFile);
  assert.match(body, /<!-- niuma-harness:contract begin/, 'contract block should be inserted at top');
  assert.match(body, /<!-- niuma-harness:contract end/, 'contract block should be closed');
  assert.ok(body.endsWith('my project notes\n'), 'user content should be preserved after the contract block');
});

test('re-init refreshes the entry contract block (idempotent)', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entry = path.join(workspace, 'CLAUDE.md');
  const before = read(entry);

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(entry), before, 're-init with markers should leave the entry byte-identical');
  assert.match(result.stdout, /REFRESH/, 're-init should report REFRESH for the entry');
});

test('manifest is always regenerated on re-init', () => {
  const workspace = tempDir();
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{"custom":true}\n', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertManifest(manifestPath, {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
});

test('re-init refreshes tool-managed files', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const memo = path.join(workspace, 'harness', 'docs', 'layers', '01-context.md');
  fs.writeFileSync(memo, 'tampered\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.notStrictEqual(read(memo), 'tampered\n', 'tool-managed file should be refreshed on re-init');
  assert.match(read(memo), /## Agent protocol/, 'tool-managed file should be restored from template');
});

test('re-init preserves user-maintained project-context.md', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const ctx = path.join(workspace, 'harness', 'docs', 'project-context.md');
  fs.writeFileSync(ctx, 'my project facts\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(ctx), 'my project facts\n', 'user-maintained project-context should be preserved');
});

test('directory symlink attack is rejected', () => {
  const workspace = tempDir();
  const outside = tempDir();
  const harnessLink = path.join(workspace, 'harness');
  let created = true;
  try {
    fs.symlinkSync(outside, harnessLink, 'dir');
  } catch {
    created = false;
  }

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'directory symlink should fail');
    assertNoPath(path.join(outside, 'CLAUDE.md'));
  }
});

test('root entry symlink is rejected without overwriting the target', () => {
  const workspace = tempDir();
  const target = path.join(workspace, 'outside.md');
  fs.writeFileSync(target, 'outside', 'utf8');
  const link = path.join(workspace, 'CLAUDE.md');
  let created = true;
  try {
    fs.symlinkSync(target, link, 'file');
  } catch {
    created = false;
  }

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'root entry symlink should fail');
    assert.strictEqual(read(target), 'outside', 'symlink target should not be overwritten');
  }
});

test('dangling root entry symlink is rejected', () => {
  const workspace = tempDir();
  const outside = tempDir();
  const danglingTarget = path.join(outside, 'created-through-link.md');
  const link = path.join(workspace, 'CLAUDE.md');
  let created = true;
  try {
    fs.symlinkSync(danglingTarget, link, 'file');
  } catch {
    created = false;
  }

  if (created) {
    const result = run(['init', workspace, '--agent', 'claude']);
    assert.notStrictEqual(result.status, 0, 'dangling root entry symlink should fail');
    assertNoPath(danglingTarget);
  }
});

test('harness path that is a file fails', () => {
  const workspace = tempDir();
  const targetFile = path.join(workspace, 'harness');
  fs.writeFileSync(targetFile, 'not a directory', 'utf8');
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 'target harness path as file should fail');
});

test('unknown option fails', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--bad']);
  assert.notStrictEqual(result.status, 0, 'unknown option should fail');
});

test('missing --agent fails in a non-TTY', () => {
  const workspace = tempDir();
  const result = run(['init', workspace]);
  assert.notStrictEqual(result.status, 0, 'missing agent should fail in non-TTY');
  assert.match(result.stderr, /Missing --agent/);
});
