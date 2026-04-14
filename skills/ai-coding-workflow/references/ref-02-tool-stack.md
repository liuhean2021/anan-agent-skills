# §2 工具体系总览 + §10 各工具详细说明 + §11 参考来源

> 适用：工具选型、安装升级、命令速查

---

## Section 2：工具体系总览（Tool Stack）

AI Coding Workflow 以 `Phase 0~10 / 5B` 为主线推进。以下工具与角色是**阶段内介入能力**，用于帮助代理完成同一条工作流，而不是多条彼此分离的流程。

### 2.1 工作流组成能力

| 层级 | 工具 | 职责 |
|------|------|------|
| 基础环境层 | Claude Code 原生 hooks | 自动化质量卡口、事件触发命令 |
| 上下文层 | AGENTS.md + CLAUDE.md + memory/ | 项目记忆、AI 角色定义、架构决策 |
| 文档层 | context7 MCP | 实时注入最新库文档，防止 API 幻觉 |
| 需求层 | spec-kit | 规格驱动开发，需求 → 规格 → 计划 → 任务 |
| 执行层 | agency-agents | 专业化子代理角色库（按需召唤） |
| 外部代理层 | oh-my-claudecode | 调用 Codex / Gemini / 外部 CLI worker 并行实现或复核 |
| 验证层 | gstack + 单元测试 | UI 验证 + 业务逻辑覆盖 |
| 沉淀层 | ADR + Checkpoint commit | 架构决策记录，知识不流失 |

### 2.2 AI 代理与模型选择

```
主力：Claude Code CLI
  模型与推理档位遵循当前 CLI / 仓库默认配置，MUST NOT 在工作流文档中硬编码固定模型分工

辅助：Codex CLI、Gemini CLI、Cursor（次选）
规则：单一模型优先；超限时保持代理不变，临时替换模型补充
```

### 2.3 OMC 接入原则

- `oh-my-claudecode` SHOULD 作为 Claude Code 的外部代理编排层，而不是替代主代理；在其他宿主中，文档内同类命令表示“外部代理编排能力”，可用宿主等价入口替代
- 代码实现阶段，IF 任务可拆成彼此独立的子任务，THEN MAY 用 `/oh-my-claudecode:team` 或 `/oh-my-claudecode:omc-teams` 并行调用 Codex / Gemini
- 代码审查阶段，IF 需要交叉验证架构、安全、可读性或 UX 风险，THEN SHOULD 追加 `/oh-my-claudecode:ccg` 或 `/oh-my-claudecode:ask <model>`
- OMC 外部 agent 输出 MUST 视为"辅助结论"，最终是否采纳 MUST 由当前 Claude Code 主代理结合测试、审查结果和人工判断统一裁决
- 外部 agent 只应接收完成任务所需的最小上下文；敏感信息边界仍受 Section 3：AI 治理（ref-04）约束

### 2.4 上游依据与映射原则

本技能应优先参考上游官方文档与官方仓库，按阶段映射到本地工作流；尽量少在技能中写死易随版本变化的固定细节。

| 上游来源 | 在本工作流中的用途 |
|------|------|
| `spec-kit` 官方文档 / 官方仓库 | 校准 Phase 0 / 2 / 3 / 4 / 5 / 6 的规格链路顺序、核心命令与产物定义 |
| `gstack` 官方站 / 官方仓库 | 校准 Phase 1 / 3 / 7 / 8 / 9 / 10 的评审、QA、发布、复盘类职责边界 |
| 其他工具官方文档 / 官方仓库 | 校准 `agency-agents`、外部代理编排、`context7`、`gitleaks` 等阶段辅助能力的真实用法 |

**规则**：
- 当本技能与上游工具当前行为存在冲突或歧义时，SHOULD 先复核上游官方文档，再回写本技能
- 本技能负责定义“阶段与工具如何组合”，不负责替代上游文档去冻结所有版本细节
- 若任务依赖新版本库、陌生 SDK、或近期变化的工具行为，MUST 优先查官方文档，而不是只依赖技能内静态描述

---

## Section 10：各工具详细说明（Tool Reference）

### 10.1 spec-kit

