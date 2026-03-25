# §7 AI 协作规范

> 来源：frontend-ai-coding-best-practices.md §7
> 适用：AI 生成代码的验收、授权矩阵、PR 证据包规范

---

## 7. AI 协作规范

### 7.1 Prompt 工程化管理

```
项目级 prompt 模板 SHOULD 存放在固定位置：
  📁 .prompts/               ← 项目级 prompt 模板目录
     ├── guard-test.md       ← 守护测试生成 prompt
     ├── new-page.md         ← 新页面生成 prompt
     ├── visual-review.md    ← 视觉审查 prompt
     └── code-review.md      ← 代码审查 prompt

规则：
  - prompt 模板纳入 git 版本管理，改动走正常 PR 流程
  - 项目画像唯一事实源 MUST 为 CLAUDE.md 或 AGENTS.md（二选一，默认 CLAUDE.md）
  - prompt 模板 MUST 写成"先读取 CLAUDE.md / AGENTS.md，再执行任务"，而不是复制一份项目画像到模板里
  - 模板中 MUST NOT 包含：硬编码的文件路径、具体业务数据、重复维护的项目画像正文
  - 团队成员 SHOULD 复用项目级模板，避免各自发明 prompt
```

### 7.2 AI 输出验收标准

```
AI 生成的代码 MUST 经过以下验收才能提交：

自动验收（CI 可执行）：
  ✅ lint / format 通过（ESLint + Prettier）
  ✅ TypeScript 类型检查通过（如适用）
  ✅ 现有测试全绿（无回归）
  ✅ 新增代码有对应测试

人工验收（reviewer 检查）：
  ✅ 代码风格与项目现有代码一致（不引入新范式）
  ✅ 无 AI 常见陷阱：
     - 未经确认的 npm 包引入
     - 硬编码的 mock 数据残留在生产代码中
     - 过度抽象（为单一用途创建泛化工具函数）
     - 注释解释"是什么"而非"为什么"
  ✅ 改动范围与需求一致（不多改、不少改）
```

### 7.3 会话产物沉淀

```
AI 会话中产生的有价值信息 SHOULD 沉淀到项目，不随会话消失：

沉淀内容               → 写入位置
──────────────────────────────────────
架构决策和权衡           → memory/decisions.md
踩坑和已知限制           → memory/issues.md
发现的代码模式           → memory/patterns.md
项目上下文（AI 需知）     → CLAUDE.md / AGENTS.md
可复用的 prompt          → .prompts/

维护规则：
  - 只记录"跨会话仍有价值"的信息；一次性调试日志 MUST NOT 写入 memory/
  - 每次 PR 结束前，如出现新决策、新限制、新模式，MUST 同步更新对应文件
  - 每条记录 SHOULD 带日期、关联 PR / issue、适用范围
  - 同一信息只保留一处；项目画像放 CLAUDE.md，不要在 memory/ 重复
  - memory/issues.md 中的问题项 MUST 包含：现象、触发条件、临时规避、最终状态
  - memory/patterns.md 中的模式只有在至少出现 2 次以上时才沉淀，避免把偶发写法当规范
  - 每月或每 10 次 PR 至少清理一次：删除过期项、合并重复项、已解决问题标记 resolved

不需沉淀：
  ❌ 单次调试过程的中间尝试
  ❌ AI 的解释性文字（理解后即丢弃）
  ❌ 临时的 spike / 探索代码
```

### 7.4 AI 变更授权矩阵

以下规则用于消除"默认禁改"与"测试基础设施建设"之间的冲突。原则：业务改动默认只允许改业务代码；基础设施改动只有在任务明确授权时才允许。

| 对象 | 默认规则 | 允许 AI 修改的场景 | 额外要求 |
|------|---------|------------------|---------|
| 认证/鉴权、支付/交易、数据库 migration、`.env*`、密钥 | MUST NOT | 不允许；AI 只可输出分析和 patch 建议，由人工落地 | MUST 走人工审批 |
| CI/CD 配置（`.github/workflows/`、`Jenkinsfile` 等） | 默认 MUST NOT | 仅当任务明确包含"搭建/修复测试门禁、接入 Playwright / lint / typecheck"时，AI MAY 修改 | MUST 拆分为独立 infra PR，触发 CODEOWNERS 审批 |
| `package.json` scripts | MAY | 为接入 `lint`、`typecheck`、`test:e2e` 等脚本时允许 | PR 描述中 MUST 说明新增脚本用途 |
| `package.json` devDependencies | MAY | 为测试、lint、typecheck、格式化等开发工具时允许 | MUST 说明新增原因和版本来源 |
| `package.json` dependencies | 默认 MUST NOT | 仅当需求显式授权"允许新增生产依赖"时 MAY 修改 | MUST 说明引入原因、体积/安全影响，经人工审批 |
| MCP / 本地开发工具配置 | MAY | 为本地开发、测试效率提升时允许 | MUST NOT 写入密钥，MUST NOT 影响生产环境 |

```
补充规则：
  - 若任务未明确授权，AI 对以上灰区文件只输出修改建议，不直接提交改动
  - 涉及 CI/CD 或 dependencies 的改动 SHOULD 与业务改动拆分为独立 PR，避免混审
  - 任何超出本次需求范围的"顺手升级依赖""顺手优化流水线"均 MUST NOT 执行

实施方式：
  - Claude Code：在 CLAUDE.md 中声明禁改路径和授权规则
  - Cursor / Copilot：在 .cursorrules 或项目 README 中声明
  - CI 兜底：对以上路径的改动 MUST 触发 CODEOWNERS 强制审批
```

### 7.5 Review Checklist（AI 生成代码专用）

```
PR Review 时，针对 AI 生成代码额外检查：

□ 是否引入了项目未使用的新依赖？
□ 是否符合项目现有的代码组织方式（目录结构、命名约定）？
□ 是否有"看起来对但实际多余"的代码（防御性过度、空 catch、无用 try-finally）？
□ 是否有 AI 幻觉痕迹（不存在的 API、错误的参数顺序、编造的配置项）？
□ 是否复用了项目已有的工具函数/组件，而非重新实现？
□ 改动范围是否精确匹配需求，无附带"顺手优化"？
```

### 7.6 AI PR 证据包

AI 生成代码的 PR MUST 附带证据包；缺任一项，reviewer 可直接退回。

```
PR 描述中至少包含以下内容：

1. 需求摘要
   - 本次改了什么
   - 本次明确不改什么

2. 改动文件清单
   - 按模块列出主要文件
   - 标出是否涉及公共组件 / 公共样式 / 路由 / 配置

3. 自动化验证结果
   - lint：命令 + 结果
   - typecheck：命令 + 结果（或标注不适用）
   - tests：命令 + 结果
   - 如有失败后修复，说明根因和修复方式

4. 视觉证据
   - 改前截图
   - 改后截图
   - 如有 snapshot diff，附变更说明

5. 回归影响范围
   - 受影响的公共能力
   - 已抽查页面或流程列表

6. 配置与依赖变更（如有）
   - 新增/升级依赖及原因
   - package.json scripts、CI、hook、MCP 配置改动及原因

7. 未覆盖项与剩余风险
   - 本次未验证但可能受影响的场景
   - 建议后续补充的验证项
```
