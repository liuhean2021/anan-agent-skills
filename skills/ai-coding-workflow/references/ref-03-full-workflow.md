# §5 完整开发工作流（Full Development Workflow）

> 来源：ai-coding-workflow-best-practices.md §5
> 适用：Phase 0~10 完整流程，含 ceo-review 模板、spec 模板

---

## Section 5：完整开发工作流（Full Development Workflow）

### 5.1 阶段主线与工具介入原则

- AI Coding Workflow 以 `Phase 0~10 / 5B` 为唯一主线；`spec-kit`、`gstack`、`agency-agents`、外部代理编排能力、`context7`、`gitleaks`、`memory` 等都按阶段介入
- `spec-kit` 主要提供规格、方案、任务、分析、实施骨架
- `gstack` 主要提供方向评审、架构评审、审查、QA、发布、复盘能力
- `agency-agents` 主要提供复杂架构、安全、性能、前端等专业判断
- 外部代理编排能力主要用于并行实施或多模型交叉复核
- `context7` 用于核对官方文档，避免在方案或实施阶段产生 API 幻觉
- `gitleaks`、测试、CI、`memory/*` 等属于验证与沉淀能力，同样是工作流组成部分

**阶段内能力选择**：

| 情况 | 介入能力 |
|------|--------|
| 任务列表明确、完整功能、自动执行 | `/speckit.implement` |
| 需要专业判断（复杂架构、安全、性能） | `agency-agents` 对应角色 |
| 需并行调用 Codex / Gemini 分工实施 | `/oh-my-claudecode:team` 或 `/oh-my-claudecode:omc-teams` |
| 需多模型交叉复核实现方案 | `/oh-my-claudecode:ccg` |
| 需核对陌生库、新版本 SDK、官方 API | `context7` |

### 5.2 全流程（Phase 0 ~ Phase 10）

---

#### Phase 0：项目初始化

**进入条件**：WHEN 项目为全新项目，且尚未执行过 `specify init`。

**必做动作**：
1. 执行 `specify init . --ai <your-agent>`（分布式团队可加 `--branch-numbering timestamp` 避免分支编号冲突；Codex CLI 常用 `--ai codex --ai-skills`），初始化 `.specify/` 目录
2. 执行 `/speckit.constitution`，生成 `constitution.md`
3. 补充 `AGENTS.md` / `CLAUDE.md`，写入项目规范

**产出物**：`.specify/memory/constitution.md`、`AGENTS.md`（或 `CLAUDE.md`）

**退出条件**：上述三项均已完成。

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
1. IF 问题定义仍模糊、需要重构需求表述，THEN 先执行 `/office-hours`
2. 执行 `/plan-ceo-review`，寻找最优版本，压力测试需求合理性
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

## 9. 成功指标
怎么判断这件事值得继续投。

## 10. 风险与前提假设
当前结论依赖哪些假设成立。

## 11. 结论
- 决策：进入 `spec` / 暂缓 / 放弃
- feature-id：
- 负责人：
- 日期：
```

**使用规则**：

- `ceo-review.md` MUST 输出：推荐方向、MVP 边界、非目标范围、是否进入 `spec`

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
8. IF 需求涉及页面、组件、弹窗、表单、导航、状态切换或操作反馈，THEN 视为涉及前端交互需求，MUST 在规格锁定前产出 `specs/<feature-id>/interaction-design.md`
9. IF 已产出可视化设计交付物（Figma / Sketch / Adobe XD / Pixso / MasterGo / 即时设计 / Motiff / Axure / PDF / 截图 / 分享链接 / 原型文件等），THEN MUST 归档到 `specs/<feature-id>/design-assets/`；在线链接 MUST 记录到 `specs/<feature-id>/design-assets/source-links.md`
10. 规格确认后锁定

**产出物**：`specs/<feature-id>/spec.md`、`specs/<feature-id>/checklists/`、`specs/<feature-id>/interaction-design.md`（如适用）、`specs/<feature-id>/design-assets/`（如适用）

**退出条件**：规格无歧义，checklist 已生成并闭环，规格已锁定；若涉及前端交互需求，则 `interaction-design.md` 与 `design-assets/` 已就位。

> IF 后续阶段发现规格有误，THEN 代理 MUST 返回本 Phase 正式修改，MUST NOT 在实施阶段绕过规格直接改代码。
>
> `spec.md` 是规格文档。它 MUST 继承 `ceo-review.md` 的方向结论，但 SHOULD 避免重复展开战略讨论；重点应放在"具体做什么、边界在哪里、怎样算完成"。

**最小模板**：

```md
# Spec

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

