# §0 规范导言 + §1 任务路由 + §4 文档结构

> 适用：行为规范约定、任务分流决策、命令快速检索、产出文件路径定位

---

## 规范导言（加载即生效）

本文档是 AI 编程代理的行为规范。加载后须遵守以下约定：

- **工具维护（按需执行）**：代理在进入工具维护/升级场景，或用户明确要求时，SHOULD 检查能力工具版本（详见 `ref-02-tool-stack.md § 10.6`）；默认不在加载文档后自动升级工具。
- **验证纪律始终生效**：阶段顺序、完成必验证等规则内置于本技能（见 `ref-09-verification-gate.md`），任何有能力的 agent 原生遵守，不依赖任何外部插件是否安装。与 Agent 种类无关。
- **阶段顺序**：Phase 按 `ref-03-full-workflow.md` 文档顺序推进；当前 Phase 退出条件未满足前 MUST NOT 进入下一 Phase。详见 `ref-09-verification-gate.md § 13.2`。
- **验证铁律**：任何完成/通过类宣称 MUST 附本消息内 freshly run 的验证命令输出。详见 `ref-09-verification-gate.md § 13.3`。
- 规范性关键词含义：**MUST** = 强制执行；**MUST NOT** = 严禁；**SHOULD** = 强烈推荐，有正当理由可偏离；**MAY** = 可选
- 术语定义：
  - **小功能（small change）**：单文件且非 bug fix，或 < 50 行净变更
  - **新功能（new feature）**：涉及多文件 或 新模块
- 每个 Phase 均明确说明：进入条件、必做动作、产出物、退出条件
- 产出物写入规则：Phase 结束后，代理 MUST 主动将指定内容写入对应文件路径，无需等待人工提示
- WHEN/IF/THEN 结构用于描述条件分支逻辑

---

## Section 1：任务路由（Task Routing）

### 1.1 任务类型 → Phase 起点

WHEN 收到新任务时，代理 MUST 先按下表确定起始 Phase，再执行后续步骤。

| 任务类型 | 起始 Phase |
|---------|-----------|
| 新项目首次配置 | Phase 0（项目初始化） |
| 方向未定/MVP 边界未定/有架构或业务重大影响的需求 | Phase 1 → Phase 10 全流程 |
| 新项目或新功能，但方向已被强约束锁定 | Phase 1（简版）→ Phase 9 |
| 需求清晰的新功能（multi-file 或新模块） | Phase 2 → Phase 9 |
| 小变更 C1：小功能（单文件且非 bug fix，或 < 50 行净变更） | Phase 2 → Phase 9 |
| 小变更 C2：bug fix（以修复缺陷为目的，不论单文件或多文件） | Phase 5B：Bug Fix 简化流 |
| 使用新版本库、AI 给出错误 API | 优先使用 Context7 MCP 自动文档查验；无 MCP 时降级为 `use context7`/library ID/官方文档 |
| 多个功能并行开发 | 参见 Section 9：并行开发（ref-06） |

### 1.2 各阶段命令速查

