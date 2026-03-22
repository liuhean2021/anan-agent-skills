# 前端开发 AI Coding 最佳实践

> 引用方式：在 `~/.claude/CLAUDE.md` 中添加 `@/path/to/frontend-ai-coding-best-practices.md` 以让 Claude Code 全局加载本规范
> 适用：接手维护存量前端项目 + 新增页面开发（框架无关：Vue / React / Angular / Svelte / 原生等）
> 工具链：Claude Code CLI（主力）+ Playwright（E2E）+ Playwright MCP / Chrome DevTools MCP（视觉验证）
> 作者：Hean Liu <allsmy.com@gmail.com>

---

## 目录

- [1. 定位与适用范围](#1-定位与适用范围)
- [2. 接手项目：第一天做什么](#2-接手项目第一天做什么)
- [3. 修改已有页面](#3-修改已有页面)
- [4. 新增页面](#4-新增页面)
- [5. 测试体系：从零建立](#5-测试体系从零建立)
  - [5.9 性能测试（按需可选）](#59-性能测试按需可选)
  - [5.10 可访问性测试（可选但推荐）](#510-可访问性测试可选但推荐)
  - [5.11 监控与错误发现（可选但推荐）](#511-监控与错误发现可选但推荐)
  - [5.12 CI/PR 门禁](#512-cipr-门禁)
- [6. 视觉验证闭环](#6-视觉验证闭环)
- [7. AI 协作规范](#7-ai-协作规范)
- [8. 常见场景速查](#8-常见场景速查)
- [9. 避坑指南](#9-避坑指南)
- [10. 工具配置参考](#10-工具配置参考)

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
- 路由配置或 pages/ 目录（路由结构 = 页面清单）
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

---

## 3. 修改已有页面

### 3.1 标准流程（7 步，测试先行）

```
┌──────────────────────────────────────────────┐
│  ① 截图现状（改前证据）                         │
│  ② Read 代码 + 理解结构                        │
│  ③ 写测试锁住现有行为（测试先行）                 │
│  ④ 描述改动（精确到属性级）                      │
│  ⑤ 执行修改（锁住非 UI 层）                     │
│  ⑥ 跑测试 + 截图对比（改后验证）                 │
│  ⑦ 补充改动相关的新测试                         │
└──────────────────────────────────────────────┘
```

> **为什么测试在改代码之前？**
> 先写测试锁住当前页面的正常行为（元素可见、交互可用、无溢出），然后再改代码。
> 如果改完后测试挂了，说明你的改动破坏了需求外的功能——这正是测试先行要拦住的。
> 没有这一步，你只能靠肉眼发现回归 bug，而 AI 改代码的影响范围往往超出你的预期。

### 3.2 Step ①：截图现状

```
用 playwright 打开 http://localhost:[端口]/[页面路径]
分别截图以下视口宽度：1440px、768px
保存到 .baseline/
```

**为什么必须先截图**：AI 改代码后你才发现"改坏了"，但已经不记得原来长什么样。截图是回退依据。

### 3.3 Step ②：Read 代码

```
读取 [目标页面文件]
读取该文件引用的子组件
告诉我：
1. 页面结构（哪些区块、布局方式）
2. 用了哪些 UI 库组件
3. 样式写在哪里（scoped / CSS Modules / styled-components / 内联 / 全局）
4. 有没有动态样式绑定（条件 class、动态 style、className 拼接）
5. 哪些样式是从父组件或全局继承的
```

### 3.4 Step ③：写测试锁住现有行为（测试先行）

在改任何代码之前，先为当前页面写一组"守护测试"，锁住现有的正常行为：

> 覆盖维度选择规则见 **Section 5.5 测试维度与选择策略**，直接复用 **附录 A.5 模板**。

**关键约束**：
- 守护测试 MUST 在改代码之前全部通过（绿灯）
- 守护测试只测"现有行为"，不测"新需求"
- 如果页面已有 E2E 测试，跳过此步，直接跑已有测试确认绿灯
- 补 `data-testid` 是唯一允许的源码改动，且 MUST 单独提交（`test: add data-testid for [页面]`）

### 3.5 Step ④：精确描述改动

改动来源通常是两种情况：**有设计图** 或 **无设计图（产品口头描述 / 自行判断）**。无论哪种，给 AI 的描述都必须精确。

**黄金法则：说"从 A 改到 B"，不说"改好看一点"**

#### 情况 A：有设计图

设计图可能来自 Figma、Sketch、Adobe XD、Pixso、MasterGo、即时设计、Motiff 或其他工具。无论哪个工具，提取方式相同：

```
方式 1：设计工具 Dev Mode / 标注模式导出 CSS → 复制 token 给 AI
方式 2：截图对比 → 上传设计图 + 当前页面截图，让 AI 列出差异逐项修改
方式 3：设计工具 MCP / API → AI 直接读取设计 token（需对应工具支持）

详细提取方式对比见 6.4 设计 token 提取方式表。
```

**方式 3 详解：Figma 插件 + implement-design 技能工作流（推荐）**

> **架构关系**：`figma@claude-plugins-official` 插件提供底层 MCP 工具（`get_design_context`、`get_screenshot` 等），`figma:implement-design` 技能编排这些工具为 7 步工作流。插件是基础设施，技能是上层编排，二者缺一不可。
>
> **前置条件**：
> 1. 已在 `~/.claude/settings.json` 中启用插件（见 10.1 MCP 配置）
> 2. 首次使用在 Claude Code 中执行 `/mcp` 完成 Figma OAuth 认证
> 3. 用户提供 Figma URL：`https://figma.com/design/:fileKey/:fileName?node-id=1-2`

完整流程 7 步：

```
Step 1：解析 Node ID
  - 从 Figma URL 提取 fileKey 和 nodeId
    URL: https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15
    → fileKey = kL9xQn2VwM8pYrTb4ZcHjF, nodeId = 42-15
  - 分支 URL：figma.com/design/:fileKey/branch/:branchKey/:fileName → 用 branchKey 作为 fileKey

Step 2：获取设计上下文
  - get_design_context(fileKey, nodeId) → 布局、排版、色值、组件结构、间距
  - 若响应截断（复杂设计）：先 get_metadata 获取节点树，再逐子节点调用 get_design_context

Step 3：截图视觉参考
  - get_screenshot(fileKey, nodeId) → 作为还原验证的 source of truth
  - 全程保留此截图，用于 Step 7 逐项对照

Step 4：下载资产
  - 图片/图标/SVG，直接使用插件返回的 localhost 源
  - MUST NOT 引入新图标包，MUST NOT 使用占位符
  - 资产通过 Figma MCP 内置 assets 端点提供，不可修改 URL

Step 5：翻译为项目规范
  - Figma 输出（默认 React + Tailwind）视为设计意图描述，不是最终代码
  - 替换为项目 token / 组件 / 样式方案，复用现有组件，遵循项目约定
  - 尊重项目路由、状态管理、数据获取模式

Step 6：1:1 视觉还原
  - 使用 design token，避免硬编码
  - token 冲突时优先项目 token，微调间距保持视觉一致
  - 遵循 WCAG 无障碍要求

Step 7：验证对照
  - 对比 Step 3 截图逐项检查：布局、排版、颜色、交互态、响应式、资产、无障碍
  - 偏离设计稿时 MUST 在代码注释中说明原因
```

> **插件的其他能力**（非 implement-design 流程，按需使用）：
> - **Code Connect**：`get_code_connect_suggestions` → `send_code_connect_mappings`，将 Figma 组件与代码组件建立映射（需 Organization/Enterprise 计划）
> - **Design System Rules**：`create_design_system_rules`，生成项目级设计系统规则文件，指导后续所有设计还原保持一致
> - **FigJam**：`get_figjam` 读取 / `generate_diagram` 生成 FigJam 图表
> - **反向同步**：`generate_figma_design`，将 UI 描述写回 Figma

Prompt 示例（触发 implement-design 技能）：
```
实现这个 Figma 设计：https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15
优先复用项目现有组件，不匹配时再创建新组件
```

Prompt 示例（有设计图，手动标注）：
```
修改 [文件路径]，按设计图调整 UI

设计图标注数据：
- 主按钮：高度 44px，圆角 8px，背景色 #2563EB，字号 15px
- 搜索栏与表格间距：16px
- 表格行高：52px
- 操作列按钮：改为文字型，间距 12px

[上传设计图截图作为参照]
改完后截图对比，确认还原度
```

#### 情况 B：无设计图

```
❌ 模糊描述（AI 会乱改）：
"表格太丑了，优化一下"

✅ 精确描述（AI 能精准执行）：
修改 [文件路径]：
1. 搜索栏与表格间距：margin-bottom 8px → 16px
2. 表格行高：从默认改为 52px
3. 操作列宽度：从 280px 缩小到 180px，按钮改为文字型按钮
4. 分页组件：对齐方式改为 justify-content: flex-end
5. 页面标题与面包屑之间加 12px 间距
```

**如果你说不清具体数值**，可以这样：
```
[上传截图，红框标注问题区域]
标注区域的问题：
- 红框1：这里间距太挤，参考 [UI 库名] 默认规范调整
- 红框2：按钮太多显得杂乱，改为下拉菜单
- 红框3：表头颜色太深，改为浅灰 #F5F7FA
```

### 3.6 Step ⑤：执行修改

```bash
# 先锁住不该动的层
/freeze src/api src/store src/router src/utils src/services src/lib
```

Prompt 模板（通用版）：
```
任务：按上述描述修改 [文件路径]

约束：
- 只改模板层（HTML 结构 / JSX）和样式层（CSS / SCSS / CSS Modules / styled）
- 逻辑层的业务代码不改，除非是纯展示逻辑（如计算样式的变量）
- 使用 [UI 库名] 组件的 prop / API 调整，优先于直接覆盖 CSS
- 不引入新依赖
- 所有新增 class 名使用项目现有命名风格

先列出改动计划，确认后执行
```

### 3.7 Step ⑥：跑测试 + 截图对比

**先跑守护测试，再截图对比。两道防线缺一不可。**

```
1. 跑 Step ③ 写的守护测试
   npx playwright test tests/e2e/[页面].spec.ts
   - 全部通过 → 说明改动没有破坏现有功能，继续
   - 有失败 → 分析是"预期内变化"还是"回归 bug"
     · 预期内（如按钮文字改了导致定位变化）→ 更新测试
     · 回归 bug（如分页不能点了）→ 修复代码，不是改测试

2. 用 playwright 截图 http://localhost:[端口]/[页面路径]
   与改前截图对比，逐条确认：
   - 每个改动点是否生效
   - 未改区域是否保持不变
   - 768px 下是否有溢出或重叠
```

### 3.8 Step ⑦：补充新需求的测试

守护测试锁住了"旧行为不被破坏"，这一步锁住"新改动符合预期"：

```
为本次 UI 改动补充 Playwright 测试，追加到已有测试文件中

测试重点（只测本次改动引入的新行为）：
- 新增元素可见且可交互
- 改动后的布局 / 间距 / 对齐在多断点下正确
- 新交互流程可走通

例如：
- 操作列从按钮组改为下拉菜单 → 测试下拉菜单打开、点击菜单项
- 分页从左对齐改为右对齐 → 视觉回归截图覆盖
- 新增筛选条件 → 测试筛选交互
```

---

## 4. 新增页面

新页面不需要容忍历史债务，标准应该高于存量页面。

### 4.1 标准流程（测试先行）

```
┌──────────────────────────────────────────────┐
│  ① 定义页面需求（功能 + 交互 + 响应式）          │
│  ② 复用分析（找项目中可复用的组件/布局）           │
│  ③ 先写 E2E 测试（基于需求，此时应全部失败）       │
│  ④ 生成页面（基于项目风格，不引入新模式）          │
│  ⑤ 跑测试 + 视觉验证（测试全绿 + 截图走查）       │
│  ⑥ 代码审查                                     │
└──────────────────────────────────────────────┘
```

> 新页面的测试先行是经典 TDD：先根据需求写失败测试，再写代码让测试通过。
> 好处：需求理解有偏差时，写测试阶段就能发现，而不是写完整页面后才发现方向错了。

### 4.2 Step ①：需求描述模板

```
新增页面：[页面名称]
路由：[路由路径]
布局：与 [已有页面] 相同的布局结构

功能：
1. [区块1]：[描述内容和组件]
2. [区块2]：[描述内容和组件]
3. [区块3]：[描述内容和组件]

响应式要求：
- ≥ 1024px：[桌面端布局描述]
- < 1024px：[移动端布局描述]

交互：
- [按钮/链接1]：[行为描述]
- [按钮/链接2]：[行为描述]
- [表单提交]：[行为描述]
```

### 4.3 Step ②：复用分析（关键步骤）

```
在开始写代码之前，先做复用分析：
1. 找到项目中与本页面布局最相似的已有页面，作为参考模板
2. 列出可复用的组件（如通用表格、状态标签、操作按钮组）
3. 确认本页面的 CSS 应使用项目现有变量 / token / 主题
4. 不要创建项目中已有等价功能的新组件

输出复用清单后再动手写代码
```

### 4.4 Step ③：先写 E2E 测试（此时应全部失败）

基于 Step ① 的需求描述，先写测试：

```
为即将新增的 [页面名] 页面生成 Playwright E2E 测试
页面路由：[路由路径]

基于需求描述生成测试用例：
1. 页面加载后关键元素可见（[区块1]、[区块2]、[区块3]）
2. [交互1] 流程可走通
3. [交互2] 流程可走通
4. 异常状态展示正常（空数据、加载失败）
5. 响应式：768px 下无溢出

所有 locator 使用 data-testid，命名遵循 [页面]-[区块]-[元素] 规范
Mock 所有 API 调用

此时页面尚未创建，测试应全部失败（红灯）
```

**为什么先写测试**：
- 写测试时你会发现需求描述中的模糊点（"操作按钮"具体有几个？"筛选"是即时生效还是点搜索？）
- 测试用例就是可执行的验收标准，后续不用额外对照
- 页面写完后跑一次测试就知道是否达标，不用人工逐项检查

### 4.5 Step ④：生成页面

```
基于复用分析结果，生成 [目标文件路径]

要求：
- 结构风格与项目已有页面一致（参考 [最相似页面路径]）
- 使用项目现有的组件风格（[函数式/类/Composition API/Options API...]）
- 样式方案与项目一致（[CSS Modules / Tailwind / SCSS / styled-components...]）
- 所有交互元素 MUST 有 data-testid（与 Step ③ 测试中的 testid 对应）
- API 调用放 [项目 API 目录]，类型定义放 [项目类型目录]
- 路由注册追加到 [项目路由配置位置]

文件清单：
1. [页面文件]
2. [API 接口文件]（追加）
3. [类型定义文件]（追加）
4. [路由配置]（追加）

写完后立即跑 Step ③ 的测试，目标：全部通过（绿灯）
如有失败，修复代码直到全绿
```

### 4.6 新页面 data-testid 规范

```
命名规则：[页面]-[区块]-[元素]

示例：
data-testid="order-detail-edit-btn"
data-testid="order-detail-goods-table"
data-testid="order-detail-total-amount"
data-testid="order-detail-timeline"
data-testid="order-detail-cancel-confirm"
```

> data-testid 是框架无关的。无论 Vue / React / Angular / Svelte，写法完全一致。

---

## 5. 测试体系：从零建立

### 5.1 渐进式策略

> **前置条件**：测试基础设施搭建（Playwright 安装、CI 配置、package.json scripts）属于 infra 任务，不是业务需求的默认范围。
> - MUST 在单独授权的任务中执行
> - MUST 拆分为独立 PR，触发 CODEOWNERS 审批
> - 业务需求默认不触碰 CI/CD、依赖、scripts 文件
>
> 详见 Section 7.4 AI 变更授权矩阵。

```
不要一次性给所有页面补测试。按这个节奏：

阶段 1（第 1 周）：搭好 E2E 基础设施
  └ Playwright 安装 + 配置 + 第一个冒烟测试

阶段 2（持续）：改哪先测哪
  └ 每次改存量页面，先写守护测试锁住现有行为，再改代码，最后补新需求测试

阶段 3（持续）：新页面测试先行
  └ 新页面先写失败测试，再写页面代码，测试全绿才算完成

阶段 4（第 2~3 周）：补单元测试基础设施
  └ 安装 Vitest / Jest，为现有工具函数、校验规则、数据转换补单元测试
  └ 新增的纯逻辑函数 MUST 同步写单元测试

阶段 5（按需）：公共组件测试
  └ 有公共组件库 → 安装 Testing Library，为公共组件补组件测试
  └ 业务页面组件不补组件测试（E2E 已覆盖）

阶段 6（按需）：关键路径补全
  └ 未改动但业务关键的页面（登录、支付、核心流程），主动补 E2E 测试
```

### 5.2 测试类型选择策略

前端有三类测试，不是每种都要上。根据项目阶段和代码特征选择：

#### 三类测试对比

| 测试类型 | 工具 | 测什么 | 框架绑定 | AI 生成可靠度 |
|---------|------|--------|---------|-------------|
| **E2E 测试** | Playwright | 页面行为：加载、交互、导航、反馈 | 无（框架无关） | 高 |
| **单元测试** | Vitest / Jest | 纯逻辑：工具函数、计算、数据转换、状态管理 | 无（纯 JS/TS） | 高 |
| **组件测试** | Testing Library / Vue Test Utils | 组件渲染：props → DOM 输出、事件触发、插槽 | **强绑定框架** | 中 |

#### 选择决策树

```
这段代码是纯函数 / 纯逻辑吗？（不涉及 DOM、不涉及组件）
  ├─ 是 → 单元测试（Vitest / Jest）
  └─ 否 → 这是公共组件库（供多项目 / 多页面复用）吗？
            ├─ 是 → 组件测试（Testing Library）+ E2E 集成验证
            └─ 否 → E2E 测试（Playwright）
```

#### 不同项目阶段的测试组合

| 项目阶段 | 推荐组合 | 说明 |
|---------|---------|------|
| **存量项目刚接手** | E2E 为主 | 零基础最快见效，框架无关，改哪测哪 |
| **存量项目稳定维护** | E2E + 单元测试 | 纯逻辑函数补单元测试，提升覆盖精度 |
| **新项目从零开始** | E2E + 单元测试 + 组件测试（公共组件） | 三层都建，但组件测试只覆盖公共组件库 |
| **公共组件库 / Design System** | 组件测试为主 + E2E 集成 | 组件库质量是下游所有项目的基础 |

#### 各类测试的适用边界

```
单元测试 SHOULD 覆盖：
  ✅ 工具函数（formatDate、formatCurrency、parseQuery）
  ✅ 业务计算逻辑（价格计算、权限判定、数据聚合）
  ✅ 状态管理（reducer / action / getter 的纯逻辑部分）
  ✅ 数据转换（API 响应 → 前端模型的 transform 函数）
  ✅ 正则 / 校验规则（手机号、邮箱、身份证等格式校验）

单元测试 SHOULD NOT 覆盖：
  ❌ 组件渲染结果（用 E2E 或组件测试覆盖）
  ❌ DOM 操作（用 E2E 覆盖）
  ❌ 样式 / 布局（用 E2E + 截图覆盖）

组件测试 SHOULD 覆盖（仅公共组件）：
  ✅ 公共组件的 props → 渲染输出映射
  ✅ 公共组件的事件触发与回调
  ✅ 公共组件的插槽 / children 渲染
  ✅ 公共组件的边界状态（disabled、loading、error）

组件测试 SHOULD NOT 覆盖：
  ❌ 业务页面组件（用 E2E 覆盖，避免框架绑定）
  ❌ 一次性使用的页面私有组件（ROI 太低）

E2E 测试覆盖范围：见 Section 5.5 的 6 个维度
```

#### 为什么 E2E 是第一优先级

```
Playwright 的核心优势：框架无关

- 项目从 Vue 2 迁到 Vue 3？测试不用改
- 项目从 React CRA 迁到 Next.js？测试不用改
- 项目混用了 jQuery + React？一样能测
- 团队有 Vue 项目也有 React 项目？同一套测试写法

E2E 测试面向的是浏览器行为，不是框架 API。
无论存量项目还是新项目，这都是投入产出比最高的测试切入点。
```

### 5.3 Playwright 初始化

```bash
# 安装
npm init playwright@latest
# 选择 TypeScript / tests 目录 / 安装浏览器

# 目录结构
tests/
  e2e/                       # E2E 测试（Playwright）
    login.spec.ts            # 按页面组织
    dashboard.spec.ts
    user-list.spec.ts
  unit/                      # 单元测试（Vitest / Jest）
    utils/
      format.test.ts         # 工具函数测试
      validate.test.ts       # 校验规则测试
    stores/
      user.test.ts           # 状态管理逻辑测试
  components/                # 组件测试（仅公共组件，按需）
    Button.test.ts
    DataTable.test.ts
  fixtures/                  # 测试数据 + mock
    user.json
    order.json
  helpers/                   # 测试工具函数
    auth.ts                  # 登录 helper
    mock.ts                  # API mock helper
```

### 5.4 测试基础设施代码

让 Claude Code 生成：

```
为本前端项目搭建 Playwright E2E 基础设施：

项目信息：
- 框架：[Vue/React/Angular/...]
- 开发服务器端口：[端口号]
- 启动命令：[npm run dev / npm start / ...]

生成内容：
1. playwright.config.ts
   - baseURL: http://localhost:[端口]
   - webServer 自动启动 dev server
   - 截图：仅失败时保存
   - 超时：30 秒
   - 浏览器：默认仅启用 chromium；按 Section 5.5 ④ 的 L1 / L2 / L3 分层策略逐步扩展

2. tests/helpers/auth.ts
   - loginAs(page, username, password) — 封装登录流程
   - mockLogin(page) — 直接注入 token/cookie，跳过登录页面（快速）

3. tests/helpers/mock.ts
   - mockAPI(page, urlPattern, responseData) — 封装 route.fulfill

4. tests/e2e/smoke.spec.ts
   - 冒烟测试：登录 → 进入首页 → 关键元素可见

5. package.json 追加脚本：
   "test:e2e": "npx playwright test"
   "test:e2e:ui": "npx playwright test --ui"
   "test:e2e:report": "npx playwright show-report"
```

### 5.5 每个页面测试该覆盖什么

前端测试需要覆盖 6 个维度。专业测试和普通"点点页面"的差别，很大程度上就在后 4 个维度。

> **覆盖原则**：6 个维度是完整覆盖清单，每次改动按需求涉及范围全覆盖相关维度，不要求每次都覆盖全部 6 项。具体选择见下方各维度说明中的"何时必选"。

#### ① UI 测试（界面正确性）

> "看起来对不对" | **何时必选**：改模板层、样式层、布局、响应式相关代码时

```
必覆盖：
  ✅ 页面加载成功，关键元素可见且位置正确
  ✅ 响应式布局：768px / 1024px / 1440px 无溢出、无错位
  ✅ 异常状态有合理展示（空数据、加载中、接口报错）
  ✅ 视觉一致性：同类元素间距、对齐、颜色方案统一

选覆盖（关键页面加测）：
  ☑ 暗色模式 / 主题切换后样式正常
  ☑ 长文本 / 多语言场景无截断溢出
  ☑ 截图回归测试 → 自动化见 5.8，人工对比见 6.2

不覆盖：
  ❌ CSS 属性精确值（如 font-size: 14px）
  ❌ 动画/过渡效果的帧级细节
  ❌ 第三方 UI 库内部渲染行为
```

#### ② UX 测试（用户体验质量）

> "用起来顺不顺" | **何时必选**：改交互逻辑、表单、流程、反馈机制时

```
必覆盖（每个页面都测）：
  ✅ 核心交互流程可走通（增删改查、搜索、筛选、分页）
  ✅ 加载反馈：耗时操作有 loading 状态，不会让用户以为卡死
  ✅ 操作反馈：提交成功/失败有明确提示（toast / message / alert）
  ✅ 可点击区域 ≥ 44px，不会误触

选覆盖（关键页面加测）：
  ☑ 表单校验：实时校验 + 提交校验，错误信息明确指向问题字段
  ☑ 键盘可访问性 → 详见 5.10 可访问性测试
  ☑ 错误恢复：网络失败后可重试，表单报错后已填数据不丢失
  ☑ 权限控制：无权限时的展示和引导（不是空白页面）

不覆盖：
  ❌ 用户主观偏好（"这个按钮应该更大"）
  ❌ 业务逻辑正确性（那是后端 + 集成测试的职责）
```

#### ③ 异常与边界场景测试

> 专业测试和普通点点页面的差别，很多就在这里。 | **何时必选**：改业务逻辑、接口调用、权限判断、数据处理时

```
必覆盖：
  ✅ 空数据：列表为空、搜索无结果、详情接口返回空
  ✅ 无权限 / 未登录 / 登录失效：是否正确跳转或提示，不是白屏
  ✅ 接口报错（500 / 超时 / 网络断开）：提示是否准确，页面是否可恢复
  ✅ 重复提交：连续快速点击按钮，只触发一次请求

选覆盖：
  ☑ 极大数据量：100+ 行表格、超长下拉列表，是否卡顿或渲染异常
  ☑ 极长文本：用户名 50 字符、备注 2000 字符，是否截断溢出
  ☑ 特殊字符：< > & " ' / \ emoji、SQL 注入字符串，是否被正确转义展示
  ☑ 并发操作：多 Tab 同时编辑同一条数据，保存时是否冲突处理
  ☑ 页面刷新 / 重复进入：刷新后状态是否丢失、重复进入是否重复请求
  ☑ 浏览器后退前进：回退后数据是否保持、前进后页面是否正常
```

#### ④ 兼容性测试

> 兼容性采用分层策略，不是每次改动都全浏览器全终端覆盖。先用低成本基线卡住，再按风险升层。 | **何时必选**：改全局样式、布局、公共组件、CSS 兼容性相关代码时

```
L1 基线层（默认每次都跑）：
  ✅ Chromium
  ✅ 1440px / 768px 两个断点
  ✅ 当前改动页面的核心路径

适用场景：日常页面改动、局部样式调整、普通表单/列表页修改

L2 风险层（满足任一条件时必加）：
  触发条件：改全局样式、布局、公共组件、滚动容器、日期时间、文件上传、CSS 兼容性相关代码
  ✅ WebKit（Safari）— 渲染差异最大：日期格式、flex 布局、滚动行为是重灾区
  ✅ 至少 1 个移动端项目（mobile-chrome 或 mobile-safari，按用户群选择）

L3 扩展层（按项目用户群或明确需求启用）：
  ☑ Edge（需要验证企业环境、IE 模式或 Edge 特有功能时）
  ☑ Firefox（用户群明确覆盖时，重点关注表单控件样式差异）
  ☑ iOS Safari + Android Chrome 真机
  ☑ Windows / macOS 差异（字体渲染、滚动条样式）
  ☑ 125% / 150% 缩放
  ☑ 横竖屏切换
  ☑ 深浅色模式切换

IE 兼容策略（仅限政企 / 金融 / 传统行业项目）：
  ⚠ IE 已于 2022 年 6 月停止支持，绝大多数新项目 SHOULD NOT 兼容 IE
  ⚠ IF 项目明确要求兼容 IE THEN：
    - 确认兼容范围：仅 IE 11
    - 使用 Edge 的 IE 模式测试，而非安装真实 IE
    - 降级方案优先：核心功能可用即可，不追求视觉一致
    - 常见问题：flexbox 部分不支持、CSS Grid 不支持、ES6+ 需 polyfill、CSS 变量不支持
  ⚠ IF 项目无 IE 要求 THEN 在项目文档中明确标注「不支持 IE」
```

Playwright 配置多浏览器：
```typescript
// playwright.config.ts 的 projects 中按需添加
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  // Edge 与 Chrome 同为 Chromium 内核，chromium 项目已覆盖核心场景
  // 如需单独测试 Edge 特有行为（IE 模式、PDF 预览等），用 channel 指定：
  { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
]
// 注意：Playwright 不支持 IE。如需 IE 兼容测试，使用 Edge IE 模式手动验证。
```

#### ⑤ 回归测试

> 前端改一个页面，经常会影响公共区域。这是最容易被忽视、也最容易出事故的部分。 | **何时必选**：改公共组件、公共样式、公共方法、导航/路由/权限时

```
每次改动后 MUST 检查：
  ✅ 公共组件：改了 Button / Modal / Table 等公共组件 → 抽查 3+ 个使用页面
  ✅ 公共样式：改了全局 CSS / 主题变量 / reset → 截图全部关键页面对比
  ✅ 公共方法：改了 utils / hooks / composables → 跑全量单元测试
  ✅ 导航 / 路由 / 权限：改了 layout / router / guard → 验证所有角色入口
  ✅ 同类页面：改了列表页模板 → 检查所有同类列表页是否受影响

自动化方式：
  - 截图回归测试覆盖关键页面（Section 5.8）
  - CI 中跑全量 E2E，不只跑改动页面的测试
  - 改公共组件时，用 grep 查所有引用处，确认影响范围
```

#### ⑥ 性能与体验测试（可选）

> 功能对了但用起来卡，用户一样会投诉。 | **何时选测**：首屏加载明显慢、大数据列表卡顿、用户投诉体验差时。日常改动不要求每次都跑性能测试。

详见 [Section 5.9 性能测试（按需可选）](#59-性能测试按需可选)。

### 5.6 E2E 测试示例（框架无关）

```typescript
import { test, expect } from '@playwright/test'

test.describe('用户列表页', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API（不依赖后端）
    await page.route('**/api/users*', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          list: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
          total: 2,
        }),
      })
    )
    await page.goto('/user/list')
  })

  test('关键元素可见', async ({ page }) => {
    await expect(page.getByTestId('search-input')).toBeVisible()
    await expect(page.getByTestId('data-table')).toBeVisible()
    await expect(page.getByTestId('pagination')).toBeVisible()
  })

  test('搜索交互正常', async ({ page }) => {
    await page.getByTestId('search-input').fill('Alice')
    await page.getByTestId('search-btn').click()
    // 验证表格行数变化
    await expect(page.getByTestId('data-table').locator('tbody tr')).toHaveCount(1)
  })

  test('空数据状态', async ({ page }) => {
    await page.route('**/api/users*', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ list: [], total: 0 }) })
    )
    await page.reload()
    await expect(page.getByText(/暂无数据|No Data|empty/i)).toBeVisible()
  })

  test('响应式：移动端无溢出', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > document.body.clientWidth
    )
    expect(overflow).toBe(false)
  })
})
```

> 注意：以上测试不涉及任何 Vue / React / Angular API。换框架，测试原样跑。

### 5.7 UX 测试示例（框架无关）

```typescript
import { test, expect } from '@playwright/test'

test.describe('用户列表页 — UX 体验', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users*', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          list: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
          total: 2,
        }),
      })
    )
    await page.goto('/user/list')
  })

  // —— 加载反馈 ——
  test('耗时操作显示 loading 状态', async ({ page }) => {
    // 模拟慢接口，验证 loading 出现
    await page.route('**/api/users*', async route => {
      await new Promise(r => setTimeout(r, 1000))
      await route.fulfill({ status: 200, body: JSON.stringify({ list: [], total: 0 }) })
    })
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('loading-indicator').or(page.locator('.el-loading-mask, .ant-spin, [class*="loading"]'))).toBeVisible()
  })

  // —— 操作反馈 ——
  test('删除成功后显示提示并刷新列表', async ({ page }) => {
    await page.route('**/api/users/*', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
    )
    await page.getByTestId('delete-btn').first().click()
    // 确认弹窗
    await page.getByRole('button', { name: /确[认定]|OK|Yes/i }).click()
    // 验证成功提示出现
    await expect(page.getByText(/删除成功|successfully/i)).toBeVisible()
  })

  // —— 错误恢复 ——
  test('接口报错时显示错误提示，不白屏', async ({ page }) => {
    await page.route('**/api/users*', route =>
      route.fulfill({ status: 500, body: '{}' })
    )
    await page.reload()
    // 不应白屏，应有错误提示或兜底展示
    await expect(page.getByText(/error|失败|出错|网络异常|请稍后重试/i)).toBeVisible()
  })

  // —— 表单校验与数据保持 ——
  test('表单校验失败后已填数据不丢失', async ({ page }) => {
    await page.goto('/user/create')
    const nameInput = page.getByTestId('form-name')
    await nameInput.fill('Alice')
    // 故意不填必填项，直接提交
    await page.getByTestId('submit-btn').click()
    // 验证校验提示出现
    await expect(page.getByText(/必填|required/i).first()).toBeVisible()
    // 验证已填数据没有被清空
    await expect(nameInput).toHaveValue('Alice')
  })

  // —— 防重复提交 ——
  test('快速连续点击提交按钮只触发一次请求', async ({ page }) => {
    await page.goto('/user/create')
    // 填写表单
    await page.getByTestId('form-name').fill('Test')
    await page.getByTestId('form-email').fill('test@example.com')
    let requestCount = 0
    await page.route('**/api/users', route => {
      requestCount++
      return route.fulfill({ status: 200, body: JSON.stringify({ id: 1 }) })
    })
    // 快速连续点击 3 次
    const btn = page.getByTestId('submit-btn')
    await btn.click()
    await btn.click()
    await btn.click()
    await page.waitForTimeout(500)
    expect(requestCount).toBe(1)
  })

  // —— 键盘可访问性 ——
  test('键盘操作：Tab 导航 + Enter 提交', async ({ page }) => {
    await page.goto('/user/create')
    await page.getByTestId('form-name').focus()
    await page.keyboard.press('Tab')
    // 焦点应移到下一个表单元素
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
    expect(focused).toBeTruthy()
    // 填写完成后 Enter 可提交
    await page.getByTestId('form-name').fill('Test')
    await page.getByTestId('form-email').fill('test@example.com')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/成功|success/i)).toBeVisible({ timeout: 5000 })
  })

  // —— 导航一致性 ——
  test('浏览器后退行为符合预期', async ({ page }) => {
    // 从列表进入详情
    await page.getByTestId('data-table').locator('tbody tr').first().click()
    await page.waitForURL('**/user/**')
    // 后退应回到列表
    await page.goBack()
    await expect(page).toHaveURL(/\/user\/list/)
    await expect(page.getByTestId('data-table')).toBeVisible()
  })

  // —— 加载状态 ——
  test('加载状态正确显示', async ({ page }) => {
    // 慢速网络下验证 loading 状态
    await page.route('**/api/users*', route =>
      new Promise(resolve => setTimeout(resolve, 1000)).then(() => route.continue())
    )
    await page.goto('/user/list')
    await expect(page.getByTestId('loading-spinner')).toBeVisible()
    await expect(page.getByTestId('data-table')).toBeVisible()
    await expect(page.getByTestId('loading-spinner')).not.toBeVisible()
  })

  // —— 离开保护 ——
  test('编辑中离开页面有未保存提示', async ({ page }) => {
    await page.goto('/user/create')
    await page.getByTestId('form-name').fill('未保存的数据')
    // 尝试离开
    page.on('dialog', async dialog => {
      expect(dialog.message()).toMatch(/未保存|unsaved|离开/i)
      await dialog.dismiss()  // 取消离开
    })
    await page.goto('/user/list').catch(() => {})  // 被 dialog 拦截
  })
})
```

> 以上示例覆盖了 6 个测试维度中的 ②UX、③异常边界、⑥性能 部分场景。UI 测试（①）见 5.6，回归测试（⑤）和兼容性测试（④）通过 Playwright 多浏览器 projects 配置 + CI 全量跑测试实现。

### 5.8 视觉回归测试

#### 什么是视觉回归测试

视觉回归测试 = 改代码前截图 → 改代码后截图 → 像素级对比 → 差异超阈值则报错。

它解决的核心问题：**人眼容易漏掉微小的 UI 偏移，而截图对比不会。** 功能测试只验证"能不能用"，视觉回归验证"长得对不对"。

#### 必要性评估：什么时候需要

```
强烈推荐（ROI 高）：
  ✅ 改公共组件（Button / Modal / Table / Layout）→ 影响面广，人工逐页检查成本极高
  ✅ 改全局样式（主题变量 / reset.css / 字体）→ 全站都可能受影响
  ✅ CSS 重构 / 迁移（如 Less → Tailwind、UI 框架升级）→ 改动大且无法靠功能测试覆盖
  ✅ 多主题 / 深浅色模式 → 每次改动要验证 2× 以上状态
  ✅ 响应式布局调整 → 多断点截图对比远比手动缩放靠谱
  ✅ 设计系统 / 组件库项目 → 视觉一致性是核心交付物

可选（按需引入）：
  ☑ 关键业务页面（登录、支付、首页）→ 这些页面的视觉错误直接影响用户信任
  ☑ 交接频繁的项目 → 新人不了解全局影响，截图兜底
  ☑ CI 流水线已成熟，加一步截图对比成本低

通常不需要：
  ✘ 后台管理系统 / 内部工具 → 视觉要求低，功能测试够用
  ✘ 快速原型 / MVP → 迭代太快，基准截图频繁失效，维护成本 > 收益
  ✘ 纯数据展示页（表格内容动态变化）→ 动态数据导致误报率高
  ✘ 项目无 CI → 手动跑截图对比的纪律很难持续
```

#### 典型场景

| 场景 | 风险 | 视觉回归能否发现 |
|------|------|----------------|
| 改了 Button 组件的 padding | 所有使用该组件的页面按钮间距变化 | ✅ 自动捕获 |
| 升级 UI 框架版本（如 Ant Design 4 → 5）| 大量组件默认样式变化 | ✅ 批量对比，快速定位差异 |
| 修改全局 CSS 变量（如 `--spacing-md`）| 全站间距变化 | ✅ 截图覆盖关键页面即可发现 |
| 删了一行 CSS 以为没用 | 某个页面的某个状态下布局塌了 | ✅ 如果该页面在截图范围内 |
| 分页从左对齐改为右对齐 | 改动是否生效 + 其他元素是否被挤压 | ✅ 截图精确到像素 |
| 改了列表接口返回字段 | 列表空白或报错 | ❌ 功能测试的责任，不是视觉回归 |

#### 实施方式

```typescript
// 首次运行生成基准截图，后续自动对比
test('视觉回归 - 用户列表页', async ({ page }) => {
  await page.goto('/user/list')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('user-list-desktop.png', {
    maxDiffPixelRatio: 0.03,  // 允许 3% 误差（字体渲染差异）
    fullPage: true,
  })
})

// 多状态截图：覆盖空数据、加载中、错误状态
test('视觉回归 - 空数据状态', async ({ page }) => {
  // mock 空数据响应
  await page.route('**/api/users*', route =>
    route.fulfill({ json: { data: [], total: 0 } })
  )
  await page.goto('/user/list')
  await expect(page).toHaveScreenshot('user-list-empty.png')
})

// 多断点截图：桌面 + 移动端
test('视觉回归 - 移动端', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/user/list')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('user-list-mobile.png', { fullPage: true })
})
```

```bash
# 更新基准截图（UI 改动后执行）
npx playwright test --update-snapshots
```

#### 避坑要点

```
常见误报原因及应对：
  - 动态数据（时间戳、随机头像）→ 用 mask 遮盖动态区域或 mock 固定数据
  - 字体加载时序 → waitForLoadState('networkidle') + 适当等待字体渲染
  - 动画未结束 → 测试前禁用动画（CSS: * { animation: none !important; }）
  - 不同 OS 字体渲染差异 → CI 统一用 Linux + Docker，或适当放宽 maxDiffPixelRatio
  - 光标闪烁 → 截图前 blur 所有 input

维护纪律：
  - 基准截图 MUST 纳入 git 版本管理
  - UI 改动后 MUST 运行 --update-snapshots 更新基准，并在 PR 中 review 截图 diff
  - 截图命名 SHOULD 包含页面名 + 状态 + 断点（如 user-list-empty-mobile.png）
  - 不要对所有页面都加截图 → 优先覆盖公共组件使用最多的 5~10 个关键页面
```

### 5.9 性能测试（按需可选）

性能测试不是每次改动的必选项，而是一类"性能哨兵"——在特定场景下按需启用，发现体感问题时深入排查。

#### 何时需要性能测试

```
SHOULD 启用：
  ✅ 首屏加载明显慢（用户可感知的等待 > 3s）
  ✅ 大数据量列表滚动卡顿
  ✅ 改了加载逻辑、路由懒加载、数据预取策略
  ✅ 引入了新的大型依赖（图表库、编辑器、地图等）
  ✅ 用户或测试反馈"页面变慢了"

通常不需要：
  ✘ 日常 UI 调整（改样式、改文案、改布局）
  ✘ 小功能新增（不影响加载链路）
  ✘ 后台管理页面（对性能容忍度高）
```

#### 性能哨兵指标（参考值，非硬 SLA）

以下指标是参考基线，具体阈值应根据项目实际情况、用户设备水平和网络环境调整：

```
感知指标（本地开发环境参考）：
  - 首屏可见：≤ 3s（移动端/弱网 ≤ 5s）
  - 交互响应：≤ 300ms（点击、切换、筛选的感知延迟）
  - 路由跳转：≤ 500ms
  - 无明显白屏 / 闪烁 / 布局抖动（CLS）

稳定性指标：
  - 大数据量列表不卡顿（100+ 行能流畅滚动）
  - 反复操作（打开关闭弹窗 50 次）后内存不持续增长
  - 动画 / 滚动帧率 ≥ 30fps

注意：
  - 以上数值为本地开发环境参考，CI 环境因资源差异可能波动
  - 不建议在 CI 中对毫秒级指标做硬卡口，会导致大量误报
  - 如需严格性能卡口，使用 Lighthouse CI 或 Web Vitals 专业工具
```

#### Playwright 轻量性能哨兵

```typescript
// 轻量哨兵：检测明显的性能退化，不做精确 SLA 卡口
test('首屏加载性能哨兵', async ({ page }) => {
  // 使用 Performance API 而非 Date.now()，减少测量误差
  await page.goto('/dashboard')
  await page.getByTestId('main-content').waitFor({ state: 'visible' })

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    }
  })

  // 宽松阈值：只捕捉明显退化（如从 1s 变成 8s），不卡正常波动
  expect(timing.domContentLoaded).toBeLessThan(5000)
})

test('大数据列表滚动不报错', async ({ page }) => {
  // Mock 200 条数据
  await page.route('**/api/list*', route =>
    route.fulfill({
      json: {
        list: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Item ${i}` })),
        total: 200,
      },
    })
  )
  await page.goto('/list')
  // 收集 JS 报错
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  // 滚动到底部
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  expect(errors).toHaveLength(0)
})
```

#### 何时需要专业 Profiling

```
以下情况超出了 Playwright 哨兵的能力，需要专业工具：
  - 需要精确到毫秒的性能基线和趋势跟踪 → Lighthouse CI
  - 需要 Core Web Vitals（LCP / FID / CLS）数据 → Web Vitals + 监控平台
  - 需要定位具体的渲染瓶颈和内存泄漏 → Chrome DevTools Performance / Memory 面板
  - 需要对比不同版本的性能差异 → Lighthouse CI + GitHub Action 集成
```

### 5.10 可访问性测试（可选但推荐）

可访问性（Accessibility / a11y）不仅是合规要求，也是 UX 质量的一部分。即使不追求 WCAG 全面达标，基本的可访问性也能提升所有用户的体验。

#### 何时需要

```
SHOULD 覆盖：
  ✅ 面向公众的网站（官网、电商、SaaS 产品）
  ✅ 有法规合规要求的项目（政务、金融、教育、医疗）
  ✅ 表单密集型页面（注册、下单、申请流程）
  ✅ 组件库 / 设计系统

MAY 简化覆盖：
  ☑ 内部管理后台（覆盖基础项即可）
  ☑ 快速原型 / MVP

基础项（所有项目 SHOULD 满足）：
  ✅ 语义化标签：用 <button> 而非 <div onClick>，用 <nav>/<main>/<aside> 而非纯 <div>
  ✅ 表单关联：<label> 关联 <input>（for/id 或嵌套），错误提示用 aria-describedby 关联
  ✅ 图片替代文本：<img> 有 alt 属性，装饰性图片 alt=""
  ✅ 焦点可见：Tab 导航时焦点指示器清晰可见，不被 outline: none 移除
  ✅ 颜色对比度：正文 ≥ 4.5:1，大文本 ≥ 3:1（WCAG AA）
  ✅ 键盘可操作：所有交互元素可通过 Tab + Enter/Space 操作

进阶项（面向公众的产品 SHOULD 覆盖）：
  ☑ aria-label / aria-labelledby：为无文字按钮（图标按钮）提供语义
  ☑ 焦点管理：弹窗打开时焦点进入弹窗，关闭时焦点回到触发元素
  ☑ 动态内容通知：用 aria-live 区域通知屏幕阅读器（如 toast、实时搜索结果）
  ☑ reduced motion：@media (prefers-reduced-motion: reduce) 时禁用非必要动画
  ☑ 屏幕阅读器测试：用 VoiceOver (macOS) / NVDA (Windows) 实际走一遍核心流程
```

#### Playwright 可访问性测试示例

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('页面无严重可访问性问题', async ({ page }) => {
  await page.goto('/user/create')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])  // WCAG AA 标准
    .analyze()

  // 只卡 critical 和 serious 级别，minor 记录但不阻断
  const critical = results.violations.filter(v =>
    v.impact === 'critical' || v.impact === 'serious'
  )
  expect(critical).toHaveLength(0)
})

test('表单可访问性', async ({ page }) => {
  await page.goto('/user/create')

  // 所有 input 都有关联的 label
  const inputs = await page.locator('input:not([type="hidden"])').all()
  for (const input of inputs) {
    const id = await input.getAttribute('id')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    const label = id ? await page.locator(`label[for="${id}"]`).count() : 0
    const hasLabel = label > 0 || ariaLabel || ariaLabelledBy
    expect(hasLabel, `input#${id} 缺少 label 关联`).toBeTruthy()
  }
})

test('基础键盘可达性 smoke test', async ({ page }) => {
  await page.goto('/user/create')

  // Tab 可以遍历所有交互元素
  const interactiveElements = await page.locator(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ).count()

  let tabCount = 0
  for (let i = 0; i < interactiveElements + 2; i++) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    if (focused && focused !== 'BODY') tabCount++
  }

  // 至少能 Tab 到交互元素
  expect(tabCount).toBeGreaterThan(0)
})

// 完整键盘场景（弹窗 focus trap、焦点回归）建议在组件测试或专项 a11y 测试中覆盖
```

#### 工具安装

```bash
npm install -D @axe-core/playwright
```

### 5.11 监控与错误发现（可选但推荐）

AI 改完代码后，除了跑测试，还应检查页面运行时是否产生新的错误。这些错误往往不会导致测试失败，但会影响用户体验或后续排查。

#### 改动后必查项

```
每次改动后 SHOULD 检查：
  ✅ 控制台无新增报错（console.error / console.warn 中的异常）
  ✅ 无未捕获的 JS 异常（Uncaught TypeError / ReferenceError 等）
  ✅ 无未处理的 Promise rejection
  ✅ 网络请求无新增 4xx / 5xx 错误
  ✅ 页面加载后无持续报错（定时器、轮询中的重复错误）
```

#### Playwright 自动捕获运行时错误

```typescript
import { test, expect } from '@playwright/test'

// 推荐：在 beforeEach 中全局收集错误，所有测试自动受益
test.describe('运行时错误监控', () => {
  let jsErrors: string[]
  let failedRequests: { url: string; status: number }[]

  test.beforeEach(async ({ page }) => {
    jsErrors = []
    failedRequests = []

    // 捕获 JS 异常
    page.on('pageerror', err => jsErrors.push(err.message))

    // 捕获失败的网络请求
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
        })
      }
    })

    // 捕获未处理的 console.error
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(`console.error: ${msg.text()}`)
      }
    })
  })

  test('页面无 JS 运行时错误', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 执行一些基本交互
    // ...

    expect(jsErrors, '页面存在 JS 运行时错误').toHaveLength(0)
  })

  test('页面无失败的 API 请求', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // 过滤掉已知的、可接受的失败请求（如 favicon.ico）
    const unexpected = failedRequests.filter(r =>
      !r.url.includes('favicon') && !r.url.includes('hot-update')
    )
    expect(unexpected, '存在意外的失败请求').toHaveLength(0)
  })
})
```

#### 与错误监控平台集成

```
如果项目已接入错误监控平台（Sentry / Fundebug / 阿里 ARMS 等）：
  - 改动上线后，观察 5~10 分钟内是否有新增错误
  - 对比发布前后的错误趋势，确认无新增异常
  - 重点关注：新增的 TypeError、NetworkError、ChunkLoadError（懒加载失败）

