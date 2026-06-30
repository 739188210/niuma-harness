---
paths:
  - "**/*.java"
  - "**/pom.xml"
---
# Java Hooks

This file lists optional local automation for Java edits. Use project-owned tools and module-local Maven commands.

## After Editing Java Files

Recommended order:

1. Format with the module's configured formatter, if one exists.
2. Run the smallest relevant test.
3. Run module compile when the change affects shared types or Spring wiring.

Examples:

```bash
mvn -pl <module> -Dtest=TestClass test
mvn -pl <module> -am compile
```

## Notes

- Do not introduce `google-java-format`, Checkstyle, Spotless, or other hooks unless the module already uses them or the team approves the tool.
- Avoid running full Maven builds after every tiny edit in large multi-module projects.
- Prefer module-scoped commands over repository-wide commands during inner-loop development.
