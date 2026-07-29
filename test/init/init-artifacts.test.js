const test = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  allCommandFiles,
  allSkillDirs,
  assert,
  assertClaudeRulePointers,
  assertCommandFiles,
  assertFile,
  assertManifest,
  assertNoPath,
  assertRuleDirs,
  assertSkillDirs,
  expectedDefaultRules,
  fs,
  getCommandId,
  getExpectedCommandArtifactTargets,
  getSkillFiles,
  gitSyncCommand,
  normalizeSkills,
  path,
  primarySkill,
  read,
  readJson,
  run,
  tempDir,
} = require('../support/init-fixtures');

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

test('init refuses to overwrite an unowned Codex command skill before other scaffold writes', () => {
  const workspace = tempDir();
  const commandId = getCommandId(allCommandFiles[0]);
  const skillPath = path.join(workspace, '.agents', 'skills', commandId, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, 'user skill\n', 'utf8');

  const result = run(['init', workspace, '--agent', 'codex']);
  assert.notStrictEqual(result.status, 0, 'init should reject an unowned command target');
  assert.match(result.stderr, /refusing to overwrite unowned command artifact/);
  assert.strictEqual(read(skillPath), 'user skill\n');
  assertNoPath(path.join(workspace, 'AGENTS.md'));
  assertNoPath(path.join(workspace, 'harness'));
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

test('git-submit-idea command preserves default Change List and fat_saas boundaries', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  const commandId = getCommandId('git-submit-idea.md');
  const skill = read(path.join(workspace, '.agents', 'skills', commandId, 'SKILL.md'));
  assert.match(skill, /default="true"/);
  assert.match(skill, /fat_saas/);
  assert.match(skill, /git add \./);
  assert.match(skill, /暂存区不为空，停止/);
  assert.match(skill, /不得退化为提交全部本地改动/);
  assert.match(skill, /git push -u origin HEAD/);
  assert.match(skill, /不重复创建/);
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
  test('zentao skill distributes a managed example without a local config', () => {
    const files = getSkillFiles('zentao-bug-workflow');
    assert.ok(files.some((file) => file.relativePath === 'zentao.config.example.json'));
    assert.ok(!files.some((file) => file.relativePath === 'zentao.config.json'));
    assert.ok(!files.some((file) => file.relativePath === 'niuma-skill.json'));

    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
    const examplePath = path.join(skillRoot, 'zentao.config.example.json');
    assertFile(examplePath);
    assertNoPath(path.join(skillRoot, 'zentao.config.json'));
    assertNoPath(path.join(skillRoot, 'niuma-skill.json'));

    const example = JSON.parse(read(examplePath));
    assert.deepStrictEqual(example.scopes.read, []);
    assert.deepStrictEqual(example.scopes.write, []);
    assert.strictEqual(example.writePolicy.enabled, false);
    assert.strictEqual(example.writePolicy.autoCommentAfterValidation, false);
    assert.strictEqual(example.writePolicy.autoResolveAfterValidation, false);
  });

  test('zentao init-config creates a local config once without overwriting it', (t) => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
    const helperPath = path.join(skillRoot, 'scripts', 'zentao_bug.py');
    const examplePath = path.join(skillRoot, 'zentao.config.example.json');
    const configPath = path.join(skillRoot, 'zentao.config.json');
    const python = process.platform === 'win32' ? 'python' : 'python3';

    const first = spawnSync(python, [helperPath, 'init-config'], { cwd: skillRoot, encoding: 'utf8' });
    if (first.error && first.error.code === 'ENOENT') {
      t.skip('Python 3 is unavailable for helper behavior coverage');
      return;
    }
    assert.strictEqual(first.status, 0, first.stderr);
    assert.strictEqual(read(configPath), read(examplePath));
    if (process.platform !== 'win32') {
      assert.strictEqual(fs.statSync(configPath).mode & 0o777, 0o600);
    }
    assert.match(first.stdout, /"created": true/);
    assert.doesNotMatch(first.stdout, /change-me|zentao\.example\.com/);

    fs.writeFileSync(configPath, '{"local": true}\n', 'utf8');
    const second = spawnSync(python, [helperPath, 'init-config'], { cwd: skillRoot, encoding: 'utf8' });
    assert.strictEqual(second.status, 0, second.stderr);
    assert.strictEqual(read(configPath), '{"local": true}\n');
    assert.match(second.stdout, /"created": false/);
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
    assert.match(helper, /zentao\.config\.example\.json/);
    assert.match(helper, /Run init-config or copy \{example\.name\} to \{path\.name\}/);
    assert.match(helper, /def command_init_config\(root: Path\) -> dict\[str, Any\]:/);
    assert.match(helper, /config_path\.open\("xb"\)/);
    assert.match(helper, /"init-config"/);
    assert.match(helper, /Do not paste passwords, tokens, cookies, or the populated config into chat/);
    assert.match(helper, /Edit the local config file before running ZenTao network requests/);
    assert.match(helper, /scopes\.read is empty/);
    assert.match(helper, /scopes\.write may remain empty for read-only use/);
    assert.match(helper, /def validate_scope_entries\(scopes: list\[Any\], scope_type: str\) -> None:/);
    assert.match(helper, /scopes must be an object/);
    assert.match(helper, /\.projects must be an array/);
    assert.match(helper, /\.actions must be an array containing only comment or resolve/);
    const powershell = read(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'scripts', 'zentao_bug.ps1'));
    const skill = read(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'SKILL.md'));
    const readme = read(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'README.md'));
    assert.match(powershell, /"init-config"/);
    assert.match(skill, /python scripts\/zentao_bug\.py init-config/);
    assert.match(readme, /python scripts\/zentao_bug\.py init-config/);
    assert.match(skill, /"actions": \["comment"\]/);
    assert.match(readme, /"actions": \["comment"\]/);
  });
}

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
