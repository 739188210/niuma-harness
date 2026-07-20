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

## Assurance boundary

`init` copies generated harness artifacts into the target workspace; it does not copy the `niuma-harness` CLI implementation there. Later `doctor`, `repair`, or `audit` commands therefore require the CLI to remain available through an installed package or another configured command path.

The generated Markdown is an agent-facing behavioral contract. `doctor` checks installed managed state, and `audit` checks the internal consistency of self-reported task evidence; neither enforces or proves runtime tool behavior. Preventing tool actions depends on controls supplied by the agent host, such as permissions, hooks, or a sandbox.

## CLI

```bash
niuma-harness init [target] [options]
niuma-harness repair [target] [options]
niuma-harness doctor [target] [options]
niuma-harness check [target] [options]
niuma-harness audit [target] [--harness-dir <name>] [--task <name> | --all] [--strict]
```

### Init options

| Option | Description |
|---|---|
| `--agent <name>` | `claude`, `codex`, `opencode`, or `multi` |
| `--tool <name>` | Alias for `--agent` |
| `--harness-dir <name>` | Harness directory for first init or same-name re-init, default: `harness`; changing it is not migration |
| `--rules <selection>` | `all`, `none`, or `<rule-dir>[,<rule-dir>...]` |
| `--rules-out <selection>` | Exclude selected rule directories from `all` |
| `--skills <selection>` | `all`, `none`, or `<skill>[,<skill>...]`, default: `all` |
| `--dry-run` | Print planned actions without writing files |

### Doctor/check options

| Option | Description |
|---|---|
| `--harness-dir <name>` | Directory to inspect, default: `harness` |

### Audit options

| Option | Description |
|---|---|
| `--harness-dir <name>` | Harness to inspect, default: `harness` |
| `--task <name>` | Audit one direct task directory |
| `--all` | Audit all direct task directories in stable order |
| `--strict` | Exit non-zero for `PARTIAL` as well as `FAIL` |

`audit` is read-only and separate from Doctor. It checks the internal consistency of structured bootstrap, `harness-feedback.md`, and `verification.md` self-reports plus safe local references; it cannot prove actual reads, command execution, or objective implementation correctness. The task-execution-record experiment is enabled by the current package and is not workspace-disableable.

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
npx niuma-harness init ./workspace --agent claude --rules-out web
npx niuma-harness init ./workspace --agent opencode --dry-run
npx niuma-harness init ./workspace --agent multi --harness-dir ai-harness
npx niuma-harness init ./workspace --agent multi --topology discover --dry-run
npx niuma-harness init ./workspace --agent multi --modules apps/admin,services/orders
npx niuma-harness doctor ./workspace
npx niuma-harness check ./workspace --harness-dir ai-harness
npx niuma-harness audit ./workspace --task task-214
npx niuma-harness audit ./workspace --all --strict
```

## Agent modes

| Agent | Generated entry file | Default rules | Native rules adapter |
|---|---|---|---|
| `claude` | `CLAUDE.md` | `common` | Markdown files under `.claude/rules/` |
| `codex` | `AGENTS.md` | `common` | selected Markdown content in the managed `AGENTS.md` contract |
| `opencode` | `AGENTS.md` | `common` | Markdown files under `.opencode/rules/`, listed in `opencode.json.instructions` |
| `multi` | `CLAUDE.md` and `AGENTS.md` | `common` | all applicable adapters |

## Generated structure

Default output for `--agent claude`:

```text
workspace/
  CLAUDE.md or AGENTS.md
  .claude/
    commands/
      # Native commands installed when supported by the selected agent
    rules/
      common/
        coding-style.md
        security.md
        testing.md
    skills/
      # Optional native skills selected by --skills
  harness/
    manifest.json
    README.md
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
  agent-work/
    README.md
    tasks/
