# §5 测试体系：从零建立

> 适用：为存量/新项目建立 Playwright E2E、单元测试、组件测试体系

---

## 5. 测试体系：从零建立

独立触发本章节时，先确认范围，再输出实施方案并等待确认。

```
建立测试体系前，请先确认：
1. 项目当前有哪些测试？（无 / 有部分单元测试 / 有 E2E？）
2. 目标是什么？（补全覆盖 / 接入 CI 门禁 / 从零搭建？）
3. 优先保障哪些核心页面/功能？
← 收到答复后输出实施方案，等用户确认后再执行
```

### 5.1 渐进式策略

> **前置条件**：测试基础设施搭建（Playwright 安装、CI 配置、package.json scripts）属于 infra 任务，不是业务需求的默认范围。
> - MUST 在单独授权的任务中执行
> - MUST 拆分为独立 PR，触发 CODEOWNERS 审批
> - 业务需求默认不触碰 CI/CD、依赖、scripts 文件
>
> 详见 ref-06-ai-collaboration.md §7.4 AI 变更授权矩阵。

```
不要一次性给所有页面补测试。按这个节奏：

阶段 1（第 1 周）：搭好 E2E 基础设施
  └ Playwright 安装 + 配置 + 第一个冒烟测试

阶段 2（持续）：改哪先测哪
  └ 每次改存量页面，先写守护测试锁住现有行为，再改代码，最后补新需求测试

阶段 3（持续）：新页面测试先行
  └ 新页面先写失败测试，再写页面代码，测试全绿才算完成

阶段 4（第 2~3 周）：补单元测试基础设施
  └ 安装 Vitest / Jest，为现有工具函数、校验规则、数据转换补单元测试
  └ 新增的纯逻辑函数 MUST 同步写单元测试

阶段 5（按需）：公共组件测试
  └ 有公共组件库 → 安装 Testing Library，为公共组件补组件测试
  └ 业务页面组件不补组件测试（E2E 已覆盖）

阶段 6（按需）：关键路径补全
  └ 未改动但业务关键的页面（登录、支付、核心流程），主动补 E2E 测试
```

### 5.2 测试类型选择策略

前端有三类测试，不是每种都要上。根据项目阶段和代码特征选择：

#### 三类测试对比

| 测试类型 | 工具 | 测什么 | 框架绑定 | AI 生成可靠度 |
|---------|------|--------|---------|-------------|
| **E2E 测试** | Playwright | 页面行为：加载、交互、导航、反馈 | 无（框架无关） | 高 |
| **单元测试** | Vitest / Jest | 纯逻辑：工具函数、计算、数据转换、状态管理 | 无（纯 JS/TS） | 高 |
| **组件测试** | Testing Library / Vue Test Utils | 组件渲染：props → DOM 输出、事件触发、插槽 | **强绑定框架** | 中 |

#### 选择决策树

```
这段代码是纯函数 / 纯逻辑吗？（不涉及 DOM、不涉及组件）
  ├─ 是 → 单元测试（Vitest / Jest）
  └─ 否 → 这是公共组件库（供多项目 / 多页面复用）吗？
            ├─ 是 → 组件测试（Testing Library）+ E2E 集成验证
            └─ 否 → E2E 测试（Playwright）
```

#### 不同项目阶段的测试组合

| 项目阶段 | 推荐组合 | 说明 |
|---------|---------|------|
| **存量项目刚接手** | E2E 为主 | 零基础最快见效，框架无关，改哪测哪 |
| **存量项目稳定维护** | E2E + 单元测试 | 纯逻辑函数补单元测试，提升覆盖精度 |
| **新项目从零开始** | E2E + 单元测试 + 组件测试（公共组件） | 三层都建，但组件测试只覆盖公共组件库 |
| **公共组件库 / Design System** | 组件测试为主 + E2E 集成 | 组件库质量是下游所有项目的基础 |

#### 各类测试的适用边界

```
单元测试 SHOULD 覆盖：
  ✅ 工具函数（formatDate、formatCurrency、parseQuery）
  ✅ 业务计算逻辑（价格计算、权限判定、数据聚合）
  ✅ 状态管理（reducer / action / getter 的纯逻辑部分）
  ✅ 数据转换（API 响应 → 前端模型的 transform 函数）
  ✅ 正则 / 校验规则（手机号、邮箱、身份证等格式校验）

单元测试 SHOULD NOT 覆盖：
  ❌ 组件渲染结果（用 E2E 或组件测试覆盖）
  ❌ DOM 操作（用 E2E 覆盖）
  ❌ 样式 / 布局（用 E2E + 截图覆盖）

组件测试 SHOULD 覆盖（仅公共组件）：
  ✅ 公共组件的 props → 渲染输出映射
  ✅ 公共组件的事件触发与回调
  ✅ 公共组件的插槽 / children 渲染
  ✅ 公共组件的边界状态（disabled、loading、error）

组件测试 SHOULD NOT 覆盖：
  ❌ 业务页面组件（用 E2E 覆盖，避免框架绑定）
  ❌ 一次性使用的页面私有组件（ROI 太低）

E2E 测试覆盖范围：见 §5.5 的 6 个维度
```

