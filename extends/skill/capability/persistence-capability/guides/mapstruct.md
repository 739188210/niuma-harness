# MapStruct

Jereh `{name}-domain` 用 MapStruct 在 **MBG 生成的 POJO**（`com.jereh.{name}.jdbc.model.*`）和 **`{name}-api` DTO**（`com.jereh.{name}.api.dto.*`）之间转换。禁止手写 getter/setter 拷贝。

## 关键决策

- **位置**：`{name}-domain/src/main/java/com/jereh/{name}/util/`。
- **命名**：`{Module}Mapper`，每个 module 一份。如果对象多，可按聚合拆为多个 `{Module}*Mapper`（如 `TenantContactMapper`），但仍放在 `util/` 下。
- **接口而非类**：`@Mapper` 接口，MapStruct 在编译期生成实现。
- **注入**：让 Spring 管理 mapper bean（`@Mapper(componentModel = "spring")`）。`Mappers.getMapper(...)` 也可，但 Spring 注入更利于在 service 测试中 mock。
- **时间类型**：DB 端 `OffsetDateTime`，DTO 端 `Instant`（或保持 `OffsetDateTime` 二选一，整模块统一）。用 `expression` 或共享的 `default` 方法转换。
- **字段名错位**：MBG 列名 `setting_key` → POJO `settingKey` → DTO `key`，用 `@Mapping(target = "key", source = "settingKey")`。

## 示例：模块根 Mapper

`{name}-domain/src/main/java/com/jereh/{name}/util/TenantMapper.java`

```java
package com.jereh.tenant.util;

import com.jereh.tenant.api.dto.*;
import com.jereh.tenant.jdbc.model.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;

@Mapper(componentModel = "spring")
public interface TenantMapper {

    @Mapping(target = "createdAt", expression = "java(toInstant(tenant.getCreatedAt()))")
    @Mapping(target = "updatedAt", expression = "java(toInstant(tenant.getUpdatedAt()))")
    TenantDTO toDTO(Tenant tenant);

    @Mapping(target = "createdAt", expression = "java(toInstant(contact.getCreatedAt()))")
    TenantContactDTO toContactDTO(TenantContact contact);

    @Mapping(target = "key", source = "settingKey")
    @Mapping(target = "value", source = "settingValue")
    @Mapping(target = "updatedAt", expression = "java(toInstant(setting.getUpdatedAt()))")
    TenantSettingDTO toSettingDTO(TenantSetting setting);

    @Mapping(target = "createdAt", expression = "java(toInstant(log.getCreatedAt()))")
    TenantAuditLogDTO toAuditLogDTO(TenantAuditLog log);

    default Instant toInstant(OffsetDateTime odt) {
        return odt != null ? odt.toInstant() : null;
    }
}
```

## 在 service 中使用

```java
@Service
@Transactional(readOnly = true)
public class TenantManagementService implements TenantManagementUseCase {

    private final TenantRepository tenantRepository;
    private final TenantMapper tenantMapper;

    public TenantManagementService(TenantRepository tenantRepository, TenantMapper tenantMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantMapper = tenantMapper;
    }

    @Override
    public Optional<TenantDTO> findById(String id) {
        return tenantRepository.findById(id).map(tenantMapper::toDTO);
    }
}
```

## 列表与分页

```java
List<TenantDTO> toDTOList(List<Tenant> tenants);

// service 中
Page<TenantDTO> list(int page, int size) {
    return tenantRepository.findAll(PageRequest.of(page, size))
            .map(tenantMapper::toDTO);
}
```

`Page.map(...)` 不需要单独的 mapper 方法。

## 何时不用 expression

- 简单同名同类型直接映射：MapStruct 自动处理，不需要 `@Mapping`。
- 跨包同名同类型：同上。
- 复杂转换（多字段拼装、查表关联）：写一个 `default` 方法在 mapper 里，注解 `@Mapping(target = "x", source = ".")` 加 `qualifiedByName`。

## 反向转换（DTO → POJO）

仅在 update 场景下偶尔需要。推荐 service 自己做："select + 修改字段 + update"，不用反向 mapper：因为反向映射很容易把未传字段写成 null。

如果非要做：

```java
@Mapping(target = "createdAt", ignore = true)
@Mapping(target = "updatedAt", ignore = true)
void mergeCommand(@MappingTarget Tenant existing, UpdateTenantCommand command);
```

`@MappingTarget` 让 MapStruct 只覆盖 command 里非 null 的字段（需开启 `nullValuePropertyMappingStrategy = IGNORE`）。

## 常见错误

- Mapper 放到 `{name}-api` 模块：让 api 模块依赖了 jdbc model（违反依赖方向）。Mapper 永远在 `{name}-domain/util/`。
- 在 service 手写 getter/setter 转换：违反 CONVENTIONS；改用 mapper。
- DTO 时间字段类型与 POJO 不一致又没写转换：MapStruct 编译报错或生成错误代码。
- 不同 module 之间复用 mapper：每个 module 独立 mapper，不跨域复用。
- `componentModel` 不一致：同 module 内一份用 `spring` 一份用默认，注入混乱。统一 `spring`。

## Acceptance 检查

- [ ] Mapper 接口在 `{name}-domain/src/main/java/com/jereh/{name}/util/`。
- [ ] 命名 `{Module}Mapper` / `{Module}*Mapper`。
- [ ] `@Mapper(componentModel = "spring")`。
- [ ] 时间字段、字段名错位用 `@Mapping` 显式声明。
- [ ] service 中通过构造注入使用 mapper，不用 `Mappers.getMapper`。
- [ ] 没有手写 getter/setter 转换代码。
- [ ] 反向转换用 `@MappingTarget` + 忽略策略，或在 service 层先 select。
