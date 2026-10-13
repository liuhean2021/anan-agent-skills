# §2 工具体系总览 + §10 各工具详细说明 + §11 参考来源

> 适用：工具选型、安装升级、命令速查

---

## Section 2：工具体系总览（Tool Stack）

AI Coding Workflow 以 `Phase 0~10 / 5B` 为主线推进。以下工具与角色是**阶段内介入能力**，用于帮助代理完成同一条工作流，而不是多条彼此分离的流程。

### 2.1 工作流组成能力

| 层级 | 工具 | 职责 |
|------|------|------|
| **纪律层** | 本技能内置验证纪律 | 阶段顺序、完成必验证、TDD/调试纪律（横切全 Phase，任何有能力的 agent 原生遵守；见 `ref-08-verification-gate.md`） |
| 基础环境层 | 各 Agent 原生 hooks | 自动化质量卡口、事件触发命令或 prompt/agent/http/mcp_tool handler |
| 上下文层 | AGENTS.md + CLAUDE.md + memory/ | 项目记忆、AI 角色定义、架构决策 |
| 需求层 | spec-kit | 规格驱动开发，需求 → 规格 → 计划 → 任务 |
| 验证层 | agent 自身能力 + 单元测试 | 评审、QA、发布等由专注子任务完成；UI 验证 + 业务逻辑覆盖（agent 能力不可用时降级为人工/CI） |
| 沉淀层 | ADR + Checkpoint commit | 架构决策记录，知识不流失 |

### 2.2 AI 代理与模型选择

```
主力：Claude Code CLI
  模型与推理档位遵循当前 CLI / 仓库默认配置，MUST NOT 在工作流文档中硬编码固定模型分工

辅助：Codex CLI、Cursor（次选）
规则：单一模型优先；超限时保持代理不变，临时替换模型补充
```

### 2.3 上游依据与映射原则

本技能应优先参考上游官方文档与官方仓库，按阶段映射到本地工作流；尽量少在技能中写死易随版本变化的固定细节。

| 上游来源 | 在本工作流中的用途 |
|------|------|
| `spec-kit` 官方文档 / 官方仓库 | 校准 Phase 0 / 2 / 3 / 4 / 5 / 6 的规格链路顺序、核心命令与产物定义 |
| 其他工具官方文档 / 官方仓库 | 校准 `gitleaks` 等阶段辅助能力的真实用法 |

**规则**：
- 官方链路为 constitution → specify →（clarify）→ plan →（checklist）→ tasks →（analyze）→ implement →（converge）；官方另提供 `specify workflow run speckit|bugfix|assess` 编排引擎（speckit 工作流仅含 specify → plan → tasks → implement 与两个人工评审关卡，不含 clarify/checklist/analyze）。本技能按 Phase 手动编排同一链路；Phase 1、3.5、7~10、Phase 5 先写失败测试、前端设计门禁、`/commit-message` 纪律属于技能在官方链路之上的扩展，不是官方流程
- 当本技能与上游工具当前行为存在冲突或歧义时，SHOULD 先复核上游官方文档，再回写本技能
- 本技能负责定义“阶段与工具如何组合”，不负责替代上游文档去冻结所有版本细节
- 若任务依赖新版本库、陌生 SDK、或近期变化的工具行为，MUST 优先查官方文档，而不是只依赖技能内静态描述

---

## Section 10：各工具详细说明（Tool Reference）

### 10.1 spec-kit

