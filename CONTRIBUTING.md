# Contributing

本仓库用于存放可复用的 Agent Skills。提交内容应满足三个目标：规范对齐、便于分发、可安全公开。

面向使用者的安装与配置说明见 `README.md`；本文件只负责说明如何新增、修改、校验和提交技能。

## 新增技能

新增技能时，最小目录结构如下：

```text
skills/<skill-name>/
├── SKILL.md
├── scripts/          # 可选
├── references/       # 可选
└── assets/           # 可选
```

要求：

- 目录名必须与 `SKILL.md` 中的 `name` 完全一致。
- `name` 仅使用小写字母、数字和连字符。
- 技能目录中只放可复用、可分发的内容。
- 不要在默认值中写入用户私有路径、真实凭证或强绑定本机环境的配置。

## 修改现有技能

修改现有技能时，请优先确认本次变更属于哪一类：

- 仅修改技能内部说明：更新对应技能目录下的 `SKILL.md` 或引用文档即可
- 修改脚本、依赖、安装方式或配置方式：除技能文档外，还应检查 `README.md` 是否需要同步更新
- 修改通用仓库规则或 Agent 约束：同步检查 `AGENTS.md`

## SKILL.md 要求

每个技能必须包含 YAML frontmatter，后接 Markdown 正文。

最小示例：

```md
---
name: my-skill
description: 说明这个技能做什么，以及在什么场景下使用。
---
```

推荐但非必须的字段：

- `license`
- `compatibility`
- `metadata`
- `allowed-tools`

编写建议：

- `metadata` 保持扁平，优先使用字符串值。
- 主文件保持简洁，深入说明拆到 `references/`。
- 正文应强调可执行指令，而不是宣传性描述。
- 如果技能依赖脚本，必须明确写出脚本路径和调用方式。

## scripts / references / assets 的使用

- `scripts/`：技能运行时调用的脚本或工具
- `references/`：按需加载的补充文档
- `assets/`：模板、映射表、示例资源等静态文件

引用链保持浅层，优先从 `SKILL.md` 直接指向这些文件，避免多层跳转。

## 密钥与本地文件

以下内容禁止提交：

- `config.json`
- API Key、Token、Cookie、私有地址、真实账号信息
- `.DS_Store`
- `node_modules/`
- `.omc/`、`.omx/` 或其他运行时状态目录

如果技能需要配置，请只提交模板文件，例如 `config.example.json`。

## 提交前检查清单

在发起 PR 或提交前，请至少确认：

1. 技能目录结构符合规范。
2. `SKILL.md` frontmatter 命名与字段一致。
3. 所有被引用文件都真实存在。
4. `git diff --stat` 中没有误带运行时文件或敏感内容。
5. 如本机具备条件，运行规范校验工具。

建议命令：

```bash
rg --files skills
find skills -name SKILL.md
git diff --stat
git status --short
```

如已安装 `skills-ref`：

```bash
skills-ref validate ./skills/<skill-name>
```

如仓库已启用 GitHub Actions，请同时检查 `.github/workflows/validate-skills.yml` 对应的校验规则，避免本地通过但 CI 失败。

## 仓库卫生

- 保持变更范围小且便于审查。
- 除非明确在做全库治理，否则尽量一次只修改一个技能。
- 涉及安装方式、行为变化或新增依赖时，同步更新 `README.md` 与对应技能文档。
- 示例内容应保持通用、安全、可公开分发。
