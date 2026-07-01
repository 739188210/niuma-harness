# Controller Generation

`{name}-controller` 通过 `com.jereh.openapi.codegen` 插件从 `{name}-spec/{name}.yaml` 生成 Spring Web 接口和模型，开发者写 `{Module}Controller implements DefaultApi`，方法体只调用 `{name}-api` 的 UseCase。

## 关键决策

- **`generatorName = "spring"` + `interfaceOnly = true`**：只生成接口，开发者自己写 `@RestController` 实现。
- **`useTags`**：如果 spec 给 path 加了 tag，生成多个 `*Api` 接口；不加 tag 则生成 `DefaultApi`。Jereh 多数模块单一聚合，直接用 `DefaultApi` 即可。
- **`apiPackage = "com.jereh.{name}.rest.api"` / `modelPackage = "com.jereh.{name}.rest.model"`**。生成产物到 `gen/main/openapi/java/`，**不入版本控制**（由 codegen plugin 在 build 时生成）。
- **`openApiNullable = false`**：避免 `JsonNullable` 包装层。
- **`documentationProvider = "none"`**：Jereh 不依赖 SpringDoc UI；如需 swagger UI 由 server 端集成。
- **Controller 不持有 service / repository**。只注入 `{name}-api` 的 UseCase 接口；DTO ↔ Request/Response 在 controller 内部转换（或抽到 controller 内部的私有方法）。

## Gradle 配置

`module/{name}/{name}-controller/build.gradle.kts`

```kotlin
plugins {
    id("com.jereh.spring.library")
    id("com.jereh.openapi.codegen")
}

dependencies {
    implementation(project(":module:tenant:tenant-domain"))   // 仅为打包/装配可达，不直接调 domain
    implementation(deps.spring.boot.starter.web)
    implementation(libs.jakarta.validation.api)
}

openApiGenerate {
    generatorName.set("spring")
    inputSpec.set("$projectDir/../tenant-spec/tenant.yaml")
    apiPackage.set("com.jereh.tenant.rest.api")
    modelPackage.set("com.jereh.tenant.rest.model")
    configOptions.putAll(mapOf(
        "interfaceOnly"          to "true",
        "useTags"                to "true",
        "skipDefaultInterface"   to "false",
        "openApiNullable"        to "false",
        "documentationProvider"  to "none",
    ))
}
```

> 即使 `{name}-controller` 依赖 `{name}-domain` 是为了**装配可达**（让 controller 包含的 module 启动后能找到 domain bean），controller 代码本身**仍然只调用 `{name}-api` 的 UseCase 接口**。

## Controller 实现示例

`module/tenant/tenant-controller/src/main/java/com/jereh/tenant/rest/TenantController.java`

```java
package com.jereh.tenant.rest;

import com.jereh.tenant.api.dto.*;
import com.jereh.tenant.api.service.TenantManagementUseCase;
import com.jereh.tenant.rest.api.DefaultApi;
import com.jereh.tenant.rest.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class TenantController implements DefaultApi {

    private final TenantManagementUseCase tenantManagement;

    @Override
    public ResponseEntity<TenantResponse> createTenant(CreateTenantRequest request) {
        TenantDTO dto = tenantManagement.create(
                new CreateTenantCommand(request.getName(), request.getCode()));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(dto));
    }

    @Override
    public ResponseEntity<TenantDetailResponse> getTenant(String id) {
        return tenantManagement.findById(id)
                .map(dto -> {
                    List<TenantContactDTO> contacts = tenantManagement.listContacts(id);
                    List<TenantSettingDTO> settings = tenantManagement.listSettings(id);
                    return ResponseEntity.ok(toDetailResponse(dto, contacts, settings));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Override
    public ResponseEntity<TenantPage> listTenants(Integer page, Integer size) {
        Page<TenantDTO> result = tenantManagement.list(
                page != null ? page : 0, size != null ? size : 20);
        TenantPage response = new TenantPage()
                .content(result.getContent().stream().map(this::toResponse).toList())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .page(result.getNumber())
                .size(result.getSize());
        return ResponseEntity.ok(response);
    }

    // -- 私有转换：api/dto -> rest/model --

    private TenantResponse toResponse(TenantDTO dto) {
        return new TenantResponse()
                .id(dto.id())
                .name(dto.name())
                .code(dto.code())
                .status(TenantResponse.StatusEnum.fromValue(dto.status()))
                .createdAt(dto.createdAt() != null ? dto.createdAt().atOffset(ZoneOffset.UTC) : null)
                .updatedAt(dto.updatedAt() != null ? dto.updatedAt().atOffset(ZoneOffset.UTC) : null);
    }
}
```

## DTO 与 Request/Response 隔离

| 层 | 类型 | 包 |
| --- | --- | --- |
| HTTP 入参/出参 | `*Request` / `*Response` | `com.jereh.{name}.rest.model`（生成） |
| 应用层入参/出参 | `*Command` / `*DTO` | `com.jereh.{name}.api.dto`（手写） |

- Controller 把 `Request` 拆解为多个 Command 参数或调用 mapper 转换。
- Service 返回 `DTO`，Controller 再转 `Response`。
- **不要**让 `{name}-api/dto` 引用 `rest/model`（会造成 api 依赖 controller）。
- 转换代码量不大时直接写在 Controller 内私有方法；多则抽 `RestMapper`（仍在 controller 包内，命名 `Rest{Module}Mapper`，与 `{name}-domain/util/{Module}Mapper` 区分）。

## 服务装配

每个 `{name}-controller` 自动通过 `META-INF/spring/...AutoConfiguration.imports`（如果有自身的配置类）或被 server 通过 `implementation(project(":module:{name}:{name}-controller"))` 拉入。Server 启动类保持纯 `@SpringBootApplication`。

## 测试

`{name}-controller/src/test/java/...` 的集成测试：

```java
@WebMvcTest(TenantController.class)
class TenantControllerWebTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private TenantManagementUseCase useCase;

    @Test
    void createTenant_returns201() throws Exception {
        when(useCase.create(any())).thenReturn(
                new TenantDTO("id", "n", "c", "PENDING", null, null));

        mockMvc.perform(post("/api/tenants")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name":"n","code":"c"}"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("c"));
    }
}
```

Mock UseCase 接口，避免起 domain / Testcontainers。

## 常见错误

- Controller 注入 `TenantManagementService`（具体类）：违反「只依赖 `{name}-api`」。统一注入 `TenantManagementUseCase` 接口。
- 把生成的 `*Request` 当 Command 传给 `{name}-api` UseCase：让 api 包穿透了 OpenAPI 层。
- 在 Controller 写业务（验证、状态机、加密）：业务一律下沉到 `{name}-domain`。
- 用 `@RestController` + 不 implement 生成的 `DefaultApi`：契约和实现脱节。
- `gen/main/openapi/java/` 进版本控制并被手改：codegen 重跑会覆盖，导致 build 不稳定。
- `apiPackage` / `modelPackage` 写到 `com.jereh.{name}` 顶包：与 domain 包冲突。

## Acceptance 检查

- [ ] `{Module}Controller implements DefaultApi`（或 tag-based `*Api`）。
- [ ] 只注入 `{name}-api` 的 UseCase 接口。
- [ ] 不写业务逻辑；Request ↔ Command、DTO ↔ Response 转换是唯一职责。
- [ ] `openApiGenerate` 任务在 build 中自动跑通。
- [ ] `gen/` 不入版本控制，或入但不手改。
- [ ] `*Request` 不出现在 `{name}-api`、`*DTO` 不出现在 controller 客户端。
- [ ] 集成测试 mock UseCase 验证响应。
