# §5 完整开发工作流（Full Development Workflow）

> 适用：Phase 0~10 完整流程，含 ceo-review 模板、spec 模板

---

## Section 5：完整开发工作流（Full Development Workflow）

### 5.1 阶段主线与工具介入原则

- AI Coding Workflow 以 `Phase 0~10/5B` 为唯一主线；`spec-kit`、agent 自身承载的评审/QA/发布能力、外部代理编排能力、Context7 MCP、`gitleaks`、`memory` 等都按阶段介入
- `spec-kit` 主要提供规格、方案、任务、分析、实施骨架
- 方向评审、架构评审、审查、QA、发布、复盘由 agent 自身或专门子任务承载，不依赖特定外部工具
- 外部代理编排能力主要用于并行实施或多模型交叉复核
- Context7 优先通过 MCP 自动核对官方文档；无 MCP 时降级为 `use context7`/library ID/官方文档，避免在方案或实施阶段产生 API 幻觉
- `gitleaks`、测试、CI、`memory/*` 等属于验证与沉淀能力，同样是工作流组成部分

**阶段内能力选择**：

| 情况 | 介入能力 |
|------|--------|
| 任务列表明确、完整功能、自动执行 | `/speckit.implement` |
| 需要专业判断（复杂架构、安全、性能） | `plan.md`/`arch-review.md` 明确结论；必要时用外部代理编排能力复核 |
| 需并行调用 Codex/Gemini 分工实施 | `/team`、`omc team N:codex "..."` 或 `/omc-teams` 兼容入口 |
| 需多模型交叉复核实现方案 | `/ccg`、`/ask <model>` 或 `omc ask <model> ...` |
| 需核对陌生库、新版本 SDK、官方 API | 优先使用 Context7 MCP 自动文档查验；无 MCP 时降级为 `use context7`/library ID/官方文档 |

**降级规则**：本文件中的 `/review`、`/qa`、`/ship` 对应的职责默认由 agent 自身或专注子任务原生完成（见 `ref-02 § 10.2`）；IF 当前环境确实缺乏执行这些任务的能力，THEN 分别降级为人工审查、手工测试或 CI 验证、宿主常规发布流程。

**验证纪律层**：阶段顺序、完成必验证规则内置于本技能（见 `ref-02 § 10.5`），任何有能力的 agent 原生遵守，不依赖任何外部插件。阶段顺序与验证铁律见 `ref-09-verification-gate.md`；各 Phase 退出前须满足该文件 § 13.4 纪律层要求。

### 前端交互需求附加规则

IF 任何 UI 可见变更（非纯逻辑/API 变更），THEN 视为前端交互需求，并统一遵守：
- Phase 2 MUST 检查项目级 `DESIGN.md` 是否存在；IF 涉及前端 UI/UX 且不存在，THEN 生成 `DESIGN.md`，遵循 Google Stitch DESIGN.md 基础格式；本工作流追加以下章节要求：`Responsive Behavior`/`Iteration Guide`。完成后 SHOULD 运行 `npx @google/design.md lint DESIGN.md` 验证。IF 存在，THEN 直接引用。
  DESIGN.md 格式迭代参考：https://github.com/VoltAgent/awesome-design-md（含 73 个网站示例）。
- Phase 2 MUST 产出 `interaction-design.md`，按设计基线完整度分三级 gate（见下方「设计基线分级 gate」）。设计基线记录到「设计引用」章节。`design-system-context.md` MAY 作为独立文件存在，也 MAY 降级为 `interaction-design.md` 中的「Design System Context」章节；若 feature 仅引用 DESIGN.md 中 ≤5 个 token，SHOULD 直接在 `interaction-design.md` 中列出 token 引用表，不必单独建文件。
- 所有前端设计文档与设计基线 MUST 在 Phase 2/spec 阶段完成并锁定；Phase 3+ 只允许引用、拆解、实施、验证，MUST NOT 新建或补写 `DESIGN.md`、`interaction-design.md`、`design-system-context.md` 或设计引用。
- 在线设计稿记录长久分享链接；离线文件记录文件名与路径；临时 `specs/<feature-id>/design-assets/` MUST 加入 `.gitignore`。
- IF 无在线设计稿、离线设计文件、截图、原型说明或线框图，THEN 按「设计基线分级 gate」判断：L3 级允许以文字需求锁定 spec.md；进入 Phase 6 前若仍缺少 L2 级以上设计基线，MUST 返回 Phase 2 补齐并重新锁定规格。
- Phase 3 的 `plan.md` MUST 引用 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节），说明页面模块、交互状态、接口依赖、组件复用边界与设计系统规则适用范围。
- IF 设计复杂度较高、评审风险较高、交互边界不清、涉及多页面关键路径或核心转化路径，THEN SHOULD 追加一次结构化设计评审（由 agent 自身或专门子任务完成）。
- Phase 4 的前端任务 MUST 基于 `interaction-design.md` 拆解，并完成组件库扫描标注。前端任务 MUST 包含设计还原验证任务，明确截图/人工验收/视觉对比证据。
- Phase 5 分析 MUST 纳入 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）；Phase 6 实施 MUST 同时以 `spec.md`、`interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）、`plan.md`、`tasks.md` 为输入；IF 涉及前端实施，THEN Agent MUST 将 `DESIGN.md` 中的 design tokens 映射为 CSS 变量或 Tailwind 配置，MUST NOT 在组件中硬编码颜色/字体/间距值。Phase 8 QA MUST 对照 `interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）与设计基线。
- Phase 8 QA 报告 MUST 标注对照的设计引用、关键页面截图、差异结论；若存在偏差，MUST 标注是否阻断发布。若设计效果与目标基线不一致，MUST 返回 Phase 6 修复；若基线缺失或错误，返回 Phase 2。
- 页面实现、组件开发、视觉还原只在 Phase 6 执行，MUST NOT 在需求阶段提前落代码。

### 设计基线分级 gate（L1/L2/L3）

IF 涉及前端交互需求，THEN 按以下三级判断是否可锁定 `spec.md`：