如果项目未接入错误监控：
  - 建议至少在 Playwright 测试中加入上述运行时错误捕获
  - 改动后手动打开浏览器控制台，检查有无红色报错
```

### 5.12 CI/PR 门禁

测试写完了，还需要一道自动化卡口确保测试不被绕过。

#### 最小 CI 配置

```yaml
# .github/workflows/test.yml
name: Frontend Quality Gate
on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck --if-present
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

#### PR 合并规则

```
MUST（最低要求）：
  ✅ CI 全绿才能合并（lint + typecheck + tests）
  ✅ 测试失败时上传 Playwright 报告，方便排查
  ✅ 至少 1 人 Code Review Approve

SHOULD（推荐）：
  ☑ 视觉回归 snapshot 变更需要在 PR 中 review 截图 diff
  ☑ snapshot 更新（--update-snapshots）只允许 PR 作者操作，reviewer 确认
  ☑ 新增页面/组件的 PR 必须包含对应测试文件

PR Review Checklist（reviewer 参考）：
  □ 测试是否覆盖了改动的核心路径
  □ 是否有 snapshot 变更？变更是否符合预期？
  □ 是否引入了新的 console.error / 网络报错？
  □ 响应式是否考虑？（至少桌面 + 移动端）
  □ data-testid 命名是否语义化？
```

