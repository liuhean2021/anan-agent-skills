---
name: ai-coding-workflow
description: 当用户需要统一的 AI 编程工作流时使用，涵盖新项目、新功能、bug fix、规划、代码审查、QA、发布及存量项目接入。代理将任务路由至 spec-kit 规格链路与 agent 原生能力承载的评审/QA/发布等阶段能力，并强制 Phase 顺序与完成前验证（ref-09，验证纪律内置于本技能，不依赖任何外部插件）。
---

> **⚠️ 初次安装必做**：将本技能加入全局强制规则 → 跳至文末「[初次配置](#初次配置全局强制生效)」章节，完成后再回来阅读。

> 详细说明、命令参考、模板按场景拆分为以下文件：
>
> | 文件 | 内容 |
> |------|------|
> | `references/ref-01-task-routing.md` | §0 规范导言（术语/MUST-SHOULD-MAY/Phase 结构规范）+ §1 任务路由（任务类型→Phase表、命令速查、场景→命令映射）+ §4 文档结构（文件路径速查表） |
> | `references/ref-02-tool-stack.md` | §2 工具体系总览 + §10 各工具详细说明（spec-kit/评审-QA-发布能力/OMC/gitleaks/自检）+ §11 参考来源 |
> | `references/ref-03-full-workflow.md` | §5 完整开发工作流 Phase 0~10（含 ceo-review 模板、spec 模板） |
> | `references/ref-04-governance-checklist.md` | §3 AI治理（数据边界/高风险操作/人工责任/留痕）+ §6 最佳实践清单（5组 checklist） |
> | `references/ref-05-legacy-onboarding.md` | §7 存量项目接入（三档策略 A/B/C + Bug Fix 简化流程） |
> | `references/ref-06-branch-parallel.md` | §8 分支策略（主干开发、PR合并规则）+ §9 并行开发（Git Worktree + OMC 多代理选型） |
> | `references/ref-07-advanced-practices.md` | §12 进阶实践（P1 测试分层/依赖安全/DORA/Hooks；P2 AI信任边界/环境策略/合规审查/成本管理） |
> | `references/ref-08-host-installation-and-cc-switch.md` | Claude Code/Codex/Gemini 安装 + CC Switch provider/model 切换 |
> | `references/ref-09-verification-gate.md` | §13 验证铁律 + 阶段顺序纪律（本技能内置横切纪律层、Iron Law、Gate Function） |
> | `references/ref-10-experience-quality.md` | §14 经验质量判定（三镜头 + 九类垃圾排除 + 写入前检查），`memory/patterns.md` 写入前必读 |

# AI Coding 工作流

**核心原则**：规格驱动 → 测试先行 → 最小改动 → 审查验证 → 持续复盘  
**纪律层**：Phase 按文档顺序推进；任何完成宣称 **必须附 fresh 验证证据**（详见 `references/ref-09-verification-gate.md`）；该纪律内置于本技能，任何有能力的 agent 原生遵守，不依赖外部插件  
**适用**：按 ai-coding-workflow 推进的 AI 辅助开发（新项目/新功能/bug fix/存量接入）；与具体 Agent / IDE 无关

**何时使用**：当用户要你按统一研发流程处理开发任务时使用，典型包括：新项目、新功能、bug fix、存量项目接入、代码审查、QA、发布、工具升级、并行开发。

**不适用**：纯闲聊、单次信息查询、纯文案改写、纯翻译、仅做简短说明而不进入研发流程的场景。

本技能中的“工作流”默认指**统一的 AI Coding Workflow**。`Phase 0~10` 与 `Phase 5B` 是唯一主线阶段定义；验证纪律（阶段顺序、Iron Law、Gate Function，详见 `ref-09`）作为本技能自带的横切规则始终生效，任何有能力的 agent 原生遵守，与是否安装某个外部插件无关；`spec-kit`、评审/QA/发布等阶段能力（由 agent 自身或专门子任务完成，不依赖特定外部工具）、外部代理编排能力、Context7 MCP、`gitleaks`、`git worktree`、`AGENTS.md/CLAUDE.md/memory` 等都属于按阶段介入的工作流能力，MUST NOT 理解为彼此分离的并行流程。

详细阶段、工具映射与治理规则见下方章节和 `references/`。

涉及前端交互需求时，所有前端设计文档（`DESIGN.md`、`specs/<feature-id>/interaction-design.md`、`specs/<feature-id>/design-system-context.md`、设计引用与可视化基线）都必须在 **Phase 2/spec 阶段**完成并锁定。Phase 3 之后只负责引用、拆解、实施、验证这些已锁定设计输入；页面实现、组件开发、视觉还原属于后续实施阶段，MUST NOT 在实施阶段临场补写或新建设计文档。

## 评审/QA/发布能力承载策略

> 本节替代早期版本中「Superpowers 插件必装 + gstack 承载评审/QA/发布」的硬依赖框架：现代 agent 已具备原生完成这些职责的能力，不再需要点名依赖外部插件或工具。

`/review`、`/qa`、`/ship` 对应的职责，本质上是任何有能力的现代 agent（不论 Claude Code、Codex、Gemini 或其他宿主）都能原生完成的常规任务，不需要依赖某个特定外部工具或插件来"解锁"：
- 代码/安全审查：由一个专注审查视角的子任务完成（可以是宿主的子代理，也可以是同一个 agent 切换视角自查）
- 功能验证（QA）：由一个专注功能验证的子任务完成
- 发布：走标准 git/PR 流程，由 agent 自身执行

只有当前环境确实缺乏执行这些任务的能力（例如无法运行测试、无法访问代码仓库）时，才降级为人工审查、测试命令或 CI 流程。后续各 Phase 不再重复声明此规则。

**验证纪律不可降级**：Iron Law、Gate Function（见 `ref-09-verification-gate.md`）是本技能自带的横切规则，任何有能力的 agent 原生遵守，不因工具可用性而降级。

## 命令映射

正文优先描述“动作”，不重复绑定宿主命令；具体命令按下表选择：

| 动作 | Claude Code | Codex CLI | agent 能力不可用时 |
|------|-------------|-----------|----------------|
| constitution | `/speckit.constitution` | `$speckit-constitution` | 手动维护项目原则 |
| specify | `/speckit.specify` | `$speckit-specify` | 需安装 spec-kit |
| clarify | `/speckit.clarify` | `$speckit-clarify` | 需安装 spec-kit |
| checklist | `/speckit.checklist` | `$speckit-checklist` | 手动 checklist |
| plan | `/speckit.plan` | `$speckit-plan` | 需安装 spec-kit |
| tasks | `/speckit.tasks` | `$speckit-tasks` | 手动任务拆解 |
| taskstoissues | `/speckit.taskstoissues` | `$speckit-taskstoissues` | 手动在 GitHub 创建 Issues |
| analyze | `/speckit.analyze` | `$speckit-analyze` | 手动一致性核对 |
| implement | `/speckit.implement` | `$speckit-implement` | 手工实施 |
| review | 专注代码/安全审查的子任务 | 专注代码/安全审查的子任务 | 人工审查/CI |
| qa | 专注功能验证的子任务 | 专注功能验证的子任务 | 手工测试/CI |
| ship | 标准 git/PR 发布流程 | 标准 git/PR 发布流程 | 宿主常规发布流程 |

---

## 阶段主线（默认语义）

工作流阶段统一按以下主线理解，不再拆成单独的 `spec-kit` 流程或按工具拆分的评审/QA/发布流程：

```text
Phase 0  项目初始化
Phase 1  产品方向（支持简版）
Phase 2  需求规格
Phase 3  技术方案
Phase 3.5  原型验证（可选）
Phase 4  任务拆解
Phase 5  一致性分析 + TDD
Phase 5B Bug Fix 简化流
Phase 6  代码实施
Phase 7  审查
Phase 8  QA 验证
Phase 9  发布
Phase 10 复盘
```

每个阶段可按需接入不同能力：阶段顺序、验证铁律由本技能自带的横切纪律层保障（见 `ref-09`），`spec-kit` 负责规格/方案/任务/实现骨架，方向评审、架构评审、审查、QA、发布与复盘由 agent 自身或专门子任务承载（不依赖特定外部工具），外部代理编排能力负责并行执行或多模型复核，Context7 MCP 负责核对上游官方文档，`gitleaks` 负责 Secret 扫描，`memory` 负责沉淀决策与踩坑记录。

---

## 场景识别

| 用户意图 | 执行场景 |
|---------|---------|
| 新项目/方向未定/MVP 边界未定/架构重大影响 | → **场景 A** |
| 新项目，但方向已被强约束锁定 | → **场景 A（Phase 1 简版）** |
| 方向已定的新功能（多文件或新模块） | → **场景 B** |
| 小变更（小功能或 bug fix） | → **场景 C** |
| 接入存量旧项目 | → **场景 D** |
| 工具安装、配置、升级 | → **场景 E** |
| 多功能并行开发 | → **场景 F** |
| 纯视觉微调（不改逻辑/接口/路由，且改动文件 ≤ 3 个） | → **场景 G** |

意图模糊时先询问：「是 A 新项目/B 新功能/C 小变更/D 存量接入/E 工具配置升级/F 并行开发？」

---

## 场景 A：新项目（方向未定走全流程；方向已锁定走 Phase 1 简版）

> 详细流程 → `references/ref-03-full-workflow.md`；命令速查 → `references/ref-01-task-routing.md`

**执行顺序**：

**A0 项目初始化**（一次性）  
`specify init . --integration <agent-key>` → 执行 constitution → 补写 `AGENTS.md`/`CLAUDE.md`

**A1 产品方向**  
默认先做结构化访谈式规划梳理问题空间，再做结构化产品方向评审，确认 MVP 边界。若新项目方向已被合同、上级决策、既有 PRD、客户需求等外部约束锁定，则可走 **Phase 1 简版**：跳过访谈式规划，直接做结构化产品方向评审，并在 `ceo-review.md` 中写明“方向已锁定的依据”与“本次不再讨论的范围”。将结论写入 `specs/<feature-id>/ceo-review.md`。

**A2 需求规格**
执行 spec-kit 规格链路：specify → clarify → checklist。先生成初稿 → **重复澄清** 直到规格无歧义 → 推荐在 `plan` 前执行 checklist 并闭环问题；高风险或高歧义需求 MUST 执行 → 锁定 `spec.md`。
IF 任何 UI 可见变更（非纯逻辑/API 变更），THEN 视为涉及前端交互需求。
IF 涉及前端 UI/UX 且项目级 `DESIGN.md` 不存在，THEN 生成 `DESIGN.md`，遵循 Google Stitch DESIGN.md 基础格式；本工作流追加以下章节要求：`Responsive Behavior`/`Iteration Guide`。完成后 SHOULD 运行 `npx @google/design.md lint DESIGN.md` 验证格式。IF 存在，THEN 直接引用。为当前 feature 生成 `specs/<feature-id>/design-system-context.md`（MAY 降级为 `interaction-design.md` 中的 Design System Context 章节；若仅引用 ≤5 个 token，SHOULD 直接在 `interaction-design.md` 中列出 token 引用表）。
涉及前端交互需求时，本阶段 MUST 产出 `interaction-design.md`，按设计基线分级 gate（L1/L2/L3）填写对应章节。若存在可视化设计稿，按以下标准操作流处理：
1. **获取**：IF 设计稿托管于在线平台（Figma/蓝湖/其他），获取长久分享链接；IF 仅有离线文件（PDF/截图/原型包），记录文件名与存放路径
2. **记录**：将在线链接（或离线文件路径）写入 `interaction-design.md` 的「设计引用」章节（MUST，唯一主入口）
3. **拉取（可选）**：如需本地查看，临时拉取到 `specs/<feature-id>/design-assets/`，该目录须加入 `.gitignore`，不提交 Git

涉及前端交互需求时，按设计基线完整度分三级 gate：
- **L1 完整设计**：有在线设计稿（Figma/蓝湖等）或离线文件（PDF/截图/原型包）→ `interaction-design.md` 完整填写（含「设计引用」章节记录链接或文件路径），`spec.md` 锁定后进入后续阶段。
- **L2 文字+草图**：有文字需求描述 + 草图/白板照片/线框图/原型说明 → `interaction-design.md` 填写页面结构、交互流转与状态矩阵，「设计引用」标注「无正式设计稿」。可锁定 `spec.md`，Phase 6 实施前 MAY 要求补充视觉参考。
- **L3 纯文字**：仅有文字需求，无任何可视化参考 → `interaction-design.md` 填写页面结构与状态矩阵，`spec.md` 标注「视觉细节待设计确认」。`spec.md` 可锁定；进入 Phase 6 前若仍缺少 L2 级以上设计基线，MUST 返回 Phase 2 补齐并重新锁定规格。
注意：clarify 追加写入，可多次执行；specify 会覆盖整个 `spec.md`，仅在推倒重来时使用。

**A3 技术方案**
执行 spec-kit plan → 做结构化架构评审，生成 `plan.md`、`research.md`、`data-model.md`、`contracts/`、`arch-review.md`。若已产出前端交互设计，则 `plan.md` MUST 同时引用 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节），说明后续前端实现如何消费设计产物与设计系统规则。
若进入本阶段后发现任一前端设计文档或设计基线缺失，MUST 返回 Phase 2 补齐并重新锁定规格，MUST NOT 在 Phase 3+ 直接补写设计文档。

**A4 任务拆解**
执行 spec-kit tasks，生成 `tasks.md`。若已产出前端交互设计，则前端任务 MUST 基于 `interaction-design.md` 拆解，而不是只依据文字规格。前端任务 MUST 包含设计还原验证任务，明确截图/人工验收/视觉对比证据。

**A5 TDD + 实施**（详见 `§ Phase 5-6`）
执行一致性分析 → 先写失败测试 → 执行实现（必要时用外部代理编排能力并行）→ 绿灯。具体页面实现与组件开发在 Phase 6 执行，不在需求阶段提前落代码。IF 涉及前端实施，THEN Agent MUST 将 `DESIGN.md` 中的 design tokens 映射为 CSS 变量或 Tailwind 配置，MUST NOT 在组件中硬编码颜色/字体/间距值。

**A6 审查 + QA + 发布**（详见 `§ Phase 7-9`）
执行审查 → QA → 按 Phase 9 发布链路进入 CI/Review/合并/staging quick QA/production。若涉及前端交互，QA MUST 将 `interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）及「设计引用」章节中的设计基线（在线链接或离线文件路径）作为对照输入之一。若 QA 发现设计效果与目标基线不一致，MUST 返回 Phase 6 修复；若基线缺失或错误，返回 Phase 2。

**A7 复盘**  
结构化复盘 → 有价值经验写入 `memory/patterns.md`（写入前先按 `references/ref-10-experience-quality.md` 做质量判定：三镜头 + 九类垃圾排除 + 去重合并）。复盘输出末尾 MUST 执行「收尾反思两问」并如实作答：**① 眼下最没把握的是什么？② 我最大的遗漏是什么？我没意识到什么？**（前者源自 Sam Altman，后者源自 Claude；暴露本次迭代的置信度边界与盲点，不否定复盘结论）。

---

## 场景 B：方向已定的新功能（Phase 2 → 9）

> 详细流程 → `references/ref-03-full-workflow.md § Phase 2-9`

```
Phase 2：需求规格（执行 spec-kit 规格链路：specify → clarify → checklist。生成初稿 → 重复澄清至无歧义 → 推荐在 plan 前执行 checklist，高风险或高歧义需求强制执行 → 锁定 spec.md；IF 任何 UI 可见变更（非纯逻辑/API 变更），THEN 视为涉及前端交互需求，按设计基线 L1/L2/L3 分级 gate 执行，MUST 产出 `interaction-design.md`；`design-system-context.md` MAY 作为独立文件产出，也 MAY 降级为 `interaction-design.md` 章节，设计基线记录到「设计引用」章节）
Phase 3：技术方案（spec-kit plan → 结构化架构评审 → arch-review.md；若涉及前端交互，`plan.md` MUST 同时引用 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）作为实现输入）
Phase 4：任务拆解（spec-kit tasks → tasks.md；若涉及前端交互，前端任务 MUST 基于设计产物拆解；前端任务 MUST 包含设计还原验证任务）
Phase 5：一致性分析 + TDD（spec-kit analyze → 对 `spec.md`/`interaction-design.md`/`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）/`plan.md`/`tasks.md` 做一致性分析 → 先写失败测试 → 提交测试基线）
Phase 6：实施（spec-kit implement；必要时配合外部代理编排能力 → 绿灯 → 原子提交）
Phase 7：审查（执行 review；安全敏感改动追加安全专项审查）
Phase 8：QA（执行 qa → qa-reports/；feature branch 默认 diff-aware；若涉及前端交互，MUST 对照 `interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）及「设计引用」章节中的设计基线验证；若设计效果不一致 MUST 返回 Phase 6 修复，基线缺失返回 Phase 2）
Phase 9：发布（按 Phase 9 发布链路执行）
```

**关键约束**：
- 模型与推理档位遵循当前 CLI/仓库默认配置，MUST NOT 在工作流文档中硬编码固定模型分工
- 每完成一个原子任务执行 `/commit-message`，确认后再提交；提交信息格式以 `/commit-message` 技能定义为准，如需标识 task-id，可写入摘要或说明列表
- 发现规格有误 MUST 返回 Phase 2 正式修改，MUST NOT 绕过

---

## 场景 C：小变更

> bug fix 详细流程 → `references/ref-03-full-workflow.md § Phase 5B`

**C1 小功能**：单文件且**非 bug fix**，或 < 50 行净变更。从 Phase 2 开始，跳过 Phase 1（产品方向），走 Phase 2→9。若涉及 UI/UX，仍继承 Phase 2 的设计基线硬 gate。

**C2 Bug Fix**：以修复缺陷为目的时，走 **Phase 5B 简化流**，而不是复用完整 Phase 5 定义。适用于单文件或多文件修复，但不适用于新增需求或扩 scope。

```
① 先写失败/复现测试（固化问题，防止回归）
② 定位并修复
③ 用专注审查视角的子任务完成代码审查（仅审改动范围）；agent 能力不可用时改为人工审查或 CI 校验
④ 按 ref-09 Gate Function 确认测试通过（附 fresh 命令输出）
⑤ 用专注功能验证的子任务完成 QA（feature branch 默认 diff-aware；需要冒烟测试或回归测试时显式说明测试范围）；agent 能力不可用时改为人工或 CI 验证
⑥ 走标准 git/PR 发布流程；agent 能力不可用时走宿主常规发布流程
⑦ 踩坑追加写入 memory/issues.md
```

---

## 场景 D：接入存量旧项目

> 三档接入策略详情 → `references/ref-05-legacy-onboarding.md`

**三档选择**：

| 档位 | 适用场景 | 预估耗时 |
|------|---------|---------|
| A 轻量接入 | 活跃维护中，快速规范化 | 1 天内 |
| B 标准接入 | 准备规范化，有改造时间 | 1~3 天 |
| C 全面接入 | 有专项技术改造计划 | 按模块排期 |

**档位 A 最小动作**：补写 `AGENTS.md` → 建 `memory/` → 启用 Context7 MCP（无 MCP 时降级为 `use context7`/library ID/官方文档）→ 新功能走完整流程

---

## 场景 E：工具配置与升级

> 各工具安装/升级命令 → `references/ref-02-tool-stack.md`；宿主 CLI 安装与 `CC Switch` 切换 → `references/ref-08-host-installation-and-cc-switch.md`

| 工具 | 升级命令 |
|------|---------|
| specify-cli（CLI） | `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@vX.Y.Z && uv cache clean` |
| spec-kit 项目文件 | `specify init --here --force --integration <agent-key>` |
| gitleaks | `brew upgrade gitleaks` |
| oh-my-claudecode | `omc update` 或 `npm i -g oh-my-claude-sisyphus@latest`（npm 发布包名，项目品牌名相同）；刷新 config 需另跑 `omc setup` 或 `/omc-setup`（`/setup` 已在 OMC 5.0.0 移除且不留别名） |

进入场景 E 或用户明确要求时，代理 SHOULD 按 `§ 10.6` 检查能力工具版本。默认不在每次会话开始时自动升级工具。

---

## 场景 F：多功能并行开发

> Git Worktree 命令 + OMC 多代理选型 → `references/ref-06-branch-parallel.md`

```bash
# 开两条并行 feature 线
git worktree add ../project-feature-a username_a/feature/report-page
git worktree add ../project-feature-b username_b/feature/auth-refactor

# 各自独立 Claude Code 实例
cd ../project-feature-a && claude
cd ../project-feature-b && claude
```

**代理架构选择**：

| 场景 | 方案 |
|------|------|
| 同一任务内多模型分工实现 | `/team`（Claude Code 会话内团队编排）或宿主等价能力 |
| 启动 Codex/Gemini CLI worker | `omc team N:codex "..."`/`omc team N:gemini "..."`（`/omc-teams` 已在 OMC 5.0.0 移除且不留别名） |
| 同一 diff 多模型交叉审查 | `/ask codex` + `/ask gemini`（或宿主等价交叉评审能力） |
| 并行功能开发 | 多个独立代理实例（各自 worktree） |

---

## 场景 G：UI 快车道（纯视觉微调）

**适用条件**（MUST 同时满足）：
- 改动仅涉及视觉层：颜色、间距、字号、图标、文案、排版
- 不新增组件、不改逻辑、不改接口、不改路由
- 改动文件 ≤ 3 个

IF 以上任一条件不满足，THEN MUST 退回场景 B 或 C，走完整流程。

**执行顺序**：

```
① 用一句话描述要改什么（不需要写 spec.md）
② Phase 6：直接实施改动
③ Phase 8：视觉 Review（截图对比或人工确认）
④ Phase 9：按常规发布流程上线
```

**不产出** `spec.md`/`plan.md`/`tasks.md`，改动记录写入 commit message 即可。

---

## 项目定制层（推荐模式）

技能本身定义通用工作流。各接入项目 SHOULD 通过**薄定制层**记录项目特有信息，而非维护完整副本：

```
memory/workflow.md              ← 项目定制层（参考技能，记录本地增量）
```

### 定制层内容

| 内容 | 说明 | 示例 |
|------|------|------|
| 命令映射 | 本项目能用的具体宿主命令 | `/speckit.specify` vs `specify`，评审/QA/发布 agent 能力不可用时的降级路径 |
| 文档路径 | 本项目实际文件布局 | `specs/<id>/spec.md`、`memory/decisions.md` |
| 工具可用性 | 各工具是否安装、降级策略 | 评审/QA/发布 agent 能力不可用 → 人工审查 / CI |

### 模板

```markdown
# AI Coding Workflow（项目定制层）

> 完整工作流定义见技能文档：`~/.claude/skills/ai-coding-workflow/SKILL.md`
> 本文档只记录本项目特有的定制信息，不重复通用定义。

## 命令映射

| 动作 | 本项目命令 |
|------|-----------|
| 规格 | ... |
| 方案 | ... |

## 文档路径

| 产物 | 本项目路径 | 阶段 |
|------|-----------|------|
| 需求规格 | ... | Phase 2 |
| 技术方案 | ... | Phase 3 |

## 工具可用性

| 工具 | 状态 | 降级策略 |
|------|------|---------|
| 评审/QA/发布能力 | agent 无法执行对应子任务 | 人工审查 / CI |
| Context7 MCP | 已配置 | 按技能规则 |
```

**收益**：
- **自动继承更新**：技能迭代（Phase 新增、场景调整）无需手动同步
- **零维护成本**：不存储通用定义，不产生重复内容
- **上下文聚焦**：AI 直接从定制层获取路径和命令，需要细节时去读技能

---

## AI 治理（核心边界）

> 完整规则 → `references/ref-04-governance-checklist.md §3`；进阶实践（测试分层/依赖安全/合规/成本）→ `references/ref-07-advanced-practices.md`

- 客户数据、生产数据、密钥 MUST NOT 发送给任何模型
- AI MUST NOT 在无人工批准的情况下直接执行生产发布、回滚、权限变更、数据库迁移
- AI 生成内容一律视为待确认产物，最终责任 MUST 由人工承担

---

## 初次配置（全局强制生效）

技能部署后属于按需触发。若需在**所有项目**中自动强制遵守，按所用 AI agent 选择对应配置步骤。

---

### Claude Code

在 `~/.claude/CLAUDE.md` 末尾追加以下内容：

```markdown
## AI Coding 工作流（强制遵守）

1. 进行开发任务时，默认使用 `~/.claude/skills/ai-coding-workflow/SKILL.md`。
2. “工作流”指统一的 AI Coding Workflow，按 `Phase 0~10/Phase 5B` 顺序推进，不把 spec-kit 或按工具拆分的评审/QA/发布视为分离流程。
3. Phase 退出条件未满足前不得进入下一 Phase；任何完成/通过宣称 MUST 附 fresh 验证命令输出（见技能 `ref-09-verification-gate.md`）——验证纪律内置于本技能，任何有能力的 agent 原生遵守，不依赖外部插件。
4. 阶段内可按需使用 spec-kit、agent 自身承载的评审/QA/发布等能力、外部代理编排、Context7 MCP、gitleaks、memory 等能力。
5. 意图模糊时，先判断场景：新项目/新功能/小变更/存量接入/工具升级/并行开发。
```

**验证**：新开一个对话，说「帮我做一个功能」，确认 Claude 会主动询问任务类型，而不是直接写代码。

---

### OpenAI Codex CLI

在 `~/.codex/AGENTS.md` 末尾追加以下内容（文件不存在则新建）：

```markdown
## AI Coding 工作流（强制遵守）

1. 进行开发任务时，默认使用 `<your-skills-path>/ai-coding-workflow/SKILL.md`。
2. “工作流”指统一的 AI Coding Workflow，按 `Phase 0~10/Phase 5B` 顺序推进，不把 spec-kit 或按工具拆分的评审/QA/发布视为分离流程。
3. Phase 退出条件未满足前不得进入下一 Phase；任何完成/通过宣称 MUST 附 fresh 验证命令输出（见技能 `ref-09-verification-gate.md`）——验证纪律内置于本技能，任何有能力的 agent 原生遵守，不依赖外部插件。
4. 阶段内可按需使用 spec-kit、agent 自身承载的评审/QA/发布等能力、外部代理编排、Context7 MCP、gitleaks、memory 等能力。
5. 意图模糊时，先判断场景：新项目/新功能/小变更/存量接入/工具升级/并行开发。
6. Codex CLI 中 spec-kit 使用 `$speckit-*`；评审/QA/发布优先用 Codex 原生等价 agent 能力，均不可用时降级为人工审查、测试命令或 CI。
```

**验证**：新开一个 Codex CLI 会话，说「帮我做一个功能」，确认会主动询问任务类型。

---

### 其他 Agent

各 Agent 全局配置文件写入内容与上方 Claude Code 版内容块一致，将技能路径替换为实际路径；若宿主存在命令映射差异，再补充一行最小必要说明。

| Agent | 全局配置文件 |
|-------|-------------|
| Google Gemini CLI | `~/.gemini/GEMINI.md` |
| Cursor | `~/.cursor/rules/ai-coding-workflow.mdc` |
| Windsurf | 项目级 `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

---

## 参与贡献

仓库地址：https://github.com/liuhean2021/Anan-Agent-Skills
技能目录：`skills/ai-coding-workflow/`
