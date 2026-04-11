# AGENTS.md

本仓库是一个 Agent Skills 技能库，应按“可分发内容仓库”而不是普通应用项目来维护。

面向用户的安装、配置、技能列表说明以 `README.md` 为准；本文件只定义 Agent 在仓库内工作时必须遵守的约束。

## 适用范围

- 顶层 `skills/` 用于存放可发布的技能。
- 每个技能必须位于 `skills/<skill-name>/`。
- 每个技能目录必须包含 `SKILL.md`。
- 可选子目录为 `scripts/`、`references/`、`assets/`。

## 规范来源

- 以 Agent Skills 官方规范为准：<https://agentskills.io/specification>
- `SKILL.md` 的 frontmatter 是技能契约，必须保持合法且尽量精简。
- `name` 必须与父目录名一致。
- `description` 应同时说明“做什么”和“什么时候使用”。
- `metadata` 应尽量保持扁平，优先使用字符串值。

## 仓库规则

- 不得提交密钥、Token、Cookie、真实凭证或其他敏感信息。
- 不得提交运行时生成的本地配置，例如 `config.json`。
- 不得提交本地运行状态，例如 `.omc/`、`.omx/` 或类似 Agent 状态目录。
- 不得提交系统或编辑器垃圾文件，例如 `.DS_Store`。
- 不得提交依赖产物，例如 `node_modules/`，除非某个技能明确设计为随仓库分发依赖。
- 变更应尽量小、易审查、可回滚，优先复用现有模式，不要随意扩张结构。

## 技能规则

- 主 `SKILL.md` 保持简洁，细节内容优先拆到 `references/`。
- 引用技能内其他文件时，优先使用相对技能根目录的路径，例如 `references/REFERENCE.md`。
- 只有在确实存在环境要求时，才填写 `compatibility`。
- 只有在目标客户端明确支持且确有必要时，才使用 `allowed-tools`。
- 如果技能依赖脚本，正文必须明确告诉 Agent 执行哪个脚本、传入什么参数。

## 验证要求

在声称技能可用之前，至少验证以下内容：

1. 技能目录结构符合预期。
2. `SKILL.md` 的 frontmatter 合法。
3. `scripts/`、`references/`、`assets/` 中被引用的文件真实存在。
4. 没有引入敏感文件或仅本地可用的运行时文件。

推荐检查命令：

```bash
rg --files skills
find skills -name SKILL.md
git ls-files --others --exclude-standard
```

如果本机已安装 `skills-ref`，可进一步执行：

```bash
skills-ref validate ./skills/<skill-name>
```

## Agent 编辑约束

- 优先做最小范围修改，不做无关顺手清理。
- 修改技能行为或安装方式时，应在同一变更中同步更新附近文档。
- 如果改动影响用户安装、配置、依赖或使用方式，应同步检查 `README.md` 是否需要更新。
- 除非任务明确要求，不要一次性大规模统一全仓库风格。
- 如果发现已被跟踪的敏感信息或真实凭证，应立即中止常规修改并提示风险。
