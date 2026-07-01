# Phase 1: Requirements

## Goal

Translate the user's need into a complete, confirmed Product Requirements Document (PRD). This is the **only phase that requires user interaction**, so the PRD must be thorough enough to drive all subsequent phases without further clarification.

## Input

- User statement, ticket, issue, or brief
- Existing product context
- Related modules or domains

## Output

- `PRD.md` in the target module root (uppercase `PRD.md` per `module/CONVENTIONS.md`)
- Optional `PRD.html` only if non-text content (interactive mock, complex diagram set) genuinely helps

## Steps

1. Read the user requirement carefully.
2. Draft a first-pass PRD covering the sections below from what you already know; then ask only the **specific** clarifying questions you cannot infer. Do not ask the user to fill in a 10-bucket form up front.
3. Iterate with the user on the gaps until the PRD is complete.
4. Present the PRD for confirmation.
5. After confirmation, append or update the `Execution Tracking` table in `PRD.md` (single source of truth; `DESIGN.md` and `TEST.md` only link back to it):

```markdown
## Execution Tracking

| Phase | Name             | Status     | Version | Notes          |
| ----- | ---------------- | ---------- | ------- | -------------- |
| 1     | Requirements     | ✅ Done    | v{N}    | user confirmed |
| 2     | Product Design   | ⏳ Pending | -       | -              |
| 3     | Technical Design | ⏳ Pending | -       | -              |
| 4     | Test Design      | ⏳ Pending | -       | -              |
| 5     | Implementation   | ⏳ Pending | -       | -              |
| 6     | Testing          | ⏳ Pending | -       | -              |
| 7     | Demonstration    | ⏳ Pending | -       | -              |
```

## Standard PRD Structure

Use this section order. Skip a section only when the work genuinely has nothing to put there; never invent content to fill a section.

1. **Overview** — one-paragraph problem statement and target outcome.
2. **Goals and Success Metrics** — measurable; e.g. "查询响应 p95 < 300ms"，"激活账号失败率 < 1%".
3. **Scope** — In Scope / Out of Scope, each as a bullet list.
4. **Actors and Roles** — who interacts, what permissions.
5. **User Scenarios** — primary, alternate, error / edge.
6. **Functional Requirements** — numbered FR-1, FR-2 … each linked to a scenario.
7. **Non-Functional Requirements** — performance, security, compatibility, i18n.
8. **UI/UX Expectations** — screens, key interactions, link to mocks if any.
9. **Integration Points** — other modules (`{name}-api` it calls / is called by), external systems.
10. **Acceptance Criteria** — Given / When / Then per requirement, testable.
11. **Risks, Dependencies, Open Questions** — items resolved or escalated before locking.

## Review Checklist

Single confirmation gate with the user.

- [ ] Problem statement and goals stated, with measurable success metrics.
- [ ] Actors, roles, and permissions listed.
- [ ] User scenarios cover normal, error, and edge cases.
- [ ] Functional requirements are numbered, complete, unambiguous.
- [ ] Non-functional requirements covered (perf, security, i18n if relevant).
- [ ] Acceptance criteria are Given/When/Then and testable.
- [ ] Out-of-scope items explicit.
- [ ] Integration points with other `{name}-api` modules identified.
- [ ] UI/UX expectations described or linked.

## Gate

User confirms the PRD is complete and accurate. Once confirmed, no further user input is requested until the final demonstration.

## Loop Control

If the user rejects or requests changes, update the PRD and ask for confirmation again. Stay in phase 1 until the PRD is locked.

## Exit Criteria

- `PRD.md` exists and is confirmed by the user.
- `PRD.md` contains an up-to-date `Execution Tracking` table.
- The PRD is detailed enough to drive design, technical design, test design, implementation, and verification without asking the user again.
