# Phase 7: Demonstration

## Goal

Demonstrate the working feature to the user and obtain final confirmation.

## Input

- Fully implemented feature
- Passing unit and integration tests

## Output

- Demo script or automated verification result
- Screenshots, screen recording, or browser automation report
- User confirmation

## Steps

1. Identify the key user flows to demonstrate.
2. Run the application locally or use the appropriate dev command.
3. Walk through each flow manually or via browser automation, covering: happy path, edge / error path, regression on related features.
4. Record the outcome (screenshot, video, or log).
5. Run the demo checklist. If any item fails, fix the feature and re-run only the affected scenarios.
6. After the checklist is fully checked, present the demo to the user for confirmation.
7. After user confirmation, update the `Execution Tracking` row for phase 7 in `PRD.md`.

After phase 7 is confirmed, hand the feature off to `git-workflow` for branch, commit, PR, and merge.

## Demo Checklist

Phase-specific items only (cross-cutting checks inherited from SKILL.md):

- [ ] Primary user flow completes successfully.
- [ ] UI states (loading, success, error) behave correctly.
- [ ] Validation errors are shown clearly.
- [ ] Empty states and boundary inputs are handled.
- [ ] Existing related features still work.
- [ ] Auth, permissions, and navigation remain intact.
- [ ] Features owned by other modules are not broken.

## Gate

All checklist items are checked, then the user confirms the feature is acceptable.

## Loop Control

If any item fails, fix the feature and re-run only the affected scenarios. If the fix is large, loop back to phase 5 or earlier. Do not show the user a broken demo. If the same root cause blocks two consecutive cycles, escalate per the escalation rule in SKILL.md.

## Exit Criteria

- Demo checklist is fully checked.
- Demo artifacts are recorded.
- User confirms acceptance.
- `PRD.md` Execution Tracking row for phase 7 is updated.
