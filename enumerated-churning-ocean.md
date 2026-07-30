# Core Harness / agent asset lifecycle split

## Status

**Completed and verified.**

This document records the final behavior of the core/asset lifecycle split. It replaces the earlier implementation plan; requirements in that plan that conflict with this document were intentionally superseded during implementation.

## Result

Niuma Harness now separates its managed **core** from agent-native **assets**:

- The Harness core is initialized, re-initialized, checked by Doctor, and repaired by Repair.
- Agent assets are installed during first initialization or through explicit `install-rule`, `install-skill`, and `install-command` commands.
- Later `init`, Doctor, and Repair do not take ownership of assets.

## Core domain

Managed by re-run `init`, Doctor, Repair, and the generated manifest:

- Harness root docs/directories and tool-managed core templates;
- runtime `agent-work/` layout and README;
- active/inactive root entry contracts;
- topology route and module-supplement ownership state;
- core manifest identity and metadata.

## Asset domain

Created during first init or via `install-rule`, `install-skill`, and `install-command`. These are independent from re-run init, Doctor, and Repair, and are absent from the v5 manifest:

- native rule files (`.claude/rules/**`, `.opencode/rules/**`);
- native skills (`.claude/skills/**`, `.agents/skills/**`, `.opencode/skills/**`);
- command artifacts (`.claude/commands/**`, `.agents/skills/<command>/**`, `.opencode/commands/**`);
- `opencode.json.instructions` and all other OpenCode user configuration;
- asset content, presence/absence, local modifications, and installer backups.

Re-run init, Doctor, and Repair do not read, compare, validate, create, refresh, delete, back up, restore, or block on these asset states.

## Manifest routing and schema

`harness/manifest.json` determines the init lifecycle route:

- **Missing manifest:** first initialization. It creates Harness core plus selected rules, skills, and commands.
- **Existing parseable v2–v5 manifest:** core-only re-init. It refreshes only core files and rewrites the manifest as schema v5 on success.
- **Existing invalid manifest:** init fails before agent prompting/default selection, topology discovery, asset planning, or any workspace write. It never falls back to first-init behavior.

Schema v5 records core state only:

```json
{
  "schemaVersion": 5,
  "agent": "...",
  "harnessDir": "harness",
  "workDir": "agent-work",
  "entryFiles": ["..."],
  "topology": { "mode": "single", "modules": [] },
  "moduleSupplements": [],
  "createdBy": "niuma-harness",
  "createdAt": "..."
}
```

The historical keys `rules`, `skills`, `commands`, `artifacts`, and `openCodeInstructions` are not owned by v5. Parseable v2–v4 manifests remain eligible for core-only re-init even if their legacy asset fields are missing, stale, or malformed. A v5 manifest retaining any legacy asset-ownership key is rejected as an invalid hybrid.

## Codex independent rule directory

Codex and multi-agent rule files are independent assets under:

```text
.agents/harness-rules/<rule>/<relative-path>
```

- First Codex/multi init and `install-rule` use the same file-artifact renderer and write the same directory layout.
- Generated Codex/multi `AGENTS.md` contains fixed guidance: read existing `common` rules for every engineering change, then the existing applicable language/domain rule files before editing.
- Re-init and Repair refresh only the outer core contract; they preserve `.agents/harness-rules/**` byte-for-byte because it is an independent asset surface.
- Doctor validates the ordinary outer `AGENTS.md` contract and does not inspect Codex rule files.
- No migration, preservation, validation, or compatibility behavior exists for old embedded Codex rule regions.

## Re-init, Doctor, and Repair

### Re-init

For an existing valid manifest, re-init:

- refreshes core templates, topology-derived state, entry contracts, module supplements, and v5 core manifest state;
- preserves native asset surfaces and `opencode.json` byte-for-byte;
- preserves `AGENTS.md` content outside the managed outer contract;
- preserves independent `.agents/harness-rules/**` assets byte-for-byte without reading them;
- rejects first-init-only asset options (`--rules`, `--rules-out`, and `--skills`) and directs users to `install-*` commands.

### Doctor

Doctor validates core state only: manifest/core identity, workspace runtime layout, entry contract structure, topology/module state, and required core documentation. It does not report independent rule, skill, command, adapter, artifact-ledger, or OpenCode configuration drift.

For Codex/multi, Doctor validates the same ordinary managed `AGENTS.md` contract as other entry files; the fixed Codex rule-reading guidance is core content, while `.agents/harness-rules/**` remains outside Doctor ownership.

### Repair

Repair plans, backs up, modifies, restores, and validates core paths only. Independent assets—including `opencode.json`—do not appear in its plan or backups and never block core repair.

When repairing an active Codex/multi entry, Repair restores the ordinary core contract containing fixed rule-reading guidance. It does not inspect, preserve, back up, or modify `.agents/harness-rules/**`.

## Installer safety boundary

Asset installers retain their existing no-follow leaf-open protection and require an OS/Node runtime with `O_NOFOLLOW`; unavailable support causes installation to fail before planning, backups, or writes.

They are intended for a trusted workspace. They do not provide a workspace lock or complete cross-process TOCTOU protection against a malicious concurrent process replacing parent directories or regular files.

## Completed implementation

- `src/cli/index.js`: strict manifest route; competing Harness detection precedes manifest parsing.
- `src/harness/manifest.js`: schema v5 core-only parsing and legacy v2–v4 core normalization.
- `src/harness/agent-native-targets.js` and `src/rule/artifacts.js`: Codex/multi rule artifacts route to `.agents/harness-rules/` through the shared file renderer.
- `src/scaffold/entries.js` and `src/installer/rule-adapters.js`: first init and `install-rule` use independent file assets; only OpenCode retains an instruction adapter.
- `src/doctor/core-checks.js`: core-only outer contract validation with no Codex rule-asset checks.
- `src/repair/desired-state.js`, `src/repair/planner.js`, `src/repair/state.js`, and `src/repair/index.js`: core-only repair with ordinary Codex/multi entry contracts.
- Obsolete Doctor/Repair asset lifecycle modules and tests removed; retained tests rewritten around core-only ownership.
- `README.md`, root `CLAUDE.md`, and CLI help updated to state the final lifecycle and security boundary.

## Verification completed

```text
npm test
350 passed, 0 failed, 1 skipped

npm run pack:dry
passed

git diff --check
passed
```

No commit, push, merge, or pull request was requested or created.
