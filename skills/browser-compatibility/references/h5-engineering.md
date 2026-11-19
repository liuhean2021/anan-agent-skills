# 移动端 H5 工程方案：屏幕适配 + 机型语法兼容

> 用于**新建或整改** H5 项目时直接落地的工程骨架，以 Vue 3 + Vite + TS + rem 为例，**375 与 750 设计稿都支持**（只改 §4.1 的 `DESIGN_WIDTH`）。Vite + React 只需把 `@vitejs/plugin-vue` 换成 `@vitejs/plugin-react`；webpack + Vue / React 的构建配置换成 architecture.md §3.2 对应行；`index.html`、适配、样式、验证部分各组合通用。整体分层与 PC / 手机统一规则见 architecture.md。
> 所有改动属于「修改」，在已有项目上落地前 MUST 按 review.md §6 输出方案并经用户确认。版本号不在此固定：以 `create-vue` / `create-vite` 当前生成的 Vite 与插件组合为准，再合并本文配置（standard.md §9.2）；脚手架默认写的 `^` 范围要改成 `~主.次.补丁`，依赖默认锁定主、次版本、仅允许补丁升级。数据核对于 2026-11。

## 1. 目标与边界

| 项 | 默认取值（最大覆盖） | 依据 |
|----|-------------------|------|
| 基线 | Vue 3 硬下限：Chrome / Android WebView 51、iOS 10 | h5.md §2；组件库下限更高时取更高者 |
| 构建方案 | 方案 C：legacy 包覆盖 [硬下限, ESM 下限)，现代包覆盖 ESM 下限以上 | standard.md §4 / §4.1.1 |
| 基线以下 | 内联 ES5 检测脚本给出升级提示，不白屏 | standard.md §9.3 |
| 必测环境 | iOS 微信、Android 微信（XWeb / X5）、企业微信、鸿蒙微信、UC / QQ、目标 App WebView | h5.md §1 / §8 |
| 兼容等级 | 基线内「核心可用」，主流环境「体验完整」，增强效果按特性检测 | standard.md §9.5 |

不能被构建解决的：`Proxy`（Vue 3 硬下限的原因）、CSS 新特性（只能降级写法）、宿主 WebView 行为（h5.md §4）。

## 2. 目录约定

```text
index.html                 # head：移动端 meta、基线兜底、根字号脚本（均内联 ES5）
.browserslistrc            # autoprefixer 等读取，与 legacy targets 一致
vite.config.ts             # legacy 方案 C
postcss.config.cjs         # pxtorem + autoprefixer（package.json 为 ESM 时用 .cjs）
src/styles/                # reset / variables（安全区）/ compat（降级写法）
src/utils/feature-detect.ts
src/utils/viewport.ts      # visualViewport → CSS 变量
src/components/RotateTip.vue   # 横屏遮罩（h5.md §5.1）
tests/e2e/                 # 视口遍历、横屏遮罩
```

## 3. 机型语法兼容配置

### 3.1 `.browserslistrc`

```text
# 与 vite.config.ts 的 legacy targets 保持一致；Android 老 WebView 用 Chromium 版本表达
chrome >= 51
ios_saf >= 10
safari >= 10
```

不要写 `Android >= 7`：browserslist 里它只命中最新一个 WebView 版本，不代表 Android 7 系统（standard.md §9.2）。改完运行 `npx browserslist` 核对输出。

### 3.2 `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    vue(),
    legacy({
      // legacy 包：覆盖到硬下限（不支持 ESM 的老内核走 nomodule）
      targets: ['chrome >= 51', 'ios >= 10', 'safari >= 10'],
      // 现代包：支持 ESM 的最低版本；不设时现代包默认目标偏高（新版插件如 8.x 约为 chrome 105 / iOS 16.4，旧版如 5.x 为 chrome 64；以所装版本 README 为准，用 `npx browserslist` 核对），iOS 11.3–16.3 会全部落到更重的 legacy 包
      modernTargets: ['chrome >= 64', 'safari >= 11.1', 'ios >= 11.3'],
      modernPolyfills: true
    })
  ]
  // 不再另设 build.target：modernTargets 会覆盖它（standard.md §4.1）
})
```

- DOM API（`ResizeObserver`、`IntersectionObserver` 等）不在自动 polyfill 范围，按 standard.md §5.2 / §8 确认后用 `additionalLegacyPolyfills` / `additionalModernPolyfills` 补。
- 依赖：`@vitejs/plugin-legacy`（主版本与 Vite 一致）+ `terser`。pnpm 10 见 standard.md §4.2。

### 3.3 `index.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <meta name="format-detection" content="telephone=no, email=no" />
    <title>页面标题（不要留工程名，微信导航栏会显示）</title>
    <script>
      // 内联 ES5，不经构建：① 基线以下兜底 ② rem 根字号（screen-adaptation.md §2.1）
      // 兜底分支会替换 body 内容，随后 legacy 包仍可能尝试挂载到 #app 并在控制台多报一条错，属预期；需要更干净时保留 #app，只往其中写提示
      (function () {
        var root = document.documentElement, MAX = 540, timer
        if (!(typeof Proxy === 'function' && typeof Promise === 'function')) {
          document.addEventListener('DOMContentLoaded', function () {
            document.body.innerHTML = '<div style="padding:24px;font-size:16px;line-height:1.6;color:#333">当前浏览器版本过低，请升级系统或使用最新版微信 / 浏览器打开</div>'
          })
          return
        }
        function setRem() { root.style.fontSize = Math.min(root.clientWidth || window.innerWidth, MAX) / 10 + 'px' }
        setRem()
        window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(setRem, 80) })
        window.addEventListener('pageshow', function (e) { if (e.persisted) setRem() })
      })()
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

