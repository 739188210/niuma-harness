# Commit Phase

Commit changes with a clear, conventional message.

## Input

- Staged or unstaged changes
- Scope of the change (module, component, or file)

## Output

- One or more commits on the current branch

## Steps

1. Ensure you are on a feature or fix branch. If the current branch is `dev`, `test`, or `main`, stop and run the Branch phase first.
2. Review all changes (`git diff`).
3. Stage related changes together.
4. Present to the user before committing:
   - Current branch name
   - Proposed commit message
   - Full diff (`git diff --cached` or `git diff`)
5. Do not run `git commit` until the user explicitly confirms.
6. After confirmation, write a commit message following [Conventional Commits](https://www.conventionalcommits.org/) in this format:

   ```
   <type>(<scope>): <subject>

   <body>     # optional

   <footer>   # optional
   ```
   - `<type>` and `<scope>` are in English; `<subject>` is in Chinese.
   - Allowed types:
     - `feat` — new feature
     - `fix` — bug fix
     - `docs` — documentation only
     - `style` — formatting, no logic change
     - `refactor` — code change that neither fixes a bug nor adds a feature
     - `test` — adding or updating tests
     - `chore` — build/tool/config changes
   - Common scopes:
     - `{module}` — business module
     - `iot/{module}` — IoT module
     - `framework/{name}` — framework component
     - `server/{name}` — server application
   - Subject rules: imperative mood, lower-case first letter, no trailing period, ≤ 50 characters.
   - Example: `feat(iot/device): 创建设备中心模块`

7. After commit, proceed to the PR phase for push and pull request creation.

## Checkpoints

- [ ] Current branch is not `dev`, `test`, or `main`.
- [ ] User has reviewed and confirmed the diff and commit message.
- [ ] Message starts with a valid type and scope, followed by a colon.
- [ ] Description is written in Chinese and clearly explains the change.
- [ ] Each commit focuses on a single logical change.

## Acceptance Criteria

- `git log` shows the commit with the correct format.
- Commit messages are understandable without reading the code.
