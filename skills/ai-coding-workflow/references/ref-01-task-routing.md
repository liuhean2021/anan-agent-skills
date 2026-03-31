# §0 规范导言 + §1 任务路由 + §4 文档结构

> 来源：ai-coding-workflow-best-practices.md 导言、§1–§4
> 适用：行为规范约定、任务分流决策、命令快速检索、产出文件路径定位

---

## 规范导言（加载即生效）

本文档是 AI 编程代理的行为规范。加载后须遵守以下约定：

- **工具维护（按需执行）**：代理在进入工具维护/升级场景，或用户明确要求时，SHOULD 检查核心工具版本（详见 `ref-02-tool-stack.md § 10.7`）；默认不在加载文档后自动升级工具。
- 规范性关键词含义：**MUST** = 强制执行；**MUST NOT** = 严禁；**SHOULD** = 强烈推荐，有正当理由可偏离；**MAY** = 可选
- 术语定义：
  - **小功能（small change）**：单文件且非 bug fix，或 < 50 行净变更
  - **新功能（new feature）**：涉及多文件 或 新模块
- 每个 Phase 均明确说明：进入条件、必做动作、产出物、退出条件
- 产出物写入规则：Phase 结束后，代理 MUST 主动将指定内容写入对应文件路径，无需等待人工提示
- WHEN / IF / THEN 结构用于描述条件分支逻辑

---

## Section 1：任务路由（Task Routing）

### 1.1 任务类型 → Phase 起点

WHEN 收到新任务时，代理 MUST 先按下表确定起始 Phase，再执行后续步骤。

| 任务类型 | 起始 Phase |
|---------|-----------|
| 新项目首次配置 | Phase 0（项目初始化） |
| 方向未定 / MVP 边界未定 / 有架构或业务重大影响的需求 | Phase 1 → Phase 10 全流程 |
| 新项目或新功能，但方向已被强约束锁定 | Phase 1（简版）→ Phase 9 |
| 需求清晰的新功能（multi-file 或新模块） | Phase 2 → Phase 9 |
| 小变更 C1：小功能（单文件且非 bug fix，或 < 50 行净变更） | Phase 2 → Phase 9 |
| 小变更 C2：bug fix（以修复缺陷为目的，不论单文件或多文件） | Phase 5B：Bug Fix 简化流 |
| 使用新版本库、AI 给出错误 API | 在提示词末尾追加 `use context7` |
| 多个功能并行开发 | 参见 Section 9：并行开发（ref-06） |

### 1.2 各阶段命令速查

| 阶段 | 命令 | 工具 | 产出文档（精确路径） |
|------|------|------|---------|
| 项目初始化（一次性，在项目根目录执行） | `specify init . --ai <your-agent>` | spec-kit | `.specify/` 目录 |
| 产品方向 | `/office-hours`（问题仍模糊时）→ `/plan-ceo-review` | gstack | `specs/<feature-id>/ceo-review.md` |
| 需求规格 | `/speckit.specify` | spec-kit | `specs/<feature-id>/spec.md` |
| 澄清需求 | `/speckit.clarify` | spec-kit | `specs/<feature-id>/spec.md`（追加） |
| 规格质量清单 | `/speckit.checklist` | spec-kit | `specs/<feature-id>/checklists/` |
| 前端交互设计归档（如适用） | 与规格链路同步完成 | 手动 / 设计工具 / gstack | `specs/<feature-id>/interaction-design.md` `specs/<feature-id>/design-assets/` |
| 技术方案 | `/speckit.plan` | spec-kit | `specs/<feature-id>/plan.md` `specs/<feature-id>/research.md` `specs/<feature-id>/contracts/` |
| 架构评审 | `/plan-eng-review` | gstack | `specs/<feature-id>/arch-review.md` |
| 任务拆解 | `/speckit.tasks` | spec-kit | `specs/<feature-id>/tasks.md` |
| 一致性检查 | `/speckit.analyze`（在 tasks 之后） | spec-kit | — |
| 代码实现 | Claude 用 `/speckit.implement`；Codex 用 `$speckit-implement`；外部代理编排能力按需 | spec-kit + 外部代理编排能力 | 原子提交 |
| 代码+安全审查 | 已安装 gstack 时执行 `/review` + security-engineer + 外部代理编排能力并行复核 + gitleaks；否则人工审查 / CI 替代 | gstack + agency + 外部代理编排能力 | `specs/<feature-id>/review-findings.md` |
| QA 验证 | 已安装 gstack 时执行 `/qa`（feature branch 默认 diff-aware）；否则人工或 CI 验证 | gstack | `.gstack/qa-reports/` |
| 发布 | 已安装 gstack 时执行 `/ship`；否则宿主常规发布流程 | gstack | PR + CHANGELOG |
| 周复盘 | `/retro` | gstack | `.context/retros/` |

