# DataSource Configuration

Jereh 每个 `{name}-domain` 模块拥有独立 DataSource、TransactionManager、Flyway 和 Repository 配置。三件套：`{Module}DataSourceConfiguration` + `{Module}RepositoryConfiguration` + `{Module}FlywayConfiguration`。

## 关键决策

- 一个 module 一个数据源：`spring.datasource.{name}` 命名空间。
- 所有 bean 带 `@Qualifier("{name}")` 与 `@Bean(defaultCandidate = false)`，避免和 Spring Boot 默认自动装配的 primary DataSource 冲突。
- `JdbcAggregateTemplate` 通过 `MyBatisDataAccessStrategy.createCombinedAccessStrategy(...)` 组合 MyBatis + JDBC，同一个 template 既能跑 `CrudRepository`，service 也能直接用 MyBatis Mapper。
- `@EnableJdbcRepositories` 配 `jdbcAggregateOperationsRef` + `transactionManagerRef` 指向本 module 的 bean；`@MapperScan` 配 MyBatis Mapper 包。
- 三个配置类全部通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 注册。

## DataSource 配置示例

`{name}-domain/src/main/java/com/jereh/{name}/configuration/{Module}DataSourceConfiguration.java`

```java
package com.jereh.tenant.configuration;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcOperations;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;

@Configuration(proxyBeanMethods = false)
public class TenantDataSourceConfiguration {

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    @ConfigurationProperties("spring.datasource.tenant")
    public DataSourceProperties tenantDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public DataSource tenantDataSource(@Qualifier("tenant") DataSourceProperties properties) {
        return properties.initializeDataSourceBuilder().build();
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public JdbcTemplate tenantJdbcTemplate(@Qualifier("tenant") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public NamedParameterJdbcOperations tenantNamedParameterJdbcOperations(@Qualifier("tenant") DataSource dataSource) {
        return new NamedParameterJdbcTemplate(dataSource);
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public PlatformTransactionManager tenantTransactionManager(@Qualifier("tenant") DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
```

## Repository 配置示例

`{name}-domain/src/main/java/com/jereh/{name}/configuration/{Module}RepositoryConfiguration.java`

