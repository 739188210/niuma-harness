# Task Execution Feedback Record

This experiment is enabled by the current Niuma Harness package. It is not workspace-disableable: deleting this document does not disable the requirement, and re-init restores package-managed documentation. A future package release may retire the experiment when it is no longer useful.

For every non-trivial task, create or update `agent-work/tasks/<task-name>/harness-feedback.md`. The marker-delimited JSON is the structured task execution record; prose outside the markers is optional. Runtime records are user/agent-owned and are never overwritten by init, repair, or doctor.

## Purpose

The record captures the agent's task-level account of Bootstrap, Task rating, Context, Action boundary, Execution, Verification, Recovery, and Outcome. It connects success criteria and recovery steps to stable evidence IDs in task-local `verification.md`.

## When to record

Use a record for every non-trivial task. Common indicators include changing files, running verification, requiring multiple steps, using delegated work, or touching release, security, data, dependency, API, or policy boundaries.

For a trivial task, state in the final response that no separate record was needed.

## Complete schema 1 example

Copy this into `agent-work/tasks/example-task/harness-feedback.md`, then replace every example value with truthful task evidence. Keep the task ID equal to the direct task directory name and use canonical UTC timestamps.

<!-- niuma-audit-record:begin -->
```json
{
  "schemaVersion": 1,
  "task": {
    "id": "example-task",
    "recordedAt": "2026-07-12T09:00:00Z",
    "tool": "claude-code",
    "requestSummary": "Update task-scoped documentation and verify the generated output.",
    "declaredResult": "complete"
  },
  "rating": {
    "classification": "documentation",
    "tier": "normal",
    "rationale": "The task changes package-managed documentation and its tests without external side effects.",
    "riskFactors": [],
    "reclassified": false,
    "reclassificationRationale": ""
  },
  "context": {
    "projectFiles": [
      {
        "path": "{{HARNESS_DIR}}/manifest.json",
        "purpose": "Confirm the installed Harness and workspace bindings."
      }
    ],
    "harnessDocs": [
      {
        "path": "{{HARNESS_DIR}}/docs/project-context.md",
        "purpose": "Use verified project facts and commands."
      },
      {
        "path": "{{HARNESS_DIR}}/docs/layers/04-observation.md",
        "purpose": "Record verification evidence in the supported format."
      }
    ],
    "reusedImplementations": [
      "Existing documentation template and focused documentation tests"
    ],
    "knownGaps": [],
    "sufficiency": "sufficient"
  },
  "boundary": {
    "plannedActions": [
      {
        "id": "edit-docs",
        "action": "Edit task-scoped documentation templates and tests.",
        "classification": "autonomous",
        "scope": "Documentation templates and their focused tests."
      }
    ],
    "performedActions": [
      {
        "id": "edit-docs",
        "action": "Edit task-scoped documentation templates and tests.",
        "classification": "autonomous",
        "scope": "Documentation templates and their focused tests."
      }
    ],
    "authorizationReferences": [],
    "scopeChanges": []
  },
  "execution": {
    "playbook": "feature",
    "successCriteria": [
      {
        "id": "docs-match-schema",
        "description": "Generated documentation contains the current structured record schemas."
      },
      {
        "id": "regression-green",
        "description": "Focused documentation checks and the full regression suite pass."
      }
    ],
    "performedSteps": [
      "Inspected the current record contract and tests.",
      "Updated the package-managed templates.",
      "Ran focused and full verification."
    ],
    "skippedSteps": [],
    "decisionImpact": "The record fields and workflow requirements determined the documented JSON shapes.",
    "alignment": "aligned",
    "deviations": []
  },
  "verification": {
    "path": "agent-work/tasks/example-task/verification.md",
    "criteria": [
      {
        "criterionId": "docs-match-schema",
        "evidenceIds": ["focused-docs"]
      },
      {
        "criterionId": "regression-green",
        "evidenceIds": ["full-tests"]
      }
    ],
    "declaredConclusion": "passed"
  },
  "recovery": {
    "applicable": true,
    "failure": "The first focused documentation check failed because an old expectation remained.",
    "rootCause": "The expectation still matched the retired Markdown-only template.",
    "attempts": [
      {
        "action": "Update the stale expectation to the current marker JSON contract and rerun the focused check.",
        "evidenceIds": ["focused-docs"]
      }
    ],
    "recheckEvidenceIds": ["focused-docs"],
    "stopCondition": "Stop after another focused failure and report the unresolved mismatch.",
    "declaredResult": "success"
  },
  "outcome": {
    "criteria": [
      {
        "criterionId": "docs-match-schema",
        "status": "passed",
        "evidenceIds": ["focused-docs"]
      },
      {
        "criterionId": "regression-green",
        "status": "passed",
        "evidenceIds": ["full-tests"]
      }
    ],
    "knownGaps": [],
    "regressionRisks": [],
    "reviewResult": "accepted"
  },
  "evidenceSources": [
    {
      "kind": "self-report"
    }
  ]
}
```
<!-- niuma-audit-record:end -->

