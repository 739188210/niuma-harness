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
  assert.match(index, /Context coverage and, when it exists and matches the task, the `Task fact routing` table/);
  assert.match(index, /Before relying on a project-context fact, inspect task-relevant current README, build files, configuration, source, tests, or command output/);
  assert.doesNotMatch(index, /## Project pointers/);
  assert.doesNotMatch(index, /## Maintenance/);

  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  assert.match(context, /First inspect request-named files and the smallest relevant current source, configuration, build, test, README, or command evidence/);
  assert.match(context, /Triage decides whether `harness\/docs\/index\.md`, `harness\/docs\/project-context\.md`, or other Harness material is relevant/);
  assert.match(context, /Classify each task-relevant source as current verifiable fact/);
  assert.match(context, /A file existing in the repository is not automatically a current fact/);
  assert.match(context, /Current verifiable evidence determines task-specific facts/);
  assert.match(context, /Use Rules, accepted and unsuperseded ADRs, and active experience/);
  assert.match(context, /historical materials only as background, search terms, or hypotheses/);
  assert.match(context, /more specific, stricter Policy rule/);

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /project knowledge index/);
  assert.match(projectContext, /Facts are added or refreshed only when a task verifies them/);
  assert.match(projectContext, /Current workspace evidence always overrides this file/);
  assert.match(projectContext, /Missing coverage means.*inspect the relevant workspace evidence now/i);
  assert.doesNotMatch(projectContext, /bootstrap|pending|complete/i);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customIndex = read(path.join(customWorkspace, 'ai-harness', 'docs', 'index.md'));
  const customContext = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '01-context.md'));

  assert.match(customIndex, /\[Project knowledge index\]\(project-context\.md\)/);
  assert.doesNotMatch(customIndex, /bootstrap|process\/bootstrap\.md/i);
  assert.match(customContext, /`ai-harness\/docs\/index\.md`/);
  const customEntry = read(path.join(customWorkspace, 'CLAUDE.md'));
  assert.match(customEntry, /Their single source of truth is[\s\S]*ai-harness\/docs\/project-context\.md/);
  assert.match(customContext, /`ai-harness\/docs\/project-context\.md`/);
  assert.doesNotMatch(customIndex, /{{HARNESS_DIR}}|`harness\/docs\//);
  assert.doesNotMatch(customContext, /{{HARNESS_DIR}}|`harness\/docs\//);
});

