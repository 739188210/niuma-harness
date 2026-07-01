---
name: dev-workflow
description: "Process-controlled feature implementation workflow. Triggers: implement feature, develop feature, coding, 开发功能, 实现需求, 写代码."
metadata:
  author: jereh
  version: "2.1.0"
---

# dev-workflow

A process-controlled workflow for delivering product features through seven gated phases. Only Phase 1 requires user interaction; all later phases are self-driven by the agent.

## Triggers

Use this skill when the user asks to:

- implement a feature
- develop a feature
- write code
- 开发功能
- 实现需求
- 写代码

## Goal

Turn a requirement into production-ready code by moving through clearly defined phases, each with explicit inputs, outputs, review gates, loop-back rules, and execution tracking inside PRD.md / DESIGN.md / TEST.md.

## Assumptions

- A requirement is provided (ticket, issue, brief, or verbal).
- The codebase is accessible and buildable.
- Test, lint, and typecheck commands exist or can be discovered.
- Domain-specific conventions are loaded from relevant `CLAUDE.md` / `AGENTS.md` / `CONVENTIONS.md` files by the agent context.
- All outputs must strictly follow the project conventions.

## Process Map

```text
Requirement
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Requirements                                                     │
│    input:  user need                                                │
│    output: PRD.md / PRD.html                                        │
│    gate:   user confirms ← only user gate until final demo          │
└──────┬──────────────────────────────────────────────────────────────┘
       │ fail → re-understand
       ▼ pass
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Product Design                                                   │
│    input:  PRD                                                      │
│    output: DESIGN.md                                                │
│    gate:   self-review checklist                                    │
└──────┬──────────────────────────────────────────────────────────────┘
       │ fail → redesign
       ▼ pass
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Technical Design                                                 │
│    input:  PRD + DESIGN                                             │
│    output: {name}-api + {name}-spec + Flyway                        │
│    gate:   self-review checklist                                    │
└──────┬──────────────────────────────────────────────────────────────┘
       │ fail → revise
       ▼ pass
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Test Design                                                      │
│    input:  PRD + DESIGN + technical design                          │
│    output: TEST.md + test data                                      │
│    gate:   self-review checklist                                    │
└──────┬──────────────────────────────────────────────────────────────┘
       │ fail → revise
       ▼ pass
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Implementation                                                   │
│    input:  all upstream outputs                                     │
│    output: code                                                     │
│    gate:   self-review checklist                                    │
└──────┬──────────────────────────────────────────────────────────────┘
       │ fail → fix code or loop back
       ▼ pass
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Testing                                                          │
│    input:  code                                                     │
│    output: unit + integration results                               │
│    steps:  6.1 unit tests → 6.2 integration tests                   │
│    gate:   self-review checklist                                    │
└──────┬──────────────────────────────────────────────────────────────┘
       │ pass
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. Demonstration                                                    │
│    input:  full feature                                             │
│    output: demo record + user confirmation                          │
│    gate:   internal demo runs pass → present to user → user confirms│
└─────────────────────────────────────────────────────────────────────┘
```

## Phase Summary

| Phase | Name             | Input                      | Output                                | Gate                            | Fail Loop                   |
| ----- | ---------------- | -------------------------- | ------------------------------------- | ------------------------------- | --------------------------- |
| 1     | Requirements     | user need                  | `PRD.md` / `PRD.html`                 | user confirms                   | back to phase 1             |
| 2     | Product Design   | PRD                        | `DESIGN.md`                           | self-review checklist           | back to phase 2             |
| 3     | Technical Design | PRD + DESIGN               | `{name}-api` + `{name}-spec` + Flyway | self-review checklist           | back to phase 3             |
| 4     | Test Design      | PRD + DESIGN + tech design | `TEST.md` + test data                 | self-review checklist           | back to phase 4             |
| 5     | Implementation   | all upstream outputs       | code                                  | self-review checklist           | back to phase 5, 3, or 2    |
| 6     | Testing          | code                       | unit + integration results            | self-review checklist           | back to phase 6, 5, 4, or 2 |
| 7     | Demonstration    | full feature               | demo record                           | internal demo runs + user confirms | back to phase 7 or 5     |

## Self-Review Rule

Phases 2 through 6 each have a phase-specific self-review checklist. The agent walks the checklist top-to-bottom in one pass:

- Any unchecked item is a failure. Fix the output and re-check the failed items (no need to restart from item 1; only the items affected by the fix must be re-validated).
- All items must be checked before moving to the next phase.
- Phase 1 is the only phase that requires explicit user confirmation.
- Phase 7 presents to the user only after the internal demo runs all pass.

See each phase file for its checklist and tracking rules.

## Execution Tracking

The `Execution Tracking` table lives in **`PRD.md` only**. After completing each phase, update the corresponding row. `DESIGN.md` and `TEST.md` reference it via a short link instead of duplicating the table.

## Escalation Rule

If two consecutive self-review cycles fail in the same phase for the same root cause without making progress, the agent must stop local fixes and loop back to the earliest upstream phase that can resolve the root cause.

Examples:

- Phase 5 implementation fails repeatedly because the API does not match the code → loop back to phase 3 Technical Design.
- Phase 6 integration test fails repeatedly because test data misses a scenario → loop back to phase 4 Test Design.
- Phase 5 implementation fails repeatedly because the DESIGN omits a scenario → loop back to phase 2 Product Design.

Only escalate to the user if looping back before phase 1 cannot resolve the issue.

## Cross-Cutting Checks

These apply to every phase. Phase checklists list only phase-specific items; cross-cutting checks are reviewed implicitly by reading this list before each self-review:

1. **Correctness** — output satisfies the input requirement.
2. **Completeness** — no missing scenarios, fields, or branches.
3. **Consistency** — follows project conventions and upstream documents; violations are treated as blockers.
4. **Module Boundaries** — respects domain ownership, avoids coupling unrelated modules, depends only on published APIs.
5. **Clarity** — another person can understand it without explanation.
6. **Security** — no secrets, hardcoded credentials, or internal endpoints leaked.

## Phases

1. [01-requirements.md](phases/01-requirements.md)
2. [02-design.md](phases/02-design.md)
3. [03-technical-design.md](phases/03-technical-design.md)
4. [04-test-design.md](phases/04-test-design.md)
5. [05-implementation.md](phases/05-implementation.md)
6. [06-testing.md](phases/06-testing.md)
7. [07-demonstration.md](phases/07-demonstration.md)

## Exit Criteria

- Phase 1 output is confirmed by the user.
- Phases 2 through 6 each pass their self-review checklist.
- Phase 7 passes the internal demo runs and is confirmed by the user.
- `PRD.md` Execution Tracking table is complete.
- Any implementation decision that diverges from DESIGN.md or TEST.md is documented in TEST.md notes or as inline comments referencing the relevant phase.
- README.md (if it exists for the module) reflects the final implementation.
- All tests pass.
- Documentation matches code.
- No secrets, tokens, or passwords are committed.
- The feature is handed off to `git-workflow` for branch, commit, PR, and merge.
