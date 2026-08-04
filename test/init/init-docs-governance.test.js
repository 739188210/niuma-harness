const test = require('node:test');
const {
  assert,
  assertNoPath,
  fs,
  path,
  read,
  run,
  tempDir,
} = require('../support/init-fixtures');

test('generated docs keep experience project-maintained and decoupled from retired protocols', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const guide = read(path.join(h, 'docs', 'experience', 'README.md'));
  assert.match(guide, /^# Experience Library$/m);
  assert.match(guide, /A first verified discovery may be recorded immediately/);
  assert.match(guide, /Do not create a record merely to close a task/);
  assert.match(guide, /One-off failures, raw logs, temporary debugging traces/);
  assert.match(guide, /Individual experience records are project-maintained/);
  assert.match(guide, /## Origin \(optional\)/);
  assert.doesNotMatch(guide, /ADR|verification\.md|evidenceIds/);

  const record = path.join(h, 'docs', 'experience', 'pagination.md');
  fs.writeFileSync(record, '# Pagination lesson\n', 'utf8');
  assert.strictEqual(run(['init', workspace, '--agent', 'claude']).status, 0);
  assert.strictEqual(read(record), '# Pagination lesson\n');
});

test('generated docs define optional Harness feedback without an execution-record schema', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  assertNoPath(path.join(h, 'docs', 'experiments'));
  assertNoPath(path.join(h, 'docs', 'decisions'));
  const entry = read(path.join(workspace, 'CLAUDE.md'));
  assert.doesNotMatch(entry, /structured execution record|task-execution-record|evidence links/);
  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /optional feedback about Harness protocol or documentation friction/);
  assert.match(workReadme, /project technical discoveries belong in task state, project context, or Experience instead/);
  assert.match(workReadme, /Why this belongs to Harness feedback rather than project context or Experience/);
  assert.match(workReadme, /Its absence never blocks task execution, recovery, or completion/);
  assert.doesNotMatch(workReadme, /required structured execution record|verification\.md/);
});

test('generated Memory layer routes discoveries to one primary destination', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const memory = read(path.join(h, 'docs', 'layers', '06-memory.md'));
  assert.match(memory, /## Finding routing/);
  assert.match(memory, /status\.md.*final response for Direct work/);
  assert.match(memory, /docs\/project-context\.md/);
  assert.match(memory, /docs\/experience\/<topic>\.md/);
  assert.match(memory, /harness-feedback\.md/);
  assert.match(memory, /A first verified discovery may qualify; repetition is not required/);
  assert.match(memory, /does not mean every first discovery must become Experience/);
  assert.match(memory, /An experience record is guidance, not action authorization/);
  assert.match(memory, /re-check its Source of truth and classify the current action under Policy/);
});

test('generated feature and process docs define optional pre-work plans', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const feature = read(path.join(h, 'docs', 'process', 'feature-development.md'));
  assert.match(feature, /Confirm understanding before planning/);
  assert.match(feature, /Create `agent-work\/tasks\/<task-name>\/plan\.md` before implementation only when a plan has real pre-work value/);
  const process = read(path.join(h, 'docs', 'layers', '03-process.md'));
  assert.match(process, /whether work stays Direct or needs status tracking/);
  const triage = read(path.join(h, 'docs', 'process', 'task-triage.md'));
  assert.match(triage, /Direct or status-tracked material choice/);
  assert.doesNotMatch(triage, /decisions\/|ADR|Minimum|Recoverable/);
});

test('generated subagent playbook keeps integrated observations in parent status', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const subagent = read(path.join(h, 'docs', 'process', 'subagent-development.md'));
  assert.match(subagent, /parent `status\.md` updates/);
  assert.match(subagent, /active task owner owns the final integrated result/);
  assert.match(subagent, /final Observation over the integrated workspace/);
  const loop = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loop, /integrated state, checks, conflicts, and next action/);
});

