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
| Vite 7+ 默认 `build.target` | 通用 | `baseline-widely-available`（约 Chrome 107 / Edge 107 / Firefox 104 / Safari 16） | — | **高于多数政企 PC 与国内 H5 场景期望**，未显式配置时老浏览器会白屏 |

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

## 6. 通用检查清单

**构建配置**
- [ ] 基线等于依赖硬下限（§3）；高于硬下限时已记录理由与被放弃的覆盖率
- [ ] 所选方案能真正达到硬下限（§4 方案选择规则）
- [ ] 构建目标已显式配置（`build.target` 或 `modernTargets` 二选一）
- [ ] 需要 API polyfill 时已启用（方案 B/C/D），DOM API 已单独确认
- [ ] pnpm 10：新增依赖的构建脚本已处理（§4.2）
- [ ] 端专项配置已完成（PC 见 pc.md §2，H5 见 h5.md §3）

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
| CSS 新特性降级 | PostCSS 降级插件（如 `postcss-preset-env` 系列）或 Vite `css.transformer: 'lightningcss'` + `targets` | **各工具可降级的特性清单以其官方文档为准**；`:focus-visible` 等需配合 JS polyfill；flex `gap` 无通用转换，需改写（margin / 子元素间距）或 `@supports` 分支 |
| CSS 手动降级 | `@supports` 分支、保留旧写法回退（如 `height: 100vh; height: 100dvh;`） | 关键布局优先 |
| 第三方依赖 | 产物检查暴露的依赖新语法：确认已纳入转译（Vite 构建默认处理依赖；webpack 需 `transpileDependencies`），否则替换依赖 | 依赖自带新语法是常见白屏源 |
| PC 端 | 双核浏览器强制 Chromium 内核（pc.md §2） | 国内 PC 收益最大的一项 |
| H5 端 | 移动端 head 配置、App 内 WebView 替代路径（h5.md §3 / §4） | 国内须把 UC / QQ / 微信 X5 列为必测环境 |
| 验证 | 基线最低版本真机 / 云真机 / 旧版 Chromium 实测 | 唯一能确认 CSS 退化程度的方式 |

