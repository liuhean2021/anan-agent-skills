# 屏幕尺寸适配审查

> 只审查 SKILL.md 第 0 步判定的那一端：手机 / H5 看 §1–§4（含异形屏、折叠屏 §3.1，落地配置见 h5-engineering.md），PC 看 §5。两端的统一规则与公共组件见 architecture.md §4 / §5。视口矩阵见 review.md §2。数据核对于 2026-11。
> 本文只管「不同尺寸下布局是否可用」；安全区、`100vh`、软键盘的兼容细节见 h5.md §5，横屏策略见 h5.md §5.1，竖屏布局建议见 h5.md §5.2。

## 0. 适配顺序（手机端）

按顺序处理，前一步不统一，后面的适配都会失准：

1. **不照搬设计原型的画布**：原型常画在固定宽度的手机外壳里（如 375 宽画布），页面要用流式宽度铺满真实视口，不复刻外壳和固定画布宽度；设计稿宽度只用于换算（§2.4）。
2. **统一 viewport**：全站同一份 `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`（默认禁止页面缩放，iOS 还需 `touch-action` 兜底，h5.md §3）；不同页面 / 子应用各写一份、或缺 `width=device-width` 时，Android 会按 980 宽渲染并触发字体自动放大（Font Boosting）。
3. **定尺寸方案**：rem / vw / 流式，及设计稿基准 375 / 750（§1、§2.4）。
4. **定高度方案**：`100vh` 问题（§3.2）。
5. **安全区与异形屏**（§3.1）、固定栏与弹层（§3）。
6. **验证**（§4）。

## 1. H5 适配方案识别与选型

先识别项目用的是哪种方案，再按对应要点审查：

```bash
grep -nE '"(postcss-pxtorem|postcss-px2rem|postcss-px-to-viewport[^"]*|amfe-flexible|lib-flexible)"' package.json
grep -rnE 'rootValue|viewportWidth|propList|selectorBlackList|unitToConvert' postcss.config.* vite.config.* vue.config.* 2>/dev/null
grep -rnE 'fontSize\s*=|style\.fontSize|setRem|flexible' index.html src | head
```

| 方案 | 做法 | 兼容 | 审查要点 |
|------|------|------|---------|
| rem（flexible / pxtorem） | JS 按视口宽设根字号，PostCSS 把设计稿 px 转 rem | 全基线可用 | §2 全部 |
| vw（`postcss-px-to-viewport-8-plugin`；原版 `postcss-px-to-viewport` 只适配 PostCSS 7，已停更） | px 直接转 `vw` | iOS 8+ / Chrome 26+，覆盖 h5.md 基线 | 必须给容器 `max-width`（单位不转换），否则平板 / 横屏无限放大；其余同 §2.2、§3 |
| 流式 + px | `%` / flex + 固定 px 字号 | 全基线可用 | 只需查 §3；多数后台型 H5 足够 |
| `clamp()` / 容器查询做流式字号 | — | `clamp()` 需 Chrome 79 / iOS 13.1，`@container` 需 iOS 16 | 基线低于此时必须有回退，否则记 🟡（standard.md §5.3） |

方案不统一（部分页面 rem、部分 px、组件库又是另一套基准）本身不是缺陷，但要确认**同一页面内**比例一致。设计稿是 375 还是 750 宽见 §2.4，两种都支持。

## 2. rem 方案要点

### 2.1 根字号脚本

- **放在 `index.html` `<head>` 内联、ES5 写法**，在样式与模块脚本之前执行；放在 `main.ts` 里会在 bundle 下载执行后才生效，首屏先按默认字号渲染再跳变。
- 只按**宽度**计算并设上限；不要随高度重算（软键盘弹出会改高度，重算会让整页缩放跳动）。
- bfcache 恢复（`pageshow` 且 `persisted`）时重算一次；`resize` 加防抖。

```html
<script>
  (function () {
    var MAX = 540 // 与页面容器 max-width 取同一值
    var root = document.documentElement, timer
    function setRem() { root.style.fontSize = Math.min(root.clientWidth || window.innerWidth, MAX) / 10 + 'px' }
    setRem()
    window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(setRem, 80) })
    window.addEventListener('pageshow', function (e) { if (e.persisted) setRem() })
  })()
</script>
```

### 2.2 PostCSS 转换的常见坑

