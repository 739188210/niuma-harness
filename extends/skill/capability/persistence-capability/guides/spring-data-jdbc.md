# Spring Data JDBC

Jereh `{name}-domain` 用 Spring Data JDBC 处理单表 CRUD。实体不是手写的，是 MBG 生成的 POJO（带 `@Table` / `@Id` 注解，由插件自动补）。Repository 只继承 `CrudRepository` / `PagingAndSortingRepository`，不写复杂查询。

## 关键决策

- **实体来自 MBG**：`com.jereh.{name}.jdbc.model.*`。开发者不在 domain 包里写实体类。
- **Repository 接口只放在 `{name}-domain/repository/`**，泛型用 MBG 生成的 POJO 类型。
- **单表 CRUD 用 `CrudRepository`**；要分页用 `PagingAndSortingRepository<T, ID>`，参数传 `Pageable`。
- **复杂查询 / 多条件 / 联表不写在这里**：那是 MyBatis Dynamic SQL 承担的职责。
- **`JdbcAggregateTemplate.insert(...)` 用于显式 insert**（主键已分配的场景，比如业务侧生成 UUID）；其他时候用 `save()`。
- **事务**：service 类上 `@Transactional(readOnly = true)`，写方法上 `@Transactional`。
- **@Transactional 用的 TransactionManager 必须是 module 自己的那个**——Repository 配置已经通过 `transactionManagerRef = "{name}TransactionManager"` 关联好，无需手动指定。

## Repository 示例

`{name}-domain/src/main/java/com/jereh/{name}/repository/TenantRepository.java`

```java
package com.jereh.tenant.repository;

import com.jereh.tenant.jdbc.model.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.PagingAndSortingRepository;

public interface TenantRepository
        extends CrudRepository<Tenant, String>,
                PagingAndSortingRepository<Tenant, String> {

    Page<Tenant> findAll(Pageable pageable);
}
```

> 注意：Repository **不要**写多于 1 个条件的 derived query。`findByNameContainsAndStatus(...)` 这种用 Dynamic SQL 实现，不要让 Spring Data 解析方法名。

## Service 中使用

`{name}-domain/src/main/java/com/jereh/{name}/service/TenantManagementService.java`

```java
package com.jereh.tenant.service;

import com.jereh.tenant.api.dto.CreateTenantCommand;
import com.jereh.tenant.api.dto.TenantDTO;
import com.jereh.tenant.api.service.TenantManagementUseCase;
import com.jereh.tenant.jdbc.model.Tenant;
import com.jereh.tenant.repository.TenantRepository;
import com.jereh.tenant.util.TenantMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TenantManagementService implements TenantManagementUseCase {

    private final TenantRepository tenantRepository;
    private final JdbcAggregateTemplate tenantJdbcAggregateTemplate;
    private final TenantMapper mapper;

    public TenantManagementService(
            TenantRepository tenantRepository,
            JdbcAggregateTemplate tenantJdbcAggregateTemplate,
            TenantMapper mapper) {
        this.tenantRepository = tenantRepository;
        this.tenantJdbcAggregateTemplate = tenantJdbcAggregateTemplate;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public TenantDTO create(CreateTenantCommand command) {
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID().toString());
        tenant.setName(command.name());
        tenant.setCode(command.code());
        tenant.setStatus("PENDING");
        tenant.setCreatedAt(OffsetDateTime.now());
        tenant.setUpdatedAt(OffsetDateTime.now());

        // ID 业务侧生成 → 必须用 insert，否则 save() 会按 update 处理
        Tenant saved = tenantJdbcAggregateTemplate.insert(tenant);
        return mapper.toDTO(saved);
    }

    @Override
    public Optional<TenantDTO> findById(String id) {
        return tenantRepository.findById(id).map(mapper::toDTO);
    }

    @Override
    public Page<TenantDTO> list(int page, int size) {
        return tenantRepository.findAll(PageRequest.of(page, size))
                .map(mapper::toDTO);
    }
}
```

## 何时用 `insert` vs `save`

| 场景 | API |
| --- | --- |
| 主键由数据库生成（自增列） | `repository.save(entity)` |
| 主键由业务侧分配（UUID、雪花 ID） | `jdbcAggregateTemplate.insert(entity)` |
| 更新已存在记录 | `repository.save(entity)`（Spring Data JDBC 通过 `@Version` 或 `Persistable` 判断） |

Spring Data JDBC 通过 `@Id` 是否为 null + `@Version` / `Persistable.isNew()` 判断 insert vs update。业务侧给了 ID 又调 `save()`，会被当成 update 抛 `IncorrectUpdateSemanticsDataAccessException`。

## 常见错误

- 在 domain 包手写 `@Table` 实体：MBG 输出会冲突，团队也会失去单一实体来源。
- Repository 写 derived 多条件查询：解析脆弱，难维护，换 Dynamic SQL。
- 业务侧分配 ID 后用 `save()`：被识别成 update，抛错。
- service 类没有 `@Transactional(readOnly = true)`：读方法跑在写事务里，多余开销。
- 写方法忘 `@Transactional`：跨多个 Repository 调用时部分失败无法回滚。
- 在 `{name}-domain` 引用别的 module 的 Repository：跨域必须走 `{name}-api` UseCase。

## Acceptance 检查

- [ ] Repository 泛型用 `com.jereh.{name}.jdbc.model.*`。
- [ ] Repository 不超过 1 个条件的 derived query。
- [ ] service 类 `@Transactional(readOnly = true)`，写方法 `@Transactional`。
- [ ] 业务侧分配 ID 的场景用 `JdbcAggregateTemplate.insert(...)`。
- [ ] service 实现的是 `{name}-api` 的 UseCase 接口。
- [ ] 没有跨 module 直接注入别的 module 的 Repository。
