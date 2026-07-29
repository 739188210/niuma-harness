const fs = require('fs');
const path = require('path');
const {
  getAvailableCommandFiles,
  getCommandId,
  getCommandsRootPath,
  parseCommandSpec,
} = require('../command/catalog');
const { getAvailableRuleDirs } = require('../rule/catalog');
const { getAvailableSkillDirs } = require('../skill/catalog');

const CATALOGS = {
  command: {
    label: 'commands',
    getAvailable: () => getAvailableCommandFiles().map(getCommandId).sort(compareNames),
  },
  rule: { label: 'rules', getAvailable: () => [...getAvailableRuleDirs()].sort(compareNames) },
  skill: { label: 'skills', getAvailable: () => [...getAvailableSkillDirs()].sort(compareNames) },
};

function getAvailableAssetNames(type) {
  return getCatalog(type).getAvailable();
}

function normalizeInstallerAssetNames(type, names) {
  const available = getAvailableAssetNames(type);
  const selected = [];
  for (const name of names) {
    const value = String(name || '').trim();
    if (!available.includes(value)) {
      throw new Error(`Unknown ${type}: ${value}. Available: ${available.length === 0 ? '(none)' : available.join(', ')}`);
    }
    if (!selected.includes(value)) selected.push(value);
  }
  return selected;
}

function getAssetLabel(type) {
  return getCatalog(type).label;
}

function getAssetChoices(type) {
  const names = getAvailableAssetNames(type);
  if (type !== 'command') return names.map((name) => ({ name }));
  const root = getCommandsRootPath();
  return names.map((name) => {
    const commandFile = `${name}.md`;
    const content = fs.readFileSync(path.join(root, commandFile), 'utf8');
    return { name, description: parseCommandSpec(commandFile, content).description };
  });
}

function getCatalog(type) {
  const catalog = CATALOGS[type];
  if (!catalog) throw new Error(`Unknown asset type: ${type}`);
  return catalog;
}

function compareNames(left, right) {
  return left.localeCompare(right);
}

module.exports = {
  getAssetChoices,
  getAssetLabel,
  getAvailableAssetNames,
  normalizeInstallerAssetNames,
};
