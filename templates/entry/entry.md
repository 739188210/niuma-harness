# Niuma Harness Entry

This file has two zones:

- The **contract** below is managed by `niuma-harness`. Do not edit it; `doctor` checks it.
- **Project overrides** at the bottom are free for short, always-relevant behavioral constraints.

<!-- niuma-harness:contract begin — do not modify -->
# Niuma Harness — Operating Contract

This workspace runs a Niuma Harness. It defines collaboration constraints, task-material conventions, and recovery guidance. `doctor` verifies the Harness installation contract; it does not independently prove a task's claimed commands, evidence, or implementation outcome. Depth lives in `{{HARNESS_DIR}}/docs/` — open a file only when its phase needs it.

## The contract

**1. Start safely**
- Inspect the smallest request-relevant current source, configuration, build, test, README, or command evidence. Current workspace evidence determines task-specific facts.{{ENTRY_CONTEXT_TOPOLOGY_GUIDANCE}} Never guess what files can show you. (depth: `{{HARNESS_DIR}}/docs/layers/01-context.md`)
- Classify the next action — autonomous / ask-first / stop-and-report. Proceed only when it is autonomous, reversible, and task-scoped. Ask before ask-first; always stop at stop-and-report or unclear risk. (depth: `{{HARNESS_DIR}}/docs/policy/action-boundary.md`)
- When task-material profile selection, conditional Harness reading, or planning/resumption material is needed, use `{{HARNESS_DIR}}/docs/layers/03-process.md`, then use `agent-work/README.md` as the only progressive task-material profile card for Direct, Planned, or Tracked work. Tracked extends Planned with `status.md`; current observations remain in `status.md`. (depth: `{{HARNESS_DIR}}/docs/layers/03-process.md`)

**2. Change the smallest scope**
Make the minimal task-aligned change. Do not add unrelated refactors, dependencies, or behavior without re-checking scope and Policy.

**3. Observe before claiming completion**
Run the smallest checks that prove the requested result. Record exact results, skipped checks, and remaining unknowns: Direct work reports them in the final response; Tracked work updates `agent-work/tasks/<task>/status.md`. Focused checks do not prove full regression, and unrun checks are unknown. (depth: `{{HARNESS_DIR}}/docs/layers/04-observation.md`)

**4. Recover without rationalizing**
Compare observed evidence with the success criteria. If results fail, conflict, or remain unclear, find the first root cause, make the smallest safe repair, and re-run the focused check. Use bounded retries; never weaken tests, assertions, or checks to force green. (depth: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`)

**5. Continue, stop, or hand off safely**
Continue only when the next step is safe and useful; otherwise report and ask. For blocked, handed-off, cross-session, or otherwise Tracked work, maintain its `plan.md` and resumable current state and observations in `agent-work/tasks/<task>/status.md`; on resumption, follow `{{HARNESS_DIR}}/docs/layers/07-resumption.md` before acting. (depth: `{{HARNESS_DIR}}/docs/layers/07-resumption.md`)

**6. Preserve only durable knowledge**
Task-local notes stay under `agent-work/`.{{ENTRY_MEMORY_SCOPE_GUIDANCE}} Verified root or cross-module durable facts belong in `{{HARNESS_DIR}}/docs/project-context.md`. Write only after verification. No secrets or guesses. (depth: `{{HARNESS_DIR}}/docs/layers/06-memory.md`)

## Red lines (apply to every task)

- No completion claim without observed evidence — state what ran, the result, what failed, what was skipped, and what remains unknown.
- Focused tests, builds, typechecks, full suites, migration sources, applied migrations, and authenticated browser checks prove different things; do not upgrade one into another.
- Classify before acting — risky / wide-scope / security / data / dependencies / API work must follow Policy.
- Keep changes task-scoped; widening scope requires Process and Policy re-check.
- Do not weaken verification to pass — do not delete failing tests or disable checks.
- Treat “probably fine”, “unrelated failure”, “quick refactor”, “user probably wants this extra scope”, and “skip checks” as signals to re-check Observation, Recovery, Process, or Policy.
- Do not edit the contract zone above.{{ENTRY_RED_LINE_MEMORY_GUIDANCE}} Task notes belong under `agent-work/`.

## Depth is on-demand

The contract above is the always-loaded guidance. Each phase names the one document to open when detail is needed. Follow only relevant independently installed engineering rules. Full resumption protocol: `{{HARNESS_DIR}}/docs/layers/07-resumption.md`.{{ENTRY_CODEX_RULES_GUIDANCE}}
<!-- niuma-harness:contract end -->

# Project overrides

<!--
Use this free area only for short, always-relevant behavioral constraints:
- immediate safety or side-effect warnings;
- user or workspace preferences that must stay in the entry context;
- a pointer to {{HARNESS_DIR}}/docs/project-context.md.

Do not duplicate root project structure, code maps, commands, dependency or tooling state,
known gaps, or other root/cross-module durable facts here. Their single source of truth is
{{HARNESS_DIR}}/docs/project-context.md.{{ENTRY_OVERRIDES_COMMENT_SCOPE_GUIDANCE}}
-->
