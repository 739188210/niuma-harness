const test = require('node:test');
const {
  assert,
  assertFile,
  assertNoPath,
  assertTreeUnchanged,
  fs,
  path,
  read,
  readJson,
  run,
  snapshotTree,
  tempDir,
} = require('./helpers');

function seedWorkspace() {
  const workspace = tempDir();
  fs.mkdirSync(path.join(workspace, 'apps', 'admin'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'services', 'orders'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({
    private: true,
    workspaces: ['apps/*', 'services/*'],
  }, null, 2));
  return workspace;
}

test('topology discovery previews candidates without writing', () => {
  const workspace = seedWorkspace();
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', 'claude', '--topology', 'discover', '--dry-run']);

  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Topology: apps\/admin, services\/orders/);
  assert.match(result.stdout, /apps\/admin/);
  assert.match(result.stdout, /services\/orders/);
  assertTreeUnchanged(workspace, before);
});

test('discovery requires a TTY before adopting module candidates', () => {
  const workspace = seedWorkspace();
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', 'claude', '--topology', 'discover']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /preview-only without a TTY/);
  assertTreeUnchanged(workspace, before);
});

test('explicit modules initialize root routing and local supplements', () => {
  const workspace = seedWorkspace();
  const result = run([
    'init', workspace, '--agent', 'multi',
    '--modules', 'apps/admin,services/orders',
  ]);

  assert.strictEqual(result.status, 0, result.stderr);
  const harness = path.join(workspace, 'harness');
  const registry = readJson(path.join(harness, 'modules.json'));
  assert.deepStrictEqual(registry.modules.map((module) => module.root), ['apps/admin', 'services/orders']);
  assertFile(path.join(harness, 'docs', 'module-topology.md'));
  const route = read(path.join(harness, 'docs', 'module-topology.md'));
  assert.match(route, /apps\/admin/);
  assert.match(route, /`apps\/admin\/CLAUDE\.md`/);
  assert.match(route, /`apps\/admin\/AGENTS\.md`/);
  assert.match(read(path.join(workspace, 'apps', 'admin', 'CLAUDE.md')), /niuma-harness:module-supplement begin/);
  assert.match(read(path.join(workspace, 'apps', 'admin', 'AGENTS.md')), /niuma-harness:module-supplement begin/);
  assert.match(read(path.join(workspace, 'CLAUDE.md')), /module-topology/);
  assert.strictEqual(readJson(path.join(harness, 'manifest.json')).schemaVersion, 3);
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
});

test('fresh module entries include an empty user-managed knowledge skeleton', () => {
  const workspace = seedWorkspace();
  const result = run([
    'init', workspace, '--agent', 'multi',
    '--modules', 'apps/admin',
  ]);

  assert.strictEqual(result.status, 0, result.stderr);
  for (const entryFile of ['CLAUDE.md', 'AGENTS.md']) {
    const entry = read(path.join(workspace, 'apps', 'admin', entryFile));
    const markerEnd = entry.indexOf('<!-- niuma-harness:module-supplement end -->');
    assert.ok(markerEnd >= 0);
    for (const heading of [
      '# Module knowledge',
      '## Module responsibilities and boundaries',
      '## Dependencies and dependents',
      '## Build, test, and startup commands',
      '## Source and test entry points',
      '## Configuration locations',
      '## Module constraints, risks, and known issues',
      '## Cross-module verification triggers',
    ]) {
      assert.ok(entry.indexOf(heading) > markerEnd, `${entryFile} must place ${heading} after the managed marker`);
    }
    for (const prompt of [
      /public responsibility.*does not own/i,
      /dependencies.*consume/i,
      /building, testing, and starting/i,
      /source, runtime, and test entry points/i,
      /configuration files, environment-variable/i,
      /limits.*risks.*known issues/i,
      /cross-module verification.*integration checks/i,
    ]) assert.match(entry, prompt);
    assert.doesNotMatch(entry, /npm test|pnpm test|yarn test/i);
  }
});