#### 为什么 E2E 是第一优先级

```
Playwright 的核心优势：框架无关

- 项目从 Vue 2 迁到 Vue 3？测试不用改
- 项目从 React CRA 迁到 Next.js？测试不用改
- 项目混用了 jQuery + React？一样能测
- 团队有 Vue 项目也有 React 项目？同一套测试写法

E2E 测试面向的是浏览器行为，不是框架 API。
无论存量项目还是新项目，这都是投入产出比最高的测试切入点。
```

### 5.3 Playwright 初始化

```bash
# 安装
npm init playwright@latest
# 选择 TypeScript / tests 目录 / 安装浏览器

# 目录结构
tests/
  e2e/                       # E2E 测试（Playwright）
    login.spec.ts            # 按页面组织
    dashboard.spec.ts
    user-list.spec.ts
  unit/                      # 单元测试（Vitest / Jest）
    utils/
      format.test.ts         # 工具函数测试
      validate.test.ts       # 校验规则测试
    stores/
      user.test.ts           # 状态管理逻辑测试
  components/                # 组件测试（仅公共组件，按需）
    Button.test.ts
    DataTable.test.ts
  fixtures/                  # 测试数据 + mock
    user.json
    order.json
  helpers/                   # 测试工具函数
    auth.ts                  # 登录 helper
    mock.ts                  # API mock helper
```

### 5.4 测试基础设施代码

让 Claude Code 生成：

```
为本前端项目搭建 Playwright E2E 基础设施：

项目信息：
- 框架：[Vue/React/Angular/...]
- 开发服务器端口：[端口号]
- 启动命令：[npm run dev / npm start / ...]

生成内容：
1. playwright.config.ts
   - baseURL: http://localhost:[端口]
   - webServer 自动启动 dev server
   - 截图：仅失败时保存
   - 超时：30 秒
   - 浏览器：默认仅启用 chromium；按 §5.5 ④ 的 L1 / L2 / L3 分层策略逐步扩展

2. tests/helpers/auth.ts
   - loginAs(page, username, password) — 封装登录流程
   - mockLogin(page) — 直接注入 token/cookie，跳过登录页面（快速）

3. tests/helpers/mock.ts
   - mockAPI(page, urlPattern, responseData) — 封装 route.fulfill

4. tests/e2e/smoke.spec.ts
   - 冒烟测试：登录 → 进入首页 → 关键元素可见

5. package.json 追加脚本：
   "test:e2e": "npx playwright test"
   "test:e2e:ui": "npx playwright test --ui"
   "test:e2e:report": "npx playwright show-report"
```

### 5.5 每个页面测试该覆盖什么

前端测试需要覆盖 6 个维度。专业测试和普通"点点页面"的差别，很大程度上就在后 4 个维度。

> **覆盖原则**：6 个维度是完整覆盖清单，每次改动按需求涉及范围全覆盖相关维度，不要求每次都覆盖全部 6 项。具体选择见下方各维度说明中的"何时必选"。

#### ① UI 测试（界面正确性）

> "看起来对不对" | **何时必选**：改模板层、样式层、布局、响应式相关代码时

```
必覆盖：
  ✅ 页面加载成功，关键元素可见且位置正确
  ✅ 响应式布局：768px / 1440px 无溢出、无错位
  ✅ 异常状态有合理展示（空数据、加载中、接口报错）
  ✅ 视觉一致性：同类元素间距、对齐、颜色方案统一

选覆盖（关键页面加测）：
  ☑ 暗色模式 / 主题切换后样式正常
  ☑ 长文本 / 多语言场景无截断溢出
  ☑ 截图回归测试 → 自动化见 5.8，人工对比见 ref-05-visual-verification.md §6.2

不覆盖：
  ❌ CSS 属性精确值（如 font-size: 14px）
  ❌ 动画/过渡效果的帧级细节
  ❌ 第三方 UI 库内部渲染行为
```

#### ② UX 测试（用户体验质量）

> "用起来顺不顺" | **何时必选**：改交互逻辑、表单、流程、反馈机制时