| 坑 | 表现 | 检查 / 修复 |
|----|------|------------|
| `propList: ['*']` 把「不该缩放」的值也转了 | `html { font-size: 37.5px }` 被转成 `1rem`（`html` 上的 rem 按浏览器默认 16px 算，兜底字号失效）；容器 `max-width: 750px` 被转成 `20rem`，根字号上限为 75px 时实际变成 1500px，**最大宽度失效** | 根字号兜底、容器 `max-width` / `min-width`、媒体查询断点写成 `PX`（pxtorem 忽略大写单位，浏览器照常识别），或用 `selectorBlackList` 排除 `html`；构建后用 §4.2 的命令核对 |
| 根字号上限与容器 `max-width` 不一致 | 平板 / 横屏下内容按 2 倍放大但容器只有一半宽，或反之 | 两者取同一值（§2.1 的 `MAX`） |
| 组件库与业务设计稿基准不同 | Vant 按 375 设计，业务稿是 750 时组件被缩成一半 | `rootValue` 用函数按文件区分（如 `({ file }) => (file && file.includes('vant') ? 37.5 : 75)`）；`exclude: /node_modules/` 则组件库保持 px，须确认大屏下比例可接受 |
| 1px 边框 | 被转成 rem 后在部分设备上消失或变粗 | `minPixelValue: 2` 或写 `1PX`；需要发丝线用伪元素 `transform: scaleY(.5)`；**不要**用 `0.5px`（老 Android 渲染为 0 或 1px） |

### 2.3 缩放后的下限

以下数值按 375 稿标注说明，750 稿把标注值乘 2（§2.4）。

rem / vw 会让 320px 小屏上的所有尺寸按 `320 / 375 ≈ 0.85` 缩小：

- 设计稿 44px 的点击区域在 320 宽只剩约 37.5px，低于 44×44 要求 → 关键按钮的最小高度写 `PX`，或设计稿按 ≥ 52 标注。
- 设计稿 12px 的辅助文字缩到约 10px，正文 14px 缩到约 12px → 正文与表单不要低于 12px（缩放后），输入框字号缩放后仍须 ≥ 16px（否则 iOS 聚焦放大，h5.md §5）。

### 2.4 设计稿基准：375 与 750 两种都支持

375 稿（1 倍，标注值 = CSS px）和 750 稿（2 倍，标注值 = 2 × CSS px）都可以用，**区别只在换算基准，运行时脚本与布局规则完全相同**：

| 项 | 375 设计稿 | 750 设计稿 |
|----|-----------|-----------|
| pxtorem `rootValue` | 37.5 | 75 |
| px-to-viewport `viewportWidth` | 375 | 750 |
| 根字号脚本 | `min(宽, MAX) / 10`（两者相同，与设计稿宽度无关） | 同左 |
| 样式里写的数值 | 照抄标注 | 照抄标注（不要手动除 2） |
| 写 `PX`（不缩放）的值 | 照抄标注 | **标注值 ÷ 2**：`PX` 是 CSS 像素，750 稿上 88 的按钮高度写 `44PX` |
| 容器 `max-width`、断点、安全区 | CSS 像素，与设计稿无关 | 同左 |
| 1px 线 | 标注 1px = 1 CSS px | 标注 1px 是物理发丝线（0.5 CSS px）：按 §2.2 用伪元素 `scaleY(.5)`，不要写 `0.5px` |
| 下限换算（§2.3） | 正文 ≥ 12、输入框 ≥ 16、点击区域 ≥ 44 | 标注值对应 ≥ 24、≥ 32、≥ 88 |
| 切图 | 导出 @2x / @3x | 标注尺寸即 @2x，另需 @3x 时单独导出 |

**一个项目只定一个业务设计稿基准**，在一处常量中声明（如 `DESIGN_WIDTH = 375 | 750`），`rootValue = DESIGN_WIDTH / 10`、`viewportWidth = DESIGN_WIDTH` 都由它推导，不要在不同文件里各写一个数字。

**组件库基准与业务稿不同时**（常见：Vant / NutUI 等按 375 设计，业务稿是 750）：按文件区分换算基准。

