---
name: claude-code-params-calculator
description: 计算 Claude Code CLI 优化参数。根据 AI 模型的真实上下文窗口大小（128K、256K、512K、1M 等）和安全系数，计算出 CLAUDE_CODE_CONTEXT_LIMIT、CLAUDE_AUTOCOMPACT_PCT_OVERRIDE、MAX_MCP_OUTPUT_TOKENS、CLAUDE_CODE_MAX_OUTPUT_TOKENS、MAX_THINKING_TOKENS 等关键参数。
metadata:
  author: liuhean
  email: allsmy.com@gmail.com
---

# Claude Code 参数计算器

根据 AI 模型的实际上下文窗口大小计算 Claude Code CLI 的优化参数。适用于不同规模的模型（128K、256K、512K、1M 等），确保在安全边界内最大化利用上下文。

> 详细计算示例与推荐值 → `references/ref-01-param-calculations.md`

---

## ⛔ 隐私安全（最高优先级）

本技能不涉及任何敏感凭证，所有计算基于公开的模型规格和数学公式。但参数计算结果可能影响 Claude Code 的性能与稳定性，请谨慎应用。

### 使用前确认

- 确认你了解当前使用的 Claude 模型的实际上下文窗口大小
- 确认你了解 Claude Code 版本，不同版本可能有不同的参数默认值
- 生产环境应用前，建议在开发环境先验证

---

## 🚀 快速开始

**计算基准**：所有参数计算基于 Claude Code 内部基准值 **200K（200,000 tokens）**。这个基准值是 Claude Code 定义 100% 上下文使用率的参考点。

### 提供什么数据？

**必需信息**：AI 模型的**上下文窗口大小**或**模型名称**

**两种输入方式**：
1. **精确数值**：直接提供 tokens 数，如 `200000`、`131072`
2. **模型名称**：使用预设名称，如 `claude-sonnet-4.6`、`128k`

### 不知道窗口大小怎么办？

1. **查看官方文档**：访问 Claude 官网查看模型规格
2. **使用预设模型**：脚本内置常见模型预设，用 `--list-presets` 查看
3. **常见模型参考**：
   - Claude Sonnet 4.6: 200K (200000 tokens)
   - DeepSeek Chat: 100K (102400 tokens)
   - DeepSeek Reasoner: 100K (102400 tokens)

### 最简单用法

```bash
# 使用模型名称（推荐）
node scripts/calculate.js claude-sonnet-4.6
node scripts/calculate.js deepseek-chat      # DeepSeek 模型
node scripts/calculate.js deep-seek-reasoner # DeepSeek Reasoner 模型

# 使用 tokens 数
node scripts/calculate.js 200000

# 查看所有预设模型
node scripts/calculate.js --list-presets
```

---

## 🔧 计算前配置确认

开始计算前，请确认以下配置选项是否需要调整。所有选项都有**默认值**，大多数情况下使用默认值即可：

**四个核心配置参数**（每个都有默认值，大多数情况下使用默认值即可）：

1. **安全系数**（默认：0.92）— 为边缘情况设置缓冲，防止令牌溢出
2. **单次工具占比**（默认：0.30）— 限制 MCP 工具单次输出占上下文的最高比例
3. **思考比例**（默认：0.50）— 思考令牌占最大输出令牌的比例
4. **模型输出上限**（默认：8192）— 模型单次生成的最大令牌数

> 详细概念说明、调整建议和选择依据 → `references/ref-01-param-calculations.md`

### 脚本调整方式
使用命令行选项调整默认值：
```bash
# 调整安全系数到 0.85
node scripts/calculate.js claude-sonnet-4.6 --safety 0.85

# 调整工具占比到 0.25
node scripts/calculate.js claude-sonnet-4.6 --tool-ratio 0.25

# 调整思考比例到 0.60
node scripts/calculate.js claude-sonnet-4.6 --thinking-ratio 0.60

# 调整输出上限到 4096
node scripts/calculate.js claude-sonnet-4.6 --output-limit 4096
```

---

## 何时使用

当用户需要优化 Claude Code 配置以获得更好的性能时使用本技能，典型场景包括：

