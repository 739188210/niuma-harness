# Java Testing Rules

## Purpose

These rules define Java backend-oriented verification preferences. They supplement Observation evidence and focus on compile safety, runtime behavior, framework integration, persistence, and boundary risks.

## Project fit

Use the project's existing test framework, build tool, test naming, fixtures, base classes, and module conventions.

Do not introduce JUnit, TestNG, Spock, Mockito, AssertJ, Spring test support, Testcontainers, Maven, Gradle, or a new coverage tool unless the project already uses it or the task clearly needs it.

## Minimum evidence by change type

| Change type | Minimum evidence |
|---|---|
| Type, signature, DTO/model, annotation, or public API change | Compile affected modules and callers when practical. |
| Service, domain, utility, converter, validation, or business-rule change | Add or update a focused unit/component test for caller-visible behavior. |
| Controller/API/resource change | Verify validation, auth/permission behavior when relevant, response status, and stable response fields. |
| Persistence query, mapper, repository, migration, or transaction change | Run a focused persistence/integration test for changed predicates, mapping, transaction, or rollback behavior. |
| Cache, async job, message handler, scheduled task, retry, callback, or batch change | Verify success, failure, retry/idempotency, and partial-success behavior where relevant. |
| File upload/download/import/export/parsing change | Verify valid input, invalid input, size/type/path constraints, and failure reporting where relevant. |
| Build config, dependency, plugin, annotation processor, Java version, or module graph change | Run the relevant Maven/Gradle compile, test, or build command for affected modules. |
| Test-only change | Run the changed test or the smallest relevant test group. |

## Test shape

Prefer tests that prove observable behavior or contract compatibility.

Use clear arrange-act-assert structure or the project's equivalent style.

Keep fixtures small and explicit.

Mock external systems at stable boundaries for unit tests. Use integration tests when framework behavior, persistence behavior, serialization, transactions, or real client configuration is the risk.

Include negative tests for validation, permissions, ownership, data boundaries, state transitions, uniqueness, pagination, sorting, null handling, and error mapping when those risks changed.

## Build commands

Use the smallest project-supported command that proves the changed risk.

For Maven projects, prefer affected-module commands when possible:

```bash
mvn -pl <module> -Dtest=TestClass test
mvn -pl <module> -am test
mvn -pl <module> -am compile
```

For Gradle projects, prefer affected-module or task-scoped commands when possible:

```bash
./gradlew :module:test --tests TestClass
./gradlew :module:compileJava
./gradlew test
```

Use the project's documented commands when they differ from these examples.

## Coverage focus

Focus coverage on business behavior, validation, converters, persistence predicates, permission-sensitive branches, transaction behavior, async workflows, file handling, and utilities.

Do not chase coverage for trivial getters/setters, generated methods, plain constants, generated code, or framework boilerplate unless they carry project-specific behavior.
