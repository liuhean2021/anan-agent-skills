# 兼容与适配架构方案建议

> 目标：**不限技术栈**，让项目在基线内所有浏览器上语法可运行，在各种屏幕（含异形屏、折叠屏）上显示一致，并且 **PC 与手机各自有一套统一的显示规则**，而不是每个页面各自适配。
> 审查与新建项目时都按本文给出架构建议（写入审查报告「架构与一致性建议」，review.md §5）。建议只是方案，落地任何改动前 MUST 经用户确认（review.md §6）。框架 / 构建工具的具体选项以其官方文档为准，数据核对于 2026-11。

## 1. 总体原则

1. **一处声明基线**：浏览器目标只在一个地方定义（browserslist），构建、CSS 前缀、lint、产物检查都读它。
2. **语法在构建期解决，运行时只做能力检测与兜底**：不在业务代码里写 UA 版本分支。
3. **适配集中在少数基础层**：安全区、固定栏、视口高度、根字号、弹层挂载由公共样式与公共组件处理，业务页面不直接写 `env()`、`100vh`、`position: fixed` 底栏。
4. **每端一套规则**：手机端一套「等比缩放 + 上限居中」规则，PC 端一套「版心 + 断点 + 最小宽度」规则；平板、折叠屏明确归属其中一端。
5. **能自动化的都自动化**：lint 拦截超基线写法，CI 跑产物检查与多视口截图，真机只验证自动化覆盖不到的部分。

## 2. 分层架构

| 层 | 职责 | 落地形式（与框架无关） | 详见 |
|----|------|----------------------|------|
| ① 目标声明层 | 基线与支持等级的唯一来源 | `.browserslistrc`（或 `package.json` 的 `browserslist`）+ 项目兼容声明文档 | standard.md §9.2；declaration-template.md |
| ② 构建兼容层 | 语法转译、ES API polyfill、依赖转译、CSS 前缀与可降级特性 | 构建工具对应配置（§3）+ autoprefixer / PostCSS | standard.md §4 / §8 |
| ③ 运行时兜底层 | 基线以下提示、能力检测、存储与日期等易错 API 的安全封装、错误与 UA 上报、宿主能力适配 | `index.html` 内联 ES5 闸门 + `compat/` 模块（§6） | standard.md §9.3 / §9.4 |
| ④ 设计令牌层 | 颜色、字号阶梯、间距阶梯、圆角、阴影、z-index、断点、安全区变量的统一定义 | `tokens.css`（CSS 变量），设计系统文档为单一来源 | 可配合 `design-md-author` 技能 |
| ⑤ 适配基础层 | 每端的尺寸规则：手机根字号 / vw、PC 版心与断点；异形屏安全区 | 公共样式 + 根字号脚本 | screen-adaptation.md |
| ⑥ 布局组件层 | 统一处理页面容器、安全区、固定栏、弹层、滚动锁定、比例图、横屏提示、响应式表格 | 少量公共组件（§5） | 本文 §5 |
| ⑦ 质量守护层 | lint、产物检查、多视口截图回归、真机记录 | ESLint / Stylelint 插件、CI 脚本、Playwright | 本文 §7 |

### 2.1 多应用 / monorepo 的一致性

多个应用（或由模板生成的新应用）共用兼容规则时，靠约定容易漂移，按下面的方式收敛：

| 做法 | 说明 |
|------|------|
| 依赖版本按端集中管理 | 如 pnpm catalog 分 `catalog:pc` / `catalog:h5`，Vite、`@vitejs/plugin-legacy`、框架、组件库、terser 等同端一起升级；若约定只允许补丁升级（`~主.次.补丁`），用脚本检查范围写法是否被放宽 |
| 兼容配置与全局样式放进底座包 / 模板 | legacy 目标、`index.html` head、全局样式（安全区、`touch-action`、`text-size-adjust` 等）由底座或模板提供，应用不各写一份 |
| 用测试守护不漂移 | 应用与底座之间需要保留副本时，加测试比对内容或哈希（如「底座全局样式与应用一致」），构建配置的关键项（legacy 目标、`base`、别名）也写测试断言 |
| 新应用沿用已审基线 | 兼容声明写「沿用 <应用> 已审基线」并列出逐项比对依据；改动兼容目标、依赖版本、全局样式、`index.html` head 或引入新 JS / CSS 特性时，须重新做兼容审查（declaration-template.md） |
| 兼容声明分应用 | 一份兼容声明按应用分节（PC / H5 / 模板），各写更新日期，避免一处更新冒充全部 |

