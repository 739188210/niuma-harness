# Code Generation

从 `{name}-spec/{name}.graphqls` + `{name}-spec/queries/*.graphql` 同时生成：

1. **Java 服务端类型**：由 DGS codegen 插件生成到 `{name}-controller/gen/main/graphql/java/`
2. **Java 客户端类型**：由 DGS codegen 生成到 `{name}-client/gen/main/graphql/java/`
3. **TypeScript 客户端类型 + documents**：由 `@graphql-codegen/cli` 生成到 `{name}-client/gen/main/graphql/nodejs/`

## 关键决策

- **服务端（`{name}-controller`）**：`com.jereh.graphql.codegen` Gradle 插件，`generateClient = false`，生成包 `com.jereh.{name}.graphql.codegen.types`。
- **Java 客户端（`{name}-client`）**：同一个插件，`generateClient = true`，包 `com.jereh.{name}.graphql.client.codegen`。
- **TypeScript 客户端（`{name}-client`）**：`codegen.ts` 用 `@jereh/codegen-config/graphql` 共享配置；`near-operation-file` 预设为每个 `.graphql` 文档生成 typed operation。
- **生成的代码不手改**。schema / 查询文档变了就重跑 codegen。

## 服务端 Gradle 配置

`module/{name}/{name}-controller/build.gradle.kts`

```kotlin
plugins {
    id("com.jereh.spring.library")
    id("com.jereh.graphql.codegen")
    id("com.jereh.openapi.codegen")    // 通常同一个 controller 同时生成 OpenAPI
}

dependencies {
    implementation(project(":module:tenant:tenant-domain"))
    implementation(deps.spring.boot.starter.graphql)
    implementation(deps.spring.boot.starter.web)
}

tasks.generateJava {
    packageName = "com.jereh.tenant.graphql.codegen"
    generateClient = false
    schemaPaths.clear()
    schemaPaths.add("${projectDir}/../tenant-spec")
}

tasks.processResources {
    from("${projectDir}/../tenant-spec") {
        include("*.graphqls")
        into("graphql")
    }
}
```

`processResources` 把 `.graphqls` 复制到 classpath 的 `graphql/` 目录，Spring GraphQL 启动时才能找到 schema。

## Java 客户端 Gradle 配置

`module/{name}/{name}-client/build.gradle.kts`

```kotlin
plugins {
    id("com.jereh.java.library")
    id("com.jereh.graphql.codegen")
    id("com.jereh.openapi.codegen")
}

dependencies {
    implementation(libs.jspecify)
    implementation(deps.netflix.graphql.dgs)
    implementation(deps.netflix.graphql.dgs.client)
}

tasks.generateJava {
    packageName = "com.jereh.tenant.graphql.client.codegen"
    generateClient = true
    schemaPaths.clear()
    schemaPaths.add("${projectDir}/../tenant-spec")
}
```

`generateClient = true` 会额外生成 Java 客户端类型和 projection API（用于跨进程 Java 调用 GraphQL）。

## TypeScript 客户端配置

`module/{name}/{name}-client/codegen.ts`

```typescript
import type { CodegenConfig } from "@graphql-codegen/cli";
import {
  defaultGraphQLCodegenConfig,
  sharedConfig,
  sharedPlugins,
} from "@jereh/codegen-config/graphql";

const config: CodegenConfig = {
  ...defaultGraphQLCodegenConfig,
  schema: "../tenant-spec/tenant.graphqls",
  documents: ["../tenant-spec/queries/*.graphql"],
  generates: {
    "./gen/main/graphql/nodejs/types/graphql.ts": {
      plugins: sharedPlugins.typescript,
    },
    "./gen/main/graphql/nodejs/": {
      preset: "near-operation-file",
      presetConfig: {
        baseTypesPath: "./types/graphql.ts",
        extension: ".ts",
        folder: "../../tenant-client/gen/main/graphql/nodejs/queries",
      },
      plugins: sharedPlugins.operations,
      config: sharedConfig,
    },
  },
};

export default config;
```

`package.json` exports：

```json
{
  "name": "@jereh/tenant-client",
  "exports": {
    "./graphql/types/*": {
      "types": "./gen/main/graphql/nodejs/types/*.ts",
      "import": "./gen/main/graphql/nodejs/types/*.ts"
    },
    "./graphql/queries/*": {
      "types": "./gen/main/graphql/nodejs/queries/*.ts",
      "import": "./gen/main/graphql/nodejs/queries/*.ts"
    }
  },
  "scripts": {
    "codegen:graphql": "graphql-codegen --config codegen.ts"
  }
}
```

## 生成产物

```
{name}-controller/gen/main/graphql/java/com/jereh/{name}/graphql/codegen/types/
├── Tenant.java
├── TenantDetail.java
├── TenantPage.java
├── Contact.java
├── CreateTenantInput.java
└── TenantStatus.java

{name}-client/gen/main/graphql/
├── java/com/jereh/{name}/graphql/client/codegen/
│   └── types / projections
└── nodejs/
    ├── types/graphql.ts            # 基础类型
    └── queries/tenant-page.ts      # 每个 .graphql 文档对应一份
        └── TenantPageDocument
```

## 运行生成

```bash
# Java 端
./gradlew :module:tenant:tenant-controller:generateJava
./gradlew :module:tenant:tenant-client:generateJava

# TypeScript 端
pnpm --filter @jereh/tenant-client codegen:graphql
```

## 是否提交 gen/

推荐提交 `gen/main/graphql/nodejs/` 和 `gen/main/graphql/java/`（如果有稳定的 CI 生成校验，也可在 `.gitignore` 排除后由 CI 生成）。Jereh 当前实践是提交生成产物，保证 `pnpm install` 后代码即可消费。

## 常见错误

- 把 `.graphqls` 放在 spec 目录但 `processResources` 没复制：Spring GraphQL 启动找不到 schema。
- `generateClient = true` 放在 controller 端：产出不必要。
- TypeScript codegen 的 `documents` 指向 web 目录而非 spec：跨客户端无法共享查询文档。
- 手改 `gen/` 里的类型：下次 codegen 覆盖。
- 服务端和客户端 generator 版本不一致：字段命名 / 投影 API 漂移。

## Acceptance 检查

- [ ] controller 端 `generateClient = false`。
- [ ] client 端 `generateClient = true`。
- [ ] 服务端 `processResources` 把 `.graphqls` 复制到 `graphql/`。
- [ ] TS codegen 的 `documents` 指向 `{name}-spec/queries/*.graphql`。
- [ ] TypeScript 类型 + document 均生成成功。
- [ ] Java 客户端编译通过。
- [ ] `gen/` 未被手改。