| 阶段 | 命令 | 工具 | 产出文档（精确路径） |
|------|------|------|---------|
| 项目初始化（一次性，在项目根目录执行） | `specify init . --integration <agent-key>` | spec-kit | `.specify/` 目录 |
| 产品方向 | 结构化访谈式规划（问题仍模糊时）→ 结构化产品方向评审 | agent 自身能力 | `specs/<feature-id>/ceo-review.md` |
| 需求规格 | `/speckit.specify` | spec-kit | `specs/<feature-id>/spec.md` |
| 澄清需求 | `/speckit.clarify` | spec-kit | `specs/<feature-id>/spec.md`（追加） |
| 规格质量清单 | `/speckit.checklist` | spec-kit | `specs/<feature-id>/checklists/` |
| 前端交互设计归档（如适用） | 与规格链路同步完成 | 手动/设计工具/agent 辅助评审 | `specs/<feature-id>/interaction-design.md`（按 L1/L2/L3 分级填写；设计基线记录于「设计引用」章节；`design-system-context.md` MAY 降级为其中章节）；如需本地查看，临时拉取到 `specs/<feature-id>/design-assets/`（不提交 Git） |
| 技术方案 | `/speckit.plan` | spec-kit | `specs/<feature-id>/plan.md` `specs/<feature-id>/research.md` `specs/<feature-id>/contracts/` |
| 架构评审 | 结构化架构评审 | agent 自身能力 | `specs/<feature-id>/arch-review.md` |
| 原型验证（可选） | 手动指导 AI 搭建原型，快速验证方向和盲区 | 手动/AI | 原型代码（不提交主仓库）、`plan.md`（追加原型验证记录） |
| 任务拆解 | `/speckit.tasks` | spec-kit | `specs/<feature-id>/tasks.md` |
| 转 GitHub Issues（可选） | Claude `/speckit.taskstoissues`；Codex `$speckit-taskstoissues`（tasks 后、implement 前） | spec-kit | GitHub Issues 列表 |
| 一致性检查 | `/speckit.analyze`（在 tasks 之后） | spec-kit | — |
| 代码实现 | Claude 用 `/speckit.implement`；Codex 用 `$speckit-implement`；外部代理编排能力按需 | spec-kit + 外部代理编排能力 | 原子提交 |
| 代码+安全审查 | 由专注审查视角的子任务完成（安全敏感改动追加安全专项审查；按需使用外部代理编排能力并行复核 + gitleaks）；agent 能力不可用时人工审查/CI 替代 | agent 自身能力 + 外部代理编排能力 | `specs/<feature-id>/review-findings.md` |
| QA 验证 | 由专注功能验证的子任务完成（feature branch 默认 diff-aware）；agent 能力不可用时人工或 CI 验证；UI/UX 不一致时 Phase 8 失败并返回 Phase 6，基线缺失返回 Phase 2 | agent 自身能力 | `specs/<feature-id>/qa-reports/` |
| 发布 | 走标准 git/PR 发布流程；agent 能力不可用时宿主常规发布流程 | agent 自身能力 | PR + CHANGELOG |
| 周复盘 | 结构化复盘产出 | agent 自身能力 | `.context/retros/` |

> 产出文档标注"★"的阶段：命令结束后，代理 MUST 将输出内容写入对应文件路径（见各 Phase 说明）。

### 1.3 场景 → 命令映射

| 目标场景 | 使用命令 |
|---------|--------|
| 方向判断/MVP 收敛 | 结构化访谈式规划（需求仍模糊时）→ 结构化产品方向评审 |
| 需求落规格 | Claude 用 `/speckit.specify` → `/speckit.clarify` → `/speckit.checklist`；Codex 用 `$speckit-specify` → `$speckit-clarify` → `$speckit-checklist` |
| 前端交互需求落规格 | spec-kit 规格链路 + 按 L1/L2/L3 分级补齐 `interaction-design.md`（设计基线记录于「设计引用」章节）+ `design-system-context.md`（MAY 降级为 `interaction-design.md` 章节）；复杂交互建议追加一次结构化设计评审 |
| 新项目或新功能：方向未定时先做方向判断，再落规格 | 结构化访谈式规划 → 结构化产品方向评审 → spec-kit 规格链路 |
| 新项目或新功能：方向已定时快速落规格 | 结构化产品方向评审（简版，可选）→ spec-kit 规格链路 |
| 生成技术方案 | Claude 用 `/speckit.plan`；Codex 用 `$speckit-plan` → 结构化架构评审 |
| 规格质量检查 | `/speckit.checklist` |
| 拆解任务 | Claude 用 `/speckit.tasks`；Codex 用 `$speckit-tasks` |
| 转 GitHub Issues（可选） | Claude `/speckit.taskstoissues`；Codex `$speckit-taskstoissues` |
| 实施前一致性分析 | Claude 用 `/speckit.analyze`；Codex 用 `$speckit-analyze` |
| 代码实现（任务明确） | Claude 用 `/speckit.implement`；Codex 用 `$speckit-implement` |
| 代码实现（需并行外部 agent） | 使用外部代理编排能力（例如 `/team`、`omc team N:codex "..."`、`/omc-teams` 兼容入口或宿主等价能力） |
| 代码实现（需专业判断） | 在 `plan.md`/`arch-review.md` 中先明确判断结论；必要时使用外部代理编排能力复核 |
| 代码审查 | 由专注审查视角的子任务完成；安全敏感改动追加安全专项审查；按需使用外部代理编排能力交叉复核；agent 能力不可用时人工审查/CI 替代 |
| 功能测试 | 由专注功能验证的子任务完成（feature branch 默认 diff-aware）；agent 能力不可用时人工或 CI 验证；UI/UX 不一致时返回 Phase 6 修复，基线缺失返回 Phase 2 |
| 发布上线 | 按 `ref-03-full-workflow.md` 的 Phase 9 发布链路执行 |
| 问题回滚 | `git revert HEAD` + 标准发布流程 |
| 记录架构决策 | 写入 `memory/decisions.md` |
| 记录已知问题 | 写入 `memory/issues.md` |
| 生成 commit 信息 | `/commit-message` |

