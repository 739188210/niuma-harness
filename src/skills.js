// skills 选择模型：从 templates/skills 发现技能包，并规范化 CLI 输入。
const fs = require('fs');
const path = require('path');
const { listFilesRecursive, safeResolveInside, validateRelativePath } = require('./fs-safe');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'templates');
const DEFAULT_SKILLS_ROOT = 'skills';
const DEFAULT_SKILLS_SELECTION = 'all';
const SKILL_METADATA_FILE = 'niuma-skill.json';
const SPECIAL_SKILLS = new Set(['all', 'none']);
const SKILL_TARGET_ROOTS = {
  claude: ['.claude/skills'],
  codex: ['.agents/skills'],
  opencode: ['.opencode/skills'],
  multi: ['.claude/skills', '.agents/skills', '.opencode/skills'],
};

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

function loadSkillMetadata(skillName, skillsRoot = DEFAULT_SKILLS_ROOT) {
  const skillDir = path.join(getSkillsRootPath(skillsRoot), skillName);
  const metadataPath = path.join(skillDir, SKILL_METADATA_FILE);
  if (!fs.existsSync(metadataPath)) {
    return { files: {}, schemaVersion: 1 };
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid skill metadata at ${metadataPath}: ${error.message}`);
  }
  validateSkillMetadata(metadata, metadataPath, skillDir);
  return metadata;
}

function validateSkillMetadata(metadata, metadataPath, skillDir) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
    throw new Error(`skill metadata must contain an object: ${metadataPath}`);
  }
  if (metadata.schemaVersion !== 1) {
    throw new Error(`unsupported skill metadata schemaVersion in ${metadataPath}`);
  }
  if (!metadata.files || Array.isArray(metadata.files) || typeof metadata.files !== 'object') {
    throw new Error(`skill metadata files must contain an object: ${metadataPath}`);
  }

  for (const [relativePath, file] of Object.entries(metadata.files)) {
    validateRelativePath(relativePath, 'skill metadata file');
    const resolved = safeResolveInside(skillDir, relativePath, 'skill metadata file');
    if (!file || Array.isArray(file) || typeof file !== 'object' || !['tool', 'user'].includes(file.ownership)) {
      throw new Error(`invalid ownership for ${relativePath} in ${metadataPath}`);
    }
    if (!fs.existsSync(resolved) || !fs.lstatSync(resolved).isFile()) {
      throw new Error(`skill metadata references missing file ${relativePath}: ${metadataPath}`);
    }
  }
}

function getSkillFiles(skillName, skillsRoot = DEFAULT_SKILLS_ROOT) {
  const skillDir = path.join(getSkillsRootPath(skillsRoot), skillName);
  const metadata = loadSkillMetadata(skillName, skillsRoot);
  return listFilesRecursive(skillDir)
    .filter((sourcePath) => path.relative(skillDir, sourcePath) !== SKILL_METADATA_FILE)
    .map((sourcePath) => {
      const relativePath = path.relative(skillDir, sourcePath).split(path.sep).join('/');
      return {
        ownership: metadata.files[relativePath]?.ownership || 'tool',
        relativePath,
        sourcePath,
      };
    });
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

function getSkillTargetRootsForAgent(agent) {
  const targetRoots = SKILL_TARGET_ROOTS[agent];
  if (!targetRoots) {
    throw new Error(`unknown agent for skill targets: ${agent}`);
  }

  return [...targetRoots];
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
  SKILL_METADATA_FILE,
  getSkillsRootPath,
  getAvailableSkillDirs,
  loadSkillMetadata,
  getSkillFiles,
  normalizeSkills,
  normalizeConcreteSkills,
  getSkillTargetRootsForAgent,
  formatSkills,
};