```js
// pxtorem：rootValue 支持函数，参数是 PostCSS Input（含 file）
const DESIGN_WIDTH = 750
const isLib375 = (file) => !!file && /[\\/]node_modules[\\/](vant|@nutui)[\\/]/.test(file)
module.exports = {
  plugins: {
    'postcss-pxtorem': { rootValue: ({ file }) => (isLib375(file) ? 37.5 : DESIGN_WIDTH / 10), propList: ['*'], selectorBlackList: [/^html$/], minPixelValue: 2 },
    autoprefixer: {}
  }
}
// vw：postcss-px-to-viewport-8-plugin 的 viewportWidth 同样支持函数，参数是文件路径
// viewportWidth: (file) => (isLib375(file) ? 375 : DESIGN_WIDTH)
```

- 用了按文件区分的函数时，**不要**再 `exclude: /node_modules/`，否则组件库根本不会转换，函数里的 375 分支不生效。
- 反过来想让组件库保持 px（不随屏宽缩放）时才用 `exclude`，并确认大屏 / 小屏下组件与业务比例可接受。

**审查检查**：

```bash
grep -rnE 'rootValue|viewportWidth|DESIGN_WIDTH' postcss.config.* vite.config.* vue.config.* src 2>/dev/null
```

| 情况 | 等级 |
|------|------|
| 业务基准与设计稿不符（750 稿配 `rootValue: 37.5`，整页放大 2 倍；或反之缩小一半） | 🔴（全站显示错误） |
| 组件库与业务基准不同且未按文件区分，组件被放大 / 缩小一倍 | 🟡 |
| 750 稿写 `PX` 时未除以 2（按钮最小高度变成 88 CSS px 等） | 🟡 |
| 多处各写一个基准数字，未集中声明 | 🟢 |

运行验证：375 宽视口下，抽查一个有标注的元素，`getBoundingClientRect().width` 应等于 375 稿标注值、或 750 稿标注值 ÷ 2。

## 3. 布局要点（与方案无关）

| 问题 | 表现 | 检查 / 修复 |
|------|------|------------|
| 固定底栏遮挡内容 | 页面最后一段被底栏盖住 | 内容区 `padding-bottom` = 底栏高度 + `env(safe-area-inset-bottom)` |
| 安全区被覆盖 | 全局写了 `padding-bottom: calc(12px + env(safe-area-inset-bottom))`，组件 scoped 样式又写 `padding: 12px 16px`，简写属性覆盖了 `padding-bottom`，安全区丢失 | `grep -rnE 'safe-area-inset' src` 找到所有用处，再查同一类名是否在别处被 `padding` / `margin` 简写覆盖；运行时读该元素的 `getComputedStyle().paddingBottom` 核对 |
| `position: fixed` 不再相对视口 | 弹层、底栏随内容滚动或位置错乱 | 祖先元素有 `transform` / `filter` / `perspective` / `will-change: transform` / `contain: paint` 时，fixed 改为相对该祖先定位；fixed 元素挂到 `body` 下（Teleport / Portal） |
| flex 子项撑破容器 | 长单词、长链接、数字串导致横向溢出 | 可收缩子项加 `min-width: 0`，文本加 `overflow-wrap: break-word` / `word-break: break-all` |
| 软键盘挡住输入框 | 底部输入框被键盘遮住 | `visualViewport` 的 `height` / `offsetTop` 写入 CSS 变量（如 `--visual-height`，回退 `innerHeight`）供需要跟随可视区的界面使用；各 WebView 事件时序不同，**不能当作可靠的键盘高度**，真机验证 |
| 大屏 / 平板无限拉伸 | 768+ 宽下元素被拉得很大或很散 | 页面容器 `max-width` + `margin: 0 auto` 居中 |
| 下拉刷新 / 回弹与页面滚动打架 | 页面自带下拉刷新时，浏览器原生下拉刷新或 WebView 回弹同时触发 | `overscroll-behavior-y: none`（或 `contain`）写在**根滚动元素**（`html` / `body`）上；写在不滚动的容器（如只设了 `min-height` 的 `#app`）上无效。Chrome 63 / iOS 16 起支持，iOS 更低版本的回弹无法用 CSS 关闭；弹窗等内部滚动区用 `contain` 防滚动穿透 |
| 固定栏不受限宽约束 | 页面内容居中限宽，`position: fixed` 的底栏 / 顶部栏 / 悬浮按钮却横跨全屏或贴在屏幕边缘 | fixed 元素按视口定位，不继承页面容器的 `max-width`：背景铺满，内容放内层同宽居中；悬浮按钮用 `right: calc(50% - 限宽/2 + 间距)` 之类对齐容器（`max()` 需 Chrome 79 / iOS 11.3，更低基线用媒体查询分档）。不要用 `transform` 居中 |
| Android 文字垂直不居中 | 按钮、标签、徽标里的中文在部分 Android 机型偏上 1–2px，iOS 正常 | 见 §3.3 |

