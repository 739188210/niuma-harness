# Niuma Harness Roadmap

## Final purpose

`niuma-harness` is an AI engineering harness generator.

Its goal is not to replace Claude, Codex, opencode, or any other agent runtime. Its goal is to turn a normal project workspace into an AI-agent-ready workspace.

After a user runs:

```bash
npx niuma-harness init
```

七个模块 ：
规划能力 虚拟文件系统 任务委托/子智能体 上下文管理 代码执行与安全沙箱 human-in-the-loop 技能包加载与管理

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
| `<harness-dir>/docs/rules/` | Canonical engineering preferences and agent-specific notes for coding, testing, security, and tool behavior. |
| `.claude/rules/niuma-*.md` | Claude Code native rule pointers generated from the selected rule set; they point back to `<harness-dir>/docs/rules/` and do not duplicate rule content. |
| `opencode.json` managed `instructions` block | OpenCode native rule pointer generated from the selected rule set; unrelated user config is preserved. |
| `AGENTS.md` rules pointer | Codex/OpenCode entry-level navigation to `<harness-dir>/docs/rules/`; Codex does not use `.codex/rules` for coding standards. |
| `<harness-dir>/docs/automation/` | Verified automation intent, hooks, and CI notes. |
| `agent-work/` | Workspace-level task-local memory, plans, status ledgers, verification evidence, and handoff notes. |
| `<harness-dir>/HARNESS_GUIDE.md` | Human-facing structure and maintenance guide. |
| `<harness-dir>/manifest.json` | Generated harness status file used by `doctor/check`. |

### Rules distribution model

Rules now follow the same single-source adapter principle as commands and skills:

```text
templates/core/docs/rules/*
  -> <harness-dir>/docs/rules/*
  -> agent-native pointers
```

Implemented behavior:

- Canonical rule content remains under `templates/core/docs/rules/*` and generated `<harness-dir>/docs/rules/*`.
- `common` rules are intentionally lightweight engineering preferences; they do not replace Policy, Process, or Observation evidence requirements.
- Claude receives tool-managed `.claude/rules/niuma-<rule>.md` pointer files for selected rule directories.
- OpenCode receives a tool-managed `opencode.json.instructions` block pointing to selected rule directories while preserving unrelated user config.
- Codex receives rules navigation through `AGENTS.md`; `.codex/rules` is not generated for coding standards.
- Re-running `init` refreshes native rule adapters, removes stale Niuma-managed adapters for unselected rules or changed agents, and preserves unknown user-created native files/config.
- `doctor/check` validates selected canonical rule files plus the expected native rule adapters.

This keeps the rule source context-efficient: agent-native mechanisms improve discoverability, but the actual rule text is not copied into multiple tool-specific stores.

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

### Suggested priority

1. Capability / skill metadata model.
2. doctor content-quality checks.

## Non-goals

`niuma-harness` should not become:

- An agent runtime.
- A replacement for Claude, Codex, opencode, or IDE tools.
- A workflow engine that executes arbitrary automation by default.
- A CI/CD system.
- A package that silently installs hooks, dependencies, or external services.
- A tool that guesses project facts without verification.

Future commands such as `repair`, `upgrade`, `profile`, or `diff` may be useful later, but they are not the core purpose. The core purpose is to generate and maintain a project-local AI engineering harness that agents can use safely and consistently.
