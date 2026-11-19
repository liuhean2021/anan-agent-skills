# 通用标准（PC + H5）

> 数据核对于 **2026-09**。版本数据会变化，做兼容决策前 MUST 以官方文档 / caniuse / MDN 复核。
> 端专项：[pc.md](pc.md)、[h5.md](h5.md)。

## 1. 术语

| 术语 | 含义 |
|------|------|
| 兼容基线 | 项目承诺「功能可用」的最低浏览器版本集合 |
| 硬下限 | 由框架/组件库决定、无法通过构建手段突破的最低版本 |
| 语法转译 | 构建期把新语法改写为旧语法；运行时 polyfill 无法解决语法问题 |
| API polyfill | 运行时补齐缺失的内置对象/方法，通常由 core-js 提供 |
| 白屏级问题 | JS 包无法解析或入口抛错，页面完全不可用 |
| 样式退化 | CSS 特性不支持，页面可用但布局/样式偏差 |

## 2. 决策流程

```
① 确认端与用户群 → ② 查依赖硬下限 → ③ 定兼容基线 → ④ 选实现方案 → ⑤ 构建并检查 → ⑥ 写兼容声明
```

- ① PC / H5 / 两者；国内 / 海外；政企内网 / 公网；H5 的主要打开环境（系统浏览器 / 微信 / 企业微信 / 钉钉）；有访问统计时以统计为准。
- ② 取所有关键依赖官方下限的最高者（§3）。
- ③ **默认取技术栈硬下限（覆盖率最大化）**；仅当业务明确要求更高、或代价不可接受时才上调，并在审查报告中记录理由与被放弃的覆盖率（browserslist 口径见 pc.md §4 / h5.md §6）。
- ④ 按 §4 选能**达到硬下限**的方案，再用 §8 的手段扩大覆盖；端专项配置见 pc.md / h5.md。
- ⑤ 执行 SKILL.md「产物检查」+ 运行验证。
- ⑥ 按 [declaration-template.md](declaration-template.md) 产出兼容声明。

## 3. 常见依赖的硬下限（核对于 2026-09，以官方为准）

| 依赖 | 端 | 最低浏览器 | IE 11 | 说明 |
|------|----|-----------|-------|------|
| Vue 3 | 通用 | 支持原生 `Proxy` 与 ES2016 的现代浏览器 | ❌ | 响应式依赖原生 `Proxy`，**无法 polyfill** |
| Vue 2.7 | 通用 | 含 IE 11 | ✅ | Vue 2 已于 2023-12-31 停止维护 |
| React 18+ | 通用 | 现代浏览器 | ❌ | React 18 起官方移除 IE 支持 |
| Element Plus | PC | Chrome 64 / Edge 79 / Firefox 78 / Safari 12 | ❌ | 依赖 ES2018 与原生 `ResizeObserver` |
| Element UI（Vue 2） | PC | 含 IE 10+ | ✅ | |
| Vant 4（Vue 3） | H5 | 与 Vue 3 一致：Chrome ≥ 51、iOS ≥ 10 | ❌ | 以 Vant 官方文档为准 |
| Vant 2（Vue 2） | H5 | Android 4.0+、iOS 8+ | — | 已停止维护 |
| Vite 原生 ESM | 通用 | Chrome 64 / Edge 79 / Firefox 67 / Safari 11.1（iOS 11.3） | ❌ | 需原生 ESM + 动态 `import()` + `import.meta`；更低需 §4 方案 C |
| Vite 7+ 默认 `build.target` | 通用 | `baseline-widely-available`（Vite 7 约 Chrome 107 / Safari 16；**Vite 8.3 实测 `chrome111 / edge111 / firefox114 / safari16.4 / ios16.4`**，用 `resolveConfig({root},'build','production')` 读 `build.target` 核实） | — | **高于多数政企 PC 与国内 H5 场景期望**，未显式配置时老浏览器会白屏。注意：目标值 ≠ 产物语法下限，产物实际语法可能更低（如只到 ES2021），下限须用产物检查脚本逐档 `--ecma` 实测 |

> 其他库（ECharts、Ant Design、富文本编辑器、地图 SDK 等）查其官方 Browser Support 章节，并写入项目兼容声明。

## 4. 实现方案矩阵

