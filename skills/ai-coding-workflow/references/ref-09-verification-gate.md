# §13 验证铁律 + 阶段顺序纪律（Verification Gate & Phase Discipline）

> 适用：使用 `ai-coding-workflow` 技能时的横切纪律层；本文件规则内联生效，不依赖任何外部插件是否安装或加载成功，任何有能力的 agent（Claude Code、Codex、Gemini 或其他宿主）都应原生遵守。

---

## Section 13.1 适用范围

| 条件 | 是否适用本文件 |
|------|---------------|
| 本次任务按 **ai-coding-workflow** 推进 | **MUST** 遵守 |
| 未使用 ai-coding-workflow（闲聊、查资料、其他独立技能） | 不适用 |
| 使用哪个 Agent / IDE | **无关** |

本文件定义的验证纪律（阶段顺序、Iron Law、Gate Function）内置于本技能，与是否安装某个外部插件无关，始终生效（见 `ref-02-tool-stack.md § 10.5`）。

---

## Section 13.2 阶段顺序铁律（Phase Sequence）

工作流 Phase 按 `ref-03-full-workflow.md` 文档书写顺序推进：`Phase 0 → 1 → 2 → … → 10`，或经场景路由进入 `Phase 5B`。

**规则**：

1. 收到开发任务后，MUST 先场景识别（`SKILL.md` § 场景识别），确定**起始 Phase**。
2. 当前 Phase 的**退出条件**未全部满足前，MUST NOT 进入下一 Phase。
3. MUST NOT 在无对应产出物的情况下跳阶段（例如无 `spec.md` 进入 Phase 6）。
4. **唯一允许的捷径**来自 workflow 已有定义：Phase 5B（bug fix）、场景 C1/C2、场景 G（UI 快车道）等；MUST NOT 自创新捷径。
5. 用户要求「直接写代码」时，IF 仍走 ai-coding-workflow，THEN Agent MUST 说明缺失的前序 Phase/产出物，并按最小必要 Phase 补齐或明确记录已满足的跳过依据。

---

## Section 13.3 验证铁律（Iron Law）

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
（无 fresh 验证证据，禁止任何完成类宣称）
```

**核心原则**：Evidence before claims, always.

若在本消息内**未**执行并读取验证命令的**完整输出**，则禁止做出成功/完成类结论。

### 13.3.1 禁止表述（含同义改写）

在未附 fresh 证据时，禁止包括但不限于：

- 完成、已通过、修好了、没问题、应该可以了
- 测试绿、lint 过、构建成功（若未在本消息内跑过对应命令）
- 可以提交、可以合并、可以发布
- 「Great!」「Done!」「Perfect!」等暗示成功的满意表述

### 13.3.2 Gate Function（5 步，不可跳过）

```
BEFORE 任何 success/completion 宣称：

1. IDENTIFY — 什么命令能证明这个结论？（见 § 13.4 或项目 AGENTS.md 验证命令）
2. RUN     — 在本消息内完整执行该命令（非上次结果、非猜测）
3. READ    — 读取完整输出，检查 exit code，统计失败数
4. VERIFY  — 输出是否支持结论？
             - 否 → 如实报告实际状态并附证据
             - 是 → 再做出结论，并附证据摘要或关键输出
