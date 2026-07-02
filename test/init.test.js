const test = require('node:test');
const {
  allRuleDirs,
  assert,
  assertDir,
  assertFile,
  assertLayerMemos,
  assertManifest,
  assertNoPath,
  assertRuleDirs,
  fs,
  path,
  read,
  run,
  tempDir,
} = require('./helpers');
const { normalizeRules, normalizeRulesOut } = require('../src/rules');

const agentCases = [
  { agent: 'claude', entryFiles: ['CLAUDE.md'], absentEntryFiles: ['AGENTS.md'] },
  { agent: 'codex', entryFiles: ['AGENTS.md'], absentEntryFiles: ['CLAUDE.md'] },
  { agent: 'opencode', entryFiles: ['AGENTS.md'], absentEntryFiles: ['CLAUDE.md'] },
  { agent: 'multi', entryFiles: ['CLAUDE.md', 'AGENTS.md'], absentEntryFiles: [] },
];

function assertCommonHarnessShape(workspace, options = {}) {
  const harnessDir = options.harnessDir || 'harness';
  const harnessRoot = path.join(workspace, harnessDir);

  assertFile(path.join(harnessRoot, 'HARNESS_GUIDE.md'));
  assertFile(path.join(harnessRoot, 'docs', 'index.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'action-boundary.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'secret-leak.md'));
  assertFile(path.join(harnessRoot, 'docs', 'policy', 'untrusted-content.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'refactor.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'review.md'));
  assertFile(path.join(harnessRoot, 'docs', 'process', 'release.md'));
  assertLayerMemos(harnessRoot);
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

function readTextTree(root) {
  const tree = {};

  function walk(currentDir, prefix) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
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
    'docs/layers/01-context/memo.md',
    'docs/layers/02-policy/memo.md',
    'docs/layers/03-process/memo.md',
    'docs/layers/04-observation/memo.md',
    'docs/layers/05-recovery/memo.md',
    'docs/layers/06-memory/memo.md',
    'docs/layers/07-loop/memo.md',
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

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(actionBoundary, /## Autonomous actions/);
  assert.match(actionBoundary, /docs\/policy\/untrusted-content\.md/);
  const secretLeak = read(path.join(h, 'docs', 'policy', 'secret-leak.md'));
  assert.match(secretLeak, /## Trigger/, 'secret-leak.md must contain Trigger');
  assert.match(secretLeak, /## Forbidden/, 'secret-leak.md must contain Forbidden');
  const untrustedContent = read(path.join(h, 'docs', 'policy', 'untrusted-content.md'));
  assert.match(untrustedContent, /## Trigger/, 'untrusted-content.md must contain Trigger');
  assert.match(untrustedContent, /## Agent protocol/, 'untrusted-content.md must contain Agent protocol');
  assert.match(untrustedContent, /data, not instructions/, 'untrusted-content.md must define data/instruction separation');

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy', 'memo.md'));
  assert.match(policyMemo, /docs\/policy\/untrusted-content\.md/);
  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /docs\/policy\/untrusted-content\.md/);
});

test('generated docs define task status ledger protocol', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop', 'memo.md'));
  assert.match(loopMemo, /agent-work\/tasks\/<task-name>\/status\.md/);
  assert.match(loopMemo, /multi-step, risky, parallel, or interruptible/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory', 'memo.md'));
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

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop', 'memo.md'));
  assert.match(loopMemo, /## Rationalization red flags/);
  const redFlagsSection = loopMemo.match(/## Rationalization red flags[\s\S]*?\n## Allowed actions/)[0];
  assert.match(redFlagsSection, /skip tests\/checks/);
  assert.match(redFlagsSection, /probably fine/);
  assert.match(redFlagsSection, /unrelated/);
  assert.match(redFlagsSection, /quick refactor/);
  assert.match(redFlagsSection, /extra scope/);
  assert.match(redFlagsSection, /stop-and-classify signals/);
  assert.match(redFlagsSection, /route through Observation, Recovery, Process, or Policy/);

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery', 'memo.md'));
  assert.match(recoveryMemo, /rationalization about missing evidence or dismissing failures as unrelated/);
  assert.match(recoveryMemo, /Scope-expansion rationalizations route through Process and Policy/);
});

test('generated observation memo defines evidence schema', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation', 'memo.md'));
  assert.match(observationMemo, /## Evidence schema/);
  assert.match(observationMemo, /Check/);
  assert.match(observationMemo, /Expected signal/);
  assert.match(observationMemo, /Actual result/);
  assert.match(observationMemo, /Skipped checks/);
  assert.match(observationMemo, /Remaining unknowns/);
  assert.match(observationMemo, /`status\.md` may summarize verification state, but it does not replace evidence/);
  assert.match(observationMemo, /final Observation verifies the integrated result/);
});

test('generated recovery memo maps failure types to required responses', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const recoveryMemo = read(path.join(h, 'docs', 'layers', '05-recovery', 'memo.md'));
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

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop', 'memo.md'));
  assert.match(loopMemo, /`status\.md` owns the operational resume state/);
  assert.match(loopMemo, /does not own detailed verification evidence, task notes, or durable project facts/);
  assert.match(loopMemo, /active task owner/);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory', 'memo.md'));
  assert.match(memoryMemo, /Task-local state stays in `agent-work\/tasks\/<task-name>\/`/);
  assert.match(memoryMemo, /Durable facts belong in `docs\/project-context\.md` only after verification/);
  assert.match(memoryMemo, /Approval blockers and risks are task-local until resolved/);

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation', 'memo.md'));
  assert.match(observationMemo, /Verification evidence owns exact commands, expected signals, actual results, skipped checks with reasons, and remaining unknowns/);
  assert.match(observationMemo, /`status\.md` may summarize verification state, but it does not replace evidence/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process', 'memo.md'));
  assert.match(processMemo, /The selected workflow owns the success criteria and required task state/);
  assert.match(processMemo, /Parallel or delegated work must keep ownership explicit/);

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy', 'memo.md'));
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

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process', 'memo.md'));
  assert.match(processMemo, /confirmation gate defined by the selected workflow/);
});

test('generated process memo maps triggers to workflows and artifacts', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process', 'memo.md'));
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

  const feature = read(path.join(h, 'docs', 'process', 'feature-development.md'));
  assert.match(feature, /## Required artifact\/checklist/);
  assert.match(feature, /Acceptance criteria/);

  const bugfix = read(path.join(h, 'docs', 'process', 'bugfix.md'));
  assert.match(bugfix, /## Required artifact\/checklist/);
  assert.match(bugfix, /Reproduction signal/);

  const refactor = read(path.join(h, 'docs', 'process', 'refactor.md'));
  assert.match(refactor, /## Required artifact\/checklist/);
  assert.match(refactor, /Behavior baseline/);

  const review = read(path.join(h, 'docs', 'process', 'review.md'));
  assert.match(review, /## Required artifact\/checklist/);
  assert.match(review, /Findings grouped by severity/);

  const release = read(path.join(h, 'docs', 'process', 'release.md'));
  assert.match(release, /## Required artifact\/checklist/);
  assert.match(release, /Release target/);
  assert.match(release, /Package or artifact scope/);
});

test('generated subagent playbook defines parent integration gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const subagent = read(path.join(h, 'docs', 'process', 'subagent-development.md'));
  assert.match(subagent, /## Parent integration gate/);
  assert.match(subagent, /active task owner owns the final integrated result/);
  assert.match(subagent, /changed or reviewed files/);
  assert.match(subagent, /verification evidence/);
  assert.match(subagent, /Overlapping edits/);
  assert.match(subagent, /conflicting verification claims/);
  assert.match(subagent, /CRITICAL or HIGH review findings/);
  assert.match(subagent, /enter Recovery instead of silently choosing one/);
  assert.match(subagent, /final Observation over the integrated workspace/);
  assert.match(subagent, /supporting evidence, not a replacement/);

  const processMemo = read(path.join(h, 'docs', 'layers', '03-process', 'memo.md'));
  assert.match(processMemo, /parent flow or active task owner is responsible for integrating delegated outputs/);

  const loopMemo = read(path.join(h, 'docs', 'layers', '07-loop', 'memo.md'));
  assert.match(loopMemo, /integrated delegated state, conflicts, and next action/);

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation', 'memo.md'));
  assert.match(observationMemo, /final Observation verifies the integrated result/);
});

test('generated docs define external side-effect network gate', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const actionBoundary = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
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

  const policyMemo = read(path.join(h, 'docs', 'layers', '02-policy', 'memo.md'));
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

  const observationMemo = read(path.join(h, 'docs', 'layers', '04-observation', 'memo.md'));
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
  const baselineDocs = readTextTree(path.join(baselineWorkspace, 'harness', 'docs'));
  const baselineWorkReadme = read(path.join(baselineWorkspace, 'agent-work', 'README.md'));

  for (const scenario of agentCases.filter((entry) => entry.agent !== 'claude')) {
    const workspace = initWorkspace(scenario.agent);
    assert.deepStrictEqual(
      readTextTree(path.join(workspace, 'harness', 'docs')),
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

test('default common rules are installed with starter content', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const rule = path.join(harnessRoot, 'docs', 'rules', 'common', 'testing.md');
  assertFile(rule);
  assert.ok(read(rule).length > 0, 'default common rules should contain starter content');
  assertRuleDirs(harnessRoot, ['common']);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'claude',
    rules: ['common'],
    entryFiles: ['CLAUDE.md'],
  });
});

test('--rules none installs no rule files', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  const contextMemo = path.join(harnessRoot, 'docs', 'layers', '01-context', 'memo.md');
  assertDir(path.join(harnessRoot, 'docs', 'rules'));
  assertRuleDirs(harnessRoot, []);
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

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(ruleFile), 'custom rule\n', 'selected rule file should be preserved on re-init');
  assertRuleDirs(harnessRoot, ['common']);
});

test('re-init converges rules from common to none', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, ['common']);
  fs.writeFileSync(path.join(harnessRoot, 'docs', 'rules', 'common', 'local.md'), 'local rule\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--rules', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, []);
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
    const selectedRule = allRuleDirs[0];
    let result = run(['init', workspace, '--agent', 'claude', '--rules', 'all']);
    assert.strictEqual(result.status, 0, result.stderr);
    const harnessRoot = path.join(workspace, 'harness');
    assertRuleDirs(harnessRoot, allRuleDirs);

    result = run(['init', workspace, '--agent', 'claude', '--rules', selectedRule]);
    assert.strictEqual(result.status, 0, result.stderr);
    assertRuleDirs(harnessRoot, [selectedRule]);
    assertManifest(path.join(harnessRoot, 'manifest.json'), {
      agent: 'claude',
      rules: [selectedRule],
      entryFiles: ['CLAUDE.md'],
    });
    const doctor = run(['doctor', workspace]);
    assert.strictEqual(doctor.status, 0, doctor.stderr);
  });
}

for (const scenario of [
  { rules: 'common', expected: ['common'] },
  { rules: 'all', expected: allRuleDirs },
]) {
  test(`--rules ${scenario.rules} installs expected dirs`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--rules', scenario.rules]);
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

test('normalizeRules sorts and normalizeRulesOut excludes', () => {
  assert.deepStrictEqual(normalizeRules('extra,common', ['common', 'extra']), ['common', 'extra']);
  assert.deepStrictEqual(normalizeRulesOut('common', ['common', 'extra']), ['extra']);
});

for (const scenario of [
  { rulesOut: allRuleDirs[0], expected: allRuleDirs.slice(1) },
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
  const memo = path.join(workspace, 'harness', 'docs', 'layers', '01-context', 'memo.md');
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
