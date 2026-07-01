# PR Phase

Open a pull request that is ready for review.

## Input

- Source branch (`feat/{user}-*` or `fix/{user}-*`)
- Target branch (`dev`, `test`, or `main`)
- Related issue or task ID

## Output

- A pull request with title, description, and test plan

## Steps

1. Make sure the source branch is up to date with the target branch (rebase if needed).
2. Run local checks (lint, typecheck, tests) and confirm they pass.
3. Run the `review-workflow` skill against the diff and resolve every CRITICAL / HIGH finding before pushing.
4. Confirm the remote and branch with the user, then push the final branch.
5. Open a pull request from the source branch to the target branch.
6. Fill in the PR using these sections (in Chinese):

   - **Title**: `<type>(<scope>): <中文描述>`
   - **## Summary** — 变更内容和原因
   - **## Related Issue** — issue/task ID
   - **## Test Plan** — 如何测试、手动步骤和预期结果
   - **## Review Findings** — paste the `review-workflow` output (findings + severity summary + recommendation)
   - **## Checklist** — self-review completed, tests added/updated, docs updated

7. After creation, provide the PR URL, title, and description.
8. Request at least one reviewer.

## Checkpoints

- [ ] Branch is rebased on the latest target branch.
- [ ] Local checks pass.
- [ ] `review-workflow` was run; no unresolved CRITICAL / HIGH findings.
- [ ] PR title follows the commit format.
- [ ] PR description includes a test plan and the review findings.
- [ ] Reviewers are assigned.

## Acceptance Criteria

- The PR is open and linked to the correct target branch.
- The description contains a clear test plan.
- All required CI checks are green or in progress.
