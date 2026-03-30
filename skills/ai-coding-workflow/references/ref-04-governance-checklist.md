# §3 AI 治理 + §6 最佳实践清单

> 来源：ai-coding-workflow-best-practices.md §3、§6
> 适用：AI 使用边界约束、研发各阶段 checklist

---

## Section 3：AI 治理（最小必要版）

本节定义团队在使用 AI 代理参与研发时的最小边界。目标是保证 AI 使用过程安全、可控、可追溯。IF 本节与其他流程步骤冲突，THEN 以本节为准。

### 3.1 数据边界

- 客户数据、生产数据、日志、合同、财务、法务材料 MUST NOT 直接发送给外部模型
- 任何密钥、token、password、private key、数据库连接串 MUST NOT 输入任何模型
- 内部代码与文档 SHOULD 遵守最小必要原则，仅提供完成任务所需的上下文
- IF 无法判断信息是否敏感，THEN 默认按敏感信息处理，先不发送

### 3.2 高风险操作边界

- AI MAY 参与文档、需求、方案、代码、测试、审查等工作
- AI MUST NOT 在无人工批准的情况下直接执行生产发布、回滚、权限变更、数据库迁移、基础设施变更
- 对鉴权、支付、隐私、安全相关改动，AI 可以辅助分析、生成方案或代码，但 MUST 经过人工审查和批准后才能进入发布流程

### 3.3 人工责任

- AI 生成内容一律视为待确认产物，不应视为天然正确
- 最终责任 MUST 由人工承担，而不是由 AI 承担
- `spec.md`、`plan.md`、PR、发布记录 SHOULD 能对应到明确责任人

### 3.4 最小留痕

以下信息 SHOULD 可追溯：
- 使用了哪个 AI 工具或模型
- 关键产出是什么
- 谁审核、谁批准
- 哪次发布包含了相关改动

---

## Section 6：最佳实践清单（Best Practice Checklists）

### 6.1 项目启动（一次性）

- [ ] `specify init . --ai claude` 初始化 spec-kit
- [ ] `/speckit.constitution` 建立项目原则
- [ ] 补充 `AGENTS.md` / `CLAUDE.md`
- [ ] 确认 context7 MCP 已启用
- [ ] agency-agents 角色已安装到 `~/.claude/agents/`

### 6.2 每个功能开始前

- [ ] 按 Section 1.1 判断任务规模，确定起始 Phase
- [ ] IF 方向未定、MVP 边界未定、或影响重大：先执行 `/office-hours`，再执行 `/plan-ceo-review`，将结论写入 `specs/<feature-id>/ceo-review.md`
- [ ] IF 方向已定且需求明确：执行 `/speckit.specify` + `/speckit.clarify`，锁定规格（变更须回 Phase 2 正式修改）
- [ ] 执行 `/speckit.plan` + `/plan-eng-review`，将结论写入 `specs/<feature-id>/arch-review.md`
- [ ] 复杂需求推荐执行 `/speckit.checklist`，补齐需求完整性/清晰度问题
- [ ] `/speckit.tasks` 生成任务列表
- [ ] `/speckit.analyze` 在 `tasks.md` 生成后执行并通过
- [ ] IF 并行开发：使用 `git worktree`，MUST NOT 切分支代替

### 6.3 实施过程中

- [ ] 模型与推理档位遵循当前 CLI / 仓库默认配置，MUST NOT 在工作流文档中硬编码固定模型分工
- [ ] TDD：先写失败测试，再写实现
- [ ] 每完成一个原子任务，执行 `/commit-message` 生成提交信息，确认后再提交（`wip: [task-id] 描述`）；MUST NOT 直接调用 `git commit`；提交信息默认使用中文，除非用户明确要求英文
- [ ] 踩坑立即追加写入 `memory/issues.md`
- [ ] 架构决策立即追加写入 `memory/decisions.md`
- [ ] IF 发现规格有误：返回 Phase 2 正式修改，MUST NOT 绕过

### 6.4 上线前（七关 MUST 全过）

- [ ] gitleaks Secret 扫描通过（pre-commit hook 自动触发，CI 二次校验）
- [ ] `/review` + security-engineer 代码+安全审查通过，将结论写入 `specs/<feature-id>/review-findings.md`，修复后重审
- [ ] `/qa` QA 验证通过，截图已存档（feature branch 默认 diff-aware）
- [ ] IF 本次前面生成了 `/speckit.checklist`：其中阻断项已闭环
- [ ] `/ship` → CI 全绿 + ≥ 1 人 Review Approve 后合并
- [ ] CD 自动部署 staging，CI 触发 `/qa --quick` 验证通过
- [ ] 人工批准生产部署，上线后观察 5 分钟；IF 有问题 THEN 立即执行 `git revert HEAD` + `/ship`

### 6.5 功能完成后

- [ ] `/retro` 周复盘（每周一次）
- [ ] 有价值经验追加写入 `memory/patterns.md`
- [ ] IF `AGENTS.md` 有变化：同步更新