## 3. 各技术栈的构建兼容层

所有技术栈都适用同一套检查方法（产物检查脚本只看构建出的 `.js` / `.css`），差别只在②层怎么配置。**重点支持主流组合：构建工具 Vite / webpack × 框架 Vue / React**；其他工具链见 §3.3。

### 3.1 框架硬下限（决定最多能覆盖到哪）

| 框架 | 硬下限 | 说明 |
|------|--------|------|
| Vue 3 | 支持原生 `Proxy` 与 ES2016 的浏览器：Chrome 51 / iOS 10 量级（h5.md §2），组件库下限更高时取更高者 | `Proxy` 无法 polyfill，IE 11 不可支持 |
| Vue 2.7 | 含 IE 11 | 已停止维护；需 core-js 补 `Promise` 等 |
| React 18 / 19 | 现代浏览器，不支持 IE | 依赖 `Map` / `Set` / `Promise` 等，老 WebView 由 core-js 补齐 |
| React 16 / 17 | 含 IE 11 | 需 core-js（或 `react-app-polyfill`）补 `Map` / `Set` / `Promise` / `requestAnimationFrame` |

组件库下限更高时取更高者（standard.md §3）。

### 3.2 主流组合配置要点

| 组合 | 方案 | 关键配置 | 易错点 |
|------|------|---------|--------|
| **Vite + Vue 3** | B 或 C | `@vitejs/plugin-vue` + `@vitejs/plugin-legacy`：`modernTargets` 写 ESM 下限，需更低时 `targets` 写硬下限（standard.md §4.1 / §4.1.1）；落地骨架见 h5-engineering.md | 不写 `modernTargets` 时现代包的默认目标偏高（新版插件如 8.x 约为 chrome 105 / Safari·iOS 16.4，旧版如 5.x 为 chrome 64；以所装版本的 README 为准，用 `npx browserslist` 或产物检查核对）；Vite 7+ 未配置时 `build.target` 也偏高 |
| **Vite + React 18 / 19** | B 或 C | `@vitejs/plugin-react`（或 `-swc`）+ `@vitejs/plugin-legacy`，配置同上 | 同上；`@vitejs/plugin-react-swc` 只负责 JSX / 快速刷新，**降级仍靠 legacy 插件或 `build.target`** |
| **webpack + Vue（Vue CLI 4 / 5 或自建）** | D | `.browserslistrc` 写到硬下限；`babel.config.js` 用 `@vue/cli-plugin-babel/preset`（内含 preset-env + `useBuiltIns: 'usage'`）；以 ES6+ 发布的依赖加入 `transpileDependencies`（standard.md §4.0） | Vue CLI 默认不转译 `node_modules`；`public/` 下原样拷贝的 vendor 不经 Babel |
| **webpack + React（CRA 已停止维护 / 自建）** | D | `babel-loader` + `@babel/preset-env`（`useBuiltIns: 'usage', corejs: 3`）+ `@babel/preset-react`；`babel-loader` 的 `include` 覆盖需转译的依赖；含 IE 11 时入口引入 `react-app-polyfill/ie11` 或 core-js | 只 `exclude: /node_modules/` 会漏掉以新语法发布的依赖 |

**webpack 5 的运行时代码**：webpack 自己生成的启动 / 分包加载代码按 `target` 输出。项目有 browserslist 配置时默认 `target: 'browserslist'`，会按基线输出；**没有 browserslist 配置时默认 `'web'`，运行时可能含箭头函数等 ES2015 语法**，基线含 IE 11 / ES5 时须声明 browserslist 或设 `target: ['web', 'es5']`。webpack 4（Vue CLI 4）运行时恒为 ES5。

**四种组合通用**：autoprefixer 读同一份 browserslist；产物用 `check-browser-compat.mjs` 检查；`index.html`（Vite 在根目录，webpack / Vue CLI 在 `public/`）加 ES5 闸门脚本；PC 加双核 meta、H5 加移动端 head。

### 3.3 其他工具链（参考，以官方文档为准）

