# Testing Rules

## Mandatory protocol

Eligible behavior changes and automatable defect regressions must follow generated `{{HARNESS_DIR}}/docs/process/test-driven-development.md`. Stack rules choose test tools and browser/manual techniques.

Valid alternatives must be declared before implementation. Record commands, outcomes, skipped checks, and unknowns through the Observation evidence protocol.

## Minimum verification direction by change type

Use the strongest relevant row. If multiple rows apply, collect evidence that covers each changed risk and report required evidence that could not be collected.

This matrix gives proportional verification directions, not a universal toolchain or heavyweight gate. Select the smallest checks that prove the changed risks using project-local guidance. Stack-specific rules and selected process playbooks may add more focused expectations.

| Change type | Minimum verification direction |
|---|---|
| Documentation / rules | Links, paths, example commands, factual sources, and index completeness. |
| Backend code | Available formatting or static checks, affected focused tests, and compile or module checks. |
| Frontend code | Type checks, build, page or interaction verification, and network-request verification. |
| Database / migration | Forward migration, rollback, data impact, and permission or tenant impact. |
| Configuration / deployment | Configuration parsing, startup or dry-run, and dependency connectivity. |
| API contract | Server and caller compatibility, representative examples, and error paths. |

## Test integrity

Do not weaken, skip, delete, or rebaseline tests to make work pass. Test-changing actions remain governed by Policy.

## Reporting

Report relevant verification commands through the Observation evidence protocol, including evidence that could not be collected, skipped checks and reasons, substitute verification, and remaining unknowns or material risks.