#### 测试失败处理流程

```
CI 测试失败后：
  1. 查看 Playwright HTML 报告（下载 CI artifact）
  2. 定位失败原因：
     - 截图 diff → 视觉回归问题 → 确认是预期改动还是 bug
     - 超时 → 接口未 mock / 页面加载异常
     - 元素未找到 → selector 失效 / 页面结构变化
  3. 修复后推送新 commit，CI 自动重跑
  4. MUST NOT 直接跳过测试合并（--no-verify / 关闭 CI check）
```

### 5.13 非 E2E 测试接入模板

> 前置：阶段 4/5 完成后，按需接入单元测试和组件测试。

#### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
})
```

#### package.json scripts

```json
{
  "scripts": {
    "test:unit": "vitest run --dir tests/unit",
    "test:component": "vitest run --dir tests/component"
  }
}
```

#### Testing Library 选择（按框架）

| 框架 | Testing Library |
|------|----------------|
| React | @testing-library/react |
| Vue 3 | @vue/test-utils + @testing-library/vue |
| Svelte | @testing-library/svelte |
| Angular | @angular/platform-browser/testing |

#### CI 接入时机

```
- test:unit  → 阶段 4 完成后 CI 必跑
- test:component → 阶段 5 完成后 CI 必跑（仅公共组件库）
```

#### CI 补充配置

```yaml
# 在 .github/workflows/test.yml 的 verify job 中追加
- run: npm run test:unit
- run: npm run test:component --if-present
```

---

## 6. 视觉验证闭环

### 6.1 三种验证方式

| 方式 | 适用场景 | 精度 | 速度 |
|------|---------|------|------|
| Playwright MCP 截图 + Claude 视觉对比 | 日常改动 | 高 | 快 |
| Playwright 截图回归测试 | CI 自动检测 | 最高 | 中 |
| Chrome DevTools MCP 实时调试 | 微调样式 | 最高 | 慢 |

### 6.2 日常改动验证流程

```
改完代码后执行：