```bash
# 安装（持久化，推荐）— 将 vX.Y.Z 替换为最新 release tag
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z

# 或安装 main 分支最新（可能包含未发布变更，不推荐生产）
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 升级 — 同样建议锁定版本 tag
uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@vX.Y.Z

# 一次性使用（无需安装）
uvx --from git+https://github.com/github/spec-kit.git@vX.Y.Z specify init . --ai <your-agent>

# 项目初始化（一次性）
specify init . --ai <your-agent>                          # 在当前目录初始化
specify init --here --ai <your-agent>                     # 等价写法
specify init . --ai <your-agent> --force                  # 强制合并，跳过确认
specify init . --ai codex --ai-skills                     # Codex CLI 常用写法：同时安装 agent skills
specify init . --ai <your-agent> --branch-numbering timestamp  # 时间戳分支编号（分布式团队推荐，避免编号冲突）
specify check                                       # 验证工具是否就绪
specify status                                      # 查看当前 feature 状态（v0.3.1+）
specify doctor                                      # 项目健康诊断（v0.3.0+）

# 核心命令（使用顺序）
/speckit.constitution            # 项目原则（一次性）
/speckit.specify "功能描述"      # PRD + 用户故事（生成初稿；重复执行会覆盖 spec.md，仅在推倒重来时使用）
/speckit.clarify                 # 澄清模糊点，追加写入 spec.md；可多次执行直到规格无歧义（plan 前 MUST 执行）
/speckit.checklist               # 需求质量 checklist（plan 前执行，检查需求完整性/清晰度/一致性，不是代码验收）
/speckit.plan "技术栈"           # 技术方案
/speckit.tasks                   # 任务拆解
/speckit.analyze                 # 跨文档一致性分析（tasks 后、implement 前运行）
/speckit.implement               # 执行实现

# Codex CLI 语法（--ai-skills 模式，与 /speckit.* 等价）
$speckit-constitution / $speckit-specify / $speckit-clarify / $speckit-checklist / $speckit-plan / $speckit-tasks / $speckit-analyze / $speckit-implement

# Extensions：扩展新能力（Jira/Linear/Azure DevOps/代码审查等）
specify extension search             # 搜索可用扩展
specify extension add <name>         # 安装扩展（写入 .claude/commands/）
specify extension list               # 列出已安装扩展
specify extension remove <name>      # 卸载扩展

# Presets：自定义模板格式（规范化 spec/plan/tasks 输出风格）
specify preset search                # 搜索可用预设
specify preset add <name>            # 安装预设
specify preset list                  # 列出已安装预设
specify preset enable <name>         # 启用预设（v0.3.2+）
specify preset disable <name>        # 禁用预设（保留安装，暂时停用；v0.3.2+）
specify preset remove <name>         # 卸载预设
```

> **Extensions vs Presets**：Extensions 增加新命令（集成外部工具），Presets 覆盖现有模板格式（定制输出风格）。两者可叠加，优先级：project overrides > presets > extensions > core。

### 10.2 gstack

```bash
# 初始安装（Claude Code）
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup

# 初始安装（Codex CLI / 宿主等价路径）
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.codex/skills/gstack && cd ~/.codex/skills/gstack && ./setup

# 升级
/gstack-upgrade                  # 自动检测安装方式并升级到最新版本

# 产品方向
/office-hours                    # 方向模糊/问题定义不清时先做产品梳理
/plan-ceo-review                 # 产品方向评审（寻找最优版本）
/plan-eng-review                 # 架构深度评审（图表、边界、失败模式）

# 开发 & 审查
/review                          # 代码审查（生产级 bug）
/browse                          # 持久化浏览器会话，用于页面操作、截图与交互验证

# 浏览器 & 测试
/setup-browser-cookies           # 导入本机浏览器 cookies，测试登录后页面
/qa                              # feature branch 默认走 diff-aware；最常用

# 发布 & 复盘
/qa --quick                      # 30 秒冒烟测试（staging 验证用）
/qa --regression <baseline>      # 对比基线回归测试
/ship                            # 发布
/retro                           # 周复盘
```

> spec-kit 升级分两层：先升级 CLI，再在项目内执行 `specify init --here --force --ai <your-agent>` 刷新 commands/templates/scripts。

### 10.3 agency-agents 常用角色

上游仓库：`https://github.com/msitarzewski/agency-agents`

当前 Claude Code 推荐安装方式：在 `agency-agents` 仓库目录执行官方安装脚本。

```bash
# 初次安装 / 重装（在 agency-agents 仓库目录下执行）
./scripts/install.sh --tool claude-code

# 升级后重新安装到 Claude Code agents 目录
git pull origin main
./scripts/install.sh --tool claude-code

# 手动方式（仅在需要拷贝单个分类时使用）
cp engineering/*.md ~/.claude/agents/
```

| 场景 | 角色 |
|------|------|
| API / 数据库设计 | `engineering-backend-architect` |
| 前端组件开发 | `engineering-frontend-developer` |
| 安全审查 | `engineering-security-engineer`（工作流中简称 `security-engineer`） |
| 代码复审 | `engineering-code-reviewer` |
| 快速原型 | `engineering-rapid-prototyper` |

### 10.4 其他工具

| 工具 | 用法 |
|------|------|
| context7 MCP | 提示词末尾加 `use context7`，获取最新库文档，防止 API 幻觉 |
| Claude Code hooks | `~/.claude/settings.json`，全局自动 lint + 会话结束提醒 |
| AGENTS.md | 项目根目录，定义规范 + 禁止事项 + 验证命令 |

### 10.5 oh-my-claudecode（OMC）

