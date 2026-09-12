# §7 存量项目接入（Legacy Project Onboarding）

> 适用：接入存量旧项目时的分档策略与 Bug Fix 简化流程

---

## Section 7：存量项目接入（Legacy Project Onboarding）

### 7.1 三档接入策略

| 档位 | 适用场景 | 预估耗时 |
|------|---------|---------|
| A 轻量接入 | 活跃维护中的项目，快速规范化 | 1 天内 |
| B 标准接入 | 准备规范化，有一定改造时间 | 1～3 天 |
| C 全面接入 | 有专项技术改造计划 | 按模块排期 |

### 7.2 档位 A：轻量接入

**目标**：让 AI 了解项目上下文，新功能走完整流程，旧代码不动。

- [ ] 补写 `AGENTS.md`（MUST 包含：项目背景、技术栈、禁止事项、验证命令）
- [ ] 建 `memory/` 目录，开始记录踩坑（`issues.md`）和决策（`decisions.md`）
- [ ] 启用 Context7 MCP；WHEN 新代码涉及外部库时，优先使用 Context7 MCP 自动文档查验；无 MCP 时降级为 `use context7` / library ID / 官方文档
- [ ] 新功能开发从 Phase 1 开始走完整流程

### 7.3 档位 B：标准接入

**在 A 的基础上：**

- [ ] 执行 `specify init . --integration <agent-key>` 初始化 spec-kit（Codex CLI 常用 `--integration codex --integration-options="--skills"`）；仅对**新功能**运行 specify，旧代码无需补写 spec
- [ ] TDD 仅对新增代码要求；bug fix 时 MUST 先写复现测试，代替完整 TDD
- [ ] 首次做一次代码审查，结果按以下规则处理：
  - IF 阻断性问题 THEN 立即修复
  - IF 非阻断性问题 THEN 记入 `memory/issues.md` 排期处理

### 7.4 档位 C：全面接入

**在 B 的基础上：**

- [ ] 对核心模块反向补写 spec（从现有代码推导规格）
- [ ] 对高风险模块补充测试覆盖
- [ ] 定期做结构化复盘追踪迁移进度

### 7.5 存量项目 Bug Fix 流程

Bug Fix 流程统一见 `ref-03-full-workflow.md § Phase 5B`。
