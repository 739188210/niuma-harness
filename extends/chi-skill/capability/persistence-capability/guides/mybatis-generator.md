# MyBatis Generator

MBG 是 Jereh 实体（POJO）的唯一来源。开发者不手写 `@Table` / `@Id` 实体，由 MBG 从已迁移的数据库 schema 生成，自定义插件补 Spring Data JDBC 注解，输出到 `gen/main/mybatis/java/com/jereh/{name}/jdbc/`。

## 关键决策

- `targetRuntime="MyBatis3DynamicSql"`：生成类型安全的 Dynamic SQL Mapper，无 XML。
- 自定义插件 `com.jereh.tools.mybatis.plugin.SpringDataJdbcAnnotationPlugin`：在生成的 POJO 上补 `@Table` / `@Id` / `@Version` 注解，让 Spring Data JDBC 能直接当聚合根使用。
- 输出到 `gen/main/mybatis/java/`，包名 `com.jereh.{name}.jdbc.model` 和 `com.jereh.{name}.jdbc.mapper`。
- 连接信息走 Gradle property / 环境变量注入，配置文件里不写凭据。
- `useJSR310Types=true` + 列重写 `OffsetDateTime`：PostgreSQL `TIMESTAMPTZ` 字段类型一致。

## 配置示例

`{name}-domain/src/main/resources/mybatis-generator.xml`

```xml
<!DOCTYPE generatorConfiguration PUBLIC
        "-//mybatis.org//DTD MyBatis Generator Configuration 1.0//EN"
        "http://mybatis.org/dtd/mybatis-generator-config_1_0.dtd">
<generatorConfiguration>
    <context id="tenant-postgresql" targetRuntime="MyBatis3DynamicSql">
        <property name="autoDelimitKeywords" value="false"/>

        <!-- Spring Data JDBC 注解插件：补 @Table / @Id / @Version -->
        <plugin type="com.jereh.tools.mybatis.plugin.SpringDataJdbcAnnotationPlugin" />

        <!-- 数据库连接（由 build.gradle.kts 注入） -->
        <jdbcConnection driverClass="org.postgresql.Driver"
                        connectionURL="${connection.url}"
                        userId="${connection.user}"
                        password="${connection.password}"/>

        <!-- 类型解析：TIMESTAMPTZ -> OffsetDateTime -->
        <javaTypeResolver>
            <property name="forceBigDecimals" value="false"/>
            <property name="useJSR310Types" value="true"/>
        </javaTypeResolver>

        <!-- Model 包：jdbc/model -->
        <javaModelGenerator targetPackage="com.jereh.tenant.jdbc.model"
                            targetProject="${generate.dir}"/>

        <!-- Mapper 包：jdbc/mapper -->
        <javaClientGenerator targetPackage="com.jereh.tenant.jdbc.mapper"
                             targetProject="${generate.dir}"/>

        <!-- 主表 -->
        <table tableName="tenant" domainObjectName="Tenant">
            <columnOverride column="created_at" javaType="java.time.OffsetDateTime"/>
            <columnOverride column="updated_at" javaType="java.time.OffsetDateTime"/>
        </table>

        <!-- 子表：联系人 -->
        <table tableName="tenant_contacts" domainObjectName="TenantContact">
            <generatedKey column="id" sqlStatement="JDBC" identity="true"/>
            <columnOverride column="created_at" javaType="java.time.OffsetDateTime"/>
            <columnOverride column="updated_at" javaType="java.time.OffsetDateTime"/>
        </table>
    </context>
</generatorConfiguration>
```

## Gradle 配置

`{name}-domain/build.gradle.kts`

```kotlin
plugins {
    id("com.jereh.spring.library")
    id("com.jereh.mybatis.codegen")
}

mybatisGenerator {
    properties.put(
        "connection.url",
        providers.gradleProperty("db.${name}.url").getOrElse(System.getenv("TENANT_DB_URL") ?: ""))
    properties.put(
        "connection.user",
        providers.gradleProperty("db.${name}.user").getOrElse(System.getenv("TENANT_DB_USER") ?: ""))
    properties.put(
        "connection.password",
        providers.gradleProperty("db.${name}.password").getOrElse(System.getenv("TENANT_DB_PASSWORD") ?: ""))
}

dependencies {
    implementation(project(":module:tenant:tenant-api"))
    implementation(deps.spring.boot.starter.jdbc)
    implementation(deps.mybatis.spring.boot.starter)
    implementation(deps.mybatis.dynamic.sql)
    runtimeOnly(deps.jdbc.postgresql)
    mybatisGenerator(deps.jdbc.postgresql)
}
```

`${generate.dir}` 由 `com.jereh.mybatis.codegen` 插件设为 `gen/main/mybatis/java/`，无需手填。

## 生成产物

```
{name}-domain/gen/main/mybatis/java/com/jereh/{name}/jdbc/
├── model/
│   ├── Tenant.java                 # @Table("tenant") + @Id
│   ├── TenantContact.java
│   └── ...
└── mapper/
    ├── TenantMapper.java           # MyBatis Dynamic SQL Mapper
    ├── TenantDynamicSqlSupport.java
    ├── TenantContactMapper.java
    └── ...
```

- 不手改 `gen/` 下任何文件。Schema 变了就改 Flyway 迁移 + 重新跑 MBG。
- 自定义插件保证 POJO 同时是 Spring Data JDBC 聚合 (`@Table` / `@Id` / `@Version`) 和 MyBatis 实体——一份 POJO 两个框架共用。

## 时序：Flyway 先，MBG 后

1. 写 Flyway 迁移到 `migration/{name}/`。
2. 在本地开发库执行 Flyway（启动 server 或 `./gradlew :module:{name}:{name}-domain:flywayMigrate`）。
3. 跑 MBG：`./gradlew :module:{name}:{name}-domain:mybatisGenerate`。
4. MBG 从已迁移的 schema 读出列，生成 POJO + Mapper。
5. 提交 Flyway SQL；`gen/` 目录是否入库由 module 自决（推荐入库以稳定 CI）。

## 常见错误

- 忘记 `SpringDataJdbcAnnotationPlugin`：生成的 POJO 没有 `@Table`，Spring Data JDBC 无法识别。
- `targetPackage` 用了 `model` / `mapper` 顶包（不带 `jdbc`）：和 MapStruct 输出、`{Module}Mapper` 命名冲突。
- 把凭据写进 `mybatis-generator.xml`：被提交到仓库。必须用 `${connection.*}` 占位符。
- 在 `gen/` 改了文件：下次 MBG 覆盖丢失。
- 多个 module 共用同一份 `mybatis-generator.xml`：表名 / 包名混乱。每个 module 各自一份。
- MBG 在 Flyway 之前跑：表不存在，生成失败。

## Acceptance 检查

- [ ] `targetRuntime="MyBatis3DynamicSql"`。
- [ ] 加载 `SpringDataJdbcAnnotationPlugin`。
- [ ] `targetPackage` 是 `com.jereh.{name}.jdbc.model` / `com.jereh.{name}.jdbc.mapper`。
- [ ] 连接信息由 Gradle property / 环境变量注入。
- [ ] 时间戳列用 `OffsetDateTime`。
- [ ] 生成的 POJO 编译通过、带 `@Table` / `@Id` 注解。
- [ ] Flyway 在 MBG 之前应用过；schema 与生成模型一致。
- [ ] `gen/` 目录无手改。
