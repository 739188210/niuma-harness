# Niuma Harness

Initialize and check a 7-layer AI engineering harness for a project workspace.

Niuma Harness creates a lightweight documentation scaffold that helps AI coding tools understand project context, policies, workflows, observation checks, recovery paths, memory rules, loop behavior, and task notes. It also writes a small `manifest.json` so the scaffold can be checked later.

## Quick start

```bash
npx niuma-harness init . --agent claude
npx niuma-harness doctor .
```

Interactive mode is available when `--agent` is omitted in a TTY:

```bash
npx niuma-harness init
```

## CLI

```bash
niuma-harness init [target] [options]
niuma-harness doctor [target] [options]
niuma-harness check [target] [options]
```

### Init options

| Option | Description |
|---|---|
| `--agent <name>` | `claude`, `codex`, `opencode`, or `multi` |
| `--tool <name>` | Alias for `--agent` |
| `--harness-dir <name>` | Directory to create, default: `harness` |
| `--rules <selection>` | `common`, `all`, `none`, or `<rule-dir>[,<rule-dir>...]`, default: `common` |
| `--rules-out <selection>` | Exclude selected rule directories from `all` |
| `--flat` | Write directly into target instead of `target/harness` |
| `--force` | Overwrite existing scaffold files |
| `--dry-run` | Print planned actions without writing files |

### Doctor/check options

| Option | Description |
|---|---|
| `--harness-dir <name>` | Directory to inspect, default: `harness` |

### Global options

| Option | Description |
|---|---|
| `-h`, `--help` | Show help |

## Examples

```bash
npx niuma-harness init . --agent claude
npx niuma-harness init ./workspace --agent codex --rules java,web
npx niuma-harness init ./workspace --agent claude --rules none
npx niuma-harness init ./workspace --agent claude --rules all
npx niuma-harness init ./workspace --agent claude --rules-out web
npx niuma-harness init ./workspace --agent opencode --dry-run
npx niuma-harness init ./workspace --agent multi --harness-dir ai-harness
npx niuma-harness init ./workspace --agent claude --flat
npx niuma-harness doctor ./workspace
npx niuma-harness check ./workspace --harness-dir ai-harness
```

## Agent modes

| Agent | Generated entry file |
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
    manifest.json
    CLAUDE.md or AGENTS.md
    HARNESS_GUIDE.md
    docs/
      index.md
      project-context.md
      layers/
        01-context/
          memo.md
        02-policy/
          memo.md
        03-process/
          memo.md
        04-observation/
          memo.md
        05-recovery/
          memo.md
        06-memory/
          memo.md
        07-loop/
          memo.md
      automation/
        hooks.md
      process/
        task-triage.md
        bugfix.md
        feature-development.md
      rules/
        # Optional rule directories selected by --rules or --rules-out
        common/
          coding-style.md
          testing.md
          security.md
  agent-work/
    README.md
    tasks/
```

Use `--flat` to write the harness scaffold directly into the target directory. Runtime task records still live under `agent-work/`.

## 7-layer architecture

The generated `docs/layers/` directory is the AI agent operating model:

| Layer | Memo | Purpose |
|---|---|---|
| Context | `docs/layers/01-context/memo.md` | What the agent should understand before acting |
| Policy | `docs/layers/02-policy/memo.md` | What the agent may do, must not do, or must ask about |
| Process | `docs/layers/03-process/memo.md` | How different task types move from request to delivery |
| Observation | `docs/layers/04-observation/memo.md` | How the agent verifies whether the current state is good |
| Recovery | `docs/layers/05-recovery/memo.md` | How the agent responds when work fails or becomes unclear |
| Memory | `docs/layers/06-memory/memo.md` | What should be preserved and what should stay task-local |
| Loop | `docs/layers/07-loop/memo.md` | How the agent continues, pauses, recovers, or stops |

The layer memos describe what each layer must do. The existing `docs/process/`, optional `docs/rules/`, and `docs/automation/` directories remain the starter execution materials referenced by those layers. Runtime task records live in the workspace-level `agent-work/` directory.

## Manifest

`manifest.json` records the expected harness shape for later checks:

```json
{
  "schemaVersion": 1,
  "agent": "claude",
  "rules": ["common"],
  "harnessDir": "harness",
  "flat": false,
  "workDir": "agent-work",
  "entryFiles": ["CLAUDE.md"],
  "createdBy": "niuma-harness",
  "createdAt": "2026-06-27T00:00:00.000Z"
}
```

This project-level `manifest.json` is generated inside the harness root. It is separate from the package-internal `templates/manifest.json` used by the CLI to know which template files to copy.

Existing files are skipped by default. Use `--force` only when you want to overwrite scaffold files, including `manifest.json`.

## Doctor

`doctor` checks the generated harness without modifying files:

```bash
npx niuma-harness doctor .
npx niuma-harness check .
npx niuma-harness doctor . --harness-dir ai-harness
```

The command looks for `manifest.json` in the target directory, then in `target/harness` or the directory named by `--harness-dir`. It exits with code `0` when checks pass and `1` when required files, 7-layer memos, or manifest fields are invalid.

Harnesses generated before the 7-layer structure may fail `doctor` until they are updated with the new scaffold files.

## Rules selection

`--rules common` is the default and installs only the `common` rule directory.

```bash
npx niuma-harness init . --agent claude --rules common
```

Install exactly the rule directories you want with a comma-separated list. Selecting `java,web` does not include `common`; include `common` explicitly when needed.

```bash
npx niuma-harness init . --agent claude --rules java,web
npx niuma-harness init . --agent claude --rules common,java,web
```

Use `all` to install every available rule directory, or `none` to install no rule files.

```bash
npx niuma-harness init . --agent claude --rules all
npx niuma-harness init . --agent claude --rules none
```

Use `--rules-out` to install all available rule directories except the listed ones.

```bash
npx niuma-harness init . --agent claude --rules-out web
```

## Development

```bash
npm test
npm run pack:dry
node bin/niuma-harness.js init . --agent claude --dry-run
node bin/niuma-harness.js doctor .
```
