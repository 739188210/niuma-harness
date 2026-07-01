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

test('init claude: entry at workspace root, harness content under harness/', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertFile(path.join(workspace, 'harness', 'HARNESS_GUIDE.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'policy', 'action-boundary.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'policy', 'secret-leak.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'policy', 'untrusted-content.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'process', 'refactor.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'process', 'review.md'));
  assertFile(path.join(workspace, 'harness', 'docs', 'process', 'release.md'));
  assertLayerMemos(path.join(workspace, 'harness'));
  assertDir(path.join(workspace, 'agent-work'));
  assertFile(path.join(workspace, 'agent-work', 'README.md'));
  assertDir(path.join(workspace, 'agent-work', 'tasks'));
  assertNoPath(path.join(workspace, 'harness', 'docs', 'tasks'));
  assertNoPath(path.join(workspace, 'harness', 'agent-work'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
  assertNoPath(path.join(workspace, 'AGENTS.md'));
  assertNoPath(path.join(workspace, 'harness', 'AGENTS.md'));
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

for (const agent of ['codex', 'opencode']) {
  test(`init ${agent}: AGENTS.md at root`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', agent]);
    assert.strictEqual(result.status, 0, result.stderr);
    assertFile(path.join(workspace, 'AGENTS.md'));
    assertNoPath(path.join(workspace, 'harness', 'AGENTS.md'));
    assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
      agent,
      entryFiles: ['AGENTS.md'],
    });
    assertNoPath(path.join(workspace, 'CLAUDE.md'));
  });
}

test('init multi: both CLAUDE.md and AGENTS.md', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, 'CLAUDE.md'));
  assertFile(path.join(workspace, 'AGENTS.md'));
  assertNoPath(path.join(workspace, 'harness', 'CLAUDE.md'));
  assertNoPath(path.join(workspace, 'harness', 'AGENTS.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'multi',
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
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
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi']);
  assert.strictEqual(result.status, 0, result.stderr);
  const claude = read(path.join(workspace, 'CLAUDE.md'));
  const agents = read(path.join(workspace, 'AGENTS.md'));
  assert.strictEqual(claude, agents, 'CLAUDE.md and AGENTS.md must share one source');
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