```
必覆盖（每个页面都测）：
  ✅ 核心交互流程可走通（增删改查、搜索、筛选、分页）
  ✅ 加载反馈：耗时操作有 loading 状态，不会让用户以为卡死
  ✅ 操作反馈：提交成功/失败有明确提示（toast / message / alert）
  ✅ 可点击区域 ≥ 44px，不会误触

选覆盖（关键页面加测）：
  ☑ 表单校验：实时校验 + 提交校验，错误信息明确指向问题字段
  ☑ 键盘可访问性 → 详见 5.10 可访问性测试
  ☑ 错误恢复：网络失败后可重试，表单报错后已填数据不丢失
  ☑ 权限控制：无权限时的展示和引导（不是空白页面）

不覆盖：
  ❌ 用户主观偏好（"这个按钮应该更大"）
  ❌ 业务逻辑正确性（那是后端 + 集成测试的职责）
```

#### ③ 异常与边界场景测试

> 专业测试和普通点点页面的差别，很多就在这里。 | **何时必选**：改业务逻辑、接口调用、权限判断、数据处理时

```
必覆盖：
  ✅ 空数据：列表为空、搜索无结果、详情接口返回空
  ✅ 无权限 / 未登录 / 登录失效：是否正确跳转或提示，不是白屏
  ✅ 接口报错（500 / 超时 / 网络断开）：提示是否准确，页面是否可恢复
  ✅ 重复提交：连续快速点击按钮，只触发一次请求

选覆盖：
  ☑ 极大数据量：100+ 行表格、超长下拉列表，是否卡顿或渲染异常
  ☑ 极长文本：用户名 50 字符、备注 2000 字符，是否截断溢出
  ☑ 特殊字符：< > & " ' / \ emoji、SQL 注入字符串，是否被正确转义展示
  ☑ 并发操作：多 Tab 同时编辑同一条数据，保存时是否冲突处理
  ☑ 页面刷新 / 重复进入：刷新后状态是否丢失、重复进入是否重复请求
  ☑ 浏览器后退前进：回退后数据是否保持、前进后页面是否正常
```

#### ④ 兼容性测试

> 兼容性采用分层策略，不是每次改动都全浏览器全终端覆盖。先用低成本基线卡住，再按风险升层。 | **何时必选**：改全局样式、布局、公共组件、CSS 兼容性相关代码时

```
L1 基线层（默认每次都跑）：
  ✅ Chromium
  ✅ 1440px / 768px 两个断点
  ✅ 当前改动页面的核心路径

适用场景：日常页面改动、局部样式调整、普通表单/列表页修改

L2 风险层（满足任一条件时必加）：
  触发条件：改全局样式、布局、公共组件、滚动容器、日期时间、文件上传、CSS 兼容性相关代码
  ✅ WebKit（Safari）— 渲染差异最大：日期格式、flex 布局、滚动行为是重灾区
  ✅ 至少 1 个移动端项目（mobile-chrome 或 mobile-safari，按用户群选择）

L3 扩展层（按项目用户群或明确需求启用）：
  ☑ Edge（需要验证企业环境、IE 模式或 Edge 特有功能时）
  ☑ Firefox（用户群明确覆盖时，重点关注表单控件样式差异）
  ☑ iOS Safari + Android Chrome 真机
  ☑ Windows / macOS 差异（字体渲染、滚动条样式）
  ☑ 125% / 150% 缩放
  ☑ 横竖屏切换
  ☑ 深浅色模式切换

IE 兼容策略（仅限政企 / 金融 / 传统行业项目）：
  ⚠ IE 已于 2022 年 6 月停止支持，绝大多数新项目 SHOULD NOT 兼容 IE
  ⚠ IF 项目明确要求兼容 IE THEN：
    - 确认兼容范围：仅 IE 11
    - 使用 Edge 的 IE 模式测试，而非安装真实 IE
    - 降级方案优先：核心功能可用即可，不追求视觉一致
    - 常见问题：flexbox 部分不支持、CSS Grid 不支持、ES6+ 需 polyfill、CSS 变量不支持
  ⚠ IF 项目无 IE 要求 THEN 在项目文档中明确标注「不支持 IE」
```

Playwright 配置多浏览器：
```typescript
// playwright.config.ts 的 projects 中按需添加
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  // Edge 与 Chrome 同为 Chromium 内核，chromium 项目已覆盖核心场景
  // 如需单独测试 Edge 特有行为（IE 模式、PDF 预览等），用 channel 指定：
  { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
]
// 注意：Playwright 不支持 IE。如需 IE 兼容测试，使用 Edge IE 模式手动验证。
```

