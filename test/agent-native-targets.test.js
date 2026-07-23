const test = require('node:test');
const { assert } = require('./helpers');
const {
  getAllEntryFiles,
  getAllKnownRuleTargetRoots,
  getAllRuleAdapterTargets,
  getAllSkillTargetRoots,
  getCommandTargetsForAgent,
  getEntryFilesForAgent,
  getLegacyClaudeRulePointerTarget,
  getLegacyRuleTargetRootsForAgent,
  getRuleAdapterTargetsForAgent,
  getRuleEntryInjectionForAgent,
  getRuleTargetRootsForAgent,
  getSkillTargetRootsForAgent,
  getSupportedAgents,
  isRuleArtifactManagedByAdapter,
} = require('../src/agent-native-targets');

test('agent-native targets declare the supported surface matrix', () => {
  assert.deepStrictEqual(getSupportedAgents(), ['claude', 'codex', 'opencode', 'multi']);
  assert.deepStrictEqual(getAllEntryFiles(), ['CLAUDE.md', 'AGENTS.md']);
  assert.deepStrictEqual(getAllSkillTargetRoots(), [
    '.claude/skills',
    '.agents/skills',
    '.opencode/skills',
  ]);
  assert.deepStrictEqual(getAllKnownRuleTargetRoots(), [
    '.claude/rules',
    '.claude/rules/niuma',
    '.opencode/rules',
    '.opencode/rules/niuma',
  ]);
  assert.deepStrictEqual(getAllRuleAdapterTargets(), [{
    file: 'opencode.json',
    kind: 'opencode-instructions',
    ruleRoot: '.opencode/rules',
  }]);

  assert.deepStrictEqual(getEntryFilesForAgent('claude'), ['CLAUDE.md']);
  assert.deepStrictEqual(getEntryFilesForAgent('codex'), ['AGENTS.md']);
  assert.deepStrictEqual(getEntryFilesForAgent('opencode'), ['AGENTS.md']);
  assert.deepStrictEqual(getEntryFilesForAgent('multi'), ['CLAUDE.md', 'AGENTS.md']);

  assert.deepStrictEqual(getCommandTargetsForAgent('claude'), [{ kind: 'claude-command', root: '.claude/commands' }]);
  assert.deepStrictEqual(getCommandTargetsForAgent('codex'), [{ kind: 'codex-skill-command', root: '.agents/skills' }]);
  assert.deepStrictEqual(getCommandTargetsForAgent('opencode'), [{ kind: 'opencode-command', root: '.opencode/commands' }]);
  assert.deepStrictEqual(getCommandTargetsForAgent('multi'), [
    { kind: 'claude-command', root: '.claude/commands' },
    { kind: 'codex-skill-command', root: '.agents/skills' },
    { kind: 'opencode-command', root: '.opencode/commands' },
  ]);

  assert.deepStrictEqual(getRuleTargetRootsForAgent('claude'), ['.claude/rules']);
  assert.deepStrictEqual(getRuleTargetRootsForAgent('codex'), []);
  assert.deepStrictEqual(getRuleTargetRootsForAgent('opencode'), ['.opencode/rules']);
  assert.deepStrictEqual(getRuleTargetRootsForAgent('multi'), ['.claude/rules', '.opencode/rules']);
  assert.deepStrictEqual(getLegacyRuleTargetRootsForAgent('multi'), [
    '.claude/rules/niuma',
    '.opencode/rules/niuma',
  ]);

  assert.strictEqual(getRuleEntryInjectionForAgent('claude'), null);
  assert.deepStrictEqual(getRuleEntryInjectionForAgent('codex'), {
    entryFile: 'AGENTS.md',
    renderer: 'codex-rules',
  });
  assert.deepStrictEqual(getRuleEntryInjectionForAgent('multi'), {
    entryFile: 'AGENTS.md',
    renderer: 'codex-rules',
  });
  assert.deepStrictEqual(getSkillTargetRootsForAgent('multi'), [
    '.claude/skills',
    '.agents/skills',
    '.opencode/skills',
  ]);
});

test('agent-native target queries return defensive copies', () => {
  const commands = getCommandTargetsForAgent('claude');
  commands[0].root = 'changed';
  commands.push({ kind: 'other', root: 'other' });
  assert.deepStrictEqual(getCommandTargetsForAgent('claude'), [{ kind: 'claude-command', root: '.claude/commands' }]);

  const adapters = getRuleAdapterTargetsForAgent('opencode');
  adapters[0].ruleRoot = 'changed';
  assert.deepStrictEqual(getRuleAdapterTargetsForAgent('opencode'), [{
    file: 'opencode.json',
    kind: 'opencode-instructions',
    ruleRoot: '.opencode/rules',
  }]);

  const roots = getSkillTargetRootsForAgent('multi');
  roots.pop();
  assert.deepStrictEqual(getSkillTargetRootsForAgent('multi'), [
    '.claude/skills',
    '.agents/skills',
    '.opencode/skills',
  ]);
});

test('adapter matching and legacy pointer paths stay explicit', () => {
  const adapter = getRuleAdapterTargetsForAgent('opencode')[0];
  assert.ok(isRuleArtifactManagedByAdapter(adapter, '.opencode/rules/common/testing.md'));
  assert.ok(!isRuleArtifactManagedByAdapter(adapter, '.claude/rules/common/testing.md'));
  assert.strictEqual(getLegacyClaudeRulePointerTarget('common'), '.claude/rules/niuma-common.md');
});
