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

> Project- and Agent-maintained. Record only reusable facts verified from current code, configuration, executed checks, or user confirmation. Keep temporary investigation, task status, and raw evidence in `agent-work/`; put root or cross-module durable facts in the root `project-context.md`. When both `CLAUDE.md` and `AGENTS.md` exist, keep their important module facts consistent.

## Module role and boundaries

<!-- What this module owns and intentionally does not own. Add verified facts only. -->

## Code and test map

<!-- Verified source, runtime, configuration, and test entry points. -->

## Local commands and verification

<!-- Commands and checks that were executed and verified for this module. -->

## Dependencies and integration impact

<!-- Verified internal/external dependencies, consumers, contracts, and integration checks. -->

## Change risks and verification

<!-- Verified compatibility, data, security, concurrency, or regression risks and required checks. -->
