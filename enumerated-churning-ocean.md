# Core Harness / agent asset lifecycle split

## Context

The completed installer work made rules, skills, and commands explicit agent assets. `install-rule` now uses agent-native integration: Codex rule text is embedded in `AGENTS.md`, and OpenCode rule paths are added to `opencode.json.instructions`. However, the current schema-v4 manifest, re-run `init`, `doctor`, and `repair` still treat rules, skills, commands, artifact digests, and OpenCode paths as one Niuma-managed lifecycle. This causes independent installer changes to conflict with Doctor and makes an unrelated core Harness update fail on user-customized assets.

This change establishes a strict boundary: the Harness core is managed, validated, upgraded, and repaired; agent assets are bootstrapped on fresh init or installed explicitly, but are otherwise outside re-run init / Doctor / Repair ownership.

## Confirmed behavior

### Core domain

Managed by re-run `init`, `doctor`, `repair`, and the generated manifest:

- Harness root docs/directories and tool-managed core templates;
- runtime `agent-work/` layout and README;
- active/inactive root entry contracts;
- topology route and module-supplement ownership state;
- core manifest identity and metadata.

### Asset domain

Created during fresh init or via `install-rule`, `install-skill`, and `install-command`; not recorded in the new manifest and not managed by re-run `init`, Doctor, or Repair:

- native rule files (`.claude/rules/**`, `.opencode/rules/**`);
- native skills (`.claude/skills/**`, `.agents/skills/**`, `.opencode/skills/**`);
- command artifacts (`.claude/commands/**`, `.agents/skills/<command>/**`, `.opencode/commands/**`);
- `opencode.json.instructions` and all other OpenCode user configuration;
- asset content, presence/absence, local modifications, and installer backups.

### Codex exception: embedded rules

Codex/multi rules live inside `AGENTS.md` rather than a rule-file tree. They are an asset region nested inside the outer Niuma contract.

- `install-rule` owns the nested region and may add selected rule sections.
- `doctor` ignores the nested region when checking the core contract.
- `repair` preserves a valid nested region byte-for-byte while repairing core contract content.
- **re-run `init` intentionally resets the outer Niuma contract and clears embedded Codex rules.**
- Re-run preserves `AGENTS.md` content outside the outer contract, all native assets, and `opencode.json`.

## Implementation plan

### 1. Introduce schema-v5 core manifest primitives

**Files:** `src/harness/manifest.js`, shared callers in scaffold/Doctor/Repair.

- Change `createStatus()` to emit schema v5:

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

- Remove `rules`, `skills`, `commands`, `artifacts`, and `openCodeInstructions` from newly generated manifests.
- Add a shared core-manifest parser/normalizer used by scaffold, Doctor, and Repair:
  - accept v2–v5;
  - validate only core identity, agent, entry files, work directory, and topology/module fields;
  - default v2 to root-only topology and no module supplements;
  - ignore all v2–v4 asset fields even if missing, malformed, stale, or inconsistent;
  - reject v1 and malformed core fields;
  - reject a v5 manifest that retains any legacy asset-ownership key, preventing a false v5 core/asset hybrid.
- Preserve a valid legacy `createdAt` on migration where current behavior requires it; write v5 only through successful init/Repair status updates.

### 2. Delimit Codex rules as a nested asset region

**Files:** `src/harness/contract.js`, `src/harness/entry-renderer.js`, `templates/entry/entry.md`, `src/rule/artifacts.js`, `src/installer/rule-adapters.js`.

- Keep current outer `niuma-harness:contract` markers unchanged.
- Add nested markers inside the outer contract:

  ```md
  <!-- niuma-harness:codex-rules begin -->
  ## Selected engineering rules
  ...
  <!-- niuma-harness:codex-rules end -->
  ```

- Extend contract utilities with strict nested-region analysis, slicing, replacement, removal, and a `normalizeContractForCoreComparison()` helper.
- Make canonical `renderEntry()` render only the stable operating-loop core contract; it must no longer derive content from a rule selection or emit `CODEX_RULES`.
- Update the entry template text to describe installed rules generically without claiming they are part of the core managed contract.
- Update installer rule integration to create/replace a deterministic marked region, merge selected section IDs without duplicates, and preserve installer transaction/no-follow guarantees.
- Define a conservative legacy bridge:
  - Core Doctor can strip a recognizable trailing unmarked legacy `## Selected engineering rules` block for v2–v4 contract comparison.
  - `install-rule` migrates only an unambiguous canonical legacy block into the nested region; malformed/ambiguous user content fails safely rather than being adopted.

### 3. Split init into fresh bootstrap and existing-Harness core sync

**Files:** `src/cli/index.js`, `src/cli/args.js`, `src/scaffold/index.js`, `src/scaffold/status-writer.js`, `src/scaffold/entries.js`, fresh-bootstrap asset planning modules, CLI help/docs.

- Determine mode using the shared core-manifest reader before choosing asset behavior:
  - no recognized manifest → fresh bootstrap;
  - recognized v2–v5 core manifest → core-only re-run;
  - damaged/untrusted recognized Harness state → preserve the existing stop-and-direct-to-Repair safety boundary.
- Fresh init:
  - retains agent/rule/skill/command selection behavior;
  - preflights core plus selected asset surfaces before writing;
  - creates asset files and adapters using a no-ledger bootstrap plan with existing safe path/conflict primitives;
  - writes v5 manifest last, without asset records;
  - writes Codex selected rules into the new nested region only after the core entry exists.
