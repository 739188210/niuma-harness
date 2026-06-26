# Feature Development Process

## Goal

Deliver a feature through clear requirements, implementation notes, and verification evidence.

## Lightweight flow

1. Clarify the goal and acceptance criteria.
2. Read project context and relevant existing implementation patterns.
3. Plan the smallest safe implementation path.
4. Add or update tests for behavior when practical.
5. Implement the feature.
6. Run relevant verification commands.
7. Record what changed, what passed, what failed, and what remains.

## When to pause

Pause and ask before:

- changing public APIs or data contracts
- adding dependencies
- changing authentication, authorization, or security-sensitive behavior
- making irreversible data changes
- proceeding when acceptance criteria are unclear

## Task notes

For multi-step features, create a task folder under `docs/tasks/<task-name>/` and keep context, plan, and verification notes there.