| 方案 | 适用基线 | 做法 | 代价 |
|------|---------|------|------|
| **A. 仅现代浏览器** | ≥ Chrome 87 / Safari 14 左右 | 显式设置 `build.target`（如 `['chrome87','edge88','firefox78','safari14']`），不引入 polyfill | 无额外体积；**只转译语法，不补 API** |
| **B. 老版本但支持 ESM** | Chrome 64–86 / Safari 11.1–13 / 对应 iOS、Android WebView | `@vitejs/plugin-legacy`：`modernTargets` + `modernPolyfills: true` + `renderLegacyChunks: false` | 增加按用法注入的 polyfill 包（典型 100+ KB，gzip 40+ KB） |
| **C. 不支持 ESM** | Chrome < 61、IE 11、老 Android WebView（仅 Vue 2 / React 17 等技术栈） | `@vitejs/plugin-legacy` 默认模式（SystemJS legacy 包 + `nomodule` 回退） | 产物翻倍，构建时间显著增加 |
| **D. webpack / Vue CLI** | 任意 | `.browserslistrc` 声明基线 + `@babel/preset-env`（`useBuiltIns: 'usage'`, `corejs: 3`）；需转译的 node_modules 加入 `transpileDependencies` | 视基线而定 |

**方案选择规则（最大覆盖）**：

1. 硬下限 ≥ 构建工具原生 ESM 下限（Vite：Chrome 64 / iOS 11.3）→ **方案 B**，即可吃满到硬下限（如 Vite + Element Plus：硬下限 Chrome 64，恰好等于 ESM 下限）。
2. 硬下限 < 原生 ESM 下限 → **方案 C**，否则 `[硬下限, ESM 下限)` 这一段会白屏（如 Vite + Vue 3 + Vant 4 的 H5：硬下限约 Chrome 51 / iOS 10，只用方案 B 会丢掉 Chrome 51–63、iOS 10–11.2）。
3. 技术栈允许 IE 11（Vue 2、React ≤ 17）且需求未排除 IE → 方案 C / D 覆盖 IE 11。
4. 方案 A 只在业务明确不需要老版本时使用，并在审查报告中记录被放弃的覆盖率。

### 4.0 方案 D 配置要点（webpack / Vue CLI 4）

- 未声明 browserslist 时实际使用 browserslist 的 `defaults`（`> 0.5%, last 2 versions, Firefox ESR, not dead`），**不是** `> 1%, last 2 versions, not dead`；显式声明时先用 `npx browserslist` 对比声明前后的输出确认是否为预期变化。
- 基线要写到硬下限，如含 IE 11：`["ie >= 11", "edge >= 12", "chrome >= 49", "firefox >= 52", "safari >= 10"]`（PC 项目不写 `ios_saf` / `and_chr`）。
- Vue CLI 默认**不转译 node_modules**：以 ES6+ 源码发布的依赖（如 `element-ui/src`、Vue 组件封装库）必须加入 `vue.config.js` 的 `transpileDependencies`，否则低版本浏览器整包解析失败。做法：先构建，用产物检查脚本（`--ecma 5`）定位报错的 chunk，再反查其来源依赖。
- `public/` 下原样拷贝的 vendor（tinymce、pdfjs 等）不经 Babel，用 `--exclude` 跳过并单独核对其官方浏览器支持范围与自定义插件语法。

### 4.1 方案 B 配置要点（Vite）

```ts
import legacy from '@vitejs/plugin-legacy'

legacy({
  modernTargets: ['chrome>=64', 'edge>=79', 'firefox>=78', 'safari>=12'], // 按项目基线填写；H5 可用 'ios>=12','chromeAndroid>=64'
  modernPolyfills: true,
  renderLegacyChunks: false
})
```

- `modernTargets` **会覆盖 `build.target`**，不要再另设 `build.target`。
- `modernPolyfills: true` 必须配合 `modernTargets`，否则 core-js 过量注入。
- 自动 polyfill **只覆盖 ES 语言特性**；DOM API（`ResizeObserver`、`IntersectionObserver`、`structuredClone` 等）需自行确认或用 `additionalModernPolyfills` 补充。
- 依赖：`@vitejs/plugin-legacy`（版本与 Vite 主版本对应）+ `terser`（peer 依赖）。

### 4.1.1 方案 C 在 Vite 8（rolldown）下的实测要点

