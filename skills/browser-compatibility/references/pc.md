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
- [ ] 1280 / 1366 / 1920 宽度，100% / 125% / 150% 缩放下无溢出、截断
- [ ] Windows（滚动条占宽、字体回退）与 macOS 下布局一致
- [ ] 表单控件（日期、数字输入、自动填充背景色）使用统一组件
- [ ] 面向国内用户：在 360 / QQ 浏览器极速模式下实测核心页面

## 6. 运行验证

- `vite preview`（或测试环境）打开产物：polyfill 包先于主包加载、页面渲染、控制台无 JS 报错。
- 有条件时用基线最低版本的 Chromium / BrowserStack 打开核心页面，确认 CSS 退化程度。
