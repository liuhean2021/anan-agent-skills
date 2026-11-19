# PC 端专项

> 通用部分见 [standard.md](standard.md)。数据核对于 2026-09。

## 1. 基线（默认 = 技术栈硬下限，覆盖率最大化）

| 技术栈 | 硬下限 | 方案（standard.md §4） |
|--------|--------|----------------------|
| Vite + Vue 3 + Element Plus | Chrome ≥ 64 / Edge ≥ 79 / Firefox ≥ 78 / Safari ≥ 12 | B |
| Vite + Vue 3 / React 18（无更高下限的组件库） | 框架下限低于 Vite 原生 ESM 下限（Chrome 64 / Safari 11.1） | C |
| Vue 2 + Element UI / React ≤ 17 | 含 IE 11 | C 或 D |

- 仅当业务明确不需要老版本时才上调（如 Chrome ≥ 87 / Safari ≥ 14，方案 A），并在审查报告中记录被放弃的覆盖率。

- Chrome 109 是 Windows 7 / 8.1 的最后可用版本，政企存量终端常见。
- 国产双核浏览器（360、QQ、搜狗等）按其**极速模式 Chromium 内核版本**计入 Chrome 基线；老版本 360 内核可能停留在 Chrome 7x–8x，面向此类用户时优先方案 B。

## 2. 必做配置：强制双核浏览器使用 Chromium 内核

双核浏览器可能落入 IE 兼容模式，Vue 3 / React 18 等在该模式下**直接白屏**。在 `index.html` `<head>` 中加入：

```html
<meta name="renderer" content="webkit" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
```

> 面向国内 PC 用户时，这两行的收益通常**大于**把基线再下探几个版本。

## 3. PC 高发问题

| 问题 | 典型表现 | 审查要点 |
|------|---------|---------|
| 新语法未转译 | 正则后行断言在 Safari < 16.4 整页白屏 | 构建目标覆盖基线；跑检查脚本 |
| 新 API 未 polyfill | `at` / `structuredClone` / `replaceAll` 报 `is not a function` | 方案 B/C/D 的 polyfill 覆盖 |
| 日期解析 | `new Date('2026-09-26 10:00')` 在 Safari 为 Invalid Date | ISO 格式（`T`）或日期库 |
| 新 CSS 无降级 | flex `gap`（Safari < 14.1）、`:is()`、`aspect-ratio`（Safari < 15） | `@supports` 降级或规避 |
| 前缀缺失 | `backdrop-filter`、`mask`、`line-clamp` 在 Safari 需 `-webkit-` | autoprefixer 与 browserslist 一致 |
| 滚动条占宽 | Windows 常驻滚动条挤压布局、弹窗打开时页面抖动 | `scrollbar-gutter: stable` 或补偿宽度 |
| 字体回退 | Windows 无苹方，行高与宽度变化 | `font-family` 跨平台回退链 |
| 窄屏与缩放 | 1366 宽或 125% / 150% 缩放下溢出、截断 | 最小宽度、弹性布局 |
| 双核浏览器 IE 模式 | 白屏 | §2 meta 是否存在 |

## 4. 覆盖率口径

```bash
# 桌面 + 移动 Chrome/iOS 一并统计(caniuse 地区数据含移动端,只写桌面会显得异常低)
npx browserslist@latest --coverage "chrome >= 64, edge >= 79, firefox >= 78, safari >= 12, and_chr >= 64, ios_saf >= 12"
npx browserslist@latest --coverage=CN "chrome >= 64, edge >= 79, firefox >= 78, safari >= 12, and_chr >= 64, ios_saf >= 12"
```

参考数据（2026-09）：

| 基线 | 全球 | 中国 |
|------|------|------|
| Chrome 87 / Edge 88 / Firefox 78 / Safari 14 | 91.96% | 81.78% |
| Chrome 64 / Edge 79 / Firefox 78 / Safari 12 | 92.15% | 82.48% |

中国剩余主要为 IE 11（约 4.9%，Vue 3 / React 18 不可支持）与 UC / QQ 等国产手机浏览器（PC 后台不涉及）。下探到硬下限后仍需配合双核 meta（§2）——国内 PC 上它决定大量老终端能否正常打开。

## 5. PC 检查清单

- [ ] `index.html` 已加双核浏览器 meta（§2）
- [ ] 检查脚本：`--min chrome=<>,safari=<>,firefox=<>` 退出码为 0
- [ ] 1280 / 1366 / 1920 宽度，100% / 125% / 150% 缩放下无溢出、截断（实际 CSS 宽度 = 物理宽 ÷ 缩放，见 [screen-adaptation.md](screen-adaptation.md) §5）
- [ ] Windows（滚动条占宽、字体回退）与 macOS 下布局一致
- [ ] 表单控件（日期、数字输入、自动填充背景色）使用统一组件
- [ ] 面向国内用户：在 360 / QQ 浏览器极速模式下实测核心页面
- [ ] 搜索框、表单用 Windows 微软拼音 / macOS 拼音验证组字阶段不触发搜索、回车选词不提交；返回列表保留滚动位置（standard.md §10）

