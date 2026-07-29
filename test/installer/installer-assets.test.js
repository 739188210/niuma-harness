const test = require('node:test');
const fs = require('fs');
const path = require('path');
const {
  assert,
  read,
  tempDir,
} = require('../support/helpers');
const {
  getAssetChoices,
  getAvailableAssetNames,
  normalizeInstallerAssetNames,
} = require('../../src/installer/catalog');
const { renderInstallerArtifacts } = require('../../src/installer/render');
const {
  createAssetInstallPlan,
  formatAssetInstallPlan,
  hasConflicts,
  hasUnsafeTargets,
  revalidateAssetInstallPlan,
} = require('../../src/installer/plan');
const { digestBytes } = require('../../src/artifact/ledger');

function targets(artifacts) {
  return artifacts.map((item) => item.target);
}

test('installer modules use neutral digest and template-path utilities', () => {
  const ledgerSource = fs.readFileSync(require.resolve('../../src/artifact/ledger'), 'utf8');
  const renderSource = fs.readFileSync(require.resolve('../../src/installer/render'), 'utf8');
  const planSource = fs.readFileSync(require.resolve('../../src/installer/plan'), 'utf8');

  assert.match(ledgerSource, /\.\.\/infrastructure\/content-digest/);
  for (const source of [renderSource, planSource]) {
    assert.doesNotMatch(source, /\.\.\/artifact\/ledger/);
    assert.match(source, /\.\.\/infrastructure\/content-digest/);
  }
  assert.doesNotMatch(renderSource, /\.\.\/generator\/template-manifest/);
  assert.match(renderSource, /\.\.\/infrastructure\/template-paths/);
});

test('installer catalog exposes sorted canonical names and command ids', () => {
  const names = getAvailableAssetNames('command');
  assert.deepStrictEqual(names, [...names].sort((left, right) => left.localeCompare(right)));
  assert.ok(names.includes('dev-check'));
  assert.ok(!names.includes('dev-check.md'));
  assert.deepStrictEqual(normalizeInstallerAssetNames('command', ['dev-check', 'dev-check']), ['dev-check']);
  assert.throws(() => normalizeInstallerAssetNames('command', ['dev-check.md']), /Unknown command: dev-check\.md/);
  assert.ok(getAssetChoices('command').some((choice) => choice.name === 'dev-check' && choice.description));
});

test('installer catalog rejects unknown assets with available names', () => {
  assert.throws(
    () => normalizeInstallerAssetNames('rule', ['not-a-rule']),
    /Unknown rule: not-a-rule\. Available:/
  );
});

test('install-command renders one selected command for every multi native target', () => {
  const artifacts = renderInstallerArtifacts({ type: 'command', agent: 'multi', names: ['dev-check'] });
  assert.ok(artifacts.some((item) => item.target === '.claude/commands/dev-check.md'));
  assert.ok(artifacts.some((item) => item.target === '.opencode/commands/dev-check.md'));
  assert.ok(artifacts.some((item) => item.target === '.agents/skills/dev-check/SKILL.md'));
  assert.ok(artifacts.some((item) => item.target === '.agents/skills/dev-check/agents/openai.yaml'));
  assert.ok(targets(artifacts).every((target) => target.includes('dev-check')));
});

test('install-rule renders standalone codex rule files without rendering an entry contract', () => {
  const artifacts = renderInstallerArtifacts({ type: 'rule', agent: 'codex', names: ['common'] });
  assert.ok(artifacts.some((item) => item.target === '.codex/rules/common/testing.md'));
  assert.ok(artifacts.every((item) => !item.target.endsWith('AGENTS.md')));
});

test('install-rule renders all three standalone roots for multi', () => {
  const artifacts = renderInstallerArtifacts({ type: 'rule', agent: 'multi', names: ['common'] });
  for (const root of ['.claude/rules', '.codex/rules', '.opencode/rules']) {
    assert.ok(artifacts.some((item) => item.target.startsWith(`${root}/common/`)));
  }
  assert.ok(artifacts.every((item) => !item.target.endsWith('AGENTS.md')));
});

test('install-skill renders only selected skills in each native target root', () => {
  const artifacts = renderInstallerArtifacts({ type: 'skill', agent: 'multi', names: ['database-readonly'] });
  for (const root of ['.claude/skills', '.agents/skills', '.opencode/skills']) {
    assert.ok(artifacts.some((item) => item.target.startsWith(`${root}/database-readonly/`)));
  }
  assert.ok(targets(artifacts).every((target) => target.includes('/database-readonly/')));
});