```bash
# 升级
omc update                       # 升级 CLI/plugin（不刷新 CLAUDE.md/config）
/oh-my-claudecode:omc-setup      # 安装、刷新 CLAUDE.md/config、诊断、MCP 配置

# 使用命令
/oh-my-claudecode:ask codex "review this patch for security and correctness"
/oh-my-claudecode:ask gemini "review this UI diff for UX and clarity"
/oh-my-claudecode:ccg "Codex 看架构与安全，Gemini 看可读性与交互"
/oh-my-claudecode:team "implement tasks T1,T2 with clear ownership"
/oh-my-claudecode:omc-teams 2:codex "analyze backend risks and propose fixes"
```

**规则：**
- 实现阶段优先用 `team` / `omc-teams` 做并行分工，审查阶段优先用 `ask` / `ccg` 做交叉复核
- 只有在任务可拆分、上下文边界清楚时才启用并行；否则单代理更稳
- OMC 适合作为 Claude Code 的增强层，不替代 `spec-kit`、`gstack`、`agency-agents`

### 10.5A 宿主 CLI 安装与 CC Switch

`Claude Code`、`Codex CLI`、`Gemini CLI` 的安装步骤，以及 `CC Switch` 的 provider / model 切换说明，统一见 `ref-08-host-installation-and-cc-switch.md`。

### 10.6 Secret 扫描（gitleaks）

```bash
# 安装 / 升级
brew install gitleaks       # 首次安装
brew upgrade gitleaks       # 升级到最新版本

# 配置 pre-commit hook（项目根目录）
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
gitleaks protect --staged --no-banner
if [ $? -ne 0 ]; then
  echo "Secret 扫描失败，提交已阻断。请检查是否有密钥泄露。"
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit

# 或使用 pre-commit 框架统一管理
# .pre-commit-config.yaml 中添加：
# - repo: https://github.com/gitleaks/gitleaks
#   rev: v8.x.x
#   hooks:
#     - id: gitleaks
```

**规则：**
- 任何包含 key / secret / token / password 的字符串变量 MUST 来自环境变量或 vault，MUST NOT 硬编码
- `.env` 文件 MUST 加入 `.gitignore`；MUST 提供 `.env.example` 作为模板
- CI 流水线 MUST 同样运行 gitleaks，作为第二道防线

### 10.7 工具版本检查（核心 5 件套）

进入工具维护/升级场景，或用户明确要求时，代理 SHOULD 检查以下 5 个工具是否需要升级。默认不在每次会话开始时自动检查或自动升级；若升级需要网络、写权限或交互确认，则按宿主环境规范处理。其他工具（Claude Code CLI、Codex CLI、Gemini CLI 等）不在该清单范围内。

**建议检查脚本（可并行执行）：**

```bash
# gstack
~/.claude/skills/gstack/bin/gstack-update-check --force 2>/dev/null
~/.codex/skills/gstack/bin/gstack-update-check --force 2>/dev/null

# specify-cli（对比 PyPI 最新版）
uv tool list 2>/dev/null | grep specify-cli

# gitleaks
brew outdated gitleaks 2>/dev/null

# agency-agents
git -C <agency-agents-path> fetch --dry-run 2>/dev/null

# oh-my-claudecode
omc update --check 2>/dev/null
```

**升级命令（检测到更新时自动执行）：**

| 工具 | 升级命令 |
|------|---------|
| **gstack** | `/gstack-upgrade`（内置交互流程） |
| **specify-cli** | `uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@vX.Y.Z` |
| **gitleaks** | `brew upgrade gitleaks` |
| **agency-agents** | `git -C <agency-agents-path> pull origin main && <agency-agents-path>/scripts/install.sh --tool claude-code` |
| **oh-my-claudecode** | `omc update`（安装/诊断用 `/oh-my-claudecode:omc-setup`） |

> `<agency-agents-path>` 替换为实际克隆路径。gstack 升级通常带有宿主侧安装/确认流程；其余升级动作也应遵守当前宿主的权限、网络和交互约束。
>
> Codex CLI 安装写法表示“沿用同一套 gstack 安装脚本，但放到宿主等价技能目录”；若当前宿主的技能目录或加载机制不同，应按宿主规范调整路径。

---

## Section 11：参考来源（References）

| 工具 / 主题 | 来源 |
|------|------|
| spec-kit 官方仓库 | https://github.com/github/spec-kit |
| spec-kit 官方 Quick Start | https://github.github.com/spec-kit/quickstart.html |
| gstack 官方站 | https://gstacks.org/ |
| gstack 官方仓库 | https://github.com/garrytan/gstack |
| context7 MCP | https://github.com/upstash/context7 |
| hooks 配置 | https://docs.anthropic.com/en/docs/claude-code |
| agency-agents | https://github.com/msitarzewski/agency-agents |
| oh-my-claudecode | https://github.com/Yeachan-Heo/oh-my-claudecode |
| gitleaks | https://github.com/gitleaks/gitleaks |