1. 用 playwright 截图当前页面（桌面 + 移动端）
2. 读取 .baseline/ 中改前截图
3. 对比两组截图，逐条确认：
   - 改动点是否生效
   - 未改区域是否保持不变
   - 移动端是否正常
4. 如有偏差，继续调整
5. 验证通过后，用新截图替换 .baseline/ 中的旧截图
```

### 6.3 让 AI 做视觉审查

```
[截图展示改后结果]

以设计审查的视角检查这个页面：
1. 间距是否均匀、有节奏感
2. 对齐是否一致（左对齐/居中是否统一）
3. 字体层级是否清晰（标题 > 正文 > 辅助文字）
4. 颜色对比度是否足够（WCAG AA 标准，自动化检测见 5.10）
5. 交互元素是否有足够的可点击区域（≥ 44px）
6. 移动端是否有截断、溢出、重叠
```

### 6.4 有设计图时的还原度验证

当有设计图（来自 Figma / Sketch / Adobe XD / Pixso / MasterGo / 即时设计 / Motiff 等）时，在 Step ⑤ 截图对比中增加一步还原度校验：

```
1. 上传设计图截图 + 当前页面截图（同视口宽度）
2. 让 Claude 逐区域对比，列出差异清单：
   - 间距偏差（哪里多了/少了几 px）
   - 颜色偏差（实际色值 vs 设计色值）
   - 字号/字重不一致
   - 圆角、阴影、边框差异
   - 图标大小或位置偏移
