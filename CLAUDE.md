# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Niuma Harness Entry

> You do not need to go out of your way to please or pander to the person you are communicating with; simply be yourself. You have your own thoughts and judgment, so you should evaluate any uncertainties or plans discussed based on facts, principles, and objectives to determine their validity. If the other party is incorrect, point it out immediately and propose a feasible solution.

定位：
为 Claude Code / Codex / opencode 等 AI coding tools 生成并验证一套可控、可观察、可恢复、上下文高效的工程协作 harness。

核心方向围绕 4 个词展开：Action / Observation / Recovery / Context

This file has two zones:

- The **contract** below is managed by `niuma-harness`. Do not edit it; `doctor` checks it.
- **Free content** at the bottom is open — this repo keeps its development guide there.

<!-- niuma-harness:contract begin — do not modify -->
# Niuma Harness — Operating Loop

This workspace runs a Niuma Harness. The loop below is your operating contract for every task. Depth lives in `harness/docs/` — open a file only when its phase needs it; do not pre-read everything.

## The loop

**1. Plan — before any change**
- Context: read `harness/docs/project-context.md` for stable facts; inspect current files for anything task-relevant. Never guess what files can show you. (depth: `docs/layers/01-context.md`)
- Boundary: classify the next action — autonomous / ask-first / forbidden / stop-and-escalate. Proceed only if autonomous, reversible, and task-scoped. Ask before ask-first; stop at forbidden or unclear risk. (depth: `docs/policy/action-boundary.md`)
- Route: pick a process — bugfix / feature / refactor / review / release. Skip only for trivial single-step tasks. (depth: `docs/process/`)

**2. Act — smallest change**
Make the minimal task-aligned change. No scope creep, no drive-by refactor, no new dependencies without asking.

**3. Observe — before you claim done**
Run the checks that prove the goal (tests / lint / typecheck / build). Record exact commands and results. Unrun checks are "unknown", never "passing". (depth: `docs/layers/04-observation.md`)

**4. Reflect**
Compare evidence to success criteria. Failing or unclear → step 5. Passing → step 6.

**5. Repair — bounded**
Find the first root cause, not downstream symptoms. Smallest safe fix, then re-run the focused check. Bounded retries only — after a few focused attempts fail, stop and report. Never delete or weaken tests, assertions, or checks to force green. (depth: `docs/layers/05-recovery.md`)

**6. Remember**
Task-local notes → `agent-work/`. Verified durable facts → candidate for `harness/docs/project-context.md`, written back only after verification. No secrets, no guesses. (depth: `docs/layers/06-memory.md`)

**7. Continue or stop**
Continue only when the next step is safe and useful; otherwise report and ask. For multi-step work, keep state explicit in `agent-work/tasks/<task>/`.

## Red lines (always enforced)

- No "done" without evidence — state what ran, the result, what failed, what was skipped.
- Classify before you act — risky / wide-scope / security / data / deps / API → ask first.
- Smallest change first — widening scope escalates to Policy.
- Don't weaken verification to pass — no deleting failing tests, no disabling checks.
- Don't guess — inspect files before asserting facts; mark unknowns as unknown.
- Do not edit the contract zone above — it is tool-managed. Durable facts → `harness/docs/project-context.md`; task notes → `agent-work/`.

## Depth is on-demand

The loop above is all that stays in context. Each phase names the one file to open when it needs detail. Full loop spec: `harness/docs/layers/07-loop.md`.
<!-- niuma-harness:contract end -->

# Development

Guidance for working on niuma-harness itself. The managed operating-loop contract above is the product surface; this section is for developing the generator.

This source repository intentionally does **not** contain a generated `harness/` instance. Inspect the generator sources instead: `templates/entry/entry.md` for the managed entry contract, `templates/core/` for generated harness/workspace docs, `templates/manifest.json` for scaffold shape and ownership class, `templates/rules/` for canonical rule bodies, `templates/commands/` for single-source command workflows, and `templates/skills/` for native skill packages.

> 回答用户问题时，记得提炼精简，不要明明可以精炼却还是输出大段大段的文本。

## Commands

- `npm test` — full test suite (`node test/cli.test.js`).
- `npm run check` — alias for `npm test`.
- `npm run pack:dry` — preview npm package contents.
- `node bin/niuma-harness.js --help` — local CLI help.
- `node bin/niuma-harness.js init <tmp> --agent claude --dry-run` — preview generated files without writing.
- `node bin/niuma-harness.js init <tmp> --agent multi --skills all` — generate all supported agent surfaces in a temp workspace.
- `node bin/niuma-harness.js doctor <tmp>` — validate a generated harness.
- `node bin/niuma-harness.js repair <tmp> --dry-run` — print the backup-first repair plan without mutation; use `-y` only in a disposable workspace when testing application or rollback.
- Run a focused suite directly, for example `node test/init.test.js`, `node test/doctor.test.js`, `node test/repair.test.js`, or `node test/help.test.js`.

