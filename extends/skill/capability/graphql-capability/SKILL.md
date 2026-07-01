---
name: graphql-capability
description: "Jereh GraphQL Spec-First workflow: write {name}.graphqls + queries, generate Java + TypeScript clients via DGS codegen, implement Spring GraphQL DataFetcher, consume from Vue. Triggers: GraphQL schema, DataFetcher, GraphQL query, 联查, GraphQL客户端."
metadata:
  author: jereh
  version: "2.0.0"
---

# graphql-capability

GraphQL 在 Jereh 模块中专门承担**读端**：列表查询、分页过滤、跨表 join、按需字段裁剪。写操作由 OpenAPI 能力承担。一份 `{name}.graphqls` schema + 一组 `*.graphql` 查询文档驱动 Java 服务端 + Java 客户端 + TypeScript 客户端三套代码生成。

## When to use

- 需要按需选择返回字段（避免 over-fetching）
- 多表 join、分页过滤、聚合统计
- 触发词：GraphQL schema, DataFetcher, GraphQL query, 联查, GraphQL客户端

## 模块布局

```
module/{name}/
├── {name}-spec/
│   ├── {name}.graphqls               # GraphQL schema 唯一来源
│   └── queries/                      # 操作文档（query / mutation），客户端代码生成的输入
│       ├── {name}-by-id.graphql
│       ├── {name}-page.graphql
│       └── ...
│
├── {name}-controller/
│   ├── build.gradle.kts              # 应用 com.jereh.graphql.codegen 生成服务端 types
│   ├── gen/main/graphql/java/
│   │   └── com/jereh/{name}/graphql/codegen/
│   │       └── types/                # 生成的 Tenant / TenantPage / *Input / Enum 等
│   └── src/main/java/com/jereh/{name}/graphql/
│       └── {Module}GraphQlController.java
│
└── {name}-client/
    ├── codegen.ts                    # @graphql-codegen 配置
    ├── package.json                  # exports 指向 gen/main/graphql/nodejs/*.ts
    ├── gen/main/graphql/
    │   ├── java/                     # DGS Java client（用于跨进程 Java 调用）
    │   └── nodejs/
    │       ├── types/graphql.ts      # 共享类型
    │       └── queries/*.ts          # 每个 *.graphql 文档对应一份 typed 操作
```

## Guides

| Guide | 主题 |
| --- | --- |
| [guides/schema-design.md](guides/schema-design.md) | `{name}.graphqls` 怎么写：类型拆分、input、Page、enum |
| [guides/codegen.md](guides/codegen.md) | `com.jereh.graphql.codegen`（Java） + `@jereh/codegen-config/graphql`（TS）|
| [guides/controller.md](guides/controller.md) | `@QueryMapping` / `@SchemaMapping` / `@BatchMapping`，只调 `{name}-api` UseCase |
| [guides/client-usage.md](guides/client-usage.md) | Vue 3 + composable 消费生成的 typed documents（不用 Apollo Client）|

## Core rules

- **`{name}.graphqls` 是唯一 schema 来源**。手写；服务端 types、Java 客户端、TS 客户端全部由它生成。
- **查询文档 `*.graphql` 放 `{name}-spec/queries/`**。TS 客户端的 `near-operation-file` 预设会基于这些文档生成 typed 操作。
- **schema 命名**：类型 PascalCase（`Tenant`, `TenantDetail`），字段 camelCase，枚举 UPPER_SNAKE。
- **`input` 包多条件过滤**：避免长参数列表。
- **每个分页查询返回 `{Type}Page`**（字段 `content / totalElements / totalPages / page / size`），与 OpenAPI 的 `{Type}Page` 命名保持一致。
- **`!` 仅用于一定非空字段**；运行期可能为空就保持 nullable，组件层显式处理。
- **DataFetcher 在 `{name}-controller/src/main/java/com/jereh/{name}/graphql/`**，命名 `{Module}GraphQlController`。
- **只调 `{name}-api` UseCase**；不直接持有 service / repository。
- **跨实体字段用 `@BatchMapping`** 解决 N+1；廉价字段用 `@SchemaMapping`。
- **TS 客户端不用 Apollo Client**。生成的 `*.ts` 包含 typed document 和类型；运行时用 `graphql-request` 或一个薄 fetch 封装，由 composable 调用。

## Exit criteria

- `{name}.graphqls` 校验通过，所有公开类型 + 字段都有文档（`"""`）。
- `./gradlew :module:{name}:{name}-controller:generateJava` 成功，生成 `com.jereh.{name}.graphql.codegen.types.*`。
- `pnpm --filter @jereh/{name}-client codegen:graphql` 成功，生成 typed documents。
- `{Module}GraphQlController` 只依赖 `{name}-api` UseCase；批量字段用 `@BatchMapping`。
- Vue composable 用生成的 typed document 调用，无 Apollo，无 raw query 字符串。
- `gen/` 目录无手改。