3. 按差异清单逐项修复
4. 修复后重新截图，再次对比直到达标

Prompt 示例：
  [上传设计图截图]
  [上传页面截图]
  对比这两张图，列出所有视觉差异，按严重程度排序
  然后逐项修复 [文件路径]
```

**设计 token 提取方式**（按精度排序）：

| 方式 | 适用工具 | 精度 | 说明 |
|------|---------|------|------|
| Dev Mode / 标注模式导出 CSS | Figma / Pixso / MasterGo / 即时设计 | 最高 | 直接复制 token 给 Claude |
| Figma 官方插件 | Figma（Claude Code 插件 `figma@claude-plugins-official`） | 高 | 配合 `figma-implement-design` 技能，Claude 直接读取设计上下文、截图和资产 |
| 设计标注工具 | 蓝湖 / Zeplin / MockingBot 等 | 高 | 开发者查看标注，手动提取 |
| 截图对比 | 任何工具 | 中 | 通用兜底方案，所有工具可用 |

---

## 7. AI 协作规范

### 7.1 Prompt 工程化管理

```
项目级 prompt 模板 SHOULD 存放在固定位置：
  📁 .prompts/               ← 项目级 prompt 模板目录
     ├── guard-test.md       ← 守护测试生成 prompt
     ├── new-page.md         ← 新页面生成 prompt
     ├── visual-review.md    ← 视觉审查 prompt
     └── code-review.md      ← 代码审查 prompt

