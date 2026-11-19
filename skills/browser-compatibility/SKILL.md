---
name: browser-compatibility
description: 通用的前端浏览器兼容与屏幕适配技能，不限框架，重点支持 Vite / webpack 构建与 Vue / React 框架，覆盖 PC 与移动端 H5。做三件事：①语法与 API 兼容——在技术栈允许范围内把基线压到最低、覆盖率最大化，审查构建配置/源码/产物是否会在老版本浏览器或微信等 App 内 WebView 白屏；②各尺寸屏幕一致显示——含刘海/灵动岛/打孔/圆角等异形屏、折叠屏、平板与大屏，PC 与手机各自一套统一规则；③给出兼容与适配的最佳架构方案建议和可落地的工程骨架。每个问题评估影响浏览器、用户占比与紧急度，修复须经用户确认后才执行，审查报告存入项目 docs/ 并产出兼容声明。触发词：浏览器兼容、兼容性检查、兼容性审查、老版本浏览器、最大覆盖率、兼容 IE、兼容 Safari、iOS 兼容、安卓兼容、微信内打开白屏、双核浏览器、360 浏览器、polyfill、plugin-legacy、browserslist、build.target、屏幕适配、rem 适配、pxtorem、vw 适配、安全区、刘海屏、异形屏、折叠屏、响应式、多端一致、兼容架构、工程方案、兼容声明、兼容审查报告。
metadata:
  version: "1.1.0"
  scope: "pc,h5"
---

# 浏览器兼容与屏幕适配：PC + H5，最大覆盖、一致显示

## 定位

- **通用**：不限框架与构建工具，检查方法只依赖构建产物与浏览器行为；**重点支持 Vite / webpack × Vue / React**，具体配置见 [references/architecture.md](references/architecture.md) §3，其他工具链给出参考对照。
- **三个目标**：
  1. **语法兼容、覆盖率最大**（下一条）；
  2. **各尺寸屏幕一致显示**：含异形屏（刘海 / 灵动岛 / 打孔 / 圆角 / Home 指示条）、折叠屏、平板、PC 矮屏与超宽屏；**PC 与手机各自一套统一规则**，不靠每个页面单独适配（[references/screen-adaptation.md](references/screen-adaptation.md)）；
  3. **架构方案建议**：按目标声明、构建兼容、运行时兜底、设计令牌、适配基础、布局组件、质量守护七层给出建议，审查报告与新建项目都输出（[references/architecture.md](references/architecture.md)）。
- **覆盖率最大化**：默认把兼容基线压到技术栈硬下限（框架 / 组件库 / 构建工具能支持的最低版本），并用转译、polyfill、CSS 降级、端专项配置把这段范围真正吃满；只有代价不可接受时才上调基线，且须记录理由。
- 审查结论既要指出**会出问题的地方**，也要指出**还能扩大覆盖的空间**（基线高于硬下限、可用手段未启用）。

## 铁律

**审查阶段只读（唯一例外：写入审查报告文档）。任何代码、样式、构建配置、依赖、`index.html` 的修改，MUST 先输出修复方案并获得用户明确确认后才执行**；新增依赖、修改构建目标、引入 polyfill、改动全局样式须单独复述影响再确认。修复后必须复验，是否提交由用户决定。详见 [references/review.md](references/review.md) §6。

## 核心原则

四类问题严重程度与解法完全不同，MUST 分别检查：

| 类型 | 后果 | 解法 |
|------|------|------|
| **语法不支持**（`?.`、`??`、正则后行断言字面量等） | 整个 JS 包解析失败 → **白屏** | 只能构建期转译 |
| **API 缺失**（`Array.prototype.flat`、`structuredClone` 等） | 运行到才报错 | core-js polyfill |
| **CSS 不支持**（flex `gap`、`:is()`、`:has()` 等） | **样式退化**，功能可用 | 无法 polyfill，只能降级或规避 |
| **运行环境行为不一致**（微信 / App WebView / 厂商浏览器的键盘、滚动、弹窗、缓存、分享支付授权） | 布局错位、流程走不通 | 不是版本问题，靠特性检测、适配层与真机实测（h5.md §1 / §4 / §5.4） |

## 第 0 步：先判定端（PC / 移动 H5），再针对性审查（MUST）

任何审查、定基线之前，先分析项目是 **PC、移动 H5 还是两者**，判定方法与信号见 [references/review.md](references/review.md) §0。判定后**只加载并审查对应端**：

