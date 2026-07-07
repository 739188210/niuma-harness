# Niuma Harness

Initialize and check a 7-layer AI engineering harness for a project workspace.

Niuma Harness generates a documentation scaffold plus an entry file (`CLAUDE.md` / `AGENTS.md`) that carries a distilled operating loop — agents follow it automatically every session. The scaffold helps AI coding tools understand project context, policies, workflows, observation checks, recovery paths, memory rules, loop behavior, and task notes, and writes a `manifest.json` for later health checks.

Re-running `init` is safe and idempotent: it refreshes tool-managed files, preserves your own content, and merges the operating loop into an existing entry file.

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
| `--rules <selection>` | `all`, `none`, or `<rule-dir>[,<rule-dir>...]`; agent adapter rules are added automatically |
| `--rules-out <selection>` | Exclude selected rule directories from `all` |
| `--skills <selection>` | `all`, `none`, or `<skill>[,<skill>...]`, default: `all` |
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
npx niuma-harness init ./workspace --agent codex --rules common
npx niuma-harness init ./workspace --agent claude --skills database-readonly
npx niuma-harness init ./workspace --agent multi --skills all
npx niuma-harness init ./workspace --agent claude --rules none
npx niuma-harness init ./workspace --agent claude --rules all
npx niuma-harness init ./workspace --agent claude --rules-out opencode
npx niuma-harness init ./workspace --agent opencode --dry-run
npx niuma-harness init ./workspace --agent multi --harness-dir ai-harness
npx niuma-harness doctor ./workspace
npx niuma-harness check ./workspace --harness-dir ai-harness
```

## Agent modes

| Agent | Generated entry file | Default rules |
|---|---|---|
| `claude` | `CLAUDE.md` | `common`, `claude` |
| `codex` | `AGENTS.md` | `common`, `codex` |
| `opencode` | `AGENTS.md` | `common`, `opencode` |
| `multi` | `CLAUDE.md` and `AGENTS.md` | `common`, `claude`, `codex`, `opencode` |

## Generated structure

Default output for `--agent claude`:

```text
workspace/
  CLAUDE.md or AGENTS.md
  .claude/
    commands/
      # Native commands installed when supported by the selected agent
    skills/
      # Optional native skills selected by --skills
  harness/
    manifest.json
    HARNESS_GUIDE.md
    docs/
      index.md
      project-context.md
      layers/
        01-context.md
        02-policy.md
        03-process.md
        04-observation.md
        05-recovery.md
        06-memory.md
        07-loop.md
      automation/
        automation-intent.md
      policy/
        action-boundary.md
        secret-leak.md
        untrusted-content.md
      process/
        task-triage.md
        bugfix.md
        feature-development.md
        refactor.md
        review.md
        release.md
        isolation.md
        subagent-development.md
      rules/
        common/
          coding-style.md
          security.md
          testing.md
        claude/
          hooks.md
  agent-work/
    README.md
    tasks/