- Re-run init:
  - updates core templates, topology derivatives, entry core contracts, module supplements, and schema-v5 status only;
  - does not call rule/skill/command writers or OpenCode adapter writers;
  - does not inspect, recreate, refresh, adopt, delete, validate, or digest asset files/configuration;
  - retains asset roots and `opencode.json` byte-for-byte;
  - intentionally replaces the outer `AGENTS.md` contract with canonical core content, clearing any nested or legacy embedded Codex rule content while retaining entry content outside the contract;
  - migrates valid v2–v4 core state to v5 without mutating legacy asset paths.
- On re-run, reject `--rules`, `--rules-out`, and `--skills` with an actionable message directing users to `install-*`; do not silently ignore them.
- Allow agent selection to be inferred from a healthy existing manifest when omitted on re-run; retain explicit `--agent` as a core entry/metadata change. Fresh non-TTY init still requires `--agent`.
- Agent switching on re-run updates only the core entry contract and v5 metadata; it never creates/removes native assets.

### 4. Reduce Doctor to core-only validation

**Files:** `src/doctor/checks.js`, `src/doctor/core-checks.js`, `src/doctor/integrity-checks.js`; retire or detach asset-only checker imports/modules as appropriate.

- Accept v2–v5 via the shared core parser.
- Retain: manifest discovery/path safety, competing Harness detection, core identity, work-dir binding, agent/entry file validation, outer contract structure, core template/docs integrity, topology/module checks, and runtime layout.
- Remove normal-path validation of rules, skills, commands, asset ledger records, OpenCode ownership, native adapters, package asset content, asset frontmatter, and selected/unselected asset surfaces.
- Compare entry contracts after removing the nested Codex asset region (and the safe legacy compatibility payload), so asset changes do not create core drift.
- Treat malformed nested Codex-region markers as opaque asset state if the outer contract remains structurally valid.
- Doctor remains read-only and does not migrate v2–v4 manifests itself.

### 5. Reduce Repair to core-only recovery

**Files:** `src/repair/state.js`, `src/repair/desired-state.js`, `src/repair/planner.js`, `src/repair/index.js`, `src/repair/report.js`.

- Reuse the shared core parser; remove rule/skill/command recovery selections, package asset rendering, artifact-ledger validation, and OpenCode ownership handling.
- Build desired state only for core docs/directories, runtime templates, topology derivations, entry core contracts, inactive entry cleanup, and v5 manifest.
- Remove asset plan phases: rules, OpenCode updates, stale adapters, stale skills, stale commands, and asset-specific unresolved blockers.
- Repair plans/backups/rollbacks must omit asset paths entirely. Asset drift or missing assets yields no repair action and does not block a core repair.
- Entry repair rules:
  - valid outer contract + valid nested rules region → preserve nested region bytes while updating core portions;
  - valid outer contract + missing/malformed nested region → preserve that opaque region state and repair only core content;
  - missing outer contract → add canonical core contract while leaving the prior file as free content; do not infer assets;
  - malformed outer contract that would require destructive replacement while containing recognizable embedded asset content → stop with a manual-resolution error rather than silently destroying assets.
- Successful Repair of a valid legacy core manifest writes v5 status last and leaves all legacy assets untouched.
- Keep backup-first planning, revalidation, post-apply Doctor, and rollback guarantees for core paths.

### 6. Replace obsolete tests and document the lifecycle

**Tests:** `test/support/helpers.js`, `test/init/*`, `test/harness/agent-switch.test.js`, `test/doctor/*`, `test/repair/*`, `test/installer/*`, aggregators.

- Update helpers from v2–v4 mixed-ledger manifest assertions to v5 core-manifest assertions; add clear legacy-manifest fixture builders and separate core/asset snapshot helpers.
- Add fresh-init tests for v5 core manifest plus bootstrap assets.
- Add re-run tests proving that modified/missing rules, skills, commands, and OpenCode configuration remain unchanged, while core drift is refreshed.
- Add v2/v3/v4 migration cases where legacy asset fields are absent/malformed/stale but core sync/Doctor/Repair still work and produce v5 only through init/Repair.
- Replace old re-init asset convergence, asset deletion, drift rejection, and ledger-refresh tests with independent installer coverage and core-only preservation cases.
- Replace Doctor asset-ledger tests with core-only and legacy compatibility checks.
- Replace Repair asset restoration/removal tests with assertions that core repair does not list, back up, mutate, or block on asset paths.
- Add nested Codex region tests: fresh init, deterministic installer merge, legacy conversion, Doctor ignore behavior, Repair preservation, and intentional re-run clearing.
- Update `README.md`, repo `CLAUDE.md`, and `src/cli/help.js` to state:
  - fresh init bootstraps assets;
  - re-run init synchronizes core only and clears embedded Codex rules;
  - `install-*` owns ongoing asset changes;
  - Doctor/Repair are core-only;
  - v2–v4 manifests migrate to v5 through init/Repair;
  - installers still require `O_NOFOLLOW` capability for mutations.

## Verification

Run in sequence:

```sh
node --test test/installer/installer-native-rules.test.js
npm run test:init
npm run test:doctor
npm run test:repair
node --test test/cli/help.test.js
npm test
npm run pack:dry
git diff --check
git status --short
```

Use copied-package fixtures to prove package template upgrades affect core re-run content but never modify independent assets. Confirm existing staged `extends/` files remain untouched and unstaged changes are limited to this lifecycle work.
