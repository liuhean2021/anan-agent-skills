# §1 定位与适用范围 + §2 接手项目：第一天做什么

> 来源：frontend-ai-coding-best-practices.md §1–§2
> 适用：接手存量前端项目的第一天

---

## 1. 定位与适用范围

本文档面向这种场景：

- 你接手了一个**存量前端项目**（任何框架或无框架）
- 项目**没有 E2E 测试、没有 data-testid、没有视觉回归基线**
- 你需要**修改已有页面 UI** 和**新增页面**
- 你打算用 **AI coding 工具**（Claude Code）提升效率

核心原则：

- **测试先行**：改代码之前先写测试，用测试锁住现有行为，确保改动不引入需求外 bug
- **最小改动**：只改需求要求的部分，锁住其他层，降低副作用
- **存量不补债，增量高标准，逐步建防线**

### 1.1 框架速查：术语映射

本文档使用通用术语。对应到各框架：

| 通用术语 | Vue | React | Angular | Svelte |
|---------|-----|-------|---------|--------|
| 组件文件 | `.vue` | `.tsx` / `.jsx` | `.component.ts` + `.html` | `.svelte` |
| 模板层 | `<template>` | JSX return | `.component.html` | `{#if}` / `{#each}` |
| 逻辑层 | `<script>` / `<script setup>` | 组件函数体 / hooks | `.component.ts` | `<script>` |
| 样式层 | `<style scoped>` | CSS Modules / styled-components | `styleUrls` / `::ng-deep` | `<style>` (默认 scoped) |
| 状态管理 | Pinia / Vuex | Redux / Zustand / Jotai | NgRx / Signal Store | Svelte Store |
| 路由 | vue-router | react-router / Next.js 文件路由 | @angular/router | SvelteKit 文件路由 |
| UI 库 | Element Plus / Ant Design Vue | Ant Design / MUI / shadcn/ui | Angular Material / PrimeNG | Skeleton / shadcn-svelte |
| 深穿透样式 | `::v-deep` / `:deep()` | 无（CSS Modules 天然隔离） | `::ng-deep`（已废弃） | `:global()` |

> 后文中提到"模板层"、"逻辑层"、"样式层"时，请对应到你项目的实际框架。

---

## 2. 接手项目：第一天做什么

### 2.1 让 AI 生成项目画像

在项目根目录启动 Claude Code，执行：

```
读取以下文件，生成项目画像：
- package.json（依赖、脚本命令）
- 构建配置文件（vite.config / next.config / angular.json / webpack.config 等）
- 应用启动入口（src/main.ts 或 main.js / main.tsx — 插件注册、全局配置）
- 根组件（src/App.vue / src/App.tsx / src/_app.tsx — 顶层布局、全局 Provider）
- 路由配置或 pages/ 目录（路由结构 = 页面清单）
- 全局布局目录（src/layout / layouts — 页面框架结构）
- 状态管理目录（store / stores / 等）
- API 层目录（api / services / 等）
- 组件目录结构（components/）
- 任意一个典型页面文件（代码风格样本）

输出：
1. 技术栈清单（框架版本、UI 库、CSS 方案、构建工具）
2. 页面清单（路由 path → 文件路径）
3. 组件层次（全局组件 / 业务组件 / 页面私有组件）
4. 样式组织方式（全局 / scoped / CSS Modules / Tailwind / CSS-in-JS）
5. 状态管理方案
6. API 调用方式（fetch / axios 封装、拦截器）
7. 代码风格特征（TypeScript / JavaScript、类组件 / 函数式 / Options API 等）
```

### 2.2 画像写入 CLAUDE.md

⚠️ **先输出画像内容草稿给用户确认，等用户明确回复确认后，再写入文件。**

将项目画像写入 `CLAUDE.md`（或 `AGENTS.md`，二选一且全项目唯一），作为项目画像唯一事实源（SSOT）。后续 prompt 模板只引用该文件，不重复内嵌完整画像，避免双重维护：

```markdown
# Project Profile

## 技术栈
- [框架] + [语言] + [构建工具]
- [UI 库]
- [状态管理]
- [CSS 方案]
- [HTTP 客户端及封装位置]

## 关键约定
- [组件风格：函数式 / 类 / Options API / Composition API...]
- [全局样式变量位置]
- [API 请求组织方式]
- [路由组织方式]

## 不可修改区域（AI 约束）
- [HTTP 拦截器路径]（改了会影响全局请求行为）
- [路由守卫 / 中间件路径]（权限控制）
- [鉴权工具路径]（Token / Session 处理）

## 验证命令
- [启动命令] — 启动开发服务器
- [构建命令] — 构建检查
- [lint 命令] — 代码检查
- npx playwright test — E2E 测试（逐步建设中）
```

**示例（Vue 项目）**：
```markdown
## 技术栈
- Vue 3.3 + TypeScript + Vite
- Element Plus
- Pinia
- SCSS + scoped style
- axios 封装在 src/api/request.ts

## 不可修改区域
- src/api/request.ts（axios 拦截器）
- src/router/guards.ts（权限守卫）
- src/utils/auth.ts（Token 处理）
```

**示例（React 项目）**：
```markdown
## 技术栈
- React 18 + TypeScript + Vite
- Ant Design 5.x
- Zustand
- CSS Modules + PostCSS
- axios 封装在 src/services/request.ts

## 不可修改区域
- src/services/request.ts（axios 拦截器）
- src/middleware.ts（Next.js 中间件）
- src/lib/auth.ts（Session 处理）
```

**示例（Angular 项目）**：
```markdown
## 技术栈
- Angular 17 + TypeScript
- Angular Material
- NgRx Signal Store
- SCSS + ViewEncapsulation
- HttpClient + interceptors

## 不可修改区域
- src/app/core/interceptors/（HTTP 拦截器）
- src/app/core/guards/（路由守卫）
- src/app/core/services/auth.service.ts
```

### 2.3 为关键页面建立视觉基线

⚠️ **先列出建议截图的页面清单，等用户确认后再执行截图。**

```
建议截图以下页面作为视觉基线，确认后开始截图：
- /[页面1]
- /[页面2]
- /[核心业务页面]
← 是否需要调整？确认后执行
```

```bash
# 启动项目
npm run dev  # 或 npm start / ng serve 等

# 手动或用 playwright 截图关键页面
# 存到 .baseline/ 目录（加入 .gitignore，仅本地人工对比用）
```

在 Claude Code 中：
```
用 playwright 打开 http://localhost:[端口] 并截图以下页面：
- /login
- /dashboard
- /[核心业务页面1]
- /[核心业务页面2]
截图保存到 .baseline/ 目录，文件名用路由路径命名
```

这些截图是后续所有 UI 改动的"改前参照"。

> **截图资产分类**：`.baseline/` 是本地人工对比用的临时截图，加入 `.gitignore`；Playwright `toHaveScreenshot()` 生成的 snapshot 基准图（存于 `tests/e2e/*.spec.ts-snapshots/`）是自动化视觉回归资产，MUST 纳入 git 版本管理。两者用途不同，不要混淆。