| 构建 / 框架 | 目标声明 | polyfill | 依赖转译 | 注意 |
|-------------|---------|---------|---------|------|
| Rsbuild / Rspack | browserslist（或 `output.overrideBrowserslist`） | `output.polyfill: 'usage'` + core-js | 默认**不**编译 `node_modules`，用 `source.include` 指定；`@rsbuild/plugin-check-syntax` 可定位 | — |
| Next.js | 项目 browserslist；未配置时默认 Chrome / Edge / Firefox 111、Safari 16.4 | 内置 `fetch` / `URL` / `Object.assign` 等少量，其余自行引入 | `transpilePackages` | 默认基线偏高，面向老设备必须声明 browserslist |
| Nuxt | 基于 Vite：`vite.build.target` 等 | 自行引入 | 同 Vite | legacy 方案需自行集成 |
| Angular | browserslist（只能收窄，不能低于官方支持范围） | CLI 自带 | — | 官方只支持较新浏览器，硬下限高 |
| Taro / uni-app 编译到 H5 | 框架配置中的 browserslist / 编译目标 | 框架配置 | 框架配置 | H5 产物同样跑产物检查 |
| 无构建（原生 JS / jQuery） | 兼容声明文档 | 按需引入 polyfill 文件 | — | 用 `eslint-plugin-es-x` 限制源码语法级别 |

框架本身下限高（Angular、Next.js 默认、Vue 3 的 `Proxy`）时，构建配置无法突破，只能在报告里写清并由用户决定是否接受或调整技术栈。

## 4. 端策略：PC 与手机怎样各自统一

### 4.1 一套响应式还是两套界面

| 情况 | 建议 |
|------|------|
| 内容 / 营销 / 文档类，两端信息结构相同 | **一套响应式**：移动优先写法，≥ 768 / ≥ 1024 断点切换 PC 布局 |
| 后台、数据密集、两端交互差异大（PC 表格 + 弹窗，手机卡片 + 抽屉） | **两套界面、共享逻辑**：接口、状态、校验、工具函数共享，视图层分端（多入口或按端分目录）；入口按特性 + 视口分流，并提供手动切换 |
| 只有一端 | 只为该端建立规则，兼容声明写明另一端不在范围 |

不要用 UA 作为唯一分端依据（iPadOS 伪装 Mac、折叠屏展开后宽度接近平板）。

### 4.2 手机端统一规则

| 项 | 规则 |
|----|------|
| 设计基准 | **375 或 750 宽设计稿均可**，全项目只声明一个 `DESIGN_WIDTH`，换算基准由它推导；组件库基准不同时按文件区分（screen-adaptation.md §2.4）。320–540 区间**等比缩放**（rem 或 vw），超过上限**居中**不再放大 |
| 下限 | 缩放后正文 ≥ 12px、输入框 ≥ 16px、点击区域 ≥ 44×44（关键尺寸写不缩放单位，screen-adaptation.md §2.3） |
| 异形屏 | 背景铺满、内容避让：页面容器、顶部栏、底部栏统一由组件加安全区（screen-adaptation.md §3.1） |
| 高度 | 统一用页面容器的 `min-height: 100vh; min-height: 100dvh;`，业务页面不再各写 |
| 方向 | 默认竖屏 + 横屏提示（h5.md §5.1）；声明支持横屏时，横屏下内容同样居中限宽 |
| 平板 / 折叠屏展开 | 明确归属：沿用手机规则（居中限宽）或切换到平板 / PC 布局，二选一并写入兼容声明 |

### 4.3 PC 端统一规则

| 项 | 规则 |
|----|------|
| 版心 | 内容区统一 `max-width`（如 1200 / 1440）居中；后台类全宽布局用栅格 + 侧栏，最大宽度同样设上限 |
| 断点 | 统一一组断点（如 1280 / 1440 / 1920），在令牌层定义，不在页面里写散落的媒体查询数值；后台类系统也可以明确「不做断点重排」，只按设计稿宽度（如 1440）还原、保证最小可用宽度 |
| 最小宽度 | 设定最小可用宽度（如 1200 / 1280）。窄于它时按组件约定退让，而不是挤压错位：表格在所在卡片内**横向滚动**，筛选区保持原有列数，弹窗宽度固定、在视口内纵向滚动；仍不够时整页横向滚动 |
| 两端关系 | PC 与手机分别实现时写明「两端页面不互相适配」，避免 PC 页面被要求兼顾手机、手机页面被套用 PC 约定 |
| 例外声明 | 单个功能的适配方式与总规则不同时，在该功能的交互 / 设计文档里写明并说明原因，总规则不变 |
| 字号与单位 | px 为主，不随视口缩放；浏览器缩放与系统缩放（125% / 150%）下按实际 CSS 宽度验证 |
| 矮屏 | 1366×768 去掉浏览器工具栏后视口高约 650：弹窗 `max-height` + 内部滚动，固定头尾不占满高度 |
| 超宽屏 | 2560 / 3440 宽下内容不被拉伸，空白区域有背景处理 |