| 级别 | 条件 | interaction-design.md 最低要求 | spec.md 锁定 | 进入 Phase 6 条件 |
|------|------|-------------------------------|-------------|-------------------|
| **L1 完整设计** | 有 Figma/蓝湖等在线设计稿，或 PDF/截图等离线设计文件 | 完整填写（页面结构 + 交互流转 + 状态矩阵 + 响应式适配 + 可访问性），「设计引用」章节记录设计稿链接或文件路径 | 可直接锁定 | 直接进入 |
| **L2 文字+草图** | 有文字需求描述 + 草图/白板照片/线框图/原型说明 | 填写页面结构 + 交互流转 + 状态矩阵，「设计引用」标注「无正式设计稿，基于文字需求」 | 可直接锁定 | 直接进入，MAY 要求补充视觉参考 |
| **L3 纯文字** | 仅有文字需求，无任何可视化参考 | 填写页面结构 + 状态矩阵 | 可锁定，但 `spec.md` MUST 标注「视觉细节待设计确认」 | 进入前若仍缺少 L2 级以上设计基线，MUST 返回 Phase 2 补齐并重新锁定规格 |

> Agent MUST 在 Phase 2 结束时判定 design-level（L1/L2/L3）并写入 `interaction-design.md` 头部。

### interaction-design.md 最小模板

**模板 A：页面级交互设计**（适用于完整页面/视图）

```md
# Interaction Design

> design-level: L1 | L2 | L3

## 1. 设计引用
- 设计稿链接/文件路径：（L1 必填；L2/L3 标注「无正式设计稿」）
- 设计工具：
- 最后更新：
- 责任人：

## 2. 页面结构
- 页面路径/路由：
- 布局描述（ASCII 或文字）：
- 组件树：
  - 页面容器
    - 导航区
    - 主内容区
      - 列表/表格区
      - 操作按钮区
    - 页脚区

## 3. 交互流转
- 主流程（用户操作路径，按步骤描述）：
  1. 用户进入页面 →
  2. … →
  3. … →
- 分支流程（异常、取消、中断）：
- 动画/过渡需求：

## 4. 状态矩阵
| 组件/区域 | default | loading | empty | error | success | disabled |
|----------|---------|---------|-------|-------|---------|----------|
| 页面整体 | ... | ... | ... | ... | ... | ... |
| 列表区 | ... | ... | ... | ... | ... | ... |
| 表单区 | ... | ... | — | ... | ... | ... |

## 5. 响应式适配（L1 必填）
- 断点策略：mobile (<768)/tablet (768-1024)/desktop (>1024)
- 各断点关键差异：

## 6. 可访问性（L1 必填）
- 键盘导航路径：
- 屏幕阅读器标注：
- 色彩对比度检查：

## 7. Design System Context
- 引用方式：独立 `design-system-context.md`/本章节内联
- DESIGN.md token 引用表：
  | 用途 | token | 使用位置 |
  |------|-------|----------|
  | 主按钮背景 | `{components.button-primary.backgroundColor}` | ... |
- 本功能适用的组件规则：
- 不适用或禁止使用的样式：
```

**模板 B：组件级交互设计**（适用于封装组件、基础库，或页面中核心复杂组件的单独设计文档。节选并改写模板 A 中的对应章节，其余章节同模板 A。）

```md
# Interaction Design — <ComponentName>

> design-level: L1 | L2 | L3

## 1. 设计引用（同模板 A）

## 2. 组件概述
- 组件名称：
- 复用基础（第三方库组件名 / 从零实现）：
- 交互模式：受控（外部管理状态）| 非受控（组件自管理）| 纯展示

## 3. 状态机
IF 组件存在多状态流转（如加载→空→数据→错误→重试），THEN 绘制纯文字状态机图：
```
   ┌──────────┐   触发条件    ┌──────────┐
   │  状态 A   │────────────▶│  状态 B   │
   └──────────┘              └──────────┘
       │                          │
       │ 触发条件                  │ 触发条件
       ▼                          ▼
   ┌──────────┐              ┌──────────┐
   │  状态 C   │              │  状态 D   │
   └──────────┘              └──────────┘
```

## 4. 状态与实现映射
| 组件状态 | 触发条件/参数组合 | 实现层行为 | 视觉表现 |
|---------|-------------------|-----------|---------|
| 状态 A | `paramX=value` | — | 描述 |
| 状态 B | `paramY=true` | 加载指示 | 骨架屏/loading 遮罩 |

## 5. 设计令牌与组件映射
| 令牌类别 | 组件使用场景 |
|---------|-------------|
| colors (brand-primary) | 按钮背景、分页高亮、激活态 |
| colors (text-primary) | 标题文字 |
| spacing | 元素间距 |
| typography | 各级字号引用 |
```

> 模板 B 状态机中的"状态"既可以是组件内部状态（加载/空/错误），也可以是用户交互触发的前端界面变动（收起/展开、选中/取消、编辑/预览）。状态机图统一使用纯文本 Unicode 箭头表述，避免嵌入不可移植图片。

### 5.2 全流程（Phase 0 ~ Phase 10）

---

#### Phase 0：项目初始化

**进入条件**：WHEN 项目为全新项目，且尚未执行过 `specify init`。

**必做动作**：
1. 执行 `specify init . --integration <agent-key>`（分布式团队可加 `--branch-numbering timestamp` 避免分支编号冲突；Codex CLI 常用 `--integration codex --integration-options="--skills"`），初始化 `.specify/` 目录
2. 执行 `/speckit.constitution`，生成 `constitution.md`
3. 补充 `AGENTS.md`/`CLAUDE.md`，写入项目规范（SHOULD 包含项目验证命令，供 `ref-09` Gate Function 使用）
4. 验证纪律内置生效，无需单独安装或检查外部插件（详见 `ref-02-tool-stack.md § 10.5`）

**产出物**：`.specify/memory/constitution.md`、`AGENTS.md`（或 `CLAUDE.md`）

**constitution.md 最小模板**：

```md
# <项目名> Constitution

## Core Principles

### I. <第一条原则>

<原则描述，说明 Why、What、How。>

#### <子规则或细则>
<可选的执行细则，如命名规范、标注格式等>

### II. <第二条原则>

<原则描述>

### III. <后续原则>

<原则描述>

## 项目约束

- <项目级别硬约束 1>
- <项目级别硬约束 2>
- <通用安全约束，如涉及客户数据/密钥/生产发布时 MUST 人工确认>

## 开发流程与质量门禁

- <Phase 2 需求规格要求>
- <Phase 3 技术方案要求>
- <Phase 4 任务拆解要求>
- <Phase 6 实施要求>
- <Phase 7-8 审查与 QA 要求>

## Governance

本 Constitution 优先于临时口头约定和未同步的历史草稿。修改原则、范围边界或质量门禁时，MUST 同步更新受影响的 spec-kit 模板、项目说明和当前活跃规格产物。

版本策略：
- MAJOR：删除或重定义核心原则、改变治理优先级、放宽已声明的强制门禁。
- MINOR：新增原则、章节或显著扩展治理要求。
- PATCH：措辞澄清、错别字、格式修正或不改变语义的说明补充。

合规检查：
- 每次进入 plan、tasks、implement、review 或 QA 前，负责人 MUST 检查当前工作是否违反 Constitution。
- 如果确需例外，MUST 在对应规格、计划或评审记录中写明原因、影响和替代验证方式。
- 自动化代理生成内容视为待确认产物，最终接受与发布责任由人工承担。

**Version**: 0.1.0 | **Ratified**: <日期> | **Last Amended**: <日期>
```

