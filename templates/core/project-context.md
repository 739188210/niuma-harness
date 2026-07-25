# Project Context

This file stores verified stable facts about this project. It is maintained by agents and humans as durable project knowledge is discovered. Use `{{HARNESS_DIR}}/docs/process/bootstrap.md` for bootstrap and context-maintenance rules.

## Metadata

<!-- niuma-bootstrap-record:begin -->
```json
{
  "schemaVersion": 1,
  "status": "pending",
  "recordedAt": null,
  "filesInspected": [],
  "scanScope": "Not scanned",
  "knownGaps": ["Initial project bootstrap has not been completed."]
}
```
<!-- niuma-bootstrap-record:end -->

The marker records bootstrap state. Keep its schema and fields intact. `status` is `pending`, `partial`, or `complete`; the required scan, completion criteria, and maintenance rules are defined in `{{HARNESS_DIR}}/docs/process/bootstrap.md`.

Keep this file focused on verified durable facts that future tasks should reuse. Task-local notes, debugging traces, handoff state, and temporary evidence belong in `agent-work/tasks/<task-name>/`.

## Task fact routing

Use this optional table as a compact locator for recurring task needs. It maps a task signal to existing root fact sections, then to current evidence that must be rechecked. It does not require every project to fill it or every task to read every row, and it does not replace current workspace evidence, `{{HARNESS_DIR}}/docs/module-topology.md`, or module supplements. Do not duplicate full directory trees, API inventories, source/test lists, or generated command output here.

| Task need / signal | Read these root fact sections | Then verify against |
| --- | --- | --- |
| Understand project purpose, architecture boundaries, or technology direction | Project summary; Technology stack; Code map | Current README, manifests, configuration, and source |
| Locate implementation, entry points, tests, or reusable patterns | Code map; Reference implementations | Current source, tests, and configuration |
| Choose or run verification | Build and verification commands | Current scripts, CI configuration, and actual command output |
| Apply local engineering conventions or constraints | Engineering conventions; Reference implementations | Affected code and current tests |
| Address known limitations, missing facts, or unresolved risks | Open questions | Current evidence; ask the user when needed |
| Work across declared modules | Code map, then the module route | `{{HARNESS_DIR}}/docs/module-topology.md`, affected module supplements, and current module files |

## Project summary

## Technology stack

## Code map

## Engineering conventions

## Build and verification commands

```bash
# install

# test

# lint/typecheck/build
```

## Reference implementations

## Open questions
