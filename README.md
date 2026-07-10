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
npx niuma-harness init ./workspace --agent claude --rules web,typescript
npx niuma-harness init ./workspace --agent claude --rules java
npx niuma-harness init ./workspace --agent claude --rules python,fastapi
npx niuma-harness init ./workspace --agent claude --rules-out opencode
npx niuma-harness init ./workspace --agent opencode --dry-run
npx niuma-harness init ./workspace --agent multi --harness-dir ai-harness
npx niuma-harness doctor ./workspace
npx niuma-harness check ./workspace --harness-dir ai-harness
```

## Agent modes

| Agent | Generated entry file | Default rules | Native rules adapter |
|---|---|---|---|
| `claude` | `CLAUDE.md` | `common`, `claude` | `.claude/rules/niuma-<rule>.md` pointers |
| `codex` | `AGENTS.md` | `common`, `codex` | `AGENTS.md` pointer; no `.codex/rules` |
| `opencode` | `AGENTS.md` | `common`, `opencode` | `opencode.json` instructions |
| `multi` | `CLAUDE.md` and `AGENTS.md` | `common`, `claude`, `codex`, `opencode` | all applicable adapters |

## Generated structure

Default output for `--agent claude`:

```text
workspace/
  CLAUDE.md or AGENTS.md
  .claude/
    commands/
      # Native commands installed when supported by the selected agent
    rules/
      niuma-common.md
      niuma-claude.md
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
  "schemaVersion": 2,
  "agent": "claude",
  "rules": ["common", "claude"],
  "skills": ["database-readonly", "zentao-bug-workflow"],
  "commands": ["dev-check.md", "dev-summary.md", "git-status.md", "git-sync.md", "glab-projects.md"],
  "artifacts": [
    {
      "kind": "command",
      "source": "commands/dev-check.md",
      "target": ".claude/commands/dev-check.md",
      "digest": "sha256:<64 lowercase hex characters>"
    }
  ],
  "harnessDir": "harness",
  "workDir": "agent-work",
  "entryFiles": ["CLAUDE.md"],
  "createdBy": "niuma-harness",
  "createdAt": "2026-06-27T00:00:00.000Z"
}
```

This project-level `manifest.json` is generated inside the harness root and is **regenerated on every successful `init`** so it reflects the latest parameters. Schema version 2 adds a generic artifact ownership ledger. The initial ledger scope is native command artifacts; each record stores its template source, workspace-relative target, and SHA-256 digest of the exact generated bytes. It is separate from the package-internal `templates/manifest.json` used by the CLI to know which template files to copy.

Schema version 1 is intentionally unsupported because this version has not been deployed. `init` will not adopt existing files from an old or malformed manifest, and `doctor` requires schema version 2.

## Re-running init (upgrade behavior)

`init` is idempotent and safe to re-run. There is no `--force`; behavior is decided by file type:

| File | On re-init |
|---|---|
| **Entry** (`CLAUDE.md` / `AGENTS.md`) | Merged: if the contract block is present it is refreshed; otherwise the block is inserted at the top. Your existing content is always preserved. |
| **Tool-managed** (layers, process playbooks, policy, index, HARNESS_GUIDE, `agent-work/README.md`) | Refreshed from the template. |
| **User-maintained** (`project-context.md`, `automation/automation-intent.md`) | Preserved if they exist; created from the template only when absent. |
| `docs/rules/` | Converged to the current rule selection. Selected existing rule files are preserved; unselected known rule directories are removed, including local files inside them. |
| Native rules adapters (`.claude/rules/niuma-*.md`, `opencode.json` managed instructions, entry contract pointer) | Refreshed from the current rule selection. User-created `.claude/rules` files and unrelated `opencode.json` fields are preserved. Codex uses the `AGENTS.md` pointer; `.codex/rules` is not generated for coding standards. |
| Native command artifacts (`.claude/commands/`, `.agents/skills/<command-id>/`, `.opencode/commands/`) | Refreshed only when the schema-2 ledger proves ownership and the current exact-byte digest has not drifted. Occupied unowned or locally modified targets stop `init` before scaffold writes. Unknown user-created files are left untouched. |
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

Before any scaffold mutation, `init` renders and preflights the complete command artifact set. A missing target can be created; an existing target can be refreshed only when its ledger record matches and its current digest equals the previously recorded digest. Missing owned files may be recreated. `--dry-run` performs the same ownership checks without writing. Re-running with a different agent retains prior valid records so future stale-artifact cleanup can still identify them; `doctor` continues validating those retained files. The implementation performs a second full preflight before command writes, but it does not yet provide a cross-process lock or crash-proof rollback for filesystem failures.

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

Rules have two layers:

```text
templates/core/docs/rules/*  ->  harness/docs/rules/*  ->  agent-native pointers
```

The canonical rule content lives in `templates/core/docs/rules/*` and generated `harness/docs/rules/*`. Agent-native artifacts only point tools to those canonical files:

- `claude` writes `.claude/rules/niuma-<rule>.md` pointer files.
- `codex` uses the `AGENTS.md` contract pointer and does not generate `.codex/rules` for coding standards.
- `opencode` writes a managed `opencode.json` instructions entry.

Rule directories have two roles:

- `common`, `web`, `typescript`, `java`, `python`, `fastapi`, and other non-agent rule directories are lightweight engineering preferences.
- `claude`, `codex`, and `opencode` are agent-specific notes installed automatically for the selected `--agent`.

Multiple selected rule directories can apply to the same task. For example, `.ts` / `.tsx` browser UI work may need both `web/` and `typescript/`; FastAPI API work may need both `python/` and `fastapi/`; a mixed backend/frontend workspace may select `java`, `web`, and `typescript` together.

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
npx niuma-harness init . --agent claude --rules web,typescript
npx niuma-harness init . --agent claude --rules java
npx niuma-harness init . --agent claude --rules python,fastapi
```

The first command installs `common` and `codex`. The second installs `web`, `typescript`, and `claude`. The third installs `java` and `claude`. The fourth installs `python`, `fastapi`, and `claude`.

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

Re-running `init` converges known skills in the current agent's target roots: selected known skills are installed, unselected known skill files owned by Niuma are removed, and unknown user-created files are left untouched. Skill package files are refreshed from templates so script and instruction fixes propagate. A skill can declare user-maintained payload files in its package-only `niuma-skill.json`; those files are created when absent and preserved during re-init or deselection. Files not declared there default to tool-managed. The metadata file itself is not copied into agent-native skill directories.

## Development

```bash
npm test
npm run pack:dry
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
node bin/niuma-harness.js doctor <tmp>
```
