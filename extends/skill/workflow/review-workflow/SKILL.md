---
name: review-workflow
description: "Code review for Jereh PRs. Triggers: code review, review code, PR review, 代码审查, 代码评审, review."
metadata:
  author: jereh
  version: "2.0.0"
  argument-hint: <file-or-pattern-or-diff>
---

# review-workflow

Code review focused on **Jereh-specific** correctness, conventions, and risk. Use this skill at PR time (called from `git-workflow phases/pr.md`) or any time the user asks for a review of changed files, a diff, or a PR.

## Argument

Accepts a file path, glob, diff, or PR URL/description. If none is given, ask once.

## Workflow

1. Identify scope — files and changed lines.
2. Walk the **Jereh checklist** below against every changed file.
3. Walk the **generic checklist** against every changed file (deep dive only if the Jereh checks pass).
4. Emit findings in the format below. If none: state `No issues found.` exactly.

## Finding Format

One issue per line:

```text
file:line: [LEVEL] message
```

Levels (pick exactly one):

- **CRITICAL** — blocks merge. Security breach, secret leaked, production outage risk, severe correctness bug.
- **HIGH** — should block merge. Significant defect, likely failure, breaks a Jereh convention.
- **MEDIUM** — fix before merge if feasible. Noticeable risk or moderate maintainability issue.
- **LOW** — optional improvement, style nit.

Example:

```text
module/user/user-controller/src/main/java/com/jereh/user/rest/UserController.java:42: [HIGH] business logic in controller; move to user-domain service
module/auth/auth-domain/src/main/java/com/jereh/auth/service/TokenService.java:88: [CRITICAL] SQL built by string concatenation; use MyBatis Dynamic SQL or CrudRepository
server/user-center/user-center-server/build.gradle.kts:14: [HIGH] direct dependency on user-api; remove — comes in transitively through user-controller
module/user/user-ui/src/composables/useUser.ts:9: [MEDIUM] hardcoded API URL; use generated client from @jereh/user-client
```

## Jereh Checklist

Walk in order. Each item maps to a rule in `module/CONVENTIONS.md` or `server/CONVENTIONS.md`.

### Module boundaries (backend)

- [ ] `{name}-api` has no dependency on persistence or controller.
- [ ] `{name}-domain` does not import sibling `{name}-controller` / `{name}-client` / `{name}-ui`.
- [ ] `{name}-controller` calls only `{name}-api` UseCase interfaces, not concrete domain services.
- [ ] Cross-domain calls go through the other domain's published `{name}-api` only. Flag any `import com.jereh.{other}.domain...`.
- [ ] No business logic in `{name}-controller` (controller methods just adapt input/output).
- [ ] MapStruct is used for entity ↔ DTO conversion; flag hand-written getter/setter mappers.
- [ ] Single-table CRUD uses Spring Data JDBC `CrudRepository`; flag SQL string concatenation. Complex queries go through MyBatis Dynamic SQL inside the service.
- [ ] `@Cacheable` / `@CacheEvict` declared on domain service methods only, not controllers.

### Server assembly

- [ ] Application class is plain `@SpringBootApplication` — no `@ComponentScan`, `scanBasePackages`, `scanBasePackageClasses`, or `@Import` of module config classes.
- [ ] `application.yml` does not use `spring.autoconfigure.exclude` or conditional switches gating module beans.
- [ ] Server `build.gradle.kts` does not declare a direct dependency on `{name}-api`, `{name}-client`, or `{name}-ui`.
- [ ] Each module's DataSource is configured separately in `application.yml`.

### Frontend

- [ ] `{name}-ui` depends only on `{name}-client`, never on `{name}-domain` or `{name}-controller`.
- [ ] No hand-written `fetch` / `axios` calls; use generated client from `@jereh/{name}-client`.
- [ ] No hardcoded API URLs; base path from env or gateway.
- [ ] Reusable components live in `{name}-ui`; only page-level views in `{name}-center-web/src/views/`.

### Spec & codegen

- [ ] No hand-edits inside `gen/` directories.
- [ ] Every UseCase method exposed externally maps to an OpenAPI or GraphQL operation.
- [ ] OpenAPI used for writes and single-table CRUD; GraphQL used for reads and joins.
- [ ] Flyway migrations are forward-only, single-purpose, named `V{n}__{verb}_{noun}.sql`.

### Tracking & docs

- [ ] If the change adds a feature, `PRD.md` Execution Tracking row is updated for the relevant phase.
- [ ] Implementation decisions diverging from `DESIGN.md` are recorded in `TEST.md` Notes or inline comments referencing the phase.
- [ ] Module `README.md` (if it exists) reflects the change.

## Generic Checklist

Use only after the Jereh checks pass; do not re-derive what a linter / type checker / build already enforces.

### Security

- [ ] No hardcoded secrets, tokens, keys, or internal URLs.
- [ ] All untrusted input validated before use; injection risks (SQL, command, path, SSRF) prevented.
- [ ] Output encoding correct for HTML / JSON / logs; error messages don't leak internals.
- [ ] Crypto uses modern algorithms; randomness from secure APIs.
- [ ] New dependencies pinned and from trusted sources.

### Correctness & maintainability

- [ ] Logic matches the documented intent (PRD / DESIGN).
- [ ] Edge cases and error paths handled.
- [ ] Null / empty / boundary inputs handled.
- [ ] Naming clear; functions / classes single-purpose.
- [ ] Comments explain *why*, not *what*.

### Performance

- [ ] Algorithmic complexity reasonable for expected load.
- [ ] DB queries are bounded and use indexes; no N+1 from JOIN-fetching loops.
- [ ] Network calls batched / async / cached where applicable.
- [ ] Resources (file handles, connections, streams) closed.

### Tests

- [ ] New logic has a test at the right layer (see `dev-workflow phase 4` Test Layers table).
- [ ] Happy path + at least one failure path covered.
- [ ] Existing tests still pass; no skipped tests added.

## Output

After the walk, emit:

1. A `## Findings` section listing every issue using the finding format (one per line). If none: `No issues found.`
2. A `## Severity Summary` table:

```markdown
| Level    | Count |
| -------- | ----- |
| CRITICAL | 0     |
| HIGH     | 0     |
| MEDIUM   | 0     |
| LOW      | 0     |
```

3. A `## Recommendation` line: one of `Block` / `Approve with conditions` / `Approve`.
   - Any CRITICAL → `Block`.
   - Any HIGH → `Approve with conditions` (or `Block` if multiple unrelated HIGHs).
   - Only MEDIUM / LOW → `Approve` with comments.

## Exit Criteria

- Every changed file walked.
- Findings list emitted in the exact format.
- Severity summary and recommendation present.
- No invented findings — each finding cites a specific file:line.
