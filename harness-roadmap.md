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
| `CLAUDE.md` / `AGENTS.md` | Thin tool-specific entry files. Point agents to the runtime map. |
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
- `--flat`
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

Status: mostly complete.

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

Status: in progress, mostly complete.

Known remaining work:

- `docs/automation/hooks.md` still needs to become verified automation intent rather than a fill-in command table.
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

Status: next recommended implementation phase.

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

Status: future phase.

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

## Current status

Completed or mostly complete:

- Base CLI scaffold.
- `--agent` and `--tool` alias support.
- `--rules all|none|common|<rule-dir>[,<rule-dir>...]`
- `--rules-out <rule-dir>[,<rule-dir>...]`.
- `--flat`, `--force`, `--dry-run`.
- Runtime `manifest.json` generation.
- `doctor/check` read-only health checks.
- 7-layer `docs/layers/` skeleton.
- Strengthened 7 layer memos.
- Clear boundary between layer protocols and content files.
- Runtime docs direction for entry files, index, project context, and guide.

In progress / next:

- Align process playbooks with the 7-layer model.
- Convert automation notes from fill-in commands to verified automation intent.
- Clarify task notes as task-local memory and verification evidence.
- Re-run generated harness review after playbook alignment.

## Non-goals

`niuma-harness` should not become:

- An agent runtime.
- A replacement for Claude, Codex, opencode, or IDE tools.
- A workflow engine that executes arbitrary automation by default.
- A CI/CD system.
- A package that silently installs hooks, dependencies, or external services.
- A tool that guesses project facts without verification.

Future commands such as `repair`, `upgrade`, `profile`, or `diff` may be useful later, but they are not the core purpose. The core purpose is to generate and maintain a project-local AI engineering harness that agents can use safely and consistently.
