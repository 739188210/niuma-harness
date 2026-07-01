# Niuma Harness Entry

This file has two zones:

- The **contract** below is managed by `niuma-harness`. Do not edit it; `doctor` checks it.
- **Project notes** at the bottom are free — agents and humans may append there.

<!-- niuma-harness:contract begin — do not modify -->
# Niuma Harness — Operating Loop

This workspace runs a Niuma Harness. The loop below is your operating contract for every task. Depth lives in `harness/docs/` — open a file only when its phase needs it; do not pre-read everything.

## The loop

**1. Plan — before any change**
- Context: read `harness/docs/project-context.md` for stable facts; inspect current files for anything task-relevant. Never guess what files can show you. (depth: `docs/layers/01-context/memo.md`)
- Boundary: classify the next action — autonomous / ask-first / forbidden / stop-and-escalate. Proceed only if autonomous, reversible, and task-scoped. Ask before ask-first; stop at forbidden or unclear risk. (depth: `docs/policy/action-boundary.md`)
- Route: pick a process — bugfix / feature / refactor / review / release. Skip only for trivial single-step tasks. (depth: `docs/process/`)

**2. Act — smallest change**
Make the minimal task-aligned change. No scope creep, no drive-by refactor, no new dependencies without asking.

**3. Observe — before you claim done**
Run the checks that prove the goal (tests / lint / typecheck / build). Record exact commands and results. Unrun checks are "unknown", never "passing". (depth: `docs/layers/04-observation/memo.md`)

**4. Reflect**
Compare evidence to success criteria. Failing or unclear → step 5. Passing → step 6.

**5. Repair — bounded**
Find the first root cause, not downstream symptoms. Smallest safe fix, then re-run the focused check. Bounded retries only — after a few focused attempts fail, stop and report. Never delete or weaken tests, assertions, or checks to force green. (depth: `docs/layers/05-recovery/memo.md`)

**6. Remember**
Task-local notes → `agent-work/`. Verified durable facts → candidate for `harness/docs/project-context.md`, written back only after verification. No secrets, no guesses. (depth: `docs/layers/06-memory/memo.md`)

**7. Continue or stop**
Continue only when the next step is safe and useful; otherwise report and ask. For multi-step work, keep state explicit in `agent-work/tasks/<task>/`.

## Red lines (always enforced)

- No "done" without evidence — state what ran, the result, what failed, what was skipped.
- Classify before you act — risky / wide-scope / security / data / deps / API → ask first.
- Smallest change first — widening scope escalates to Policy.
- Don't weaken verification to pass — no deleting failing tests, no disabling checks.
- Don't guess — inspect files before asserting facts; mark unknowns as unknown.
- Do not edit the contract zone above — it is tool-managed. Durable facts → `harness/docs/project-context.md`; task notes → `agent-work/`.

## Depth is on-demand

The loop above is all that stays in context. Each phase names the one file to open when it needs detail. Full loop spec: `harness/docs/layers/07-loop/memo.md`.
<!-- niuma-harness:contract end -->

# Project notes

<!-- Append project-specific notes, preferences, and memory below this line. -->
