---
name: ai-coding-workflow
description: >
  AI Coding 工作流技能，适用于 Claude Code CLI 主导的 AI 辅助开发。
  覆盖从产品方向到发布复盘的完整研发流程，包括规格驱动开发（spec-kit）、
  架构评审（gstack）、TDD、代码审查、QA验证、并行开发等环节。
  触发词包括：新项目、新功能、产品方向、需求规格、技术方案、任务拆解、
  代码实现、代码审查、QA验证、发布、复盘、存量接入、存量项目、bug fix、
  并行开发、spec-kit、gstack、agency-agents、工作流、ai-coding、
  context7、worktree、TDD、测试先行、架构评审、ceo-review、speckit。
  模糊场景（如「帮我做一个功能」）先确认任务类型再匹配场景。
metadata:
  author: liuhean
  email: allsmy.com@gmail.com
---

> **⚠️ 初次安装必做**：将本技能加入全局强制规则 → 跳至文末「[初次配置](#初次配置全局强制生效)」章节，完成后再回来阅读。

> 详细说明、命令参考、模板按场景拆分为以下文件：
>
> | 文件 | 内容 |
> |------|------|
> | `references/ref-01-task-routing.md` | §1 任务路由（任务类型→Phase表、命令速查、场景→命令映射）+ §4 文档结构（文件路径速查表） |
> | `references/ref-02-tool-stack.md` | §2 工具体系总览 + §10 各工具详细说明（spec-kit/gstack/agency/OMC/gitleaks/自检）+ §11 参考来源 |
> | `references/ref-03-full-workflow.md` | §5 完整开发工作流 Phase 0~11（含 ceo-review 模板、spec 模板） |
> | `references/ref-04-governance-checklist.md` | §3 AI治理（数据边界/高风险操作/人工责任/留痕）+ §6 最佳实践清单（5组 checklist） |
> | `references/ref-05-legacy-onboarding.md` | §7 存量项目接入（三档策略 A/B/C + Bug Fix 简化流程） |
> | `references/ref-06-branch-parallel.md` | §8 分支策略（主干开发、PR合并规则）+ §9 并行开发（Git Worktree + OMC 多代理选型） |
> | `references/ref-07-advanced-practices.md` | §12 进阶实践（P1 测试分层/依赖安全/DORA/Hooks；P2 AI信任边界/环境策略/合规审查/成本管理）|

# AI Coding 工作流

**核心原则**：规格驱动 → 测试先行 → 最小改动 → 审查验证 → 持续复盘
**适用**：Claude Code CLI 主导的 AI 辅助开发（新项目 / 新功能 / bug fix / 存量接入）

工具层级：spec-kit（规格）→ agency-agents（专业角色）→ gstack（评审验证）→ OMC（并行编排）

---

## 场景识别

| 用户意图 | 执行场景 |
|---------|---------|
| 新项目 / 方向未定 / MVP 边界未定 / 架构重大影响 | → **场景 A** |
| 方向已定的新功能（多文件或新模块） | → **场景 B** |
| 小功能（<50行）/ bug fix / 单文件改动 | → **场景 C** |
| 接入存量旧项目 | → **场景 D** |
| 工具安装、配置、升级 | → **场景 E** |
| 多功能并行开发 | → **场景 F** |

意图模糊时先询问：「是 A 新项目 / B 新功能 / C 小功能 bug fix / D 存量接入？」

---

## 场景 A：新项目 / 方向未定（Phase 0 → 11 全流程）

> 详细流程 → `references/ref-03-full-workflow.md`；命令速查 → `references/ref-01-task-routing.md`

**执行顺序**：

**A0 项目初始化**（一次性）
`specify init . --ai claude` → `/speckit.constitution` → 补写 `AGENTS.md` / `CLAUDE.md`

**A1 产品方向**
执行 `/plan-ceo-review`，寻找最优版本，确认 MVP 边界。将结论写入 `.specify/specs/<feature-id>/ceo-review.md`。

**A2 需求规格**
执行 `/speckit.specify "功能描述"` 生成初稿 → **重复执行** `/speckit.clarify` 直到规格无歧义 → 锁定 `spec.md`。
注意：`/speckit.clarify` 追加写入，可多次执行；`/speckit.specify` 会覆盖整个 spec.md，仅在推倒重来时使用。

**A3 技术方案**
执行 `/speckit.plan "<技术栈>"` → `/plan-eng-review`，生成 `plan.md`、`research.md`、`arch-review.md`。

**A4 一致性 + 任务拆解**
`/speckit.analyze` → `/speckit.checklist` → `/speckit.tasks`，生成 `tasks.md`（含 `[P]` 并行标记）。

**A5 TDD + 实施**（详见 `§ Phase 6-7`）
先写失败测试 → 执行 `/speckit.implement`（或 agency-agents / OMC 并行）→ 绿灯。

**A6 审查 + QA + 发布**（详见 `§ Phase 8-10`）
`/review` + security-engineer 并行 → `/qa --mode=diff-aware` → `/ship` → staging → 生产。

**A7 复盘**
`/retro` → 有价值经验写入 `memory/patterns.md`。

---

## 场景 B：方向已定的新功能（Phase 2 → 10）

> 详细流程 → `references/ref-03-full-workflow.md § Phase 2-10`

```
Phase 2：需求规格（/speckit.specify 生成初稿 → 重复 /speckit.clarify 至无歧义 → 锁定 spec.md）
Phase 3：技术方案（/speckit.plan → /plan-eng-review → arch-review.md）
Phase 4：一致性检查（/speckit.analyze → /speckit.checklist）
Phase 5：任务拆解（/speckit.tasks → tasks.md）
Phase 6：TDD（先写失败测试 → wip commit）
Phase 7：实施（/speckit.implement / agency / OMC → 绿灯 → wip commits）
Phase 8：审查（/review + security-engineer → review-findings.md）
Phase 9：QA（/qa --mode=diff-aware → qa-reports/）
Phase 10：发布（/ship → CI → staging → 生产）
```

**关键约束**：
- 计划/架构阶段用 Opus，实现阶段用 Sonnet
- 每完成一个原子任务执行 `/commit-message`，确认后再提交（格式：`wip: [task-id] 描述`）
- 发现规格有误 MUST 返回 Phase 2 正式修改，MUST NOT 绕过

---

## 场景 C：小功能 / bug fix

> bug fix 详细流程 → `references/ref-05-legacy-onboarding.md § 7.5`

**小功能（< 50 行 / 单文件）**：从 Phase 2 开始，跳过 Phase 1（产品方向），走 Phase 2→10。

**bug fix / 单文件改动**：直接从 Phase 6 开始，不可跳步：

```
① 先写失败/复现测试（固化问题，防止回归）
② 定位并修复
③ /review（仅审改动范围）
④ 确认测试通过
⑤ /qa --mode=diff-aware
⑥ /ship
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
| specify-cli | `uv tool install specify-cli --force --from git+...@vX.Y.Z` |
| gitleaks | `brew upgrade gitleaks` |
| agency-agents | `git pull origin main`（在仓库目录） |
| oh-my-claudecode | `/oh-my-claudecode:omc-setup` |

代理 SHOULD 在每次会话开始时静默并行检查核心 5 件套版本（详见 `§ 10.7`）。

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
| 同一任务内多模型分工实现 | `/oh-my-claudecode:team` |
| 启动 Codex / Gemini CLI worker | `/oh-my-claudecode:omc-teams` |
| 同一 diff 多模型交叉审查 | `/oh-my-claudecode:ccg` |
| 并行功能开发 | 多个独立代理实例（各自 worktree） |

---

## AI 治理（核心边界）

> 完整规则 → `references/ref-04-governance-checklist.md §3`；进阶实践（测试分层/依赖安全/合规/成本）→ `references/ref-07-advanced-practices.md`

- 客户数据、生产数据、密钥 MUST NOT 发送给任何模型
- AI MUST NOT 在无人工批准的情况下直接执行生产发布、回滚、权限变更、数据库迁移
- AI 生成内容一律视为待确认产物，最终责任 MUST 由人工承担

---

## 初次配置（全局强制生效）

技能部署到 `~/.claude/skills/` 后属于按需触发，若需在**所有项目**中自动强制遵守，需在全局 CLAUDE.md 中添加引用。

**步骤：在 `~/.claude/CLAUDE.md` 末尾追加以下内容**

```markdown
## AI Coding 工作流（强制遵守）

进行任何开发任务时，**必须**遵循以下规则（完整工作流见 `~/.claude/skills/ai-coding-workflow/SKILL.md`）：

**核心原则**：规格驱动 → 测试先行 → 最小改动 → 审查验证 → 持续复盘

**场景识别**（意图模糊时先询问用户）：

| 用户意图 | 执行场景 |
|---------|---------|
| 新项目 / 方向未定 / MVP 边界未定 | → 场景 A（全流程） |
| 方向已定的新功能（多文件或新模块） | → 场景 B |
| 小功能（<50行）/ bug fix / 单文件改动 | → 场景 C |
| 接入存量旧项目 | → 场景 D |
| 工具安装、配置、升级 | → 场景 E |
| 多功能并行开发 | → 场景 F |

意图模糊时先询问：「是 A 新项目 / B 新功能 / C 小功能 bug fix / D 存量接入？」
```

**验证**：新开一个对话，说「帮我做一个功能」，确认 Claude 会主动询问任务类型，而不是直接写代码。

---

## 参与贡献

仓库地址：https://github.com/liuhean/Anan-Agent-Skills
技能目录：`skills/ai-coding-workflow/`