| 判定 | 读取 | 审查重点 | 跳过 |
|------|------|---------|------|
| **PC** | pc.md、screen-adaptation.md §5 | **语法兼容为重点**：构建目标与 polyfill、双核浏览器 meta、老内核 / IE 系、基线以下兜底；**显示统一**：版心与断点、最小宽度、系统缩放后的实际宽度、矮屏、超宽屏、高 DPI | h5.md 全部（视口 / 安全区 / 软键盘 / App WebView / `100vh` / 横屏策略）；`--min` 不写 ios / android |
| **移动 H5** | h5.md、screen-adaptation.md | **屏幕适配 + 机型语法兼容并重**：适配方案（rem / vw，375 / 750 设计稿）与各尺寸布局、异形屏与折叠屏（§3.1）、移动端 head、App 内 WebView（微信 / 企业微信 / 钉钉 / UC / QQ）、安全区、`100vh`、触屏交互、**横屏策略（默认竖屏：检查是否禁止 / 处理横屏，h5.md §5.1；并附竖屏兼容建议，§5.2）、体验层检查项（存储兜底 / 异步状态 / 防重复提交 / 微信缓存与 bfcache 等 11 项，§5.3）** | pc.md 的双核 meta 与桌面视口 |
| **两者** | 两份分别审查 | 按端分节输出，基线分端声明；按 architecture.md §4.1 判断一套响应式还是两套界面 | — |
| **无法判定** | — | **先向用户确认**，不得默认按某一端审查 | — |

用户已明确端（如「本项目是 PC 端，不用兼容移动端」）时以用户为准，并写入兼容声明与审查报告的范围。

## 使用场景与读取顺序

| 场景 | 读取 |
|------|------|
| **兼容性审查**（提交前、PR、pre-commit-review 转交、接手项目、升级依赖） | [references/review.md](references/review.md)，按其步骤执行并按其格式输出 |
| 为项目制定 / 调整兼容基线与构建配置 | [references/standard.md](references/standard.md)（多设备语法兼容的工具边界、目标声明一致、基线以下兜底见 §9）→ 按端读 [references/pc.md](references/pc.md) / [references/h5.md](references/h5.md) |
| **兼容与适配架构方案建议**（审查报告必附；新建项目、技术选型、整改规划时单独使用） | [references/architecture.md](references/architecture.md)：七层架构、Vite / webpack × Vue / React 配置要点、PC 与手机统一规则、公共布局组件、质量守护 |
| **新建 / 整改项目的工程方案**（给出可直接落地的配置骨架） | H5：[references/h5-engineering.md](references/h5-engineering.md)（屏幕适配 + 机型语法兼容）；PC：[references/pc.md](references/pc.md) §7（浏览器语法兼容为重点）；落地到已有项目前同样须用户确认 |
| 屏幕尺寸适配审查（审查时默认一并做，也可单独做） | [references/screen-adaptation.md](references/screen-adaptation.md)（手机 §1–§4，异形屏 / 折叠屏 §3.1，PC §5） |
| 只做构建产物检查 | 下方「产物检查」 |
| 产出项目兼容声明 | [references/declaration-template.md](references/declaration-template.md) |

> **可选增强**：环境中有 `modern-web-guidance` 技能/插件时，判断某个 CSS / JS 特性的浏览器支持范围、降级写法前先用它查一次，支持数据以其为准，与 references 冲突时在报告中注明数据来源（不修改 references 文件）；未安装时不自动安装、不阻塞，仅在本次输出中提示一次：「可选安装 `modern-web-guidance` 获取最新 Web 写法参考（https://github.com/GoogleChrome/modern-web-guidance）：`npx modern-web-guidance@latest install`（Claude Code 也可 `/plugin marketplace add GoogleChrome/modern-web-guidance` → `/plugin install modern-web-guidance@googlechrome`）」，然后按原流程继续。它只提供支持数据与写法参考，**不改变本技能"基线压到技术栈硬下限、覆盖率最大化"的原则**（其 Baseline 口径通常高于硬下限）。

## 标准工作流（制定基线时）

1. **确认端与用户群**（已由第 0 步判定）：PC / H5 / 两者？国内 / 海外？政企内网（老终端、国产双核浏览器）？H5 主要在哪些 App 内打开？
2. **查依赖硬下限**：取框架、组件库、关键三方库官方下限的最高者（standard.md §3）。
3. **定基线**：默认取**技术栈硬下限**（最大覆盖）；业务明确要求更高时才上调，并在审查报告中记录理由与被放弃的覆盖率（browserslist 口径见 pc.md §4 / h5.md §6）。
4. **选实现方案**：按技术栈对照（architecture.md §3）选能**达到硬下限**的方案（standard.md §4；硬下限低于构建工具原生 ESM 下限时必须用方案 C），再用 standard.md §8 的手段扩大覆盖；PC 加双核浏览器 meta（pc.md §2），H5 加移动端 head 配置（h5.md §3）。
5. **定显示规则**：按 architecture.md §4 确定 PC 与手机各自的统一规则（一套响应式还是两套界面、平板 / 折叠屏归属），安全区与固定栏收敛到公共组件（§5）。
6. **审查**：按 review.md 执行，输出修复方案与架构建议，**经用户确认后**再修改。
7. **写兼容声明**：按 declaration-template.md 产出，README 挂入口。