#### ⑤ 回归测试

> 前端改一个页面，经常会影响公共区域。这是最容易被忽视、也最容易出事故的部分。 | **何时必选**：改公共组件、公共样式、公共方法、导航/路由/权限时

```
每次改动后 MUST 检查：
  ✅ 公共组件：改了 Button / Modal / Table 等公共组件 → 抽查 3+ 个使用页面
  ✅ 公共样式：改了全局 CSS / 主题变量 / reset → 截图全部关键页面对比
  ✅ 公共方法：改了 utils / hooks / composables → 跑全量单元测试
  ✅ 导航 / 路由 / 权限：改了 layout / router / guard → 验证所有角色入口
  ✅ 同类页面：改了列表页模板 → 检查所有同类列表页是否受影响

自动化方式：
  - 截图回归测试覆盖关键页面（§5.8）
  - CI 中跑全量 E2E，不只跑改动页面的测试
  - 改公共组件时，用 grep 查所有引用处，确认影响范围
```

#### ⑥ 性能与体验测试（可选）

> 功能对了但用起来卡，用户一样会投诉。 | **何时选测**：首屏加载明显慢、大数据列表卡顿、用户投诉体验差时。日常改动不要求每次都跑性能测试。

详见 §5.9 性能测试（按需可选）。

### 5.6 E2E 测试示例（框架无关）

```typescript
import { test, expect } from '@playwright/test'

test.describe('用户列表页', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API（不依赖后端）
    await page.route('**/api/users*', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          list: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
          total: 2,
        }),
      })
    )
    await page.goto('/user/list')
  })

  test('关键元素可见', async ({ page }) => {
    await expect(page.getByTestId('search-input')).toBeVisible()
    await expect(page.getByTestId('data-table')).toBeVisible()
    await expect(page.getByTestId('pagination')).toBeVisible()
  })

  test('搜索交互正常', async ({ page }) => {
    await page.getByTestId('search-input').fill('Alice')
    await page.getByTestId('search-btn').click()
    // 验证表格行数变化
    await expect(page.getByTestId('data-table').locator('tbody tr')).toHaveCount(1)
  })

  test('空数据状态', async ({ page }) => {
    await page.route('**/api/users*', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ list: [], total: 0 }) })
    )
    await page.reload()
    await expect(page.getByText(/暂无数据|No Data|empty/i)).toBeVisible()
  })

  test('响应式：移动端无溢出', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const overflow = await page.evaluate(
      () => document.body.scrollWidth > document.body.clientWidth
    )
    expect(overflow).toBe(false)
  })
})
```

> 注意：以上测试不涉及任何 Vue / React / Angular API。换框架，测试原样跑。

### 5.7 UX 测试示例（框架无关）