```bash
# 最新稳定版版本号：用已登录的 gh 获取（不依赖 specify 的 auth.json）
TAG="$(gh api repos/github/spec-kit/releases/latest --jq .tag_name)"
# 获取失败时：提示用户到 https://github.com/github/spec-kit/releases/latest 查看最新版本并主动输入，TAG=<用户输入的版本号>；代理不得自行猜测版本

# 安装（持久化，推荐）— 始终安装最新稳定版
uv tool install specify-cli --from "git+https://github.com/github/spec-kit.git@$TAG"

# 或安装 main 分支最新（可能包含未发布变更，不推荐生产）
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 升级（官方推荐，见 docs/upgrade.md）— 始终升级到最新稳定版；显式传 --tag 时 specify 不再自行查询最新版本，不受 GitHub 限流影响
specify self upgrade --dry-run --tag "$TAG"   # 预览：显示检测到的安装方式、目标版本与将执行的命令
specify self upgrade --tag "$TAG"             # 升级到最新稳定版

# 一次性使用（无需安装）
uvx --from "git+https://github.com/github/spec-kit.git@$TAG" specify init . --integration <agent-key>

# 项目初始化（一次性）
specify init . --integration <agent-key>                          # 在当前目录初始化
specify init --here --integration <agent-key>                     # 等价写法
specify init . --integration <agent-key> --force                  # 强制合并，跳过确认
specify init . --integration codex --integration-options="--skills"  # Codex CLI 常用写法：同时安装 agent skills
# 时间戳编号（分布式团队推荐）：v1.1.x 的 init 已无 --branch-numbering。规格目录在 .specify/init-options.json 设 feature_numbering: "timestamp"；分支需先 specify extension add git，再在 .specify/extensions/git/git-config.yml 设 branch_numbering: timestamp，两处保持一致
specify check                                       # 验证工具是否就绪
specify version                                     # 显示版本与系统信息
specify version --features                          # 显示本地 CLI 功能标记
specify version --features --json                   # 以 JSON 格式输出功能标记（CI/脚本用）
specify self upgrade --tag "$TAG"                    # 升级 CLI 到最新稳定版（TAG 获取方式见上；不带 --tag 的 self check / self upgrade 需额外配置 ~/.specify/auth.json，本技能不采用）

# 核心命令（使用顺序）。下列以连字符写法为主（invoke_separator 为 "-"，v1.1.x Claude Code 新项目默认）；旧项目为点号时把 - 换回 .，如 /speckit.plan，详见 SKILL.md「命令名分隔符」
/speckit-constitution            # 项目原则（一次性）
/speckit-specify "功能描述"      # PRD + 用户故事（生成初稿；重复执行会覆盖 spec.md，仅在推倒重来时使用）
/speckit-clarify                 # 澄清模糊点，追加写入 spec.md；可多次执行直到规格无歧义（plan 前 MUST 执行）
/speckit-plan "技术栈"           # 技术方案
/speckit-checklist               # 需求质量 checklist（官方顺序：plan 之后、tasks 之前，检查需求完整性/清晰度/一致性，不是代码验收）
/speckit-tasks                   # 任务拆解
/speckit-github-taskstoissues   # 将 tasks.md 转为 GitHub Issues（可选，在 tasks 后、implement 前执行；需先 specify extension add github，另需 git 与 github-mcp-server；核心 /speckit-taskstoissues 自 v1.1.0 起弃用）
/speckit-analyze                 # 跨文档一致性分析（tasks 后、implement 前运行）
/speckit-implement               # 执行实现（若存在 checklists/ 会先检查勾选状态，有未勾选项会询问是否继续）
/speckit-converge                # implement 之后运行：对照 spec/plan/tasks 评估代码，把未完成工作以新 Convergence 阶段追加到 tasks.md（只追加，不改代码与 spec/plan），随后再 implement

# 内置扩展命令（需 specify extension add <名称>；init 默认不安装；连字符写法，点号项目同理换回）
# git：/speckit-git-initialize | -feature | -validate | -remote | -commit（feature 为 before_specify 强制 hook，自动建分支；auto_commit 默认关闭）
# assess：/speckit-assess-intake → -research → -define → -shape → -decide（产出 .specify/assessments/<slug>/，go 后交给 /speckit-specify）
# bug：/speckit-bug-assess → -fix → -test（产出 .specify/bugs/<slug>/{assessment,fix,test}.md）
# agent-context：/speckit-agent-context-update（刷新 CLAUDE.md/AGENTS.md 中的 SPECKIT 托管区块，after_specify/after_plan 可选 hook 提示触发）
# github：/speckit-github-taskstoissues（见上）

# Codex CLI 语法（skills integration 模式，与 /speckit-* 等价；扩展命令为 $speckit-<扩展>-<命令>）
$speckit-constitution / $speckit-specify / $speckit-clarify / $speckit-checklist / $speckit-plan / $speckit-tasks / $speckit-github-taskstoissues（需 github 扩展） / $speckit-analyze / $speckit-implement / $speckit-converge

# Extensions：扩展新能力（Jira/Linear/Azure DevOps/代码审查等）
specify extension list               # 列出已安装扩展
specify extension add <name>         # 安装扩展（commands 模式写入 .claude/commands/，skills 模式写入 .claude/skills/speckit-*/；支持 --from URL、--dev 本地目录、--priority）
specify extension remove <name>      # 卸载扩展（--keep-config 保留配置、--force 跳过确认）
specify extension search [query]     # 搜索可用扩展（--tag、--author、--verified 过滤）
specify extension info <name>        # 查看扩展详情
specify extension catalog list       # 列出已配置的扩展目录
specify extension catalog add <url>  # 添加扩展目录（--name、--priority、--install-allowed）
specify extension catalog remove <name>  # 移除扩展目录

# Presets：自定义模板格式（规范化 spec/plan/tasks 输出风格）
specify preset list                  # 列出已安装预设
specify preset add <name>            # 安装预设（--from URL、--dev 本地目录、--priority）
specify preset remove <name>         # 卸载预设
specify preset search [query]        # 搜索可用预设（--tag、--author 过滤）
specify preset info <name>           # 查看预设详情
specify preset enable <name>         # 启用预设
specify preset disable <name>        # 禁用预设（保留安装，暂时停用）
specify preset set-priority <id> <n> # 设置预设优先级（数字越小优先级越高）
specify preset resolve <template>    # 查看某个模板在解析栈中的来源（调试用）
specify preset catalog list          # 列出已配置的预设目录
specify preset catalog add <url>     # 添加预设目录（--name、--priority、--install-allowed）
specify preset catalog remove <name> # 移除预设目录
```