test('rendered installer artifacts are deterministic, canonical, and deduplicated', () => {
  const artifacts = renderInstallerArtifacts({ type: 'command', agent: 'multi', names: ['dev-check'] });
  assert.deepStrictEqual(targets(artifacts), [...targets(artifacts)].sort((left, right) => left.localeCompare(right)));
  assert.strictEqual(new Set(targets(artifacts)).size, artifacts.length);
  for (const artifact of artifacts) {
    assert.deepStrictEqual(Object.keys(artifact).sort(), ['content', 'digest', 'kind', 'source', 'target']);
    assert.strictEqual(artifact.digest, digestBytes(Buffer.from(artifact.content, 'utf8')));
  }
});

test('asset install plan classifies create, unchanged, and conflict without writing', () => {
  const workspaceDir = tempDir();
  const artifacts = renderInstallerArtifacts({ type: 'command', agent: 'claude', names: ['dev-check'] });
  const artifact = artifacts[0];
  const plan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });
  assert.deepStrictEqual(plan.map((item) => ({ target: item.target, status: item.status, observedDigest: item.observedDigest })), [{
    target: artifact.target,
    status: 'CREATE',
    observedDigest: null,
  }]);
  assert.ok(!hasConflicts(plan));
  assert.ok(!hasUnsafeTargets(plan));

  const targetPath = path.join(workspaceDir, ...artifact.target.split('/'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, artifact.content, 'utf8');
  const unchangedPlan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });
  assert.strictEqual(unchangedPlan[0].status, 'UNCHANGED');
  assert.strictEqual(unchangedPlan[0].observedDigest, artifact.digest);

  fs.writeFileSync(targetPath, 'local content\n', 'utf8');
  const conflictPlan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });
  assert.strictEqual(conflictPlan[0].status, 'CONFLICT');
  assert.strictEqual(conflictPlan[0].observedDigest, digestBytes(read(targetPath)));
  assert.ok(hasConflicts(conflictPlan));
  assert.match(formatAssetInstallPlan({ type: 'command', plan: conflictPlan }), /CONFLICT/);
});

test('asset install plan marks unsafe targets and rejects changed observations during revalidation', () => {
  const workspaceDir = tempDir();
  const artifact = renderInstallerArtifacts({ type: 'command', agent: 'claude', names: ['dev-check'] })[0];
  const targetPath = path.join(workspaceDir, ...artifact.target.split('/'));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.mkdirSync(targetPath);
  const unsafePlan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });
  assert.strictEqual(unsafePlan[0].status, 'UNSAFE');
  assert.ok(hasUnsafeTargets(unsafePlan));

  fs.rmSync(targetPath, { recursive: true });
  const createPlan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });
  fs.writeFileSync(targetPath, 'race\n', 'utf8');
  assert.throws(
    () => revalidateAssetInstallPlan({ workspaceDir, plan: createPlan }),
    /changed since planning/
  );
});

test('asset install plan marks a regular-file target ancestor as unsafe', () => {
  const workspaceDir = tempDir();
  const artifact = renderInstallerArtifacts({ type: 'command', agent: 'claude', names: ['dev-check'] })[0];
  const targetPath = path.join(workspaceDir, ...artifact.target.split('/'));
  const blockingParent = path.dirname(path.dirname(targetPath));
  fs.mkdirSync(path.dirname(blockingParent), { recursive: true });
  fs.writeFileSync(blockingParent, 'not a directory\n', 'utf8');

  const plan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });

  assert.strictEqual(plan[0].status, 'UNSAFE');
  assert.strictEqual(plan[0].observedDigest, null);
  assert.ok(hasUnsafeTargets(plan));
});

test('asset install plan treats ENOTDIR from a regular-file ancestor as unsafe', () => {
  const workspaceDir = tempDir();
  const artifact = renderInstallerArtifacts({ type: 'command', agent: 'claude', names: ['dev-check'] })[0];
  const targetPath = path.join(workspaceDir, ...artifact.target.split('/'));
  const blockingParent = path.dirname(path.dirname(targetPath));
  fs.mkdirSync(path.dirname(blockingParent), { recursive: true });
  fs.writeFileSync(blockingParent, 'not a directory\n', 'utf8');

  const originalLstatSync = fs.lstatSync;
  const concealedDirectories = new Set([blockingParent, path.dirname(targetPath)]);
  fs.lstatSync = (candidatePath) => {
    if (concealedDirectories.has(candidatePath)) {
      return { isDirectory: () => true, isSymbolicLink: () => false };
    }
    return originalLstatSync(candidatePath);
  };
  try {
    const plan = createAssetInstallPlan({ workspaceDir, artifacts: [artifact] });
    assert.strictEqual(plan[0].status, 'UNSAFE');
  } finally {
    fs.lstatSync = originalLstatSync;
  }
});
