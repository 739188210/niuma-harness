// skills 选择模型：从 templates/skills 发现技能包，并规范化 CLI 输入。
const fs = require('fs');
const path = require('path');
const {
  getAllSkillTargetRoots,
  getSkillTargetRootsForAgent,
} = require('./agent-native-targets');
const { listFilesRecursive } = require('./fs-safe');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const DEFAULT_SKILLS_ROOT = 'skills';
const DEFAULT_SKILLS_SELECTION = 'all';
const SPECIAL_SKILLS = new Set(['all', 'none']);

function getSkillsRootPath(skillsRoot = DEFAULT_SKILLS_ROOT) {
  return path.join(TEMPLATE_DIR, ...String(skillsRoot || DEFAULT_SKILLS_ROOT).split(/[\\/]+/));
}

function getAvailableSkillDirs(skillsRoot = DEFAULT_SKILLS_ROOT) {
  const skillsRootPath = getSkillsRootPath(skillsRoot);
  if (!fs.existsSync(skillsRootPath)) {
    return [];
  }

  return fs
    .readdirSync(skillsRootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getSkillFiles(skillName, skillsRoot = DEFAULT_SKILLS_ROOT) {
  const skillDir = path.join(getSkillsRootPath(skillsRoot), skillName);
  return listFilesRecursive(skillDir).map((sourcePath) => ({
    relativePath: path.relative(skillDir, sourcePath).split(path.sep).join('/'),
    sourcePath,
  }));
}

function normalizeSkills(skills, availableSkills = getAvailableSkillDirs()) {
  if (Array.isArray(skills)) {
    return normalizeConcreteSkills(skills, availableSkills, 'skills');
  }

  const tokens = parseSkillTokens(skills || DEFAULT_SKILLS_SELECTION, 'skills');
  if (tokens.length === 1 && tokens[0] === 'none') {
    return [];
  }

  if (tokens.length === 1 && tokens[0] === 'all') {
    return [...availableSkills];
  }

  if (tokens.some((token) => SPECIAL_SKILLS.has(token))) {
    throw new Error('all and none must be used alone.');
  }

  return normalizeConcreteSkills(tokens, availableSkills, 'skills');
}

function normalizeConcreteSkills(skills, availableSkills = getAvailableSkillDirs(), label = 'skills') {
  const normalized = [];
  for (const skill of skills) {
    const value = normalizeSkillName(skill, label);
    if (SPECIAL_SKILLS.has(value)) {
      throw new Error(`${value} is not a skill directory for --${label}.`);
    }

    if (!availableSkills.includes(value)) {
      throw new Error(`unknown skill directory: ${value}. Available: ${formatAvailableSkills(availableSkills)}`);
    }

    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return availableSkills.filter((skill) => normalized.includes(skill));
}

function parseSkillTokens(value, label) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error(`--${label} cannot be empty.`);
  }

  const tokens = raw.split(',').map((token) => token.trim().toLowerCase());
  if (tokens.some((token) => !token)) {
    throw new Error(`--${label} cannot contain empty skill names.`);
  }

  return tokens;
}

function normalizeSkillName(skill, label) {
  const value = String(skill || '').trim().toLowerCase();
  if (!value) {
    throw new Error(`--${label} cannot contain empty skill names.`);
  }

  if (value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error(`--${label} values must be simple skill directory names.`);
  }

  if (!/^[a-z0-9._-]+$/.test(value)) {
    throw new Error(`--${label} values may only contain letters, numbers, dots, underscores, and dashes.`);
  }

  return value;
}

function formatSkills(skills) {
  return skills.length === 0 ? 'none' : skills.join(',');
}

function formatAvailableSkills(availableSkills = getAvailableSkillDirs()) {
  return availableSkills.length === 0 ? '(none)' : availableSkills.join(', ');
}

module.exports = {
  getSkillsRootPath,
  getAvailableSkillDirs,
  getSkillFiles,
  getAllSkillTargetRoots,
  normalizeSkills,
  normalizeConcreteSkills,
  getSkillTargetRootsForAgent,
  formatSkills,
};
