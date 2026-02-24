# Anan-Agent-Skills

遵循 [agentskills.io](https://agentskills.io/specification) 规范的 Agent 技能库，兼容 Claude Code、Cursor、Copilot 等支持该标准的 Agent。

## 技能列表

| 技能 | 说明 |
|------|------|
| [baidu-web-search](skills/baidu-web-search/SKILL.md) | 使用百度千帆 API 进行全网实时搜索 |
| [commit-message](skills/commit-message/SKILL.md) | 根据 git diff 生成规范的 commit message |
| [oss-upload-online-access](skills/oss-upload-online-access/SKILL.md) | 上传文件到阿里云 OSS / 腾讯云 COS 并返回公网链接 |
| [pre-commit-review](skills/pre-commit-review/SKILL.md) | 提交前代码审查，输出修改总结与结构化审查结论 |

## 快速开始

**第一步：克隆仓库**

```bash
git clone <repo-url> ~/anan-agent-skills
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
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.cursor/skills/` |

```bash
# 以 Claude Code 为例，其他 Agent 替换路径即可
mkdir -p ~/.claude/skills
for skill in ~/anan-agent-skills/skills/*/; do
  ln -sf "$skill" ~/.claude/skills/"$(basename "$skill")"
done
```

完成后 Agent 自动识别技能；含依赖的技能在首次使用时由 Agent 自行安装。