规则：
  - prompt 模板纳入 git 版本管理，改动走正常 PR 流程
  - 项目画像唯一事实源 MUST 为 CLAUDE.md 或 AGENTS.md（二选一，默认 CLAUDE.md）
  - prompt 模板 MUST 写成"先读取 CLAUDE.md / AGENTS.md，再执行任务"，而不是复制一份项目画像到模板里
  - 模板中 MUST NOT 包含：硬编码的文件路径、具体业务数据、重复维护的项目画像正文
  - 团队成员 SHOULD 复用项目级模板，避免各自发明 prompt
```

### 7.2 AI 输出验收标准

```
AI 生成的代码 MUST 经过以下验收才能提交：

自动验收（CI 可执行）：
  ✅ lint / format 通过（ESLint + Prettier）
  ✅ TypeScript 类型检查通过（如适用）
  ✅ 现有测试全绿（无回归）
  ✅ 新增代码有对应测试

人工验收（reviewer 检查）：
  ✅ 代码风格与项目现有代码一致（不引入新范式）
  ✅ 无 AI 常见陷阱：
     - 未经确认的 npm 包引入
     - 硬编码的 mock 数据残留在生产代码中
     - 过度抽象（为单一用途创建泛化工具函数）
     - 注释解释"是什么"而非"为什么"
  ✅ 改动范围与需求一致（不多改、不少改）