## 7. 验收标准
使用 Given/When/Then 格式，每条 MUST 可测试、可验证。
- Given …, When …, Then …
- Given …, When …, Then …

## 8. UI/UX 设计规范（IF 涉及用户界面）
### 8.1 设计交付物
- 页面结构图（线框图 / 布局图）
- 关键流转图（用户操作路径）
- 组件复用说明（优先复用现有设计系统组件，MUST NOT 随意发明样式）
- 可视化设计来源（设计文件、分享链接、截图、原型说明）

### 8.2 状态矩阵
每个页面/组件 MUST 覆盖以下状态：
| 状态 | 说明 |
|------|------|
| default | 默认态 |
| loading | 加载中 |
| empty | 空数据 |
| error | 错误态 |
| success | 成功态 |
| disabled | 不可用态 |

### 8.2.1 数据流与状态归属（P1-9）
IF 功能涉及跨组件或跨页面的共享数据，THEN MUST 在规格锁定前明确以下状态归属，写入本节：

| 状态/数据 | 归属层 | 说明 |
|----------|--------|------|
| 仅当前组件使用 | **Local**（useState / ref） | 无需跨组件共享 |
| 跨页面 / 跨组件共享 | **Global**（Zustand / Redux / Pinia） | 需定义 store 模块名 |
| 来自接口、需缓存/同步 | **Server State**（React Query / SWR / TanStack） | 需定义 query key 与失效策略 |

**填写规则**：
- 每类"跨组件共享的数据"对应一行，说明归属层与原因
- IF 所有状态均为组件私有，THEN 本节可标注"全部 Local，无跨组件共享状态"并跳过
- Phase 6 实施时，AI MUST 以本节定义为准，MUST NOT 自行决定状态归属层

### 8.3 响应式规则
定义断点与适配策略（mobile / tablet / desktop）。

### 8.4 可访问性基线
- WCAG 2.1 AA 合规
- 键盘可达、焦点态可见
- 语义化 HTML 标签
- 颜色对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大文本）

## 9. 非功能需求
| 维度 | 要求 |
|------|------|
| 性能 | 页面加载 / API 响应时间目标 |
| 兼容性 | 浏览器、设备、操作系统范围 |
| 安全 | 认证、授权、数据加密、输入校验 |
| 隐私合规 | 数据收集、存储、传输合规要求 |
| 可靠性 | 可用性目标、降级策略 |

## 10. 约束与依赖
技术、业务、外部系统、合规等约束。

## 11. 待澄清问题
还没确认、需要补充的问题。

