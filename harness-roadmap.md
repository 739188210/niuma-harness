# Niuma Harness Roadmap

## Final purpose

`niuma-harness` is an AI engineering harness generator.

Its goal is not to replace Claude, Codex, opencode, or any other agent runtime. Its goal is to turn a normal project workspace into an AI-agent-ready workspace.

After a user runs:

```bash
npx niuma-harness init
```

the project should contain a generated harness that AI agents can read, follow, verify against, recover through, and continue from.

The generated harness is not just a documentation template. It is the project's AI working protocol.

It should help agents answer:

- What project facts should I load before acting?
- What am I allowed to do independently?
- Which workflow should I follow for this task?
- How do I prove the current state is good?
- What do I do when work fails or becomes unclear?
- Which facts should be preserved for future work?
- Should I continue, recover, stop, or ask the user?

## Goals and principles

These are the foundation the harness model and layer memos are built on. Every layer, process playbook, and rule should be traceable back to a goal, and every design choice should not violate a principle.

### Goals

The harness turns a normal workspace into an AI-agent-ready workspace with four properties:

| Property | Meaning |
|---|---|
| Controllable | Agent autonomy is bounded; risky or wide-scope actions escalate to the user. |
| Observable | State and results are proven with evidence, not asserted. |
| Recoverable | Work can be interrupted and resumed; failures have bounded, safe recovery. |
| Context-efficient | Agents load only what they need; no duplicated, stale, or low-value context. |

### Principles

1. **Single source of truth.** Never write the same rule in three places. (Layers and memos defer to content files; e.g. `02-policy` memo points to `docs/policy/action-boundary.md` rather than restating it.) — supports Context-efficient.
2. **Thin entry, depth sinks down.** Entry files (`CLAUDE.md` / `AGENTS.md`) only route; details live under `docs/`. — supports Controllable, Context-efficient.
3. **Separate stable and ephemeral information.** Verified durable facts → `docs/project-context.md`; task-local notes → `agent-work/tasks/`. — supports Context-efficient.
4. **Workflows must be interruptible and resumable — but only when it pays.** Create process docs (`agent-work/tasks/<task>/`) only for multi-step or interruptible work; single-step tasks stay in conversation. Process docs that duplicate project facts violate Principle 1. — supports Recoverable, Context-efficient.
5. **Verification before summary.** Never just claim "done". State what ran, the result, what failed, and what was not verified. — supports Observable.
6. **Smallest change first.** Make the minimal necessary change. Widening scope, changing architecture, or touching dependencies escalates to Policy. — supports Controllable.
7. **Explicit state over implicit.** Current stage, next action, and verified/unverified items must be explicit; never rely on the reader inferring them. — supports Observable, Recoverable.

## Generated harness model

The generated harness should have clear runtime responsibilities:

```text
CLAUDE.md / AGENTS.md
  -> docs/index.md
      -> docs/project-context.md
      -> docs/layers/
      -> docs/process/
      -> docs/rules/
      -> docs/automation/
  -> agent-work/
```

### Responsibility map

| Path | Role |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | Entry files carrying the always-loaded operating loop. Agents follow it automatically; `docs/index.md` is the navigation map the loop consults. |
| `docs/index.md` | Agent runtime map and reading order. |
| `docs/project-context.md` | Verified stable project facts. |
| `docs/layers/` | 7-layer agent operating protocols. |
| `docs/process/` | Concrete task playbooks selected by the Process layer. |
| `docs/rules/` | Engineering standards for coding, testing, and security. |
| `agent-work/` | Workspace-level task-local memory, plans, verification evidence, and handoff notes. |
| `docs/automation/` | Verified automation intent, hooks, and CI notes. |
| `HARNESS_GUIDE.md` | Human-facing structure and maintenance guide. |
| `manifest.json` | Generated harness status file used by `doctor/check`. |

### Post-init file roles

Generated files fall into three maintenance categories.

Usually stable scaffold files define how the harness works and should not change during normal task execution:

- `HARNESS_GUIDE.md`
- `docs/index.md`
- `docs/layers/`
- `docs/process/`
- `agent-work/README.md`
- `manifest.json`

Project-maintained files may evolve as the project, team, and tool environment become clearer:

- `docs/project-context.md`: verified stable project facts.
- `docs/rules/`: team engineering standards.
- `docs/automation/hooks.md`: verified automation intent.
- `CLAUDE.md` / `AGENTS.md`: thin tool entry adapters.

