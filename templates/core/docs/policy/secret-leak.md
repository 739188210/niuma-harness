# Secret Leak Response

## Purpose

Define what an agent must do when it detects that a secret or sensitive data (credential, token, key, password, private key, or private data) has entered code, a commit, history, logs, or output. This is a high-severity failure with a different shape from normal Recovery: the priority is containment and escalation, not smallest-fix-and-retry.

## Trigger

Use this document when the agent observes any of:

- A secret present in a source file, config, env file, or doc.
- A secret in a git commit, the index, or history.
- A secret echoed in command output, logs, or process notes.
- A secret the user pasted into the conversation.

## Response: contain, do not self-repair

1. Stop. Do not commit, push, copy, or echo the secret further.
2. Do not attempt silent repair. Rotating, deleting, or rewriting history is high-risk and ask-first (see `action-boundary.md`).
3. Preserve evidence. Record: secret type, where it was found, and exposure scope (local-only / committed / pushed / public).
4. Escalate to the user. State the exposure scope and the recommended actions (rotate the secret, rewrite history if pushed, notify affected downstream systems).
5. Clean only after approval. Remove the secret from the working tree when safe, and use version-control-aware cleanup for committed or pushed exposure. Never delete files merely to hide evidence.

## Forbidden

- Running `git push --force` or rewriting shared history without explicit approval.
- Rotating or revoking secrets via API on the agent's own initiative.
- Copying the secret into `agent-work/` task notes, logs, or any output.
- Treating a leak as fixed because the secret was removed from the working tree (it may still be in history or on remotes).

## Difference from normal Recovery

Normal Recovery (`docs/layers/05-recovery.md`) targets the smallest safe fix and focused retry. A secret leak inverts that: the safe action is to stop and escalate, not to patch. Never apply "smallest fix" reasoning to a leak.

## Links

- Policy: `docs/policy/action-boundary.md` (rotation and history rewrite are ask-first)
- Recovery: `docs/layers/05-recovery.md`
- Memory: `docs/layers/06-memory.md` (never persist a leaked secret; record only its type and location)