```

### 7.3 会话产物沉淀

```
AI 会话中产生的有价值信息 SHOULD 沉淀到项目，不随会话消失：

沉淀内容               → 写入位置
──────────────────────────────────────
架构决策和权衡           → memory/decisions.md
踩坑和已知限制           → memory/issues.md
发现的代码模式           → memory/patterns.md
项目上下文（AI 需知）     → CLAUDE.md / AGENTS.md
可复用的 prompt          → .prompts/

维护规则：
  - 只记录"跨会话仍有价值"的信息；一次性调试日志 MUST NOT 写入 memory/
  - 每次 PR 结束前，如出现新决策、新限制、新模式，MUST 同步更新对应文件
  - 每条记录 SHOULD 带日期、关联 PR / issue、适用范围
  - 同一信息只保留一处；项目画像放 CLAUDE.md，不要在 memory/ 重复
  - memory/issues.md 中的问题项 MUST 包含：现象、触发条件、临时规避、最终状态
  - memory/patterns.md 中的模式只有在至少出现 2 次以上时才沉淀，避免把偶发写法当规范
  - 每月或每 10 次 PR 至少清理一次：删除过期项、合并重复项、已解决问题标记 resolved

不需沉淀：
  ❌ 单次调试过程的中间尝试
  ❌ AI 的解释性文字（理解后即丢弃）
  ❌ 临时的 spike / 探索代码
```

### 7.4 AI 变更授权矩阵

以下规则用于消除"默认禁改"与"测试基础设施建设"之间的冲突。原则：业务改动默认只允许改业务代码；基础设施改动只有在任务明确授权时才允许。

| 对象 | 默认规则 | 允许 AI 修改的场景 | 额外要求 |
|------|---------|------------------|---------|
| 认证/鉴权、支付/交易、数据库 migration、`.env*`、密钥 | MUST NOT | 不允许；AI 只可输出分析和 patch 建议，由人工落地 | MUST 走人工审批 |
| CI/CD 配置（`.github/workflows/`、`Jenkinsfile` 等） | 默认 MUST NOT | 仅当任务明确包含"搭建/修复测试门禁、接入 Playwright / lint / typecheck"时，AI MAY 修改 | MUST 拆分为独立 infra PR，触发 CODEOWNERS 审批 |
| `package.json` scripts | MAY | 为接入 `lint`、`typecheck`、`test:e2e` 等脚本时允许 | PR 描述中 MUST 说明新增脚本用途 |
| `package.json` devDependencies | MAY | 为测试、lint、typecheck、格式化等开发工具时允许 | MUST 说明新增原因和版本来源 |
| `package.json` dependencies | 默认 MUST NOT | 仅当需求显式授权"允许新增生产依赖"时 MAY 修改 | MUST 说明引入原因、体积/安全影响，经人工审批 |
| MCP / 本地开发工具配置 | MAY | 为本地开发、测试效率提升时允许 | MUST NOT 写入密钥，MUST NOT 影响生产环境 |

```
补充规则：
  - 若任务未明确授权，AI 对以上灰区文件只输出修改建议，不直接提交改动
  - 涉及 CI/CD 或 dependencies 的改动 SHOULD 与业务改动拆分为独立 PR，避免混审
  - 任何超出本次需求范围的"顺手升级依赖""顺手优化流水线"均 MUST NOT 执行

实施方式：
  - Claude Code：在 CLAUDE.md 中声明禁改路径和授权规则
  - Cursor / Copilot：在 .cursorrules 或项目 README 中声明
  - CI 兜底：对以上路径的改动 MUST 触发 CODEOWNERS 强制审批
```

### 7.5 Review Checklist（AI 生成代码专用）

```
PR Review 时，针对 AI 生成代码额外检查：

□ 是否引入了项目未使用的新依赖？
□ 是否符合项目现有的代码组织方式（目录结构、命名约定）？
□ 是否有"看起来对但实际多余"的代码（防御性过度、空 catch、无用 try-finally）？
□ 是否有 AI 幻觉痕迹（不存在的 API、错误的参数顺序、编造的配置项）？
□ 是否复用了项目已有的工具函数/组件，而非重新实现？
□ 改动范围是否精确匹配需求，无附带"顺手优化"？
```

### 7.6 AI PR 证据包

AI 生成代码的 PR MUST 附带证据包；缺任一项，reviewer 可直接退回。

```
PR 描述中至少包含以下内容：

1. 需求摘要
   - 本次改了什么
   - 本次明确不改什么

2. 改动文件清单
   - 按模块列出主要文件
   - 标出是否涉及公共组件 / 公共样式 / 路由 / 配置

3. 自动化验证结果
   - lint：命令 + 结果
   - typecheck：命令 + 结果（或标注不适用）
   - tests：命令 + 结果
   - 如有失败后修复，说明根因和修复方式

4. 视觉证据
   - 改前截图
   - 改后截图
   - 如有 snapshot diff，附变更说明

5. 回归影响范围
   - 受影响的公共能力
   - 已抽查页面或流程列表

6. 配置与依赖变更（如有）
   - 新增/升级依赖及原因
   - package.json scripts、CI、hook、MCP 配置改动及原因

7. 未覆盖项与剩余风险
   - 本次未验证但可能受影响的场景
   - 建议后续补充的验证项
```

---

## 8. 常见场景速查

### 8.1 调整表格页面

```
读取 [文件路径]
当前问题：[描述具体问题]

修改要求：
- 列宽分配：[列名: 宽度]
- 行高：[数值]px
- 表头样式：背景色 [色值]，字色 [色值]
- 操作列：[按钮组织方式]
- 空数据状态：[描述]
- 分页位置：[左/右/居中]

约束：优先使用 [UI 库] 表格组件的 prop / API 调整，不直接覆盖内部 CSS
```

### 8.2 调整表单页面

```
读取 [文件路径]
当前问题：[描述具体问题]

修改要求：
- 表单布局：[单列/双列/响应式切换]
- label 宽度：[数值]px
- 字段间距：[数值]px
- 按钮位置：[描述]
- 校验提示样式：[描述]

约束：使用 [UI 库] 表单组件的 prop / API，保持校验规则不变
```

### 8.3 调整导航 / 布局

```
读取布局相关文件（layout 目录或 App 组件）
当前问题：[描述具体问题]

修改要求：
- 侧边栏宽度：[数值]px（收起时 [数值]px）
- 顶栏高度：[数值]px
- 顶栏内容：[描述]
- 面包屑：[显示/隐藏/样式调整]

⚠️ 注意：布局改动影响所有页面，修改后 MUST 用 playwright 截图 3+ 个不同类型页面验证
```

### 8.4 UI 库版本升级后的样式修复

```
项目从 [UI 库] [旧版本] 升级到 [新版本]
以下页面出现样式异常：[列表]

请逐个页面：
1. 截图当前状态
2. 对照 .baseline/ 找出差异
3. 用新版 API 修复，不用 CSS hack 硬覆盖
4. 截图确认修复结果
5. 更新 .baseline/

use context7 查阅 [UI 库] [新版本] 的 breaking changes 和迁移指南
```

### 8.5 暗色模式 / 主题切换

```
当前项目 [有/无] 暗色模式支持
任务：[新增暗色模式 / 修复暗色模式下的样式问题]

