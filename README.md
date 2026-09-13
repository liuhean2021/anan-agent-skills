# Anan-Agent-Skills

遵循 [agentskills.io](https://agentskills.io/specification) 规范的 Agent 技能库，兼容 Claude Code、Cursor、Copilot 等支持该标准的 Agent。

本仓库既面向人工使用，也面向具备文件系统与命令执行能力的 Agent 自动安装。下面的安装与配置步骤，两者都可以直接复用。

## 技能列表

| 技能 | 说明 |
|------|------|
| [baidu-web-search](skills/baidu-web-search/SKILL.md) | 使用百度千帆 API 进行全网实时搜索 |
| [commit-message](skills/commit-message/SKILL.md) | 根据 git diff 生成规范的 commit message |
| [oss-upload-online-access](skills/oss-upload-online-access/SKILL.md) | 上传文件到阿里云 OSS / 腾讯云 COS 并返回公网链接 |
| [pre-commit-review](skills/pre-commit-review/SKILL.md) | 提交前代码审查，输出修改总结与结构化审查结论 |
| [excel-to-pdf](skills/excel-to-pdf/SKILL.md) | macOS 用本机 Microsoft Excel 把 xlsx 转成排版正确的 PDF（自动铺满页宽、分页不切断合并单元格） |
| [frontend-dev-workflow](skills/frontend-dev-workflow/SKILL.md) | 前端 AI Coding 工作流：接手项目、修改页面、新增页面，测试先行 + 视觉验证闭环 |
| [design-md-author](skills/design-md-author/SKILL.md) | 从零为新前端项目生成设计系统契约 DESIGN.md（SSOT）+ tokens.css + 防漂移校验脚本 |
| [ai-coding-workflow](skills/ai-coding-workflow/SKILL.md) | 统一 AI Coding 工作流：Phase 0~10 / 5B 为主线，集成 spec-kit、Context7 MCP、gitleaks 等，评审/QA/发布等能力由 agent 原生完成；强制阶段顺序与完成前验证 |

> `ai-coding-workflow` 与 `frontend-dev-workflow` 均为独立技能，可单独安装和使用；二者不互相依赖。若同一项目同时使用，只通过通用产物（如 `spec.md`、`interaction-design.md`、`plan.md`、`tasks.md`）协作。

## 安装说明（适用于人工与 Agent）

### 推荐方式：npx skills

使用 [skills CLI](https://github.com/vercel-labs/skills) 一条命令安装，支持所有 Agent：

```bash
# 安装全部技能到当前项目
npx skills add liuhean2021/Anan-Agent-Skills

# 全局安装（所有项目可用）
npx skills add liuhean2021/Anan-Agent-Skills -g

# 全局安装指定 Agent（如仅安装到 Claude Code）
npx skills add liuhean2021/Anan-Agent-Skills -a claude -g

# 全局安装单个技能
npx skills add liuhean2021/Anan-Agent-Skills -s ai-coding-workflow -g
```

安装完成后 Agent 自动识别技能；含依赖的技能在首次使用时由 Agent 自行安装。

### 手动安装

如不使用 `npx skills`，也可手动克隆并软链接：

**第一步：克隆仓库**

```bash
git clone https://github.com/liuhean2021/Anan-Agent-Skills ~/anan-agent-skills
```

**第二步：填写配置**（按需，仅部分技能需要）

```bash
cp ~/anan-agent-skills/skills/<技能名>/config.example.json ~/anan-agent-skills/skills/<技能名>/config.json
# 编辑 config.json 填入凭证
```

**第三步：将技能目录软链接到 Agent 的技能路径**

各 Agent 的技能目录：

| Agent | 技能路径 |
|-------|---------|
| 通用（跨客户端） | `~/.agents/skills/` |
| Claude Code | `~/.claude/skills/` |
| Codex CLI | `~/.codex/skills/` |
| Cursor | `~/.cursor/skills/` |

```bash
# 以 Claude Code 为例，其他 Agent 替换路径即可
mkdir -p ~/.claude/skills
for skill in ~/anan-agent-skills/skills/*/; do
  ln -sf "$skill" ~/.claude/skills/"$(basename "$skill")"
done
```

> `ai-coding-workflow` 属于全局规则型技能。安装后，还需按其 `SKILL.md` 中的「初次配置（全局强制生效）」章节，将最小必要规则写入对应 Agent 的全局规则文件（如 `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`）。

## 配置说明

- 仅少数技能需要额外配置。
- 需要本地配置时，请从 `config.example.json` 复制为本地 `config.json` 后再填写。
- `config.json` 属于本地私有配置，不应提交到仓库。
- 首次使用依赖脚本型技能时，如宿主未自动安装依赖，请按技能文档中的说明安装。

## 仓库维护与贡献

- 面向 Agent 的仓库工作约束见 [AGENTS.md](AGENTS.md)。
- 新增或修改技能的贡献规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可协议

MIT-0 · MIT 无署名

ClawHub 上发布的所有技能均采用 [MIT-0](LICENSE) 许可协议。您可以免费使用、修改和重新分发，无需署名。