```java
package com.jereh.tenant.configuration;

import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.SqlSessionTemplate;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.data.jdbc.core.convert.*;
import org.springframework.data.jdbc.core.dialect.DialectResolver;
import org.springframework.data.jdbc.core.dialect.JdbcDialect;
import org.springframework.data.jdbc.core.mapping.JdbcMappingContext;
import org.springframework.data.jdbc.mybatis.MyBatisDataAccessStrategy;
import org.springframework.data.jdbc.repository.config.EnableJdbcRepositories;
import org.springframework.data.jdbc.repository.config.JdbcConfiguration;
import org.springframework.data.relational.core.mapping.NamingStrategy;
import org.springframework.data.relational.core.mapping.RelationalPersistentProperty;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcOperations;

import javax.sql.DataSource;
import java.util.Collections;
import java.util.Optional;

@Configuration(proxyBeanMethods = false)
@EnableJdbcRepositories(
        basePackages = "com.jereh.tenant.repository",
        jdbcAggregateOperationsRef = "tenantJdbcAggregateTemplate",
        transactionManagerRef = "tenantTransactionManager"
)
@MapperScan(
        basePackages = "com.jereh.tenant.jdbc.mapper",
        sqlSessionFactoryRef = "tenantSqlSessionFactory"
)
@DependsOn("tenantFlyway")
public class TenantRepositoryConfiguration {

    @Qualifier("tenant")
    @Bean(name = "tenantSqlSessionFactory", defaultCandidate = false)
    public SqlSessionFactory tenantSqlSessionFactory(@Qualifier("tenant") DataSource dataSource) throws Exception {
        SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        org.apache.ibatis.session.Configuration config = new org.apache.ibatis.session.Configuration();
        config.setMapUnderscoreToCamelCase(true);
        factoryBean.setConfiguration(config);
        return factoryBean.getObject();
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public JdbcDialect tenantJdbcDialect(@Qualifier("tenant") NamedParameterJdbcOperations operations) {
        return DialectResolver.getDialect(operations.getJdbcOperations());
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public JdbcCustomConversions tenantJdbcCustomConversions(@Qualifier("tenant") JdbcDialect dialect) {
        return JdbcConfiguration.createCustomConversions(dialect, Collections.emptyList());
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public JdbcMappingContext tenantJdbcMappingContext(
            Optional<NamingStrategy> namingStrategy,
            @Qualifier("tenant") JdbcCustomConversions customConversions) {
        NamingStrategy strategy = namingStrategy.orElseGet(() -> new NamingStrategy() {
            @Override
            public String getColumnName(RelationalPersistentProperty property) {
                return property.getName().replaceAll("([a-z])([A-Z]+)", "$1_$2").toLowerCase();
            }

            @Override
            public String getTableName(Class<?> type) {
                return type.getSimpleName().toLowerCase();
            }
        });
        JdbcMappingContext mappingContext = new JdbcMappingContext(strategy);
        mappingContext.setSimpleTypeHolder(customConversions.getSimpleTypeHolder());
        return mappingContext;
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public JdbcConverter tenantJdbcConverter(
            @Qualifier("tenant") JdbcMappingContext mappingContext,
            @Qualifier("tenant") NamedParameterJdbcOperations operations,
            @Lazy @Qualifier("tenant") DataAccessStrategy dataAccessStrategy,
            @Qualifier("tenant") JdbcCustomConversions conversions,
            @Qualifier("tenant") JdbcDialect dialect) {
        return JdbcConfiguration.createConverter(
                mappingContext, operations, (RelationResolver) dataAccessStrategy, conversions, dialect);
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public DataAccessStrategy tenantDataAccessStrategy(
            @Qualifier("tenant") JdbcMappingContext mappingContext,
            @Qualifier("tenant") JdbcConverter converter,
            @Qualifier("tenant") NamedParameterJdbcOperations operations,
            @Qualifier("tenant") SqlSessionFactory sqlSessionFactory,
            @Qualifier("tenant") JdbcDialect dialect) {
        SqlSession sqlSession = new SqlSessionTemplate(sqlSessionFactory);
        return MyBatisDataAccessStrategy.createCombinedAccessStrategy(
                mappingContext, converter, operations, sqlSession, dialect, QueryMappingConfiguration.EMPTY);
    }

    @Qualifier("tenant")
    @Bean(defaultCandidate = false)
    public JdbcAggregateTemplate tenantJdbcAggregateTemplate(
            ApplicationContext applicationContext,
            @Qualifier("tenant") JdbcMappingContext mappingContext,
            @Qualifier("tenant") JdbcConverter converter,
            @Qualifier("tenant") DataAccessStrategy dataAccessStrategy) {
        return new JdbcAggregateTemplate(applicationContext, mappingContext, converter, dataAccessStrategy);
    }
}
```

## AutoConfiguration 注册

`{name}-domain/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`

```
com.jereh.tenant.configuration.TenantDataSourceConfiguration
com.jereh.tenant.configuration.TenantFlywayConfiguration
com.jereh.tenant.configuration.TenantRepositoryConfiguration
```

server 端的 `application.yml`：

```yaml
spring:
  datasource:
    tenant:
      url: ${TENANT_DB_URL}
      username: ${TENANT_DB_USER}
      password: ${TENANT_DB_PASSWORD}
```

凭据通过环境变量或外部 secret 注入，不写在配置文件里。

## 常见错误

- 缺 `defaultCandidate = false`：与 Spring Boot 自动装配的 primary DataSource 冲突，导致两个 module 共用同一 DataSource。
- `JdbcConverter` 和 `DataAccessStrategy` 互相循环依赖：必须给 `dataAccessStrategy` 加 `@Lazy`。
- 忘记 `@DependsOn("{name}Flyway")`：Repository 在 schema 还没建好时初始化，启动失败。
- `JdbcAggregateTemplate` 直接走默认 bean：跨域读到别人的数据。所有传入 bean 都要带 `@Qualifier("{name}")`。
- `@MapperScan` 与 `@EnableJdbcRepositories` 包路径写错：MyBatis 找不到 Mapper 或 Repository 找错。

## Acceptance 检查

- [ ] 三个 `@Configuration` 类全部带 `proxyBeanMethods = false`。
- [ ] 所有 bean 带 `@Qualifier("{name}")` 与 `defaultCandidate = false`。
- [ ] `DataAccessStrategy` 通过 `MyBatisDataAccessStrategy.createCombinedAccessStrategy(...)` 构造。
- [ ] `@EnableJdbcRepositories` 的 `jdbcAggregateOperationsRef` / `transactionManagerRef` 指向 module 自己的 bean。
- [ ] `@MapperScan` 指向 `com.jereh.{name}.jdbc.mapper`。
- [ ] `META-INF/spring/...AutoConfiguration.imports` 列出三个配置类。
- [ ] `application.yml` 用 env 变量注入凭据。
