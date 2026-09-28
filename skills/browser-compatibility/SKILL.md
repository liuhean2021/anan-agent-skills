---
name: browser-compatibility
description: 专门审查 PC 端与移动端 H5 的浏览器兼容性，目标是在技术栈允许的范围内覆盖尽可能多的老版本浏览器、使覆盖率最大化。用于为 Vue/React/Vite/webpack 项目确定可达到的最低兼容基线、审查构建配置/源码/构建产物是否会在老版本浏览器或微信等 App 内 WebView 白屏或样式错乱、找出可继续扩大覆盖的空间、评估每个问题影响的浏览器与用户占比及紧急度、给出修复方案（修复须经用户确认后才执行）、生成兼容审查报告文档（存入项目 docs/，每项目一份、按次追加）并产出项目兼容声明。触发词：浏览器兼容、兼容性检查、兼容性审查、老版本浏览器、最大覆盖率、兼容 IE、兼容 Safari、iOS 兼容、安卓兼容、微信内打开白屏、双核浏览器、360 浏览器、polyfill、plugin-legacy、browserslist、build.target、兼容声明、兼容审查报告。
metadata:
  version: "1.0.0"
  scope: "pc,h5"
---

# 浏览器兼容性审查：PC + H5，最大覆盖

## 定位

- **专门审查 PC 端与移动端 H5 的浏览器兼容性**。
- **目标是覆盖率最大化**：默认把兼容基线压到技术栈硬下限（框架 / 组件库 / 构建工具能支持的最低版本），并用转译、polyfill、CSS 降级、端专项配置把这段范围真正吃满；只有代价不可接受时才上调基线，且须记录理由。
- 审查结论既要指出**会出问题的地方**，也要指出**还能扩大覆盖的空间**（基线高于硬下限、可用手段未启用）。

## 铁律

**审查阶段只读（唯一例外：写入审查报告文档）。任何代码、样式、构建配置、依赖、`index.html` 的修改，MUST 先输出修复方案并获得用户明确确认后才执行**；新增依赖、修改构建目标、引入 polyfill、改动全局样式须单独复述影响再确认。修复后必须复验，是否提交由用户决定。详见 [references/review.md](references/review.md) §6。

## 核心原则

三类问题严重程度与解法完全不同，MUST 分别检查：

| 类型 | 后果 | 解法 |
|------|------|------|
| **语法不支持**（`?.`、`??`、正则后行断言字面量等） | 整个 JS 包解析失败 → **白屏** | 只能构建期转译 |
| **API 缺失**（`Array.prototype.flat`、`structuredClone` 等） | 运行到才报错 | core-js polyfill |
| **CSS 不支持**（flex `gap`、`:is()`、`:has()` 等） | **样式退化**，功能可用 | 无法 polyfill，只能降级或规避 |

## 使用场景与读取顺序

| 场景 | 读取 |
|------|------|
| **兼容性审查**（提交前、PR、pre-commit-review 转交、接手项目、升级依赖） | [references/review.md](references/review.md)，按其步骤执行并按其格式输出 |
| 为项目制定 / 调整兼容基线与构建配置 | [references/standard.md](references/standard.md) → 按端读 [references/pc.md](references/pc.md) / [references/h5.md](references/h5.md) |
| 只做构建产物检查 | 下方「产物检查」 |
| 产出项目兼容声明 | [references/declaration-template.md](references/declaration-template.md) |

## 标准工作流（制定基线时）

1. **确认端与用户群**：PC / H5 / 两者？国内 / 海外？政企内网（老终端、国产双核浏览器）？H5 主要在哪些 App 内打开？
2. **查依赖硬下限**：取框架、组件库、关键三方库官方下限的最高者（standard.md §3）。
3. **定基线**：默认取**技术栈硬下限**（最大覆盖）；业务明确要求更高时才上调，并在审查报告中记录理由与被放弃的覆盖率（browserslist 口径见 pc.md §4 / h5.md §6）。
4. **选实现方案**：选能**达到硬下限**的方案（standard.md §4；硬下限低于构建工具原生 ESM 下限时必须用方案 C），再用 standard.md §8 的手段扩大覆盖；PC 加双核浏览器 meta（pc.md §2），H5 加移动端 head 配置（h5.md §3）。
5. **审查**：按 review.md 执行，输出修复方案，**经用户确认后**再修改。
6. **写兼容声明**：按 declaration-template.md 产出，README 挂入口。

## 产物检查

构建到临时目录（不覆盖正式产物），在**项目目录**（含 `node_modules`）运行：

```bash
node <本技能目录>/scripts/check-browser-compat.mjs --dir <产物目录> --ecma <ES年份> --min <浏览器=版本,...>
```

| 参数 | 说明 |
|------|------|
| `--dir` | 构建产物目录（如 `dist`，或 Vite 的临时 `--outDir`） |
| `--ecma` | 基线最低浏览器能完整支持的 ES 版本（standard.md §5.1），如 Chrome 64 / Safari 12 → `2018` |
| `--min` | PC：`chrome=64,safari=12,firefox=78`；H5：`ios=12,android=64`。别名：`edge/android/webview/and_chr`→Chromium，`ios/ios_saf`→WebKit |

| 输出 | 含义 | 定级（review.md §4） |
|------|------|------|
| `✗` JS 语法超标 / 正则后行断言**字面量**不被支持 | 白屏级 | 🔴 |
| `⚠` 后行断言位于**字符串**（运行时 `new RegExp`） | 执行到才报错 | 追溯来源：可达 🔴，不可达记录即可 |
| `⚠` CSS 风险特性 | 样式退化 | 按影响页面判断 🟡 / 🟢 |
| 退出码 `0` / `1` / `2` | 通过 / 有白屏级问题 / 参数或环境错误 | 可接入 CI |
| `== 4. 影响评估查询` | 每个问题的受影响区间与可直接运行的 browserslist 查询 | 用于 review.md §4.1 计算用户占比 |

依赖 acorn：先从项目解析，找不到时经 ESLint 的 espree 获取（装了 ESLint 即无需安装）；都没有则 `npm i -D acorn`。

静态检查不能替代**运行验证**：preview / 测试环境确认页面渲染与控制台无报错；H5 须在目标 App 内实测；能接触基线最低版本真机 / 云真机时用其确认 CSS 退化程度。

## 输出要求

- 审查结论按 review.md §5 格式输出，区分「白屏级」「运行时风险」「样式退化」，每条附修复建议，末尾列出待确认的修复方案编号。
- **审查结果 MUST 生成文档存入项目 `docs/` 目录**（review.md §7）：已有 `docs/review/` 时写 `docs/review/browser-compatibility-review.md`，否则写 `docs/browser-compatibility-review.md`；每个项目一份，每次审查追加带日期的一节，顶部维护最新结论摘要。
- **每个发现 MUST 做影响评估**（review.md §4.1）：受影响浏览器区间、用户占比（全球 / 中国，及占支持范围的比例；有项目访问统计时以统计为准）、实际表现（能模拟的截图对比）、紧急度 P0–P3，方便用户判断修复的紧急程度。
- 覆盖率注明口径与日期（caniuse 地区数据含移动端，国产手机浏览器单独计数）。
- references 中版本数据核对于 2026-09，引用前 MUST 以官方文档 / caniuse / MDN 复核。
