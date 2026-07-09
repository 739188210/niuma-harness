# Security Rules

## Purpose

These rules define common security engineering preferences. They are a lightweight hygiene layer and do not replace Policy boundaries, approval gates, or the secret-leak emergency response.

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
