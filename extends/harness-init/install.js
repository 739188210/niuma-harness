const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = __dirname;
const TEMPLATE_DIR = path.join(ROOT, 'templates');
const MANIFEST_PATH = path.join(TEMPLATE_DIR, 'docs-files.json');

function parseArgs(argv) {
  const options = {
    targetDir: null,
    agent: null,
    rules: null,
    harnessDir: 'harness',
    flat: false,
    cleanupLegacyRoot: false,
    keepLegacyRoot: false,
    force: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--agent') {
      options.agent = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--agent=')) {
      options.agent = arg.slice('--agent='.length);
    } else if (arg === '--rules') {
      options.rules = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--rules=')) {
      options.rules = arg.slice('--rules='.length);
    } else if (arg === '--with-rules') {
      options.rules = 'copy';
    } else if (arg === '--no-rules') {
      options.rules = 'empty';
    } else if (arg === '--harness-dir') {
      options.harnessDir = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--harness-dir=')) {
      options.harnessDir = arg.slice('--harness-dir='.length);
    } else if (arg === '--flat') {
      options.flat = true;
    } else if (arg === '--cleanup-legacy-root') {
      options.cleanupLegacyRoot = true;
    } else if (arg === '--keep-legacy-root') {
      options.keepLegacyRoot = true;
    } else if (!options.targetDir) {
      options.targetDir = arg;
    } else {
      throw new Error(`无法识别的参数：${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
用法：
  node install <工作区目录>
  node install.js <工作区目录>

选项：
  --agent claude|codex  非交互选择入口文件；claude 生成 CLAUDE.md，codex 生成 AGENTS.md
  --rules copy|empty    copy 带 rules 内容，empty 只创建空 rules 文件
  --with-rules          等同于 --rules copy
  --no-rules            等同于 --rules empty
  --harness-dir <name>   设置文档仓目录名，默认 harness
  --flat                 不创建外层 harness，直接写入目标目录
  --cleanup-legacy-root  清理旧版安装器留在工作区根目录的 docs/AGENTS.md/CLAUDE.md/HARNESS_GUIDE.md
  --keep-legacy-root     明确保留工作区根目录已有的 docs/AGENTS.md/CLAUDE.md/HARNESS_GUIDE.md
  --force              覆盖已存在的模板文件
  --dry-run            只预览将要创建的文件和目录
  -h, --help           查看帮助

示例：
  node install D:\\work-project\\new-app --agent codex
  node install . --agent claude --rules copy --force
  node install D:\\work-project\\new-app --agent codex --harness-dir ai-harness
  node install D:\\work-project\\new-app\\harness --agent codex --flat
  node install D:\\work-project\\new-app --agent codex --cleanup-legacy-root
  node install D:\\work-project\\new-app --agent codex --keep-legacy-root
`.trim());
}

function normalizeAgent(agent) {
  if (!agent) {
    return null;
  }

  const value = String(agent).trim().toLowerCase();
  if (value === 'claude' || value === '1') {
    return 'claude';
  }
  if (value === 'codex' || value === '2') {
    return 'codex';
  }

  throw new Error(`--agent 只支持 claude 或 codex，收到：${agent}`);
}

function normalizeRulesMode(rules) {
  if (rules === null || rules === undefined) {
    return null;
  }

  const value = String(rules).trim().toLowerCase();
  if (value === '' || value === 'copy' || value === 'full' || value === 'yes' || value === 'y' || value === '1' || value === 'true') {
    return 'copy';
  }
  if (value === 'empty' || value === 'none' || value === 'no' || value === 'n' || value === '0' || value === 'false') {
    return 'empty';
  }

  throw new Error(`--rules 只支持 copy 或 empty，收到：${rules}`);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function chooseAgent(agent) {
  const normalized = normalizeAgent(agent);
  if (normalized) {
    return normalized;
  }

  if (!process.stdin.isTTY) {
    throw new Error('当前环境不能交互选择，请添加 --agent claude 或 --agent codex。');
  }

  while (true) {
    const answer = await ask([
      '请选择 AI 协作入口：',
      '  1. claude -> 生成 CLAUDE.md',
      '  2. codex  -> 生成 AGENTS.md',
      '输入 claude/codex 或 1/2：',
    ].join('\n'));

    try {
      return normalizeAgent(answer);
    } catch (error) {
      console.log('请输入 claude、codex、1 或 2。');
    }
  }
}

async function chooseRulesMode(rules) {
  const normalized = normalizeRulesMode(rules);
  if (normalized) {
    return normalized;
  }

  if (!process.stdin.isTTY) {
    return 'copy';
  }

  while (true) {
    const answer = await ask([
      '是否带上 docs/rules 里的现有规范内容？',
      '  y. 带内容，适合直接复用这套规范',
      '  n. 不带内容，只创建空 rules 文件',
      '输入 y/n，直接回车默认 y：',
    ].join('\n'));

    try {
      return normalizeRulesMode(answer);
    } catch (error) {
      console.log('请输入 y 或 n。');
    }
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(TEMPLATE_DIR, relativePath), 'utf8');
}

function renderTemplate(relativePath, variables) {
  let content = readText(relativePath);
  for (const [key, value] of Object.entries(variables)) {
    content = content.split(`{{${key}}}`).join(value);
  }
  return content;
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function listFilesRecursive(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function listDirectoriesRecursive(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const directories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    directories.push(entryPath);
    directories.push(...listDirectoriesRecursive(entryPath));
  }

  return directories;
}

function isRulesFile(relativePath) {
  return relativePath.replaceAll('\\', '/').startsWith('docs/rules/');
}

function ensureDir(dirPath, dryRun) {
  if (fs.existsSync(dirPath)) {
    return 'skip';
  }

  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return 'create';
}

function writeFile(filePath, content, options) {
  const exists = fs.existsSync(filePath);
  if (exists && !options.force) {
    return 'skip';
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  if (exists && options.force) {
    return 'overwrite';
  }
  return 'create';
}

function touchFile(filePath, options) {
  return writeFile(filePath, '', { ...options, force: false });
}

function printAction(action, targetPath) {
  const label = {
    create: 'CREATE',
    overwrite: 'OVERWRITE',
    skip: 'SKIP',
    delete: 'DELETE',
    legacy: 'LEGACY',
  }[action] || action.toUpperCase();
  console.log(`${label.padEnd(9)} ${targetPath}`);
}

function isSameOrInside(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  return child === parent || child.startsWith(`${parent}${path.sep}`);
}

function findLegacyRootPaths(workspaceDir, targetDir) {
  const legacyNames = ['AGENTS.md', 'CLAUDE.md', 'HARNESS_GUIDE.md', 'docs'];
  return legacyNames
    .map((name) => path.join(workspaceDir, name))
    .filter((legacyPath) => fs.existsSync(legacyPath))
    .filter((legacyPath) => !isSameOrInside(legacyPath, targetDir));
}

function handleLegacyRoot(workspaceDir, targetDir, options) {
  const legacyPaths = findLegacyRootPaths(workspaceDir, targetDir);
  if (legacyPaths.length === 0) {
    return;
  }

  if (options.flat) {
    return;
  }

  if (options.cleanupLegacyRoot && options.keepLegacyRoot) {
    throw new Error('--cleanup-legacy-root 和 --keep-legacy-root 不能同时使用。');
  }

  if (options.keepLegacyRoot) {
    console.log('检测到工作区根目录已有以下文件，已按 --keep-legacy-root 明确保留：');
    for (const legacyPath of legacyPaths) {
      printAction('legacy', legacyPath);
    }
    return;
  }

  if (!options.cleanupLegacyRoot) {
    const list = legacyPaths.map((legacyPath) => `  - ${legacyPath}`).join('\n');
    throw new Error([
      '检测到工作区根目录已存在旧版 harness 文件，安装已停止，避免同时保留根目录和 harness 目录两套内容。',
      list,
      '如确认这些是旧版安装器生成的内容，请添加 --cleanup-legacy-root。',
      '如确认需要保留这些根目录文件，请添加 --keep-legacy-root。',
    ].join('\n'));
  }

  for (const legacyPath of legacyPaths) {
    printAction('delete', legacyPath);
    if (!options.dryRun) {
      fs.rmSync(legacyPath, { recursive: true, force: true });
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const agent = await chooseAgent(options.agent);
  const rulesMode = await chooseRulesMode(options.rules);
  const workspaceDir = path.resolve(options.targetDir || '.');
  const targetDir = options.flat ? workspaceDir : path.join(workspaceDir, options.harnessDir || 'harness');
  const manifest = loadManifest();

  console.log(options.dryRun ? 'DRY RUN：预览初始化内容' : '开始初始化 harness 文档骨架');
  console.log(`工作区目录：${workspaceDir}`);
  console.log(`harness 目录：${targetDir}`);
  console.log(`入口类型：${agent}`);
  console.log(`rules：${rulesMode === 'copy' ? '带内容' : '空文件'}`);

  handleLegacyRoot(workspaceDir, targetDir, options);

  const rootAction = ensureDir(targetDir, options.dryRun);
  printAction(rootAction, targetDir);

  const agentFileName = agent === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const templateVariables = {
    ENTRY_FILE: agentFileName,
  };
  const agentRules = renderTemplate('agent-rules.md', templateVariables);
  printAction(
    writeFile(path.join(targetDir, agentFileName), agentRules, options),
    path.join(targetDir, agentFileName),
  );

  printAction(
    writeFile(
      path.join(targetDir, 'HARNESS_GUIDE.md'),
      renderTemplate('HARNESS_GUIDE.md', templateVariables),
      options,
    ),
    path.join(targetDir, 'HARNESS_GUIDE.md'),
  );

  for (const directory of manifest.directories) {
    const action = ensureDir(path.join(targetDir, directory), options.dryRun);
    printAction(action, path.join(targetDir, directory));
  }

  for (const templateFile of manifest.templateFiles) {
    const targetPath = path.join(targetDir, templateFile.target);
    const content = renderTemplate(templateFile.template, templateVariables);
    const action = writeFile(targetPath, content, options);
    printAction(action, targetPath);
  }

  if (rulesMode === 'copy') {
    const rulesTemplateDir = path.join(TEMPLATE_DIR, 'rules');
    for (const sourceDirectory of listDirectoriesRecursive(rulesTemplateDir)) {
      const relativePath = path.relative(rulesTemplateDir, sourceDirectory);
      const targetPath = path.join(targetDir, 'docs', 'rules', relativePath);
      const action = ensureDir(targetPath, options.dryRun);
      printAction(action, targetPath);
    }

    for (const sourcePath of listFilesRecursive(rulesTemplateDir)) {
      const relativePath = path.relative(rulesTemplateDir, sourcePath);
      const targetPath = path.join(targetDir, 'docs', 'rules', relativePath);
      const content = fs.readFileSync(sourcePath, 'utf8');
      const action = writeFile(targetPath, content, options);
      printAction(action, targetPath);
    }
  }

  for (const emptyFile of manifest.emptyFiles) {
    if (rulesMode === 'copy' && isRulesFile(emptyFile)) {
      continue;
    }

    const action = touchFile(path.join(targetDir, emptyFile), options);
    printAction(action, path.join(targetDir, emptyFile));
  }

  console.log('完成。下一步请阅读 HARNESS_GUIDE.md，并按项目实际情况填充 docs/index.md。');
}

main().catch((error) => {
  console.error(`初始化失败：${error.message}`);
  process.exitCode = 1;
});
