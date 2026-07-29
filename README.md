# Niuma Harness

Initialize and check a 7-layer AI engineering harness for a project workspace.

Niuma Harness generates a documentation scaffold plus an entry file (`CLAUDE.md` / `AGENTS.md`) that carries a distilled operating loop — agents follow it automatically every session. The scaffold helps AI coding tools understand project context, policies, workflows, observation checks, recovery paths, memory rules, loop behavior, and task notes, and writes a `manifest.json` for later health checks.

Re-running `init` is safe and idempotent: it refreshes the generated Harness core, preserves your own content, preserves independently installed assets, and merges the operating loop into an existing entry file.

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

`init` copies generated harness artifacts into the target workspace; it does not copy the `niuma-harness` CLI implementation there. Later `doctor` or `repair` commands therefore require the CLI to remain available through an installed package or another configured command path.

The generated Markdown is an agent-facing behavioral contract. `doctor` checks installed managed state; it does not enforce or prove runtime tool behavior. Preventing tool actions depends on controls supplied by the agent host, such as permissions, hooks, or a sandbox.

## CLI

```bash
niuma-harness init [target] [options]
niuma-harness repair [target] [options]
niuma-harness doctor [target] [options]
niuma-harness install-skill [names...]
niuma-harness install-rule [names...]
niuma-harness install-command [names...]
```

## Install assets

Use these interactive commands from the current working directory (project directory) to install package assets. Each command does not initialize or update a Harness:

```bash
niuma-harness install-skill [names...]
niuma-harness install-rule [names...]
niuma-harness install-command [names...]
```

Each command asks for the target agent. With no names it lists available package assets for multi-selection. Asset installation never reads or updates `harness/manifest.json`, Harness docs, project context, or task material.

Existing files with different contents are shown as conflicts. Enter `y` to back them up under `.niuma-harness/asset-installs/` and overwrite them; any other response cancels the whole installation. `--dry-run` prints the plan without writing files. These commands require an interactive terminal and an OS/Node runtime with `O_NOFOLLOW`; when that capability is unavailable, installation fails before planning, backups, or writes. They are intended for a trusted workspace whose paths are not being concurrently modified by an adversarial process: they do not provide a workspace lock or complete cross-process TOCTOU protection for parent-directory or regular-file replacement races.

`install-rule` follows the selected agent's native rule surface: Claude writes `.claude/rules/`; Codex appends selected rules to an existing Niuma contract in `AGENTS.md`; OpenCode writes `.opencode/rules/` and appends paths to `opencode.json.instructions`; `multi` applies all relevant surfaces. Codex and multi require a valid Niuma `AGENTS.md` contract (run `init` first). Existing OpenCode configuration must be a JSON object with string-array `instructions`, if present. Installed assets are independent from the generated Harness core: they do not participate in init, Doctor, or Repair lifecycle management.

### Init options

| Option | Description |
|---|---|
| `--agent <name>` | `claude`, `codex`, `opencode`, or `multi` |
| `--harness-dir <name>` | Harness directory for first init or same-name re-init, default: `harness`; changing it is not migration |
| `--rules <selection>` | `all`, `none`, or `<rule-dir>[,<rule-dir>...]`; named selections automatically include `common` |
| `--rules-out <selection>` | Exclude selected rule directories from `all` |
| `--skills <selection>` | `all`, `none`, or `<skill>[,<skill>...]`, default: `all` |
| `--topology <mode>` | `single` disables interactive automatic discovery; `discover` explicitly reads root module declarations |
| `--modules <paths>` | Explicit comma-separated existing module roots; bypasses automatic discovery |
| `--dry-run` | Print planned actions without writing files |

### Doctor options

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
npx niuma-harness init ./workspace --agent claude --rules-out web
npx niuma-harness init ./workspace --agent opencode --dry-run
npx niuma-harness init ./workspace --agent multi --harness-dir ai-harness
npx niuma-harness init ./workspace --agent multi --topology discover --dry-run
npx niuma-harness init ./workspace --agent multi --modules apps/admin,services/orders
npx niuma-harness doctor ./workspace
npx niuma-harness doctor ./workspace --harness-dir ai-harness
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

When the selected Harness directory has no existing `manifest.json`, an interactive normal `init` discovers bounded module candidates from root Maven, Gradle, npm-workspace, or pnpm-workspace declarations, lists them, and requires confirmation before writing. Declining leaves the workspace unchanged: no Harness or module files are written. A normal non-interactive `init` remains root-only for scripts and CI. Use `--topology single` to explicitly stay root-only in an interactive terminal, `--modules` to explicitly select module roots, or `--topology discover --dry-run` to preview candidates only. Discovery never recursively scans arbitrary folders, runs project commands, or follows symlinks.

