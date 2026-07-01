# Dynamic SQL

Jereh `{name}-domain` 用 MyBatis Dynamic SQL 写复杂查询：多条件过滤、动态排序、分页、联表。规则简单：所有列引用走 MBG 生成的 `*DynamicSqlSupport`，**零字符串 SQL**。

## 何时用 Dynamic SQL

| 需求 | API |
| --- | --- |
| 主键查 / 全表读 / 简单存删 | Spring Data JDBC `CrudRepository` |
| 多条件可选过滤 | Dynamic SQL（本指南） |
| 动态排序 / `LIMIT OFFSET` 分页 | Dynamic SQL |
| 多表 join、聚合统计 | Dynamic SQL，必要时辅以 `JdbcTemplate` 跑原生 SQL（仍然用占位符） |

## 关键决策

- **`*Mapper` 调用全部用生成的 `*DynamicSqlSupport.xxx` 引用列**，不写 `"name = ?"` 字符串。
- **查询逻辑在 service**，controller 不组装查询。
- **筛选条件用 `SqlBuilder` 的 `isEqualToWhenPresent` / `isLikeWhenPresent`** 处理可选过滤：参数为 null 时跳过该条件。
- **更新走"先 select、再 set 非 null 字段、再 update"**，避免 `updateByPrimaryKey` 把未传字段清空。
- **service 写方法必须 `@Transactional`**，多个 Mapper 调用要在同一事务。

## 多条件查询示例

`{name}-domain/src/main/java/com/jereh/{name}/service/...`

```java
import com.jereh.tenant.jdbc.mapper.TenantDynamicSqlSupport;
import com.jereh.tenant.jdbc.mapper.TenantMapper;
import com.jereh.tenant.jdbc.model.Tenant;
import org.mybatis.dynamic.sql.SqlBuilder;
import org.mybatis.dynamic.sql.select.SelectDSLCompleter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TenantQueryService {

    private final TenantMapper tenantMapper;

    public TenantQueryService(TenantMapper tenantMapper) {
        this.tenantMapper = tenantMapper;
    }

    public List<Tenant> search(String nameKeyword, String status, int limit, int offset) {
        return tenantMapper.select(c -> c
                .where(TenantDynamicSqlSupport.tenant.name,
                        SqlBuilder.isLikeWhenPresent(nameKeyword).map(k -> "%" + k + "%"))
                .and(TenantDynamicSqlSupport.tenant.status,
                        SqlBuilder.isEqualToWhenPresent(status))
                .orderBy(TenantDynamicSqlSupport.tenant.createdAt.descending())
                .limit(limit)
                .offset(offset));
    }

    public long count(String nameKeyword, String status) {
        return tenantMapper.count(c -> c
                .where(TenantDynamicSqlSupport.tenant.name,
                        SqlBuilder.isLikeWhenPresent(nameKeyword).map(k -> "%" + k + "%"))
                .and(TenantDynamicSqlSupport.tenant.status,
                        SqlBuilder.isEqualToWhenPresent(status)));
    }
}
```

## 部分更新示例

`updateByPrimaryKey` 会把未设置的字段写成 null。安全的更新模式：先取出当前行，应用 command 里的非 null 变更，再调用 update。

```java
@Transactional
public Optional<Tenant> updateProfile(String id, UpdateTenantCommand command) {
    return tenantMapper.selectByPrimaryKey(id)
            .map(existing -> {
                if (command.name() != null) {
                    existing.setName(command.name());
                }
                if (command.code() != null) {
                    existing.setCode(command.code());
                }
                existing.setUpdatedAt(OffsetDateTime.now());
                tenantMapper.updateByPrimaryKey(existing);
                return existing;
            });
}
```

复杂情况下，可以用 `updateSelective` + `setEqualToWhenPresent` 让 Dynamic SQL 自动跳过 null 列：

```java
@Transactional
public int touchStatus(String id, String newStatus) {
    return tenantMapper.update(c -> c
            .set(TenantDynamicSqlSupport.tenant.status).equalTo(newStatus)
            .set(TenantDynamicSqlSupport.tenant.updatedAt).equalTo(OffsetDateTime.now())
            .where(TenantDynamicSqlSupport.tenant.id, SqlBuilder.isEqualTo(id)));
}
```

## In / Between / Subquery

```java
tenantMapper.select(c -> c
    .where(TenantDynamicSqlSupport.tenant.status, SqlBuilder.isIn("ACTIVE", "PENDING"))
    .and(TenantDynamicSqlSupport.tenant.createdAt,
         SqlBuilder.isBetween(start).and(end))
    .orderBy(TenantDynamicSqlSupport.tenant.createdAt.descending()));
```

## 常见错误

- 用字符串拼接 SQL / 列名：失去类型安全，注入风险。一律 `*DynamicSqlSupport`。
- `updateByPrimaryKey(entity)` 直接覆盖：未传字段被写 null。
- 在 controller 组装 `select(c -> ...)`：业务泄漏到 Web 层。所有查询逻辑放 service。
- 读方法没用 `@Transactional(readOnly = true)`：连接归还给池前事务保持时间过长。
- 用 derived query method 写复杂条件：换成 Dynamic SQL。
- 跨 module 的 Mapper 直接注入：跨域查询走另一个 module 的 `{name}-api` UseCase，禁止直接读它的表。

## Acceptance 检查

- [ ] 所有列引用走生成的 `*DynamicSqlSupport`。
- [ ] 复杂查询在 service，不在 controller。
- [ ] 可选过滤用 `isXxxWhenPresent`，不用 if-else 拼条件。
- [ ] 部分更新先 select 后修改，或用 `update + setEqualTo` 显式列出列。
- [ ] 写方法有 `@Transactional`。
- [ ] 无跨 module Mapper 直接注入。