test('re-init preserves user-managed module knowledge and Doctor ignores it', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);

  const entryPath = path.join(workspace, 'apps', 'admin', 'CLAUDE.md');
  const userKnowledge = '\nVerified local fact: use the module test target before integration checks.\n';
  fs.writeFileSync(entryPath, `${read(entryPath)}${userKnowledge}`, 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(read(entryPath).endsWith(userKnowledge));

  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stdout || doctor.stderr);
});

test('explicit single topology cannot replace an existing module registry', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  const before = snapshotTree(workspace);

  result = run(['init', workspace, '--agent', 'claude', '--topology', 'single']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /explicit topology differs from the existing module registry/);
  assertTreeUnchanged(workspace, before);
});

test('retiring a merged module supplement preserves project entry content', () => {
  const workspace = seedWorkspace();
  const entryPath = path.join(workspace, 'apps', 'admin', 'CLAUDE.md');
  const projectEntry = '# Project module notes\n\nKeep this content.\n';
  fs.writeFileSync(entryPath, projectEntry, 'utf8');

  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(read(entryPath), /niuma-harness:module-supplement begin/);

  const registryPath = path.join(workspace, 'harness', 'modules.json');
  fs.writeFileSync(registryPath, `${JSON.stringify({ schemaVersion: 1, modules: [] }, null, 2)}\n`, 'utf8');
  result = run(['init', workspace, '--agent', 'claude']);

  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(entryPath), projectEntry);
  assert.doesNotMatch(read(entryPath), /niuma-harness:module-supplement/);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('retiring an unchanged Niuma-created module entry removes it', () => {
  const workspace = seedWorkspace();
  const entryPath = path.join(workspace, 'apps', 'admin', 'CLAUDE.md');
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(entryPath);

  const registryPath = path.join(workspace, 'harness', 'modules.json');
  fs.writeFileSync(registryPath, `${JSON.stringify({ schemaVersion: 1, modules: [] }, null, 2)}\n`, 'utf8');
  result = run(['init', workspace, '--agent', 'claude']);

  assert.strictEqual(result.status, 0, result.stderr);
  assertNoPath(entryPath);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('existing registry requires explicit topology selection on first init', () => {
  const workspace = seedWorkspace();
  const registryPath = path.join(workspace, 'harness', 'modules.json');
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify({ schemaVersion: 1, modules: [{ id: 'admin', root: 'apps/admin' }] }, null, 2));
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /existing module registry requires/);
  assertTreeUnchanged(workspace, before);
});

test('repair reports a missing user-owned module registry without recreating it', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  const registryPath = path.join(workspace, 'harness', 'modules.json');
  fs.unlinkSync(registryPath);
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /MODULE-REGISTRY-MISSING/);
  assertNoPath(registryPath);
});

test('registry module identity fields must be safe explicit tokens before init writes', () => {
  const invalidModules = [
    { root: 'apps/admin' },
    { id: 7, root: 'apps/admin' },
    { id: 'admin\ninjected', root: 'apps/admin' },
    { id: 'admin|injected', root: 'apps/admin' },
    { id: 'admin-->', root: 'apps/admin' },
    { id: 'admin', root: 'apps/admin', kind: null },
    { id: 'admin', root: 'apps/admin', kind: 'service\ninjected' },
    { id: 'admin', root: 'apps/admin', kind: 'service|injected' },
  ];

  for (const module of invalidModules) {
    const workspace = seedWorkspace();
    const registryPath = path.join(workspace, 'harness', 'modules.json');
    fs.mkdirSync(path.dirname(registryPath), { recursive: true });
    fs.writeFileSync(registryPath, `${JSON.stringify({ schemaVersion: 1, modules: [module] }, null, 2)}\n`, 'utf8');
    const before = snapshotTree(workspace);

    const result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
    assert.notStrictEqual(result.status, 0, result.stderr);
    assert.match(result.stderr, /invalid module registry/);
    assertTreeUnchanged(workspace, before);
  }
});