> 原则条数建议 3~5 条，过多则失去约束力。第一条原则优先回答"项目用什么语言/术语撰写"的共识问题。`/speckit.constitution` 生成的初稿会覆盖此模板，项目可按需手工调整。
>
> 常用原则话题参考：
>
> **I. 中文优先与术语稳定**
>
> 项目所有文档 MUST 默认使用中文撰写。仅在以下场景 SHOULD 保留英文：代码标识、命令、包名、文件路径、框架名称、API 名称、行业通用缩写和不可自然翻译的技术术语。中英文混用时，术语含义 MUST 保持稳定，同一概念不得在同一文档中反复改名。
>
> 英文名词 MUST 在首次出现时追加中文标注，格式为 `术语（释义）`。覆盖文档标题、章节标题、段落正文、列表项、表格说明；代码块内的标识符除外。同一节内首次标注后，后续再次出现可省略；跨节首次出现仍需标注。
>
> 示例对照：
>
> | ✅ 正确 | ❌ 错误 |
> |---------|---------|
> | MVP（最小可行产品） | MVP |
> | Baseline（基线） | Baseline |
> | MUST（必须） | MUST |
> | Stakeholder（干系人） | Stakeholder |
> | Edge Cases（边界情况） | Edge Cases |
> | API（应用程序接口） | API |
>
> 若 `spec.md`、`interaction-design.md`、`plan.md` 等文档中出现大量未标注的英文名词，则视为不满足本条原则，MUST 返回补充中文标注。

**退出条件**：上述四项均已完成。

---

#### Phase 1：产品方向

**定位**：本 Phase 是方向决策门，不是需求规格编写阶段。其目标是验证"这件事是否值得做、应做哪一版、MVP 边界在哪里"，而不是展开实现细节。

**进入条件**：WHEN 满足以下任一条件时，MUST 进入本 Phase：
- 0→1 新项目，且目标用户、核心问题、MVP 边界仍不清楚
- 新功能需求模糊，存在多个可行方向或明显范围膨胀风险
- 新功能会显著影响架构、商业目标、关键用户路径

IF 满足以下条件，THEN MAY 以简版执行本 Phase：
- 新项目方向已被合同、上级决策、既有 PRD、客户需求等外部约束锁定
- 增量功能方向清晰，仅需确认边界和不做事项

IF 任务为小功能或 bug fix，THEN 可跳过本 Phase。

**必做动作**：
1. IF 问题定义仍模糊、需要重构需求表述，THEN 先做结构化访谈式规划，梳理问题空间
2. 做结构化产品方向评审，寻找最优版本，压力测试需求合理性
3. 明确记录以下最小结论：目标用户、核心问题、MVP 边界、不做什么、成功指标、是否进入 `spec`
4. IF 为简版执行，THEN 仍 MUST 记录"方向已锁定的依据"与"本次不再讨论的范围"
5. 将评审结论写入 `specs/<feature-id>/ceo-review.md`

**产出物**：`specs/<feature-id>/ceo-review.md`

**退出条件**：产品方向已确认，MVP 边界清晰，且 `specs/<feature-id>/ceo-review.md` 已写入。

> `ceo-review.md` 是决策文档。它负责筛方向、定范围、砍掉不必要方案；它 MAY 包含功能背景与目标，但 MUST NOT 替代 `spec.md` 去承载完整需求细节。

**最小模板**：

```md
# CEO Review

## 1. 背景与触发
一句话说明为什么会有这个需求。

## 2. 目标用户
这次主要服务谁，不超过 3 类。

## 3. 核心问题
用户当前最痛的点是什么。

## 4. 为什么现在做
为什么是现在，不是以后。

## 5. 备选方案
列 2~3 个方向，简述优缺点。

## 6. 推荐方向
本次建议选哪条路，为什么。

## 7. MVP 边界
第一版只做什么。

## 8. 明确不做什么
本阶段明确排除的范围。

## 9. 方向锁定依据（简版 Phase 1）
IF 本 ceo-review 是简版执行（方向已被外部约束锁定），THEN 在此说明方向已锁定的原因与本次不再讨论的范围。非简版执行 MAY 跳过或注明"方向待定"。

## 10. 成功指标
怎么判断这件事值得继续投。

## 11. 风险与前提假设
当前结论依赖哪些假设成立。

## 12. 技术基线锁定（recommended）
IF 本次决策涉及技术选型、依赖版本、运行环境等基线锁定，THEN 在此列出已确认的基线项，避免后续阶段反复争议：
- 开发语言/框架：
- 关键依赖版本：
- 运行环境要求：
- 其他基线约束：

## 13. 已识别风险与应对
| 风险 | 级别 | 应对措施 |
|------|------|---------|
| 如技术选型风险 | P0/P1/P2 | 方案验证/原型确认 |
| 如单点依赖风险 | P1 | 安排 backup 或文档沉淀 |

## 14. 结论
- 决策：进入 `spec`/暂缓/放弃
- feature-id：
- 负责人：
- 日期：
```

**使用规则**：

- `ceo-review.md` MUST 输出：推荐方向、MVP 边界、非目标范围、是否进入 `spec`
- 简版执行或方向已被外部锁定时 MUST 填写"方向锁定依据"章节

---

#### Phase 2：需求规格

**定位**：本 Phase 是规格锁定阶段，不负责探索产品方向。它的目标是把已成立的方向转成可执行、可澄清、可验收的需求规格。

**进入条件**：WHEN 任务类型为小功能及以上。

IF 方向尚未确认、MVP 边界仍在摇摆、存在"先做哪个版本"争议，THEN 代理 MUST 返回 Phase 1，而不是直接写 `spec.md`。

