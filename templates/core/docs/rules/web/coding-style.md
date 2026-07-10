# Web Coding Style Rules

## Purpose

These rules define web-specific coding preferences. They supplement common coding style rules and stay framework-agnostic unless project rules say otherwise.

## Semantic HTML

Prefer native semantic elements and controls before generic wrappers or ARIA replacements.

Use `button` for actions, `a` for navigation, and labeled form controls for input.

Use ARIA to clarify semantics, not to replace native HTML semantics.

## Organization

Follow the existing project layout. When adding new frontend structure, organize by feature, route, or surface area before file type.

Small cohesive feature folders are preferred when a surface has component logic, styling, tests, and supporting utilities:

```text
src/features/search/
  SearchPage.tsx
  SearchFilters.tsx
  search-state.ts
  search.css
```

Treat this as an example of grouping by surface, not as a required directory shape.

## Styling

Use the project's existing styling system and design tokens for color, spacing, typography, radius, shadows, and motion.

Examples include CSS custom properties such as `--space-section`, theme tokens such as `color.surface`, or design-system constants such as `spacing.section`.

Do not introduce a new styling system as a drive-by change. If the task requires one, call out the tradeoff and follow Policy before adding it.

## Responsive UI

Account for narrow and wide viewports.

Avoid fixed widths or layout choices that create unintended overflow.

Prefer fluid layout primitives such as flexible grids, wrapping rows, `minmax`, `clamp`, or existing responsive utilities.

## Interaction states

Interactive elements need visible `hover`, `focus-visible`, `active`, `disabled`, loading, and error states when those states apply.

Do not remove focus outlines unless replacing them with an accessible focus style.

## Motion

Prefer `transform` and `opacity` for animation.

Avoid animating layout-heavy properties such as `width`, `height`, `top`, `left`, `margin`, `padding`, or `font-size` unless the tradeoff is intentional.

Respect reduced-motion preferences for meaningful motion.

## Boundaries

Keep presentational components focused on rendering.

Keep data loading, routing, permissions, and side effects in the project's existing container, page, hook, or composable pattern.