Runtime-generated task files are created under `agent-work/tasks/` during multi-step work:

```text
agent-work/tasks/<task-name>/
  context.md
  plan.md
  verification.md
  notes.md
```

Task files hold task-local memory, verification evidence, and handoff state. Durable project facts should move through the Memory layer before being recorded in `docs/project-context.md`.

## 7-layer architecture

The harness is organized around 7 layers:

| Layer | Purpose |
|---|---|
| Context | Help agents find, verify, and use project facts. |
| Policy | Define agent autonomy boundaries and approval points. |
| Process | Route tasks to the right playbook and escalation path. |
| Observation | Define how agents prove state with evidence. |
| Recovery | Define safe behavior when work fails or becomes unclear. |
| Memory | Define what should be preserved and what stays task-local. |
| Loop | Define how agents continue, pause, recover, remember, or stop. |

Layer memos are protocols. They do not replace the content files they point to.

Examples:

- `docs/layers/01-context/memo.md` explains how to use context.
- `docs/project-context.md` stores verified project facts.
- `docs/layers/03-process/memo.md` explains how to choose a workflow.
- `docs/process/` stores concrete task playbooks.
- `docs/layers/02-policy/memo.md` defines autonomy boundaries.
- `docs/rules/` stores engineering standards.

## Phase goals

### Phase 1: Base scaffold

Goal: `niuma-harness` can generate a basic harness scaffold from the CLI.

Capabilities:

- `niuma-harness init [target]`
- `--agent claude|codex|opencode|multi`
- `--tool` as an alias for `--agent`
- `--harness-dir <name>`
- `--rules all|none|common|<rule-dir>[,<rule-dir>...]`
- `--rules-out <rule-dir>[,<rule-dir>...]`
- `--force`
- `--dry-run`

Generated structure:

- `CLAUDE.md` and/or `AGENTS.md`
- `HARNESS_GUIDE.md`
- `docs/index.md`
- `docs/project-context.md`
- `docs/process/`
- `docs/rules/`
- `agent-work/README.md`
- `agent-work/tasks/`

Verification:

```bash
npm test
node bin/niuma-harness.js init <tmp> --agent claude
node bin/niuma-harness.js init <tmp> --agent multi
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
npm run pack:dry
```

Status: complete.

Recent completion notes:

- Rule selection now supports `all`, `none`, exact rule directories, and `--rules-out`.
- `--force` re-init converges selected known rule packs by removing unselected generated rule files.
- CLI implementation and tests were split into smaller focused modules.
- Full CLI tests, check alias, package dry-run, help output, and init/doctor smoke tests pass.

### Phase 2: Checkable harness

Goal: The generated harness has a status file and a read-only health check.

Capabilities:

- Generated `manifest.json`
- `niuma-harness doctor [target]`
- `niuma-harness check [target]`

Checks:

- Status file exists and is valid JSON.
- Entry files match the selected agent.
- Core docs exist.
- 7-layer memo files exist.
- `doctor/check` do not modify the project.

Verification:

```bash
node bin/niuma-harness.js doctor <tmp>
node bin/niuma-harness.js check <tmp>
```

Failure verification:

```text
Delete a required file and confirm doctor exits with code 1.
Break manifest.json and confirm doctor exits with code 1.
```

Status: mostly complete.

### Phase 3: 7-layer skeleton

Goal: The generated harness has a visible 7-layer agent operating model.

Generated structure:

```text
docs/layers/
  01-context/memo.md
  02-policy/memo.md
  03-process/memo.md
  04-observation/memo.md
  05-recovery/memo.md
  06-memory/memo.md
  07-loop/memo.md
```

Each layer memo should include:

- Purpose
- When to use
- Agent protocol
- Allowed actions
- Forbidden actions
- Outputs
- Links to other layers

Verification:

```bash
node bin/niuma-harness.js init <tmp> --agent claude
node bin/niuma-harness.js doctor <tmp>
```

Manual review:

- Layer memos are non-empty.
- Context layer does not duplicate `docs/project-context.md`.
- Process layer does not duplicate `docs/process/` playbooks.
- Policy layer does not duplicate `docs/rules/` standards.

Status: mostly complete.

### Phase 4: Runtime docs

