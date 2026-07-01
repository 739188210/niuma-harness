# Flyway Migration

Jereh 每个 `{name}-domain` module 有独立的 Flyway 实例和迁移目录。所有迁移 forward-only：已应用的 SQL 文件**永不编辑**，schema 变更通过新版本号文件追加。

## 关键决策

- **目录**：`{name}-domain/src/main/resources/migration/{name}/`。每个 module 一个子目录，避免多 module 间命名冲突。
- **命名**：`V{n}__{verb}_{noun}.sql`，如 `V1__create_tenant.sql`、`V2__add_tenant_status_index.sql`。
- **Flyway bean 在 `{Module}FlywayConfiguration`** 中显式声明，绑定到本 module 的 `{name}DataSource`。
- **`baselineOnMigrate = true`**：让 Flyway 兼容已经手动初始化的数据库。
- **`@DependsOn("{name}Flyway")`** 加在 Repository 配置类上，保证 schema 在 Repository 初始化前就绪。
- **Forward-only**：不写 down 迁移；要回滚就写新 SQL 反向修改。
- **不在 Flyway 之外建表**：`spring.sql.init` 仅限单元测试 + H2 in-memory；生产 / 集成测试都走 Flyway。

## Flyway 配置示例

`{name}-domain/src/main/java/com/jereh/{name}/configuration/{Module}FlywayConfiguration.java`

```java
package com.jereh.tenant.configuration;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
public class TenantFlywayConfiguration {

    @Bean
    public Flyway tenantFlyway(@Qualifier("tenant") DataSource dataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:migration/tenant")
                .baselineOnMigrate(true)
                .load();
        flyway.migrate();
        return flyway;
    }
}
```

> 注意：`flyway.migrate()` 在 bean 创建时直接执行，无需 `spring.flyway.enabled=true`。每个 module 各自跑自己的 Flyway，全局 `spring.flyway.*` 配置不影响。

## 迁移脚本示例

`{name}-domain/src/main/resources/migration/tenant/V1__create_tenant.sql`

```sql
CREATE TABLE IF NOT EXISTS tenant (
    id         VARCHAR(64) PRIMARY KEY,
    name       VARCHAR(128) NOT NULL,
    code       VARCHAR(64)  NOT NULL UNIQUE,
    status     VARCHAR(32)  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_status ON tenant (status);
```

`V2__create_tenant_contacts.sql`

```sql
CREATE TABLE IF NOT EXISTS tenant_contacts (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    VARCHAR(64) NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    name         VARCHAR(128) NOT NULL,
    phone        VARCHAR(32),
    email        VARCHAR(128),
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_contacts_tenant_id ON tenant_contacts (tenant_id);
```

`V3__add_tenant_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS tenant_settings (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     VARCHAR(64) NOT NULL REFERENCES tenant (id) ON DELETE CASCADE,
    setting_key   VARCHAR(64) NOT NULL,
    setting_value TEXT,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    UNIQUE (tenant_id, setting_key)
);
```

## Schema 演进规则

- **永不编辑已应用的版本**：哪怕只是改注释。改了 Flyway 会因校验失败而拒绝迁移。
- **新增列**：新版本 `V{n+1}__add_column_xxx.sql`。允许 null 或带 default。
- **删除列**：新版本 `V{n+1}__drop_column_xxx.sql`。先确认所有运行实例都已迁移到不读该列的代码后再删。
- **重命名列**：分两步——先加新列+回填+应用切流量，再删旧列。
- **回滚**：写反向迁移（`V{n+1}__revert_xxx.sql`），不要回滚已应用的版本。

## 多 module 与全局 Flyway

`application.yml` 里的 `spring.flyway` 配置默认作用于自动装配的 primary DataSource。Jereh 模式下，**每个 module 各自管 Flyway**，所以推荐：

```yaml
spring:
  flyway:
    enabled: false    # 关闭自动装配的全局 Flyway，避免跑到 primary DataSource
```

各 module 的 `{Module}FlywayConfiguration` 显式 `.migrate()`，互不干扰。

## 与 Testcontainers 集成

集成测试每次启动一个 PostgreSQL 容器；Flyway 在 `{Module}FlywayConfiguration` 启动时自动迁移。测试只需把 DataSource 指向容器，迁移自动跑。

```java
@DynamicPropertySource
static void registerProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.tenant.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.tenant.username", postgres::getUsername);
    registry.add("spring.datasource.tenant.password", postgres::getPassword);
}
```

## 常见错误

- 改已应用的 `V1__xxx.sql`：Flyway 校验和不匹配，启动失败。
- 把所有 module 的迁移混到 `db/migration`：迁移之间命名冲突，回滚困难。
- 忘记 `baselineOnMigrate = true`：第一次引入 Flyway 到已有库时启动失败。
- Repository 配置没加 `@DependsOn("{name}Flyway")`：Repository 比 schema 先初始化。
- 全局 `spring.flyway.enabled = true` 但又显式配 module Flyway：跑两遍，可能冲突。
- 把生产凭据写进 Flyway URL：用 `@Qualifier("{name}")` 注入的 DataSource，凭据走环境变量。

## Acceptance 检查

- [ ] 迁移文件在 `{name}-domain/src/main/resources/migration/{name}/`。
- [ ] 命名 `V{n}__{verb}_{noun}.sql`。
- [ ] `{Module}FlywayConfiguration` 用本 module 的 DataSource。
- [ ] Repository 配置 `@DependsOn("{name}Flyway")`。
- [ ] 已应用的迁移文件未被修改。
- [ ] 全局 `spring.flyway.enabled` 关闭或与 module 配置不冲突。
- [ ] 集成测试通过 Testcontainers，自动应用迁移。
