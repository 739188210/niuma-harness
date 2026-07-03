# Controller / DataFetcher

`{name}-controller/src/main/java/com/jereh/{name}/graphql/{Module}GraphQlController.java` 是 GraphQL 在 Jereh 的入口。它只负责解析请求、调用 `{name}-api` 的 UseCase、把 DTO 映射成生成的 GraphQL types。业务逻辑在 domain service。

## 关键决策

- 只注入 `{name}-api` 的 UseCase 接口，不注入 service / repository。
- `@QueryMapping` 用于顶层 Query；`@MutationMapping` 用于顶层 Mutation。
- `@SchemaMapping` 用于廉价子字段（已在父对象里或一次简单查找）。
- `@BatchMapping` 用于 N+1 风险字段（跨实体 / 跨表）。
- 返回类型使用 DGS 生成的类型（`com.jereh.{name}.graphql.codegen.types.*`），不用原始 domain entity。
- 分页参数默认值在 controller 里处理（例如 `page != null ? page : 0`）。

## Controller 示例

`module/tenant/tenant-controller/src/main/java/com/jereh/tenant/graphql/TenantGraphQlController.java`

```java
package com.jereh.tenant.graphql;

import com.jereh.tenant.api.dto.*;
import com.jereh.tenant.api.service.TenantManagementUseCase;
import com.jereh.tenant.graphql.codegen.types.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class TenantGraphQlController {

    private final TenantManagementUseCase tenantManagement;

    @QueryMapping
    public TenantDetail tenant(@Argument String id) {
        return tenantManagement.findById(id)
                .map(dto -> {
                    List<TenantContactDTO> contacts = tenantManagement.listContacts(id);
                    List<TenantSettingDTO> settings = tenantManagement.listSettings(id);
                    return toTenantDetail(dto, contacts, settings);
                })
                .orElse(null);
    }

    @QueryMapping
    public TenantPage tenants(@Argument Integer page, @Argument Integer size) {
        Page<TenantDTO> result = tenantManagement.list(
                page != null ? page : 0,
                size != null ? size : 20);
        return TenantPage.newBuilder()
                .content(result.getContent().stream().map(this::toTenant).toList())
                .totalElements((int) result.getTotalElements())
                .totalPages(result.getTotalPages())
                .page(result.getNumber())
                .size(result.getSize())
                .build();
    }

    @MutationMapping
    public Tenant createTenant(@Argument CreateTenantInput input) {
        TenantDTO dto = tenantManagement.create(
                new CreateTenantCommand(input.getName(), input.getCode()));
        return toTenant(dto);
    }

    @MutationMapping
    public Tenant activateTenant(@Argument String id) {
        tenantManagement.activate(id);
        return tenantManagement.findById(id).map(this::toTenant).orElse(null);
    }

    // ---------- 子字段批量加载 ----------

    /**
     * 假设 TenantDetail 或任何类型返回 contacts，
     * 这里演示如何用 @BatchMapping 一次加载多个 tenant 的 contacts。
     */
    @BatchMapping(typeName = "TenantDetail", field = "contacts")
    public Map<TenantDetail, List<Contact>> contacts(List<TenantDetail> tenants) {
        List<String> ids = tenants.stream().map(TenantDetail::getId).toList();
        Map<String, List<TenantContactDTO>> contactsByTenant = tenantManagement.listContacts(ids);

        return tenants.stream().collect(Collectors.toMap(
                t -> t,
                t -> contactsByTenant.getOrDefault(t.getId(), List.of())
                                .stream().map(this::toContact).toList()));
    }
}
```

## 转换私有方法

```java
private Tenant toTenant(TenantDTO dto) {
    return Tenant.newBuilder()
            .id(dto.id())
            .name(dto.name())
            .code(dto.code())
            .status(TenantStatus.valueOf(dto.status()))
            .createdAt(dto.createdAt() != null ? dto.createdAt().toString() : null)
            .updatedAt(dto.updatedAt() != null ? dto.updatedAt().toString() : null)
            .build();
}

private TenantDetail toTenantDetail(TenantDTO dto, List<TenantContactDTO> contacts, List<TenantSettingDTO> settings) {
    return TenantDetail.newBuilder()
            .id(dto.id())
            .name(dto.name())
            .code(dto.code())
            .status(TenantStatus.valueOf(dto.status()))
            .contacts(contacts.stream().map(this::toContact).toList())
            .settings(settings.stream().map(this::toSetting).toList())
            .createdAt(dto.createdAt() != null ? dto.createdAt().toString() : null)
            .updatedAt(dto.updatedAt() != null ? dto.updatedAt().toString() : null)
            .build();
}
```

## N+1 处理

| 字段 | 策略 |
| --- | --- |
| 父对象上已有的字段 | 直接 set |
| 单条简单子记录 | `@SchemaMapping` |
| 列表型子记录（多个 tenant 的 contacts） | `@BatchMapping`，按父对象 ID IN 查询 |

`@BatchMapping` 返回 `Map<Parent, List<Child>>`，Spring GraphQL 会自动按 parent 实例分发。

## 常见错误

- Controller 里调 service 直接返回 domain POJO：应返回生成的 GraphQL 类型。
- `@SchemaMapping` 里 for-each 子字段查库：改成 `@BatchMapping` 或 DataLoader。
- 不处理 `@Argument` 默认值：nullable 参数在 Java 中变成 `null`。
- 把业务校验放在 controller：交给 domain service。
- GraphQL controller 返回 `Optional<T>`：返回 null 即可表示空。
- 用 `@BatchMapping` 加载父对象本身已包含的字段：画蛇添足。

## Acceptance 检查

- [ ] Controller 命名 `{Module}GraphQlController` 在 `graphql/` 包下。
- [ ] 只注入 `{name}-api` UseCase 接口。
- [ ] Query / Mutation 映射到 `@QueryMapping` / `@MutationMapping`。
- [ ] N+1 风险字段用 `@BatchMapping`。
- [ ] 返回 DGS 生成的 GraphQL 类型，不返回 domain POJO。
- [ ] 私有转换方法集中在 controller 内部，或用 `GraphqlMapper`（仍在 controller 包内）。
- [ ] 单元测试验证 resolver + batch mapping。
