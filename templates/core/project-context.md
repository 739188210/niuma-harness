# Project Context

This user-managed file is the project knowledge index: a compact map of verified durable facts that future tasks may reuse. Initialization creates it when missing and preserves existing project-maintained content. Facts are added or refreshed only when a task verifies them and they have durable value. Each fact scope records its source and freshness boundary when useful. Current workspace evidence always overrides this file.

Missing coverage means inspect the relevant workspace evidence now; it does not require a whole-project scan or a speculative project summary. Refresh only the task-relevant scope from its current sources when its `Refresh when` condition applies or current evidence conflicts; retain unrelated user-managed facts. Keep task-local notes, debugging traces, handoff state, and temporary evidence in `agent-work/tasks/<task-name>/`.

## Context coverage

Use this table to find the smallest fact scope that may help the task. A scope is `verified` when it is confirmed from listed sources; `partial` when it has an explicit scope gap; `unverified` when it must not be relied on as fact; and `stale` when it must be rechecked against current evidence.

| Scope | Status | Primary sources | Refresh when | Known gap |
| --- | --- | --- | --- | --- |
| Build and verification commands | unverified | Current package scripts, CI configuration, and command output | Package scripts or CI configuration changes | Add only verified commands needed by a task. |
| Workspace topology | unverified | Current README files, workspace configuration, and source layout | Workspace configuration or source layout changes | Add affected module boundaries as they are verified. |
| Engineering conventions | unverified | Current source, tests, lint/format configuration, and accepted decisions | Accepted decision or reference pattern changes | Add durable conventions only when they affect recurring work. |

## Task fact routing

Use this optional table as a compact locator for recurring task needs. It maps a task signal to existing root fact sections, then to current evidence that must be rechecked. It does not require every project to fill it or every task to read every row, and it does not replace current workspace evidence, `{{HARNESS_DIR}}/docs/module-topology.md`, or module supplements. Do not duplicate full directory trees, API inventories, source/test lists, or generated command output here.

| Task need / signal | Read these root fact sections | Then verify against |
| --- | --- | --- |
| Understand project purpose, architecture boundaries, or technology direction | Workspace topology; Engineering conventions | Current README, manifests, configuration, and source |
| Locate implementation, entry points, tests, or reusable patterns | Workspace topology; Engineering conventions | Current source, tests, and configuration |
| Choose or run verification | Build and verification commands | Current scripts, CI configuration, and actual command output |
| Apply local engineering conventions or constraints | Engineering conventions | Affected code and current tests |
| Address known limitations, missing facts, or unresolved risks | Context coverage | Current evidence; ask the user when needed |
| Work across declared modules | Workspace topology, then the module route | `{{HARNESS_DIR}}/docs/module-topology.md`, affected module supplements, and current module files |

## Build and verification commands

Add a concise, source-backed command reference here when a task verifies it.

```bash
# install

# test

# lint/typecheck/build
```

## Workspace topology

Add verified root or cross-module boundaries here when they are useful beyond the current task.

## Engineering conventions

Add verified recurring conventions and reference implementations here when they affect future work.
