# Task Triage Process

Use this process before choosing a more specific workflow.

## 1. Classify the task

- Question or explanation only
- Small edit
- Bug fix
- Feature development
- Refactor
- Security-sensitive change
- Documentation update

## 2. Identify required context

- Read `docs/index.md`.
- Read `docs/project-context.md` when design or code changes are involved.
- Read relevant rules under `docs/rules/`.

## 3. Choose workflow

- Bug fix: `docs/process/bugfix.md`
- Feature development: `docs/process/feature-development.md`
- Other tasks: use the closest workflow and keep notes in `docs/tasks/` when needed.

## 4. Confirm blockers

Ask for clarification when the task changes public contracts, adds dependencies, touches security-sensitive behavior, or lacks enough acceptance criteria.
