# Schema Design

`module/{name}/{name}-spec/{name}.graphqls` 是 GraphQL schema 唯一来源。它定义读模型、输入、分页包装、枚举；`{name}-controller` 与 `{name}-client` 都从它生成代码。

## 关键决策

- **读操作优先**：列表、详情、关联加载、过滤分页放在 GraphQL。写操作放 OpenAPI，但 GraphQL 仍可暴露 `Mutation` 用于需要强字段选择的写入场景（按项目约定）。
- **类型拆分**：把持久实体按业务视图拆成多个类型。例如 `Tenant` 只放核心字段，`TenantDetail` 额外含 `contacts` / `settings`。避免一个类型塞入所有字段。
- **用 `input` 包过滤 / 排序**：避免长参数列表。`TenantFilter`、`TenantSort`。
- **分页用专用 `{Type}Page`**：字段固定为 `content / totalElements / totalPages / page / size`。
- **枚举用 `enum`**，值全大写 SNAKE（`ACTIVE`, `SUSPENDED`）。
- **`!` 只加在业务上保证非空的字段**。例如 `tenant(id: ID!)` 的 `id` 必传，但返回 `TenantDetail` 可为空（找不到时）。
- **所有公开类型和字段用 `"""` 写文档**，以便生成器产出 Javadoc / TS 注释。
- **跨表字段不直接联查 SQL**：schema 只管声明；N+1 由 DataFetcher 的 `@BatchMapping` 解决。

## 完整示例

`module/tenant/tenant-spec/tenant.graphqls`

```graphql
type Query {
  """根据 ID 查询租户详情"""
  tenant(id: ID!): TenantDetail

  """租户分页列表"""
  tenants(page: Int = 0, size: Int = 20): TenantPage!

  """租户审计日志"""
  tenantAuditLogs(tenantId: ID!, page: Int = 0, size: Int = 20): AuditLogPage!
}

type Mutation {
  """创建租户"""
  createTenant(input: CreateTenantInput!): Tenant!

  """更新租户"""
  updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!

  """停用租户"""
  suspendTenant(id: ID!): Tenant!

  """激活租户"""
  activateTenant(id: ID!): Tenant!
}

type Tenant {
  id: ID!
  name: String!
  code: String!
  status: TenantStatus!
  createdAt: String
  updatedAt: String
}

type TenantDetail {
  id: ID!
  name: String!
  code: String!
  status: TenantStatus!
  contacts: [Contact!]!
  settings: [Setting!]!
  createdAt: String
  updatedAt: String
}

type TenantPage {
  content: [Tenant!]!
  totalElements: Int!
  totalPages: Int!
  page: Int!
  size: Int!
}

type Contact {
  id: ID!
  name: String!
  phone: String
  email: String
  role: ContactRole!
  createdAt: String
}

type Setting {
  id: ID!
  key: String!
  value: String
  updatedAt: String
}

type AuditLog {
  id: ID!
  action: String!
  operator: String
  detail: String
  createdAt: String
}

type AuditLogPage {
  content: [AuditLog!]!
  totalElements: Int!
  totalPages: Int!
  page: Int!
  size: Int!
}

input CreateTenantInput {
  name: String!
  code: String!
}

input UpdateTenantInput {
  name: String
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
}

enum ContactRole {
  ADMIN
  TECHNICAL
}
```

## 查询文档

`module/tenant/tenant-spec/queries/tenant-page.graphql`

```graphql
query TenantPage($page: Int = 0, $size: Int = 20) {
  tenants(page: $page, size: $size) {
    content {
      id
      name
      code
      status
    }
    totalElements
    totalPages
    page
    size
  }
}
```

`tenant-by-id.graphql`

```graphql
query TenantById($id: ID!) {
  tenant(id: $id) {
    id
    name
    code
    status
    contacts {
      id
      name
      role
    }
    settings {
      key
      value
    }
  }
}
```

查询文档放在 `{name}-spec/queries/`，供服务端测试复用，也作为 TS 客户端 codegen 的 `documents` 来源。

## 命名约定

| 概念 | 命名 |
| --- | --- |
| Query | 动词 + 名词：`tenant`, `tenants`, `tenantAuditLogs` |
| Mutation | 动词 + 名词：`createTenant`, `suspendTenant` |
| 主类型 | `Tenant` |
| 详情类型 | `TenantDetail` |
| 分页类型 | `TenantPage` |
| Input | `CreateTenantInput`, `UpdateTenantInput`, `TenantFilter` |
| 枚举 | UPPER_SNAKE：`ACTIVE`, `TECHNICAL` |
| 字段 | camelCase |

## 字段选择策略

- 前端只查当前屏幕需要的字段。例如列表页不查 `contacts`，详情页按需展开。
- 日期 / 时间统一用 `String` 并在 schema 描述里说明格式（如 ISO-8601），前端统一格式化。
- 状态、角色等封闭集合用 enum；避免字符串满天飞。

## 常见错误

- 一个类型把所有字段铺平，前端列表也 over-fetch：拆 `Tenant` / `TenantDetail`。
- 用位置参数替代 `input`：导致扩展困难。
- `[Contact]!` 表示 list 可空但元素可空；Jereh 推荐 `[Contact!]!`（list 非空、元素也非空）。
- 类型或字段没有 `"""` 文档：生成的 Javadoc / TS 类型无说明。
- 把 volatile 运行时状态混入持久类型：另建类型，让客户端显式选择。
- Query resolver 里做 mutation：写操作进 `Mutation`。
- GraphQL 里做复杂跨域事务：写操作应走 OpenAPI / 领域服务。

## Acceptance 检查

- [ ] schema 文件在 `{name}-spec/{name}.graphqls`。
- [ ] 所有公开类型和字段有 `"""` 文档。
- [ ] 过滤 / 复杂参数用 `input`。
- [ ] 分页返回 `{Type}Page`。
- [ ] 枚举用于封闭值集合。
- [ ] nullable 语义与数据模型一致。
- [ ] schema 校验通过且 codegen 无错。
