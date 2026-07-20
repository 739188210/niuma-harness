# Niuma Module Supplement

<!-- niuma-harness:module-supplement begin module={{MODULE_ID}} root={{MODULE_ROOT}} -->

## Module scope

- Module: `{{MODULE_ID}}` (`{{MODULE_ROOT}}`).
- Before module-scoped work, read the root workspace entry and `{{ROOT_HARNESS_DIR}}/docs/module-topology.md`.
- Root safety, approval, evidence, and verification rules remain additive and cannot be weakened here.
- Niuma manages only this block. Keep module-local knowledge below it; it cannot weaken root safety, approval, evidence, or verification rules.
- For cross-module changes, inspect every affected module entry and follow root architecture and integration verification guidance.

<!-- niuma-harness:module-supplement end -->

# Module knowledge

> User- and Agent-managed; this knowledge area is intentionally outside the Niuma-managed marker. Record only reusable facts verified from current code, configuration, executed checks, or user confirmation. Keep temporary investigation, task status, and raw evidence in `agent-work/`; put root or cross-module durable facts in the root `project-context.md`. When both `CLAUDE.md` and `AGENTS.md` exist, keep their important module facts consistent.

## Module responsibilities and boundaries

<!-- Verified public responsibility, owned interfaces or data, and what this module intentionally does not own. -->

## Dependencies and dependents

<!-- Verified external and internal dependencies, plus modules or applications that consume this module's contracts. -->

## Build, test, and startup commands

<!-- Commands verified for building, testing, and starting this module. Record prerequisites and command scope when relevant. -->

## Source and test entry points

<!-- Verified source, runtime, and test entry points; keep only locations that help future module work. -->

## Configuration locations

<!-- Verified configuration files, environment-variable definitions, and configuration ownership boundaries. Do not record secrets or sensitive values. -->

## Module constraints, risks, and known issues

<!-- Verified module limits, compatibility, security, data, concurrency, or operational risks and known issues. -->

## Cross-module verification triggers

<!-- Verified change categories that require cross-module verification, affected consumers or contracts, and required integration checks. -->