> 产出文档标注"★"的阶段：命令结束后，代理 MUST 将输出内容写入对应文件路径（见各 Phase 说明）。

### 1.3 场景 → 命令映射

| 目标场景 | 使用命令 |
|---------|--------|
| 方向判断 / MVP 收敛 | `/office-hours`（需求仍模糊时）→ `/plan-ceo-review` |
| 需求落规格 | Claude 用 `/speckit.specify` → `/speckit.clarify` → `/speckit.checklist`；Codex 用 `$speckit-specify` → `$speckit-clarify` → `$speckit-checklist` |
| 前端交互需求落规格 | spec-kit 规格链路 + 补齐 `interaction-design.md`、`design-assets/`；复杂交互建议追加 `/plan-design-review` |
| 新项目或新功能：方向未定时先做方向判断，再落规格 | `/office-hours` → `/plan-ceo-review` → spec-kit 规格链路 |
| 新项目或新功能：方向已定时快速落规格 | `/plan-ceo-review`（简版，可选）→ spec-kit 规格链路 |
| 生成技术方案 | Claude 用 `/speckit.plan`；Codex 用 `$speckit-plan` → `/plan-eng-review` |
| 规格质量检查 | `/speckit.checklist` |
| 拆解任务 | Claude 用 `/speckit.tasks`；Codex 用 `$speckit-tasks` |
| 实施前一致性分析 | Claude 用 `/speckit.analyze`；Codex 用 `$speckit-analyze` |
| 代码实现（任务明确） | Claude 用 `/speckit.implement`；Codex 用 `$speckit-implement` |
| 代码实现（需并行外部 agent） | 使用外部代理编排能力（例如 `/oh-my-claudecode:team`、`/oh-my-claudecode:omc-teams` 或宿主等价能力） |
| 代码实现（需专业判断） | agency-agents 对应角色 |
| 代码审查 | 已安装 gstack 时执行 `/review` + security-engineer + 外部代理编排能力交叉复核（按需并行）；否则人工审查 / CI 替代 |
| 功能测试 | 已安装 gstack 时执行 `/qa`（feature branch 默认 diff-aware）；否则人工或 CI 验证 |
| 发布上线 | 按 `ref-03-full-workflow.md` 的 Phase 9 发布链路执行 |
| 问题回滚 | `git revert HEAD` + `/ship` |
| 记录架构决策 | 写入 `memory/decisions.md` |
| 记录已知问题 | 写入 `memory/issues.md` |
| 生成 commit 信息 | `/commit-message` |

---

## Section 4：文档结构（Document Layout）

`ceo-review.md` 是决策文档，负责确认方向、MVP 边界与非目标范围；`spec.md` 是规格文档，负责将已确认方向转成可执行、可验收的需求定义。

> 代理 MUST 在对应 Phase 结束后，将产出内容写入下表标注的精确路径，无需等待人工确认。

