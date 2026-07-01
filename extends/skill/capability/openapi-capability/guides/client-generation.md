# Client Generation

`{name}-client` 从 `{name}-spec/{name}.yaml` 生成 **Java native** 和 **TypeScript axios** 两套 HTTP 客户端，作为 monorepo 内的 workspace 包，分别被其他后端模块、`{name}-ui` 直接消费。

## 关键决策

- **Java 客户端**：`generatorName = "java"`，`library = "native"`（JDK11+ HttpClient），生成在 `gen/main/openapi/java/com/jereh/{name}/client/`。
- **TypeScript 客户端**：`typescript-axios` 通过 `openapitools.json` 配置；生成到 `gen/main/openapi/nodejs/`，`package.json` `exports` 直接指向源码 `.ts`。
- **包名 / 版本与 spec 对齐**：`@jereh/{name}-client`，`info.version` 变化时同步 bump。
- **不预编译 `dist/`**：消费侧用 Vite / `tsc` 直接 import `.ts` 源码。`build` 脚本只用于 CI 类型检查。
- **`.openapi-generator-ignore` 入版本控制**：避免 OpenAPI Generator 创建多余的 README / package.json / docs。
- **`openApiNullable = false` + 关闭 Javadoc**：减少噪声，加速 build。

## Gradle 配置（Java 客户端）

`module/{name}/{name}-client/build.gradle.kts`

```kotlin
plugins {
    id("com.jereh.java.library")
    id("com.jereh.openapi.codegen")
}

dependencies {
    implementation(libs.jspecify)
    implementation(libs.jakarta.annotation.api)
    implementation(platform(deps.jackson.bom))
    implementation(deps.jackson.databind)
    implementation(deps.jackson.core)
}

openApiGenerate {
    generatorName.set("java")
    inputSpec.set("$projectDir/../tenant-spec/tenant.yaml")
    apiPackage.set("com.jereh.tenant.client.api")
    modelPackage.set("com.jereh.tenant.client.model")
    configOptions.putAll(mapOf(
        "library"          to "native",
        "openApiNullable"  to "false",
        "sourceFolder"     to ".",
    ))
    generateApiTests.set(false)
    generateModelTests.set(false)
}

tasks.withType<Javadoc> { enabled = false }
```

## TypeScript 客户端配置

`module/{name}/{name}-client/openapitools.json`

```json
{
  "$schema": "https://openapitools.org/openapi-generator-cli/config.schema.json",
  "spaces": 2,
  "generator-cli": {
    "version": "7.22.0",
    "generators": {
      "typescript-axios": {
        "generatorName": "typescript-axios",
        "inputSpec": "../tenant-spec/tenant.yaml",
        "output": "gen/main/openapi/nodejs",
        "additionalProperties": {
          "supportsES6": true,
          "npmName": "@jereh/tenant-client",
          "withInterfaces": false,
          "withSeparateModelsAndApi": false
        }
      }
    }
  }
}
```

## Workspace package.json

`module/{name}/{name}-client/package.json`

```json
{
  "name": "@jereh/tenant-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./gen/main/openapi/nodejs/index.ts",
  "types": "./gen/main/openapi/nodejs/index.ts",
  "exports": {
    ".": {
      "types": "./gen/main/openapi/nodejs/index.ts",
      "import": "./gen/main/openapi/nodejs/index.ts"
    },
    "./openapi": {
      "types": "./gen/main/openapi/nodejs/index.ts",
      "import": "./gen/main/openapi/nodejs/index.ts"
    },
    "./openapi/*": {
      "types": "./gen/main/openapi/nodejs/*.ts",
      "import": "./gen/main/openapi/nodejs/*.ts"
    }
  },
  "scripts": {
    "codegen:openapi": "openapi-generator-cli generate",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@openapitools/openapi-generator-cli": "^2.13.0",
    "typescript": "^5.6.0"
  },
  "peerDependencies": {
    "axios": "^1.7.0"
  }
}
```

`{name}-ui` 在 `dependencies` 添加 `"@jereh/{name}-client": "workspace:*"`，Vite 直接编译生成的 `.ts`，**不需要 build**。

## 生成产物

```
{name}-client/gen/main/openapi/
├── java/
│   └── com/jereh/{name}/client/
│       ├── api/             # DefaultApi.java（与 controller 同名同方法）
│       ├── model/
│       ├── ApiClient.java
│       └── ...
└── nodejs/
    ├── api.ts               # DefaultApi / 接口方法
    ├── configuration.ts
    ├── base.ts
    ├── common.ts
    ├── index.ts
    └── .openapi-generator-ignore
```

## `.openapi-generator-ignore`

`gen/main/openapi/nodejs/.openapi-generator-ignore`

```
README.md
git_push.sh
.gitignore
.npmignore
package.json
tsconfig.json
tsconfig.esm.json
docs/
```

Java 客户端 `gen/main/openapi/java/.openapi-generator-ignore`：

```
README.md
build.gradle
pom.xml
gradlew
gradlew.bat
gradle/
git_push.sh
.travis.yml
docs/
```

让 generator 只产 API + Model 源码，不产框架文件。

## 何时生成

- **本地开发**：spec 改了之后跑 `./gradlew :module:{name}:{name}-client:openApiGenerate` + `pnpm --filter @jereh/{name}-client codegen:openapi`。
- **CI**：每次 build 都重新生成并 diff（或直接覆盖现有 `gen/`），保证 spec 与产物一致。
- **是否提交 `gen/`**：建议提交。原因：CI 稳定、IDE 即时补全、`pnpm install` 后即可消费，无需先跑生成命令。代价：spec 变更需附带 `gen/` 改动。

## 客户端用法（Java 侧）

如果需要在某个后端模块（比如另一个 server）调用 `{name}` 的 HTTP：

```java
ApiClient client = new ApiClient();
client.setHost("tenant-center.internal");
client.setPort(8080);

DefaultApi api = new DefaultApi(client);
TenantResponse tenant = api.getTenant("t-1");
```

Java client 用于跨进程调用；同一个 JVM 内的跨域调用走 `{name}-api` 的 UseCase 接口，不绕一圈 HTTP。

## 常见错误

- 不写 `.openapi-generator-ignore`：generator 创建独立的 `package.json` 覆盖 workspace 配置。
- TS 客户端 `package.json` 的 `main` 指向 `dist/`：消费侧必须先 build；workspace 应直接指向 `.ts` 源。
- Java / TS 客户端用不同 generator 版本：方法名 / 字段命名漂移。版本固定在 `openapitools.json` + Gradle 插件版本。
- 把 `axios` 写在 `dependencies` 而非 `peerDependencies`：每个客户端拉自己的 axios 版本，bundle 重复。
- 包名硬编码 `@jereh/openapi-client-example` 而不是 `@jereh/{name}-client`：跨模块复用混乱。

## Acceptance 检查

- [ ] Java + TypeScript 两套客户端都生成自同一份 `{name}-spec/{name}.yaml`。
- [ ] Java 用 `library = "native"`，TS 用 `typescript-axios`，版本固定。
- [ ] TS `package.json` `exports` 指向 `.ts` 源，不需要 `dist/`。
- [ ] `axios` 在 `peerDependencies`。
- [ ] `.openapi-generator-ignore` 入版本控制。
- [ ] Javadoc 关闭；`apiTests` / `modelTests` 不生成。
- [ ] `pnpm --filter @jereh/{name}-client type-check` 通过。
- [ ] `./gradlew :module:{name}:{name}-client:build` 通过。
