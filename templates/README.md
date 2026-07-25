# Niuma Harness

This directory contains the generated Niuma Harness: a task-execution framework for the workspace. It gives agents an operating loop, policy, playbooks, verification guidance, and task-local working areas.

## Start here

- **Agents:** follow the operating loop in the workspace entry file (`CLAUDE.md` / `AGENTS.md`). When its Context phase needs navigation, open [the runtime index](docs/index.md); this README does not replace the always-loaded operating contract.
- **Maintainers and reviewers:** use this README to understand ownership and maintenance, then use [the runtime index](docs/index.md) to locate detailed runtime material.
- **Project users:** keep project-specific durable facts in `docs/project-context.md`; use `docs/process/bootstrap.md` when bootstrap or context maintenance is needed; keep task-local plans, evidence, status, and handoff records in the workspace-level `agent-work/` directory.

## Ownership and maintenance

`README.md`, `docs/index.md`, layer, policy, process, and experiment documents, `docs/decisions/README.md`, `docs/experience/README.md`, and `manifest.json` are tool-managed scaffold artifacts. Re-run `niuma-harness init` to refresh them; update the package templates when changing their generated behavior.

`docs/project-context.md` is project-maintained and is created only when missing. Individual decision and experience records are also project-maintained; only their README guides are tool-managed. `agent-work/` is workspace-level task state, outside this harness directory, and is not rewritten as generated harness content.

The generated Markdown is guidance for agents, not runtime enforcement. Use the host tool's permissions, hooks, or sandbox for runtime controls. Run `niuma-harness doctor .` to validate the installed harness shape and managed content.