- 配置：`legacy({ targets: [硬下限], modernTargets: [支持 ESM 的最低版本], modernPolyfills: true })`，即默认模式（不设 `renderLegacyChunks: false`）；`modernTargets` 决定现代包的转译目标，未落入的浏览器走 `nomodule` 的 legacy 包。
- 产物检查要**分开验证两类文件**：legacy 包（文件名含 `legacy`）按硬下限对应的 ES 版本（Chrome 51 / iOS 10 → `--ecma 2015`）；现代包按 `modernTargets` 的 ES 版本（Chrome 64 / iOS 11.3 → `--ecma 2018`）。用同一个 `--ecma` 扫整个目录会误报（legacy 包的输出是 **ES2015 而非 ES5**：`@vitejs/plugin-legacy` 8.x 用 oxc 压缩 legacy 产物且固定 `compress.target = 'es2015'`，见其 `dist/index.js` 的 `resolveLegacyOutputMinify(..., "es2015")`，所以产物里会出现模板字面量；ESM 探测代码 `__vite_legacy_guard` 含顶层 `import.meta` / `import()`：给了 `--min` 且目标都支持 ESM 动态导入时，检查脚本自动放行并单独计数；未给 `--min` 或目标含更低版本时仍会报出，属预期）。
- 脚本须在项目目录（含 `node_modules`）运行；在别处运行只会打印「未找到 acorn」，用管道过滤输出时会被吞掉，务必先看原始输出。
- 代价（实测，Vite 8.3 + 7 个页面的小项目）：产物约 +70%，构建时间由 < 1s 增至约 5–6s；legacy 插件**不降级 CSS**；Vite 压缩 CSS 时按 `build.cssTarget` 只降级少数可转换的语法（如 `inset` → 四个方向，见 §8），flex `gap` 等仍会在老终端退化，须在已知限制中写明。

### 4.2 pnpm 10 项目的 CI 注意事项

core-js 等依赖带 postinstall 脚本。pnpm 10 默认拒绝依赖构建脚本，部分环境下是**硬错误**（`ERR_PNPM_IGNORED_BUILDS`）。确认跳过无影响后（core-js 的脚本仅打印赞助信息），加入根 `package.json`：

```json
{ "pnpm": { "ignoredBuiltDependencies": ["core-js"] } }
```

## 5. 版本对照表（核对于 2026-09，以 caniuse / MDN 为准）

> **列对应关系**：iOS 上所有浏览器及 App 内 WebView 均为 WebKit，**iOS 版本 ≈ Safari 列**（Safari 14 ↔ iOS 14）；Android Chrome、Android System WebView、微信 XWeb 等 Chromium 内核 **≈ Chrome 列**（按其 Chromium 版本）；Edge（Chromium）≈ Chrome 列。

### 5.1 JS 语法（决定 `--ecma` 检查级别）

| ES 版本 | 代表语法 | Chrome | Safari / iOS | Firefox |
|---------|---------|--------|--------------|---------|
| ES2017 | `async/await` | 55 | 11 | 52 |
| ES2018 | 对象展开、异步迭代、正则命名组 | 64 | 12 | 78 |
| ⚠️ ES2018 | **正则后行断言 `(?<=` `(?<!`** | 62 | **16.4** | 78 |
| ES2019 | 可选 catch 绑定 `catch {}` | 66 | 11.1 | 58 |
| ES2020 | 可选链 `?.`、空值合并 `??` | 80 | 13.1 | 74 |
| ES2021 | 逻辑赋值 `??=` `\|\|=`、数字分隔符 | 85 | 14 | 79 |
| ES2022 | class 私有字段/方法 `#x`、顶层 `await` | 84 / 89 | 15 | 90 |

选检查级别：取基线中「最低浏览器」能完整支持的 ES 版本。**正则后行断言字面量**（Safari/iOS < 16.4 不支持）`--ecma` 查不出，脚本单独检测。

### 5.2 常见 API（需 polyfill 的高发项）

| API | Chrome | Safari / iOS | Firefox |
|-----|--------|--------------|---------|
| `Array.prototype.flat/flatMap` | 69 | 12 | 62 |
| `Object.fromEntries` | 73 | 12.1 | 63 |
| `String.prototype.replaceAll` | 85 | 13.1 | 77 |
| `Promise.any` | 85 | 14 | 79 |
| `Array.prototype.at` | 92 | 15.4 | 90 |
| `Object.hasOwn` | 93 | 15.4 | 92 |
| `Array.prototype.findLast` | 97 | 15.4 | 104 |
| `structuredClone` | 98 | 15.4 | 94 |
| `ResizeObserver`（DOM） | 64 | 13.1 | 69 |

