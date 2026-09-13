# §8 分支策略 + §9 并行开发

> 适用：分支管理规范、多功能并行开发、多代理编排选型

---

## Section 8：分支策略（Branch Strategy）

### 8.1 主干开发（Trunk-based，推荐）

```
main（保护分支，只允许 PR 合并）
  ├── username/feature/xxx   ← 示例，IF 团队无既有规范可用；短周期，生命周期 ≤ 2 天
  ├── username/fix/xxx
  └── username/release/x.x  ← 仅需单独维护版本时才开；release 前缀可选
```

**变体：双层基干（`dev` → `main`）**
IF 项目需要稳定 branch 供多团队并行集成验证，THEN MAY 在 `main` 与功能分支之间增设 `dev` 基干：

```
main（保护分支，稳定可发布）
  └── dev（集成验证分支，CI 全绿）
        ├── username/feature/xxx
        ├── username/fix/xxx
        └── username/feat-YYYYMMDD   ← 短日期命名备选
```

**规则（dev 变体）：**
- 功能分支从 `dev` 创建，合并回 `dev` 验证
- 验证通过后，由 `dev` 合入 `main`
- `main` 始终稳定可构建/可部署

**规则：**
- 多人并行且无其他命名规范时，非 `main` 分支 SHOULD 以 `username/`（如用户名）开头，避免协同时分支名冲突
- `main` 分支 MUST 设置保护规则：禁止 force push，PR 合并前 CI MUST 全绿
- 功能分支生命周期 MUST ≤ 2 天；IF 超过 2 天 THEN 拆分任务或执行频繁 rebase
- CODEOWNERS 文件 MUST 定义核心模块强制审批人

### 8.2 PR 合并规则

| 条件 | 要求 |
|------|------|
| CI 状态 | MUST 全绿（测试 + 安全扫描 + Secret 扫描） |
| Review | MUST ≥ 1 人 Approve；核心模块 MUST ≥ 2 人 |
| 冲突解决 | 作者 MUST 负责 rebase；MUST NOT 使用 merge commit 解决冲突 |
| 合并方式 | MUST 使用 Squash merge，保持主干历史干净 |

---

## Section 9：并行开发（Git Worktree）

```bash
# 开两条并行 feature 线，各自独立工作区
git worktree add ../project-feature-a feature/a
git worktree add ../project-feature-b feature/b

# 分别在两个终端启动独立 Claude Code 实例
cd ../project-feature-a && claude
cd ../project-feature-b && claude
```

**多代理规则**：代理 MUST NOT stash 或修改其他 agent 的改动；MUST 只 commit 自己负责的改动。

**代理架构选择**：

| 场景 | 方案 |
|------|------|
| 简单任务 | 单代理直接完成 |
| 细分子任务 | 主代理 + subagent（Claude Code 内置） |
| 同一任务内多模型分工实现 | 外部代理编排能力（例如 `/team`） |
| 明确要启 Codex / Gemini CLI worker | 外部代理编排能力（例如 `omc team N:codex "..."`、`omc team N:gemini "..."`；CLI 命令，无需 slash 入口） |
| 同一 diff 做多模型交叉审查 | 外部代理编排能力（例如 `/ask <model>`，多模型逐个调用） |
| 并行功能开发 | 多个独立代理实例（各自 worktree） |
| 复杂大型项目 | Multi-Agent 架构（谨慎使用，优先简单方案） |

### 9.1 OMC 并行协作补充

- 同一 feature 内的任务并行，优先使用 `tasks.md` 中的 `[P]` 标记做拆分，再决定是否启用外部代理编排能力（例如 OMC）
- `/team` 适合"主代理统筹 + 多个会话内 agent 分工"；`omc team ...` 适合已经明确要启动 Codex/Gemini CLI worker（`/omc-teams` 已在 OMC 5.0.0 移除且不留别名，改用 CLI 的 `omc team ...`）；其他宿主可用等价编排入口替代
- 代码实现时，优先按文件或模块边界拆分；代码审查时，优先按视角拆分，例如 Codex 看正确性与安全，Gemini 看可读性与 UX
- 外部代理编排能力并行执行结束后，当前主代理 MUST 负责回收结论、解决冲突、补测试并统一提交
