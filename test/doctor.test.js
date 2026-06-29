const {
  assert,
  fs,
  path,
  read,
  readJson,
  run,
  tempDir,
} = require('./helpers');

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /OK manifest\.json/);
  assert.match(result.stdout, /OK docs\/layers\/01-context\/memo\.md/);
  assert.match(result.stdout, /OK agent-work\//);
  assert.match(result.stdout, /OK agent-work\/README\.md/);
  assert.match(result.stdout, /OK agent-work\/tasks\//);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['check', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', path.join(workspace, 'harness')]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'multi', '--harness-dir', 'ai-harness']);
  assert.strictEqual(init.status, 0, init.stderr);
  const result = run(['doctor', workspace, '--harness-dir', 'ai-harness']);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
}

{
  const workspace = tempDir();
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail without manifest');
  assert.match(result.stdout, /missing manifest\.json/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.writeFileSync(path.join(workspace, 'harness', 'manifest.json'), '{bad json', 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail on invalid JSON');
  assert.match(result.stdout, /invalid manifest\.json/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'CLAUDE.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when entry file is missing');
  assert.match(result.stdout, /missing entry file CLAUDE\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'layers', '05-recovery', 'memo.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a layer memo is missing');
  assert.match(result.stdout, /missing docs\/layers\/05-recovery\/memo\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, 'agent-work'), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work is missing');
  assert.match(result.stdout, /missing agent-work\//);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'agent-work', 'README.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work README is missing');
  assert.match(result.stdout, /missing agent-work\/README\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.rmSync(path.join(workspace, 'agent-work', 'tasks'), { recursive: true, force: true });
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when agent-work tasks directory is missing');
  assert.match(result.stdout, /missing agent-work\/tasks\//);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  delete manifest.workDir;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when workDir is missing');
  assert.match(result.stdout, /missing workDir/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = 'copy';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when rules is a string');
  assert.match(result.stdout, /rules must be an array/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const manifest = readJson(manifestPath);
  manifest.rules = ['unknown'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when rules contains an unknown directory');
  assert.match(result.stdout, /invalid rules/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude', '--rules', 'java']);
  assert.strictEqual(init.status, 0, init.stderr);
  fs.unlinkSync(path.join(workspace, 'harness', 'docs', 'rules', 'java', 'testing.md'));
  const result = run(['doctor', workspace]);
  assert.notStrictEqual(result.status, 0, 'doctor should fail when a selected rule file is missing');
  assert.match(result.stdout, /missing docs\/rules\/java\/testing\.md/);
}

{
  const workspace = tempDir();
  const init = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(init.status, 0, init.stderr);
  const manifestPath = path.join(workspace, 'harness', 'manifest.json');
  const before = read(manifestPath);
  const result = run(['doctor', workspace]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(manifestPath), before, 'doctor should not modify manifest');
}