默认禁止页面缩放：viewport 带 `maximum-scale=1, user-scalable=no`，并配合 §4.2 的 `touch-action: pan-x pan-y` 与 `gesturestart` 兜底（iOS 10+ 忽略 viewport 里的禁止缩放，只靠 meta 不够，见 h5.md §3）；iOS 聚焦放大仍用输入框字号 ≥ 16px 解决。

### 3.4 源码编码约束

| 约束 | 原因 |
|------|------|
| 正则字面量不用后行断言 `(?<=` `(?<!` | iOS < 16.4 整包解析失败白屏，转译不处理（standard.md §5.1） |
| 日期用 ISO 格式（`2026-09-26T10:00:00`）或日期库 | iOS `new Date('2026-09-26 10:00')` 为 Invalid Date |
| `localStorage` / `sessionStorage` 在入口路径包 `try/catch` | 被禁用时抛错，入口抛错即白屏（h5.md §5.3 #3） |
| 能力判断用特性检测，UA 只做环境分流与日志 | standard.md §9.4 |
| 依赖若以新语法发布，确认已被转译（Vite 默认处理；产物检查会暴露） | standard.md §8 |

## 4. 屏幕适配配置

### 4.1 `postcss.config.cjs`

```js
// 业务设计稿宽度：375 或 750，全项目只在这里声明（screen-adaptation.md §2.4）
const DESIGN_WIDTH = 375
// 组件库按 375 设计时（Vant / NutUI 等），与 750 业务稿按文件区分基准
const isLib375 = (file) => !!file && /[\\/]node_modules[\\/](vant|@nutui)[\\/]/.test(file)

module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: ({ file }) => (isLib375(file) ? 37.5 : DESIGN_WIDTH / 10),
      propList: ['*'],
      selectorBlackList: [/^html$/],   // 根字号兜底不转换
      minPixelValue: 2,         // 1px 保留为 px
      mediaQuery: false
      // 不写 exclude: /node_modules/，否则组件库不转换、上面的 375 分支不生效；
      // 想让组件库保持 px 不缩放时才加 exclude
    },
    autoprefixer: {}            // 读取 .browserslistrc
  }
}
```

- 根字号脚本（§3.3）与设计稿宽度无关，375 / 750 都用 `min(宽, MAX) / 10`；样式里照抄设计稿标注值。
- 不需要缩放的值（容器 `max-width` / `min-width`、关键按钮最小高度、输入框字号）写 `PX`，pxtorem 不转换、浏览器照常识别。**`PX` 是 CSS 像素：750 稿要把标注值除以 2**（标注 88 → `44PX`）；下文样式骨架中的 `PX` 值均为 CSS 像素，两种设计稿通用。
- 用 vw 方案时换成 `postcss-px-to-viewport-8-plugin`，`viewportWidth: (file) => (isLib375(file) ? 375 : DESIGN_WIDTH)`，并给容器写不转换的 `max-width`。
- 不要在 `vite.config.ts` 再写一份 `css.postcss`。

### 4.2 样式骨架