```typescript
import { test, expect } from '@playwright/test'

test.describe('用户列表页 — UX 体验', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users*', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          list: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
          total: 2,
        }),
      })
    )
    await page.goto('/user/list')
  })

  // —— 加载反馈 ——
  test('耗时操作显示 loading 状态', async ({ page }) => {
    await page.route('**/api/users*', async route => {
      await new Promise(r => setTimeout(r, 1000))
      await route.fulfill({ status: 200, body: JSON.stringify({ list: [], total: 0 }) })
    })
    await page.getByTestId('search-btn').click()
    await expect(page.getByTestId('loading-indicator').or(page.locator('.el-loading-mask, .ant-spin, [class*="loading"]'))).toBeVisible()
  })

  // —— 操作反馈 ——
  test('删除成功后显示提示并刷新列表', async ({ page }) => {
    await page.route('**/api/users/*', route =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
    )
    await page.getByTestId('delete-btn').first().click()
    await page.getByRole('button', { name: /确[认定]|OK|Yes/i }).click()
    await expect(page.getByText(/删除成功|successfully/i)).toBeVisible()
  })

  // —— 错误恢复 ——
  test('接口报错时显示错误提示，不白屏', async ({ page }) => {
    await page.route('**/api/users*', route =>
      route.fulfill({ status: 500, body: '{}' })
    )
    await page.reload()
    await expect(page.getByText(/error|失败|出错|网络异常|请稍后重试/i)).toBeVisible()
  })

  // —— 表单校验与数据保持 ——
  test('表单校验失败后已填数据不丢失', async ({ page }) => {
    await page.goto('/user/create')
    const nameInput = page.getByTestId('form-name')
    await nameInput.fill('Alice')
    await page.getByTestId('submit-btn').click()
    await expect(page.getByText(/必填|required/i).first()).toBeVisible()
    await expect(nameInput).toHaveValue('Alice')
  })

  // —— 防重复提交 ——
  test('快速连续点击提交按钮只触发一次请求', async ({ page }) => {
    await page.goto('/user/create')
    await page.getByTestId('form-name').fill('Test')
    await page.getByTestId('form-email').fill('test@example.com')
    let requestCount = 0
    await page.route('**/api/users', route => {
      requestCount++
      return route.fulfill({ status: 200, body: JSON.stringify({ id: 1 }) })
    })
    const btn = page.getByTestId('submit-btn')
    await btn.click()
    await btn.click()
    await btn.click()
    await page.waitForTimeout(500)
    expect(requestCount).toBe(1)
  })

  // —— 键盘可访问性 ——
  test('键盘操作：Tab 导航 + Enter 提交', async ({ page }) => {
    await page.goto('/user/create')
    await page.getByTestId('form-name').focus()
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
    expect(focused).toBeTruthy()
    await page.getByTestId('form-name').fill('Test')
    await page.getByTestId('form-email').fill('test@example.com')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/成功|success/i)).toBeVisible({ timeout: 5000 })
  })

  // —— 导航一致性 ——
  test('浏览器后退行为符合预期', async ({ page }) => {
    await page.getByTestId('data-table').locator('tbody tr').first().click()
    await page.waitForURL('**/user/**')
    await page.goBack()
    await expect(page).toHaveURL(/\/user\/list/)
    await expect(page.getByTestId('data-table')).toBeVisible()
  })

  // —— 离开保护 ——
  test('编辑中离开页面有未保存提示', async ({ page }) => {
    await page.goto('/user/create')
    await page.getByTestId('form-name').fill('未保存的数据')
    page.on('dialog', async dialog => {
      expect(dialog.message()).toMatch(/未保存|unsaved|离开/i)
      await dialog.dismiss()
    })
    await page.goto('/user/list').catch(() => {})
  })
})
```

> 以上示例覆盖了 6 个测试维度中的 ②UX、③异常边界、⑥性能 部分场景。UI 测试（①）见 5.6，回归测试（⑤）和兼容性测试（④）通过 Playwright 多浏览器 projects 配置 + CI 全量跑测试实现。

### 5.8 视觉回归测试

#### 什么是视觉回归测试

视觉回归测试 = 改代码前截图 → 改代码后截图 → 像素级对比 → 差异超阈值则报错。

它解决的核心问题：**人眼容易漏掉微小的 UI 偏移，而截图对比不会。** 功能测试只验证"能不能用"，视觉回归验证"长得对不对"。

#### 必要性评估：什么时候需要

```
强烈推荐（ROI 高）：
  ✅ 改公共组件（Button / Modal / Table / Layout）→ 影响面广，人工逐页检查成本极高
  ✅ 改全局样式（主题变量 / reset.css / 字体）→ 全站都可能受影响
  ✅ CSS 重构 / 迁移（如 Less → Tailwind、UI 框架升级）→ 改动大且无法靠功能测试覆盖
  ✅ 多主题 / 深浅色模式 → 每次改动要验证 2× 以上状态
  ✅ 响应式布局调整 → 多断点截图对比远比手动缩放靠谱
  ✅ 设计系统 / 组件库项目 → 视觉一致性是核心交付物

可选（按需引入）：
  ☑ 关键业务页面（登录、支付、首页）→ 这些页面的视觉错误直接影响用户信任
  ☑ 交接频繁的项目 → 新人不了解全局影响，截图兜底
  ☑ CI 流水线已成熟，加一步截图对比成本低

通常不需要：
  ✘ 后台管理系统 / 内部工具 → 视觉要求低，功能测试够用
  ✘ 快速原型 / MVP → 迭代太快，基准截图频繁失效，维护成本 > 收益
  ✘ 纯数据展示页（表格内容动态变化）→ 动态数据导致误报率高
  ✘ 项目无 CI → 手动跑截图对比的纪律很难持续
```

#### 典型场景

| 场景 | 风险 | 视觉回归能否发现 |
|------|------|----------------|
| 改了 Button 组件的 padding | 所有使用该组件的页面按钮间距变化 | ✅ 自动捕获 |
| 升级 UI 框架版本（如 Ant Design 4 → 5）| 大量组件默认样式变化 | ✅ 批量对比，快速定位差异 |
| 修改全局 CSS 变量（如 `--spacing-md`）| 全站间距变化 | ✅ 截图覆盖关键页面即可发现 |
| 删了一行 CSS 以为没用 | 某个页面的某个状态下布局塌了 | ✅ 如果该页面在截图范围内 |
| 分页从左对齐改为右对齐 | 改动是否生效 + 其他元素是否被挤压 | ✅ 截图精确到像素 |
| 改了列表接口返回字段 | 列表空白或报错 | ❌ 功能测试的责任，不是视觉回归 |