## 12. 锁定记录
- 状态：draft / clarified / locked
- feature-id：
- 负责人：
- 日期：
```

**使用规则**：

- `spec.md` MUST 继承 `ceo-review.md` 的方向结论，MUST NOT 自行扩 scope
- 若发现方向争议，代理 MUST 返回 Phase 1
- IF 功能涉及用户界面，THEN 需求规格 MUST 填写 `spec.md` 中的「8. UI/UX 设计规范」章节（含设计交付物、状态矩阵、响应式规则、可访问性基线），作为规格锁定的必要条件。MUST NOT 将 UI/UX 设计推迟到实施阶段临场发挥。
- IF 功能涉及前端交互需求，THEN MUST 同步产出 `interaction-design.md` 与 `design-assets/`；仅有文字需求而无可视化设计交付物时，MUST NOT 直接进入后续实现阶段。
- `interaction-design.md` 只负责锁定需求阶段的交互设计与可视化基线；页面实现、组件开发、视觉还原属于后续实施阶段，MUST NOT 在本 Phase 提前落实现代码。
- `spec.md` 中的「9. 非功能需求」章节 SHOULD 根据功能性质填写，涉及用户可感知性能、安全、合规的功能 MUST 填写。

---

#### Phase 3：技术方案

**进入条件**：WHEN Phase 2 已完成，规格已锁定。适用范围：小功能及以上。

**必做动作**：
1. IF 涉及陌生库、新版本 SDK、或近期变化的 API，THEN 先使用 `context7` 核对官方文档，再确定方案
2. 执行 `/speckit.plan "<技术栈>"`，生成 `plan.md`、`research.md`、`data-model.md`、`contracts/`
3. IF 已产出 `interaction-design.md`，THEN `plan.md` MUST 引用该文件作为前端实现输入，说明页面模块划分、交互状态映射、接口依赖、组件复用边界
4. IF 涉及前端交互且设计复杂度较高、评审风险较高或交互边界不清，THEN SHOULD 执行 `/plan-design-review`
5. 执行 `/plan-eng-review`，深度审查图表、边界条件、失败模式
6. 将架构评审结论写入 `specs/<feature-id>/arch-review.md`
7. 将架构决策追加写入 `memory/decisions.md`
8. **[P0-3 DB 迁移]** IF 本次改动涉及数据库 schema 变更（新增/修改/删除表、字段、索引、约束），THEN `plan.md` MUST 包含迁移方案说明，至少覆盖：
   - 兼容性分类：向前兼容（可先上应用再跑迁移）/ 需协调上线顺序
   - 上线顺序：migration 脚本与应用部署的先后关系
   - 回滚条件与回滚脚本（是否可逆）
   - staging dry-run 要求（Phase 9 前必须先在 staging 跑一次）
9. **[P0-4 API 契约]** IF 本次改动新增、修改或删除对外 API（REST/GraphQL/gRPC/消息契约），THEN MUST 先更新 `specs/<feature-id>/contracts/`，再写实现代码；MUST NOT 先改实现再补契约；breaking change MUST 在 `arch-review.md` 中标注并经过 ≥1 人架构确认

**产出物**：`specs/<feature-id>/plan.md`、`specs/<feature-id>/research.md`、`specs/<feature-id>/data-model.md`、`specs/<feature-id>/contracts/`、`specs/<feature-id>/arch-review.md`、`memory/decisions.md`（追加）

**退出条件**：技术方案已通过架构评审，产出物已写入；若涉及 DB 迁移则迁移方案已包含在 `plan.md`；若涉及 API 变更则 `contracts/` 已先于实现更新。

---

#### Phase 4：任务拆解

**进入条件**：WHEN 任务类型为小功能及以上，Phase 3 已完成。

**必做动作**：
1. 执行 `/speckit.tasks`，生成 `tasks.md`，含 `[P]` 并行标记与 TDD 标记
2. IF 已产出 `interaction-design.md`，THEN 前端相关任务 MUST 基于设计产物拆解，至少区分页面结构实现、交互实现、状态处理、视觉验证、回归验证
3. IF 涉及前端交互需求但尚未完成 `interaction-design.md` 或 `design-assets/`，THEN MUST 返回 Phase 2 补齐，MUST NOT 直接生成前端实现任务
4. **[P0-1 组件库感知]** IF 任务涉及前端 UI 实现，THEN 在生成 `tasks.md` 前 MUST 扫描项目现有组件目录（如 `src/components/`、`src/ui/`、设计系统包），在每条前端任务中标注：
   - `[复用]` — 使用现有组件，注明组件路径
   - `[扩展]` — 基于现有组件扩展，注明基础组件
   - `[新增]` — 确认现有组件无法满足后才新建，需在 tasks.md 说明理由
   MUST NOT 在未扫描现有组件的情况下直接生成"新建组件"任务

**产出物**：`specs/<feature-id>/tasks.md`

**退出条件**：原子任务列表已生成，并行任务已标记；若涉及前端交互，前端任务已按设计产物拆解且已完成组件库扫描标注。

---

#### Phase 5：一致性分析 + 测试先行（TDD）

**进入条件**：WHEN Phase 4 已完成，且小功能/新功能类改动开始实施前。bug fix 默认走 Phase 5B 简化流。

**必做动作**：
1. Claude 执行 `/speckit.analyze`，Codex 执行 `$speckit-analyze`，对 `spec.md`、`interaction-design.md`（如有）、`plan.md`、`tasks.md` 做只读一致性分析
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
3. IF 已安装 gstack，THEN 执行 `/review`（仅审改动范围）；否则改为人工审查或 CI 校验
4. 确认测试通过
5. IF 已安装 gstack，THEN 执行 `/qa`（feature branch 默认 diff-aware）；否则改为人工或 CI 验证
6. IF 已安装 gstack，THEN 执行 `/ship`；否则走宿主常规发布流程
7. 将踩坑内容追加写入 `memory/issues.md`

**产出物**：复现测试、修复提交、`memory/issues.md`（追加）

**退出条件**：缺陷已复现、已修复、验证通过，并完成审查与发布动作。

> 本简化流是 bug fix 特例，MUST NOT 视为完整 Phase 5/6 的等价替身。若修复过程实际演变为新增能力、范围调整或方案重构，THEN MUST 返回 Phase 2 正式建模。

---

#### Phase 6：代码实施

**进入条件**：WHEN Phase 5 已完成，失败测试已就位。

**必做动作**：
1. IF 任务列表明确且为完整功能，THEN Claude 执行 `/speckit.implement`，Codex 执行 `$speckit-implement`
2. IF 需要专业判断（复杂架构、安全、性能），THEN 激活 agency-agents 对应角色
3. IF 存在 `[P]` 并行任务，且已安装 `oh-my-claudecode`，THEN MAY 用以下方式接入外部 agent：
   - `/oh-my-claudecode:team "implement tasks <task-id list> with clear file ownership"`
   - `/oh-my-claudecode:omc-teams 2:codex "implement task <task-id> in <path> only"`
   - `/oh-my-claudecode:ask gemini "review this implementation approach before coding"`
4. 使用外部 agent 时，MUST 先明确每个 agent 的文件所有权、输入上下文和验收条件；MUST NOT 让多个 agent 同时改同一文件
5. 每完成一个原子任务，MUST 立即执行 `/commit-message` 生成提交信息，等待确认后再提交；MUST NOT 直接调用 `git commit` 绕过该步骤；提交信息格式以 `/commit-message` 技能定义为准，默认使用中文，除非用户明确要求英文
6. IF 遇到问题/踩坑，THEN MUST 将内容追加写入 `memory/issues.md`
7. IF 发现规格有误，THEN MUST 返回 Phase 2 正式修改，重走 Phase 3，MUST NOT 绕过
8. IF 涉及前端交互需求，THEN 页面实现、组件开发、视觉还原从本 Phase 开始执行，其输入 MUST 来自 `spec.md`、`interaction-design.md`、`design-assets/`、`plan.md`、`tasks.md`

**产出物**：原子提交，`memory/issues.md`（如有追加）

**退出条件**：所有原子任务完成，测试全部通过（绿灯）。

---

#### Phase 7：代码审查 + 安全审查 + Secret 扫描

**进入条件**：WHEN 所有改动完成，Phase 6 退出。

**必做动作**：
1. 执行 `/review`，审查生产级 bug（race condition、N+1、信任边界等）
2. 同步激活 `security-engineer` 角色，审查安全漏洞（两者并行进行）
3. IF 审查范围较大、风险较高、或需要多视角交叉验证，THEN SHOULD 追加外部代理编排能力做交叉复核：
   - `/oh-my-claudecode:ccg "Review this diff: Codex 看架构/类型/测试缺口，Gemini 看可读性/UX/文档"`
   - `/oh-my-claudecode:ask codex "review this patch for correctness, edge cases, and security assumptions"`
   - `/oh-my-claudecode:ask gemini "review this diff for readability, UX regressions, and unclear naming"`
4. gitleaks pre-commit hook 在提交时自动触发 Secret 扫描
5. 将 `/review`、`security-engineer`、外部代理编排能力交叉复核中的有效发现统一汇总写入 `specs/<feature-id>/review-findings.md`，并标注来源
6. IF 存在审查发现，THEN 修复后 MUST 重新执行本 Phase

**产出物**：`specs/<feature-id>/review-findings.md`

**退出条件**：无阻断性审查发现，`specs/<feature-id>/review-findings.md` 已写入。

---

#### Phase 8：QA 验证

**进入条件**：WHEN Phase 7 已通过。

**必做动作**：
1. 执行 `/qa`，生成 `qa-reports/`（feature branch 默认 diff-aware，含截图）
2. 对照 checklist 逐条确认验收标准
3. IF 涉及前端交互需求，THEN MUST 额外对照 `interaction-design.md` 与 `design-assets/` 验证关键页面结构、关键交互流转、状态矩阵、响应式规则

**产出物**：`.gstack/qa-reports/`（含截图）

**退出条件**：所有验收条目通过，截图已存档；若涉及前端交互需求，则设计对照验证已通过。

---

#### Phase 9：发布

**进入条件**：WHEN Phase 8 已通过。

**必做动作**：
1. 执行 `/ship`，创建 PR + CHANGELOG
2. IF 团队已将 agent runtime 接入 CI，THEN 可自动执行 `/review` + 安全扫描 + 测试套件 作为 CI gate；否则 CI 至少执行静态检查、测试与安全扫描（失败则阻断合并）
3. **[P0-4 API 契约]** IF 本次改动包含 API 变更，THEN CI MUST 执行消费者契约测试（如 Pact），失败则阻断合并
4. 人工 Code Review：至少 1 人 Approve（CODEOWNERS 强制）
5. **[P0-3 DB 迁移]** IF 本次改动包含 DB schema 变更，THEN 合并前 MUST 先在 staging 执行 migration dry-run，确认无报错、数据无损后再继续；MUST NOT 跳过 staging 直接在生产执行迁移
6. 合并后 CD 自动部署到 staging
7. IF 团队已将 agent runtime 接入 CI，THEN 可自动触发 `/qa https://staging.<domain> --mode=quick`；否则由人工或本地 agent 在 staging 执行快速验证
8. 通过后人工批准生产部署
9. 上线后观察 5 分钟（监控告警）
10. IF 发现问题，THEN MUST 立即执行 `git revert HEAD` + `/ship` 回滚；IF 已执行 DB 迁移且不可逆，THEN MUST 执行回滚脚本并通知 DBA

**产出物**：PR、CHANGELOG、staging QA 报告

**退出条件**：生产部署完成，5 分钟观察期无异常告警。

---

#### Phase 10：复盘

**进入条件**：WHEN 每周结束时，或功能上线后。

**必做动作**：
1. 执行 `/retro`，生成复盘快照到 `.context/retros/`
2. IF 有价值经验，THEN 追加写入 `memory/patterns.md`

**产出物**：`.context/retros/`（快照），`memory/patterns.md`（追加）

**退出条件**：复盘完成，有价值经验已持久化。