### 3.1 异形屏与折叠屏（一致显示）

**原则：背景铺满、内容避让。** 页面背景、顶部栏背景延伸到屏幕边缘；文字、按钮、输入框等可交互内容放在安全区内。由页面容器 / 安全区 / 固定栏组件统一处理（architecture.md §5），业务页面不直接写 `env()`。

| 形态 | 影响区域 | 处理 |
|------|---------|------|
| 刘海、灵动岛（iPhone X 及以后） | 竖屏顶部；横屏左侧或右侧 | `safe-area-inset-top`；横屏时 `-left` / `-right` 也非 0，全宽的顶部栏、底栏、列表要加左右内边距 |
| Home 指示条 | 底部约 34px | `safe-area-inset-bottom`，固定底栏与底部按钮必加 |
| 圆角屏 | 四角 | 安全区已包含；悬浮按钮、角标不要贴角放置，与安全区边缘再留间距 |
| Android 打孔屏、水滴屏 | 顶部状态栏区域 | 浏览器多数不把页面画进状态栏，inset 为 0、无需处理；**App 沉浸式 WebView** 把页面画进状态栏时，需 App 设置刘海区域模式或注入状态栏高度变量（如 `--app-status-bar-height`），H5 取 `max(env(...), var(--app-status-bar-height, 0px))`——`max()` 需 Chrome 79 / iOS 11.3，基线更低时在 App 侧注入完整内边距 |
| 微信 / 企业微信 / 小程序 web-view | 顶部由宿主导航栏占用 | 顶部 inset 通常为 0，底部仍需安全区；iOS 微信从历史返回时会出现底部工具栏，用真机确认底栏不被遮挡 |
| 折叠屏外屏 | 窄屏：Galaxy Fold 约 280 宽、Z Fold 5 约 344 宽（DevTools 预设） | 最小宽度验证要下探到 280；rem / vw 缩放后检查字号与点击区域下限（§2.3） |
| 折叠屏展开 | 接近方形，约 700–900 宽 | 按 architecture.md §4.2 明确归属：手机规则居中限宽，或切平板 / PC 布局；**不要**命中横屏遮罩（h5.md §5.1 的 `max-height: 480px` 已排除）；折叠 / 展开时只触发 `resize`，不要在加载时缓存宽度 |
| 双屏 / 铰链 | 内容横跨折痕 | Viewport Segments（`env(viewport-segment-*)`、`@media (horizontal-viewport-segments: 2)`）仍属实验特性，只做渐进增强，不作为必需 |

**写法要点**：

- `viewport-fit=cover` 必须设置，否则 `env(safe-area-inset-*)` 恒为 0，iOS 横屏还会出现两侧白边（h5.md §3）。
- `env()` 带回退值：`env(safe-area-inset-bottom, 0px)`。
- 基线含 **iOS 11.0–11.1** 时，在**使用处**先写 `constant()` 再写 `env()`：

  ```css
  .bottom-bar {
    padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0–11.1 */
    padding-bottom: env(safe-area-inset-bottom);
  }
  ```

  不要写在自定义属性里（`--safe-bottom: constant(...); --safe-bottom: env(...);`）：自定义属性对任何值都视为有效，后一行总会覆盖前一行，`constant()` 回退失效。
- 状态栏高度不要写死（20 / 44 / 47 / 54 / 59 因机型而异），一律用 `safe-area-inset-top`。
- 软键盘弹起时，紧贴键盘的输入栏是否还需要底部安全区，各系统表现不同，真机确认后按需在聚焦时去掉。

### 3.2 视口高度：`100vh` 问题

移动浏览器的 `100vh` 按「地址栏收起后」的最大高度计算，地址栏展开时页面底部会被遮住。按场景分三档处理：

| 场景 | 做法 | 覆盖 |
|------|------|------|
| 普通页面（内容可滚动） | 只用 `min-height`：`min-height: 100vh; min-height: 100dvh;`（顺序不能反） | iOS 15.4+ / Chrome 108+ 精确；更低版本退回 `100vh`，可滚动页面多出的一点高度影响不大 |
| 一屏布局（聊天、地图、全屏轮播、底部固定输入的页面） | 用 JS 写入的高度变量，`height: 100vh; height: var(--app-height, 100vh);`；支持 `dvh` 时直接用 `100dvh` | 全基线：iOS < 15.4、老 Android WebView 没有 `dvh`，只能靠 `innerHeight` |
| 需要跟随软键盘的局部（底部输入栏） | `visualViewport` 写入的 `--visual-height` / `--visual-top`（h5-engineering.md §4.3） | 只作为可视区参考，不是可靠的键盘高度 |

