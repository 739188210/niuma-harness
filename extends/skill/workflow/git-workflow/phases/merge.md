# Merge Phase

Merge the pull request after review and validation.

## Input

- An approved pull request
- Green CI checks

## Output

- Source branch merged into the target branch
- Source branch deleted (optional)

## Steps

1. Verify the PR has at least one approval.
2. Confirm all CI checks pass.
3. Verify the test plan was executed and documented.
4. Choose the merge strategy:
   - **Squash and merge** — clean history for `feat/{user}-*` and `fix/{user}-*` branches into `dev` (recommended).
   - **Merge commit** — preserve history for `dev` → `test` or `dev` → `main`.
5. Merge the PR.
6. Delete the source branch from the remote.
7. Pull the updated target branch locally.

## Checkpoints

- [ ] PR is approved.
- [ ] CI is green.
- [ ] Test plan results are recorded.
- [ ] Source branch is deleted after merge.

## Acceptance Criteria

- The target branch contains the merged changes.
- The PR is closed.
- The source branch no longer exists on the remote.
- `main` and `test` remain stable after the merge.