检查方式：
1. 切换到暗色模式
2. 截图所有关键页面
3. 检查：硬编码颜色、对比度不足、图标不可见、阴影异常
4. 修复后再次截图对比

约束：
- 使用 CSS 变量 / 主题 token，不写死颜色值
- 与项目现有主题方案一致
```

### 8.6 国际化 / 文字溢出

```
任务：检查 [页面] 的国际化适配问题

检查方式：
1. 将语言切换为 [目标语言]（或 mock 长文本）
2. 截图检查：文字截断、布局错乱、按钮溢出
3. 修复溢出问题（text-overflow / flex-wrap / min-width）
4. 验证 RTL 布局（如需支持阿拉伯语等）
```

---

## 9. 避坑指南

### 9.1 AI 改 UI 的常见翻车

| 翻车类型 | 原因 | 预防 |
|---------|------|------|
| 改了样式，逻辑也被改了 | AI 无法区分展示逻辑和业务逻辑 | `/freeze` 锁住非 UI 层 |
| 引入项目没有的新模式 | AI 按"最佳实践"而不是"项目惯例"写 | prompt 强调"遵循项目现有风格" |
| 覆盖了 UI 库内部样式 | AI 用深穿透（`::v-deep` / `::ng-deep` / `:global`）暴力覆盖 | 要求优先用组件 prop / API |
| 响应式被破坏 | 只在大屏改，没测小屏 | 必须截图 2 个以上断点 |
| 动态样式被丢掉 | AI 替换模板时删了条件 class / 动态 style 绑定 | 改前让 AI 列出所有动态绑定 |
| 生成过多小组件 | AI 倾向过度抽象 | "不创建新组件，除非我明确要求" |
| TypeScript 类型报错 | AI 改了 props / interface 但没更新调用处 | 改完跑一次构建检查 |
| CSS 作用域泄露 | AI 在全局样式文件中加了规则 | 要求新样式只写在组件级别 |

### 9.2 Prompt 防御性写法

每次改 UI 的 prompt 末尾加上：

```
改动前检查清单：
1. 列出本次会修改的所有文件
2. 列出逻辑层是否有改动，如有说明理由
3. 列出所有动态样式绑定（条件 class / 动态 style），确认不会丢失
4. 列出改动是否影响其他页面（如修改了全局样式或公共组件）

确认后再执行
```

### 9.3 什么时候不该用 AI 改

| 场景 | 原因 | 建议 |
|------|------|------|
| 性能优化（虚拟滚动、懒加载策略） | AI 容易给出"教科书方案"但不适合你的数据量 | AI 分析 + 人工实施 |
| 复杂动画（手势、弹簧动画、交错动画） | AI 生成的动画代码通常需要大量微调 | 手写更快 |
| CSS 布局大手术（float → flex/grid） | 需要人理解每个页面的上下文和历史原因 | AI 辅助逐页迁移 |
| UI 库深度定制（重写内部组件） | AI 容易给出已废弃的内部 API | 查官方文档手动定制 |
| 复杂状态联动的 UI（拖拽排序、画布编辑器） | UI 与状态深度耦合，改一处牵全身 | 人工主导，AI 辅助 |

### 9.4 各框架特有的坑

**Vue**：
- AI 容易混淆 Vue 2 和 Vue 3 语法（`this.xxx` vs Composition API）
- `::v-deep` 在 Vue 3 中应使用 `:deep()` 替代
- prompt 中明确 Vue 版本

**React**：
- AI 容易在 JSX 中混入 HTML 属性（`class` vs `className`、`for` vs `htmlFor`）
- CSS Modules 的 `styles.xxx` 与 Tailwind 的 `className="xxx"` 别混用
- prompt 中明确 CSS 方案

**Angular**：
- AI 容易生成 standalone component 和 NgModule component 的混合代码
- `::ng-deep` 已废弃但项目可能在用，prompt 中明确是否允许
- ViewEncapsulation 策略影响样式隔离

**Svelte**：
- AI 对 Svelte 5 runes（`$state`、`$derived`）和 Svelte 4 store 语法容易混淆
- prompt 中明确 Svelte 版本

---

## 10. 工具配置参考

### 10.1 推荐 MCP 配置

**MCP Servers**（写入 `~/.claude/settings.json` 的 `mcpServers` 字段）：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-playwright@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

**Claude Code 插件 + 技能**（Figma 设计还原完整工具链）：

安装命令：
```bash
# 1. 安装 Figma 官方插件（提供 MCP 工具）
claude plugin install figma@claude-plugins-official

# 2. 安装 figma-implement-design 技能（编排 7 步还原工作流）
npx skills add https://github.com/openai/skills --skill figma-implement-design
```

安装后 `~/.claude/settings.json` 中会自动写入：
```json
{
  "enabledPlugins": {
    "figma@claude-plugins-official": true
  }
}
```

> **Figma 插件认证**：首次使用在 Claude Code 中执行 `/mcp` 命令，在弹出的面板中完成 Figma OAuth 认证。认证成功后显示 `Authentication successful. Connected to plugin:figma:figma.`，之后自动连接，无需重复认证。
>
> 插件提供的核心工具：
> - `get_design_context` — 获取节点的布局、排版、色值、组件结构、间距等设计上下文
> - `get_screenshot` — 获取节点截图，作为还原验证的 source of truth
> - `get_metadata` — 获取文件/节点元数据
> - `get_code_connect_map` / `get_code_connect_suggestions` — 查询 Code Connect 映射关系
> - `generate_figma_design` — 将代码/描述写回 Figma（反向同步）
>
> 配合 `figma-implement-design` 技能使用，实现设计到代码的像素级还原。

### 10.2 可选 Hooks 配置（默认不启用自动修复）

> 原则：默认只做只读检查，不做会改文件内容的自动修复。`lint --fix`、格式化、排序 import 等会产生静默改动的命令 MUST 由开发者手动执行，不建议放在团队默认 hook 中。

```jsonc
// ~/.claude/settings.json (部分) — 只读检查版（推荐）
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

如需自动修复，使用手动命令而非 hook：
```bash
npm run lint -- --fix
```

### 10.3 playwright.config.ts 推荐配置

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',  // 按实际端口修改
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: {
    command: 'npm run dev',  // 按实际启动命令修改
    port: 5173,              // 按实际端口修改
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 附录 A：Prompt 模板速查

### A.1 项目画像生成

```
读取 package.json、路由配置、样式文件、API 层代码
输出项目技术栈和组件结构画像
```

### A.2 存量页面修改（测试先行）

```
1. 读取 [文件路径]，截图现状
2. 先写守护测试锁住现有行为，跑一次确认全绿
3. 修改要求：[从A改到B的精确描述]
4. 约束：只改模板层 + 样式层，不改逻辑层业务代码
5. 改前列出计划，确认后执行
6. 跑守护测试确认未破坏现有功能 + 截图对比
7. 补充新需求的测试
```

### A.3 新增页面（测试先行）

```
新增页面：[名称]，路由：[路径]
功能：[描述]
1. 先做复用分析（找项目中相似页面和可复用组件）
2. 基于需求先写 E2E 测试（此时应全部失败）
3. 再写页面代码，遵循项目现有风格，所有交互元素加 data-testid
4. 跑测试直到全绿
```

### A.4 视觉审查

```
[截图]
检查间距、对齐、字体层级、颜色对比度、可点击区域、响应式是否正常
```

### A.5 写守护测试（改代码前）

> 覆盖维度选择规则见 **Section 5.5**，本模板可直接复用。

```
为 [页面路径] 生成 Playwright E2E 守护测试
目标：锁住现有行为，不是验证新需求
按改动影响范围选择覆盖维度（见 5.5 详细规则）：
① UI：关键元素可见、布局正确、响应式无溢出 → 改 UI/样式时必选
② UX：核心交互流程、操作反馈 → 改交互逻辑时必选
③ 异常边界：空数据、接口报错、未登录不白屏 → 改业务逻辑时必选
④ 兼容性：按 L1/L2/L3 分层策略选择 → 改全局样式/公共组件时必选
⑤ 回归：涉及公共组件则抽查其他页面 → 改公共代码时必选
⑥ 性能：首屏无卡顿白屏 → 可选（见 5.9）
在模板中补 data-testid（单独提交）
跑一次确认全绿，再开始改代码
```

### A.6 UI 库文档查询

```
use context7 查阅 [UI 库名] [版本号] 的 [组件名] 文档
重点看：可用 prop、事件、插槽/slot、主题变量
```

---

## 附录 B：从存量页面渐进式提取组件

当你改了 3+ 个存量页面后，会发现重复模式。这时候可以提取公共组件：

```
分析以下页面中的重复 UI 模式：
- [页面1路径]
- [页面2路径]
- [页面3路径]

找出重复度最高的 UI 结构（如：搜索栏 + 表格 + 分页组合）
提取为公共组件，但不改动已有页面
新页面优先使用提取后的公共组件
```

原则：
- **先标记后提取**：发现重复时先在 `CLAUDE.md` 记录"待提取模式"，积累 3 次以上再提取
- **不回改存量**：提取组件后，已有页面保持不动；新页面和后续改动才使用新组件
- **渐进替换**：当存量页面因为其他需求需要改动时，顺手替换为新组件