---

## Section 4：文档结构（Document Layout）

`ceo-review.md` 是决策文档，负责确认方向、MVP 边界与非目标范围；`spec.md` 是规格文档，负责将已确认方向转成可执行、可验收的需求定义。

> 代理 MUST 在对应 Phase 结束后，将产出内容写入下表标注的精确路径，无需等待人工确认。

当前 spec-kit 目录架构分为两层：`.specify/` 保存模板、脚本、constitution、扩展与预设等框架元数据；业务级 feature 文档统一放在项目根目录 `specs/<feature-id>/` 下，包含 `spec.md`、`interaction-design.md`、`plan.md`、`tasks.md`、`checklists/`、`contracts/` 等实际交付物；`design-assets/` 仅作本地临时缓存（加入 `.gitignore`，不提交 Git）。

### 文件路径速查表（精确路径，代理直接使用）

| 文件/目录 | 精确路径（相对项目根目录） | 由谁写入 | 对应 Phase |
|------------|--------------------------|---------|-----------|
| AI 角色定义 | `AGENTS.md` 或 `CLAUDE.md` | 手动维护 | Phase 0 |
| spec-kit 初始化参数 | `.specify/init-options.json` | specify init 自动生成 | Phase 0 |
| 项目原则 | `.specify/memory/constitution.md` | `/speckit.constitution` | Phase 0 |
| 自动化脚本（macOS/Linux） | `.specify/scripts/bash/*.sh` | specify init 自动生成 | Phase 0 |
| 自动化脚本（Windows） | `.specify/scripts/powershell/*.ps1` | specify init 自动生成 | Phase 0 |
| 核心模板 | `.specify/templates/*.md` | specify init 自动生成 | Phase 0 |
| 项目级模板覆盖 | `.specify/templates/overrides/` | 手动维护 | 按需 |
| 已安装扩展 | `.specify/extensions/<ext-id>/` | `specify extension add` | 按需 |
| 扩展目录配置 | `.specify/extension-catalogs.yml` | 手动维护 | 按需 |
| 已安装预设 | `.specify/presets/<preset-id>/` | `specify preset add` | 按需 |
| 预设目录配置 | `.specify/preset-catalogs.yml` | 手动维护 | 按需 |
| 产品方向结论 | `specs/<feature-id>/ceo-review.md` | 代理写入 | Phase 1 |
| 需求规格 | `specs/<feature-id>/spec.md` | `/speckit.specify` | Phase 2 |
| 验收 checklist | `specs/<feature-id>/checklists/` | `/speckit.checklist` | Phase 2 |
| 项目级设计系统规范 | `DESIGN.md` | 代理写入/首次自动生成（遵循 Google Stitch DESIGN.md 基础格式；本工作流追加以下章节要求：`Responsive Behavior`/`Iteration Guide`；参考 https://github.com/VoltAgent/awesome-design-md，完成后 SHOULD 运行 `npx @google/design.md lint` 验证） | Phase 2 |
| 功能级设计系统上下文 | `specs/<feature-id>/design-system-context.md` | 代理写入（MAY 降级为 `interaction-design.md` 中的 Design System Context 章节；若仅引用 ≤5 个 token，SHOULD 直接列出 token 引用表） | Phase 2 |
| 前端交互设计说明 | `specs/<feature-id>/interaction-design.md` | 代理写入 | Phase 2 |
| 前端设计资料目录（本地临时缓存，不提交 Git） | `specs/<feature-id>/design-assets/` | 需求阶段临时拉取 | Phase 2 |
| 前端设计来源索引（可选，次选） | `specs/<feature-id>/source-links.md` | 设计基线 MUST 写入 `interaction-design.md`「设计引用」章节（唯一主入口）；`source-links.md` 仅为多链接索引的 MAY 级备份 | Phase 2 |
| 技术实现方案 | `specs/<feature-id>/plan.md` | `/speckit.plan` | Phase 3 |
| 技术调研（决策追溯） | `specs/<feature-id>/research.md` | `/speckit.plan`（计划后同步完善） | Phase 3 |
| 数据模型 | `specs/<feature-id>/data-model.md` | `/speckit.plan` | Phase 3 |
| API 契约 | `specs/<feature-id>/contracts/` | `/speckit.plan` | Phase 3 |
| 架构评审 | `specs/<feature-id>/arch-review.md` | 代理写入 | Phase 3 |
| 原子任务列表 | `specs/<feature-id>/tasks.md` | `/speckit.tasks` | Phase 4 |
| 状态覆盖矩阵（IF 多状态/生命周期对象适用） | `specs/<feature-id>/checklists/state-coverage.md` | 代理写入（Phase 8 QA 辅助） | Phase 8 |
| 审查发现 | `specs/<feature-id>/review-findings.md` | 代理写入 | Phase 7 |
| 架构决策 ADR | `memory/decisions.md` | 代理追加 | Phase 3/Phase 6 |
| 已知问题 | `memory/issues.md` | 代理追加 | Phase 6/bug fix |
| 项目代码模式 | `memory/patterns.md`（写入前按 `ref-10-experience-quality.md` 判定） | 代理追加 | Phase 10 |
| QA 报告 + 截图 | `specs/<feature-id>/qa-reports/` | QA 验证自动生成 | Phase 8 |
| 发布日志 | `CHANGELOG.md` | 发布流程自动生成 | Phase 9 |
| 周复盘快照 | `.context/retros/` | 复盘产出自动生成 | Phase 10 |

> 所有前端设计文档和设计基线只允许在 Phase 2/spec 阶段创建、补齐和锁定。Phase 3 之后只消费这些文档；若发现缺失、失效或错误，MUST 返回 Phase 2 修正，MUST NOT 在技术方案、任务拆解、实施、审查或 QA 阶段临场补写设计文档。`design-system-context.md` MAY 降级为 `interaction-design.md` 中的 Design System Context 章节。设计基线按 L1/L2/L3 分级 gate 判定，L3 级允许以文字需求锁定 spec.md；进入 Phase 6 前若仍缺少 L2 级以上基线，MUST 返回 Phase 2 补齐并重新锁定规格。

> `<feature-id>` 格式为 `NNN-feature-name`，例如 `001-user-auth`。spec-kit 根据当前 Git 分支名自动检测 feature-id；分布式团队可加 `--branch-numbering timestamp` 使用时间戳编号避免分支编号冲突；非 Git 环境可设置环境变量 `SPECIFY_FEATURE=001-feature-name` 手动指定。
