# Web Testing Rules

## Purpose

These rules define web-specific minimum verification expectations. They supplement common testing rules and do not replace Observation evidence.

## Minimum evidence by change type

Use the strongest relevant row. If multiple rows apply, collect evidence that covers each changed risk and report required evidence that could not be collected.

| Change type | Minimum evidence |
|---|---|
| Pure utility, data transform, hook, composable, or non-visual logic | Focused automated test, or explain why no test is practical. |
| Copy-only or static content change | Verify the affected route/page renders the changed content. |
| Styling, layout, responsive, or visual component change | Verify the affected route/page in a real browser at one narrow viewport and one desktop viewport. |
| User interaction change | Verify the primary interaction in a real browser, including keyboard access when applicable. |
| Route, data loading, auth, permission, or API-connected UI change | Verify the route/page loads and the relevant network/API state is correct. |
| Visual-heavy change | Capture screenshot or visual evidence for the affected state or breakpoint. |
| Performance-sensitive change | Run a production build or targeted performance check for the changed risk. |

## Browser baseline

When browser verification is required, confirm the page loads, the changed UI is visible, the primary behavior works, no relevant console error appears, and no obvious unintended horizontal overflow appears.

Use existing project browser tooling. Do not add a new E2E framework for a small task without approval.