### 5.3 CSS 特性（无法 polyfill，只能降级或规避）

| 特性 | Chrome | Safari / iOS | Firefox | 不支持时表现 |
|------|--------|--------------|---------|-------------|
| flex 布局 `gap` | 84 | 14.1 | 63 | 间距消失，元素挤在一起 |
| `clamp()` | 79 | 13.1 | 75 | 声明失效 |
| `:focus-visible` | 86 | 15.4 | 85 | 所在规则整条失效 |
| `inset` | 87 | 14.1 | 66 | 定位失效 |
| `:is()` / `:where()` | 88 | 14 | 78 | 所在规则整条失效 |
| `aspect-ratio` | 88 | 15 | 89 | 宽高比失效 |
| `@layer` | 99 | 15.4 | 97 | 层内样式整体失效 |
| `:has()` | 105 | 15.4 | 121 | 所在规则整条失效 |
| `@container` | 105 | 16 | 110 | 容器查询失效 |
| `dvh/svh/lvh` | 108 | 15.4 | 101 | 尺寸失效（需保留 `vh` 回退） |
| `color-mix()` | 111 | 16.2 | 113 | 颜色失效 |
| CSS 原生嵌套 `&` | 112 | 16.5 | 117 | 嵌套规则失效 |

> 选择器类特性（`:is()` / `:has()` 等）不支持时，**整条规则**（含同组其他选择器）都会被丢弃。
>
> **以产物为准**：构建会降级部分 CSS（Vite 项目源码里的 `inset` 在产物中通常已展开为四个方向），对源码检索命中不等于产物里仍存在。判断是否退化看产物检查脚本「3. CSS 风险特性」的结果；flex `gap`、`:is()`、`:has()`、`:focus-visible`、`dvh`、`color-mix()`、`@container` 无法转换，会原样保留。

## 6. 通用检查清单

**构建配置**
- [ ] 基线等于依赖硬下限（§3）；高于硬下限时已记录理由与被放弃的覆盖率
- [ ] 所选方案能真正达到硬下限（§4 方案选择规则）
- [ ] 构建目标已显式配置（`build.target` 或 `modernTargets` 二选一）
- [ ] 需要 API polyfill 时已启用（方案 B/C/D），DOM API 已单独确认
- [ ] pnpm 10：新增依赖的构建脚本已处理（§4.2）
- [ ] 端专项配置已完成（PC 见 pc.md §2，H5 见 h5.md §3）
- [ ] browserslist / legacy targets / `build.target` 表达同一基线，`npx browserslist` 输出已核对；Android 老 WebView 用 `chrome >= N` 而非 `Android >= N`（§9.2）
- [ ] 基线以下环境有 ES5 兜底提示，或已记录不加的理由（§9.3）

**产物检查**
- [ ] 检查脚本退出码为 0
- [ ] 字符串内后行断言的 ⚠ 已人工追溯来源并确认不可达或可接受
- [ ] CSS ⚠ 项已记录到兼容声明「已知限制」
- [ ] 运行验证通过

**编码规范**
- [ ] 关键布局不依赖基线不支持的 CSS 特性，或提供降级（如 margin 代替 gap）
- [ ] 基线含 Safari/iOS < 16.4 时，不在正则字面量中使用后行断言
- [ ] 日期解析不用 `new Date('YYYY-MM-DD HH:mm')`（Safari/iOS 返回 Invalid Date），改用 ISO 格式或日期库
- [ ] 平台判断用特性检测而非 UA
- [ ] 输入即触发的逻辑有输入法组字判断，回车选词不提交（§10.1）
- [ ] 列表 → 详情 → 返回保留滚动位置与已加载数据（§10.2）

## 7. 维护

- 升级框架 / 组件库主版本前，先查浏览器支持范围；下限上移时同步修改项目基线与兼容声明。
- 本文 §3、§5 数据每年至少复核一次；发现新高发问题时同步补充 §5 与脚本的 `CSS_FEATURES` 列表。

## 8. 覆盖率最大化手段

基线压到硬下限后，用以下手段把这段范围**真正吃满**（逐项评估代价，写入审查报告）：

