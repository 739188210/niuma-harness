# Web Integration

`{name}-ui` 是基于 `{name}-client` TypeScript 客户端的 Vue 3 业务组件库。`{name}-center-web` 用 `{name}-ui` 的 composables 构建页面。整个链路：spec → 生成 TS 客户端 → composable 封装 → Vue 组件消费 → Vite 编译。

## 关键决策

- **`{name}-ui` 只依赖 `@jereh/{name}-client`**，不依赖 `{name}-domain` / `{name}-controller`。
- **基础 URL 来自环境变量**：`import.meta.env.VITE_{NAME}_API_BASE_URL`，本地默认空字符串（走同源代理）。
- **composable 一次实例化 API**：`new DefaultApi({ basePath })`，module 顶层 const。
- **State 用 Vue 的 `ref` / `reactive`**，不引入 Apollo / TanStack Query / Pinia 之类，除非项目 ui 包已经统一了某个方案。
- **加载 / 错误 / 空态显式处理**。
- **`{name}-center-web` 仅放 page-level views**，可复用组件下沉到 `{name}-ui`。

## composable 示例

`module/tenant/tenant-ui/src/composables/useTenant.ts`

```typescript
import type {
  AddContactRequest,
  ContactResponse,
  CreateTenantRequest,
  SettingResponse,
  TenantDetailResponse,
  TenantPage,
  TenantResponse,
  UpdateTenantRequest,
} from "@jereh/tenant-client";
import { type Configuration, DefaultApi } from "@jereh/tenant-client";
import { ref } from "vue";

export type {
  AddContactRequest,
  ContactResponse,
  CreateTenantRequest,
  SettingResponse,
  TenantDetailResponse,
  TenantPage,
  TenantResponse,
  UpdateTenantRequest,
};

const basePath = import.meta.env.VITE_TENANT_API_BASE_URL || "";
const api = new DefaultApi({ basePath } as Configuration);

export function useTenant() {
  const tenants = ref<TenantResponse[]>([]);
  const page = ref({ totalElements: 0, totalPages: 0, page: 0, size: 20 });
  const loading = ref(false);
  const detail = ref<TenantDetailResponse | undefined>(undefined);

  async function list(params?: { page?: number; size?: number }) {
    loading.value = true;
    try {
      const res = await api.listTenants(params?.page ?? 0, params?.size ?? 20);
      const data = res.data;
      tenants.value = data.content ?? [];
      page.value = {
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        page: data.page ?? 0,
        size: data.size ?? 20,
      };
    } finally {
      loading.value = false;
    }
  }

  async function get(id: string) {
    const res = await api.getTenant(id);
    detail.value = res.data;
    return detail.value;
  }

  async function create(req: CreateTenantRequest) {
    const res = await api.createTenant(req);
    return res.data;
  }

  async function update(id: string, req: UpdateTenantRequest) {
    const res = await api.updateTenant(id, req);
    return res.data;
  }

  async function addContact(id: string, req: AddContactRequest) {
    const res = await api.addContact(id, req);
    return res.data;
  }

  return { tenants, page, loading, detail, list, get, create, update, addContact };
}
```

## 组件示例

`module/tenant/tenant-ui/src/components/TenantList.vue`

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useTenant } from "../composables/useTenant";

const { tenants, page, loading, list } = useTenant();

onMounted(() => list({ page: 0, size: 20 }));

async function changePage(next: number) {
  await list({ page: next, size: page.value.size });
}
</script>

<template>
  <t-loading :loading="loading">
    <t-list v-if="tenants.length > 0">
      <t-list-item v-for="tenant in tenants" :key="tenant.id">
        {{ tenant.name }} <span class="text-gray-500">({{ tenant.code }})</span>
      </t-list-item>
    </t-list>
    <t-empty v-else description="暂无租户" />

    <t-pagination
      v-model:current="page.page"
      :total="page.totalElements"
      :page-size="page.size"
      @current-change="changePage"
    />
  </t-loading>
</template>
```

> 用 TDesign Vue Next 内建的 loading / empty / pagination，不要在每个 composable 里重写状态机。

## Page 装配

`server/tenant-center/tenant-center-web/src/views/TenantListView.vue`

```vue
<script setup lang="ts">
import { TenantList } from "@jereh/tenant-ui";
</script>

<template>
  <main class="p-6">
    <h1 class="text-xl font-semibold mb-4">租户列表</h1>
    <TenantList />
  </main>
</template>
```

页面只做布局、菜单、面包屑；业务组件全来自 `{name}-ui`。

## 环境变量与开发代理

`{name}-center-web/.env.development`

```
VITE_TENANT_API_BASE_URL=
```

`vite.config.ts` 配开发期反向代理：

```ts
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: process.env.TENANT_BACKEND_URL || "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

生产环境的 base URL 由网关接管；前端编译产物里**不出现具体 host**。

## 常见错误

- 在 composable / 组件里手写 `fetch` 或 `axios.get('/api/tenants')`：失去类型安全，spec 改了发现不了。统一用生成客户端。
- 把 base URL 硬编 `http://localhost:8080`：换环境就改代码。改用 `VITE_*_API_BASE_URL`。
- 每个组件 `new DefaultApi(...)`：开销小但语义乱。composable 顶层一次实例化。
- 把 `{name}-ui` 拿去引用 `{name}-domain`：违反依赖方向。
- composable 直接 `throw err`：UI 层全断。用 `try/finally` 包住，错误状态显式存到 `ref`。
- 把 page 级 `{name}-center-web/src/views/*` 的可复用块留在那里：组件下沉到 `{name}-ui` 后才能跨页面 / 跨 center 复用。

## Acceptance 检查

- [ ] `{name}-ui` `package.json` 依赖 `"@jereh/{name}-client": "workspace:*"`。
- [ ] composable 顶层一次实例化 `DefaultApi`。
- [ ] base URL 走 `import.meta.env.VITE_*`，无 hardcode host。
- [ ] 组件用 TDesign Vue Next 的 loading / empty / error 状态。
- [ ] 业务组件在 `{name}-ui/src/components/`，page 在 `{name}-center-web/src/views/`。
- [ ] 无手写 fetch / axios 调用。
- [ ] 类型来自 `@jereh/{name}-client` re-export，组件不直接 import 内部生成路径以外的子模块。