Do not run `init .` in this repo root; use a temp directory.

## Architecture

Dependency-free CommonJS Node CLI. `bin/niuma-harness.js` invokes `main()` from `src/cli.js`; commands are `init`, `doctor`, `check` (alias of `doctor`), and `repair`. The main flow is:

1. `src/args.js` parses CLI flags and normalizes agent, rule, and skill selections. `src/commands.js` separately discovers command templates and maps them to agent-native artifacts.
2. `src/cli.js` fills a missing `--agent` via `src/prompts.js` in TTY mode, finalizes default/agent rules, then dispatches.
3. `src/scaffold.js` builds the init context from `templates/manifest.json` and preflights ownership-sensitive plans before writing. It applies directories, entry/core files, canonical rules, native rule adapters, skills, and command artifacts through `src/scaffold/*`, then writes the generated `harness/manifest.json` last via `src/scaffold/status-writer.js`.
4. `src/doctor.js` locates generated `manifest.json`, then `src/doctor/checks.js` validates the harness root, workspace `agent-work/`, entry contract integrity, selected rules, skills, commands, and required docs.
5. `src/repair.js` is the recovery path for unhealthy or drifted installed state, not a force mode for init. It builds canonical desired state through `src/scaffold/desired-state.js`, prints the complete plan, creates and verifies permanent no-follow backups under `.niuma-harness/repairs/`, revalidates observations, applies with the manifest last, runs Doctor, and performs best-effort synchronous rollback on validation failure. Focused stages live under `src/repair/`.

`src/fs-safe.js` centralizes path confinement and symlink refusal for scaffold writes/removals. `src/contract.js` owns the managed contract markers and replacement helpers used by both entry merging and doctor integrity checks.

## Init write model

`init` is idempotent; there is no `--force`.

- **Entry files** are agent-derived, not listed in `templates/manifest.json`: `claude` writes `CLAUDE.md`, `codex`/`opencode` write `AGENTS.md`, and `multi` writes both. `src/scaffold/entries.js` preserves all content outside the managed contract block.
- **Harness docs** are driven by `templates/manifest.json`. Tool-managed templates refresh on each init; `managed: "user"` files (`docs/project-context.md`, `docs/automation/automation-intent.md`) are created only when missing.
- **Rules** flow from `templates/rules/<name>/` into `harness/docs/rules/<name>/` as ledger-owned canonical artifacts, then to agent-native pointers/adapters (`.claude/rules/`, `AGENTS.md` pointer behavior for Codex, and exact selected rule-file paths in the OpenCode `opencode.json.instructions` array). Clean owned rules refresh on re-init; drifted or unowned template-known targets stop before mutation and direct recovery through `repair --dry-run`. Direct edits and rule override layers are unsupported.
- **Commands** are single-sourced from `templates/commands/*.md` and rendered per agent: Claude slash commands, Codex command-derived skills, and OpenCode commands.
- **Skills** are copied from `templates/skills/*` into selected agent-native skill roots. Known template files converge to the current `--skills` selection; locally created files outside the template list, such as `zentao.config.json`, are preserved.
- **Generated status** is `harness/manifest.json`, distinct from package-internal `templates/manifest.json`. Its schema-2 artifact ledger owns generated command and rule artifacts through `kind`, `source`, `target`, and exact-byte digest. Core templates, selected skills, entry contracts, and adapters are validated against package-rendered expectations but are not ledger records; unknown local files and Skill runtime configuration remain outside Niuma ownership. Deselect removes only unchanged ledger-owned rule files; unknown local files survive and nonempty directories remain. Repair permanently backs up then restores canonical rule content.

Generated harness docs follow the seven-layer model under `docs/layers/`, with policy/process docs, `docs/experiments/task-execution-record.md`, optional rules, and workspace-level runtime notes under `agent-work/`.

## Tests

Tests use `node:test`, built-in `assert`, temporary workspaces, and the real CLI via `spawnSync` rather than mocking command orchestration.

- `test/cli.test.js` is the full `npm test` aggregator for filesystem/ledger/rule safety, agent switching, workspace conflicts, init, Doctor, Repair, and help suites.
- `test/init.test.js` and `test/doctor.test.js` further aggregate their focused init and integrity sub-suites.
- `test/helpers.js` and `test/init-fixtures.js` hold shared temporary-workspace, CLI, and assertion helpers.

When changing scaffold behavior, update `templates/manifest.json`, the relevant writer/checker, and focused tests together so generated files and doctor validation stay aligned.