A confirmed or explicitly selected multi-module initialization keeps one root Harness and creates project-maintained `harness/modules.json`, generated `harness/docs/module-topology.md`, and concise local `CLAUDE.md` / `AGENTS.md` supplements for selected modules. Newly created module entries include an empty user-/Agent-maintained module knowledge skeleton outside the Niuma marker; `init` never infers project facts for it. Existing module entries preserve their content outside the marker and are not force-restructured to add that skeleton. Root policy remains additive; module files cannot weaken it. Doctor checks topology and supplements; Repair deliberately does not rewrite module-local files.

`modules.json` uses `schemaVersion: 1` and a `modules` array. Each module needs an explicit `id` containing only letters, digits, `.`, `_`, or `-`; `kind` is optional and follows the same token rule. `root` remains a workspace-relative module directory subject to path and symlink checks. After a project-maintained registry change, run normal `init` to adopt it. If Repair finds an invalid registry or one that differs from installed topology, it reports the issue and stops without rewriting the registry or other files.

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

`manifest.json` records the generated Harness core for later checks. Schema 5 owns the Harness directory, agent, entry files, and topology; independently installed rules, commands, skills, adapters, and local configuration are outside its lifecycle:

```json
{
  "schemaVersion": 5,
  "agent": "claude",
  "harnessDir": "harness",
  "workDir": "agent-work",
  "entryFiles": ["CLAUDE.md"],
  "topology": { "mode": "single", "modules": [] },
  "moduleSupplements": [],
  "createdBy": "niuma-harness",
  "createdAt": "2026-06-27T00:00:00.000Z"
}
```

This project-level `manifest.json` is generated inside the harness root and is **regenerated on every successful `init`** so it reflects the latest core parameters. Schema 5 records normalized module topology and module supplement ownership; it does not record native rules, commands, skills, or adapters. Schema versions 2–4 remain readable for migration to the core-only lifecycle.

It is separate from the package-internal `templates/manifest.json` used by the CLI to know which core template files to copy. The project-level manifest is authoritative ownership and history state only for the installed Harness core. Rules, commands, skills, adapters, and local configuration remain independent assets. This release does not use signatures or an external trust store.

Schema version 1 is intentionally unsupported. `init` will not adopt existing files from an old or malformed manifest, and `doctor` accepts schema versions 2–5.

## Re-running init (upgrade behavior)

`init` is idempotent and safe to re-run. There is no `--force`; behavior is decided by file type:

| File | On re-init |
|---|---|
| **Entry** (`CLAUDE.md` / `AGENTS.md`) | Merged: if the contract block is present it is refreshed; otherwise the block is inserted at the top. Your existing content is always preserved. |
| **Tool-managed** (layers, process playbooks, policy, index, README.md, `agent-work/README.md`) | Refreshed from the template. |
| **User-maintained** (`project-context.md`) | Preserved if it exists; created from the template only when absent. |
| Native Markdown rules | Installed on first init or through `install-rule`, then left unchanged by re-init, Doctor, and Repair. Claude uses `.claude/rules/`; OpenCode uses `.opencode/rules/`; Codex receives selected Markdown content through the managed `AGENTS.md` region. |
| Native command artifacts (`.claude/commands/`, `.agents/skills/<command-id>/`, `.opencode/commands/`) | Installed on first init or through `install-command`, then left unchanged by re-init, Doctor, and Repair. Unknown user-created files are also left untouched. |
| `manifest.json` | Regenerated every time. |

Rules are selected only during first init or by `install-rule`. Re-init preserves existing native rule files and the Codex rules region; Doctor and Repair leave all rule assets unchanged. Direct edits to generated rule files are unsupported in this release, and there is no rule override layer.

Built-in command workflows are single-sourced from `templates/commands/*.md`. `init` wraps that same workflow content for each supported agent surface:

| Agent | Generated command artifacts |
|---|---|
| `claude` | `.claude/commands/<id>.md` |
| `codex` | `.agents/skills/<id>/SKILL.md` and `.agents/skills/<id>/agents/openai.yaml` |
| `opencode` | `.opencode/commands/<id>.md` |
| `multi` | all of the above |

For Codex, command-derived skills are command artifacts, not native skill templates from `templates/skills/`. Do not duplicate command workflows under `templates/skills/`; update the source file in `templates/commands/` instead.

First init installs command artifacts selected for the agent. Afterwards, use `install-command` to add package commands; re-init, Doctor, and Repair leave command artifacts unchanged.

A workspace may contain only one recognizable Niuma harness. `init` scans direct child directories for Niuma-owned `manifest.json` files without following sibling directory or manifest symlinks. If a harness exists under another name, normal init and `--dry-run` stop before planning or mutation. `--harness-dir` does not move, merge, adopt, or delete an existing harness; resolve duplicate directories explicitly or re-run with the unique existing directory name. Workspace-mode `doctor` reports competing harnesses, while pointing `doctor` directly at a harness root checks only that root.