test('generated docs route minimum process reading through triage and process triggers', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  const triage = read(path.join(h, 'docs', 'process', 'task-triage.md'));
  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  const process = read(path.join(h, 'docs', 'layers', '03-process.md'));

  assert.match(entry, /request-named files and the smallest relevant current source, configuration, build, test, README, or command evidence/i);
  assert.match(entry, /For non-trivial work, route through `harness\/docs\/process\/task-triage\.md`/i);
  assert.doesNotMatch(entry, /use `harness\/docs\/index\.md` to locate harness docs/i);
  assert.doesNotMatch(entry, /project knowledge index in `harness\/docs\/project-context\.md`/i);
  assert.match(triage, /## Base minimum reading set/);
  assert.match(triage, /Do not pre-read every Harness document/i);
  assert.match(triage, /request-named files and smallest current source, configuration, build, test, README, or command evidence/i);
  assert.match(triage, /## Conditional reading/);
  assert.match(triage, /needs Harness navigation, fact priority, the Policy exception, or a stable project fact/i);
  assert.match(triage, /`harness\/docs\/index\.md`, then `harness\/docs\/project-context\.md` only when stable facts are needed/i);
  assert.match(triage, /matching fact scope/);
  assert.match(triage, /select the smallest relevant headings/);
  assert.match(triage, /current source, configuration, build, test, README, or command evidence/);
  assert.match(triage, /## Conditional reading/);
  assert.match(triage, /missing coverage.*does not require a whole-project scan/i);
  assert.match(triage, /source change.*task-relevant known gap.*conflict with current evidence/i);
  assert.doesNotMatch(triage, /bootstrap|`pending`|`partial`/i);
  assert.match(triage, /`harness\/docs\/policy\/action-boundary\.md`/);
  assert.match(triage, /`harness\/docs\/module-topology\.md`/);
  assert.match(triage, /Accepted, unsuperseded records/i);
  assert.match(triage, /scope-matching Active records/i);
  assert.match(triage, /`agent-work\/README\.md`/);
  assert.match(triage, /do not create another classification or risk tier/i);
  assert.match(triage, /for a named task resume, follow the Recovery entry in `harness\/docs\/layers\/07-loop\.md`/i);
  assert.match(triage, /Re-triage only when current evidence invalidates the original classification, risk tier, success criteria, or selected playbook/);

  assert.match(context, /For non-trivial work, use `harness\/docs\/process\/task-triage\.md` to select conditional reading and a playbook/);
  assert.match(context, /When triage selects stable project facts, read only the matching fact scope, task-relevant headings/);
  assert.match(context, /Do not enumerate decision, experience, or task-work directories speculatively/);
  assert.match(projectContext, /## Context coverage/);
  assert.match(projectContext, /\| Scope \| Status \| Primary sources \| Refresh when \| Known gap \|/);
  assert.match(projectContext, /Build and verification commands/);
  assert.match(projectContext, /Workspace topology/);
  assert.match(projectContext, /Engineering conventions/);
  assert.match(projectContext, /verified.*partial.*unverified.*stale/i);
  assert.match(process, /task-triage\.md` owns the base minimum reading set and common conditional reads/);
  assert.match(process, /For non-trivial work, `harness\/docs\/process\/task-triage\.md` first classifies the task, applies conditional reading/);
  assert.match(process, /workflow-specific additional materials, gates, checklist, and evidence/);

  const customWorkspace = tempDir();
  const customResult = run(['init', customWorkspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(customResult.status, 0, customResult.stderr);
  const customEntry = read(path.join(customWorkspace, 'CLAUDE.md'));
  const customTriage = read(path.join(customWorkspace, 'ai-harness', 'docs', 'process', 'task-triage.md'));
  const customProjectContext = read(path.join(customWorkspace, 'ai-harness', 'docs', 'project-context.md'));
  const customLoop = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '07-loop.md'));
  const customWorkReadme = read(path.join(customWorkspace, 'agent-work', 'README.md'));
  const customProcess = read(path.join(customWorkspace, 'ai-harness', 'docs', 'layers', '03-process.md'));

  for (const body of [customEntry, customTriage, customProjectContext, customLoop, customWorkReadme, customProcess]) {
    assert.doesNotMatch(body, /{{HARNESS_DIR}}|`harness\/docs\//);
  }
  assert.match(customEntry, /`ai-harness\/docs\/process\/task-triage\.md`/);
  assert.match(customEntry, /first inspect request-named files and the smallest relevant current source, configuration, build, test, README, or command evidence/i);
  assert.doesNotMatch(customEntry, /project knowledge index.*current workspace evidence/i);
  assert.match(customTriage, /`ai-harness\/docs\/index\.md`/);
  assert.match(customTriage, /`ai-harness\/docs\/project-context\.md`/);
  assert.match(customTriage, /`ai-harness\/docs\/policy\/action-boundary\.md`/);
  assert.match(customTriage, /`ai-harness\/docs\/layers\/07-loop\.md`/);
  assert.doesNotMatch(customTriage, /bootstrap/i);
  assert.match(customProjectContext, /## Context coverage/);
  assert.match(customLoop, /## Recovery entry/);
  assert.match(customWorkReadme, /`ai-harness\/docs\/layers\/07-loop\.md`/);
  assert.match(customProcess, /`ai-harness\/docs\/process\/task-triage\.md`/);
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
  assert.match(memory, /module-local durable facts/i);
  assert.match(memory, /root or cross-module durable facts/i);
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


test('generated project context grows fact scopes on demand without bootstrap state', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /project knowledge index/);
  assert.match(projectContext, /Facts are added or refreshed only when a task verifies them/);
  assert.match(projectContext, /Each fact scope records its source and freshness boundary when useful/);
  assert.match(projectContext, /Current workspace evidence always overrides this file/);
  assert.match(projectContext, /Missing coverage means.*inspect the relevant workspace evidence now/i);
  assert.match(projectContext, /## Context coverage/);
  assert.match(projectContext, /\| Scope \| Status \| Primary sources \| Refresh when \| Known gap \|/);
  assert.match(projectContext, /\| Build and verification commands \| unverified \| Current package scripts, CI configuration, and command output \| Package scripts or CI configuration changes \| Add only verified commands needed by a task\. \|/);
  assert.match(projectContext, /\| Workspace topology \| unverified \| Current README files, workspace configuration, and source layout \| Workspace configuration or source layout changes \| Add affected module boundaries as they are verified\. \|/);
  assert.match(projectContext, /\| Engineering conventions \| unverified \| Current source, tests, lint\/format configuration, and accepted decisions \| Accepted decision or reference pattern changes \| Add durable conventions only when they affect recurring work\. \|/);
  assert.match(projectContext, /Refresh only the task-relevant scope from its current sources/);
  assert.match(projectContext, /Current workspace evidence always overrides this file/);
  for (const scope of [
    'Build and verification commands',
    'Workspace topology',
    'Engineering conventions',
  ]) assert.match(projectContext, new RegExp(scope));
  assert.match(projectContext, /verified.*confirmed from listed sources/i);
  assert.match(projectContext, /partial.*explicit scope gap/i);
  assert.match(projectContext, /unverified.*not be relied on as fact/i);
  assert.match(projectContext, /stale.*must be rechecked/i);
  assert.match(projectContext, /## Task fact routing/);
  assert.match(projectContext, /Task need \/ signal/);
  assert.match(projectContext, /Read these root fact sections/);
  assert.match(projectContext, /Then verify against/);
  assert.match(projectContext, /compact locator for recurring task needs/);
  assert.match(projectContext, /does not require every project to fill it or every task to read every row/);
  assert.match(projectContext, /does not replace current workspace evidence, `harness\/docs\/module-topology\.md`, or module supplements/);
  assert.doesNotMatch(projectContext, /bootstrap|niuma-bootstrap-record|pending|complete/i);
  assertNoPath(path.join(h, 'docs', 'process', 'bootstrap.md'));

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.match(entry, /first inspect request-named files and the smallest relevant current source, configuration, build, test, README, or command evidence/i);
  assert.match(entry, /For non-trivial work, route through `harness\/docs\/process\/task-triage\.md`/i);
  assert.doesNotMatch(entry, /project knowledge index.*current workspace evidence/i);
  assert.match(entry, /# Project overrides/);
  assert.match(entry, /Their single source of truth is[\s\S]*harness\/docs\/project-context\.md/);
  assert.doesNotMatch(entry, /bootstrap/i);

  const triage = read(path.join(h, 'docs', 'process', 'task-triage.md'));
  assert.match(triage, /Confirm the request-named files and smallest current source, configuration, build, test, README, or command evidence already inspected at entry/);
  assert.match(triage, /needs Harness navigation, fact priority, the Policy exception, or a stable project fact/);
  assert.match(triage, /read `harness\/docs\/index\.md`, then `harness\/docs\/project-context\.md` only when stable facts are needed/);
  assert.match(triage, /When `Task fact routing` exists and matches the task, use it to select the smallest relevant headings/);
  assert.match(triage, /when it is absent or does not match, select headings from the task request instead/i);
  assert.match(triage, /matching fact scope.*sources.*known gaps.*freshness/i);
  assert.match(triage, /missing coverage.*does not require a whole-project scan/i);
  assert.match(triage, /source change.*task-relevant known gap.*conflict with current evidence/i);
  assert.doesNotMatch(triage, /bootstrap|`pending`|`partial`|`complete`/i);

  const contextMemo = read(path.join(h, 'docs', 'layers', '01-context.md'));
  assert.match(contextMemo, /Apply only the relevant triage conditions for Policy, module routing, ADRs, experience, fact-scope refresh, or task-local recovery material/);
  assert.match(contextMemo, /optional locator for existing stable-fact headings, not an authority or a second code map/);
  assert.match(contextMemo, /Do not scan the whole project merely because a relevant fact scope is missing/i);
  assert.doesNotMatch(contextMemo, /bootstrap/i);

  const memoryMemo = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memoryMemo, /record only verified durable facts/);
  assert.match(memoryMemo, /source, scope, and freshness boundary/);
  assert.match(memoryMemo, /only when the task verifies them and they have durable value/i);
  assert.match(memoryMemo, /When a project uses `Task fact routing`, update it only when the task-to-heading mapping changes/);
  assert.doesNotMatch(memoryMemo, /bootstrap/i);

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /entry loop first directs task-specific current evidence/);
  assert.match(index, /only when triage selects Harness navigation, fact priority, the Policy exception, or a linked protocol/);
  assert.match(index, /When triage selects stable project facts.*Context coverage.*Task fact routing/i);
  assert.doesNotMatch(index, /bootstrap/i);
});