Goal: The generated harness is useful immediately after init and does not depend on a human filling every placeholder before agents can begin.

Required positioning:

- `CLAUDE.md` / `AGENTS.md`: thin tool entries.
- `docs/index.md`: agent runtime map.
- `docs/project-context.md`: verified stable facts file.
- `HARNESS_GUIDE.md`: human structure and maintenance guide.

Design direction:

- Avoid `fill this` framing.
- Avoid `<fill path>` / `<fill command>` placeholders where possible.
- Use `Unknown until verified` when facts are not known.
- Tell agents to inspect the current workspace before acting.
- Tell agents not to guess missing facts.
- Store only verified durable facts in `docs/project-context.md`.

Verification:

```bash
node bin/niuma-harness.js init <tmp> --agent claude
```

Manual review:

- Entry files are thin.
- `docs/index.md` is a runtime map.
- `docs/project-context.md` is a verified facts file.
- `HARNESS_GUIDE.md` is not a fill-in checklist.

Status: complete for base runtime docs; remaining alignment moves to Phase 5.

Carried into Phase 5:

- `docs/automation/hooks.md` should become verified automation intent rather than a fill-in command table.
- `docs/process/*` should align more clearly with the 7 layers.
- `agent-work/README.md` should align with task-local memory and verification evidence.

### Phase 5: Playbook alignment

Goal: Existing process, task, automation, and rule documents align with the 7-layer model.

Target files:

- `docs/process/task-triage.md`
- `docs/process/bugfix.md`
- `docs/process/feature-development.md`
- `agent-work/README.md`
- `docs/automation/hooks.md`
- optionally `docs/rules/common/*.md`

Expected direction:

- `docs/process/*` should reference Context, Policy, Observation, Recovery, Memory, and Loop where relevant.
- `agent-work/README.md` should define task-local memory and verification evidence.
- `docs/automation/hooks.md` should record verified automation intent and avoid invented commands.
- Rules should remain engineering standards, not layer protocols.

Verification:

```bash
node bin/niuma-harness.js init <tmp> --agent claude
node bin/niuma-harness.js doctor <tmp>
npm test
```

Manual review:

- No leftover fill-table language in generated docs.
- Process playbooks are concrete but still connected to the 7-layer operating model.
- Automation docs do not suggest unverified commands.
- Task docs clearly separate task-local notes from durable project facts.

Status: complete.

Completion notes:

- `docs/process/task-triage.md`, `bugfix.md`, and `feature-development.md` reference Context, Policy, Observation, Recovery, Memory, and Loop where relevant.
- `agent-work/README.md` defines task-local memory and verification evidence; stale flat-mode wording removed.
- `docs/automation/hooks.md` records verified automation intent instead of fill-in command tables.
- Process playbooks stay concrete while remaining connected to the 7-layer operating model.

### Phase 6: Scenario validation

Goal: Validate the generated harness through realistic agent work scenarios, not only file existence checks.

Scenario 1: New project understanding

Input:

```text
Help me understand this project.
```

Expected agent behavior:

- Start from `docs/index.md`.
- Read `docs/project-context.md`.
- Detect missing facts.
- Inspect current workspace.
- Produce verified context.
- Suggest durable updates only after verification.

Scenario 2: Bug fix

Input:

```text
Fix this failing test.
```

Expected agent behavior:

- Load Context.
- Check Policy.
- Route through Process: bugfix.
- Use Observation for focused verification.
- Use Recovery if tests/builds fail.
- Use Memory only for durable facts.

Scenario 3: Feature development

Input:

```text
Add this small feature.
```

Expected agent behavior:

- Route through Process: feature development.
- Check Policy for API, dependency, data, and security risks.
- Use Observation for verification.
- Use `agent-work/tasks/` for multi-step notes when needed.

Scenario 4: Failure recovery

Input:

```text
The build/test command fails.
```

Expected agent behavior:

- Preserve the failure signal.
- Identify the first root failure.
- Avoid deleting tests or disabling checks.
- Retry only with a bounded, focused repair.
- Stop and report when recovery is unsafe or unclear.

Verification methods:

- Manual walkthroughs using generated harness output.
- Fixture projects with known failures.
- E2E smoke tests that assert expected generated docs and doctor behavior.

Status: complete.

Completion notes:

- All four scenarios were walked through against a fixture project (`calc-utils`): project understanding, bug fix, feature development, and failure recovery.
- Walkthrough surfaced one blocking issue (🔴): the default `harness/` install mode left no root entry file, so agents could not auto-discover the harness. Resolved by unifying to a single install mode — entry files (`CLAUDE.md`/`AGENTS.md`) in the workspace root, protocol content under `harness/`, `--flat` removed.
- After the fix, the root entry guides agents to `harness/docs/index.md` and the 7-layer model. Recovery and Loop protocols cover bounded retry and stop conditions. Remaining findings were wording-only and have been cleaned.

## Verification strategy

Use layered verification:

1. Unit/CLI tests for parser, scaffold, manifest, doctor, and safety checks.
2. Generated-output smoke tests using temporary directories.
3. Doctor failure tests by deleting or corrupting required files.
4. Package dry-run checks to ensure templates are shipped.
5. Manual review of generated docs for information architecture quality.
6. Scenario validation against realistic agent tasks.

Core commands:

```bash
npm test
node bin/niuma-harness.js init <tmp> --agent claude
node bin/niuma-harness.js doctor <tmp>
node bin/niuma-harness.js check <tmp>
node bin/niuma-harness.js init <tmp> --agent claude --dry-run
npm run pack:dry
```

## P5: Subagent & workspace isolation model

The core harness was originally single-agent with no workspace isolation step. Two related gaps were identified.

### P5a: Subagent dispatch + review model

Superpowers enforces per-task subagent dispatch (fresh context per task, no cross-task contamination) with two-stage review (spec compliance, then code quality), via active session-start injection plus the platform `Task` tool.

The niuma harness is a passive protocol scaffold. By the stated non-goal (no silent hook installation), it cannot structurally force subagent dispatch the way Superpowers does.

Decision: describe the subagent dispatch + two-stage review pattern as a **recommended** workflow in the protocol, not a hard constraint. Strong constraint is out of scope — it requires runtime-level injection, which conflicts with the non-goals.

Status: not yet implemented. Optional enhancement; skip if daily work is mostly single-agent.

### P5b: Workspace isolation (worktree)

`git worktree` is a universal git operation any runtime can perform, so worktree isolation is tractable at the protocol level (unlike subagent dispatch).

Decision: make isolation a first-class, on-demand step rather than an afterthought.

Implemented:

- New playbook `docs/process/isolation.md` — single source for the isolation procedure (when to isolate, `git worktree add` steps, boundaries, cleanup).
- Registered in `templates/manifest.json` so it is generated and doctor-checked.
- `docs/layers/03-process/memo.md` routes to it (Agent protocol step + Allowed actions entry).
- `docs/process/feature-development.md` and `refactor.md` carry a one-line pointer after Check Policy.
- The entry Loop is unchanged; isolation triggers from Process routing for multi-step / risky / parallel work and is not loaded for every task.

Status: complete. Consistent with `docs/policy/action-boundary.md` (no push / MR / delete without explicit ask) and the Recovery layer (isolation is preventive; Recovery rollback is reactive).

## Current status

Completed:

- Base CLI scaffold.
- `--agent` and `--tool` alias support.
- `--rules all|none|common|<rule-dir>[,<rule-dir>...]`.
- `--rules-out <rule-dir>[,<rule-dir>...]`.
- `--force`, `--dry-run` (`--flat` removed; single install mode only).
- `--force` rule re-init convergence for known generated rule packs.
- Runtime `manifest.json` generation.
- `doctor/check` read-only health checks.
- 7-layer `docs/layers/` skeleton.
- Strengthened 7 layer memos.
- Clear boundary between layer protocols and content files.
- Runtime docs direction for entry files, index, project context, and guide.
- Single install mode: entry files (`CLAUDE.md`/`AGENTS.md`) in the workspace root, protocol content under `harness/`, runtime records under workspace-level `agent-work/`.
- Process, task, and automation docs aligned with the 7-layer model (Phase 5).
- Scenario validation across all four task types (Phase 6).
- JS implementation split into focused modules under `src/scaffold/`, `src/doctor/`, and shared helpers.
- CLI tests split into focused files with `test/cli.test.js` as the aggregator.
- Source comments added in Chinese for key modules and intent.
- Full verification passed: `npm test`, `npm run check`, `npm run pack:dry`, help output, and init/doctor smoke tests.
- Entry-file operating contract (P0/P3): the entry file (`CLAUDE.md`/`AGENTS.md`) carries the distilled 7-step Loop as an always-loaded contract; the 6 layer memos become on-demand depth loaded per phase. Two-zone design with tool-managed contract markers.
- Single-source entry template: `templates/entry/entry.md` is the one source for both `CLAUDE.md` and `AGENTS.md`; multi mode produces byte-identical files.
- `doctor` contract-integrity check: detects contract-zone drift in entry files; skips user-managed entries without markers.
- Removed hedging in core playbooks/rules (P2): "when practical" replaced with a hard requirement plus an explicit escape-with-reason.
- Workspace isolation playbook (P5b): see the P5 section above.
- Repo hygiene (P7): untracked the leaked generated `agent-work/README.md`; removed local dogfood artifacts; `.gitignore` covers regeneration.