> **Extensions vs Presets**：Extensions 增加新命令（集成外部工具），Presets 覆盖现有模板格式（定制输出风格）。两者可叠加，优先级：project overrides > presets > extensions > core。扩展和预设均支持通过目录（catalog）发现和安装，目录配置分别存储在 `.specify/extension-catalogs.yml` 和 `.specify/preset-catalogs.yml`。

### 10.2 评审 / QA / 发布能力

方向评审、架构评审、代码审查、QA、发布、复盘这类职责，是任何有能力的现代 agent（不限于 Claude Code，也包括 Codex、Gemini 等宿主）本身就能原生完成的常规任务，不需要依赖某个特定外部工具或插件来"解锁"。具体做法：

| 职责 | 承载方式 |
|------|---------|
| 产品方向评审 | agent 自身或专门子任务做结构化访谈式规划（方向模糊时先梳理问题空间），再做结构化方向评审（寻找最优版本、确认 MVP 边界） |
| 架构评审 | agent 自身或专门子任务做结构化架构评审（图表、边界条件、失败模式） |
| 代码审查 | 由专注审查视角的子任务完成（可以是宿主的子代理，也可以是同一个 agent 切换视角自查），审查生产级 bug（race condition、N+1、信任边界等） |
| 安全专项审查 | 涉及鉴权、支付、隐私、权限、密钥等改动时，由专注安全视角的子任务追加审查 |
| QA 验证 | 由专注功能验证的子任务完成（feature branch 默认 diff-aware；需要冒烟测试或回归测试时显式说明） |
| 发布 | 走标准 git/PR 流程，由 agent 自身执行 |
| 周复盘 | agent 自身生成结构化复盘产出 |

