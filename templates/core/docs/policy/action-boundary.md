# Action Boundary Policy

This file is the single source of truth for action permission boundaries.

## Purpose

Define what agents may do autonomously, what requires user approval, and what is forbidden unless explicitly requested.

Use `docs/layers/02-policy/memo.md` for the Policy protocol. Use this file for concrete action categories.

## How to use

1. Classify the intended action before acting.
2. If the action is autonomous, proceed with task-scoped work.
3. If the action is ask-first, pause and request approval.
4. If the action is forbidden, do not proceed unless the user explicitly requests it.
5. For multi-step tasks, record blockers and approval needs in `agent-work/`.
6. Before reporting completion, follow the Observation layer and the selected process playbook for verification evidence.

## Autonomous actions

Agents may do these without asking when they are task-scoped and reversible:

- Read and search project files.
- Inspect configuration files, package manifests, and generated harness docs.
- Edit files directly related to the approved task.
- Run local read-only checks and project-local verification commands.
- Create task-local notes under `agent-work/tasks/`.
- Report suspected issues without changing unrelated files.

## Ask-first actions

Agents must ask before:

- Adding, removing, or upgrading dependencies.
- Changing public APIs, data contracts, generated output shape, or user-facing behavior beyond the request.
- Changing authentication, authorization, payment, cryptography, deployment, or other security-sensitive behavior.
- Running destructive commands or commands that write outside the workspace.
- Deleting files not created by the current task.
- Overwriting user-authored content with force-style behavior.
- Preparing release or deployment readiness checks before an approved outward-facing action.
- Making large refactors beyond the requested task.
- Moving uncertain facts into long-lived project context.

## Forbidden unless explicitly requested

Agents must not do these unless the user explicitly asks:

- Commit, push, publish, deploy, tag, release, or bump package versions.
- Reset git history, force-clean the repository, or discard user work.
- Expose, copy, store, or transmit secrets, credentials, tokens, or private data.
- Weaken tests, remove assertions, delete failing checks, or disable verification just to pass.
- Install global tools or modify machine-level configuration.
- Touch out-of-scope directories named by project instructions.

## Always stop and escalate

Stop and ask when:

- Requirements are ambiguous and affect behavior, architecture, data, security, or public interfaces.
- Verification fails and safe recovery is unclear.
- A secret, credential, or private data exposure is discovered. Follow `docs/policy/secret-leak.md` for the response.
- The task requires credentials, external systems, destructive writes, or irreversible data changes.
- Current files contradict the user's description.
- The next step would violate this policy.

## Related files

- Policy protocol: `docs/layers/02-policy/memo.md`
- Secret leak response: `docs/policy/secret-leak.md`
- Completion evidence: `docs/layers/04-observation/memo.md`
- Task workflows: `docs/process/`
- Engineering standards: `docs/rules/`
- Task-local notes: `agent-work/`