## 6. 运行验证

- `vite preview`（或测试环境）打开产物：polyfill 包先于主包加载、页面渲染、控制台无 JS 报错。
- 有条件时用基线最低版本的 Chromium / BrowserStack 打开核心页面，确认 CSS 退化程度。

## 7. PC 工程方案（重点：浏览器语法兼容）

PC 端的主要风险是**老内核解析新语法白屏**（政企老终端、Win7 停在 Chrome 109、国产双核浏览器老内核或落入 IE 模式）；显示统一按 [architecture.md](architecture.md) §4.3 的版心 / 断点 / 最小宽度规则，并按 [screen-adaptation.md](screen-adaptation.md) §5 检查。Vite / webpack × Vue / React 各组合的配置要点见 architecture.md §3.2。新建或整改时按下列步骤落地，在已有项目上改动前须经用户确认（review.md §6）。

**① 定基线与方案**：按 §1 取硬下限，用 standard.md §4 的规则选方案；版本组合以 `create-vue` / `create-vite` 当前生成的为准（standard.md §9.2）。

**② 构建配置（三选一，目标处处一致）**：

| 技术栈 | 配置 | 参考 |
|--------|------|------|
| Vite + Vue 3 + Element Plus（硬下限 = ESM 下限） | 方案 B：`legacy({ modernTargets: ['chrome>=64','edge>=79','firefox>=78','safari>=12'], modernPolyfills: true, renderLegacyChunks: false })`，不另设 `build.target` | standard.md §4.1 |
| Vite + Vue 3 / React 18（无更高下限组件库） | 方案 C：`targets` 写硬下限、`modernTargets` 写 ESM 下限；不写 `modernTargets` 时现代包的默认目标偏高（新版插件如 8.x 约为 chrome 105 / Safari·iOS 16.4，旧版如 5.x 为 chrome 64；以所装版本的 README 为准，用 `npx browserslist` 或产物检查核对），大量老终端会落到更重的 legacy 包 | standard.md §4.1.1 |
| Vue 2 / React ≤ 17（webpack / Vue CLI，含 IE 11） | 方案 D：`.browserslistrc` 写到硬下限，`@babel/preset-env` `useBuiltIns: 'usage', corejs: 3`，以 ES6+ 发布的依赖加入 `transpileDependencies` | standard.md §4.0 |

`.browserslistrc` 与上表 targets 写同一基线（autoprefixer 读取），PC 项目不写 `ios_saf` / `and_chr`；改完运行 `npx browserslist` 核对。

**③ `index.html`**：双核 meta（§2）+ 基线以下兜底提示（standard.md §9.3，Vue 3 检测 `Proxy`；React 18 不依赖 `Proxy`，改检测 `Promise` / `Map` / `Set` 等实际依赖，或沿用 `Proxy` 仅作为「识别 IE 模式 / 过旧内核」的判据并在注释说明；可覆盖落入 IE 模式的情况）。两段都放在 `<head>` 最前，兜底脚本手写 ES5。

**④ 源码约束**：正则字面量不用后行断言（Safari < 16.4 白屏）；日期用 ISO 格式；新 API 按 standard.md §5.2 确认在 polyfill 覆盖内，DOM API 单独补；能力判断用特性检测（standard.md §9.4）。

**⑤ 产物检查接入 CI**：

```json
{
  "scripts": {
    "build:compat": "vite build --outDir .compat-dist && node <本技能目录>/scripts/check-browser-compat.mjs --dir .compat-dist --ecma 2018 --min chrome=64,edge=79,firefox=78,safari=12"
  }
}
```

`--ecma` / `--min` 按基线填（standard.md §5.1）；方案 C 分开检查 legacy 包与现代包（standard.md §4.1.1）；方案 D（IE 11）用 `--ecma 5 --min ie=11,chrome=49,safari=10,firefox=52`，`public/` 下原样拷贝的 vendor 用 `--exclude` 跳过并单独核对。退出码非 0 时阻断合并。`.compat-dist` 加入 `.gitignore`。

**⑥ 运行验证矩阵**：

| 环境 | 目的 |
|------|------|
| 基线最低版本 Chromium（便携版 / BrowserStack） | 语法、polyfill、CSS 退化 |
| Win7 + Chrome 109 | 政企存量终端上限版本 |
| 360 / QQ 浏览器极速模式；切到兼容模式确认出现兜底提示而非白屏 | 双核 meta 与兜底是否生效 |
| 基线最低 Safari（macOS） | 后行断言、日期解析、`-webkit-` 前缀 |
| 当前 Chrome / Edge / Firefox | 回归 |

结果（浏览器、版本、内核、结论、截图）写入审查报告，兼容声明标「已实测」。
