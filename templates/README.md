# Niuma Harness

This directory contains the generated Niuma Harness: a project-level collaboration protocol for the workspace. It provides agents with a shared operating contract, Policy boundaries, Direct / Planned / Tracked task-material profiles, observation guidance, recovery navigation, and task-local working-area conventions.

## Start here

- **Agents:** follow the always-loaded operating contract in the workspace entry file (`CLAUDE.md` / `AGENTS.md`). Open [the runtime index](docs/index.md) only when the contract or Process selects additional material.
- **Maintainers and reviewers:** use this README for ownership and installation-integrity boundaries, then use [the runtime index](docs/index.md) for detailed runtime material.
- **Project users:** keep project-specific durable facts in source-backed scopes in `docs/project-context.md`; refresh only task-relevant facts against current workspace evidence; keep task-local plans, status, evidence, and handoff records in the workspace-level `agent-work/` directory.

## Installation integrity boundary

The generated Markdown is collaboration guidance, not runtime enforcement. Use the host tool's permissions, hooks, or sandbox for runtime controls.

Run `niuma-harness doctor .` to validate installed Harness integrity: the expected generated structure, managed document content, and entry contract. Doctor does not independently prove a task implementation, claimed command, test result, evidence record, runtime behavior, or final outcome.

## Ownership and maintenance

`README.md`, `docs/index.md`, layer and policy documents, `docs/experience/README.md`, and `manifest.json` are tool-managed scaffold artifacts. Re-run `niuma-harness init` to refresh them; update the package templates when changing their generated behavior.

`docs/project-context.md` is project-maintained and is created only when missing. Individual experience records are also project-maintained; only their README guide is tool-managed. `agent-work/` is workspace-level task state, outside this harness directory, and is not rewritten as generated harness content.