| 层面 | 手段 | 说明 |
|------|------|------|
| JS 语法 | 转译目标 = 硬下限（方案 B / C / D） | 语法无法运行时补救，必须构建期完成 |
| JS API | core-js 按用法注入（`modernPolyfills` / `useBuiltIns: 'usage'`） | 只覆盖 ES 特性 |
| DOM API | 按需引入专门 polyfill（如 `resize-observer-polyfill`、`intersection-observer`），或用 `additionalModernPolyfills` / `additionalLegacyPolyfills` 注入 | 自动检测不覆盖 DOM API，须逐个确认基线是否原生支持（§5.2） |
| CSS 前缀 | autoprefixer，browserslist 与基线一致 | 解决 `-webkit-` 等前缀缺失 |
| CSS 新特性降级 | **Vite 默认已做一部分**：构建时 CSS 压缩按 `build.cssTarget` 降级可转换的语法（如 `inset` 展开为 `top/right/bottom/left`）；`build.cssTarget` 未设置时同 `build.target`，`@vitejs/plugin-legacy` 生成 legacy 包时会设为 `chrome61`。更多降级用 PostCSS 降级插件（如 `postcss-preset-env` 系列）或 Vite `css.transformer: 'lightningcss'` + `targets` | **各工具可降级的特性清单以其官方文档为准**；`:focus-visible` 等需配合 JS polyfill；flex `gap` 无通用转换，需改写（margin / 子元素间距）或 `@supports` 分支 |
| CSS 手动降级 | `@supports` 分支、保留旧写法回退（如 `height: 100vh; height: 100dvh;`） | 关键布局优先 |
| 第三方依赖 | 产物检查暴露的依赖新语法：确认已纳入转译（Vite 构建默认处理依赖；webpack 需 `transpileDependencies`），否则替换依赖 | 依赖自带新语法是常见白屏源 |
| PC 端 | 双核浏览器强制 Chromium 内核（pc.md §2） | 国内 PC 收益最大的一项 |
| H5 端 | 移动端 head 配置、App 内 WebView 替代路径（h5.md §3 / §4） | 国内须把 UC / QQ / 微信 X5 列为必测环境 |
| 验证 | 基线最低版本真机 / 云真机 / 旧版 Chromium 实测 | 唯一能确认 CSS 退化程度的方式 |

## 9. 多设备语法兼容：工具边界、目标声明与兜底

### 9.1 各工具管什么、不管什么

审查时按下表核对「问题由哪一层负责」，不要把某个工具当成万能兼容：

| 层 | 工具 | 负责 | 不负责 |
|----|------|------|--------|
| JS 语法 | `@vitejs/plugin-legacy` / `@babel/preset-env` / `build.target` | 把新语法转成目标能解析的写法 | 补 API；`build.target` 本身**不注入任何 polyfill** |
| ES API | core-js（`modernPolyfills` / `useBuiltIns: 'usage'`） | `flat`、`Promise.allSettled` 等 ES 内置 | DOM API（`ResizeObserver` 等须单独引入，§8） |
| 框架运行时 | — | — | **无法补救**：Vue 3 依赖原生 `Proxy`，转译与 polyfill 都不能让不支持 `Proxy` 的内核跑起来；React 18+ 同理不支持 IE |
| CSS 前缀 | autoprefixer | `-webkit-sticky`、`-webkit-backdrop-filter` 等前缀 | 不实现不支持的特性（flex `gap`、`:has()` 等） |
| 宿主行为 | — | — | WebView 的下载、跳转、键盘、缓存等原生行为（h5.md §4），只能改写法或走宿主能力 |

### 9.2 目标声明：一处定义、各处一致

- `.browserslistrc`（或 `package.json` 的 `browserslist`）、`legacy({ targets, modernTargets })`、`build.target`、autoprefixer、`@babel/preset-env` **必须表达同一基线**；用 `npx browserslist` 输出实际命中的版本核对，不要只看查询字符串。
- **`Android >= N` 不是 Android 系统版本**：browserslist 的 `android` 指 Android 自带浏览器 / WebView，4.4.4 之后的版本号直接对应最新 Chromium，`Android >= 7` 只命中最新一个版本（具体版本号随 browserslist / caniuse 数据更新而变化，用 `npx browserslist "Android >= 7"` 查看）。`and_chr` / `ChromeAndroid` 同样只含最新版。**老 Android WebView 要用 Chromium 版本表达**（`chrome >= 51`），iOS 用 `ios_saf >= 10` / `iOS >= 10`（按 iOS 版本，可信）。
- `@vitejs/plugin-legacy`、`@vitejs/plugin-vue` / `@vitejs/plugin-react` 的主版本须与 Vite 主版本配套，Node 版本满足其 `engines`；不要从旧文章单独复制某个插件的版本号，以 `create-vite` / `create-vue` 当前生成的组合为准再合并配置。
- `tsconfig.json` 的 `target` / `lib` 只影响类型检查，**不决定产物语法**（Vite 下由 `build.target` / legacy 决定），审查时不要据此判断兼容。