#### 实施方式

```typescript
// 首次运行生成基准截图，后续自动对比
test('视觉回归 - 用户列表页', async ({ page }) => {
  await page.goto('/user/list')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('user-list-desktop.png', {
    maxDiffPixelRatio: 0.03,  // 允许 3% 误差（字体渲染差异）
    fullPage: true,
  })
})

// 多状态截图：覆盖空数据、加载中、错误状态
test('视觉回归 - 空数据状态', async ({ page }) => {
  await page.route('**/api/users*', route =>
    route.fulfill({ json: { data: [], total: 0 } })
  )
  await page.goto('/user/list')
  await expect(page).toHaveScreenshot('user-list-empty.png')
})

// 多断点截图：桌面 + 移动端
test('视觉回归 - 移动端', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/user/list')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('user-list-mobile.png', { fullPage: true })
})
```

```bash
# 更新基准截图（UI 改动后执行）
npx playwright test --update-snapshots
```

#### 避坑要点

```
常见误报原因及应对：
  - 动态数据（时间戳、随机头像）→ 用 mask 遮盖动态区域或 mock 固定数据
  - 字体加载时序 → waitForLoadState('networkidle') + 适当等待字体渲染
  - 动画未结束 → 测试前禁用动画（CSS: * { animation: none !important; }）
  - 不同 OS 字体渲染差异 → CI 统一用 Linux + Docker，或适当放宽 maxDiffPixelRatio
  - 光标闪烁 → 截图前 blur 所有 input

维护纪律：
  - 基准截图 MUST 纳入 git 版本管理
  - UI 改动后 MUST 运行 --update-snapshots 更新基准，并在 PR 中 review 截图 diff
  - 截图命名 SHOULD 包含页面名 + 状态 + 断点（如 user-list-empty-mobile.png）
  - 不要对所有页面都加截图 → 优先覆盖公共组件使用最多的 5~10 个关键页面
```

### 5.9 性能测试（按需可选）

性能测试不是每次改动的必选项，而是一类"性能哨兵"——在特定场景下按需启用，发现体感问题时深入排查。

#### 何时需要性能测试

```
SHOULD 启用：
  ✅ 首屏加载明显慢（用户可感知的等待 > 3s）
  ✅ 大数据量列表滚动卡顿
  ✅ 改了加载逻辑、路由懒加载、数据预取策略
  ✅ 引入了新的大型依赖（图表库、编辑器、地图等）
  ✅ 用户或测试反馈"页面变慢了"

通常不需要：
  ✘ 日常 UI 调整（改样式、改文案、改布局）
  ✘ 小功能新增（不影响加载链路）
  ✘ 后台管理页面（对性能容忍度高）
```

#### 性能哨兵指标（参考值，非硬 SLA）

以下指标是参考基线，具体阈值应根据项目实际情况、用户设备水平和网络环境调整：

```
感知指标（本地开发环境参考）：
  - 首屏可见：≤ 3s（移动端/弱网 ≤ 5s）
  - 交互响应：≤ 300ms（点击、切换、筛选的感知延迟）
  - 路由跳转：≤ 500ms
  - 无明显白屏 / 闪烁 / 布局抖动（CLS）

稳定性指标：
  - 大数据量列表不卡顿（100+ 行能流畅滚动）
  - 反复操作（打开关闭弹窗 50 次）后内存不持续增长
  - 动画 / 滚动帧率 ≥ 30fps

注意：
  - 以上数值为本地开发环境参考，CI 环境因资源差异可能波动
  - 不建议在 CI 中对毫秒级指标做硬卡口，会导致大量误报
  - 如需严格性能卡口，使用 Lighthouse CI 或 Web Vitals 专业工具
```

#### Playwright 轻量性能哨兵