```js
// 一屏布局的高度变量：只在宽度变化（转屏、折叠屏开合）或首次加载时更新，避免软键盘弹出时 Android 改变 innerHeight 导致整页高度跳动
(function () {
  var root = document.documentElement, lastWidth = 0
  function setAppHeight() {
    if (root.clientWidth === lastWidth) return
    lastWidth = root.clientWidth
    root.style.setProperty('--app-height', window.innerHeight + 'px')
  }
  setAppHeight()
  window.addEventListener('resize', setAppHeight)
  window.addEventListener('orientationchange', function () { lastWidth = 0; setTimeout(setAppHeight, 300) })
})()
```

- 不要用 `-webkit-fill-available` 作为通用方案：各浏览器行为不一致，Chrome 中已改变语义。
- 不要给 `html` / `body` 写死 `height: 100vh` 再在内部滚动，iOS 上会出现双滚动、回弹和 fixed 错位；需要整屏内部滚动时，只给一屏布局容器设高度。
- 审查：`grep -rnE 'height:\s*100vh|100dvh|fill-available|--app-height' src`，逐处判断属于哪一档；一屏布局只写了 `100vh` 且基线含 iOS < 15.4 → 🟡。

### 3.3 文字垂直居中（Android 偏上）

**原因**：各系统中文字体的上下留白（字体度量）不同，Android 上不少系统字体上方留白偏小；用 `line-height` 等于容器高度来居中时，文字会整体偏上。rem / vw 缩放后字号变成小数像素（如 10.67px）时更明显。CSS 写法本身没有错，属于运行环境差异。

| 做法 | 说明 |
|------|------|
| 用 flex 居中，不用 `line-height = height` | 容器 `display: flex; align-items: center; justify-content: center;`，文字 `line-height: 1.2` 左右；高度用 `min-height` 或上下对称 `padding` |
| 小字号用偶数 | 标签、徽标等小字用 10 / 12 / 14 这类偶数（750 稿为 20 / 24 / 28），减少奇数字号的取整偏差 |
| 极小徽标（红点数字等） | 字号不低于 10px；必要时字号写大一倍再 `transform: scale(.5)`，避开浏览器最小字号限制 |
| 不要按机型写偏移 | 不要用 UA 判断 Android 后 `padding-top: 1px` 补偿，换个机型又会偏 |
| 新特性只做增强 | `text-box-trim` / `text-box-edge` 可精确裁掉字体上下留白，但支持很新（Chrome 133+、Safari 18.2+），只能渐进增强 |

验证：在 Android 真机（至少两个品牌）上截图放大，对比按钮、标签上下留白；桌面浏览器模拟看不出这个问题。

## 4. 验证

### 4.1 Playwright 视口遍历（可直接放进项目 e2e，或审查时临时运行）

```ts
import { expect, test } from '@playwright/test'

for (const width of [280, 320, 344, 360, 375, 390, 414, 430, 768, 884]) { // 含折叠屏外屏 280 / 344 与展开约 884
  test(`${width} 宽：无横向溢出、点击区域够大`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    const r = await page.evaluate(() => {
      const de = document.documentElement
      const vw = de.clientWidth
      const overflow = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > vw + 1)
        .slice(0, 5).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''))
      // 只查按钮类元素；正文内的行内链接高度天然小于 44，需人工判断
      const small = [...document.querySelectorAll('button, [role="button"], [type="submit"]')]
        .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && Math.min(b.width, b.height) < 44 })
        .slice(0, 5).map((el) => el.outerHTML.slice(0, 60))
      return { scroll: de.scrollWidth - vw, overflow, small, root: parseFloat(getComputedStyle(de).fontSize) }
    })
    expect(r.scroll, `溢出元素：${r.overflow.join(', ')}`).toBeLessThanOrEqual(1)
    expect.soft(r.small, '点击区域 < 44px').toEqual([])
    // rem 方案再加：expect(r.root).toBeCloseTo(Math.min(width, MAX) / 10, 1)
  })
}
```