**必做动作**：
1. 以 `ceo-review.md` 结论为输入执行 `/speckit.specify "<功能描述>"`，生成 `spec.md` 初稿
2. 执行 `/speckit.clarify`，澄清模糊点，结果**追加**写入 `spec.md`（不覆盖已有内容）
3. IF 仍有模糊点，THEN **重复执行** `/speckit.clarify`，直到规格无歧义为止
4. 推荐在 `plan` 前执行 `/speckit.checklist`，生成需求质量 checklist，并根据 checklist 补齐规格中的完整性、清晰度、一致性问题；高风险或高歧义需求 MUST 执行
5. IF 已执行 checklist 且仍暴露缺口，THEN MUST 回到 `spec.md` 补齐后再次执行 `/speckit.checklist`，直到问题闭环
6. MUST NOT 通过重复执行 `/speckit.specify` 来补充规格——该命令会**覆盖**整个 `spec.md`，仅在初稿方向完全跑偏需要推倒重来时才使用
7. 将用户故事、功能边界、验收标准、约束条件写全
7a. IF 涉及前端交互需求，THEN MUST 检查项目级 `DESIGN.md` 是否存在；IF 不存在，THEN 生成 `DESIGN.md`，遵循 Google Stitch DESIGN.md 基础格式；本工作流追加以下章节要求：`Responsive Behavior`/`Iteration Guide`；完成后 SHOULD 运行 `npx @google/design.md lint DESIGN.md` 验证。IF 存在，THEN 直接引用。为当前 feature 生成 `specs/<feature-id>/design-system-context.md`（MAY 降级为 `interaction-design.md` 中的 Design System Context 章节）。
8. IF 涉及前端交互需求，THEN 按「前端交互需求附加规则」与「设计基线分级 gate」判定设计级别（L1/L2/L3），MUST 产出 `interaction-design.md`，并按对应级别填写模板章节
8a. **参照物推荐**：IF 存在可参照的已有实现（本项目的、其他项目的、甚至不同语言的代码），THEN 建议直接提供给 AI 作为规格参照。一段 Rust 代码可以作为 TypeScript 项目的参考——AI 看得懂就行。将参照物来源记录到 `spec.md` 的「约束与依赖」章节中，方便后续阶段追溯设计意图。
9. 规格确认后锁定

**产出物**：`specs/<feature-id>/spec.md`、`specs/<feature-id>/checklists/`、`specs/<feature-id>/interaction-design.md`（如适用）、`specs/<feature-id>/design-system-context.md`（如适用）

**退出条件**：规格无歧义，checklist 已生成并闭环，规格已锁定；`spec.md` 已包含边界情况章节（IF 存在边界场景）与关键实体章节（IF 涉及多业务概念）；若涉及前端交互需求，则 Phase 2 对应的 design-level（L1/L2/L3）已判定，`interaction-design.md` 已按对应级别填写，`design-system-context.md`（或降级后的 Design System Context 章节）与设计基线已就位。

> IF 后续阶段发现规格有误，THEN 代理 MUST 返回本 Phase 正式修改，MUST NOT 在实施阶段绕过规格直接改代码。
>
> `spec.md` 是规格文档。它 MUST 继承 `ceo-review.md` 的方向结论，但 SHOULD 避免重复展开战略讨论；重点应放在"具体做什么、边界在哪里、怎样算完成"。

**最小模板**：

```md
# Spec

> **recommended**: IF 功能涉及多处修改或跨团队协作，THEN 建议在 spec.md 头部增加元信息块，包含 feature-id、状态（draft/clarified/locked）、输入来源，方便后续文档建立关联。

## 1. 功能概述
一句话说明这次要做什么。

## 2. 来源决策
继承自哪个 `ceo-review.md`，摘要是什么。

## 3. 用户故事
- 作为……
- 我希望……
- 以便……

## 4. 功能范围
这次具体包含哪些能力。

## 5. 非目标范围
明确这次不做什么。

## 6. 关键流程
按步骤描述主流程和必要分支。

## 7. 边界情况（Edge Cases）
IF 功能存在常见误操作、极端输入（空/超大/并发）、环境依赖故障等边界场景，THEN 将具体边界案例逐条列出，供后续阶段覆盖。

## 8. 验收标准
使用 Given/When/Then 格式，每条 MUST 可测试、可验证。
- Given …, When …, Then …
- Given …, When …, Then …

> **recommended**: IF 需求数量较多（如 ≥ 8 条），THEN SUGGEST 为每条验收标准分配编号（如 AC-001），方便 checklists 逐项勾选追踪。

## 9. UI/UX 设计规范（IF 涉及用户界面）
### 9.1 设计交付物
- 页面结构图（线框图/布局图）
- 关键流转图（用户操作路径）
- 组件复用说明（优先复用现有设计系统组件，MUST NOT 随意发明样式）
- 可视化设计来源（设计文件、分享链接、截图、原型说明）

### 9.2 状态矩阵
每个页面/组件 MUST 覆盖以下状态：
| 状态 | 说明 |
|------|------|
| default | 默认态 |
| loading | 加载中 |
| empty | 空数据 |
| error | 错误态 |
| success | 成功态 |
| disabled | 不可用态 |

### 9.2.1 数据流与状态归属（P1-9）
IF 功能涉及跨组件或跨页面的共享数据，THEN MUST 在规格锁定前明确以下状态归属，写入本节：

| 状态/数据 | 归属层 | 说明 |
|----------|--------|------|
| 仅当前组件使用 | **Local**（组件本地状态） | 无需跨组件共享 |
| 跨页面/跨组件共享 | **Global**（应用级共享状态） | 需定义 store 模块名 |
| 来自接口、需缓存/同步 | **Server State**（外部数据同步） | 需定义缓存键/同步标识与失效策略 |

**填写规则**：
- 每类"跨组件共享的数据"对应一行，说明归属层与原因
- IF 所有状态均为组件私有，THEN 本节可标注"全部 Local，无跨组件共享状态"并跳过
- Phase 6 实施时，AI MUST 以本节定义为准，MUST NOT 自行决定状态归属层

### 9.3 响应式规则
定义断点与适配策略（mobile/tablet/desktop）。

### 9.4 可访问性基线
- WCAG 2.1 AA 合规
- 键盘可达、焦点态可见
- 语义化 HTML 标签
- 颜色对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大文本）

## 10. 关键实体（Key Entities）
IF 功能涉及多个业务概念、组件或数据对象，THEN 列出关键实体及简短定义，帮助后续阶段建立统一术语。
- **实体 A**: 定义
- **实体 B**: 定义

## 11. 非功能需求
| 维度 | 要求 |
|------|------|
| 性能 | 页面加载/API 响应时间目标 |
| 兼容性 | 浏览器、设备、操作系统范围 |
| 安全 | 认证、授权、数据加密、输入校验 |
| 隐私合规 | 数据收集、存储、传输合规要求 |
| 可靠性 | 可用性目标、降级策略 |

## 12. 约束与依赖
技术、业务、外部系统、合规等约束。

## 13. 待澄清问题
还没确认、需要补充的问题。

## 14. 锁定记录
- 状态：draft/clarified/locked
- feature-id：
- 负责人：
- 日期：
```