```typescript
// 轻量哨兵：检测明显的性能退化，不做精确 SLA 卡口
test('首屏加载性能哨兵', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByTestId('main-content').waitFor({ state: 'visible' })

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    }
  })

  // 宽松阈值：只捕捉明显退化（如从 1s 变成 8s），不卡正常波动
  expect(timing.domContentLoaded).toBeLessThan(5000)
})

test('大数据列表滚动不报错', async ({ page }) => {
  await page.route('**/api/list*', route =>
    route.fulfill({
      json: {
        list: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Item ${i}` })),
        total: 200,
      },
    })
  )
  await page.goto('/list')
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)
  expect(errors).toHaveLength(0)
})
```

#### 何时需要专业 Profiling

```
以下情况超出了 Playwright 哨兵的能力，需要专业工具：
  - 需要精确到毫秒的性能基线和趋势跟踪 → Lighthouse CI
  - 需要 Core Web Vitals（LCP / FID / CLS）数据 → Web Vitals + 监控平台
  - 需要定位具体的渲染瓶颈和内存泄漏 → Chrome DevTools Performance / Memory 面板
  - 需要对比不同版本的性能差异 → Lighthouse CI + GitHub Action 集成
```

### 5.10 可访问性测试（可选但推荐）

可访问性（Accessibility / a11y）不仅是合规要求，也是 UX 质量的一部分。

#### 何时需要

```
SHOULD 覆盖：
  ✅ 面向公众的网站（官网、电商、SaaS 产品）
  ✅ 有法规合规要求的项目（政务、金融、教育、医疗）
  ✅ 表单密集型页面（注册、下单、申请流程）
  ✅ 组件库 / 设计系统

MAY 简化覆盖：
  ☑ 内部管理后台（覆盖基础项即可）
  ☑ 快速原型 / MVP

基础项（所有项目 SHOULD 满足）：
  ✅ 语义化标签：用 <button> 而非 <div onClick>，用 <nav>/<main>/<aside> 而非纯 <div>
  ✅ 表单关联：<label> 关联 <input>（for/id 或嵌套），错误提示用 aria-describedby 关联
  ✅ 图片替代文本：<img> 有 alt 属性，装饰性图片 alt=""
  ✅ 焦点可见：Tab 导航时焦点指示器清晰可见，不被 outline: none 移除
  ✅ 颜色对比度：正文 ≥ 4.5:1，大文本 ≥ 3:1（WCAG AA）
  ✅ 键盘可操作：所有交互元素可通过 Tab + Enter/Space 操作

进阶项（面向公众的产品 SHOULD 覆盖）：
  ☑ aria-label / aria-labelledby：为无文字按钮（图标按钮）提供语义
  ☑ 焦点管理：弹窗打开时焦点进入弹窗，关闭时焦点回到触发元素
  ☑ 动态内容通知：用 aria-live 区域通知屏幕阅读器（如 toast、实时搜索结果）
  ☑ reduced motion：@media (prefers-reduced-motion: reduce) 时禁用非必要动画
```

#### Playwright 可访问性测试示例

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('页面无严重可访问性问题', async ({ page }) => {
  await page.goto('/user/create')

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])  // WCAG AA 标准
    .analyze()

  // 只卡 critical 和 serious 级别，minor 记录但不阻断
  const critical = results.violations.filter(v =>
    v.impact === 'critical' || v.impact === 'serious'
  )
  expect(critical).toHaveLength(0)
})

test('表单可访问性', async ({ page }) => {
  await page.goto('/user/create')

  // 所有 input 都有关联的 label
  const inputs = await page.locator('input:not([type="hidden"])').all()
  for (const input of inputs) {
    const id = await input.getAttribute('id')
    const ariaLabel = await input.getAttribute('aria-label')
    const ariaLabelledBy = await input.getAttribute('aria-labelledby')
    const label = id ? await page.locator(`label[for="${id}"]`).count() : 0
    const hasLabel = label > 0 || ariaLabel || ariaLabelledBy
    expect(hasLabel, `input#${id} 缺少 label 关联`).toBeTruthy()
  }
})

test('基础键盘可达性 smoke test', async ({ page }) => {
  await page.goto('/user/create')

  // Tab 可以遍历所有交互元素
  const interactiveElements = await page.locator(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ).count()

  let tabCount = 0
  for (let i = 0; i < interactiveElements + 2; i++) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    if (focused && focused !== 'BODY') tabCount++
  }

  // 至少能 Tab 到交互元素
  expect(tabCount).toBeGreaterThan(0)
})

// 完整键盘场景（弹窗 focus trap、焦点回归）建议在组件测试或专项 a11y 测试中覆盖
```

```bash
npm install -D @axe-core/playwright
```

### 5.11 监控与错误发现（可选但推荐）

#### 改动后必查项

```
每次改动后 SHOULD 检查：
  ✅ 控制台无新增报错（console.error / console.warn 中的异常）
  ✅ 无未捕获的 JS 异常（Uncaught TypeError / ReferenceError 等）
  ✅ 无未处理的 Promise rejection
  ✅ 网络请求无新增 4xx / 5xx 错误
  ✅ 页面加载后无持续报错（定时器、轮询中的重复错误）
