const test = require('node:test');
const {
  assert,
  assertTreeUnchanged,
  path,
  read,
  readJson,
  run,
  snapshotTree,
  tempDir,
} = require('../support/helpers');

test('re-run init refreshes core while preserving independent assets', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--rules', 'common', '--skills', 'database-readonly']);
  assert.strictEqual(result.status, 0, result.stderr);

  const rulePath = path.join(workspace, '.claude', 'rules', 'common', 'testing.md');
  const skillPath = path.join(workspace, '.claude', 'skills', 'database-readonly', 'SKILL.md');
  const commandPath = path.join(workspace, '.claude', 'commands', 'dev-check.md');
  const opencodePath = path.join(workspace, 'opencode.json');
  const corePath = path.join(workspace, 'harness', 'docs', 'layers', '01-context.md');
  for (const filePath of [rulePath, skillPath, commandPath]) fsWrite(filePath, `local ${path.basename(filePath)}\n`);
  fsWrite(opencodePath, '{"instructions":["local.md"]}\n');
  fsWrite(corePath, 'stale core\n');
  const assetsBefore = snapshotTree(path.join(workspace, '.claude'));
  const opencodeBefore = read(opencodePath);

  result = run(['init', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.deepStrictEqual(snapshotTree(path.join(workspace, '.claude')), assetsBefore);
  assert.strictEqual(read(opencodePath), opencodeBefore);
  assert.notStrictEqual(read(corePath), 'stale core\n');
  const manifest = readJson(path.join(workspace, 'harness', 'manifest.json'));
  assert.strictEqual(manifest.schemaVersion, 5);
  for (const field of ['rules', 'skills', 'commands', 'artifacts', 'openCodeInstructions']) {
    assert.ok(!Object.prototype.hasOwnProperty.call(manifest, field));
  }

  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});

for (const agent of ['codex', 'multi']) {
  test(`first ${agent} init creates one empty Codex rules region when rules are none`, () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', agent, '--rules', 'none', '--skills', 'none']);
    assert.strictEqual(result.status, 0, result.stderr);

    const entry = read(path.join(workspace, 'AGENTS.md'));
    assert.strictEqual((entry.match(/niuma-harness:codex-rules begin/g) || []).length, 1);
    assert.strictEqual((entry.match(/niuma-harness:codex-rules end/g) || []).length, 1);
    assert.doesNotMatch(entry, /Selected engineering rules/);
  });
}

for (const agent of ['codex', 'multi']) {
  test(`re-run ${agent} init preserves the complete Codex rules region byte-for-byte and entry content outside the contract`, () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', agent, '--rules', 'common', '--skills', 'none']);
    assert.strictEqual(result.status, 0, result.stderr);
    const entryPath = path.join(workspace, 'AGENTS.md');
    fsWrite(entryPath, `${read(entryPath)}\n# Project override\nKeep this.\n`);
    const regionBefore = read(entryPath).match(/<!-- niuma-harness:codex-rules begin -->[\s\S]*?<!-- niuma-harness:codex-rules end -->/)[0];

    result = run(['init', workspace]);
    assert.strictEqual(result.status, 0, result.stderr);
    const entry = read(entryPath);
    assert.strictEqual(entry.match(/<!-- niuma-harness:codex-rules begin -->[\s\S]*?<!-- niuma-harness:codex-rules end -->/)[0], regionBefore);
    assert.match(entry, /# Project override\nKeep this\./);
  });
}

test('re-run init rejects an old Codex contract without a rules region without mutation', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex', '--rules', 'none', '--skills', 'none']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entryPath = path.join(workspace, 'AGENTS.md');
  fsWrite(entryPath, read(entryPath).replace(/\n*<!-- niuma-harness:codex-rules begin -->[\s\S]*?<!-- niuma-harness:codex-rules end -->/, ''));
  const before = snapshotTree(workspace);

  result = run(['init', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Codex rules region.*missing.*incompatible/);
  assertTreeUnchanged(workspace, before);
});

test('missing manifest performs fresh init and installs selected assets', () => {
  const workspace = tempDir();
  assert.strictEqual(snapshotTree(path.join(workspace, 'harness', 'manifest.json')), null);

  const result = run(['init', workspace, '--agent', 'claude', '--rules', 'common', '--skills', 'database-readonly']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(readJson(path.join(workspace, 'harness', 'manifest.json')).schemaVersion, 5);
  assert.ok(snapshotTree(path.join(workspace, '.claude', 'rules', 'common')));
  assert.ok(snapshotTree(path.join(workspace, '.claude', 'skills', 'database-readonly')));
  assert.ok(snapshotTree(path.join(workspace, '.claude', 'commands')));
});

for (const schemaVersion of [2, 3, 4]) {
  test(`re-run init migrates a real schemaVersion ${schemaVersion} core manifest without reading legacy asset state`, () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', 'multi', '--rules', 'common', '--skills', 'database-readonly']);
    assert.strictEqual(result.status, 0, result.stderr);
    const manifestPath = path.join(workspace, 'harness', 'manifest.json');
    const createdAt = `2026-01-0${schemaVersion}T00:00:00.000Z`;
    fsWrite(manifestPath, `${JSON.stringify(createLegacyCoreManifest(schemaVersion, createdAt), null, 2)}\n`);
    const assetsBefore = snapshotAgentAssets(workspace);
    for (const [surface, snapshot] of Object.entries(assetsBefore)) {
      assert.ok(snapshot, `multi init should install ${surface} assets`);
    }

    result = run(['init', workspace]);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.deepStrictEqual(snapshotAgentAssets(workspace), assetsBefore);
    const manifest = readJson(manifestPath);
    assert.strictEqual(manifest.schemaVersion, 5);
    assert.strictEqual(manifest.createdAt, createdAt);
    for (const field of ['rules', 'skills', 'commands', 'artifacts', 'openCodeInstructions']) {
      assert.ok(!Object.prototype.hasOwnProperty.call(manifest, field));
    }
    assert.strictEqual(run(['doctor', workspace]).status, 0);
  });
}

function createLegacyCoreManifest(schemaVersion, createdAt) {
  const manifest = {
    schemaVersion,
    agent: 'multi',
    harnessDir: 'harness',
    workDir: 'agent-work',
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
    createdBy: 'niuma-harness',
    createdAt,
    rules: 'broken',
    skills: { broken: true },
    commands: null,
    artifacts: 'not-a-ledger',
    openCodeInstructions: { invalid: true },
  };
  if (schemaVersion >= 3) {
    manifest.topology = { mode: 'single', modules: [] };
    manifest.moduleSupplements = [];
  }
  return manifest;
}

function snapshotAgentAssets(workspace) {
  return {
    claude: snapshotTree(path.join(workspace, '.claude')),
    agents: snapshotTree(path.join(workspace, '.agents')),
    opencode: snapshotTree(path.join(workspace, '.opencode')),
    opencodeConfig: snapshotTree(path.join(workspace, 'opencode.json')),
  };
}

function fsWrite(filePath, content) {
  require('fs').writeFileSync(filePath, content, 'utf8');
}