> 上表中的职责名称不绑定任何特定产品或插件；具体由 agent 自身能力、子任务，还是当前宿主已安装的某个斜杠命令承载，视环境而定。都不可用时按 `SKILL.md`「评审/QA/发布能力承载策略」降级为人工审查、测试命令或 CI 流程。

> spec-kit 升级分两层（以官方 `docs/upgrade.md` 为准）：先用 `specify self upgrade --tag <最新版本>` 升级 CLI（最新版本用 `gh api repos/github/spec-kit/releases/latest --jq .tag_name` 获取）；再在项目内执行 `specify integration upgrade <agent-key>` 刷新集成文件（按安装清单检测本地改动，有改动会停下，`--force` 才覆盖；不改 `.specify/memory/constitution.md`），然后 `specify extension update` 更新已装扩展。Codex skills 模式加 `--integration-options="--skills"`。CLI 始终升级到最新稳定版。

### 10.3 其他工具

| 工具 | 用法 |
|------|------|
| Claude Code hooks | 用户级 `~/.claude/settings.json`、项目级 `.claude/settings.json`、本地 `.claude/settings.local.json`；handler 可为 `command`、`prompt`、`agent`、`http`、`mcp_tool` |
| AGENTS.md | 项目根目录，定义规范 + 禁止事项 + 验证命令 |

### 10.4 验证纪律（内置横切层，无需外部插件）

**绑定对象**：**ai-coding-workflow 技能** — 与使用哪个 Agent / IDE **无关**。

**职责**：横切纪律层 — 阶段顺序、完成必验证（Iron Law）、TDD/调试深化；规则内联生效于 `ref-08-verification-gate.md`，**不替代** Phase 0~10 定义，也不依赖任何外部插件是否安装。任何有能力的 agent（Claude Code、Codex、Gemini 或其他宿主）都应原生遵守。

#### 与 workflow Phase 的映射

| 纪律 | 对应 workflow 位置 | 说明 |
|-----------------|-------------------|------|
| 完成前必验证（verification-before-completion） | 全 Phase（§ 13.3） | 规则内联于 `ref-08` |
| 测试先行（test-driven-development） | Phase 5 / 5B | 强化红绿循环 |
| 系统化调试（systematic-debugging） | Phase 5B | 先根因再改代码 |
| 方向澄清（brainstorming 式访谈） | Phase 1~2 | 与结构化访谈式规划并存，不替代 spec 链路 |
| 提交审查请求（requesting-code-review） | Phase 7 | 由专注审查视角的子任务完成 |
| 处理审查意见（receiving-code-review） | Phase 7 修复轮次 | 不盲改 review 意见 |
| 收尾判断（finishing-a-development-branch） | Phase 9 前 | 合并/PR 决策树 |

### 10.5 工具检查清单

进入**场景 E**、工具维护场景，或用户明确要求时，代理 SHOULD 检查以下能力工具。默认不在每次会话开始时自动升级。

| 工具 | 职责 | 未安装时 |
|------|------|---------|
| spec-kit | Phase 0~6 规格链路 | 手动 spec / 需安装 CLI |
| gitleaks | Secret 扫描 | 手动 / CI 替代 |

> 方向评审、架构评审、代码审查、QA、发布、复盘由 agent 自身或专门子任务原生承载（见 § 10.2），不是需要单独安装/检查版本的外部工具。

**gitleaks 安装 / 配置（摘录）**

```bash
brew install gitleaks       # 首次安装
brew upgrade gitleaks       # 升级

# pre-commit hook（项目根目录，示例）
gitleaks git --pre-commit --staged --no-banner
```

**gitleaks 规则**：密钥 MUST NOT 硬编码；`.env` MUST 在 `.gitignore`；CI MUST 二次扫描。