Known limitations:

- Re-initializing a project that used an older install mode (entry under `harness/`) does not auto-remove the stale `harness/CLAUDE.md`/`AGENTS.md`. It is harmless (agents read the root entry, doctor checks the root entry) and is left for a future `upgrade` command.

In progress / next:

- None blocking. A future `upgrade` command may migrate older harness layouts.
- Optional: add the subagent dispatch + two-stage review pattern as a recommended workflow (P5a). Low priority for single-agent usage.

## Candidate enhancements (from Superpowers / ECC comparison)

Remaining ideas worth borrowing, after the P0–P7 work already landed (entry-contract injection, rigid gates / no hedging, Loop-as-spine with on-demand depth, worktree isolation, doctor contract-integrity, idempotent install). Filtered against niuma's philosophy: passive protocol, dependency-free, no hooks, no telemetry.

### High value, fits the philosophy, tractable

| Idea | Source | Lands in | Why |
|---|---|---|---|
| brainstorming-before-code gate | Superpowers | a lightweight design-clarify playbook under `docs/process/`, routed by the Process layer | feature-development jumps to implementation with only a one-line "clarify goal"; a structured refine-the-idea-with-user gate before planning blocks rework |
| doctor content-quality checks | ECC | `doctor` semantic checks | today doctor only verifies existence; add checks that `project-context.md` is not empty/placeholder and that memos carry real content |
| writing-skills meta-skill + skill metadata model | Superpowers | a standard for authoring skills (`extends/` skills already use frontmatter) | formalize name/description/when_to_use plus a test method so contributed skills stay consistent |
| install-state store + upgrade/repair | ECC | a state file + `upgrade`/`repair` commands | tracks what is installed; enables incremental updates and migrates older layouts — resolves the known limitation about stale `harness/CLAUDE.md` |
| cross-runtime behavior parity tests | ECC | `test/` | assert claude/codex/opencode/multi produce equivalent output for the same input; protects the multi story from silent drift |

### Worth considering (medium)

- Rationalization red-flags table (Superpowers `using-superpowers`) — a self-discipline device listing "thoughts that mean you are rationalizing"; could sit in the entry or a memo.
- Richer two-way code-review skills (Superpowers requesting/receiving-code-review) — current `review.md` is thin and one-directional.
- Security rules beyond `secret-leak.md` (ECC security guide) — prompt-injection defenses and sensitive-field scanning as protocol-level rules, not runtime scanning.
- Install profiles (ECC minimal/core/full) on top of `--rules` — preset bundles to reduce selection cost.

### Out of scope (conflict or over-engineering)

- Telemetry — conflicts with the zero-tracking stance.
- Continuous-learning auto-extraction — needs runtime/hooks; the Memory layer stays manual write-back.
- AgentShield-style security scanning — a runtime tool, not a protocol concern.
- Hook runtime controls — niuma installs no hooks.
- Subagent strong constraint — P5a is recommendation-only by decision.

### Suggested priority by ROI

doctor content-quality checks > brainstorming gate > cross-runtime parity tests > install-state/upgrade.

## Non-goals

`niuma-harness` should not become:

- An agent runtime.
- A replacement for Claude, Codex, opencode, or IDE tools.
- A workflow engine that executes arbitrary automation by default.
- A CI/CD system.
- A package that silently installs hooks, dependencies, or external services.
- A tool that guesses project facts without verification.

Future commands such as `repair`, `upgrade`, `profile`, or `diff` may be useful later, but they are not the core purpose. The core purpose is to generate and maintain a project-local AI engineering harness that agents can use safely and consistently.
