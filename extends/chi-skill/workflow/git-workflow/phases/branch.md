# Branch Phase

Create a well-named feature or fix branch from the correct integration branch.

## Input

- Issue or task ID
- Feature/fix summary
- Target integration branch (`dev` or `test`)

## Output

- A local branch following the naming convention
- A pushed remote branch (optional but recommended)

## Steps

1. Ensure the current branch is clean (`git status`).
2. Switch to the integration branch (`dev` for features, `dev` or `test` for fixes, `main` for hotfixes).
3. Pull the latest changes.
4. Create a branch using one of these patterns:
   - `feat/{user}-<short-feature-name>`
   - `fix/{user}-<short-bug-name>`

   `{user}` defaults to `git config user.name`. The short name is lower-case English with hyphens. Example: `feat/23511-device-center`.

5. Push the branch to the remote.

## Checkpoints

- [ ] Branch name starts with `feat/{user}-` or `fix/{user}-`.
- [ ] Branch is cut from the latest `dev` (or `test`/`main` for urgent fixes).
- [ ] No uncommitted changes are carried over.

## Acceptance Criteria

- `git branch` shows the new branch.
- The remote branch exists (`git branch -r`).
- The branch name clearly describes the task.
