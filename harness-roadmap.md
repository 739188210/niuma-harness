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

1. **Single source of truth.** Never write the same rule in three places. Layers and memos defer to content files instead of restating them. — supports Context-efficient.
2. **Thin entry, depth sinks down.** Entry files (`CLAUDE.md` / `AGENTS.md`) only route; details live under `<harness-dir>/docs/`. — supports Controllable, Context-efficient.
3. **Separate stable and ephemeral information.** Verified durable facts → `<harness-dir>/docs/project-context.md`; task-local notes → `agent-work/tasks/`. — supports Context-efficient.
4. **Workflows must be interruptible and resumable — but only when it pays.** Create task records only for multi-step, risky, parallel, or interruptible work; single-step tasks stay in conversation. — supports Recoverable, Context-efficient.
5. **Verification before summary.** Never just claim "done". State what ran, the result, what failed, and what was not verified. — supports Observable.
6. **Smallest change first.** Make the minimal necessary change. Widening scope, changing architecture, or touching dependencies escalates to Policy. — supports Controllable.
7. **Explicit state over implicit.** Current stage, next action, and verified/unverified items must be explicit; never rely on the reader inferring them. — supports Observable, Recoverable.

## Generated harness model

The generated harness should have clear runtime responsibilities:

```text
CLAUDE.md / AGENTS.md
  -> <harness-dir>/docs/index.md
      -> <harness-dir>/docs/project-context.md
      -> <harness-dir>/docs/layers/
      -> <harness-dir>/docs/process/
      -> <harness-dir>/docs/rules/
      -> <harness-dir>/docs/automation/
  -> agent-work/
```

### Responsibility map

| Path | Role |
|---|---|
| `CLAUDE.md` / `AGENTS.md` | Entry files carrying the always-loaded operating loop. Agents follow it automatically; `<harness-dir>/docs/index.md` is the navigation map the loop consults. |
| `<harness-dir>/docs/index.md` | Agent runtime map and reading order. |
| `<harness-dir>/docs/project-context.md` | Verified stable project facts. |
| `<harness-dir>/docs/layers/` | 7-layer agent operating protocols. |
| `<harness-dir>/docs/process/` | Concrete task playbooks selected by the Process layer. |
| `<harness-dir>/docs/rules/` | Engineering standards for coding, testing, and security. |
| `<harness-dir>/docs/automation/` | Verified automation intent, hooks, and CI notes. |
| `agent-work/` | Workspace-level task-local memory, plans, status ledgers, verification evidence, and handoff notes. |
| `<harness-dir>/HARNESS_GUIDE.md` | Human-facing structure and maintenance guide. |
| `<harness-dir>/manifest.json` | Generated harness status file used by `doctor/check`. |

### Runtime task records

Runtime-generated task files are created under `agent-work/tasks/` during multi-step, risky, parallel, or interruptible work:

```text
agent-work/tasks/<task-name>/
  status.md
  context.md
  plan.md
  verification.md
  notes.md
```

Task files hold task-local memory, explicit progress state, verification evidence, and handoff state. Durable project facts should move through the Memory layer before being recorded in `<harness-dir>/docs/project-context.md`.

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

## Open roadmap

No blocking roadmap item remains. The 7-layer model is still the right shape; the remaining work is to strengthen static gates, ownership boundaries, and evidence contracts without turning niuma into a runtime, hook system, or agent orchestrator.

### P0: 7-layer hardening

No P0 hardening items remain.

### P1: Evidence and recovery quality

No P1 evidence and recovery quality items remain.

### P2: ECC / Superpowers-inspired refinements

| Item | Lands in | Why |
|---|---|---|
| Capability / skill metadata model | `extends/` or future capability docs | Define name, when-to-use, inputs, outputs, pause conditions, verification method, and fallback checklist for optional skills. |
| doctor content-quality checks | `doctor` semantic checks | Add non-corruption checks for memo/playbook structure without treating placeholders or user-maintained content as failures. |

### Niuma self-development notes

- Generated harness artifact guard — when developing this generator, root-level `harness/*` is test output / dogfood output, not source of truth. Implement framework changes in `templates/*`, `src/*`, and tests; generate harnesses in temp directories for verification instead of editing root `harness/*`.

### Longer-term candidates

- Install-state store plus `upgrade` / `repair` commands — tracks installed files and enables migration of older layouts.
- Install profiles (`minimal` / `core` / `full`) on top of `--rules` — preset bundles to reduce selection cost.
- Richer two-way code-review guidance — current `review.md` is intentionally thin and one-directional.

### Known limitations

- Re-initializing a project that used an older install mode with entry files under `harness/` does not auto-remove stale `harness/CLAUDE.md` / `harness/AGENTS.md`. It is harmless because agents read the root entry and `doctor` checks the root entry. A future `upgrade` command can migrate or clean these layouts.
- `<harness-dir>/docs/rules/common/hooks.md` still carries Claude-Code-specific content (`PreToolUse`, `~/.claude.json`, `TodoWrite`). Clean it when rules are revisited.

### Out of scope

- Telemetry — conflicts with the zero-tracking stance.
- Continuous-learning auto-extraction — needs runtime/hooks; Memory stays manual write-back.
- AgentShield-style security scanning — a runtime tool, not a protocol concern.
- Hook runtime controls — niuma installs no hooks.
- Subagent strong constraint — subagent dispatch remains a recommendation, not a hard runtime constraint.

### Suggested priority

doctor content-quality checks.

## Non-goals

`niuma-harness` should not become:

- An agent runtime.
- A replacement for Claude, Codex, opencode, or IDE tools.
- A workflow engine that executes arbitrary automation by default.
- A CI/CD system.
- A package that silently installs hooks, dependencies, or external services.
- A tool that guesses project facts without verification.

Future commands such as `repair`, `upgrade`, `profile`, or `diff` may be useful later, but they are not the core purpose. The core purpose is to generate and maintain a project-local AI engineering harness that agents can use safely and consistently.
