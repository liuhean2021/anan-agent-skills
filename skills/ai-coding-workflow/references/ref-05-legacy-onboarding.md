# §7 存量项目接入（Legacy Project Onboarding）

> 来源：ai-coding-workflow-best-practices.md §7
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
- [ ] 启用 context7 MCP；WHEN 新代码涉及外部库时，提示词 MUST 追加 `use context7`
- [ ] 新功能开发从 Phase 1 开始走完整流程

### 7.3 档位 B：标准接入

**在 A 的基础上：**

- [ ] 执行 `specify init . --ai <your-agent>` 初始化 spec-kit（Codex CLI 常用 `--ai codex --ai-skills`）；仅对**新功能**运行 specify，旧代码无需补写 spec
- [ ] TDD 仅对新增代码要求；bug fix 时 MUST 先写复现测试，代替完整 TDD
- [ ] 首次运行 `/review`，结果按以下规则处理：
  - IF 阻断性问题 THEN 立即修复
  - IF 非阻断性问题 THEN 记入 `memory/issues.md` 排期处理

### 7.4 档位 C：全面接入

**在 B 的基础上：**

- [ ] 对核心模块反向补写 spec（从现有代码推导规格）
- [ ] 对高风险模块补充测试覆盖
- [ ] 定期执行 `/retro` 追踪迁移进度

### 7.5 存量项目 Bug Fix 流程

IF 任务为 bug fix，THEN 代理 MUST 按以下 **Phase 5B：Bug Fix 简化流** 执行，MUST NOT 误写成“从完整 Phase 5 开始”：

```
1. 先写复现测试（固化问题，防止回归）
2. 定位并修复
3. 已安装 gstack 时执行 /review（仅审改动范围）；未安装时改为人工审查或 CI 校验
4. 确认测试通过
5. 已安装 gstack 时执行 /qa（feature branch 默认 diff-aware）；未安装时改为人工或 CI 验证
6. 已安装 gstack 时执行 /ship；未安装时走宿主常规发布流程
7. 将踩坑内容追加写入 memory/issues.md
```