```

Runtime task records live under the workspace-level `agent-work/` directory.

## Multi-module targets

A normal `init` remains root-only. Use `--topology discover --dry-run` to inspect bounded candidates from root Maven, Gradle, npm-workspace, or pnpm-workspace declarations. It never recursively scans arbitrary folders, runs project commands, follows symlinks, or adopts modules without an explicit `--modules` selection.

An explicit multi-module initialization keeps one root Harness and creates project-maintained `harness/modules.json`, generated `harness/docs/module-topology.md`, and concise local `CLAUDE.md` / `AGENTS.md` supplements for selected modules. Newly created module entries include an empty user-/Agent-maintained module knowledge skeleton outside the Niuma marker; `init` never infers project facts for it. Existing module entries preserve their content outside the marker and are not force-restructured to add that skeleton. Root policy remains additive; module files cannot weaken it. Doctor checks topology and supplements; Repair deliberately does not rewrite module-local files.

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

The layer files describe what each layer must do. Engineering standards are installed in each selected agent's native rule surface. Runtime task records live in the workspace-level `agent-work/` directory.

## Manifest

`manifest.json` records the expected harness shape for later checks:

```json
{
  "schemaVersion": 3,
  "agent": "claude",
  "rules": ["common"],
  "skills": ["database-readonly", "zentao-bug-workflow"],
  "commands": ["dev-check.md", "dev-summary.md", "git-status.md", "git-submit-idea.md", "git-sync.md", "glab-projects.md"],
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
  "topology": { "mode": "single", "modules": [] },
  "moduleSupplements": [],
  "createdBy": "niuma-harness",
  "createdAt": "2026-06-27T00:00:00.000Z"
}
```

This project-level `manifest.json` is generated inside the harness root and is **regenerated on every successful `init`** so it reflects the latest parameters. Schema version 3 retains the generic artifact ownership ledger for native command artifacts and selected canonical rule files, and records normalized module topology plus module supplement ownership. Schema version 2 root-only manifests remain readable for compatibility. Each record stores its kind, template source, workspace-relative target, and SHA-256 digest of the exact generated bytes, for example:

```json
{
  "kind": "rule",
  "source": "rules/common/testing.md",
  "target": ".claude/rules/common/testing.md",
  "digest": "sha256:<exact-byte digest>"
}
```

It is separate from the package-internal `templates/manifest.json` used by the CLI to know which template files to copy. The project-level manifest is authoritative ownership and history state for that installed harness. Coordinated edits to both an artifact and its recorded digest are treated as an explicit project-state change and are outside Niuma's integrity guarantees; this release does not use signatures or an external trust store.

Schema version 1 is intentionally unsupported. `init` will not adopt existing files from an old or malformed manifest, and `doctor` accepts schema version 2 or 3.

## Re-running init (upgrade behavior)

`init` is idempotent and safe to re-run. There is no `--force`; behavior is decided by file type:

| File | On re-init |
|---|---|
| **Entry** (`CLAUDE.md` / `AGENTS.md`) | Merged: if the contract block is present it is refreshed; otherwise the block is inserted at the top. Your existing content is always preserved. |
| **Tool-managed** (layers, process playbooks, policy, index, README.md, `agent-work/README.md`) | Refreshed from the template. |
| **User-maintained** (`project-context.md`) | Preserved if it exists; created from the template only when absent. |
| Native Markdown rules | Claude files under `.claude/rules/` and OpenCode files under `.opencode/rules/` are Niuma-managed. On re-init, clean ledger-owned files refresh from the package; drifted or unowned occupied targets stop before mutation and direct you to `repair --dry-run`. Deselect removes only unchanged ledger-owned files; unknown local files survive. Codex receives the selected Markdown content through the managed `AGENTS.md` contract. |
| Native command artifacts (`.claude/commands/`, `.agents/skills/<command-id>/`, `.opencode/commands/`) | Refreshed only when the schema-2 ledger proves ownership and the current exact-byte digest has not drifted. Occupied unowned or locally modified targets stop `init` before scaffold writes. Unknown user-created files are left untouched. |
| `manifest.json` | Regenerated every time. |

Rules follow the current init parameters: re-running with a new `--agent`, `--rules`, or `--rules-out` selection converges native rule files and the Codex entry contract to the new final set. Direct edits to generated rule files are unsupported in this release; use `repair --dry-run` to inspect recovery before `repair` backs up and restores canonical content. There is no rule override layer.

Built-in command workflows are single-sourced from `templates/commands/*.md`. `init` wraps that same workflow content for each supported agent surface:

| Agent | Generated command artifacts |
|---|---|
| `claude` | `.claude/commands/<id>.md` |
| `codex` | `.agents/skills/<id>/SKILL.md` and `.agents/skills/<id>/agents/openai.yaml` |
| `opencode` | `.opencode/commands/<id>.md` |
| `multi` | all of the above |

For Codex, command-derived skills are command artifacts, not native skill templates from `templates/skills/`. Do not duplicate command workflows under `templates/skills/`; update the source file in `templates/commands/` instead.

Before any scaffold mutation, `init` renders and preflights the complete command artifact set. A missing target can be created; an existing target can be refreshed only when its ledger record matches and its current digest equals the previously recorded digest. Missing owned files may be recreated. `--dry-run` performs the same ownership checks without writing.

A workspace may contain only one recognizable Niuma harness. `init` scans direct child directories for Niuma-owned `manifest.json` files without following sibling directory or manifest symlinks. If a harness exists under another name, normal init and `--dry-run` stop before planning or mutation. `--harness-dir` does not move, merge, adopt, or delete an existing harness; resolve duplicate directories explicitly or re-run with the unique existing directory name. Workspace-mode `doctor` reports competing harnesses, while pointing `doctor` directly at a harness root checks only that root.

`init`, `doctor`, and `check` canonicalize the target before establishing the workspace boundary. This accepts standard filesystem aliases such as macOS `/var/...` → `/private/var/...`, a workspace symlink/junction, and a missing workspace below an aliased existing parent. After that boundary is established, Niuma still refuses symlinks, junctions, and dangling links in paths it reads, writes, or removes inside the canonical workspace. Competing-harness discovery still does not follow sibling directory or manifest links.

Re-running with a different agent in the same workspace and `--harness-dir` converges agent-native surfaces. Retired command artifacts and deselected rule files are removed only when canonical targets, ledger ownership, and the recorded digest all match; the new ledger contains only current artifacts. Retired entry files lose only their Niuma contract unless the whole file is the untouched generated entry. Retired skill roots lose only package-known files from the previous selection; local configuration and unknown files remain. Ambiguous contracts, drifted artifacts, invalid target types, and internal symlinks stop during preflight. The implementation revalidates destructive plans before applying them, but it does not provide cross-process TOCTOU protection, a workspace lock, or crash-proof rollback for filesystem failures.

## Repair

`repair` is the recovery path for an installed Niuma Harness when normal `init` stops on drift, malformed markers, an invalid generated manifest, target type conflicts, or workspace-internal links.

```bash
niuma-harness repair . --dry-run
niuma-harness repair .
niuma-harness repair . -y
niuma-harness repair . -y --backup-dir ./my-repairs
```

Repair scans every harness domain and prints the complete issue list, affected paths, backup actions, and replacements before changing files. Interactive mode asks once; `-y` / `--yes` prints the same plan and skips only that confirmation. `--dry-run` neither prompts nor writes.

Before the first source mutation, every affected existing target is copied and verified. The default permanent backup is:

```text
<workspace>/.niuma-harness/repairs/<repair-id>/
  repair-manifest.json
  files/
    <original workspace-relative paths>
```

Regular files are byte-verified, directories preserve their complete contents, and symlink nodes are backed up without following or modifying their targets. Repair then regenerates canonical managed content, rebuilds the schema-2 command-and-rule ledger and manifest, and runs Doctor. Doctor exact-validates package descriptors, ledger records, and disk bytes for selected managed rules. Exit code `0` means Doctor passed; backups are retained permanently for manual recovery.

For ambiguous active entry markers, the whole original file is backed up and a clean canonical file is generated. Invalid active `opencode.json.instructions` values are backed up before Repair replaces only that field with the selected canonical rule-file path array while preserving other parseable configuration fields. For an ambiguous inactive entry, repair backs up the whole file and neutralizes only the Niuma marker text so recoverable free content remains. Repair does not guess how to reconstruct ambiguous managed/free entry boundaries; the complete original remains in the backup.

If a valid generated manifest exists, its agent/rules/skills selections are retained. If the manifest is unusable, interactive repair asks for the agent when needed; non-interactive `-y` requires `--agent`. `--rules`, `--rules-out`, and `--skills` may provide recovery selections in that damaged-state case. With multiple harness roots, select one explicitly using `--harness-dir`; repair does not migrate or merge competing harnesses.

Repair does not provide `--force` or `--include-*` bypasses. It is backup-first and performs best-effort synchronous rollback, but it does not claim cross-process locking or crash-safe transactions.

## Audit

`audit` evaluates structured execution records without modifying the workspace:

```bash
npx niuma-harness audit .
npx niuma-harness audit . --task task-214
npx niuma-harness audit . --all --strict
```

It reports eight dimensions: Bootstrap, Task rating, Context, Action boundary, Execution, Verification, Recovery, and Outcome. By default it selects the task with the latest valid `task.recordedAt`; ambiguous or invalid timestamps require `--task`. Results are `PASS`, `PARTIAL`, or `FAIL`; default exit codes treat `PARTIAL` as non-failing, while `--strict` exits non-zero for `PARTIAL`. Audit is a consistency checker over self-reports and safe local references, not an agent runtime or proof that recorded actions occurred.

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
templates/rules/*  ->  agent-native Markdown rule surfaces
```

`templates/rules/*` is the package canonical source. Its rendered files are Niuma-managed artifacts in native tool surfaces:

- `claude` writes Markdown files under `.claude/rules/<rule>/`.
- `codex` embeds the selected Markdown rule content in the managed `AGENTS.md` contract; it does not generate `.codex/rules` engineering rules.
- `opencode` writes Markdown files under `.opencode/rules/<rule>/` and places those exact paths in the `opencode.json.instructions` string array. OpenCode treats them as additional instruction files alongside `AGENTS.md`; user paths, globs, URLs, and unrelated config fields remain outside Niuma ownership.

All available rule directories are lightweight engineering preferences selected explicitly or through the `common` default.

Multiple selected rule directories can apply to the same task. For example, `.ts` / `.tsx` browser UI work may need both `web/` and `typescript/`; FastAPI API work may need both `python/` and `fastapi/`; a mixed backend/frontend workspace may select `java`, `web`, and `typescript` together.

When `--rules` is omitted, `init` installs `common`:

| Agent | Installed rules |
|---|---|
| `claude` | `common` |
| `codex` | `common` |
| `opencode` | `common` |
| `multi` | `common` |

Use `--rules <selection>` to choose engineering rule directories.

```bash
npx niuma-harness init . --agent codex --rules common
npx niuma-harness init . --agent claude --rules web,typescript
npx niuma-harness init . --agent claude --rules java
npx niuma-harness init . --agent claude --rules python,fastapi
```

The first command installs `common`. The second installs `web` and `typescript`. The third installs `java`. The fourth installs `python` and `fastapi`.

Use `all` to install every available rule directory, or `none` to install no rule files.

```bash
npx niuma-harness init . --agent claude --rules all
npx niuma-harness init . --agent claude --rules none
```

Use `--rules-out` to install all available rule directories except the listed ones. Explicit exclusions win.

```bash
npx niuma-harness init . --agent claude --rules-out web
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

Re-running `init` converges known skills in the current agent's target roots: files listed under `templates/skills/<skill>/` are installed, refreshed, or removed with the selected skill, while unknown user-created files are left untouched. A skill may distribute an example configuration and instruct the user to create a separate local runtime file; because that local file is not part of the template list, re-init and deselection preserve it.

## Doctor integrity boundary

`doctor` does not treat generated `harness/manifest.json` as an unrestricted source of truth. It binds `createdBy`, the actual harness directory, package-defined `workDir`, agent-derived entry files, and package-and-agent-derived command selection. It then exact-compares tool-managed core/work templates, selected skill package files, Claude rule pointers, expected Niuma-managed OpenCode rule-file path entries, and current package-rendered command artifacts.

The integrity boundary intentionally excludes user-maintained `project-context.md`, entry content outside the managed contract, local runtime files such as `zentao.config.json`, unknown files, and OpenCode fields or instructions outside the Niuma-managed block. Selected generated rule artifacts are included: Doctor exact-validates their package descriptor, ledger record, and disk bytes. `rules` and `skills` remain manifest selections, so explicit `--rules none` and `--rules-out` exclusions retain their existing semantics.

## Development

```bash
npm test
npm run pack:dry
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
node bin/niuma-harness.js doctor <tmp>
```