- 新安装 Claude Code 后需要根据模型调整参数
- 升级到更大上下文窗口的模型后重新计算参数
- 遇到 "context limit exceeded" 或 "token limit" 错误时优化配置
- 需要平衡工具输出、思考令牌和总上下文利用率时

---

## 核心算法公式

所有参数计算基于以下统一公式，其中 **模型实际窗口** 指模型真实的上下文令牌数（如 128K = 131072，1M = 1048576）：

> 公式详细推导、特殊情况处理与基准值说明 → `references/ref-01-param-calculations.md`

### 📊 计算基准说明

**默认基准值**：200,000 tokens  
`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 的计算基于 Claude Code 内部基准值 **200K**（200,000 tokens）。这个基准值是 Claude Code 定义 100% 上下文使用率的参考点。

> **重要**：如果 Claude Code 版本更改了内部基准值（非 200,000），需要相应调整公式中的基准值。

### 1. CLAUDE_CODE_CONTEXT_LIMIT
**公式**：直接填模型的真实上限  
**示例**：Claude Sonnet 4.6 (200K) → `200000`

### 2. CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
**公式**：(模型实际窗口 × 安全系数 0.92) ÷ 200000 × 100  
**计算步骤**：
1. 安全窗口 = 模型实际窗口 × 0.92
2. 百分比 = 安全窗口 ÷ 200000 × 100
3. 结果四舍五入到整数

**示例**：128K 模型 (131072 tokens)  
安全窗口 = 131072 × 0.92 = 120586.24  
百分比 = 120586.24 ÷ 200000 × 100 = 60.29% → **60**

### 3. MAX_MCP_OUTPUT_TOKENS
**公式**：模型实际窗口 × 单次工具占比上限 0.30  
**计算步骤**：直接相乘，四舍五入到千位

**示例**：128K 模型 (131072 tokens)  
131072 × 0.30 = 39321.6 → **39000**

### 4. CLAUDE_CODE_MAX_OUTPUT_TOKENS
**公式**：min(模型单次输出上限, 实际需要的最大输出长度)  
**计算建议**：
- 通常设为模型单次输出上限（如 Claude Sonnet 4.6 为 8192）
- 如果实际使用中不需要长输出，可设更小值以节省令牌

**示例**：Claude Sonnet 4.6 → **8192**

### 5. MAX_THINKING_TOKENS
**公式**：CLAUDE_CODE_MAX_OUTPUT_TOKENS × 思考比例 0.5  
**计算步骤**：直接相乘，四舍五入到百位

**示例**：CLAUDE_CODE_MAX_OUTPUT_TOKENS = 8192  
8192 × 0.5 = 4096 → **4100**

---

## 常见模型预计算值

| 模型 | 实际窗口 | CLAUDE_CODE_CONTEXT_LIMIT | CLAUDE_AUTOCOMPACT_PCT_OVERRIDE | MAX_MCP_OUTPUT_TOKENS | CLAUDE_CODE_MAX_OUTPUT_TOKENS | MAX_THINKING_TOKENS |
|------|---------|---------------------------|--------------------------------|-----------------------|------------------------------|---------------------|
| Claude Sonnet 4.6 | 200K (200000) | 200000 | 92 | 60000 | 8192 | 4096 |
| **MiniMax M2.7** | 200K (200000) | 200000 | 92 | 60000 | 131072 | 65536 |
| DeepSeek Chat | 100K (102400) | 102400 | 47 | 30000 | 8192 | 4096 |
| DeepSeek Reasoner | 100K (102400) | 102400 | 47 | 30000 | 8192 | 4096 |

> **注意**：CLAUDE_CODE_MAX_OUTPUT_TOKENS 默认使用模型单次输出上限，可根据需要调整。
> **DeepSeek 说明**：上述模型默认使用 100K 上下文窗口，实际窗口大小可能因版本不同有所变化。

---

## 使用步骤

### 1. 确认模型规格
查看 Claude 官方文档，确认当前使用模型的实际上下文窗口大小和单次输出上限。

### 2. 选择计算方式
- **手动计算**：使用上述公式自行计算
- **脚本计算**：使用 `scripts/calculate.js`（如有）
- **查表**：使用上方的预计算值表

### 3. 应用配置
将计算出的参数添加到 Claude Code 配置文件中。支持多种配置方式，按优先级从高到低：

1. **环境变量**（最高优先级）— 立即生效，会话级配置
2. **Claude Code 设置文件**（`~/.claude/settings.json`）— 全局配置，需重启生效
3. **用户级配置文件**（`~/.claude/config.json`）— 用户级配置

> 详细配置示例、文件位置、JSON 格式说明和完整配置模板 → `references/ref-01-param-calculations.md`

### 4. 应用配置到 Claude Code

**计算完成后，必须将参数写入 `~/.claude/settings.json` 的 `env` 字段：**

1. 读取 `~/.claude/settings.json`
2. 检查 `env` 字段中是否已存在这 5 个参数
3. **有则更新，无则新增** — 将计算结果写入 `env` 对象（值必须为字符串类型）
4. 写入后验证文件 JSON 格式正确，且参数值与计算结果一致

**确认流程**：在写入前向用户展示即将写入的参数，获得用户确认后再执行写入操作。

> 具体 JSON 格式示例和写入逻辑 → `references/ref-01-param-calculations.md`

---

### 5. 验证效果
重启 Claude Code 会话，观察：
- 上下文利用率是否更合理
- 工具调用是否正常
- 是否仍有令牌不足的警告

---

## 高级调优建议

> 关于安全系数、工具占比、思考比例等配置选项的详细说明，请参考前面的 [🔧 计算前配置确认](#-计算前配置确认) 章节。

### 配置调整策略

#### 1. 生产环境优化
- **降低安全系数**：从 0.92 降到 0.85，提供更多缓冲空间
- **限制工具输出**：从 0.30 降到 0.25，防止工具输出耗尽上下文
- **适度思考比例**：保持 0.50，平衡响应速度与决策质量

#### 2. 开发/测试环境优化
- **提高安全系数**：从 0.92 提高到 0.95，最大化上下文利用率
- **放宽工具限制**：从 0.30 提高到 0.35，方便调试和数据分析
- **增加思考比例**：从 0.50 提高到 0.65，支持复杂问题分析

#### 3. 批处理任务优化
- **降低思考比例**：从 0.50 降到 0.25，减少思考开销
- **保持标准配置**：安全系数 0.92，工具占比 0.30
- **监控压缩频率**：关注自动压缩触发频率，调整安全系数

### 计算差异说明

本技能的计算脚本使用 **四舍五入到千位** 的方式处理 `MAX_MCP_OUTPUT_TOKENS`，而实际配置中可能需要 **向下取整**。两种方式都是有效的：

**四舍五入示例**（脚本默认）：
```
102400 × 0.30 = 30720 → 四舍五入到千位 → 31000
```

**向下取整示例**（用户配置示例）：
```
102400 × 0.30 = 30720 → 向下取整到千位 → 30000
```

两种方式的选择取决于你的偏好：
- **四舍五入**：更精确，充分利用可用资源
- **向下取整**：更保守，留出额外安全边际

你可以根据需求手动调整脚本生成的值。

---

## 故障排除

### 参数设置后 Claude Code 无法启动
1. 检查所有参数是否为有效数字
2. 确保 `CLAUDE_CODE_CONTEXT_LIMIT` 不超过模型真实上限
3. 检查 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 是否为 0-100 的整数

### 仍然遇到令牌不足错误
1. 确认使用的是正确的模型窗口大小
2. 考虑降低安全系数到 0.85
3. 检查是否有其他未配置的参数限制

### 工具输出被截断
1. 增加 `MAX_MCP_OUTPUT_TOKENS` 比例到 0.35
2. 确认工具本身是否有输出限制
3. 考虑分批获取工具结果

---

## 参与贡献

欢迎提交 Issue 或 Pull Request 改进本技能！

**仓库地址**：[https://github.com/liuhean2021/Anan-Agent-Skills](https://github.com/liuhean2021/Anan-Agent-Skills)

- 本技能位于 `skills/claude-code-params-calculator/` 目录
- 提交前请确保计算准确性，并提供测试用例
- 本技能采用 [MIT-0](../../LICENSE) 许可协议，可自由使用、修改和重新分发，无需署名