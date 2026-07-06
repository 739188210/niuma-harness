# Security Rules

## Purpose

These rules define common security engineering standards. They supplement the selected process playbook; use `docs/policy/action-boundary.md` for permission boundaries and `docs/policy/secret-leak.md` when a secret or private data exposure is discovered.

## Secrets

- Never hardcode credentials, tokens, API keys, or private endpoints.
- Use environment variables or the project's existing secret management pattern.
- Do not copy secrets or private data into logs, task notes, memory, or final output.

## Inputs and outputs

- Validate input at system boundaries.
- Avoid unsafe shell execution and path handling.
- Avoid rendering or logging sensitive data.

## Risk handling

Stop and ask before making security-sensitive changes when requirements are unclear or the next action crosses a Policy boundary.

Record residual security risk through task notes or Observation evidence.
