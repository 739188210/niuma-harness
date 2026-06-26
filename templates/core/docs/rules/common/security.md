# Security Rules

## Secrets

- Never hardcode credentials, tokens, API keys, or private endpoints.
- Use environment variables or the project's existing secret management pattern.

## Inputs and outputs

- Validate input at system boundaries.
- Avoid unsafe shell execution and path handling.
- Avoid rendering or logging sensitive data.

## Risk handling

Stop and ask before making security-sensitive changes when requirements are unclear.
Document residual security risk in task notes or verification output.
