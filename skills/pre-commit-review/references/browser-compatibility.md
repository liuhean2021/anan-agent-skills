# 浏览器兼容性审查参考（§3.13）

本文件供 SKILL.md §3.13 使用：给出默认兼容基线、PC 端与移动端的高发问题，以及定级参考。

## 1. 兼容范围的确定顺序

1. 项目已声明的范围优先：`.browserslistrc`、`package.json` 的 `browserslist` 字段、`vite.config.*` 的 `build.target`、`@vitejs/plugin-legacy` 的 `targets`、Babel `@babel/preset-env` 的 `targets`、需求文档或 PRD 中的兼容性约束。
2. 项目未声明时，采用下文的**默认广覆盖基线**，并在审查结论中给出 🟢 建议：补充 `browserslist`，让构建和审查使用同一套范围。
3. 项目声明的范围比默认基线窄时，按项目声明执行，同时在前置分析报告中注明「项目范围窄于默认基线」，由开发者确认是否有意为之。

> 构建配置要和声明范围一致：声明了 Safari 14，但构建 target 是 `esnext` 且没有 polyfill，就等于没有兼容。

## 2. 默认广覆盖基线（项目未声明时使用）

### PC 端

| 类别 | 默认下限 | 说明 |
|------|---------|------|
| Chrome | ≥ 87 | Chrome 109 是 Windows 7/8.1 最后可用版本，存量政企终端常见 |
| Edge（Chromium） | ≥ 88 | 企业环境主力 |
| Firefox | ≥ 78（ESR） | 重点关注表单控件与滚动条差异 |
| Safari（macOS） | ≥ 14 | 与 Chrome 差异最大的桌面浏览器 |
| 国产双核浏览器 | 极速模式（Chromium 内核） | 360、QQ、搜狗等；面向国内用户时须确认不会落入 IE 兼容模式 |
| IE 11 | 默认不支持 | 仅政企/金融/传统行业且需求明确要求时纳入 |

**PC 视口与显示**：1280 / 1366 / 1440 / 1920 / 2560 宽度；系统缩放 100% / 125% / 150%；DPR 1 与 2；Windows 与 macOS（字体渲染、滚动条占宽）；深浅色模式。

### 移动端

| 类别 | 默认下限 | 说明 |
|------|---------|------|
| iOS / iPadOS Safari | ≥ 14 | iOS 上所有浏览器（含 Chrome、微信）都使用 WebKit 内核 |
| Android Chrome / Android System WebView | ≥ 87，Android 7+ | 旧设备的 WebView 版本可能远低于 Chrome |
| 超级 App 内置 WebView | 微信（XWeb/X5）、企业微信、QQ、支付宝、钉钉、抖音 | 能力受宿主限制：下载、文件上传、自动播放、`window.open`、跳转 |
| 厂商与第三方浏览器 | 华为、小米、OPPO、vivo、UC、夸克 | 常有强制暗色、字体放大、广告注入、UA 改写 |
| 平板 | iPad、Android 平板 | iPadOS 13+ 默认以桌面 UA 访问（伪装成 Mac） |

**移动视口与显示**：宽度 320（最小）/ 360 / 375 / 390 / 414 / 430；平板 768 / 820 / 1024；横竖屏切换；DPR 2 与 3；刘海屏、灵动岛、底部 Home 指示条；系统字体放大；深浅色模式与厂商强制暗色。

## 3. PC 端高发问题

