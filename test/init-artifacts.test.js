const test = require('node:test');
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
  run,
  tempDir,
} = require('./init-fixtures');

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

test('re-init rejects drifted known command files and preserves unknown user commands', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const knownCommand = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  const unknownCommand = path.join(workspace, '.claude', 'commands', 'local-user-command.md');
  fs.writeFileSync(knownCommand, 'custom command\n', 'utf8');
  fs.writeFileSync(unknownCommand, 'local command\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude']);
  assert.notStrictEqual(result.status, 0, 're-init should reject a drifted owned command');
  assert.match(result.stderr, /owned command artifact drifted/);
  assert.strictEqual(read(knownCommand), 'custom command\n');
  assert.strictEqual(read(unknownCommand), 'local command\n');
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

test('re-init recreates a missing owned command artifact and refreshes its digest', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const commandPath = path.join(workspace, '.claude', 'commands', allCommandFiles[0]);
  fs.unlinkSync(commandPath);

  result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(commandPath);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    entryFiles: ['CLAUDE.md'],
  });
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

test('re-init rejects drifted codex command skills and preserves unknown user skills', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  const commandId = getCommandId(allCommandFiles[0]);
  const knownSkill = path.join(workspace, '.agents', 'skills', commandId, 'SKILL.md');
  const unknownSkill = path.join(workspace, '.agents', 'skills', 'local-user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(unknownSkill), { recursive: true });
  fs.writeFileSync(knownSkill, 'custom command skill\n', 'utf8');
  fs.writeFileSync(unknownSkill, 'local skill\n', 'utf8');

  result = run(['init', workspace, '--agent', 'codex']);
  assert.notStrictEqual(result.status, 0, 're-init should reject a drifted Codex command skill');
  assert.match(result.stderr, /owned command artifact drifted/);
  assert.strictEqual(read(knownSkill), 'custom command skill\n');
  assert.strictEqual(read(unknownSkill), 'local skill\n');
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
    assert.match(helper, /Copy \{example\.name\} to \{path\.name\}/);
    assert.match(helper, /Do not paste passwords, tokens, cookies, or the populated config into chat/);
    assert.match(helper, /Edit the local config file before running ZenTao network requests/);
    assert.match(helper, /scopes\.read is empty/);
    assert.match(helper, /scopes\.write may remain empty for read-only use/);
    assert.match(helper, /def validate_scope_entries\(scopes: list\[Any\], scope_type: str\) -> None:/);
    assert.match(helper, /scopes must be an object/);
    assert.match(helper, /\.projects must be an array/);
    assert.match(helper, /\.actions must be an array containing only comment or resolve/);
  });

  test('zentao local config is preserved while managed skill files refresh on re-init', () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
    const configPath = path.join(skillRoot, 'zentao.config.json');
    const examplePath = path.join(skillRoot, 'zentao.config.example.json');
    const scriptPath = path.join(skillRoot, 'scripts', 'zentao_bug.py');
    const originalExample = read(examplePath);
    const originalScript = read(scriptPath);
    fs.writeFileSync(configPath, '{"local": true}\n', 'utf8');
    fs.writeFileSync(examplePath, '{"unsafeExample": true}\n', 'utf8');
    fs.writeFileSync(scriptPath, 'old unsafe script\n', 'utf8');

    result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(read(configPath), '{"local": true}\n', 'local zentao config should be preserved');
    assert.strictEqual(read(examplePath), originalExample, 'managed ZenTao example should be refreshed');
    assert.strictEqual(read(scriptPath), originalScript, 'managed ZenTao helper should be refreshed');
  });

  test('deselecting zentao removes managed files but preserves local config and unknown files', () => {
    const workspace = tempDir();
    let result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const skillRoot = path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow');
    const configPath = path.join(skillRoot, 'zentao.config.json');
    const localFile = path.join(skillRoot, 'local-notes.md');
    fs.writeFileSync(configPath, '{"local": true}\n', 'utf8');
    fs.writeFileSync(localFile, 'keep me\n', 'utf8');

    result = run(['init', workspace, '--agent', 'claude', '--skills', 'none']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.strictEqual(read(configPath), '{"local": true}\n', 'deselect should preserve local zentao config');
    assert.strictEqual(read(localFile), 'keep me\n', 'deselect should preserve unknown user files');
    assertNoPath(path.join(skillRoot, 'zentao.config.example.json'));
    assertNoPath(path.join(skillRoot, 'SKILL.md'));
    assertNoPath(path.join(skillRoot, 'scripts', 'zentao_bug.py'));
    assertNoPath(path.join(skillRoot, 'scripts'));
  });

  test('zentao helper refuses external image URLs before sending token headers', () => {
    const workspace = tempDir();
    const result = run(['init', workspace, '--agent', 'claude', '--skills', 'zentao-bug-workflow']);
    assert.strictEqual(result.status, 0, result.stderr);
    const helper = read(path.join(workspace, '.claude', 'skills', 'zentao-bug-workflow', 'scripts', 'zentao_bug.py'));
    assert.match(helper, /def same_origin\(left: str, right: str\) -> bool:/);
    assert.match(helper, /Refusing to download external image URL from ZenTao bug content/);
    assert.match(helper, /request\.Request\(url, headers=\{"Token": token\}\)/);
    assert.match(helper, /request\.build_opener\(NoRedirectHandler\)/);
    assert.match(helper, /download_file\(ref\["url"\], target, token, config\)/);
  });
}

