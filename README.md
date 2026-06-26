# Niuma Harness

Initialize an AI engineering harness for a project workspace.

Niuma Harness creates a lightweight documentation scaffold that helps AI coding tools understand project context, rules, workflows, and task notes.

## Quick start

```bash
npx niuma-harness init . --tool claude
```

Interactive mode is available when `--tool` is omitted in a TTY:

```bash
npx niuma-harness init
```

## CLI

```bash
niuma-harness init [target] [options]
```

### Options

| Option | Description |
|---|---|
| `--tool <name>` | `claude`, `codex`, `opencode`, or `multi` |
| `--harness-dir <name>` | Directory to create inside target, default: `harness` |
| `--rules <mode>` | `copy` or `empty`, default: `copy` |
| `--flat` | Write directly into target instead of `target/harness` |
| `--force` | Overwrite existing scaffold files |
| `--dry-run` | Print planned actions without writing files |
| `-h`, `--help` | Show help |

## Examples

```bash
npx niuma-harness init . --tool claude
npx niuma-harness init ./workspace --tool codex --rules empty
npx niuma-harness init ./workspace --tool opencode --dry-run
npx niuma-harness init ./workspace --tool multi --harness-dir ai-harness
npx niuma-harness init ./workspace --tool claude --flat
```

## Tool modes

| Tool | Generated entry file |
|---|---|
| `claude` | `CLAUDE.md` |
| `codex` | `AGENTS.md` |
| `opencode` | `AGENTS.md` |
| `multi` | `CLAUDE.md` and `AGENTS.md` |

## Generated structure

Default output:

```text
workspace/
  harness/
    CLAUDE.md or AGENTS.md
    HARNESS_GUIDE.md
    docs/
      index.md
      project-context.md
      automation/
        hooks.md
      process/
        task-triage.md
        bugfix.md
        feature-development.md
      rules/
        common/
          coding-style.md
          testing.md
          security.md
      tasks/
        README.md
```

Use `--flat` to write the same scaffold directly into the target directory instead of creating `harness/`.

## Rules mode

`--rules copy` is the default and creates starter rule content.

```bash
npx niuma-harness init . --tool claude --rules copy
```

`--rules empty` creates the same rule files with empty content, useful when a team wants to fill its own rules from scratch.

```bash
npx niuma-harness init . --tool claude --rules empty
```

## Development

```bash
npm test
npm run pack:dry
node bin/niuma-harness.js init . --tool claude --dry-run
```