**使用规则**：

- `spec.md` MUST 继承 `ceo-review.md` 的方向结论，MUST NOT 自行扩 scope
- 若发现方向争议，代理 MUST 返回 Phase 1
- IF 功能涉及用户界面，THEN 需求规格 MUST 填写 `spec.md` 中的「9. UI/UX 设计规范」章节（含设计交付物、状态矩阵、响应式规则、可访问性基线），作为规格锁定的必要条件。MUST NOT 将 UI/UX 设计推迟到实施阶段临场发挥。
- IF 功能涉及前端交互需求，THEN MUST 遵守「前端交互需求附加规则」。
- `spec.md` 中的「11. 非功能需求」章节 SHOULD 根据功能性质填写，涉及用户可感知性能、安全、合规的功能 MUST 填写。

---

#### Phase 3：技术方案

**进入条件**：WHEN Phase 2 已完成，规格已锁定。适用范围：小功能及以上。

**必做动作**：
1. IF 涉及陌生库、新版本 SDK、或近期变化的 API，THEN 优先使用 Context7 MCP 自动文档查验；无 MCP 时降级为 `use context7`/library ID/官方文档，防 API 幻觉，再确定方案
2. 执行 `/speckit.plan "<技术栈>"`，生成 `plan.md`、`research.md`、`data-model.md`、`contracts/`
3. IF 涉及前端交互需求，THEN `plan.md` MUST 引用 Phase 2 已锁定的 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）作为前端实现输入，并按触发条件决定是否追加结构化设计评审；若任一设计文档或设计基线缺失，MUST 返回 Phase 2，MUST NOT 在本阶段补写
4. 做结构化架构评审，深度审查图表、边界条件、失败模式
5. 将架构评审结论写入 `specs/<feature-id>/arch-review.md`
6. 将架构决策追加写入 `memory/decisions.md`
7. **[P0-3 DB 迁移]** IF 本次改动涉及数据库 schema 变更（新增/修改/删除表、字段、索引、约束），THEN `plan.md` MUST 包含迁移方案说明，至少覆盖：
   - 兼容性分类：向前兼容（可先上应用再跑迁移）/ 需协调上线顺序
   - 上线顺序：migration 脚本与应用部署的先后关系
   - 回滚条件与回滚脚本（是否可逆）
   - staging dry-run 要求（Phase 9 前必须先在 staging 跑一次）
8. **[P0-4 API 契约]** IF 本次改动新增、修改或删除对外 API（REST/GraphQL/gRPC/消息契约），THEN MUST 先更新 `specs/<feature-id>/contracts/`，再写实现代码；MUST NOT 先改实现再补契约；breaking change MUST 在 `arch-review.md` 中标注并经过 ≥1 人架构确认
8a. **参照物推荐**：IF 存在可参照的架构设计、数据流、接口契约或完整实现代码（本项目的、其他项目的、甚至不同语言的），THEN 建议直接提供给 AI 作为方案参照。参照物的实际结构比自然语言描述更精确——AI 能从代码中理解接口粒度、数据结构、错误处理模式等纯文字难说清的细节。将参照物来源记录到 `plan.md` 的「引用文档」章节或 `research.md` 中。

**产出物**：`specs/<feature-id>/plan.md`、`specs/<feature-id>/research.md`、`specs/<feature-id>/data-model.md`、`specs/<feature-id>/contracts/`、`specs/<feature-id>/arch-review.md`、`memory/decisions.md`（追加）

**最小模板**：

```md
# Plan

> **元信息**：Feature: <feature-id> | Created: <date> | Spec: spec.md

## 1. 概要
一句话总结本次技术方案。

## 2. 技术背景
| 维度 | 说明 |
|------|------|
| 开发语言 | |
| 主要依赖 | |
| 测试工具 | |
| 部署目标 | |
| 关键约束 | 规模、性能、兼容性等 |

## 3. 引用文档
- 需求规格：`spec.md`
- 交互设计：`interaction-design.md`（IF 涉及前端）
- 设计系统上下文：`design-system-context.md`（IF 涉及前端）
- 数据模型：`data-model.md`
- 接口契约：`contracts/`

## 4. 架构方案
核心设计、选型理由、关键决策。

## 5. 数据结构
定义主要数据实体与关系。

## 6. 接口设计
API / CLI 参数 / 消息契约 / 事件 / UI 组件输入输出（如适用）

## 7. 实施策略
阶段划分、增量交付顺序、依赖关系。

## 8. 复杂度追踪
IF 当前 feature 涉及多处修改或跨模块改动，THEN 建议在本节评估复杂度：
- 改动文件数估计：
- 新增代码量估计：
- 是否有跨团队依赖：
- 是否存在高风险模块：

## 9. 风险与应对
技术风险、依赖风险、回退策略。
```

> Spec-kit 生成的 `plan.md` 是技术方案主体；IF 后续 spec-kit 升级后在模板中内置了类似结构，THEN 以 spec-kit 产出为准，本标准模板作为参考基线。

**data-model.md 最小模板**：

```md
# 数据模型：<feature-name>

**日期**: <date>
**关联**: [plan.md](./plan.md) | [spec.md](./spec.md)

## 实体概览
IF 涉及多个实体，THEN 绘制实体关系图（ASCII 或文字）：
```
┌─────────────┐     ┌─────────────┐
│  实体 A     │────▶│  实体 B     │
└─────────────┘     └─────────────┘
```

## 1. <实体一> 定义

### 字段清单
| 字段 | 类型 | 示例值 | 说明 |
|------|------|--------|------|

### 状态机（IF 存在多状态流转）
```
┌──────────┐   触发条件    ┌──────────┐
│  状态 A   │────────────▶│  状态 B   │
└──────────┘              └──────────┘
```

### 接口定义（IF 需要，按项目技术栈选择语言）
```<project-language>
// 以 contracts/ 中的类型定义为最终权威
```

## 2. <实体二> 定义
```

> 数据模型的权威定义以 `data-model.md` 和 `contracts/` 目录中的接口契约为准。`data-model.md` 负责概念描述与关系说明，`contracts/` 负责精确的类型签名。两者互为权威来源，实施时应以 `contracts/` 中的类型为准。IF 存在冲突，THEN 以 `contracts/` 为准。

**research.md 最小模板**：

