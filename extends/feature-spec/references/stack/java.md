# Java 后端 适配包

> 本文件是 Java 后端(以 Spring 生态为主)的行业默认约定参考。

## 0. 如何使用 / 约定优先级

- 约定来源优先级遵循 `references/项目上下文指南.md` 第 3 节;本适配包只提供低于项目事实的行业默认规则。
- 本包列「常见约定/选项」,不强制唯一答案;具体用哪个由当前项目事实和经校验的 `PROJECT-CONTEXT.md` 确认。
- 进入实施/验证前,若项目主栈为 Java 后端,应加载并参考本文件。

---

## 1. 识别信号

- 构建文件:`pom.xml`(Maven);`build.gradle` / `build.gradle.kts` + `settings.gradle` / `gradle.properties`(Gradle);或 Wrapper 脚本 `mvnw` / `gradlew`。
- 依赖特征:`spring-boot-starter-*`、`org.springframework.*`、`jakarta.*` / `javax.*`。
- 目录特征:`src/main/java`、`src/main/resources`、`src/test/java`。

---

## 2. 构建与校验命令

| 用途 | 常见命令(用项目实际的) |
|---|---|
| 编译 | `./mvnw clean compile` / `./gradlew compileJava` |
| 打包 | `./mvnw clean package` / `./gradlew build` |
| 运行测试 | `./mvnw test` / `./gradlew test` |
| 单个测试类 | `./mvnw test -Dtest=XxxTest` / `./gradlew test --tests "*XxxTest"` |
| 覆盖率 | JaCoCo 插件,如 `./gradlew jacocoTestReport` 或 `./mvnw jacoco:report` |

---

## 3. 分层与命名

- 常见分层:`Controller` / `Service`(+`Impl`) / `Repository` · `Mapper` · `DAO` / `Entity` · `Domain` / `Config` / `Constant` / `Exception` / `Util`。
- 命名约定:
  - Controller 以 `Controller` 结尾;Service 接口以 `Service` 结尾,实现以 `ServiceImpl` 结尾。
  - 数据访问层后缀按项目约定:`Repository` / `Mapper` / `DAO`。
  - 数据载体后缀:`DTO` / `VO` / `BO` / `PO` 等,与项目既有保持一致。
- 文件后缀:`.java`;包路径采用反向域名(如 `com.example.xxx`)。

> 以 `PROJECT-CONTEXT.md` 记录的实际分层与命名为准。

---

## 4. 测试

- 框架:JUnit 5;断言可用 AssertJ 或 JUnit5 原生断言。
- Mock:Mockito(`@Mock` / `@InjectMocks` / `Mockito.mock`)。
- 集成测试:`@SpringBootTest`;数据库切片 `@DataJpaTest` / `@MybatisTest`;外部 HTTP 用 WireMock。
- Controller 测试:`@WebMvcTest` + MockMvc,或 `@SpringBootTest` + `MockMvc` / `TestRestTemplate`。
- 容器化依赖(数据库/中间件):Testcontainers。
- 目录:`src/test/java`;测试类 `XxxTest`,方法命名建议 `shouldXxxWhenYyy()`。
- 覆盖率:JaCoCo。

---

## 5. 数据访问

- ORM / 数据访问:JPA(Hibernate)/ MyBatis / Spring Data JDBC / R2DBC。
- 禁止手写与 ORM 职责重复的通用 SQL;多表查询优先抽取公共查询或视图逻辑。
- 数据库操作注意事务边界(`@Transactional`)。

---

## 6. 典型红线与陷阱

- **事务**:`@Transactional` 的传播/回滚边界、自调用失效、只读事务误用。
- **空安全**:`Optional`、`Objects.requireNonNull`;避免返回 `null` 集合。
- **并发**:`HashMap` 非线程安全、共享可变状态、`SimpleDateFormat` 非线程安全。
- **Lombok**:若项目使用,注意 `@Data` / `@Builder` 对序列化、`equals`/`hashCode` 的副作用;不为不使用 Lombok 的项目擅自引入。
- **敏感字段序列化**:密码、Token、身份证等加 `@JsonIgnore` 或脱敏,禁止明文序列化。
- **依赖**:不擅自引入新的外部依赖(属实施阶段红线,须用户确认)。

---

## 7. 一句话总结

以 Spring 生态默认分层与 JUnit / Mockito 测试为基线,优先复用项目既有实现,严守事务、空安全、敏感字段与依赖红线。