```

#### Playwright 自动捕获运行时错误

```typescript
test.describe('运行时错误监控', () => {
  let jsErrors: string[]
  let failedRequests: { url: string; status: number }[]

  test.beforeEach(async ({ page }) => {
    jsErrors = []
    failedRequests = []
    page.on('pageerror', err => jsErrors.push(err.message))
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push({ url: response.url(), status: response.status() })
      }
    })
    page.on('console', msg => {
      if (msg.type() === 'error') jsErrors.push(`console.error: ${msg.text()}`)
    })
  })

  test('页面无 JS 运行时错误', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    expect(jsErrors, '页面存在 JS 运行时错误').toHaveLength(0)
  })

  test('页面无失败的 API 请求', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const unexpected = failedRequests.filter(r =>
      !r.url.includes('favicon') && !r.url.includes('hot-update')
    )
    expect(unexpected, '存在意外的失败请求').toHaveLength(0)
  })
})
```

#### 与错误监控平台集成

```
如果项目已接入错误监控平台（Sentry / Fundebug / 阿里 ARMS 等）：
  - 改动上线后，观察 5~10 分钟内是否有新增错误
  - 对比发布前后的错误趋势，确认无新增异常
  - 重点关注：新增的 TypeError、NetworkError、ChunkLoadError（懒加载失败）

如果项目未接入错误监控：
  - 建议至少在 Playwright 测试中加入上述运行时错误捕获
  - 改动后手动打开浏览器控制台，检查有无红色报错
```

### 5.12 CI/PR 门禁

#### 最小 CI 配置

```yaml
# .github/workflows/test.yml
name: Frontend Quality Gate
on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck --if-present
      - run: npm run test:unit --if-present
      - run: npm run test:component --if-present
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run test:e2e
      - run: npm run build
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

#### PR 合并规则

```
MUST（最低要求）：
  ✅ CI 全绿才能合并（lint + typecheck + unit + component + e2e + build）
  ✅ 测试失败时上传 Playwright 报告，方便排查
  ✅ 至少 1 人 Code Review Approve

SHOULD（推荐）：
  ☑ 视觉回归 snapshot 变更需要在 PR 中 review 截图 diff
  ☑ snapshot 更新（--update-snapshots）只允许 PR 作者操作，reviewer 确认
  ☑ 新增页面/组件的 PR 必须包含对应测试文件
```

#### 视觉回归触发矩阵

| 改动类型 | 触发方式 | 说明 |
|---------|---------|------|
| 改公共组件 / 全局样式 / 主题 token | MUST `toHaveScreenshot()` | 影响范围广，必须自动对比 |
| 改关键页面布局 / 复杂响应式 | MUST `toHaveScreenshot()` | 防止多断点下布局漂移 |
| 修改已有页面局部样式（场景 B） | SHOULD `.baseline/` 人工对比 | 截图改前改后，PR 描述附图 |
| 新增页面（场景 C） | SHOULD `.baseline/` 初始截图存档 | 建立新基线，后续改动有据可查 |
| 纯逻辑/文案改动 | MAY 跳过视觉验证 | 无 UI 变更时可省略 |

#### 测试失败处理流程

```
CI 测试失败后：
  1. 查看 Playwright HTML 报告（下载 CI artifact）
  2. 定位失败原因：
     - 截图 diff → 视觉回归问题 → 确认是预期改动还是 bug
     - 超时 → 接口未 mock / 页面加载异常
     - 元素未找到 → selector 失效 / 页面结构变化
  3. 修复后推送新 commit，CI 自动重跑
  4. MUST NOT 直接跳过测试合并（--no-verify / 关闭 CI check）
```

### 5.13 非 E2E 测试接入模板

#### Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
})
```

#### package.json scripts

```json
{
  "scripts": {
    "test:unit": "vitest run --dir tests/unit",
    "test:component": "vitest run --dir tests/component"
  }
}
```

#### Testing Library 选择（按框架）

| 框架 | Testing Library |
|------|----------------|
| React | @testing-library/react |
| Vue 3 | @vue/test-utils + @testing-library/vue |
| Svelte | @testing-library/svelte |
| Angular | @angular/platform-browser/testing |

#### CI 接入时机

```
- test:unit  → 阶段 4 完成后 CI 必跑
- test:component → 阶段 5 完成后 CI 必跑（仅公共组件库）
```

#### CI 补充配置

```yaml
# 在 .github/workflows/test.yml 的 verify job 中追加
- run: npm run test:unit
- run: npm run test:component --if-present
```