test('generated docs use final responses or status ledgers for actual observations', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const h = path.join(workspace, 'harness');
  const workReadme = read(path.join(workspace, 'agent-work', 'README.md'));
  assert.match(workReadme, /\| Direct \|/);
  assert.match(workReadme, /\| Status-tracked \|/);
  assert.match(workReadme, /only task-local record of actual checks, results, skipped checks, and unknowns/);
  assert.doesNotMatch(workReadme, /verification\.md|Recoverable/);
  const observation = read(path.join(h, 'docs', 'layers', '04-observation.md'));
  assert.match(observation, /For Direct work, put that record in the final response/);
  assert.match(observation, /For status-tracked work, put it in .*status\.md/);
  const loop = read(path.join(h, 'docs', 'layers', '07-loop.md'));
  assert.match(loop, /A task must not say `complete` while material acceptance remains failed, blocked, or unknown/);
  assert.doesNotMatch(loop, /verification\.md|Recoverable/);
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
  assert.match(actionBoundary, /When the user explicitly asks to check whether a package can be released/);
  assert.match(actionBoundary, /package metadata and contents.*dry-run, build, test, lint, and artifact checks/i);
  assert.match(actionBoundary, /task-scoped, local, and do not create external side effects/i);
  assert.match(actionBoundary, /external release or deployment infrastructure, remote or hosted jobs, credentials, remote services, or limited quota/i);
  assert.doesNotMatch(actionBoundary, /Preparing release or deployment readiness checks before an approved outward-facing action/);
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
  assert.match(actionBoundary, /focused RED test creation or updates/);
  assert.match(actionBoundary, /approved changed behavior or confirmed regression coverage/);
  assert.match(actionBoundary, /even in an existing test file or verification target/);
  assert.match(actionBoundary, /preserve or strengthen the prior behavior contract/);
  assert.match(actionBoundary, /do not edit, delete, skip, weaken, or rebaseline verification targets/);
  assert.match(actionBoundary, /Other changes to an existing verification target are ask-first/);
  assert.match(actionBoundary, /uncertain semantic rewrite/);
  assert.match(actionBoundary, /task explicitly requests test maintenance/);
  assert.match(actionBoundary, /target conflicts with verified intended behavior/);
  assert.match(actionBoundary, /replacement coverage/);
  assert.doesNotMatch(actionBoundary, /Changing an existing verification target is ask-first unless/);
  assert.match(actionBoundary, /A request to turn red into green by weakening, skipping, deleting, or rebaselining verification targets is not valid test maintenance/);
  assert.match(actionBoundary, /The user asks to turn red into green by weakening, skipping, deleting, or rebaselining verification targets/);
  assert.match(actionBoundary, /## Decision order and reclassification/);
  assert.match(actionBoundary, /`stop-and-escalate` wins/);
  assert.match(actionBoundary, /not a fifth classification/);
  assert.match(actionBoundary, /distinct successor action/);
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
  assert.match(bugfix, /test-change gate in `harness\/docs\/policy\/action-boundary\.md`/);
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
  assert.match(protocol, /approved changed behavior or confirmed regression coverage/);
  assert.match(protocol, /uncertain semantic rewrite.*ask-first/i);
  assert.match(protocol, /time pressure, convenience, inability to find a test, and test complexity/i);
  assert.match(protocol, /not trusted proof of the agent's chronological execution order/);

  const index = read(path.join(h, 'docs', 'index.md'));
  assert.match(index, /\[Test-driven development\]\(process\/test-driven-development\.md\)/);

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
  assert.match(observation, /Test-first RED, GREEN, and optional refactor recheck are defined by `harness\/docs\/process\/test-driven-development\.md`/);
  assert.doesNotMatch(observation, /## Test-first evidence/);
  assert.doesNotMatch(observation, /niuma-verification-record:begin/);

  const policy = read(path.join(h, 'docs', 'policy', 'action-boundary.md'));
  assert.match(policy, /task-scoped focused RED test creation or updates needed to express approved changed behavior or confirmed regression coverage/);
  assert.match(policy, /even in an existing test file or verification target/);
  assert.match(policy, /preserve or strengthen the prior behavior contract/);
  assert.match(policy, /Other changes to an existing verification target are ask-first/);
});