```

Runtime task records live under the workspace-level `agent-work/` directory.

## 7-layer architecture

The generated `docs/layers/` directory is the AI agent operating model:

| Layer | Memo | Purpose |
|---|---|---|
| Context | `docs/layers/01-context.md` | What the agent should understand before acting |
| Policy | `docs/layers/02-policy.md` | What the agent may do, must not do, or must ask about |
| Process | `docs/layers/03-process.md` | How different task types move from request to delivery |
| Observation | `docs/layers/04-observation.md` | How the agent verifies whether the current state is good |
| Recovery | `docs/layers/05-recovery.md` | How the agent responds when work fails or becomes unclear |
| Memory | `docs/layers/06-memory.md` | What should be preserved and what should stay task-local |
| Loop | `docs/layers/07-loop.md` | How the agent continues, pauses, recovers, or stops |

The layer files describe what each layer must do. The existing `docs/process/`, optional `docs/rules/`, and `docs/automation/` directories remain the starter execution materials referenced by those layers. Runtime task records live in the workspace-level `agent-work/` directory.

## Manifest

`manifest.json` records the expected harness shape for later checks:

```json
{
  "schemaVersion": 1,
  "agent": "claude",
  "rules": ["common", "claude"],
  "skills": ["database-readonly", "zentao-bug-workflow"],
  "commands": ["dev-check.md", "dev-summary.md", "git-status.md", "git-sync.md", "glab-projects.md"],
  "harnessDir": "harness",
  "workDir": "agent-work",
  "entryFiles": ["CLAUDE.md"],
  "createdBy": "niuma-harness",
  "createdAt": "2026-06-27T00:00:00.000Z"
}
```

This project-level `manifest.json` is generated inside the harness root and is **regenerated on every `init`** so it always reflects the latest parameters. It is separate from the package-internal `templates/manifest.json` used by the CLI to know which template files to copy.

## Re-running init (upgrade behavior)

`init` is idempotent and safe to re-run. There is no `--force`; behavior is decided by file type:

| File | On re-init |
|---|---|
| **Entry** (`CLAUDE.md` / `AGENTS.md`) | Merged: if the contract block is present it is refreshed; otherwise the block is inserted at the top. Your existing content is always preserved. |
| **Tool-managed** (layers, process playbooks, policy, index, HARNESS_GUIDE, `agent-work/README.md`) | Refreshed from the template. |
| **User-maintained** (`project-context.md`, `automation/automation-intent.md`) | Preserved if they exist; created from the template only when absent. |
| `docs/rules/` | Converged to the current rule selection. Selected existing rule files are preserved; unselected known rule directories are removed, including local files inside them. |
| Native command artifacts (`.claude/commands/`, `.agents/skills/<command-id>/`, `.opencode/commands/`) | Known command artifacts are refreshed from `templates/commands/*.md`. Unknown user-created files are left untouched. |
| `manifest.json` | Regenerated every time. |

Rules follow the current init parameters: re-running with a new `--agent`, `--rules`, or `--rules-out` selection converges installed known rule directories to the new final set.

Built-in command workflows are single-sourced from `templates/commands/*.md`. `init` wraps that same workflow content for each supported agent surface:

| Agent | Generated command artifacts |
|---|---|
| `claude` | `.claude/commands/<id>.md` |
| `codex` | `.agents/skills/<id>/SKILL.md` and `.agents/skills/<id>/agents/openai.yaml` |
| `opencode` | `.opencode/commands/<id>.md` |
| `multi` | all of the above |

For Codex, command-derived skills are command artifacts, not native skill templates from `templates/skills/`. Do not duplicate command workflows under `templates/skills/`; update the source file in `templates/commands/` instead.

## Doctor

`doctor` checks the generated harness without modifying files:

```bash
npx niuma-harness doctor .
npx niuma-harness check .
npx niuma-harness doctor . --harness-dir ai-harness
```

The command looks for `manifest.json` in the target directory, then in `target/harness` or the directory named by `--harness-dir`. It exits with code `0` when checks pass and `1` when required files, 7-layer memos, or manifest fields are invalid. It also verifies the operating-loop contract zone in the entry file is intact and flags drift.

Harnesses generated before the 7-layer structure may fail `doctor` until they are updated with the new scaffold files.

## Rules selection

Rules have two roles:

- `common` and future non-agent rule directories are engineering standards.
- `claude`, `codex`, and `opencode` are agent adapter rules installed automatically for the selected `--agent`.

When `--rules` is omitted, `init` installs `common` plus the selected agent adapter rules:

| Agent | Installed rules |
|---|---|
| `claude` | `common`, `claude` |
| `codex` | `common`, `codex` |
| `opencode` | `common`, `opencode` |
| `multi` | `common`, `claude`, `codex`, `opencode` |

Use `--rules <selection>` to choose engineering rule directories; the current agent adapter rules are still added automatically.

```bash
npx niuma-harness init . --agent codex --rules common
```

The command above installs `common` and `codex`.

Use `all` to install every available rule directory, or `none` to install no rule files.

```bash
npx niuma-harness init . --agent claude --rules all
npx niuma-harness init . --agent claude --rules none
```

Use `--rules-out` to install all available rule directories except the listed ones. Explicit exclusions win, including exclusions for the current agent adapter rule.

```bash
npx niuma-harness init . --agent claude --rules-out opencode
```

## Skills selection

Skills are optional native `SKILL.md` packages copied from `templates/skills/`. They default to `all`; use `--skills none` to skip native skill installation. This selection does not control command-derived Codex skills generated from `templates/commands/*.md`.

```bash
npx niuma-harness init . --agent claude
npx niuma-harness init . --agent claude --skills database-readonly
npx niuma-harness init . --agent multi --skills all
npx niuma-harness init . --agent claude --skills none
```

Installed skill targets depend on the selected agent:

| Agent | Skill target roots |
|---|---|
| `claude` | `.claude/skills/<skill>/` |
| `codex` | `.agents/skills/<skill>/` |
| `opencode` | `.opencode/skills/<skill>/` |
| `multi` | all three roots |

Re-running `init` converges known skills in the current agent's target roots: selected known skills are installed, unselected known skills are removed, and unknown user-created skills are left untouched. Skill package files are refreshed from templates so script and instruction fixes propagate; local runtime config files such as `zentao.config.json` are preserved.

## Development

```bash
npm test
npm run pack:dry
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
node bin/niuma-harness.js doctor <tmp>
```