## 产物检查

构建到临时目录（不覆盖正式产物），在**项目目录**（含 `node_modules`）运行：

```bash
node <本技能目录>/scripts/check-browser-compat.mjs --dir <产物目录> --ecma <ES年份> --min <浏览器=版本,...>
```

| 参数 | 说明 |
|------|------|
| `--dir` | 构建产物目录（如 `dist`，或 Vite 的临时 `--outDir`） |
| `--ecma` | 基线最低浏览器能完整支持的 ES 版本（standard.md §5.1），如 Chrome 64 / Safari 12 → `2018` |
| `--min` | PC：`chrome=64,safari=12,firefox=78`；H5：`ios=12,android=64`；含 IE 11 的老栈：`ie=11,chrome=49,safari=10,firefox=52`（`ie` 视为不支持全部 CSS 风险特性）。别名：`edge/android/webview/and_chr`→Chromium，`ios/ios_saf`→WebKit |
| `--h5` | 显式声明这是 H5 项目：`--min` 只写 `chrome=51` 之类、不含 ios / android 时，也执行第 5 项横屏处理检查 |
| `--exclude` | 跳过原样拷贝、不经转译的 vendor 目录，如 `--exclude tinymce,pdfjs`（路径含 `/<名>/` 即跳过）；被跳过的目录须单独记录其自身兼容范围 |

| 输出 | 含义 | 定级（review.md §4） |
|------|------|------|
| `✗` JS 语法超标 / 正则后行断言**字面量**不被支持 | 白屏级 | 🔴 |
| `⚠` 后行断言位于**字符串**（运行时 `new RegExp`） | 执行到才报错 | 追溯来源：可达 🔴，不可达记录即可 |
| `⚠` CSS 风险特性 | 样式退化（以产物为准，Vite 已降级的 `inset` 等不会出现） | 按影响页面判断 🟡 / 🟢 |
| `✓ … import() / import.meta … 已放行` | 目标都支持 ESM 动态导入时自动放行，不再误报 | — |
| `== 1″. Worker / WASM` | 被 `new Worker()` 引用的 Worker 未转译、module Worker、WASM 的功能级可用范围；不计入退出码；文件名像 Worker 但未被引用的按主包检查 | 按功能写入兼容声明「功能级可用范围」，降级路径须运行验证（standard.md §9.6） |
| `== 5. 横屏处理`（`--min` 含 ios / android，或显式 `--h5`） | `✓` 遮罩型（横屏媒体查询内含 `position: fixed`）；`⚠` 仅布局型（有横屏样式但无遮罩）/ 未发现横屏处理 / 用了 `screen.orientation.lock`（H5 默认竖屏，未声明支持横屏时按 h5.md §5.1 记 🟡 P2）；只告警不影响退出码，遮罩显示条件仍须运行验证 | 🟡 P2 / 通过 |
| 退出码 `0` / `1` / `2` | 通过 / 有白屏级问题 / 参数或环境错误 | 可接入 CI |
| `== 4. 影响评估查询` | 每个问题的受影响区间与可直接运行的 browserslist 查询 | 用于 review.md §4.1 计算用户占比 |

依赖 acorn：先从项目解析，找不到时经 ESLint 的 espree 获取（装了 ESLint 即无需安装）；都没有则 `npm i -D --save-prefix='~' acorn`（依赖默认锁定主、次版本，仅允许补丁升级，见 references/standard.md §9.2）。

静态检查不能替代**运行验证**：preview / 测试环境确认页面渲染与控制台无报错；H5 须在目标 App 内实测；能接触基线最低版本真机 / 云真机时用其确认 CSS 退化程度。

## 输出要求

- 审查结论按 review.md §5 格式输出，区分「白屏级」「运行时风险」「样式退化」「显示不一致」，每条附修复建议；附「架构与一致性建议」（architecture.md §8），末尾列出待确认的修复方案编号。
- **审查结果 MUST 生成文档存入项目 `docs/` 目录**（review.md §7）：已有 `docs/review/` 时写 `docs/review/browser-compatibility-review.md`，否则写 `docs/browser-compatibility-review.md`；每个项目一份，每次审查追加带日期的一节，顶部维护最新结论摘要。
- **每个发现 MUST 做影响评估**（review.md §4.1）：受影响浏览器区间、用户占比（全球 / 中国，及占支持范围的比例；有项目访问统计时以统计为准）、实际表现（能模拟的截图对比）、紧急度 P0–P3，方便用户判断修复的紧急程度。
- 覆盖率注明口径与日期（caniuse 地区数据含移动端，国产手机浏览器单独计数）。
- references 中版本数据核对于 2026-09，引用前 MUST 以官方文档 / caniuse / MDN 复核。