## 5. 布局组件层（职责定义，任何框架都可实现）

| 组件 | 统一处理的问题 | 规则 |
|------|-------------|------|
| 页面容器（Page / AppShell） | 限宽居中、最小高度、顶部安全区 | 所有页面必须包在它里面 |
| 安全区（SafeArea） | 刘海 / 灵动岛 / 打孔 / Home 指示条 / 横屏左右侧 | 背景延伸到边缘、内容内缩；兼容 `constant()` 写法（screen-adaptation.md §3.1） |
| 固定底栏（FixedBottomBar） | 底部安全区、内容被遮挡、限宽失效 | 自带等高占位元素，业务无需再算 `padding-bottom`；背景铺满全宽，内容放内层并与页面容器同宽居中（fixed 不受页面容器 `max-width` 约束，顶部栏、悬浮按钮同理） |
| 弹层（Popup / Modal / Toast） | fixed 被祖先 `transform` 影响、滚动穿透、矮屏溢出 | 挂载到 `body`（Portal / Teleport）；打开时锁定滚动；`max-height` + 内部滚动 |
| 比例图（RatioBox） | 首屏大图高度塌陷、跳动 | `padding-top: 高÷宽 %` 占位，不依赖 `aspect-ratio` |
| 横屏提示（RotateTip） | 手机横屏布局压扁 | h5.md §5.1 |
| 响应式表格（ResponsiveTable） | PC 表格在手机上溢出 | 手机切卡片或容器内横向滚动，二选一统一使用 |

审查时检查：业务代码里是否绕过这些组件直接写 `env(safe-area-inset`、`100vh`、`position: fixed`；有则建议收敛到组件（🟢，造成遮挡的按实际定级）。

## 6. 运行时兜底层（`compat/` 模块）

| 模块 | 内容 |
|------|------|
| 闸门脚本 | `index.html` 内联 ES5，检测硬下限依赖的能力，不满足时显示升级提示（standard.md §9.3） |
| 能力检测 | 统一导出 `features`，flex gap 用实测、sticky / backdrop-filter 带前缀检测（standard.md §9.4） |
| 安全存储 | `localStorage` / `sessionStorage` 读写包 `try/catch`，失败返回空值（h5.md §5.3 #3） |
| 日期工具 | 统一解析与格式化，禁止业务直接 `new Date('YYYY-MM-DD HH:mm')` |
| 错误上报 | `window.onerror`、`unhandledrejection`、资源加载失败，附 UA 与内核版本，用于修正基线与评估影响 |
| 宿主适配 | 微信 / 企业微信 SDK、App Bridge 收敛为适配层，能力缺失时有替代路径（h5.md §4） |

## 7. 质量守护层

| 手段 | 作用 |
|------|------|
| `eslint-plugin-compat` | 按 browserslist 报告源码中基线不支持且未 polyfill 的 Web API |
| `eslint-plugin-es-x` | 限制不经转译的代码（内联脚本、`public/` 下脚本、无构建项目）的语法级别 |
| `stylelint-no-unsupported-browser-features` | 按 browserslist 报告 CSS 特性风险，配合降级写法白名单 |
| 产物检查脚本（CI） | `scripts/check-browser-compat.mjs`，退出码非 0 阻断合并 |
| 多视口截图回归 | Playwright 按每端视口矩阵截图（`toHaveScreenshot`），固定浏览器版本、字体与 DPR；安全区用覆盖 CSS 变量的方式模拟（screen-adaptation.md §4.1） |
| 真机记录 | 自动化覆盖不到的异形屏、WebView、键盘行为按矩阵实测并归档 |

插件名称与配置以各自官方文档为准；引入属于新增依赖，须经用户确认。

## 8. 在审查报告中输出建议

「架构与一致性建议」一节按下表输出，最多列出收益最大的若干项，不罗列全部：

| # | 层 | 现状 | 建议 | 收益（覆盖率 / 一致性 / 维护） | 代价（改动面、依赖、体积） | 优先级 |
|---|----|------|------|-------------------------------|--------------------------|--------|
| 1 | ① 目标声明 | browserslist、legacy targets、autoprefixer 各写一套 | 统一读 `.browserslistrc` | 消除配置不一致导致的白屏 | 改 2 个配置文件 | 立即 |
| 2 | ⑥ 布局组件 | 12 个页面各自写底部安全区 | 抽出固定底栏组件 | 异形屏表现一致 | 改 12 个页面 | 近期 |

优先级取「立即」（影响白屏或核心操作）、「近期」（影响一致性）、「长期」（工程守护与维护性）。