### 9.3 基线以下的兜底提示

基线以下的浏览器（如 Vue 3 项目遇到不支持 `Proxy` 的内核、或方案 B 遇到不支持 ESM 的内核）只会白屏，用户不知道原因。建议在 `index.html` `<head>` 中、所有模块脚本之前内联一段 **ES5** 检测脚本，不满足时显示升级提示（文案按项目调整）：

```html
<script>
  // 必须是 ES5：不经构建转译，基线以下的内核也要能解析
  (function () {
    var ok = typeof Proxy === 'function' && typeof Promise === 'function'
    if (ok) return
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '<div style="padding:24px;font-size:16px;line-height:1.6;color:#333">当前浏览器版本过低，请升级系统或使用最新版浏览器 / 微信打开</div>'
    })
  })()
</script>
```

- 检测条件取**技术栈硬下限依赖的关键能力**（Vue 3 → `Proxy`；方案 B 无 legacy 包 → 再加 `'noModule' in document.createElement('script')`），不要用 UA 版本号判断。
- 未加兜底记 🟢；项目访问统计显示基线以下用户占比可观时升 🟡。改 `index.html` 属于修改，须经用户确认（review.md §6）。

### 9.4 特性检测的常见误判

基础样式先行、`@supports` / 特性检测再增强是正确思路，但以下写法会误判：

| 写法 | 问题 | 正确做法 |
|------|------|---------|
| `CSS.supports('gap', '1px')`、`@supports (gap: 1px)` 判断 flex gap | 只要支持 **grid** gap（Chrome 66+ / Safari 12+）就返回 true，而 flex gap 要 Chrome 84 / Safari 14.1 | CSS 侧直接用 margin 回退写法；JS 侧用实测：建一个 `display:flex; flex-direction:column; gap:1px` 含两个空子元素的容器，挂到 `body` 后读 `scrollHeight`，为 `1` 即支持，测完移除 |
| `@supports not (position: sticky)` | iOS < 13 只支持 `-webkit-sticky`，无前缀检测为不支持 | `@supports (position: sticky) or (position: -webkit-sticky)`；或依赖 autoprefixer 输出前缀 |
| 只检测 `backdrop-filter` | Safari 需 `-webkit-backdrop-filter` | 两者 `or`；不支持时用不透明背景回退 |
| `'xxx' in window` 判断后直接认为行为一致 | 存在 ≠ 行为一致（如 `visualViewport` 各 WebView 事件时序不同） | 关键交互仍须真机验证 |
| 用 UA 判断能力 | iPadOS 伪装 Mac、iOS Safari 与 WKWebView UA 接近、国产内核版本不可推算 | UA 只用于环境分流、日志与提示；能力判断用特性检测，App 宿主由 Bridge 注入名称与版本 |

### 9.5 兼容等级（写进兼容声明的「已知限制」）

把「支持」拆成三档，避免把「能打开」误说成「完全一致」：

1. **核心可用**：页面可打开、内容可读、核心流程可完成——基线内所有环境 MUST 达到。
2. **体验完整**：键盘、滚动、弹层、安全区、横竖屏符合设计——基线内主流环境达到，偏差记入已知限制。
3. **增强效果**：毛玻璃、复杂动效等按特性检测启用，缺失时回退。

### 9.6 Worker / WASM / 第三方运行时资源：功能级可用范围

构建兼容层只转译**主包**。以下资源不经过 legacy 插件 / Babel，常常比整站基线要求更高的浏览器版本：

| 资源 | 常见来源 | 要求 |
|------|---------|------|
| module Worker（`new Worker(url, { type: 'module' })`） | 文档预览、压缩包解压、图片处理等引擎 | Chrome 80 / Safari 15 / Firefox 114 |
| 依赖自带的 Worker 包（原样拷贝或单独打包） | pdf.js、xlsx、docx、libarchive 等 | 内部可能含 `?.`、`??`、`catch {}`、`Promise.withResolvers` 等，按其实际语法 |
| WebAssembly（`.wasm`） | 解码、解压、渲染引擎 | Chrome 57 / Safari 11 / Firefox 52 |
| 运行时从 CDN 加载的 SDK | 地图、统计、客服、验证码、支付 | 以 SDK 官方声明为准，产物检查扫不到 |

