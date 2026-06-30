---
paths:
  - "**/*.java"
  - "**/pom.xml"
---
# Java Testing

This rule is tailored for this repository's Java 17, Spring Boot, Maven, MyBatis-Plus backend modules.

## Test Framework

- Use JUnit 5 for unit and integration tests.
- Use Mockito for isolated service tests.
- Use AssertJ when available for readable assertions.
- Use Spring Boot test support for controller, mapper, and integration tests when isolation is not enough.
- Follow existing module test base classes and the module's local testing documentation before adding a new testing pattern.

## TDD Workflow

For code behavior changes:

1. Add or update a failing test that exposes the required behavior.
2. Implement the smallest change that makes the test pass.
3. Refactor under test protection.
4. Run the smallest relevant Maven verification command.

Documentation-only and read-only QA tasks do not require TDD.

## Test Organization

Mirror the main package structure under `src/test/java`.

Common targets:

```text
src/test/java/<package>/
  service/      # service and business-rule tests
  controller/   # API/web layer tests
  dal/mapper/   # mapper/data-access tests
  util/         # utility tests
  integration/  # cross-layer integration tests
```

## What to Test

- Service business rules and state transitions.
- Validation and boundary cases.
- Permission, tenant, and ownership-sensitive behavior.
- Mapper query predicates, pagination, sorting, and logical deletion behavior.
- Converters and field adaptation between DO, VO, DTO, and external responses.
- Error branches and rollback behavior.
- File parsing, upload, download, and async/batch workflows.
- Redis key generation, expiration, and cache invalidation logic.

## Unit Test Pattern

- Use clear Arrange-Act-Assert structure.
- Test one behavior per test.
- Prefer deterministic inputs and explicit assertions.
- Mock external dependencies at service boundaries.
- Verify important side effects only when they are part of the behavior contract.

```java
@Test
@DisplayName("create rejects duplicate name")
void create_duplicateName_throws() {
    // Arrange
    when(mapper.selectByName("demo")).thenReturn(new DemoDO());

    // Act / Assert
    assertThatThrownBy(() -> service.create(new DemoCreateReqVO().setName("demo")))
        .isInstanceOf(ServiceException.class);
}
```

## Controller Tests

- Cover request validation failures.
- Cover permission and unauthorized cases when the project test setup supports them.
- Assert response status and stable response fields.
- Do not test business logic only through controllers when service tests can cover it more directly.

## Mapper and Integration Tests

- Prefer the project's existing H2, MySQL, Redis, or Spring Boot test base.
- Test mapper predicates that are easy to break: tenant filters, deleted filters, keyword search, date ranges, sorting, and pagination.
- Use Testcontainers only when the module already supports it or when real database behavior cannot be represented by the existing test setup.

## Maven Commands

Run the smallest relevant command from the affected module:

```bash
mvn -pl <module> -Dtest=TestClass test
mvn -pl <module> -Dtest=TestClass#methodName test
mvn -pl <module> -am test
mvn -pl <module> -am compile
```

For multi-module changes, include all affected modules or run from the parent when needed.

## Naming

- Test class: `XxxTest` for unit tests, `XxxIT` or project convention for integration tests.
- Test method: `methodName_scenario_expectedBehavior`.
- Add `@DisplayName` when it improves report readability.

## Coverage

- Focus coverage on service, domain logic, converters, mappers, security-sensitive branches, and utilities.
- Do not chase coverage on trivial Lombok getters, generated code, plain configuration, or constants.
- New high-risk behavior should include tests even if the repository does not yet enforce a global coverage threshold.