test('repair diagnoses invalid or drifted project-owned module registries before writing', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  const registryPath = path.join(workspace, 'harness', 'modules.json');

  const invalidRegistry = '{not json\n';
  fs.writeFileSync(registryPath, invalidRegistry, 'utf8');
  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /invalid module registry/);
  let before = snapshotTree(workspace);
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /MODULE-REGISTRY-INVALID/);
  assert.strictEqual(read(registryPath), invalidRegistry);
  assertTreeUnchanged(workspace, before);

  result = run(['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Repair cannot safely resolve/);
  assert.strictEqual(read(registryPath), invalidRegistry);
  assertTreeUnchanged(workspace, before);
  assertNoPath(path.join(workspace, '.niuma-harness'));

  const driftedRegistry = `${JSON.stringify({
    schemaVersion: 1,
    modules: [{ id: 'services-orders', root: 'services/orders', kind: 'service' }],
  }, null, 2)}\n`;
  fs.writeFileSync(registryPath, driftedRegistry, 'utf8');
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'index.md'));
  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /module registry differs from installed topology/);
  before = snapshotTree(workspace);

  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /MODULE-REGISTRY-DRIFT/);
  assert.match(result.stdout, /module registry differs from installed topology/);
  assert.strictEqual(read(registryPath), driftedRegistry);
  assertTreeUnchanged(workspace, before);

  result = run(['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Repair cannot safely resolve/);
  assert.strictEqual(read(registryPath), driftedRegistry);
  assertNoPath(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertNoPath(path.join(workspace, '.niuma-harness'));
  assertTreeUnchanged(workspace, before);
});

test('root-only topology diagnoses an existing invalid or drifted registry before Repair writes', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const registryPath = path.join(workspace, 'harness', 'modules.json');
  fs.writeFileSync(registryPath, '{not json\n', 'utf8');
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'index.md'));
  const before = snapshotTree(workspace);

  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /invalid module registry/);
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /MODULE-REGISTRY-INVALID/);
  assertTreeUnchanged(workspace, before);

  result = run(['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Repair cannot safely resolve/);
  assertNoPath(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertNoPath(path.join(workspace, '.niuma-harness'));
  assertTreeUnchanged(workspace, before);
});

test('root-only topology rejects a non-file module registry before Repair writes', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const registryPath = path.join(workspace, 'harness', 'modules.json');
  fs.mkdirSync(registryPath);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'index.md'));
  const before = snapshotTree(workspace);

  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /module registry modules\.json is not a regular file/);
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /MODULE-REGISTRY-MISSING/);
  assertTreeUnchanged(workspace, before);

  result = run(['repair', workspace, '-y']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Repair cannot safely resolve/);
  assertNoPath(path.join(workspace, 'harness', 'docs', 'index.md'));
  assertNoPath(path.join(workspace, '.niuma-harness'));
  assertTreeUnchanged(workspace, before);
});

test('Repair ignores user-managed module knowledge while fixing root files', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);

  const entryPath = path.join(workspace, 'apps', 'admin', 'CLAUDE.md');
  const userKnowledge = '\nVerified module knowledge survives Repair.\n';
  fs.writeFileSync(entryPath, `${read(entryPath)}${userKnowledge}`, 'utf8');
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'index.md'));

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stdout || result.stderr);
  assert.ok(read(entryPath).endsWith(userKnowledge));
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('repair preserves valid topology when unrelated manifest selections are invalid', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);

  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const before = readJson(manifestPath);
  before.commands = [];
  fs.writeFileSync(manifestPath, `${JSON.stringify(before, null, 2)}\n`, 'utf8');

  result = run(['repair', workspace, '-y']);
  assert.strictEqual(result.status, 0, result.stdout || result.stderr);
  const repaired = readJson(manifestPath);
  assert.deepStrictEqual(repaired.topology, before.topology);
  assert.deepStrictEqual(repaired.moduleSupplements, before.moduleSupplements);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('schema-3 topology corruption produces Doctor diagnostics without crashing', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.topology.modules = [null];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /invalid topology ownership state/);
  result = run(['repair', workspace, '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /INVALID-TOPOLOGY-STATE/);
});

