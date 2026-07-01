---
name: openapi-capability
description: "Jereh OpenAPI Spec-First 流程：编写 {name}-spec，生成 {name}-controller 接口与 {name}-client SDK，在 Vue {name}-ui 中消费。触发词：OpenAPI spec, codegen, swagger, 接口规范, 生成客户端, OpenAPI."
metadata:
  author: jereh
  version: "2.0.0"
---

# openapi-capability

介绍 Jereh 模块里如何使用 OpenAPI：以 `{name}-spec/{name}.yaml` 为唯一 API 来源，生成 `{name}-controller` 的 Spring 接口与 `{name}-client` 的 Java + TypeScript 客户端，Vue `{name}-ui` 消费生成的 TS 客户端。OpenAPI 覆盖**写操作 + 单表 CRUD**；复杂读 / 联表查询由 GraphQL 能力承担。

## 何时使用

- 在 `{name}-spec/` 编写 OpenAPI yaml
- 让 `{name}-controller` 生成 Spring 接口、让 `{name}-client` 生成 Java + TypeScript 客户端
- 在 `{name}-ui` 用生成的 TS 客户端调后端
- 触发词：OpenAPI spec, codegen, swagger, 接口规范, 生成客户端

## 模块布局

```
module/{name}/
├── {name}-spec/
│   └── {name}.yaml                    # OpenAPI 3.1 唯一来源
│
├── {name}-api/src/main/java/com/jereh/{name}/api/
│   ├── dto/                           # 手写 UseCase DTO / Command
│   └── service/                       # UseCase 接口（controller 调用、domain 实现）
│
├── {name}-controller/
│   ├── build.gradle.kts               # 应用 com.jereh.openapi.codegen
│   ├── gen/main/openapi/java/com/jereh/{name}/rest/
│   │   ├── api/                       # 生成的 DefaultApi / *Api 接口
│   │   └── model/                     # 生成的请求/响应模型
│   └── src/main/java/com/jereh/{name}/rest/
│       └── {Module}Controller.java    # implements DefaultApi，调用 {name}-api UseCase
│
└── {name}-client/
    ├── build.gradle.kts               # 应用 com.jereh.openapi.codegen
    ├── openapitools.json              # ts-axios 客户端配置
    ├── package.json                   # @jereh/{name}-client workspace 包
    └── gen/main/openapi/
        ├── java/com/jereh/{name}/client/
        │   ├── api/                   # 生成的 Java DefaultApi
        │   └── model/
        └── nodejs/                    # 生成的 ts-axios 源码（被 {name}-ui 直接 import）
```

## 指南目录

| 指南 | 主题 |
| --- | --- |
| [guides/spec-writing.md](guides/spec-writing.md) | `{name}-spec/{name}.yaml` 怎么写：OpenAPI 3.1、operationId、Request/Response/Command 命名 |
| [guides/controller-generation.md](guides/controller-generation.md) | `{name}-controller` 的 codegen 配置；`implements DefaultApi` 实现 |
| [guides/client-generation.md](guides/client-generation.md) | `{name}-client` 同时生成 Java native + TypeScript axios；workspace exports 配置 |
| [guides/web-integration.md](guides/web-integration.md) | 在 `{name}-ui` Vue composable 中消费生成客户端；base URL 走 env |

## 核心规则

- **`{name}-spec/{name}.yaml` 是唯一来源**。手写 yaml；客户端 / 服务端代码一律生成，不手改 `gen/`。
- **OpenAPI 用 3.1.0**。
- **operationId 必须有且唯一**，camelCase 动名词（`createTenant` / `listTenants` / `getTenant`）。
- **`{name}-controller` 用 `interfaceOnly=true` + `useTags=true`**，生成 `DefaultApi` 或 `{Tag}Api` 接口，开发者 `implements` 它。
- **Controller 只调 `{name}-api` 的 UseCase 接口**，不直接持有 service / repository。`{name}-api` 暴露 Command 和 DTO，与 OpenAPI Request/Response 隔离。
- **`{name}-client` 同包既出 Java 又出 TypeScript**：Java 用 `library=native`；TS 用 `typescript-axios`。
- **TypeScript 客户端走 monorepo workspace**，`package.json` `exports` 指向 `gen/main/openapi/nodejs/*.ts`，**不预编译 dist/**。
- **`gen/` 目录不入版本控制**（或仅入 `.openapi-generator-ignore`），由 CI 重新生成校验 drift。

## 退出条件

- `{name}-spec/{name}.yaml` 通过 OpenAPI 3.1 schema 校验。
- `./gradlew :module:{name}:{name}-controller:openApiGenerate` 成功，生成 `DefaultApi`。
- `./gradlew :module:{name}:{name}-client:openApiGenerate` 成功，Java 客户端编译通过。
- `pnpm --filter @jereh/{name}-client type-check` 通过。
- `{Module}Controller implements DefaultApi`，方法体调用 `{name}-api` UseCase。
- `{name}-ui` composable 通过 `@jereh/{name}-client` 调用，base URL 走 env。
- 无 `gen/` 手改记录、无凭据或 hardcode URL。