## Supported values and consistency rules

- `task.declaredResult`: `complete`, `partial`, `failed`, or `stopped`.
- `rating.classification`: `question`, `small-edit`, `bugfix`, `feature`, `refactor`, `review`, `release`, `security`, `documentation`, or `verification`.
- `rating.tier`: `quick`, `normal`, or `careful`. Release, security, and declared careful risk factors require `careful`.
- `context.sufficiency`: `sufficient`, `partial`, or `insufficient`; limited context requires explicit `knownGaps`.
- Action classifications: `autonomous`, `ask-first`, `forbidden`, or `stop-and-escalate`. Performed ask-first actions need an exact authorization reference. Never report forbidden or stop-and-escalate actions as performed.
- Every action has a stable `id`, `action`, and `scope`; performed actions must exactly match planned actions. Each scope change is `{ "change": string, "substantive": boolean, "rationale": string }`; substantive changes require a distinct reclassification rationale.
- `execution.playbook`: `none`, `bugfix`, `feature`, `refactor`, `review`, or `release`. `alignment` is `aligned` or `deviated`; each deviation has `step`, `reason`, boolean `justified`, and `impact`.
- `verification.declaredConclusion`: `passed`, `partial`, `failed`, `skipped`, or `unknown`. Its criterion IDs must exactly match `execution.successCriteria` and resolve to IDs in the task's `verification.md`.
- If recovery did not apply, use only `{ "applicable": false }`. Otherwise `declaredResult` is `success`, `partial`, `failed`, or `stopped`, and attempts/rechecks reference verification evidence IDs.
- Outcome criterion status is `passed`, `failed`, or `unknown`; `reviewResult` is `accepted`, `changes-requested`, `rejected`, or `failed`. Completion or acceptance cannot coexist with failed/unknown criteria, material gaps, failed recovery, or material unknown evidence.
- `evidenceSources` currently supports `{ "kind": "self-report" }`. A future hook envelope may use `kind`, `provider`, `recordedAt`, `path`, and optional digest/reference fields.

## Authorization example

An ask-first action uses a matching entry in `authorizationReferences`:

```json
{
  "id": "auth-1",
  "actionId": "publish-release",
  "grantedBy": "workspace-owner",
  "grantedAt": "2026-07-12T08:55:00Z",
  "scope": "Release artifact."
}
```

The performed action sets `"authorizationReference": "auth-1"`, and its ID and scope must match the authorization exactly.

## Boundaries

- Record facts, gaps, skipped steps, deviations, and failures truthfully; do not invent compliance.
- Do not store secrets, credentials, private data, or long logs.
- Keep detailed checks in `verification.md`; reference evidence IDs here instead of duplicating output.
- Do not put task feedback in `{{HARNESS_DIR}}/docs/project-context.md`; that file stores verified durable project facts.
- The record supports task handoff and review; keep claims tied to the recorded evidence and any remaining gaps.