| 问题 | 典型表现 | 审查要点 |
|------|---------|---------|
| 新 JS **语法**未转译 | 正则后行断言 `(?<=…)` 在 Safari < 16.4 直接语法错误，**整个 bundle 解析失败，页面白屏** | 语法无法靠 polyfill 修复，只能依赖构建转译；检查 target 与转译配置 |
| 新 JS **API** 未 polyfill | `Array.prototype.at`、`structuredClone`、`Object.hasOwn`、`String.prototype.replaceAll`、`Promise.any`、`Array.prototype.findLast` 报 `is not a function` | 是否在 core-js / legacy 插件覆盖范围内 |
| 日期解析 | `new Date('2026-09-26 10:00')` 在 Safari 返回 Invalid Date | 用 `/` 分隔、ISO 格式（`T`）或 dayjs 等库解析 |
| 新 CSS 特性无降级 | `:has()`、`@container`、`color-mix()`、`inset`、`aspect-ratio`（Safari < 15）、flex `gap`（Safari < 14.1） | 是否有 `@supports` 降级或 PostCSS/autoprefixer 处理 |
| 前缀缺失 | `backdrop-filter`、`mask`、`line-clamp` 在 Safari 需 `-webkit-` | 是否依赖 autoprefixer，其 browserslist 是否正确 |
| 滚动条占宽 | Windows 常驻滚动条挤压布局、弹窗打开时页面抖动 | `scrollbar-gutter: stable` 或补偿宽度 |
| 字体回退 | Windows 无苹方，中文字体回退导致行高与宽度变化 | `font-family` 是否有跨平台回退链 |
| 表单控件 | `date`/`number` 输入框样式与行为差异、浏览器自动填充背景色 | 关键表单是否使用统一组件 |
| 窄屏与缩放 | 1366 宽或 150% 缩放下内容溢出、固定宽度被截断 | 是否用最小宽度、弹性布局 |
| 双核浏览器 IE 模式 | 国产浏览器落入兼容模式后白屏 | 面向国内 PC 用户时，`<meta name="renderer" content="webkit">` 是否存在 |

## 4. 移动端高发问题

| 问题 | 典型表现 | 审查要点 |
|------|---------|---------|
| viewport 缺失或错误 | 页面按 980px 缩小显示 | `<meta name="viewport" content="width=device-width, initial-scale=1">`；不应禁用用户缩放 |
| `100vh` | 移动浏览器地址栏导致底部被遮挡 | 使用 `dvh`/`svh` 并保留 `vh` 回退 |
| 安全区 | 刘海屏、底部 Home 指示条遮挡内容或按钮 | `viewport-fit=cover` 加 `env(safe-area-inset-*)` |
| iOS 输入框自动放大 | 输入框 `font-size < 16px` 时聚焦会放大页面 | 移动端输入框字号 ≥ 16px |
| 软键盘 | 底部 `position: fixed` 元素错位、输入框被键盘遮挡 | 是否处理 `visualViewport` 或避免在输入场景用 fixed |
| 只靠 hover 的交互 | 触屏上菜单、提示无法触发或无法关闭 | 用 `@media (hover: hover)` 区分，提供点击入口 |
| 点击区域过小 | 误触、点不中 | 可点击区域 ≥ 44×44px |
| 滚动穿透 | 弹窗内滑动时底层页面跟着滚动 | 弹窗打开时锁定 body 滚动，`overscroll-behavior: contain` |
| 横向溢出 | 320px 宽出现横向滚动条 | 长文本、表格、图片是否有换行或容器滚动 |
| UA 判断失效 | iPadOS 被识别为 Mac，移动端逻辑不生效 | 用特性检测（`navigator.maxTouchPoints`、`matchMedia`）代替 UA 判断 |
| WebView 能力受限 | 微信内无法下载文件、`window.open` 被拦截、视频无法自动播放、`<input type="file">` 行为不同 | 是否有 WebView 内的替代路径或引导提示 |
| 图片格式 | WebP 在 Safari < 14、AVIF 在 Safari < 16 不显示 | `<picture>` 提供回退格式 |
| 高 DPR 显示 | 1px 边框在 DPR 3 设备上显粗，位图模糊 | `srcset` 或矢量资源 |
| 强制暗色、字体放大 | 厂商浏览器强制反色导致对比度异常；系统字体放大后布局撑破 | `color-scheme` 声明；文本容器避免固定高度 |

## 5. 定级参考

| 情况 | 等级 |
|------|------|
| 目标范围内浏览器或设备上白屏、脚本报错、核心路径无法完成（无法提交、无法支付、按钮被遮挡且点不到） | 🔴 |
| 目标范围内明显布局错乱、功能降级无提示；或高风险特性未经验证 | 🟡 |
| 视觉细节差异、非核心页面的降级体验、建议补充 browserslist | 🟢 |

## 6. 运行时验证

本技能以静态审查为主。需要实际运行确认时，按 frontend-dev-workflow 的兼容性分层（`references/ref-04-testing.md` 的「④ 兼容性测试」）执行：Playwright 的 WebKit 与移动端设备 project、真机或云真机。未运行验证的高风险项须在结论中标注「未运行验证」。
