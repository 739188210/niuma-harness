---
name: persistence-capability
description: "Jereh module persistence capability: Spring Data JDBC + MyBatis + MapStruct + Flyway, one DataSource per module. Triggers: persistence, 持久化, Spring Data JDBC, MyBatis, MapStruct, Flyway, multi datasource, 多数据源."
metadata:
  author: jereh
  version: "2.0.0"
---

# persistence-capability

How to wire persistence inside a Jereh `{name}-domain` module: independent DataSource per module, MBG-generated POJOs as entities, Spring Data JDBC for single-table CRUD, MyBatis Dynamic SQL for complex queries, MapStruct between generated models and `{name}-api` DTOs, Flyway for forward-only migrations.

## When to use

- Setting up a new `{name}-domain` module
- Adding tables, queries, or migrations to an existing module
- Triggers: persistence, 持久化, Spring Data JDBC, MyBatis, MapStruct, Flyway, multi datasource, 多数据源

## Architecture at a glance

```
{name}-domain/
├── src/main/java/com/jereh/{name}/
│   ├── configuration/   # DataSource / Repository / Flyway 三个配置类
│   ├── repository/      # CrudRepository 接口（单表 CRUD）
│   ├── service/         # 实现 {name}-api 的 UseCase；复杂查询写 Dynamic SQL
│   └── util/            # MapStruct {Module}Mapper（model ↔ api/dto）
├── src/main/resources/
│   ├── migration/{name}/V{n}__*.sql        # Flyway，forward-only
│   ├── mybatis-generator.xml               # MBG 配置
│   └── META-INF/spring/...AutoConfiguration.imports
└── gen/main/mybatis/java/com/jereh/{name}/jdbc/
    ├── model/           # MBG 生成 POJO（带 @Table/@Id 注解，由插件补上）
    └── mapper/          # MBG 生成 MyBatis Dynamic SQL Mapper
```

依赖方向：`{name}-domain` 实现 `{name}-api` 的 UseCase，不依赖任何其他模块的 domain / controller / client / ui。

## Guides

| Guide | 主题 |
| --- | --- |
| [guides/datasource-configuration.md](guides/datasource-configuration.md) | 每个 module 独立 DataSource / Tx / Flyway / Repository 配置三件套 |
| [guides/mybatis-generator.md](guides/mybatis-generator.md) | MBG 配置：插件补 Spring Data JDBC 注解、输出到 `gen/main/mybatis/java/` |
| [guides/dynamic-sql.md](guides/dynamic-sql.md) | MyBatis Dynamic SQL：在 service 中写复杂查询，禁止 SQL 拼接 |
| [guides/spring-data-jdbc.md](guides/spring-data-jdbc.md) | 用 `CrudRepository` / `PagingAndSortingRepository` 做单表 CRUD |
| [guides/mapstruct.md](guides/mapstruct.md) | 在 `util/{Module}Mapper` 做 jdbc model ↔ api DTO 转换 |
| [guides/flyway-migration.md](guides/flyway-migration.md) | 每个 module 独立 `migration/{name}/`，forward-only |

## Core rules

- **一个 module 一个 DataSource、一个 TransactionManager**。所有 bean 带 `@Qualifier("{name}")` 和 `defaultCandidate = false`。
- **不写动态数据源路由**。跨域调用走 `{name}-api` UseCase 接口，不跨域事务。
- **MBG 是实体来源**。开发者不手写 `@Table` 实体；POJO 由 MBG 生成到 `gen/main/mybatis/java/com/jereh/{name}/jdbc/model/`，自定义插件补 `@Table/@Id/@Version`。
- **单表 CRUD 用 Spring Data JDBC `CrudRepository`**；分页用 `PagingAndSortingRepository`。
- **复杂 / 多条件查询用 MyBatis Dynamic SQL**，在 service 层组合 `*DynamicSqlSupport` 列。
- **`MyBatisDataAccessStrategy.createCombinedAccessStrategy(...)`** 组合 MyBatis 与 JDBC，统一 `JdbcAggregateTemplate` 使用。
- **MapStruct Mapper 在 `{name}-domain/util/`**，命名 `{Module}Mapper`；jdbc model ↔ `{name}-api/dto` 必须走它，禁止手写 getter/setter 转换。
- **Flyway 路径 `classpath:migration/{name}/`**，文件名 `V{n}__{verb}_{noun}.sql`，forward-only。
- **Bean 注册走 `META-INF/spring/...AutoConfiguration.imports`**，不用 `scanBasePackages`。

## Exit criteria

- 三个配置类齐全：`{Module}DataSourceConfiguration` / `{Module}RepositoryConfiguration` / `{Module}FlywayConfiguration`。
- `mybatis-generator.xml` 配置正确、生成的 POJO 编译通过、带正确注解。
- 单表 CRUD 走 Repository；复杂查询走 Dynamic SQL；零 SQL 字符串拼接。
- `{Module}Mapper` 覆盖 jdbc model ↔ DTO 转换；service 不出现手写转换。
- Flyway 迁移可重复执行无错；测试用 Testcontainers PostgreSQL。
- `META-INF/spring/...AutoConfiguration.imports` 列出本 module 的所有 `@Configuration`。
- `application.yml` 无硬编码凭据。