```md
# 研究记录：<feature-name>

**日期**: <date>
**关联**: [plan.md](./plan.md) | [spec.md](./spec.md)

---

## R1: <决策主题>

**决策**: <最终选用的方案>

**依据**:
- <依据 1>
- <依据 2>

**替代方案**:
- <方案 A>：<优缺点>
- <方案 B>：<优缺点>

**实施要点**:
- <要点 1>
- <要点 2>

---

## R2: <下一个决策主题>
```

> 每条研究决策应包含：最终决策、决策依据、替代方案分析（IF 存在真实技术选型或方案分歧，THEN SHOULD 记录替代方案；无替代方案时标注原因）及实施要点。`research.md` 是技术选型的决策追溯记录，SHOULD 在 `plan.md` 生成后同步完善，MUST NOT 留空。

**arch-review.md 最小模板**：

```md
# 架构评审：<feature-name>

**日期**: <date>
**评审依据**: plan.md、data-model.md、contracts/

## 1. 架构决策总结
本次改动的核心架构选型与关键决策列表。

## 2. 边界条件与失败模式
- 输入验证边界：
- 并发/冲突场景：
- 降级与熔断策略：
- 数据一致性保证：

## 3. 评审结论
- **结论**：批准 / 有条件批准 / 拒绝
- **条件**：（如有）
- **责任人**：
- **日期**：
```

**checklists/ (Phase 2 产出) 推荐模板**：

```md
# <checklist 名称，如"需求质量清单">：<feature-name>

**用途**：<校验目的>
**创建日期**：<date>
**功能规格**：[spec.md](../spec.md)

## 内容质量

- [ ] 无实现细节泄漏，必要英文仅用于命令、路径、包名、API 或技术术语；其余英文名词已追加中文标注
- [ ] 聚焦用户价值和业务需要
- [ ] 面向非技术干系人可读
- [ ] 所有必填章节已完成

## 需求完整性

- [ ] 无 [NEEDS CLARIFICATION] 标记残留
- [ ] 需求可测试且表述明确
- [ ] 成功标准可度量
- [ ] 成功标准不绑定具体实现技术
- [ ] 所有验收场景已定义
- [ ] 边界情况已识别
- [ ] 范围边界清晰
- [ ] 依赖和假设已记录

## 功能就绪度（IF 适用）

- [ ] 所有功能需求都有明确验收依据
- [ ] 用户场景覆盖主要流程
- [ ] 功能可以对照成功标准进行验收

## 备注
<说明>
```

> checklist 建议按维度分组（内容质量/需求完整性/功能就绪度等），覆盖内容质量、完整性、一致性、边界场景。IF 已生成 `/speckit.checklist` 则以其产出为准。

**功能完成度追踪表（Phase 8 QA 辅助）推荐模板**：

IF 功能需求较多或需要逐条追踪完成状态，THEN MAY 生成以下表格（或嵌入 QA 报告中）：

```md
| 需求 | 描述 | 状态 | 验收证据 |
|------|------|------|---------|
| FR-001 | <描述> | ✅/❌/⏳ | <证据链接或说明> |

## 完成度汇总

| 类别 | 完成 | 总计 | 进度 |
|------|------|------|------|
| 功能需求 |  |  | % |
| 成功标准 |  |  | % |
```

**contracts/ 目录约定**：
- `contracts/` 目录存放接口类型定义文件（按项目技术栈选择：OpenAPI、Protobuf、JSON Schema、IDL、TypeScript 等），为精确的类型签名权威来源
- `data-model.md` 负责概念与关系说明，`contracts/` 负责精确类型定义，两者互为补充
- 实施阶段 MUST 以 `contracts/` 中的具体类型定义为准
- IF API 变更，THEN MUST 先更新 `contracts/` 再写实现；MUST NOT 先改实现再补契约（参见本 Section **[P0-4 API 契约]**）

**退出条件**：技术方案已通过架构评审，产出物已写入；若涉及前端交互需求，则 `plan.md` 已引用 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）并说明页面模块、交互状态、接口依赖、组件复用边界与设计系统规则适用范围；若涉及 DB 迁移则迁移方案已包含在 `plan.md`；若涉及 API 变更则 `contracts/` 已先于实现更新。

---

#### Phase 3.5：原型验证（Rapid Prototyping）

**定位**：本 Phase 是可选验证阶段，不是必过 Gate。它的目标是在正式实施前用最低成本确认方向可行，发现规格和方案阶段无法暴露的交互缺陷、技术盲区和视觉预期偏差。

**进入条件**：WHEN 满足以下任一条件时，SHOULD 进入本 Phase：
- 交互密集、前端复杂，或需求存在视觉/交互不确定性
- 首次使用不熟悉的技术栈、库或工具
- 存在多个可行方案，需要快速比较后再定
- 用户明确要求「先试试看」

IF 需求足够简单且方案成熟（纯后端逻辑、单一接口改造、已验证的模式），THEN 可跳过本 Phase。

**必做动作**：
1. 用假数据/模拟数据快速搭建最小可运行的原型，不连接真实后端、不写完整业务逻辑
2. 验证方向：交互流转是否符合预期，方案是否存在根本缺陷，盲区是否已扫清
3. IF 存在可参照的已有实现（本项目的、其他项目的、甚至不同语言的代码），THEN 直接提供给 AI 作为参照物——一段 Rust 代码可作为 TypeScript 项目的参考，AI 看得懂就行，这比写文字说明更有效。将参照物路径或内容记录到原型笔记中。
4. 记录原型阶段的发现：哪些假设不成立、哪些方案不可行、哪些盲区暴露了
5. 将结论追加到 `plan.md` 的「原型验证记录」章节，再决定正式进入 Phase 4 或返回 Phase 3 调整方案

**产出物**：原型代码（不提交到主仓库）、`plan.md`（追加原型验证记录）

**退出条件**：原型验证结论已记录；确认正式实施前方向无误，或基于原型发现已返回调整方案。原型代码可丢弃或保留为参考，MUST NOT 直接作为 Phase 6 实施代码。

---

#### Phase 4：任务拆解

**进入条件**：WHEN 任务类型为小功能及以上，Phase 3 已完成。

**必做动作**：
1. 执行 `/speckit.tasks`，生成 `tasks.md`，含 `[P]` 并行标记与 TDD 标记
2. IF 涉及前端交互需求，THEN 按「前端交互需求附加规则」拆解前端任务；若设计文档或设计基线缺失，MUST 返回 Phase 2 补齐，MUST NOT 在本阶段补写
3. **[P0-1 组件复用扫描]** IF 任务涉及前端 UI 实现且项目存在组件库、设计系统或可复用 UI 层，THEN 在生成 `tasks.md` 前 MUST 扫描项目现有组件目录（如 `src/components/`、`src/ui/`、设计系统包），在每条前端任务中标注：
   - `[复用]` — 使用现有组件，注明组件路径
   - `[扩展]` — 基于现有组件扩展，注明基础组件
   - `[新增]` — 确认现有组件无法满足后才新建，需在 tasks.md 说明理由
   MUST NOT 在未扫描现有组件的情况下直接生成"新建组件"任务