- 需要登录或数据的页面，换成实际路由并准备测试数据；只测首页不能代表全部。
- Playwright 的设备模拟只覆盖视口、UA、触摸参数，**不等于**真实 iOS Safari、微信、Android WebView。
- **模拟异形屏**：桌面浏览器里 `env(safe-area-inset-*)` 恒为 0。若项目按 architecture.md 把安全区收敛为 CSS 变量，可在测试里覆盖变量后截图，检查顶部栏、底栏、横屏左右侧是否避让：

  ```ts
  await page.addStyleTag({ content: ':root{--safe-top:59px;--safe-bottom:34px}' })           // 竖屏灵动岛机型
  await page.addStyleTag({ content: ':root{--safe-left:59px;--safe-right:59px;--safe-bottom:21px}' }) // 横屏
  ```

  直接写 `env()` 的项目无法这样模拟，只能用 iOS 模拟器（Xcode Simulator）或真机确认——这也是建议收敛为变量与组件的原因之一。

### 4.2 构建产物核对（rem 方案）

```bash
# 根字号兜底应为 px，出现 font-size:1rem 说明被 pxtorem 转换了
grep -ohE 'html\{[^}]*\}' <产物目录>/assets/*.css | grep -n 'font-size'
# 容器 max-width / min-width 是否被转成 rem（结合源码确认是否本应保持 px）
grep -ohE '(max|min)-width:[0-9.]+rem' <产物目录>/assets/*.css | sort | uniq -c
```

### 4.3 真机记录

每个关键流程记录：设备型号、系统版本、浏览器 / App 版本、WebView 版本（UA 中的 `Chrome/xx`）、屏幕宽度、结果、截图 / 录屏，写入审查报告。至少覆盖一台小屏（320–360 宽）与一台带安全区的全面屏；有平板用户时加一台平板。

## 5. PC 尺寸适配

| 要点 | 说明 |
|------|------|
| 实际 CSS 宽度 = 物理宽 ÷ 系统缩放 | 1366@125% ≈ 1093、1920@150% = 1280、1280@125% = 1024；按这些宽度验证，而不只看分辨率 |
| 最小宽度 | 后台类页面设 `min-width`（如 1200 / 1280），窄于它时出现横向滚动而不是挤压错位；表格列、表单项不截断关键信息 |
| 大屏 | 2560 宽下内容区 `max-width` 居中或栅格合理扩展，不出现一行几十个字段的拉伸 |
| 字号单位 | 普通 PC 页面用 px，不用 rem / vw 随宽度缩放（用户期望浏览器缩放控制大小）；数据大屏这类按设计稿等比缩放的页面除外，需单独确认缩放方式与最小可读字号 |
| 浏览器缩放 | Ctrl + / − 到 80%–150% 时布局不重叠、弹窗可完整显示（必要时弹窗内滚动） |
| 矮屏 | 1366×768 去掉浏览器工具栏后视口高约 650：弹窗 `max-height` + 内部滚动，固定头尾不挤占主体 |
| 超宽屏 | 2560 / 3440 宽下内容不被拉伸，两侧空白有背景处理 |
| 高 DPI | 2x / 3x 屏位图用 `srcset` / `image-set()`，图标用 SVG；1px 边框在 Windows 125% / 150% 缩放下可能显示为 0 或 2px，关键分隔线用 1px 以上或背景色区分 |

## 6. 定级

| 情况 | 等级 |
|------|------|
| 核心按钮 / 输入框被底栏、安全区（刘海 / 灵动岛 / Home 指示条）、键盘遮挡且无法操作 | 🔴 |
| 异形屏下非核心内容被遮挡；缺 `viewport-fit=cover` 导致 iOS 横屏白边；折叠屏外屏（280 / 344）溢出；折叠屏展开误触发横屏遮罩 | 🟡 |
| 基线视口（320 起）出现横向溢出；安全区被覆盖；`max-width` 因单位转换失效；fixed 元素因祖先 `transform` 错位 | 🟡 |
| 缩放后点击区域 < 44px、文字 < 12px；大屏比例不协调；根字号脚本放在 bundle 内导致首屏跳变 | 🟢（核心操作按钮的点击区域升 🟡） |

发现同样写入 review.md §5 的发现表，并做 §4.1 影响评估（屏幕尺寸类问题的「受影响区间」写宽度范围与对应机型）。
