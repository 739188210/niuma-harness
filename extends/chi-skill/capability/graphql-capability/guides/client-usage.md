# Client Usage

`{name}-ui` 消费 GraphQL 生成的 TypeScript 客户端。Jereh 不引入 Apollo Client；用 `graphql-request` 或一个薄 fetch 封装运行生成的 `*Document`。生成的 `*.ts` 同时提供：

- 类型（`TenantPageQuery`, `TenantPageQueryVariables`）
- 文档对象（`TenantPageDocument`）

## 关键决策

- 依赖 `@jereh/{name}-client` 的 GraphQL 子路径：
  - types：`@jereh/{name}-client/graphql/types/graphql`
  - documents：`@jereh/{name}-client/graphql/queries/tenant-page`
- composable 顶层创建一次 `GraphQLClient`（封装 `graphql-request` 或 fetch）。
- base URL 走 `import.meta.env.VITE_{NAME}_GRAPHQL_BASE_URL`，本地默认空字符串走同源 `/graphql`。
- Vue 组件负责展示；加载、错误、空态交给 TDesign。

## 薄客户端封装

`module/tenant/tenant-ui/src/composables/useGraphQL.ts`

```typescript
import { GraphQLClient } from "graphql-request";

const endpoint = import.meta.env.VITE_TENANT_GRAPHQL_BASE_URL || "/graphql";

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: () => ({
    // 网关或本地代理注入 token
  }),
});
```

## composable 示例

`module/tenant/tenant-ui/src/composables/useTenantGraphQL.ts`

```typescript
import { TenantPageDocument } from "@jereh/tenant-client/graphql/queries/tenant-page";
import type {
  TenantPageQuery,
  TenantPageQueryVariables,
} from "@jereh/tenant-client/graphql/types/graphql";
import { ref } from "vue";
import { graphqlClient } from "./useGraphQL";

export function useTenantPage() {
  const data = ref<TenantPageQuery | undefined>(undefined);
  const loading = ref(false);
  const error = ref<unknown>(null);

  async function fetch(page = 0, size = 20) {
    loading.value = true;
    error.value = null;
    try {
      data.value = await graphqlClient.request<TenantPageQuery, TenantPageQueryVariables>(
        TenantPageDocument,
        { page, size }
      );
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, fetch };
}
```

## 组件示例

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useTenantPage } from "../composables/useTenantGraphQL";

const { data, loading, error, fetch } = useTenantPage();

onMounted(() => fetch(0, 20));
</script>

<template>
  <t-loading :loading="loading">
    <t-alert v-if="error" theme="error" message="加载失败" />

    <t-list v-else-if="data?.tenants.content?.length">
      <t-list-item v-for="tenant in data.tenants.content" :key="tenant.id">
        {{ tenant.name }} — {{ tenant.code }}
      </t-list-item>
    </t-list>

    <t-empty v-else description="暂无租户" />
  </t-loading>
</template>
```

## 按需字段选择

GraphQL 优势是前端控制字段。若列表和详情字段不同，分别定义两个查询文档：

- `tenant-page.graphql`：列表只要 id / name / code / status。
- `tenant-by-id.graphql`：详情再取 contacts / settings / audit logs。

composable 根据场景 import 不同 document。不要在一个大 query 里全部取回。

## 分页与过滤

```typescript
async function list(filter?: TenantFilter, page = 0, size = 20) {
  data.value = await graphqlClient.request<TenantListQuery, TenantListQueryVariables>(
    TenantListDocument,
    { filter, page, size }
  );
}
```

Filter 通过 schema 的 `input TenantFilter` 定义；input 和 variables 类型同步生成。

## 环境变量

`{name}-center-web/.env.development`

```
VITE_TENANT_GRAPHQL_BASE_URL=
```

`vite.config.ts` 开发代理：

```ts
export default defineConfig({
  server: {
    proxy: {
      "/graphql": {
        target: process.env.TENANT_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

生产环境由网关统一暴露 `/graphql`；前端产物不出现 host。

## 常见错误

- 用 inline GraphQL 字符串代替生成的 `*Document`：spec 改了检测不到。
- 引入 Apollo Client：Jereh 技术栈是 Vue 3 + TDesign，无需 Apollo 的 cache/normalization。
- 在组件里 `new GraphQLClient(...)`：应在 composable 顶层 / `useGraphQL.ts` 模块级。
- 不处理 `error` 和 `loading` 状态：TDesign 组件需显式传入。
- 把 GraphQL 查询文档写在 `{name}-ui` 里：其他 client 无法复用，应放在 `{name}-spec/queries/`。
- 用 GraphQL mutation 做所有写入：Jereh 约定写操作走 OpenAPI，读走 GraphQL；若项目明确要求 GraphQL mutation，保持 schema 与 OpenAPI 一致即可。

## Acceptance 检查

- [ ] composable 使用生成的 `*Document` 和 typed variables。
- [ ] `graphql-request`（或团队选定的薄客户端）在 `{name}-ui` `dependencies`。
- [ ] GraphQL endpoint 走 `import.meta.env.VITE_*_GRAPHQL_BASE_URL`。
- [ ] 组件处理 loading / error / empty 三态。
- [ ] 查询文档来自 `{name}-spec/queries/`，共享给 TS 客户端。
- [ ] 分页 / 过滤用 `input` 类型。
- [ ] 不同场景使用不同 `.graphql` 文档，避免 over-fetching。