**产出物**：`specs/<feature-id>/tasks.md`

**tasks.md 结构推荐**：

```md
# Tasks: <feature-name>

**输入产物**：来自 `specs/<feature-id>/` 的规格、方案、调研、数据模型、契约；IF 涉及前端，再包含设计文档
**前置依赖**：plan.md（必须）、spec.md（必须，用户故事来源）、research.md、data-model.md、contracts/

**组织方式**：任务按用户故事或 Phase 分组，支持独立实施和验收。

**格式**：[ID] [P] [Story] 说明
- [P]：可并行执行（不同文件，无依赖）
- [Story]：任务所属的用户故事
- 任务说明包含精确文件路径
- [x] = 已完成；[ ] = 未完成

---

## Phase 1：<阶段名称>
- [ ] T001 <任务说明>

## Phase 2：<阶段名称>
- [ ] T002 [P] <可并行任务说明>
```

> Spec-kit 生成的 `tasks.md` 以 spec-kit 产出为准；本结构供参考或手工调整时使用。T001/T002 等编号可自然递增，不必严格连续。

**状态覆盖矩阵（IF 存在多状态/生命周期对象）推荐模板**：

IF 功能涉及 UI 组件、服务状态、任务生命周期、CLI 执行或多数据管道状态等场景，THEN MAY 生成以下状态覆盖矩阵作为 QA 辅助：

```md
# 状态覆盖矩阵：<feature-name>

**范围**：所有涉及对象/模块/组件

## 图例
- ✅ = 有覆盖
- ❌ = 未覆盖
- — = 不适用

## <对象/模块/组件名称>

| 状态 | Story/示例 | 测试 | 说明 |
|------|-----------|------|------|
| pending | ✅ | ✅ | <说明> |
| running | ✅ | ✅ | <说明> |
| succeeded | ✅ | ✅ | <说明> |
| failed | ✅ | ❌ | <说明> |
| retry | ❌ | ❌ | <说明> |
| cancelled | ✅ | ✅ | <说明> |
```

> 该矩阵适用于组件库、多状态组件、服务/CLI 生命周期对象的质量门禁，非纯逻辑功能可跳过。

**退出条件**：原子任务列表已生成，并行任务已标记；若涉及前端交互需求，则前端任务已基于 `interaction-design.md` 拆解，且包含设计还原验证任务；IF 项目存在组件库或设计系统，THEN 已扫描现有组件并标注复用/扩展/新增。

> **可选**：执行 `/speckit.taskstoissues` 将 `tasks.md` 中的任务转为 GitHub Issues，便于在 GitHub 上跟踪实施进度。此步骤在 Phase 4 之后、Phase 6 实施之前执行；若团队使用其他任务跟踪工具，可跳过。

---

#### Phase 5：一致性分析 + 测试先行（TDD）

**进入条件**：WHEN Phase 4 已完成，且小功能/新功能类改动开始实施前。bug fix 默认走 Phase 5B 简化流。

**必做动作**：
1. Claude 执行 `/speckit.analyze`，Codex 执行 `$speckit-analyze`，对 `spec.md`、`plan.md`、`tasks.md` 做只读一致性分析；涉及前端交互需求时按附加规则纳入 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）
2. 按验收标准先写失败测试
3. IF 后续实现预计会调用外部 agent，THEN 先在 `tasks.md` 标注可并行项与上下文边界，避免多个 agent 重复改同一文件
4. 执行 `/commit-message` 生成提交信息，等待确认后再执行提交；提交格式以该技能定义为准，如需标识 `<feature-id>`，可写入摘要或说明列表

**产出物**：分析报告、失败测试文件、测试基线提交

**退出条件**：分析中无阻断性矛盾，测试已写入并提交，测试当前为失败状态（红灯）。

---

#### Phase 5B：Bug Fix 简化流

**进入条件**：WHEN 任务目标是修复既有缺陷，而不是新增需求、扩 scope 或重做方案。

**必做动作**：
1. 先写复现测试，固化问题与回归边界
2. 定位并修复
3. 由专注审查视角的子任务完成代码审查（仅审改动范围）
4. IF 涉及鉴权、支付、隐私、权限、密钥、数据边界等安全敏感改动，THEN 追加安全专项审查，并将结论写入 `specs/<feature-id>/review-findings.md`，修复后重审
5. 确认测试通过（MUST 按 `ref-09-verification-gate.md` Gate Function 执行，附 fresh 测试命令输出）
6. 由专注功能验证的子任务完成 QA（feature branch 默认 diff-aware）
7. 走标准 git/PR 发布流程
8. 将踩坑内容追加写入 `memory/issues.md`

**产出物**：复现测试、修复提交、`memory/issues.md`（追加）

**退出条件**：缺陷已复现、已修复；步骤 5 MUST 经 `ref-09` Gate Function 验证并附 fresh 命令输出；审查与发布动作已完成。

> 本简化流是 bug fix 特例，MUST NOT 视为完整 Phase 5/6 的等价替身。若修复过程实际演变为新增能力、范围调整或方案重构，THEN MUST 返回 Phase 2 正式建模。

---

#### Phase 6：代码实施

**进入条件**：WHEN Phase 5 已完成，失败测试已就位。

**必做动作**：
1. IF 任务列表明确且为完整功能，THEN Claude 执行 `/speckit.implement`，Codex 执行 `$speckit-implement`
2. IF 需要专业判断（复杂架构、安全、性能），THEN 先在 `plan.md`/`arch-review.md` 中明确判断结论；必要时使用外部代理编排能力复核方案
3. IF 存在 `[P]` 并行任务，且已安装 `oh-my-claudecode`，THEN MAY 用以下方式接入外部 agent：
   - `/team 3:executor "implement tasks <task-id list> with clear file ownership"`
   - `omc team 2:codex "implement task <task-id> in <path> only"`
   - `/ask gemini "review this implementation approach before coding"`