5. ONLY THEN — 才可宣称 pass / 完成 / 修好了
```

跳过任一步 = 未验证，等同于违规。

### 13.3.3 常见失败模式

| 宣称 | 必须 | 不足 |
|------|------|------|
| 测试通过 | 测试命令输出，0 failures | 上次运行结果、「应该过」 |
| Lint 干净 | linter 输出，0 errors | 只改了代码未跑 lint |
| 构建成功 | build 命令 exit 0 | lint 过 ≠ 编译过 |
| Bug 已修 | 复现测试 + 修复后测试 | 只改代码未跑测试 |
| Phase N 完成 | 该 Phase 产出物已写入 + 退出条件满足 | 口头说「做完了」 |

---

## Section 13.4 各 Phase 纪律层（横切 Gate）

以下补充 `ref-03` 各 Phase **退出条件**，不替代原有定义。

| Phase | 纪律层（退出前额外要求） |
|-------|-------------------------|
| **0** | 项目初始化产出物已就绪（`.specify/`、`AGENTS.md`/`CLAUDE.md`） |
| **1** | `ceo-review.md` 已写入；禁止无文件宣称「方向定了」 |
| **2** | `spec.md` 已锁定；禁止无 spec 进入 Phase 3+ |
| **3** | `plan.md` 等产出物就绪；禁止无方案进入 Phase 4+ |
| **4** | `tasks.md` 就绪；禁止无任务列表进入 Phase 5/6 |
| **5** | 失败测试已提交（红灯）；禁止无测试基线进入 Phase 6 |
| **5B** | 步骤「确认测试通过」MUST 走 Gate Function（§ 13.3.2） |
| **6** | 退出前 MUST freshly run 项目验证命令（测试/lint/build 等，见 AGENTS.md）；禁止无输出宣称「实施完成」 |
| **7** | `review-findings.md` 已处理；禁止无审查记录宣称「审过了」 |
| **8** | 正式 QA 完成；Iron Law 仍适用于 Phase 8 内的每条验收结论 |
| **9** | 合并/PR 前 MUST 再跑全量验证；禁止无证据宣称「可发布」 |
| **10** | 复盘产出已写入；禁止无对应产物宣称「已复盘」 |

---

## Section 13.5 本纪律与外部工具的关系

| 层面 | 说明 |
|------|------|
| **内置生效** | 本文件（§ 13）为 workflow 自有铁律，不依赖任何外部插件是否安装，任何有能力的 agent 原生遵守 |
| **与评审/QA/发布能力** | 评审/QA/发布等阶段能力（见 `ref-02 § 10.2`）在 agent 无法执行对应子任务时可降级为人工/CI；验证纪律（Iron Law、Gate Function）**不可降级**，始终生效 |
| **辅助技能** | 若当前环境恰好提供专项验证/调试/TDD 技能，MAY 调用以加深执行；**不形成第二条 workflow**，缺失时本文件规则仍原生生效 |

---

## Section 13.6 agent 评审/QA 能力不可用时的最低验证命令

agent 评审/QA 能力不可用时，Phase 6/8/9 的 Gate Function 仍 MUST 执行。最低集合由项目 `AGENTS.md` 定义；若无定义，代理 SHOULD 按技术栈选用：

| 项目类型 | 建议命令（示例） |
|---------|-----------------|
| Node 前端 | `npm run lint`、`npm run build`、项目测试脚本（如有） |
| 有 E2E | 上述 + `npx playwright test`（或项目等价命令） |
| 无自动化测试 | lint + build + 对照 `spec.md`/checklist **手测清单**（手测结论仍须具体，禁止「手测过了」无条目） |

---

## Section 13.7 Self-Test Gate（开发者理解度校验）

**定位**：在代码验证通过（测试绿、审查过）之后、合并进入 Phase 9 之前，可选增加一道「开发者理解度校验」。不是验证代码是否工作，而是验证**开发者是否真正理解了改动内容**。

### 13.7.1 适用场景

| 场景 | 建议 |
|------|------|
| 大面积重构或重写 | SHOULD 执行 |
| 涉及关键路径、支付、安全等高风险改动 | SHOULD 执行 |
| 仅修了一个边界值或单行 bug | 可跳过 |
| AI 自主完成大部分实现且开发者未逐行 review | SHOULD 执行 |

### 13.7.2 执行流程

```
1. AI 根据本次改动生成一份《改动理解测试题》，包含：
   - 改动的背景与目的（共 1 问，确保开发者知道为什么改）
   - 核心实现逻辑（2-3 问，验证是否理解关键变更）
   - 影响范围与潜在风险（1-2 问，验证是否知道可能出问题的地方）
   - 回退方案（1 问，验证是否知道出问题了怎么恢复）

2. 开发者作答，AI 检查答案是否正确。

3. 全部答对 → 通过，进入合并流程。
   答错 → 返回改动对应的 Phase 重新理解，修复知识盲区后再测。
```

### 13.7.3 通过条件

- 开发者正确回答了改动的背景、逻辑、影响范围和回退方案
- 答错的问题对应的知识盲区已记录（MAY 记入 `memory/issues.md` 作为下次开发的上下文）
- Self-Test 结论不替代 Phase 7 代码审查和 Phase 8 QA 验证

> Self-Test Gate 不是审查代码，是审查开发者对改动的理解。多数上线事故不是因为代码有 bug，而是改代码的人不理解为什么那些旧逻辑存在。
