> This file defines Vue-focused web patterns for frontend projects.

# Vue Web Patterns

## Component Composition

### Slot-Based Components

Use slots when behavior is shared but markup must vary. Keep the public API small and explicit:

```vue
<DataPanel :loading="loading" :empty="items.length === 0">
  <template #toolbar>
    <SearchForm v-model="query" />
  </template>

  <AssetList :items="items" />
</DataPanel>
```

- Parent components own orchestration state.
- Child components receive props and emit events.
- Use named slots for optional regions such as toolbar, footer, empty state, and actions.
- Avoid passing large untyped slot payloads that hide component contracts.

### Provide / Inject

Use `provide` / `inject` only for tightly related component families or cross-cutting UI context:

- Tabs, menus, forms, upload queues, and similar compound widgets are valid use cases.
- Keep keyboard handling, ARIA, and focus logic in the parent or headless layer.
- Do not use `provide` / `inject` as an informal global store.
- Prefer typed injection keys instead of string keys.

### Container / Presentational Split

- Container components own data loading and side effects
- Presentational components receive props and render UI
- Presentational components should stay pure and avoid direct API calls
- Page-level components may coordinate route params, stores, API calls, and layout

## State Management

Treat these separately:

| Concern | Tooling |
|---------|---------|
| Server state | API composables, request hooks, or project-owned cache layer |
| Client state | Pinia, local `ref` / `reactive`, component props and emits |
| URL state | Vue Router query params, params, and route meta |
| Form state | Element Plus Form, project form components, or local reactive state |

- Do not duplicate server state into Pinia unless there is a clear caching or cross-page reason.
- Keep page-only state local to the page or composable.
- Use `computed` for derived values instead of storing redundant reactive state.
- Keep Pinia stores focused on app-level state such as user, permissions, menu, layout, locale, and shared preferences.
- Avoid watchers that mirror one reactive value into another without a clear side effect.

## URL As State

Persist shareable state in the URL:

- filters
- sort order
- pagination
- active tab
- search query

Use Vue Router `query` for list-page state that should survive refresh, sharing, and browser navigation. Keep transient UI state such as dialog visibility or hover state local.

## Data Fetching

### Request Boundaries

- Put API URL, method, params/data mapping, and response typing in `src/api/**`.
- Keep backend field adaptation in API adapters or composables, not scattered across Vue templates.
- Page components should call a small number of domain-specific functions instead of assembling raw Axios requests.

### Loading and Error States

- Every request-backed surface needs loading, empty, error, and success states.
- Avoid silent failures; show visible user feedback for failed actions.
- Prevent duplicate submissions for state-changing actions.
- Reset stale error state before retrying a request.

### Optimistic Updates

- Snapshot current state
- Apply optimistic update
- Roll back on failure
- Emit visible error feedback when rolling back
- Use optimistic updates only when failure recovery is clear to the user

### Parallel Loading

- Fetch independent data in parallel
- Avoid parent-child request waterfalls
- Prefetch likely next routes or states when justified

## Vue Reactivity Rules

- Use `ref` for primitive values and replaceable objects.
- Use `reactive` for cohesive object state that is mutated as a group.
- Use `computed` for derived state.
- Use `watch` for side effects only; prefer `computed` when producing values.
- Clean up timers, subscriptions, observers, and event listeners in `onUnmounted`.
- Avoid deep watchers on large objects unless the cost is understood.

## Forms

- Keep form models typed and initialized with explicit defaults.
- Keep validation rules close to the form or in a domain-specific composable.
- Validate on submit and on key fields where immediate feedback matters.
- Normalize payloads before calling API methods.
- Do not rely on disabled UI alone for permission or validation enforcement.

## Lists and Tables

- List pages should support deterministic pagination, sorting, and filtering.
- Use stable row keys; avoid array index keys for mutable lists.
- Preserve filters, page number, and sort in URL query when the state is user-shareable.
- Handle empty results separately from request failures.
- Confirm destructive actions and refresh or patch list state after success.
