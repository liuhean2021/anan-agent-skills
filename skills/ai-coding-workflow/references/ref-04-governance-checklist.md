# §3 AI 治理 + §6 最佳实践清单

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

- [ ] `specify init . --integration <agent-key>` 初始化 spec-kit（Codex CLI 常用 `--integration codex --integration-options="--skills"`）
- [ ] `/speckit.constitution` 建立项目原则
- [ ] 补充 `AGENTS.md`/`CLAUDE.md`
- [ ] 确认 Context7 MCP 已启用；无 MCP 时明确降级路径为 `use context7`/library ID/官方文档

### 6.2 每个功能开始前

- [ ] 按 Section 1.1 判断任务规模，确定起始 Phase；**禁止无产出物跳阶段**（`ref-08 § 13.2`）
- [ ] IF 方向未定、MVP 边界未定、或影响重大：先做结构化访谈式规划，再做结构化产品方向评审，将结论写入 `specs/<feature-id>/ceo-review.md`
- [ ] IF 涉及陌生库、新版本 SDK、或近期变化的工具行为：优先使用 Context7 MCP 自动文档查验；无 MCP 时降级为 `use context7`/library ID/官方文档，再进入规格/方案动作
- [ ] IF 方向已定且需求明确：执行 `/speckit.specify` + `/speckit.clarify`，锁定规格（变更须回 Phase 2 正式修改）
- [ ] `spec.md`、`plan.md` 等文档满足"中文为主、英文为辅"原则：大量英文名词已追加中文标注，未标注的 MUST 返回补充
- [ ] `spec.md` 中已包含边界情况章节，或明确标注不适用
- [ ] `spec.md` 中已包含关键实体（Key Entities）章节（IF 涉及多个业务概念）
- [ ] IF 验收标准数量较多（≥ 8 条）：建议为每条分配编号（如 AC-001），方便逐项勾选追踪
- [ ] 推荐在 `/speckit.plan` 前执行 `/speckit.checklist`；复杂需求、高风险或高歧义需求 MUST 执行，并补齐需求完整性/清晰度/一致性问题
- [ ] IF 涉及前端交互需求：在锁定规格前补齐 `specs/<feature-id>/interaction-design.md`
- [ ] IF 涉及前端 UI/UX，THEN 规格锁定前 MUST 判定 design-level（L1/L2/L3），确认 `interaction-design.md` 已按对应级别填写模板章节（L1 完整填写：页面结构 + 交互流转 + 状态矩阵 + 响应式适配 + 可访问性；L2 填写页面结构、交互流转与状态矩阵；L3 填写页面结构与状态矩阵）
- [ ] IF 已有设计文件、原型、分享链接或截图：MUST 将设计基线记录到 `interaction-design.md` 的「设计引用」章节（主入口）——在线平台提供链接则记链接，仅有离线文件（PDF/截图）则记文件路径；仅维护多索引时可同步备份至 `specs/<feature-id>/source-links.md`；如需本地查看，可临时拉取到 `specs/<feature-id>/design-assets/`（须加入 `.gitignore`）
- [ ] IF 涉及前端 UI/UX，THEN 所有前端设计文档与设计基线已在 Phase 2/spec 阶段完成并锁定；后续 Phase 只允许引用、拆解、实施和验证
- [ ] IF 涉及前端 UI/UX 且项目级 `DESIGN.md` 不存在，THEN 生成 `DESIGN.md`，遵循 Google Stitch DESIGN.md 基础格式；本工作流追加以下章节要求：`Responsive Behavior`/`Iteration Guide`
- [ ] IF 生成或修改 `DESIGN.md`，THEN SHOULD 运行 `npx @google/design.md lint DESIGN.md` 验证格式
- [ ] IF 涉及前端 UI/UX，THEN `design-system-context.md` MAY 降级为 `interaction-design.md` 中的 Design System Context 章节；若仅引用 ≤5 个 token，SHOULD 直接列出 token 引用表
- [ ] IF 涉及前端交互需求：按设计基线分级 gate（L1/L2/L3）判断是否可锁定 spec.md 与进入后续阶段；L3 级进入 Phase 6 前若仍缺少 L2 级以上基线，MUST 返回 Phase 2 补齐并重新锁定规格
- [ ] 执行 `/speckit.plan` + 结构化架构评审，将结论写入 `specs/<feature-id>/arch-review.md`
- [ ] IF 涉及前端交互需求：确认 `plan.md` 已引用 `interaction-design.md` 和 `design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）作为后续实现输入
- [ ] **[P0-3]** IF 涉及 DB schema 变更：确认 `plan.md` 已包含迁移方案（兼容性分类、上线顺序、回滚脚本、staging dry-run 要求）
- [ ] **[P0-4]** IF 涉及 API 变更：确认已先更新 `contracts/` 再写实现；breaking change 已在 `arch-review.md` 标注并获得架构确认
- [ ] `/speckit.tasks` 生成任务列表
- [ ] IF 涉及前端交互需求：确认 `tasks.md` 已按设计产物拆出页面结构实现、交互实现、状态处理、视觉验证、回归验证
- [ ] IF 涉及前端 UI/UX，THEN `tasks.md` 中 MUST 包含设计还原验证任务
- [ ] **[P0-1]** IF 涉及前端 UI 实现且项目存在组件库、设计系统或可复用 UI 层：确认 `tasks.md` 中每条前端任务已标注 `[复用]`/`[扩展]`/`[新增]`，且新增组件任务已说明理由
- [ ] `/speckit.analyze` 在 `tasks.md` 生成后执行并通过
- [ ] IF 并行开发：使用 `git worktree`，MUST NOT 切分支代替

### 6.3 实施过程中

- [ ] 模型与推理档位遵循当前 CLI/仓库默认配置，MUST NOT 在工作流文档中硬编码固定模型分工
- [ ] TDD：先写失败测试，再写实现
- [ ] IF 需要专业判断或并行执行：先在 `plan.md`/`arch-review.md` 中明确判断结论；并行分工时，明确文件所有权、输入上下文与验收条件
- [ ] 每完成一个原子任务，执行 `/commit-message` 生成提交信息，确认后再提交；MUST NOT 直接调用 `git commit`；提交信息格式以该技能定义为准，默认使用中文，除非用户明确要求英文
- [ ] 踩坑立即追加写入 `memory/issues.md`
- [ ] 架构决策立即追加写入 `memory/decisions.md`
- [ ] IF 发现规格有误：返回 Phase 2 正式修改，MUST NOT 绕过
- [ ] IF 涉及前端交互需求：页面实现从 Phase 6 开始，输入 MUST 来自 `spec.md`、`interaction-design.md`（含「设计引用」章节中的设计基线）、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）、`plan.md`、`tasks.md`；MUST NOT 在实施阶段新建或补写前端设计文档；MUST 将 `DESIGN.md` 中的 design tokens 映射为 CSS 变量或 Tailwind 配置，MUST NOT 在组件中硬编码颜色/字体/间距值

### 6.4 上线前（关键 gate MUST 全过）

- [ ] **验证铁律**：所有完成/通过类结论已附本消息内 freshly run 的验证命令输出（`ref-08 § 13.3`）
- [ ] gitleaks Secret 扫描通过（pre-commit hook 自动触发，CI 二次校验）
- [ ] 代码审查通过；安全敏感改动已追加安全专项审查，将结论写入 `specs/<feature-id>/review-findings.md`，修复后重审
- [ ] QA 验证通过，截图已存档（feature branch 默认 diff-aware）
- [ ] IF 涉及前端交互需求：QA 已对照 `interaction-design.md`、`design-system-context.md`（或 `interaction-design.md` 中的 Design System Context 章节）及「设计引用」章节中的设计基线（在线链接或离线文件）验证关键页面结构、交互流转、状态矩阵、响应式规则；QA 报告已记录设计引用、关键页面截图、差异结论，并将差异标注为 `blocking`/`non-blocking`/`accepted`；若在线链接失效，则以最近一次导出的带时间戳截图/PDF 作为临时比对输入，并返回 Phase 2/spec 阶段补注退化基线
- [ ] IF QA 发现实现效果与设计基线不一致，THEN MUST 返回 Phase 6 修复；若设计基线缺失或错误，返回 Phase 2
- [ ] IF 本次前面生成了 `/speckit.checklist`：其中阻断项已闭环
- [ ] 走标准 git/PR 发布流程 → CI 全绿 + ≥ 1 人 Review Approve 后合并
- [ ] CD 自动部署 staging；若团队已将 agent runtime 接入 CI，则可自动触发快速 QA 验证，否则由人工或本地 agent 完成 staging 快速验证
- [ ] 人工批准生产部署，上线后观察 5 分钟；IF 有问题 THEN 立即执行 `git revert HEAD` 并走标准发布流程

### 6.5 功能完成后

- [ ] 结构化周复盘（每周一次）
- [ ] 有价值经验按 `ref-09-experience-quality.md` 判定后追加写入 `memory/patterns.md`（三镜头 + 九类垃圾排除 + 与历史去重/合并；宁漏勿错）
- [ ] IF `AGENTS.md` 有变化：同步更新