当前 spec-kit 目录架构分为两层：`.specify/` 保存模板、脚本、constitution、扩展与预设等框架元数据；业务级 feature 文档统一放在项目根目录 `specs/<feature-id>/` 下，包含 `spec.md`、`interaction-design.md`、`design-assets/`、`plan.md`、`tasks.md`、`checklists/`、`contracts/` 等实际交付物。

### 文件路径速查表（精确路径，代理直接使用）

| 文件 / 目录 | 精确路径（相对项目根目录） | 由谁写入 | 对应 Phase |
|------------|--------------------------|---------|-----------|
| AI 角色定义 | `AGENTS.md` 或 `CLAUDE.md` | 手动维护 | Phase 0 |
| spec-kit 初始化参数 | `.specify/init-options.json` | specify init 自动生成 | Phase 0 |
| 项目原则 | `.specify/memory/constitution.md` | `/speckit.constitution` | Phase 0 |
| 自动化脚本（macOS/Linux） | `.specify/scripts/bash/*.sh` | specify init 自动生成 | Phase 0 |
| 自动化脚本（Windows） | `.specify/scripts/powershell/*.ps1` | specify init 自动生成 | Phase 0 |
| 核心模板 | `.specify/templates/*.md` | specify init 自动生成 | Phase 0 |
| 项目级模板覆盖 | `.specify/templates/overrides/` | 手动维护 | 按需 |
| 已安装扩展 | `.specify/extensions/<ext-id>/` | `specify extension add` | 按需 |
| 已安装预设 | `.specify/presets/<preset-id>/` | `specify preset add` | 按需 |
| 产品方向结论 | `specs/<feature-id>/ceo-review.md` | 代理写入 | Phase 1 |
| 需求规格 | `specs/<feature-id>/spec.md` | `/speckit.specify` | Phase 2 |
| 验收 checklist | `specs/<feature-id>/checklists/` | `/speckit.checklist` | Phase 2 |
| 前端交互设计说明 | `specs/<feature-id>/interaction-design.md` | 代理写入 | Phase 2 |
| 前端设计资料目录 | `specs/<feature-id>/design-assets/` | 代理整理 / 设计工具导出 | Phase 2 |
| 前端设计来源索引 | `specs/<feature-id>/design-assets/source-links.md` | 代理写入 | Phase 2 |
| 技术实现方案 | `specs/<feature-id>/plan.md` | `/speckit.plan` | Phase 3 |
| 技术调研 | `specs/<feature-id>/research.md` | `/speckit.plan` | Phase 3 |
| 数据模型 | `specs/<feature-id>/data-model.md` | `/speckit.plan` | Phase 3 |
| API 契约 | `specs/<feature-id>/contracts/` | `/speckit.plan` | Phase 3 |
| 架构评审 | `specs/<feature-id>/arch-review.md` | 代理写入 | Phase 3 |
| 原子任务列表 | `specs/<feature-id>/tasks.md` | `/speckit.tasks` | Phase 4 |
| 审查发现 | `specs/<feature-id>/review-findings.md` | 代理写入 | Phase 7 |
| 架构决策 ADR | `memory/decisions.md` | 代理追加 | Phase 3 / Phase 6 |
| 已知问题 | `memory/issues.md` | 代理追加 | Phase 6 / bug fix |
| 项目代码模式 | `memory/patterns.md` | 代理追加 | Phase 10 |
| QA 报告 + 截图 | `.gstack/qa-reports/` | `/qa` 自动生成 | Phase 8 |
| 发布日志 | `CHANGELOG.md` | `/ship` 自动生成 | Phase 9 |
| 周复盘快照 | `.context/retros/` | `/retro` 自动生成 | Phase 10 |

> `<feature-id>` 格式为 `NNN-feature-name`，例如 `001-user-auth`。spec-kit 根据当前 Git 分支名自动检测 feature-id；非 Git 环境可设置环境变量 `SPECIFY_FEATURE=001-feature-name` 手动指定。
