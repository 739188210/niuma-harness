# Harness Init

用于在新工作区中初始化 AI 协作文档骨架。默认会在目标目录下创建独立的 `harness/` 目录，让它可以和 `backend/`、`frontend/` 分别用 git 管理。

## 使用

交互选择 Claude 或 Codex 入口：

```bash
node install <工作区目录>
```

非交互方式：

```bash
node install <工作区目录> --agent claude
node install <工作区目录> --agent codex
node install <工作区目录> --agent codex --rules copy
node install <工作区目录> --agent codex --rules empty
```

生成结构：

```text
<工作区目录>/
  harness/
    AGENTS.md 或 CLAUDE.md
    HARNESS_GUIDE.md
    docs/
  backend/
  frontend/
```

选择 `claude` 会生成 `CLAUDE.md`。
选择 `codex` 会生成 `AGENTS.md`。

两者内容来自同一份模板：`templates/agent-rules.md`。

## 选项

- `--rules copy`：带上 `docs/rules/**` 的现有规范内容，默认值。
- `--rules empty`：只创建空的 `docs/rules/**` 文件。
- `--with-rules`：等同于 `--rules copy`。
- `--no-rules`：等同于 `--rules empty`。
- `--harness-dir <name>`：设置文档仓目录名，默认 `harness`。
- `--flat`：不创建外层 `harness`，直接写入目标目录。
- `--cleanup-legacy-root`：清理旧版安装器留在工作区根目录的 `docs/`、`AGENTS.md`、`CLAUDE.md`、`HARNESS_GUIDE.md`。
- `--keep-legacy-root`：明确保留工作区根目录已有的 `docs/`、`AGENTS.md`、`CLAUDE.md`、`HARNESS_GUIDE.md`。
- `--force`：覆盖已存在的模板文件。
- `--dry-run`：只预览将创建的目录和文件。
- `--help`：查看命令帮助。

## 验证

```bash
node install .\scratch --agent codex --dry-run
node install .\scratch --agent claude --rules copy
node install .\scratch\harness --agent codex --flat
node install .\scratch --agent codex --cleanup-legacy-root
node install .\scratch --agent codex --keep-legacy-root
```
