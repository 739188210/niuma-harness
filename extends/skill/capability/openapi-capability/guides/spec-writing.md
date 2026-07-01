# OpenAPI Spec Writing

Jereh `{name}-spec/{name}.yaml` 是 module 对外的唯一 API 契约。OpenAPI 覆盖**写操作 + 单表 CRUD + 简单读**；复杂查询、联表、分页过滤走 GraphQL。

## 关键决策

- **OpenAPI 3.1.0**。
- **`operationId` 必须有且全局唯一**，camelCase 动名词。OpenAPI Generator 直接用它做方法名。
- **不使用 `tags`**，或仅在跨大类时使用：默认所有路径都生成到 `DefaultApi`，避免无意义的 tag-per-operation 切割。需要切就给整组路径加同一个 tag，并打开 `useTags=true`，具体配置在 controller 生成指南中说明。
- **`components/schemas` 三种模型**：`{Name}Request` / `{Name}Response` / `{Name}Page`。Command 不进 OpenAPI（Command 是 `{name}-api/dto` 的内部 DTO）。
- **请求模型用 `Required` array 显式声明必填**；可空字段不进 required。
- **错误响应统一**：项目级错误模型 + 标准 status 码（400/401/403/404/409/422/500）。
- **路径形式 `/api/{resource}` 复数小写**。

## 完整示例

`module/tenant/tenant-spec/tenant.yaml`

```yaml
openapi: 3.1.0
info:
  title: Tenant API
  description: 租户管理服务 API
  version: 1.0.0

paths:
  /api/tenants:
    post:
      operationId: createTenant
      summary: 创建租户
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTenantRequest'
      responses:
        '201':
          description: 创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TenantResponse'
        '409':
          description: 租户编码冲突

    get:
      operationId: listTenants
      summary: 租户列表
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 0 }
        - name: size
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: 分页结果
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TenantPage'

  /api/tenants/{id}:
    get:
      operationId: getTenant
      summary: 租户详情
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: 租户详情
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TenantDetailResponse'
        '404':
          description: 租户不存在

    patch:
      operationId: updateTenant
      summary: 更新租户
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTenantRequest'
      responses:
        '200':
          description: 更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TenantResponse'

  /api/tenants/{id}/contacts:
    post:
      operationId: addContact
      summary: 添加联系人
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddContactRequest'
      responses:
        '201':
          description: 创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContactResponse'

components:
  schemas:
    CreateTenantRequest:
      type: object
      properties:
        name: { type: string, maxLength: 128 }
        code: { type: string, maxLength: 64 }
      required: [name, code]

    UpdateTenantRequest:
      type: object
      properties:
        name: { type: string, maxLength: 128 }
        code: { type: string, maxLength: 64 }

    AddContactRequest:
      type: object
      properties:
        name:  { type: string }
        phone: { type: string }
        email: { type: string, format: email }
      required: [name]

    TenantResponse:
      type: object
      properties:
        id:        { type: string }
        name:      { type: string }
        code:      { type: string }
        status:    { type: string, enum: [PENDING, ACTIVE, SUSPENDED] }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
      required: [id, name, code, status]

    ContactResponse:
      type: object
      properties:
        id:    { type: integer, format: int64 }
        name:  { type: string }
        phone: { type: string }
        email: { type: string }

    TenantDetailResponse:
      allOf:
        - $ref: '#/components/schemas/TenantResponse'
        - type: object
          properties:
            contacts: { type: array, items: { $ref: '#/components/schemas/ContactResponse' } }
            settings: { type: array, items: { $ref: '#/components/schemas/SettingResponse' } }

    SettingResponse:
      type: object
      properties:
        key:       { type: string }
        value:     { type: string }
        updatedAt: { type: string, format: date-time }

    TenantPage:
      type: object
      properties:
        content:       { type: array, items: { $ref: '#/components/schemas/TenantResponse' } }
        totalElements: { type: integer, format: int64 }
        totalPages:    { type: integer }
        page:          { type: integer }
        size:          { type: integer }
```

## 命名约定

| 概念 | 命名 |
| --- | --- |
| 请求体 | `{Name}Request`（`CreateTenantRequest` / `UpdateTenantRequest`） |
| 响应体 | `{Name}Response`（`TenantResponse` / `ContactResponse`） |
| 详情响应（含关联） | `{Name}DetailResponse` |
| 分页响应 | `{Name}Page` |
| 路径 | `/api/{resource-plural-kebab}` |
| operationId | `verbResource`（`createTenant` / `listTenants` / `addContact`） |
| 枚举值 | UPPER_SNAKE（`PENDING`, `ACTIVE`） |

## Request vs Command 的关系

| 层 | 名称 | 谁定义 |
| --- | --- | --- |
| HTTP 入参 | `CreateTenantRequest` | OpenAPI yaml（生成在 `{name}-controller/gen/.../model`） |
| 应用层入参 | `CreateTenantCommand` | 手写在 `{name}-api/dto/` |

Controller 把 `*Request` 拆成 `*Command` 调用 UseCase。两者结构经常相同，但**不要共用同一个类**：OpenAPI 模型可以随 spec 演进；Command 表达业务意图，命名更稳定。`{name}-api` 不能依赖 `{name}-controller` 的生成包。

## 版本管理

- `info.version` 跟随 module 版本。
- 破坏性变更：新增 path 而非修改旧 path，旧 path 标 `deprecated: true`，等所有 client 升级后再删。
- `tenant.yaml` 与 `{name}-api/CHANGELOG`（如有）同步更新。

## 常见错误

- 缺 `operationId`：方法名变成 `pet_post`，难读且不稳定。
- request / response 两个模型混用（用一个 schema 既作入参又作出参）：字段约束需要分别声明的场景下灾难。
- 必填字段不进 `required`：生成的 Java DTO 字段全可 null，业务必填靠不住。
- 把 `{name}-api/dto/Command` 暴露成 OpenAPI schema：让 controller 包穿透了 API 层。
- 用 `additionalProperties: true` 兜底未知字段：失去契约约束。
- OpenAPI 写复杂查询 (`/api/tenants/search?nameContains=...&status=...&joinXxx=...`)：这种场景换 GraphQL。

## Acceptance 检查

- [ ] `openapi: 3.1.0`。
- [ ] 每个 operation 有唯一 `operationId`。
- [ ] 请求体 / 响应体 schema 在 `components/schemas`，不内联。
- [ ] 必填字段在 `required`。
- [ ] 枚举用 `enum` 显式列出。
- [ ] 分页响应统一为 `{Name}Page`。
- [ ] 路径 / 模型命名遵循上述约定。
- [ ] OpenAPI 校验工具通过（`openapi-generator-cli validate` 等）。
