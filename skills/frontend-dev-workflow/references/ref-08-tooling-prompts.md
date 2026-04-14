# §10 工具配置参考 + 附录 A Prompt 模板 + 附录 B 渐进式提取组件

> 适用：MCP 配置、Hooks、playwright.config.ts、6 个完整 Prompt 模板、组件提取原则

---

## 10. 工具配置参考

### 10.1 推荐 MCP 配置

**MCP Servers**（写入 `~/.claude/settings.json` 的 `mcpServers` 字段）：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

**Claude Code 插件 + 技能**（Figma 设计还原完整工具链）：

安装命令：
```bash
# 安装 Figma 官方插件（提供 MCP 工具）
claude plugin install figma@claude-plugins-official
```

安装后 `~/.claude/settings.json` 中会自动写入：
```json
{
  "enabledPlugins": {
    "figma@claude-plugins-official": true
  }
}
```

> **Figma 插件认证**：首次使用在 Claude Code 中执行 `/mcp` 命令，在弹出的面板中完成 Figma OAuth 认证。认证成功后显示 `Authentication successful. Connected to plugin:figma:figma.`，之后自动连接，无需重复认证。
>
> 插件提供的核心工具：
> - `get_design_context` — 获取节点的布局、排版、色值、组件结构、间距等设计上下文
> - `get_screenshot` — 获取节点截图，作为还原验证的 source of truth
> - `get_metadata` — 获取文件/节点元数据
> - `get_code_connect_map` / `get_code_connect_suggestions` — 查询 Code Connect 映射关系
> - `generate_figma_design` — 将代码/描述写回 Figma（反向同步）
>
> 配合 `/figma:figma-implement-design` 官方技能使用，实现设计到代码的像素级还原。

### 10.2 可选 Hooks 配置（默认不启用自动修复）

> 原则：默认只做只读检查，不做会改文件内容的自动修复。`lint --fix`、格式化、排序 import 等会产生静默改动的命令 MUST 由开发者手动执行，不建议放在团队默认 hook 中。

```jsonc
// ~/.claude/settings.json (部分) — 只读检查版（推荐）
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

如需自动修复，使用手动命令而非 hook：
```bash
npm run lint -- --fix
```

### 10.3 playwright.config.ts 推荐配置

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',  // 按实际端口修改
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],

  webServer: {
    command: 'npm run dev',  // 按实际启动命令修改
    port: 5173,              // 按实际端口修改
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 附录 A：Prompt 模板速查

### A.1 项目画像生成

```
读取 package.json、路由配置、样式文件、API 层代码
输出项目技术栈和组件结构画像
```

### A.2 存量页面修改（测试先行）

```
按“截图现状 → Read代码 → 写守护测试 → 精确描述改动 → 执行修改 → 跑测试与截图对比 → 补充新测试”的顺序执行。
如果本次修改涉及逻辑层、公共组件、全局样式、依赖或配置，改代码前先展示以下确认清单，并等待用户明确确认：
1. 本次会修改的所有文件
2. 逻辑层是否有改动，如有说明理由
3. 所有动态样式绑定（条件 class / 动态 style），确认不会丢失
4. 改动是否影响公共组件或全局样式
5. 是否涉及依赖或配置变更，如有说明理由
若仅为低风险 UI 调整，先展示最小计划后可直接继续。
```

### A.3 新增页面模板

```markdown
新增页面任务：
- 页面名：[ ]
- 路由：[ ]
- 需求来源：[ ]

约束条件（必须按以下 4 步门禁执行，任一步未确认都不进入下一步）：
1. 需求确认：先整理页面功能、核心交互、768px 断点要求，等待用户确认后才进入下一步。
2. 复用清单确认：列出相似页面与可复用组件，等待用户确认后才进入下一步。
3. 测试清单确认：先列 E2E 测试清单，等待用户确认后再写测试，测试初始应为失败。
4. 文件清单确认：列出本次新增或修改的文件，等待用户确认后再生成页面代码；所有交互元素加 data-testid。
完成以上 4 步后，再跑测试直到全绿，并做视觉验证与代码审查。
```

### A.4 视觉审查

```
[截图]
检查间距、对齐、字体层级、颜色对比度、可点击区域、响应式是否正常
```

### A.5 写守护测试（改代码前）

> 覆盖维度选择规则见 **ref-04-testing.md §5.5**，本模板可直接复用。

```
为 [页面路径] 生成 Playwright E2E 守护测试
目标：锁住现有行为，不是验证新需求
按改动影响范围选择覆盖维度（见 ref-04-testing.md §5.5 详细规则）：
① UI：关键元素可见、布局正确、响应式无溢出 → 改 UI/样式时必选
② UX：核心交互流程、操作反馈 → 改交互逻辑时必选
③ 异常边界：空数据、接口报错、未登录不白屏 → 改业务逻辑时必选
④ 兼容性：按 L1/L2/L3 分层策略选择 → 改全局样式/公共组件时必选
⑤ 回归：涉及公共组件则抽查其他页面 → 改公共代码时必选
⑥ 性能：首屏无卡顿白屏 → 可选（见 ref-04-testing.md §5.9）
在模板中补 data-testid（单独提交）
跑一次确认全绿，再开始改代码
```

### A.6 UI 库文档查询

```
use context7 查阅 [UI 库名] [版本号] 的 [组件名] 文档
重点看：可用 prop、事件、插槽/slot、主题变量
```

---

## 附录 B：从存量页面渐进式提取组件

当你改了 3+ 个存量页面后，会发现重复模式。这时候可以提取公共组件：

```
分析以下页面中的重复 UI 模式：
- [页面1路径]
- [页面2路径]
- [页面3路径]

找出重复度最高的 UI 结构（如：搜索栏 + 表格 + 分页组合）
提取为公共组件，但不改动已有页面
新页面优先使用提取后的公共组件
```

原则：
- **先标记后提取**：发现重复时先在 `CLAUDE.md` 记录"待提取模式"，积累 3 次以上再提取
- **不回改存量**：提取组件后，已有页面保持不动；新页面和后续改动才使用新组件
- **渐进替换**：当存量页面因为其他需求需要改动时，顺手替换为新组件