test('doctor reports a missing module route', () => {
  const workspace = seedWorkspace();
  const result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'module-topology.md'));
  const doctor = run(['doctor', workspace]);
  assert.notStrictEqual(doctor.status, 0);
  assert.match(doctor.stdout, /missing module topology route/);
});

test('doctor reports a drifted module supplement without rewriting it', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);
  const entry = path.join(workspace, 'apps', 'admin', 'CLAUDE.md');
  const drifted = read(entry).replace('Module: `apps-admin`', 'Module: `changed`');
  fs.writeFileSync(entry, drifted, 'utf8');

  result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /module supplement drifted/);
  assert.strictEqual(read(entry), drifted);
});

test('implicit re-init adopts project-managed registry updates without overwriting them', () => {
  const workspace = seedWorkspace();
  let result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin']);
  assert.strictEqual(result.status, 0, result.stderr);

  const harness = path.join(workspace, 'harness');
  const registryPath = path.join(harness, 'modules.json');
  const updatedRegistry = `${JSON.stringify({
    projectNote: 'maintained by the workspace',
    schemaVersion: 1,
    modules: [
      { id: 'apps-admin', root: 'apps/admin' },
      { id: 'services-orders', root: 'services/orders' },
    ],
  }, null, 4)}\n`;
  fs.writeFileSync(registryPath, updatedRegistry, 'utf8');
  fs.writeFileSync(path.join(harness, 'docs', 'module-topology.md'), 'stale route\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(registryPath), updatedRegistry);
  assert.match(result.stdout, /SKIP\s+.*modules\.json/);
  assert.match(result.stdout, /OVERWRITE\s+.*module-topology\.md/);
  const route = read(path.join(harness, 'docs', 'module-topology.md'));
  assert.doesNotMatch(route, /stale route/);
  assert.match(route, /apps\/admin/);
  assert.match(route, /services\/orders/);
  assertFile(path.join(workspace, 'services', 'orders', 'CLAUDE.md'));
  assert.deepStrictEqual(readJson(path.join(harness, 'manifest.json')).topology.modules.map((module) => module.root), ['apps/admin', 'services/orders']);
  assert.strictEqual(run(['doctor', workspace]).status, 0);
});

test('discovery reads every Gradle include argument', () => {
  const workspace = tempDir();
  fs.mkdirSync(path.join(workspace, 'app'), { recursive: true });
  fs.mkdirSync(path.join(workspace, 'shared'), { recursive: true });
  fs.writeFileSync(path.join(workspace, 'settings.gradle'), "include ':app', ':shared'\n", 'utf8');
  const result = run(['init', workspace, '--agent', 'claude', '--topology', 'discover', '--dry-run']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Topology: app, shared/);
});

test('module roots cannot alias the workspace root or each other', () => {
  const workspace = seedWorkspace();
  const before = snapshotTree(workspace);

  let result = run(['init', workspace, '--agent', 'claude', '--modules', '.']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /module root/i);
  assertTreeUnchanged(workspace, before);

  result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin,apps/./admin']);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /duplicate module root/i);
  assertTreeUnchanged(workspace, before);

  if (process.platform === 'win32') {
    result = run(['init', workspace, '--agent', 'claude', '--modules', 'apps/admin,apps/admin.']);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /module root/i);
    assertTreeUnchanged(workspace, before);
  }
});

test('unsafe or malformed module targets fail before any write', () => {
  const workspace = seedWorkspace();
  const before = snapshotTree(workspace);
  const result = run(['init', workspace, '--agent', 'claude', '--modules', '../outside']);

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /module root|path/i);
  assertTreeUnchanged(workspace, before);
  assertNoPath(path.join(workspace, 'harness'));
});