4. 使用外部 agent 时，MUST 先明确每个 agent 的文件所有权、输入上下文和验收条件；MUST NOT 让多个 agent 同时改同一文件
5. 每完成一个原子任务，MUST 立即执行 `/commit-message` 生成提交信息，等待确认后再提交；MUST NOT 直接调用 `git commit` 绕过该步骤；提交信息格式以 `/commit-message` 技能定义为准，默认使用中文，除非用户明确要求英文
6. IF 遇到问题/踩坑，THEN MUST 将内容追加写入 `memory/issues.md`
6a. **偏差日志（推荐）**：SHOULD 在 Phase 6 开始时建立临时 `DEVIATIONS.md`，记录实施过程中与 `plan.md`/`tasks.md` 不一致的发现、临时决策、计划外上下文和意外变更。这不是正式文档，而是过程中的即兴记录，用来防止实施到一半偏离方向而不自知。Phase 6 退出时将其中有价值的内容归入 `memory/issues.md` 或 `memory/decisions.md`，然后删除 `DEVIATIONS.md`。
7. IF 发现规格有误，THEN MUST 返回 Phase 2 正式修改，重走 Phase 3，MUST NOT 绕过
8. IF 涉及前端交互需求，THEN 页面实现、组件开发与视觉还原 MUST 同时以 `spec.md`、`interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）、`plan.md`、`tasks.md` 为输入，按「前端交互需求附加规则」执行，MUST NOT 临场发挥、绕过设计基线，或在 Phase 6 新建/补写前端设计文档

**产出物**：原子提交，`memory/issues.md`（如有追加）

**退出条件**：所有原子任务完成，测试全部通过（绿灯）；退出 Phase 6 前 MUST freshly run 项目验证命令（见 `ref-09 § 13.4`），禁止无输出宣称实施完成。

---

#### Phase 7：代码审查 + 安全审查 + Secret 扫描

**进入条件**：WHEN 所有改动完成，Phase 6 退出。

**必做动作**：
1. 由专注审查视角的子任务完成代码审查，审查生产级 bug（race condition、N+1、信任边界等）
2. IF 涉及鉴权、支付、隐私、权限、密钥、数据边界等安全敏感改动，THEN 追加安全专项审查，并将结论写入同一审查文档
3. IF 审查范围较大、风险较高、或需要多视角交叉验证，THEN SHOULD 追加外部代理编排能力做交叉复核：
   - `/ccg "Review this diff: Codex 看架构/类型/测试缺口，Gemini 看可读性/UX/文档"`
   - `/ask codex "review this patch for correctness, edge cases, and security assumptions"`
   - `/ask gemini "review this diff for readability, UX regressions, and unclear naming"`
4. gitleaks pre-commit hook 在提交时自动触发 Secret 扫描
5. 将代码审查、安全专项审查、外部代理编排能力交叉复核中的有效发现统一汇总写入 `specs/<feature-id>/review-findings.md`，并标注来源
6. IF 存在审查发现，THEN 修复后 MUST 重新执行本 Phase

**产出物**：`specs/<feature-id>/review-findings.md`

**退出条件**：无阻断性审查发现，`specs/<feature-id>/review-findings.md` 已写入。

---

#### Phase 8：QA 验证

**进入条件**：WHEN Phase 7 已通过。

**必做动作**：
1. 由专注功能验证的子任务完成 QA，生成 `qa-reports/`（feature branch 默认 diff-aware，含截图）
2. 对照 checklist 逐条确认验收标准
3. IF 涉及前端交互需求，THEN 按「前端交互需求附加规则」对照 `interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）与设计基线验证关键页面结构、交互流转、状态矩阵与响应式规则，并在 QA 报告中标注设计引用、关键页面截图、差异结论；差异需标注 `blocking`/`non-blocking`/`accepted`

**产出物**：`specs/<feature-id>/qa-reports/`（含截图）

**退出条件**：所有验收条目通过，截图已存档；若涉及前端交互需求，则设计对照验证已通过，QA 报告已记录设计引用、关键页面截图、差异结论与差异分级。若设计效果与目标基线不一致，MUST 返回 Phase 6 修复；若基线缺失或错误，返回 Phase 2。Phase 8 内每条验收结论 MUST 符合 `ref-09` Iron Law（附 fresh 验证证据）。

---

#### Phase 9：发布

**进入条件**：WHEN Phase 8 已通过。

**必做动作**：
1. 走标准 git/PR 发布流程，创建 PR + CHANGELOG
2. IF 团队已将 agent runtime 接入 CI，THEN 可自动执行代码审查 + 安全扫描 + 测试套件 作为 CI gate；否则 CI 至少执行静态检查、测试与安全扫描（失败则阻断合并）
3. **[P0-4 API 契约]** IF 本次改动包含 API 变更，THEN CI MUST 执行消费者契约测试（如 Pact），失败则阻断合并
4. 人工 Code Review：至少 1 人 Approve（CODEOWNERS 强制）
5. **[P0-3 DB 迁移]** IF 本次改动包含 DB schema 变更，THEN 合并前 MUST 先在 staging 执行 migration dry-run，确认无报错、数据无损后再继续；MUST NOT 跳过 staging 直接在生产执行迁移
6. 合并后 CD 自动部署到 staging
7. IF 团队已将 agent runtime 接入 CI，THEN 可自动触发针对 `https://staging.<domain>` 的快速 QA 验证；否则由人工或本地 agent 在 staging 执行快速验证
8. 通过后人工批准生产部署
9. 上线后观察 5 分钟（监控告警）
10. IF 发现问题，THEN MUST 立即执行 `git revert HEAD` 并走标准发布流程回滚；IF 已执行 DB 迁移且不可逆，THEN MUST 执行回滚脚本并通知 DBA

**产出物**：PR、CHANGELOG、staging QA 报告

**退出条件**：生产部署完成，5 分钟观察期无异常告警。

---

#### Phase 10：复盘

**进入条件**：WHEN 每周结束时，或功能上线后。

**必做动作**：
1. 生成结构化复盘快照到 `.context/retros/`
2. IF 有价值经验，THEN 按 `ref-10-experience-quality.md` 判定后追加写入 `memory/patterns.md`（三镜头 + 九类垃圾排除 + 与历史去重/合并；宁漏勿错）
3. 复盘输出末尾执行「收尾反思两问」并如实作答：
   - **① 眼下最没把握的是什么？** —— 本次迭代中置信度最低、最需验证的判断
   - **② 我最大的遗漏是什么？我没意识到什么？** —— 可能被忽略但会影响结果的地方
   （问题一源自 Sam Altman，问题二源自 Claude；标注置信度边界与盲点，不否定复盘结论）

**产出物**：`.context/retros/`（快照），`memory/patterns.md`（追加）

**退出条件**：复盘完成，有价值经验已持久化。
