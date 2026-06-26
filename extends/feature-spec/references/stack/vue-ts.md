# 前端(TypeScript + Vue)适配包

> 本文件是 TypeScript + Vue(以 Vue 3 / Vite 生态为主)前端的行业默认约定参考。

## 0. 如何使用 / 约定优先级

- 约定来源优先级遵循 `references/项目上下文指南.md` 第 3 节;本适配包只提供低于项目事实的行业默认规则。
- 本包列「常见选项」,不指定唯一答案;具体用哪个由当前项目事实和经校验的 `PROJECT-CONTEXT.md` 确认。
- 进入实施/验证前,若项目主栈为本栈,应加载并参考本文件。

---

## 1. 识别信号

- 构建文件 / 包管理:`package.json`、`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`;构建工具 Vite(`vite.config.ts`)、Vue CLI(`vue.config.js`)、Nuxt(`nuxt.config.ts`)。
- 依赖特征:`vue`(及 `@vue/*`)、`vite`、`typescript`;状态 `pinia` / `vuex`;UI `element-plus` / `ant-design-vue` / `naive-ui`。
- 目录特征:`src/` 下 `components` / `views`·`pages`、`composables`·`hooks`、`stores`、`api`·`services`、`router`、`assets`;`.vue` / `.ts` / `.tsx` 文件。

---

## 2. 构建与校验命令

> 以 `package.json` 的 `scripts` 为准;包管理器用锁文件对应的那个(npm / pnpm / yarn)。

| 用途 | 常见命令 |
|---|---|
| 安装依赖 | `npm install` / `pnpm install` / `yarn` |
| 开发 / 构建 | `npm run dev` / `npm run build` |
| 运行测试 | `npm run test` / `vitest` / `jest` |
| E2E / 浏览器验证 | `npm run test:e2e` / `pnpm test:e2e` / `npx playwright test` / `npx cypress run` / Playwright MCP |
| 类型检查 | `vue-tsc --noEmit` / `tsc --noEmit` |
| lint / 格式化 | `eslint .` / `npm run lint`;`prettier` |

---

## 3. 分层与命名

- 常见分层:`components`(组件)/ `views`·`pages`(页面)/ `composables`·`hooks`(组合式逻辑)/ `stores`(状态)/ `api`·`services`(接口)/ `router`/ `utils`/ `types`。
- 命名约定:组件文件 PascalCase(`UserCard.vue`);组合式函数 `useXxx`;store `useXxxStore`;接口模块 `xxxApi` / `xxxService`。
- 文件后缀:`.vue` / `.ts` / `.tsx`。

> 脚手架差异大,以 `PROJECT-CONTEXT.md` 记录的实际分层为准。

---

## 4. 测试

- 框架:Vitest(Vite 项目首选)或 Jest。
- 组件测试:Vue Test Utils(`@vue/test-utils`);E2E / 浏览器验证:Playwright / Cypress / Playwright MCP。
- 涉及页面展示或交互时,强制验证规则见 `references/AI代码生成约束.md`;本节只提供 Vue + TypeScript 项目的常见工具和命令参考。
- Mock:`vi.mock`(Vitest)/ `jest.mock`;接口 Mock:MSW。
- 目录:`tests/` 或与源码同级 `*.spec.ts` / `*.test.ts`。
- 覆盖率:Vitest / Jest 内置 `--coverage`。

---

## 5. 数据或状态访问

- 状态管理:Pinia(Vue3 首选)/ Vuex;组合式 `ref` / `reactive` 承载局部状态。
- 接口请求:axios / fetch,封装在 `api` / `services`,统一处理 loading、错误、拦截器与鉴权。

---

## 6. 典型红线与陷阱

- **XSS**:避免 `v-html` 渲染未净化数据;用户输入需转义。
- **类型安全**:`tsconfig` 启用 `strict`;避免 `any` 泛滥,必要时用 `unknown` + 类型守卫。
- **响应式陷阱**:解构 `reactive` 会丢响应式(用 `toRefs`);`ref` 在模板自动解包,但 JS 中需 `.value`。
- **构建体积**:UI 库/图标按需引入;路由懒加载。
- **安全**:Token 存储位置(localStorage 有 XSS 暴露风险)、接口鉴权;密钥/敏感信息不入前端代码或仓库。

---

## 7. 一句话总结

以 Vite + Vue3 + TypeScript 为基线,分层聚焦组件/组合式/状态/接口,严守 XSS、类型安全、响应式与密钥红线。