`init` and `doctor` canonicalize the target before establishing the workspace boundary. This accepts standard filesystem aliases such as macOS `/var/...` → `/private/var/...`, a workspace symlink/junction, and a missing workspace below an aliased existing parent. After that boundary is established, Niuma still refuses symlinks, junctions, and dangling links in paths it reads, writes, or removes inside the canonical workspace. Competing-harness discovery still does not follow sibling directory or manifest links.

Re-running with a different agent in the same workspace and `--harness-dir` refreshes the core and converges active and retired entry contracts without changing agent-native rule, command, or skill assets. Retired entry files lose only their Niuma contract unless the whole file is the untouched generated entry. Ambiguous contracts, invalid target types, and internal symlinks stop during preflight. The implementation revalidates destructive plans before applying them, but it does not provide cross-process TOCTOU protection, a workspace lock, or crash-proof rollback for filesystem failures.

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

Regular files are byte-verified, directories preserve their complete contents, and symlink nodes are backed up without following or modifying their targets. Repair then regenerates canonical core content, rebuilds the core-only manifest, and runs Doctor. Rules, commands, skills, adapters, and their configuration are not planned, backed up, restored, or validated by Repair or Doctor. Exit code `0` means Doctor passed; backups are retained permanently for manual recovery.

For ambiguous active entry markers, the whole original file is backed up and a clean canonical file is generated. For an ambiguous inactive entry, Repair backs up the whole file and neutralizes only the Niuma marker text so recoverable free content remains. Repair does not guess how to reconstruct ambiguous managed/free entry boundaries; the complete original remains in the backup.

If a valid generated manifest exists, Repair retains its core agent and topology state. If the manifest is unusable, interactive Repair asks for the agent when needed; non-interactive `-y` requires `--agent`. `--rules`, `--rules-out`, and `--skills` are first-init selections and do not drive recovery. With multiple harness roots, select one explicitly using `--harness-dir`; Repair does not migrate or merge competing harnesses.

Repair does not provide `--force` or `--include-*` bypasses. It is backup-first and performs best-effort synchronous rollback, but it does not claim cross-process locking or crash-safe transactions.

## Doctor

`doctor` checks the generated harness without modifying files:

```bash
npx niuma-harness doctor .
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

All available rule directories are lightweight engineering preferences. `common` is the base selection: it is installed when `--rules` is omitted and automatically included with every ordinary named `--rules` selection. `all` and `none` are standalone selectors.

Multiple selected rule directories can apply to the same task. For example, `.ts` / `.tsx` browser UI work may select both `web/` and `typescript/`; FastAPI API work may select both `python/` and `fastapi/`; a mixed backend/frontend workspace may select `java`, `web`, and `typescript` together. Selecting `fastapi` does not implicitly select `python`.

When `--rules` is omitted, `init` installs `common`:

| Agent | Installed rules |
|---|---|
| `claude` | `common` |
| `codex` | `common` |
| `opencode` | `common` |
| `multi` | `common` |

Use `--rules <selection>` to choose engineering rule directories; ordinary named selections include `common`.

```bash
npx niuma-harness init . --agent codex --rules common
npx niuma-harness init . --agent claude --rules web,typescript
npx niuma-harness init . --agent claude --rules java
npx niuma-harness init . --agent claude --rules python,fastapi
```

The first command installs `common`. The second installs `common`, `web`, and `typescript`. The third installs `common` and `java`. The fourth installs `common`, `python`, and `fastapi`.

Use `all` to install every available rule directory, or `none` to install no rule files.

```bash
npx niuma-harness init . --agent claude --rules all
npx niuma-harness init . --agent claude --rules none
```

Use `--rules-out` to install all available rule directories except the listed ones. This is intentionally separate from named `--rules` selection: it may also exclude `common`.

```bash
npx niuma-harness init . --agent claude --rules-out web
npx niuma-harness init . --agent claude --rules-out common
```

## Skills selection

Skills are optional native `SKILL.md` packages copied from `templates/skills/` during first init. They default to `all`; use `--skills none` to skip native skill installation. Use `install-skill` to add package skills later. This selection does not control command-derived Codex skills generated from `templates/commands/*.md`.

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

Re-init, Doctor, and Repair preserve all skill files in the current agent's target roots. A skill may distribute an example configuration and instruct the user to create a separate local runtime file; both that configuration and installed skill files remain independent from the Harness core lifecycle.

## Doctor integrity boundary

`doctor` does not treat generated `harness/manifest.json` as an unrestricted source of truth. It binds `createdBy`, the actual harness directory, package-defined `workDir`, agent-derived entry files, and normalized topology. It then exact-compares tool-managed core and work templates.

The integrity boundary intentionally excludes user-maintained `project-context.md`, entry content outside the managed contract, independently installed rules, commands, skills, adapters, local runtime files such as `zentao.config.json`, unknown files, and OpenCode configuration. Doctor does not validate asset package descriptors, asset bytes, or native instruction references.

## Development

```bash
npm test
npm run pack:dry
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
node bin/niuma-harness.js doctor <tmp>
```