处理方式：

1. **产物检查脚本会把 Worker 单独列出**（「1″. Worker / WASM」，不计入退出码）：
   - **判定规则**：只有被其他 JS 里 `new Worker()` / `new SharedWorker()` 引用到的文件才算 Worker。不按文件内容判断（legacy 插件的 `polyfills-legacy-*.js` 内联了 SystemJS，本身含 `importScripts`），也不按文件名判断（Vite 会把 `src/utils/worker.ts` 输出成 `worker-<hash>.js`）——判定一旦放宽，主线程的白屏级错误会被降成告警。
   - **引用按文件名匹配**：识别的是 `new Worker()` 参数里的 `xxx.js` 文件名；Worker 地址由变量传入、内联 Blob 等识别不到引用的写法，一律按主包检查（偏严，不会漏报）。
   - **文件名像 Worker 但没被引用**：按主包检查，语法错误计入退出码，并在输出里以 ℹ 列出。
   - **vendor 原样拷贝的 Worker**（如 pdf.js 经 `workerSrc` 字符串加载）：不会被 `new Worker()` 引用识别，会按主包报 ✗；确认它只在 Worker 内运行后，用 `--exclude` 跳过其目录，并在兼容声明中单独记录它的最低版本。
2. **在兼容声明中写「功能级可用范围」**（declaration-template.md）：整站基线不变，某个功能单独写最低版本与低于它时的表现，例如「附件在线预览需 Chrome / Edge ≥ 80、Safari ≥ 15，低于时回退为下载」。
3. **降级路径本身必须运行验证**：只看代码里写了回退不够。常见漏洞：工具栏关掉了下载按钮、引擎内部出错不触发回退，导致用户没有任何出口。验证方法：在低版本浏览器上打开，或在现代浏览器里禁用 `Worker`（如 `delete window.Worker`）、注入加载失败，确认回退路径可用。
4. 用户确认「低版本不可用时降级即可」后写入审查报告，不必为该功能把整站基线上调。

## 10. 交互兼容（PC + H5 通用）

### 10.1 中文输入法组字（拼音阶段触发逻辑）

**问题**：用拼音、五笔等输入法打字时，组字过程中每个按键都会触发 `input` 事件。自己写的「输入即搜索」、字数统计、格式化（如手机号加空格）会拿拼音字母去处理；组字时按回车确认候选词，还会被当成「提交」。

| 场景 | 是否已处理 |
|------|-----------|
| Vue 原生 `<input v-model>` | 已处理（组字结束才更新值），`v-model.lazy` 也不受影响 |
| Vue 自定义组件的 `v-model`、直接监听 `@input` 做逻辑 | **未处理** |
| React `onChange`（受控 / 非受控） | **未处理**：组字期间每次按键都会触发 |
| 组件库输入框（Element Plus、Ant Design、Vant 等） | 多数已处理值更新，但业务在 `input` / `change` 回调里做的逻辑仍需自查 |

**处理**（与框架无关）：

```js
let composing = false
input.addEventListener('compositionstart', () => { composing = true })
input.addEventListener('compositionend', (e) => { composing = false; handle(e.target.value) })
input.addEventListener('input', (e) => {
  if (composing || e.isComposing) return // 组字中不处理
  handle(e.target.value)
})
input.addEventListener('keydown', (e) => {
  // 组字中按回车是确认候选词，不是提交；Safari 在 compositionend 后的 keydown 里 isComposing 已为 false，要再判 keyCode 229
  if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) return
  if (e.key === 'Enter') submit()
})
```

- 各浏览器 `compositionend` 与最后一次 `input` 的先后顺序不同（Firefox 组字结束后还会再触发一次 `input`），`handle` 可能被调用两次，配合防抖或比较值去重。
- React 用 `onCompositionStart` / `onCompositionEnd`，`onChange` 里判断 `e.nativeEvent.isComposing`。
- 审查：`grep -rnE '@input=|onInput|onChange|addEventListener\(.input' src` 找到做搜索、计数、格式化、回车提交的输入框，确认有组字判断；缺失记 🟡（中文用户高频，搜索类必现）。
- 验证：分别用 iOS 自带拼音、Android 搜狗 / 百度输入法、Windows 微软拼音、macOS 拼音输入一个词，确认只在上屏后触发逻辑、回车选词不会提交。

