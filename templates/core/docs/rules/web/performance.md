# Web Performance Rules

## Purpose

These rules define web-specific performance hygiene. They do not replace project budgets or Observation evidence.

## Bundle and loading

Check existing dependencies and patterns before adding client-side packages.

A new dependency is reasonable when it materially reduces complexity, improves correctness, or matches an existing project direction.

For small interactions, prefer platform APIs or existing utilities when they are clear and maintainable. If a dependency is still better, state the reason.

Lazy-load heavy or rarely used functionality when it is not needed for the initial view.

## Images and media

Use explicit dimensions or layout constraints to avoid layout shift.

Prefer optimized formats and responsive sources when the project supports them.

Use eager or high-priority loading only for critical above-the-fold media. Lazy-load below-the-fold media when practical.

Avoid shipping source assets far larger than their rendered size unless the project has a clear reason.

## Fonts

Avoid adding new font families or many weights without a product or design reason.

Use the project's existing font loading pattern. Preload fonts only when they matter to the initial view and match that strategy.

## Rendering and motion

Avoid avoidable layout shift, expensive render loops, unnecessary re-renders, and parent-child request waterfalls.

Prefer compositor-friendly animation properties such as `transform` and `opacity`.

Avoid scroll handler churn. Prefer CSS, IntersectionObserver, requestAnimationFrame, or existing project utilities.

Respect reduced-motion preferences for meaningful motion.

## Third-party scripts

Treat third-party scripts as performance-sensitive.

Load them only when needed, prefer async/defer where appropriate, and consider load cost plus privacy/security impact before adding them.