```css
/* variables.css */
:root {
  /* 安全区统一收敛为变量：组件只读变量，测试可覆盖变量模拟异形屏（screen-adaptation.md §4.1） */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --bottom-bar-height: 56px;   /* 按 375 稿标注；750 稿写 112px，转换后结果相同 */
}

/* reset.css */
html { font-size: 37.5px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; } /* JS 前兜底，已被 selectorBlackList 排除 */
html, body {
  touch-action: pan-x pan-y;      /* 禁双指 / 双击缩放，保留滚动；iOS 忽略 meta 的 user-scalable=no，靠这一行 + gesturestart 兜底 */
  /* overscroll-behavior-y: none;  默认不开：只在页面自带下拉刷新、需要关掉浏览器原生下拉刷新 / 回弹时取消注释；必须写在根滚动元素上，写在不滚动的容器上无效 */
}
body { margin: 0; -webkit-tap-highlight-color: transparent; }
input, textarea, select { font-size: 16PX; } /* 缩放后仍 ≥ 16px，防 iOS 聚焦放大 */

/* layout.css */
.page {
  max-width: 540PX;                 /* 与根字号脚本 MAX 一致 */
  margin: 0 auto;
  min-height: 100vh;                /* vh 在前 */
  min-height: 100dvh;               /* dvh 在后，不支持时保留上一行 */
  padding-top: var(--safe-top);
  padding-left: var(--safe-left);   /* 横屏刘海侧 */
  padding-right: var(--safe-right);
}
.page--with-bar { padding-bottom: calc(var(--bottom-bar-height) + var(--safe-bottom)); }
.bottom-bar {
  position: fixed; left: 0; right: 0; bottom: 0;   /* 写四个方向：不依赖构建把 inset 降级（Vite 会降级，其他工具链不一定） */
  min-height: var(--bottom-bar-height);
  padding-bottom: var(--safe-bottom);              /* 组件里不要再用 padding 简写覆盖它 */
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}
/* fixed 元素按视口定位，不受 .page 的 max-width 约束：背景铺满全宽，内容放进内层并与 .page 同宽居中。
   不要用 transform 居中，否则底栏内的 fixed 子元素会改为相对底栏定位 */
.bottom-bar__inner { max-width: 540PX; margin: 0 auto; }
/* 基线含 iOS 11.0–11.1 时，在使用处另加 constant() 行，不要写进变量（screen-adaptation.md §3.1） */
.flex-item { min-width: 0; }

/* compat.css：基线含 iOS < 14.1 / Chrome < 84，flex 间距不用 gap */
.row { display: flex; flex-wrap: wrap; margin: -4px; }
.row > * { margin: 4px; }
.sticky { position: -webkit-sticky; position: sticky; top: 0; }
.glass { background: rgba(255, 255, 255, 0.96); }
@supports ((-webkit-backdrop-filter: blur(8px)) or (backdrop-filter: blur(8px))) {
  .glass { background: rgba(255, 255, 255, 0.76); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
}
```

- fixed 元素不要放在带 `transform` / `filter` / `perspective` 的祖先里，弹层用 Teleport 挂到 `body`（screen-adaptation.md §3）。
- 首屏大图用 `padding-top: <高÷宽>%` 比例占位，不用 `aspect-ratio`（h5.md §5.2）。

### 4.3 运行时工具

```ts
// src/utils/no-zoom.ts：iOS 忽略 meta 的 user-scalable=no，在 `src/main.ts` 创建应用之前调用一次 `disablePageZoom()`（可选，iOS 9–12 兜底）
export function disablePageZoom(): void {
  document.addEventListener('gesturestart', (e) => e.preventDefault())
}

// src/utils/feature-detect.ts
function detectFlexGap(): boolean {
  // CSS.supports('gap', ...) 在只支持 grid gap 的内核上也返回 true，必须实测
  const el = document.createElement('div')
  el.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden'
  el.appendChild(document.createElement('div'))
  el.appendChild(document.createElement('div'))
  document.body.appendChild(el)
  const ok = el.scrollHeight === 1
  document.body.removeChild(el)
  return ok
}
const supports = (p: string, v: string) => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(p, v)

export const features = {
  flexGap: detectFlexGap(),
  sticky: supports('position', 'sticky') || supports('position', '-webkit-sticky'),
  backdropFilter: supports('backdrop-filter', 'blur(1px)') || supports('-webkit-backdrop-filter', 'blur(1px)'),
  visualViewport: 'visualViewport' in window,
  resizeObserver: 'ResizeObserver' in window
}
```

```ts
// src/utils/viewport.ts：可视区高度写入 CSS 变量，供需要跟随软键盘的界面使用（不是可靠的键盘高度）
export function initViewport(): () => void {
  const root = document.documentElement
  const vv = window.visualViewport
  const update = () => {
    root.style.setProperty('--visual-height', `${vv ? vv.height : window.innerHeight}px`)
    root.style.setProperty('--visual-top', `${vv ? vv.offsetTop : 0}px`)
  }
  update()
  window.addEventListener('resize', update)
  vv?.addEventListener('resize', update)
  vv?.addEventListener('scroll', update)
  return () => {
    window.removeEventListener('resize', update)
    vv?.removeEventListener('resize', update)
    vv?.removeEventListener('scroll', update)
  }
}
```

`?.` 等新语法由构建转译到基线，源码可以用；只有 `index.html` 内联脚本必须手写 ES5。

一屏布局（聊天、地图、全屏轮播）另需 `--app-height` 高度变量，脚本与用法见 screen-adaptation.md §3.2；键盘收起回位与厂商键盘差异见 h5.md §5 / §5.4。

