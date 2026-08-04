const test = require('node:test');
const {
  assert,
  read,
  run,
  path,
  tempDir,
} = require('../support/init-fixtures');

test('generated docs prioritize current facts and reusable experience', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /## Fact priority/);
  assert.match(index, /1\. Current user instructions for this task decide the task objective/);
  assert.match(index, /2\. Current verifiable facts: current source, configuration, build definitions, tests, and actual command output/);
  assert.match(index, /4\. Reusable guidance: applicable Rules and active experience records/);
  assert.match(index, /comparable scenario, known trap, or explicit Experience reference may apply/);
  assert.match(index, /verify current facts and apply Policy before relying on them/);
  assert.match(index, /5\. Historical and task material: historical notes, migration material, old proposals, plans, task ledgers/);
  assert.doesNotMatch(index, /ADR|decisions\/|task-execution-record/);

  const context = read(path.join(h, 'docs', 'layers', '01-context.md'));
  assert.match(context, /First inspect request-named files and the smallest relevant current source/);
  assert.match(context, /Current verifiable evidence determines task-specific facts/);
  assert.match(context, /Use Rules and active experience as reusable guidance/);
  assert.doesNotMatch(context, /ADR|decision/);

  const projectContext = read(path.join(h, 'docs', 'project-context.md'));
  assert.match(projectContext, /Current workspace evidence always overrides this file/);
  assert.match(projectContext, /verified reference patterns/);
  assert.doesNotMatch(projectContext, /accepted decisions/);

  const experience = read(path.join(h, 'docs', 'experience', 'README.md'));
  for (const field of ['Use when', 'Safe approach', 'Do not assume', 'Source of truth', 'Refresh when']) {
    assert.match(experience, new RegExp(`## ${field}`));
  }
  assert.match(experience, /A first verified discovery may be recorded immediately/);
  assert.match(experience, /recurrence can raise priority but is not a prerequisite/);
  assert.match(experience, /does not authorize an action/);
  assert.match(experience, /re-check its Source of truth/);
  assert.doesNotMatch(experience, /## Applicable when|## Verified approach|## What not to assume|## Invalidation conditions/);
});

test('generated docs route only needed triage context and status material', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');

  const entry = read(path.join(workspace, 'CLAUDE.md'));
  const triage = read(path.join(h, 'docs', 'process', 'task-triage.md'));
  const process = read(path.join(h, 'docs', 'layers', '03-process.md'));

  assert.match(entry, /task-material selection is needed, use `harness\/docs\/process\/task-triage\.md`/);
  assert.match(entry, /whether work stays Direct, needs status tracking, or benefits from an optional pre-work plan/);
  assert.match(triage, /## Conditional reading/);
  assert.match(triage, /A comparable scenario, known trap, or explicit Experience reference may apply/);
  assert.match(triage, /Experience is guidance, never current fact or action authorization/);
  assert.match(triage, /Work is blocked, cross-session, delegated, parallel, changing scope/);
  assert.match(triage, /decide whether work stays Direct or needs status tracking/);
  assert.doesNotMatch(triage, /decisions\/|ADR|Minimum|Recoverable/);
  assert.match(process, /whether work stays Direct or needs status tracking/);
});

test('custom harness paths replace template variables in retained knowledge and task protocols', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);

  for (const file of [
    path.join(workspace, 'CLAUDE.md'),
    path.join(workspace, 'ai-harness', 'docs', 'index.md'),
    path.join(workspace, 'ai-harness', 'docs', 'layers', '01-context.md'),
    path.join(workspace, 'ai-harness', 'docs', 'layers', '06-memory.md'),
    path.join(workspace, 'agent-work', 'README.md'),
  ]) {
    const body = read(file);
    assert.doesNotMatch(body, /{{HARNESS_DIR}}|`harness\/docs\//);
  }

  assert.match(read(path.join(workspace, 'agent-work', 'README.md')), /`ai-harness\/docs\/layers\/07-loop\.md`/);
  assert.match(read(path.join(workspace, 'ai-harness', 'docs', 'layers', '06-memory.md')), /`ai-harness\/docs\/experience\//);
});

test('generated project context keeps source-backed fact scopes without bootstrap state', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const projectContext = read(path.join(h, 'docs', 'project-context.md'));

  assert.match(projectContext, /## Context coverage/);
  assert.match(projectContext, /\| Scope \| Status \| Primary sources \| Refresh when \| Known gap \|/);
  assert.match(projectContext, /Build and verification commands/);
  assert.match(projectContext, /Workspace topology/);
  assert.match(projectContext, /Engineering conventions/);
  assert.match(projectContext, /## Task fact routing/);
  assert.match(projectContext, /does not require every project to fill it or every task to read every row/);
  assert.doesNotMatch(projectContext, /bootstrap|accepted decisions/i);
});