**建议版本检查脚本（可并行执行）：**

```bash
# specify-cli
uv tool list 2>/dev/null | grep specify-cli
specify version 2>/dev/null
gh api repos/github/spec-kit/releases/latest --jq .tag_name   # 最新稳定版，与上面的 CLI Version 对比；失败时请用户到 releases/latest 查看

# gitleaks
brew outdated gitleaks 2>/dev/null
```

> specify 自带的 `self check` 与不带 `--tag` 的 `self upgrade` 查询最新版本只认 `~/.specify/auth.json`，不读 `gh` 登录态，未配置时会被限流；本技能统一用 `gh` 取最新版本号再 `--tag` 升级，无需配置 auth.json。

**升级命令（检测到更新时）：**

| 工具 | 升级命令 |
|------|---------|
| specify-cli（CLI） | `specify self upgrade --tag "$(gh api repos/github/spec-kit/releases/latest --jq .tag_name)"`（始终升级到最新稳定版；获取失败（`gh` 未登录、网络或限流）时，代理 MUST 提示用户到 <https://github.com/github/spec-kit/releases/latest> 查看最新版本并主动输入版本号，再用该版本号执行，不得自行猜测版本） |
| spec-kit 项目文件 | `specify integration upgrade <agent-key>` → `specify extension update` |
| gitleaks | `brew upgrade gitleaks` |

### 10.6 升级后必做：官方工作流变化核对

每次升级依赖（尤其 spec-kit）后 MUST 执行以下核对，发现变化 MUST 在同一变更中更新本技能，紧跟官方；不得只升级工具而不核对。

1. **读变更记录与升级文档**：读旧版本到新版本之间每个 release 的说明，重点看 Deprecation、新增/移除的命令与选项、默认行为变化；并读新版本 tag 下的 `docs/upgrade.md`，确认官方推荐的 CLI 与项目文件升级路径是否变化：
   ```bash
   gh api repos/github/spec-kit/releases --paginate -q '.[] | select(.prerelease==false) | "### "+.tag_name+"\n"+.body'
   ```
2. **临时目录实测**（不要在真实项目里试）：
   ```bash
   cd "$(mktemp -d)" && specify init . --integration <agent-key> --non-interactive
   ```
   - 看 Next Steps 与 Enhancement 面板：官方命令清单、调用写法（`/speckit-xxx` 或 `/speckit.xxx`）与推荐顺序（如 `checklist` 在 plan 之后）
   - 看 `.specify/integration.json` 的 `invoke_separator`、命令安装位置（`.claude/skills/` 或 `.claude/commands/`）、`.specify/init-options.json`
   - 对技能里用到的每条 CLI 命令跑 `--help`，确认选项仍存在（如 `--branch-numbering` 已移除）
3. **对照官方命令模板与内置工作流**：新版本 tag 下的 `templates/commands/*.md`（核心命令及其 handoffs、前后置要求）、`extensions/*/commands/`（内置扩展）、`workflows/*/workflow.yml`（官方流程与人工关卡）
4. **回写本技能**：逐项比对 `SKILL.md` 命令映射与阶段摘要、`ref-01` 路由、`ref-02` 命令块、`ref-03` 各 Phase 步骤与退出条件、`ref-04` 清单；顺序或行为与官方不一致时以官方为准，技能自有扩展（见 § 2.3）须明确标注
5. **留痕**：在提交说明或审查文档中写明核对的版本区间与发现的变化；无变化也要写明“已核对，无变化”

---

## Section 11：参考来源（References）

| 工具 / 主题 | 来源 |
|------|------|
| spec-kit 官方仓库 | https://github.com/github/spec-kit |
| spec-kit 官方 Quick Start | https://github.github.com/spec-kit/quickstart.html |
| hooks 配置 | https://code.claude.com/docs/en/hooks |
| gitleaks | https://github.com/gitleaks/gitleaks |