### 10.2 返回上一页滚动位置

**问题**：单页应用从列表进入详情再返回，列表回到顶部；或恢复了位置但数据还没加载完，又跳回顶部。

| 情况 | 处理 |
|------|------|
| Vue Router | `scrollBehavior(to, from, savedPosition) { return savedPosition || { top: 0 } }`（Vue Router 3 为 `{ x: 0, y: 0 }`）；列表数据异步加载时，返回 `Promise` 在数据渲染后再 resolve，或用 `<KeepAlive>` 缓存列表页 |
| React Router | 6.4+ 的数据路由用 `<ScrollRestoration />`；其他写法需在离开时保存 `scrollY`、返回后渲染完成再恢复 |
| 页面内部滚动容器（不是 window 滚动） | 路由的滚动恢复只管 window，内部容器要自己按路由 key 保存 / 恢复 `scrollTop` |
| 浏览器自动恢复干扰 | 手动管理时设 `history.scrollRestoration = 'manual'`，避免浏览器与代码各恢复一次产生跳动 |
| 从 bfcache 恢复（iOS Safari / 微信返回） | 页面整体恢复、不重新执行入口，位置通常保留；需要刷新数据时在 `pageshow`（`persisted`）中处理，注意不要因刷新而重置滚动 |

- 列表页带分页 / 无限滚动时，同时缓存已加载的数据与页码，只恢复位置不恢复数据会跳到空白处。
- 审查：`grep -rnE 'scrollBehavior|ScrollRestoration|scrollRestoration|keep-alive|KeepAlive' src`；有「列表 → 详情 → 返回」流程却都没有 → 🟡。
- 验证：列表滚到第 3 屏 → 进详情 → 返回（页面返回键、浏览器 / 系统返回、iOS 左滑返回、微信返回各一次），位置与已加载数据都保留。

### 10.3 被 iframe 嵌入（微前端 / 壳应用 / 门户）

应用被壳应用、门户或第三方页面用 iframe 嵌入时，运行环境与独立打开不同：

| 问题 | 表现 | 处理 |
|------|------|------|
| 登录页拒绝被嵌入 | 鉴权失效后在 iframe 内跳转登录页，OAuth / SSO 登录页因 `X-Frame-Options` / `frame-ancestors` 拒绝显示，出现空白 | 嵌入时**不得**在 iframe 内自行跳转登录页（改 iframe 自身 `location` 同样不行）；通知壳应用（`postMessage` 或壳应用提供的 API）由壳处理；壳 API 不可用时只提示，不跳转 |
| 同源存储互相覆盖 | iframe 与壳应用同源时共用 `localStorage` / Cookie，子应用写入登录态会覆盖壳应用自己的 | 嵌入时不写共享键，或按应用加前缀；token 由壳应用下发，不经 URL query 传递 |
| 跨站 iframe 存储受限 | 第三方 Cookie 被拦截（Safari ITP 等）、访问 `localStorage` 抛 `SecurityError` | 存储读写统一 `try/catch`（h5.md §5.3 #3）；跨站场景的登录态不依赖第三方 Cookie |
| 弹层与滚动 | 弹层只能盖住 iframe 区域；iframe 高度固定时出现双滚动条 | 全屏遮罩类交互交给壳应用；与壳约定高度策略（iframe 内滚动或由壳按内容高度调整） |
| 视口与高度 | iframe 内 `100vh` 是 iframe 高度，不是屏幕高度；`env(safe-area-inset-*)` 一般为 0 | 安全区、一屏布局由外层页面负责 |
| 本地开发代理 | 壳应用只把子应用前缀转发过来，子应用请求未带前缀时被壳的同名代理抢走 | 子应用 dev 代理前缀带上自身 `base`，且不与壳应用代理的路径重名（例：壳应用代理了 `/upload`，子应用本地别名就不能含 `/upload` 路径段；场景相对小众，仅壳应用 + 子应用联调时遇到） |

- 判断是否被嵌入：`window.self !== window.top`（跨源访问 `top` 的属性会抛错，只比较引用）。
- 审查：`grep -rnE 'window\.(top|parent)|postMessage|self !== top|location\.href\s*=' src`，确认鉴权失效、跳转、存储写入在嵌入与独立两种模式下各自正确；两种模式都要运行验证。