### 4.4 横屏

默认竖屏：按 h5.md §5.1 加横屏遮罩组件（CSS 媒体查询控制显示、可关闭），项目声明支持横屏时改为验证横屏布局。

## 5. 验证

### 5.1 产物检查（方案 C 分开检查两类包）

```bash
rm -rf /tmp/h5-dist && npx vite build --outDir /tmp/h5-dist   # 先清空，否则旧 hash 产物会被一起检查
rm -rf /tmp/h5-legacy /tmp/h5-modern && mkdir -p /tmp/h5-legacy /tmp/h5-modern
cp /tmp/h5-dist/assets/*legacy*.js /tmp/h5-legacy/
find /tmp/h5-dist/assets -name '*.js' ! -name '*legacy*' -exec cp {} /tmp/h5-modern/ \;
cp /tmp/h5-dist/assets/*.css /tmp/h5-modern/
find /tmp/h5-dist -name '*.wasm' -exec cp {} /tmp/h5-modern/ \;   # 有 .wasm 才会触发脚本的 WebAssembly 提示
node <本技能目录>/scripts/check-browser-compat.mjs --dir /tmp/h5-legacy --ecma 2015 --min ios=10,android=51
node <本技能目录>/scripts/check-browser-compat.mjs --dir /tmp/h5-modern --ecma 2018 --min ios=11.3,android=64 --h5
```

均在项目目录运行（需能解析 acorn）。现代包里的 `import()` / `import.meta`（含 `__vite_legacy_guard`）在 `--min` 目标都支持 ESM 动态导入时由脚本自动放行；用 legacy 基线（如 `ios=10`）检查现代包时仍会报出，属预期（standard.md §4.1.1）。CSS 的 ⚠ 按基线 `ios=10,android=51` 再看一遍影响（`--min` 换成基线即可），写入已知限制。再按 screen-adaptation.md §4.2 核对 rem 转换结果。

### 5.2 自动化（Playwright）

```ts
// playwright.config.ts（节选）
projects: [
  { name: 'iphone-se', use: { ...devices['iPhone SE'] } },     // 320 宽小屏
  { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
  { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
  { name: 'ipad-mini', use: { ...devices['iPad Mini'] } }
],
webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
```

用例：视口遍历与点击区域（screen-adaptation.md §4.1）、横屏遮罩显示条件（h5.md §5.1「运行验证」）、字体放大 1.3 倍不溢出（h5.md §5）。设备名随 Playwright 版本变化，不存在时改用明确的 viewport / UA / `hasTouch`。

### 5.3 真机矩阵

| 维度 | 最少覆盖 | 重点操作 |
|------|---------|---------|
| iOS 基线最低版本 + 当前版本 | 小屏一台、带安全区全面屏一台 | 首屏、底栏、输入键盘、横屏遮罩、返回缓存 |
| iOS 微信 / 企业微信 | 各一 | SDK 初始化与授权、分享、标题、返回 |
| Android 微信 | XWeb、X5 各一台 | 白屏（老内核）、键盘、文件上传、前后台切换 |
| 国产 Android 系统 WebView | 按用户分布抽华为 / 小米 / OPPO / vivo | WebView 版本、输入法、滚动、权限 |
| 鸿蒙微信、UC / QQ | 各一 | 核心路径 |
| 平板 | 一台 | 最大宽度、横屏不触发遮罩 |

每条记录设备、系统、App 版本、完整 UA、屏幕宽度、结果与截图，写入审查报告；兼容声明中标「已实测」。

## 6. 发布前验收

- [ ] `npx browserslist` 输出与基线一致；legacy / 现代包分别通过产物检查（§5.1）
- [ ] 基线以下兜底提示可见：Playwright 中 `await page.addInitScript(() => { delete (window as any).Proxy })` 后打开页面，应显示升级提示
- [ ] `DESIGN_WIDTH` 与设计稿一致（375 / 750）：375 宽视口下抽查元素宽度 = 375 稿标注值或 750 稿标注值 ÷ 2；组件库尺寸正常
- [ ] 280 / 320 / 344 / 360 / 375 / 390 / 414 / 430 / 768 宽无横向溢出；根字号符合 `min(宽, MAX) / 10`；`max-width` 未被转成 rem
- [ ] 768 / 884 宽下固定底栏、顶部栏、悬浮按钮的内容区与 `.page` 同宽居中
- [ ] 禁止缩放：iOS 真机与 Android 微信内双指、双击均无法缩放页面，滚动正常；需放开的页面（协议 / 长文 / 图片预览）按预期可缩放
- [ ] 安全区、固定底栏、软键盘、横屏遮罩真机确认
- [ ] h5.md §5.3 体验层 11 项已过
- [ ] 兼容声明已按 declaration-template.md 更新
