# Niuma Harness

This directory contains the generated Niuma Harness: a task-execution framework for the workspace. It is the general entry for harness structure and responsibilities. It gives agents an operating loop, navigation, policy, task playbooks, verification guidance, and task-local working areas.

## Start here

- **Agents:** follow the operating loop in the workspace entry file (`CLAUDE.md` / `AGENTS.md`). When its Context phase needs navigation, open `docs/index.md`; do not treat this README as a replacement for the always-loaded operating contract.
- **Maintainers and reviewers:** use this README to understand the harness boundary and directory responsibilities, then use `docs/index.md` to locate the relevant runtime document.
- **Project users:** keep project-specific durable facts in `docs/project-context.md`; keep task-local plans, evidence, status, and handoff records in the workspace-level `agent-work/` directory.

## Directory map

- `docs/index.md`: agent runtime navigation and reading order.
- `docs/project-context.md`: verified stable project facts.
- `docs/layers/`: the 7-layer operating protocols.
- `docs/policy/`: concrete action permission boundaries.
- `docs/process/`: task playbooks selected by the Process layer.
- `docs/experiments/`: package-enabled execution-record contracts.
- `manifest.json`: generated status used by `doctor` and `repair`.
- `agent-work/` (workspace root): task-local state and verification evidence; it is not inside this harness directory.

## Ownership and maintenance

`README.md`, `docs/index.md`, layer, policy, process, experiment documents, and `manifest.json` are tool-managed scaffold artifacts. Re-run `niuma-harness init` to refresh them; update the package templates when changing their generated behavior. `docs/project-context.md` is project-maintained and is created only when missing.

The generated Markdown is guidance for agents, not runtime enforcement. Use the host tool's permissions, hooks, or sandbox for runtime controls. Run `niuma-harness doctor .` to validate the installed harness shape and managed content.