test('multi installs selected skills to all native target roots', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'multi', '--skills', primarySkill]);
  assert.strictEqual(result.status, 0, result.stderr);
  assertFile(path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.agents', 'skills', primarySkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.opencode', 'skills', primarySkill, 'SKILL.md'));
  assertSkillDirs(workspace, 'multi', [primarySkill]);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'multi',
    skills: [primarySkill],
    entryFiles: ['CLAUDE.md', 'AGENTS.md'],
  });
});

test('--skills all installs all available skills', () => {
  const workspace = tempDir();
  const result = run(['init', workspace, '--agent', 'claude', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertSkillDirs(workspace, 'claude', allSkillDirs);
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: allSkillDirs,
    entryFiles: ['CLAUDE.md'],
  });
});

test('re-init refreshes managed skill files and removes unselected known skills', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);
  const selectedSkillFile = path.join(workspace, '.claude', 'skills', primarySkill, 'SKILL.md');
  const originalSkill = read(selectedSkillFile);
  const unknownSkill = path.join(workspace, '.claude', 'skills', 'local-user-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(unknownSkill), { recursive: true });
  fs.writeFileSync(selectedSkillFile, 'custom skill\n', 'utf8');
  fs.writeFileSync(unknownSkill, 'local skill\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(selectedSkillFile), originalSkill, 'managed skill file should be refreshed on re-init');
  assertFile(unknownSkill);
  for (const skillName of allSkillDirs.filter((skillName) => skillName !== primarySkill)) {
    assertNoPath(path.join(workspace, '.claude', 'skills', skillName, 'SKILL.md'));
  }
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: [primarySkill],
    entryFiles: ['CLAUDE.md'],
  });
});

test('deselecting a known skill preserves unknown files inside its directory', () => {
  assert.ok(allSkillDirs.length > 1, 'test requires at least two known skills');
  const deselectedSkill = allSkillDirs.find((skillDir) => skillDir !== primarySkill);
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);
  const skillRoot = path.join(workspace, '.claude', 'skills', deselectedSkill);
  const localFile = path.join(skillRoot, 'local-notes.md');
  fs.writeFileSync(localFile, 'keep me\n', 'utf8');

  result = run(['init', workspace, '--agent', 'claude', '--skills', primarySkill]);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(read(localFile), 'keep me\n', 'deselect should preserve unknown files in a known skill directory');
  assertNoPath(path.join(skillRoot, 'SKILL.md'));
});

test('single-agent re-init does not remove other agent skill roots', () => {
  assert.ok(allSkillDirs.length > 1, 'test requires at least two known skills');
  const selectedSkill = allSkillDirs[0];
  const otherAgentSkill = allSkillDirs.find((skillDir) => skillDir !== selectedSkill);
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'multi', '--skills', 'all']);
  assert.strictEqual(result.status, 0, result.stderr);

  result = run(['init', workspace, '--agent', 'claude', '--skills', selectedSkill]);
  assert.strictEqual(result.status, 0, result.stderr);

  assertFile(path.join(workspace, '.claude', 'skills', selectedSkill, 'SKILL.md'));
  assertNoPath(path.join(workspace, '.claude', 'skills', otherAgentSkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.agents', 'skills', otherAgentSkill, 'SKILL.md'));
  assertFile(path.join(workspace, '.opencode', 'skills', otherAgentSkill, 'SKILL.md'));
  assertManifest(path.join(workspace, 'harness', 'manifest.json'), {
    agent: 'claude',
    skills: [selectedSkill],
    entryFiles: ['CLAUDE.md'],
    artifactTargets: getExpectedCommandArtifactTargets('multi', allCommandFiles),
  });
});

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

test('re-init with a different agent converges agent-specific rules', () => {
  const workspace = tempDir();
  let result = run(['init', workspace, '--agent', 'claude']);
  assert.strictEqual(result.status, 0, result.stderr);
  const harnessRoot = path.join(workspace, 'harness');
  assertRuleDirs(harnessRoot, expectedDefaultRules('claude'));

  const localClaudeRule = path.join(workspace, '.claude', 'rules', 'local.md');
  fs.mkdirSync(path.dirname(localClaudeRule), { recursive: true });
  fs.writeFileSync(localClaudeRule, 'local rule pointer\n', 'utf8');

  result = run(['init', workspace, '--agent', 'codex']);
  assert.strictEqual(result.status, 0, result.stderr);
  assertRuleDirs(harnessRoot, expectedDefaultRules('codex'));
  assertClaudeRulePointers(workspace, 'harness', []);
  assertFile(localClaudeRule);
  assertManifest(path.join(harnessRoot, 'manifest.json'), {
    agent: 'codex',
    entryFiles: ['AGENTS.md'],
    artifactTargets: [
      ...getExpectedCommandArtifactTargets('claude', allCommandFiles),
      ...getExpectedCommandArtifactTargets('codex', allCommandFiles),
    ],
  });
  const doctor = run(['doctor', workspace]);
  assert.strictEqual(doctor.status, 0, doctor.stderr);
});
