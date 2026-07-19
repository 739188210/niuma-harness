# Practical Test-Driven Development Process

Use this protocol for stable, automatable changed business behavior and bug regressions. It is the mandatory project standard for eligible work; stack-specific rules choose the test tools and browser/manual techniques.

## Goal

Prove one focused behavior slice before and after the smallest task-scoped implementation change.

## Eligibility

Use test-first when changed business behavior or a bug regression can be expressed by a stable automated test in the existing project environment.

Non-test-first work includes documentation, formatting, static configuration, type-only or data declarations, styles, and pure boilerplate. Use task-appropriate verification for that work without creating an artificial RED.

## RED → same-target GREEN → optional REFACTOR

1. Define one focused behavior target before implementation.
2. Add or update the focused test and run it. It must genuinely fail for the intended missing or incorrect behavior.
3. Make the minimal task-scoped implementation change.
4. Re-run that same target and confirm it passes.
5. Refactor only when useful; recheck the relevant target after a refactor.

Do not substitute a different test, broader target, or weakened assertion for the focused RED target when reaching GREEN.

## Valid alternatives

Declare an alternative-verification plan before implementation only when stable automated testing is unavailable or unsuitable because the work concerns rendered visual behavior, a hardware or external-system boundary, or an unavailable/unsuitable stable project test harness. State the reason and the replacement evidence first.

Time pressure, convenience, inability to find a test, and test complexity are not valid alternatives. Web-visible behavior still follows selected web rules for real-browser evidence.

## Test integrity and evidence

Follow the test-change gate in `{{HARNESS_DIR}}/docs/policy/action-boundary.md`. Record focused RED and GREEN results as separate truthful evidence entries under the Observation protocol; record a refactor recheck when applicable.

These records are task evidence, not trusted proof of the agent's chronological execution order.

## Recovery

If the focused target does not express the intended behavior, pause and follow the test-change gate before changing it. If stable automation is unsuitable, declare a valid alternative before implementation; otherwise use `{{HARNESS_DIR}}/docs/layers/05-recovery.md` to investigate the first root cause.
