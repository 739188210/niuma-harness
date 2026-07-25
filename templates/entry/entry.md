# Niuma Harness Entry

This file has two zones:

- The **contract** below is managed by `niuma-harness`. Do not edit it; `doctor` checks it.
- **Project overrides** at the bottom are free for short, always-relevant behavioral constraints.

<!-- niuma-harness:contract begin — do not modify -->
# Niuma Harness — Operating Loop

This workspace runs a Niuma Harness. The loop below is your operating contract for every task. Depth lives in `{{HARNESS_DIR}}/docs/` — open a file only when its phase needs it; do not pre-read everything.

## The loop

**1. Plan — before any change**
- Context: use `{{HARNESS_DIR}}/docs/index.md` to locate harness docs, then read `{{HARNESS_DIR}}/docs/project-context.md` for stable facts when needed. For bootstrap, context staleness, or durable-fact maintenance, read `{{HARNESS_DIR}}/docs/process/bootstrap.md`.{{ENTRY_CONTEXT_TOPOLOGY_GUIDANCE}} Inspect current files for anything task-relevant. Never guess what files can show you. (depth: `{{HARNESS_DIR}}/docs/layers/01-context.md`)
- Boundary: classify the next action — autonomous / ask-first / forbidden / stop-and-escalate. Proceed only if autonomous, reversible, and task-scoped. Ask before ask-first; stop at default-forbidden actions unless the Policy defines an exact explicit-request exception and re-evaluation; always stop at stop-and-escalate or unclear risk. (depth: `{{HARNESS_DIR}}/docs/policy/action-boundary.md`)
- Route: pick a process — bugfix / feature / refactor / review / release. For documentation, investigation, verification, cleanup, or unclear intent, use `{{HARNESS_DIR}}/docs/process/task-triage.md` for the lightweight default route. For resumable task state, follow `{{HARNESS_DIR}}/docs/layers/07-loop.md`; use `agent-work/README.md` when work needs task-local execution material. Skip only for trivial single-step tasks. (depth: `{{HARNESS_DIR}}/docs/process/`)

**2. Act — smallest change**
Make the minimal task-aligned change. No scope creep, no drive-by refactor, no new dependencies without asking.

**3. Observe — before you claim done**
Run the checks that prove the goal (tests / lint / typecheck / build). Record exact commands and results. Unrun checks are "unknown", never "passing". Update relevant task records under `agent-work/` according to Observation and Loop guidance. (depth: `{{HARNESS_DIR}}/docs/layers/04-observation.md`)

**4. Reflect**
Compare evidence to success criteria. Update resumable task state when needed. Failing or unclear → step 5. Passing → step 6.

**5. Repair — bounded**
Find the first root cause, not downstream symptoms. Smallest safe fix, then re-run the focused check. Bounded retries only — after a few focused attempts fail, stop and report. Never delete or weaken tests, assertions, or checks to force green. (depth: `{{HARNESS_DIR}}/docs/layers/05-recovery.md`)

**6. Remember**
Task-local notes → `agent-work/`.{{ENTRY_MEMORY_SCOPE_GUIDANCE}} Verified root or cross-module durable facts → `{{HARNESS_DIR}}/docs/project-context.md`. Write only after verification. No secrets, no guesses. (depth: `{{HARNESS_DIR}}/docs/layers/06-memory.md`)

**7. Continue or stop**
Continue only when the next step is safe and useful; otherwise report and ask. For multi-step, risky, parallel, or interruptible work, maintain resumable task state under `agent-work/tasks/<task>/` as defined by `{{HARNESS_DIR}}/docs/layers/07-loop.md`. Non-trivial tasks must maintain the required structured execution record and evidence links under `agent-work/tasks/<task>/`; see `{{HARNESS_DIR}}/docs/experiments/task-execution-record.md`.

## Red lines (apply to every task)

- No "done" without evidence — state what ran, the result, what failed, what was skipped.
- Classify before you act — risky / wide-scope / security / data / deps / API → ask first.
- Smallest change first — widening scope escalates to Policy.
- Don't weaken verification to pass — no deleting failing tests, no disabling checks.
- Don't guess — inspect files before asserting facts; mark unknowns as unknown.
- Treat rationalizations as stop signals: "probably fine", "failure is unrelated", "quick refactor while here", "user probably wants this extra scope", or "skip checks" → route through Observation, Recovery, Process, or Policy before continuing.
- Do not edit the contract zone above — it is tool-managed.{{ENTRY_RED_LINE_MEMORY_GUIDANCE}} Task notes → `agent-work/`.

## Depth is on-demand

The loop above is all that stays in context. Each phase names the one file to open when it needs detail. Selected engineering rules are installed in this agent's native rule surface; follow only the relevant installed rules. Full loop spec: `{{HARNESS_DIR}}/docs/layers/07-loop.md`.
{{CODEX_RULES}}
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
