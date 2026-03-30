---
name: ai-coding-workflow
description: 当用户需要统一的 AI 编程工作流时使用，涵盖新项目、新功能、bug fix、规划、代码审查、QA、发布及存量项目接入，代理据此将任务路由至正确的上游工具（spec-kit / gstack）和对应阶段。
---

> **⚠️ 初次安装必做**：将本技能加入全局强制规则 → 跳至文末「[初次配置](#初次配置全局强制生效)」章节，完成后再回来阅读。

> 详细说明、命令参考、模板按场景拆分为以下文件：
>
> | 文件 | 内容 |
> |------|------|
> | `references/ref-01-task-routing.md` | §1 任务路由（任务类型→Phase表、命令速查、场景→命令映射）+ §4 文档结构（文件路径速查表） |
> | `references/ref-02-tool-stack.md` | §2 工具体系总览 + §10 各工具详细说明（spec-kit/gstack/agency/OMC/gitleaks/自检）+ §11 参考来源 |
> | `references/ref-03-full-workflow.md` | §5 完整开发工作流 Phase 0~10（含 ceo-review 模板、spec 模板） |
> | `references/ref-04-governance-checklist.md` | §3 AI治理（数据边界/高风险操作/人工责任/留痕）+ §6 最佳实践清单（5组 checklist） |
> | `references/ref-05-legacy-onboarding.md` | §7 存量项目接入（三档策略 A/B/C + Bug Fix 简化流程） |
> | `references/ref-06-branch-parallel.md` | §8 分支策略（主干开发、PR合并规则）+ §9 并行开发（Git Worktree + OMC 多代理选型） |
> | `references/ref-07-advanced-practices.md` | §12 进阶实践（P1 测试分层/依赖安全/DORA/Hooks；P2 AI信任边界/环境策略/合规审查/成本管理） |

# AI Coding 工作流

**核心原则**：规格驱动 → 测试先行 → 最小改动 → 审查验证 → 持续复盘  
**适用**：Claude Code CLI 主导的 AI 辅助开发（新项目 / 新功能 / bug fix / 存量接入）

工具层级：spec-kit（规格）→ agency-agents（专业角色）→ gstack（评审验证）→ 外部代理编排能力（例如 OMC）

## 命令映射

正文优先描述“动作”，不重复绑定宿主命令；具体命令按下表选择：

| 动作 | Claude Code | Codex CLI | gstack 不可用时 |
|------|-------------|-----------|----------------|
| constitution | `/speckit.constitution` | `$speckit-constitution` | 手动维护项目原则 |
| specify | `/speckit.specify` | `$speckit-specify` | 需安装 spec-kit |
| clarify | `/speckit.clarify` | `$speckit-clarify` | 需安装 spec-kit |
| checklist | `/speckit.checklist` | `$speckit-checklist` | 手动 checklist |
| plan | `/speckit.plan` | `$speckit-plan` | 需安装 spec-kit |
| tasks | `/speckit.tasks` | `$speckit-tasks` | 手动任务拆解 |
| analyze | `/speckit.analyze` | `$speckit-analyze` | 手动一致性核对 |
| implement | `/speckit.implement` | `$speckit-implement` | 手工实施 |
| review | `/review` | `/review`（若 host 已装 gstack） | 人工审查 / CI |
| qa | `/qa` | `/qa`（若 host 已装 gstack） | 手工测试 / CI |
| ship | `/ship` | `/ship`（若 host 已装 gstack） | 宿主常规发布流程 |

---

## 场景识别

| 用户意图 | 执行场景 |
|---------|---------|
| 新项目 / 方向未定 / MVP 边界未定 / 架构重大影响 | → **场景 A** |
| 方向已定的新功能（多文件或新模块） | → **场景 B** |
| 小变更（小功能或 bug fix） | → **场景 C** |
| 接入存量旧项目 | → **场景 D** |
| 工具安装、配置、升级 | → **场景 E** |
| 多功能并行开发 | → **场景 F** |

意图模糊时先询问：「是 A 新项目 / B 新功能 / C 小变更 / D 存量接入 / E 工具配置升级 / F 并行开发？」

---

## 场景 A：新项目 / 方向未定（Phase 0 → 10 全流程）

> 详细流程 → `references/ref-03-full-workflow.md`；命令速查 → `references/ref-01-task-routing.md`

**执行顺序**：

**A0 项目初始化**（一次性）  
`specify init . --ai <your-agent>` → 执行 constitution → 补写 `AGENTS.md` / `CLAUDE.md`

**A1 产品方向**  
先用 `/office-hours` 梳理问题空间，再执行 `/plan-ceo-review`，确认 MVP 边界。将结论写入 `specs/<feature-id>/ceo-review.md`。

**A2 需求规格**
执行 spec-kit 规格链路：specify → clarify → checklist。先生成初稿 → **重复澄清** 直到规格无歧义 → 推荐在 `plan` 前执行 checklist 并闭环问题；高风险或高歧义需求 MUST 执行 → 锁定 `spec.md`。
注意：clarify 追加写入，可多次执行；specify 会覆盖整个 `spec.md`，仅在推倒重来时使用。

**A3 技术方案**
执行 spec-kit plan → `/plan-eng-review`，生成 `plan.md`、`research.md`、`data-model.md`、`contracts/`、`arch-review.md`。

**A4 任务拆解**
执行 spec-kit tasks，生成 `tasks.md`。

**A5 TDD + 实施**（详见 `§ Phase 5-6`）
执行一致性分析 → 先写失败测试 → 执行实现（或 agency-agents / 外部代理编排能力并行）→ 绿灯。

**A6 审查 + QA + 发布**（详见 `§ Phase 7-9`）
执行审查 → QA → 按 Phase 9 发布链路进入 CI / Review / 合并 / staging quick QA / production。若当前 host 未安装 gstack，则用人工审查、测试命令或 CI 流程替代对应命令。

**A7 复盘**  
`/retro` → 有价值经验写入 `memory/patterns.md`。

---

## 场景 B：方向已定的新功能（Phase 2 → 9）

> 详细流程 → `references/ref-03-full-workflow.md § Phase 2-9`

```
Phase 2：需求规格（执行 spec-kit 规格链路：specify → clarify → checklist。生成初稿 → 重复澄清至无歧义 → 推荐在 plan 前执行 checklist，高风险或高歧义需求强制执行 → 锁定 spec.md）
Phase 3：技术方案（spec-kit plan → /plan-eng-review → arch-review.md）
Phase 4：任务拆解（spec-kit tasks → tasks.md）
Phase 5：一致性分析 + TDD（spec-kit analyze → 先写失败测试 → 提交测试基线）
Phase 6：实施（spec-kit implement；必要时配合 agency / 外部代理编排能力 → 绿灯 → 原子提交）
Phase 7：审查（执行 review + security-engineer；未安装 gstack 时改为人工审查或 CI 替代）
Phase 8：QA（执行 qa → qa-reports/；feature branch 默认 diff-aware；未安装 gstack 时改为人工或 CI 验证）
Phase 9：发布（按 Phase 9 发布链路执行；未安装 gstack 时走宿主常规发布流程）
```

**关键约束**：
- 模型与推理档位遵循当前 CLI / 仓库默认配置，MUST NOT 在工作流文档中硬编码固定模型分工
- 每完成一个原子任务执行 `/commit-message`，确认后再提交；提交信息格式以 `/commit-message` 技能定义为准，如需标识 task-id，可写入摘要或说明列表
- 发现规格有误 MUST 返回 Phase 2 正式修改，MUST NOT 绕过

---

## 场景 C：小变更

> bug fix 详细流程 → `references/ref-05-legacy-onboarding.md § 7.5`

**C1 小功能**：单文件且**非 bug fix**，或 < 50 行净变更。从 Phase 2 开始，跳过 Phase 1（产品方向），走 Phase 2→9。

**C2 Bug Fix**：以修复缺陷为目的时，走 **Phase 5B 简化流**，而不是复用完整 Phase 5 定义。适用于单文件或多文件修复，但不适用于新增需求或扩 scope。

```
① 先写失败/复现测试（固化问题，防止回归）
② 定位并修复
③ 已安装 gstack 时执行 /review（仅审改动范围）；未安装时改为人工审查或 CI 校验
④ 确认测试通过
⑤ 已安装 gstack 时执行 /qa（feature branch 默认 diff-aware；需要显式模式时再加 --quick / --regression）；未安装时改为人工或 CI 验证
⑥ 已安装 gstack 时执行 /ship；未安装时走宿主常规发布流程
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

**档位 A 最小动作**：补写 `AGENTS.md` → 建 `memory/` → 启用 context7 → 新功能走完整流程

---

## 场景 E：工具配置与升级

> 各工具安装/升级命令 → `references/ref-02-tool-stack.md`

| 工具 | 升级命令 |
|------|---------|
| gstack | `/gstack-upgrade` |
| specify-cli（CLI） | `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@vX.Y.Z` |
| spec-kit 项目文件 | `specify init --here --force --ai <your-agent>` |
| gitleaks | `brew upgrade gitleaks` |
| agency-agents | `git -C <agency-agents-path> pull origin main && <agency-agents-path>/scripts/install.sh --tool claude-code` |
| oh-my-claudecode | `/oh-my-claudecode:omc-setup`（若当前宿主提供等价编排入口，按宿主能力替代） |

进入场景 E 或用户明确要求时，代理 SHOULD 按 `§ 10.7` 检查核心工具版本；默认不在每次会话开始时自动升级工具。

---

## 场景 F：多功能并行开发

> Git Worktree 命令 + OMC 多代理选型 → `references/ref-06-branch-parallel.md`

```bash
# 开两条并行 feature 线
git worktree add ../project-feature-a feature/a
git worktree add ../project-feature-b feature/b

# 各自独立 Claude Code 实例
cd ../project-feature-a && claude
cd ../project-feature-b && claude
```

**代理架构选择**：

| 场景 | 方案 |
|------|------|
| 同一任务内多模型分工实现 | `/oh-my-claudecode:team`（或宿主等价团队编排能力） |
| 启动 Codex / Gemini CLI worker | `/oh-my-claudecode:omc-teams`（或宿主等价 worker 编排能力） |
| 同一 diff 多模型交叉审查 | `/oh-my-claudecode:ccg`（或宿主等价交叉评审能力） |
| 并行功能开发 | 多个独立代理实例（各自 worktree） |

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

### Claude Code（主力 agent，推荐）

在 `~/.claude/CLAUDE.md` 末尾追加以下内容：

```markdown
## AI Coding 工作流（强制遵守）

进行任何开发任务时，**必须**遵循以下规则（完整工作流见 `~/.claude/skills/ai-coding-workflow/SKILL.md`）：

**核心原则**：规格驱动 → 测试先行 → 最小改动 → 审查验证 → 持续复盘

**场景识别**（意图模糊时先询问用户）：

| 用户意图 | 执行场景 |
|---------|---------|
| 新项目 / 方向未定 / MVP 边界未定 / 架构重大影响 | → 场景 A（全流程） |
| 方向已定的新功能（多文件或新模块） | → 场景 B |
| 小变更（小功能或 bug fix） | → 场景 C |
| 接入存量旧项目 | → 场景 D |
| 工具安装、配置、升级 | → 场景 E |
| 多功能并行开发 | → 场景 F |

意图模糊时先询问：「是 A 新项目 / B 新功能 / C 小变更 / D 存量接入 / E 工具配置升级 / F 并行开发？」
```

**验证**：新开一个对话，说「帮我做一个功能」，确认 Claude 会主动询问任务类型，而不是直接写代码。

---

### OpenAI Codex CLI

在 `~/.codex/AGENTS.md` 末尾追加以下内容（文件不存在则新建）：

```markdown
## AI Coding 工作流（强制遵守）

进行任何开发任务时，**必须**遵循以下规则（完整工作流见 `<your-skills-path>/ai-coding-workflow/SKILL.md`）：

**核心原则**：规格驱动 → 测试先行 → 最小改动 → 审查验证 → 持续复盘

**场景识别**（意图模糊时先询问用户）：

| 用户意图 | 执行场景 |
|---------|---------|
| 新项目 / 方向未定 / MVP 边界未定 / 架构重大影响 | → 场景 A（全流程） |
| 方向已定的新功能（多文件或新模块） | → 场景 B |
| 小变更（小功能或 bug fix） | → 场景 C |
| 接入存量旧项目 | → 场景 D |
| 工具安装、配置、升级 | → 场景 E |
| 多功能并行开发 | → 场景 F |

意图模糊时先询问：「是 A 新项目 / B 新功能 / C 小变更 / D 存量接入 / E 工具配置升级 / F 并行开发？」

> **工具命令说明**：工作流详细步骤中的 `/speckit.*` 命令通过 `specify` CLI 命令行工具使用；在 Codex CLI 中，spec-kit 对应使用 `$speckit-*` 形式。`/review`、`/qa`、`/ship` 等 gstack 能力是否可用，取决于是否已按当前 host（如 Claude Code / Codex）正确安装 gstack；未安装时降级为人工审查、测试命令或 CI 流程替代。`/oh-my-claudecode:*` 命令表示外部代理编排能力；若当前宿主提供等价入口，应使用宿主等价能力，而不是硬依赖命名空间字面值。
```

**验证**：新开一个 Codex CLI 会话，说「帮我做一个功能」，确认会主动询问任务类型。

---

### 其他 Agent 快速参考

| Agent | 全局配置文件 | 角色定位 | 注意事项 |
|-------|-----------|---------|---------|
| Google Gemini CLI | `~/.gemini/GEMINI.md` | CLI 主力（辅助） | gstack/spec-kit 能力以该 host 的实际安装情况为准，未安装时走人工或 CI 替代 |
| Cursor | `~/.cursor/rules/ai-coding-workflow.mdc` | 辅助编写 | 编码前先确认 spec.md 已存在 |
| Windsurf | 项目级 `.windsurfrules` | 辅助编写 | 同上 |
| GitHub Copilot | `.github/copilot-instructions.md` | 辅助编写 | 同上 |

各配置文件写入内容与上方 Claude Code 版内容块一致，将技能路径替换为实际路径；Gemini CLI 同样附加工具命令说明注释。

> IDE-based agents（Cursor / Windsurf / Copilot）定位为**辅助编写角色**，负责代码补全与单文件修改；规格生成、审查、QA、发布等阶段由 Claude Code CLI 主导完成。

---

## 参与贡献

仓库地址：https://github.com/liuhean/Anan-Agent-Skills
技能目录：`skills/ai-coding-workflow/`
