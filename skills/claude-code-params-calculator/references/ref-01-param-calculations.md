# Claude Code 参数计算详解

> 本文档提供 Claude Code 参数计算的详细步骤、示例和推导过程，是 `SKILL.md` 的补充参考。

---

## 核心概念

### 1. 模型实际窗口（Model Actual Context）
指 AI 模型能处理的最大令牌数，通常以 K（千）或 M（百万）为单位。**注意**：1K = 1024 tokens，不是 1000。

| 模型宣传大小 | 实际令牌数 | 计算公式 |
|-------------|-----------|----------|
| 128K | 131,072 | 128 × 1024 |
| 256K | 262,144 | 256 × 1024 |
| 512K | 524,288 | 512 × 1024 |
| 1M | 1,048,576 | 1024 × 1024 |
| 200K | 200,000 | 直接使用（部分模型精确值） |

### 2. 安全系数（Safety Factor）
为防止边缘情况导致令牌溢出而设置的缓冲比例。默认 **0.92** 表示使用 92% 的实际窗口。

**选择依据**：
- 0.92：标准平衡，推荐大多数场景
- 0.85：保守设置，生产环境适用
- 0.95：激进设置，适合短会话

### 3. 单次工具占比上限（MCP Output Ratio）
MCP 工具单次输出占上下文的最高比例。默认 **0.30** 表示工具输出不超过上下文的 30%。

**选择依据**：
- 0.30：平衡设置，适合混合工作流
- 0.20：工具密集型工作流
- 0.40：数据输出密集型工具

### 4. 思考比例（Thinking Ratio）
思考令牌占最大输出令牌的比例。默认 **0.50**。

**选择依据**：
- 0.50：平衡思考与输出
- 0.25：简单任务，减少思考开销
- 0.75：复杂分析，增加思考深度

### 5. 模型输出上限（Model Output Limit）
模型单次生成的最大令牌数。默认 **8192**（大多数 Claude 模型的上限）。

**选择依据**：
- 8192：大多数 Claude 模型的上限
- 4096：较小窗口模型或简单任务
- 16000：支持长输出的模型

---

## 分步计算示例

### 案例 1：Claude Sonnet 4.6（200K 窗口）

**已知条件**：
- 模型实际窗口：200,000 tokens
- 模型单次输出上限：8,192 tokens
- 安全系数：0.92（默认）
- 单次工具占比：0.30（默认）
- 思考比例：0.50（默认）

**计算过程**：

1. **CLAUDE_CODE_CONTEXT_LIMIT**
   ```
   = 模型实际窗口
   = 200,000
   ```

2. **CLAUDE_AUTOCOMPACT_PCT_OVERRIDE**
   ```
   安全窗口 = 200,000 × 0.92 = 184,000
   百分比 = 184,000 ÷ 200,000 × 100 = 92.0%
   四舍五入 → 92
   ```

3. **MAX_MCP_OUTPUT_TOKENS**
   ```
   = 200,000 × 0.30 = 60,000
   四舍五入到千位 → 60,000
   ```

4. **CLAUDE_CODE_MAX_OUTPUT_TOKENS**
   ```
   = min(8,192, 实际需要的最大输出长度)
   假设需要长输出 → 8,192
   ```

5. **MAX_THINKING_TOKENS**
   ```
   = 8,192 × 0.50 = 4,096
   四舍五入到百位 → 4,100
   ```

**最终参数**：
```bash
CLAUDE_CODE_CONTEXT_LIMIT=200000
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=92
MAX_MCP_OUTPUT_TOKENS=60000
CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192
MAX_THINKING_TOKENS=4100
```

### 案例 2：Claude 4 Haiku（256K 窗口）

**已知条件**：
- 模型实际窗口：262,144 tokens（256 × 1024）
- 模型单次输出上限：4,096 tokens（假设）
- 安全系数：0.92
- 单次工具占比：0.30
- 思考比例：0.50

**计算过程**：

1. **CLAUDE_CODE_CONTEXT_LIMIT**
   ```
   = 262,144
   ```

2. **CLAUDE_AUTOCOMPACT_PCT_OVERRIDE**
   ```
   安全窗口 = 262,144 × 0.92 = 241,172.48
   百分比 = 241,172.48 ÷ 200,000 × 100 = 120.58624%
   四舍五入 → 121
   ```

3. **MAX_MCP_OUTPUT_TOKENS**
   ```
   = 262,144 × 0.30 = 78,643.2
   四舍五入到千位 → 79,000
   ```

4. **CLAUDE_CODE_MAX_OUTPUT_TOKENS**
   ```
   = 4,096（模型单次输出上限）
   ```

5. **MAX_THINKING_TOKENS**
   ```
   = 4,096 × 0.50 = 2,048
   四舍五入到百位 → 2,000
   ```

**最终参数**：
```bash
CLAUDE_CODE_CONTEXT_LIMIT=262144
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=121
MAX_MCP_OUTPUT_TOKENS=79000
CLAUDE_CODE_MAX_OUTPUT_TOKENS=4096
MAX_THINKING_TOKENS=2000
```

### 案例 3：Claude 4 Opus（1M 窗口）

**已知条件**：
- 模型实际窗口：1,048,576 tokens（1024 × 1024）
- 模型单次输出上限：8,192 tokens
- 安全系数：0.90（生产环境保守）
- 单次工具占比：0.25（工具密集型）
- 思考比例：0.60（深度思考）

**计算过程**：

1. **CLAUDE_CODE_CONTEXT_LIMIT**
   ```
   = 1,048,576
   ```

2. **CLAUDE_AUTOCOMPACT_PCT_OVERRIDE**
   ```
   安全窗口 = 1,048,576 × 0.90 = 943,718.4
   百分比 = 943,718.4 ÷ 200,000 × 100 = 471.8592%
   四舍五入 → 472
   ```

3. **MAX_MCP_OUTPUT_TOKENS**
   ```
   = 1,048,576 × 0.25 = 262,144
   四舍五入到千位 → 262,000
   ```

4. **CLAUDE_CODE_MAX_OUTPUT_TOKENS**
   ```
   = 8,192
   ```

5. **MAX_THINKING_TOKENS**
   ```
   = 8,192 × 0.60 = 4,915.2
   四舍五入到百位 → 4,900
   ```

**最终参数**：
```bash
CLAUDE_CODE_CONTEXT_LIMIT=1048576
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=472
MAX_MCP_OUTPUT_TOKENS=262000
CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192
MAX_THINKING_TOKENS=4900
```

---

## 公式推导说明

### CLAUDE_AUTOCOMPACT_PCT_OVERRIDE 公式来源

`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 是 Claude Code 中控制自动压缩触发点的参数，表示当上下文使用率达到多少百分比时触发压缩。

**基准值 200,000 的由来**：
Claude Code 内部以 200,000 tokens 作为 100% 的参考基准。因此计算百分比时需要将安全窗口除以 200,000。

**完整公式**：
```
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = round((模型实际窗口 × 安全系数) ÷ 200000 × 100)
```

**为什么需要安全系数**：
1. 模型可能有内部开销（系统提示词、格式令牌等）
2. 为工具调用和思考令牌留出空间
3. 避免边缘情况下的令牌溢出

### MAX_MCP_OUTPUT_TOKENS 限制原因

MCP 工具输出占用上下文，需要限制单次输出大小：

1. **防止工具输出耗尽上下文**：一个工具输出 50% 的上下文会严重影响后续对话
2. **平衡多工具调用**：允许多个工具依次调用
3. **与自动压缩协调**：工具输出可能触发压缩，需要合理分配

---

## 特殊情况处理

### 模型窗口小于 200K

当模型实际窗口小于 200,000 tokens 时，`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 可能小于 100。

**示例**：128K 模型 (131,072 tokens)
```
安全窗口 = 131,072 × 0.92 = 120,586.24
百分比 = 120,586.24 ÷ 200,000 × 100 = 60.29% → 60
```

这意味着当上下文使用率达到 60% 时就会触发压缩，对小窗口模型更频繁的压缩是必要的。

### 自定义基准值

如果 Claude Code 版本更改了基准值（非 200,000），需要调整公式：

```
CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = round((模型实际窗口 × 安全系数) ÷ 新基准值 × 100)
```

### 模型输出上限未知

如果不知道模型单次输出上限：

1. 查阅官方文档
2. 使用保守值 4,096（大多数模型支持）
3. 测试验证：尝试生成长文本观察是否被截断

---

## 配置方式详解

Claude Code 支持多种配置方式，按优先级从高到低排列：

### 1. 环境变量（最高优先级）
直接在 shell 中设置环境变量，适用于临时测试或会话级配置：
```bash
export CLAUDE_CODE_CONTEXT_LIMIT=200000
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=92
export MAX_MCP_OUTPUT_TOKENS=60000
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=8192
export MAX_THINKING_TOKENS=4100
```

**优点**：立即生效，无需重启 Claude Code  
**缺点**：仅对当前 shell 会话有效

### 2. Claude Code 设置文件（`~/.claude/settings.json`）— 推荐方式
Claude Code 主配置文件，`env` 字段中的参数会应用于所有会话：

```json
{
  "env": {
    "CLAUDE_CODE_CONTEXT_LIMIT": "200000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "92", 
    "MAX_MCP_OUTPUT_TOKENS": "60000",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "8192",
    "MAX_THINKING_TOKENS": "4100"
  }
}
```

**文件位置**：
- macOS/Linux: `~/.claude/settings.json`
- Windows: `%USERPROFILE%\.claude\settings.json`

**写入规则**：
- 所有值必须是字符串（用双引号包裹）
- **有则更新，无则新增**：如果 `env` 中已存在某个参数则替换旧值，不存在则添加新键
- 写入前需向用户展示即将写入的参数，获得确认后执行
- 写入后验证 JSON 格式正确性，确保不破坏文件结构
- 修改后需要重启 Claude Code 生效

**有则更新、无则新增的逻辑说明**：
```
读取 settings.json → 解析 env 对象
→ 遍历 5 个参数（CONTEXT_LIMIT, AUTOCOMPACT_PCT, MCP_OUTPUT, MAX_OUTPUT, THINKING）
  → env 中已有该 key → 替换为新的计算值
  → env 中无该 key → 新增该 key 及计算值
→ 写回文件 → 验证 JSON 有效性
```

### 3. 项目级配置文件（`~/.claude/config.json`）
用户级配置文件，优先级低于环境变量但高于默认值：

```json
{
  "CLAUDE_CODE_CONTEXT_LIMIT": 200000,
  "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": 92,
  "MAX_MCP_OUTPUT_TOKENS": 60000,
  "CLAUDE_CODE_MAX_OUTPUT_TOKENS": 8192,
  "MAX_THINKING_TOKENS": 4100
}
```

**注意**：`~/.claude/config.json` 使用数字类型，而 `settings.json` 的 `env` 字段使用字符串类型。

### 配置优先级总结
1. **Shell 环境变量** → 立即生效，会话级
2. **`settings.json` 的 `env` 字段** → 全局配置，需重启
3. **`config.json`** → 用户级配置
4. **Claude Code 默认值** → 内置默认

### 配置验证命令
检查当前生效的参数：
```bash
# 查看环境变量
echo $CLAUDE_CODE_CONTEXT_LIMIT
echo $CLAUDE_AUTOCOMPACT_PCT_OVERRIDE

# 检查配置是否正确加载
claude --version
```

---

## 完整配置示例分析

以下是一个针对 **100K 上下文模型** 的实际 `~/.claude/settings.json` 配置示例，展示了所有相关参数的协同工作：

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-******",  // 已脱敏的 API Token
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-chat",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-chat",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "ANTHROPIC_SMALL_FAST_MODEL": "deepseek-chat",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-chat",
    "CLAUDE_CODE_CONTEXT_LIMIT": "102400",
    "CLAUDEMC_AUTOCOMPACT_PCT_OVERRIDE": "47",
    "MAX_MCP_OUTPUT_TOKENS": "30000",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "7680",
    "MAX_THINKING_TOKENS": "4096",
    "API_TIMEOUT_MS": "600000",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  }
}
```

### 参数分析

#### 1. 核心优化参数（本技能计算）
- **`CLAUDE_CODE_CONTEXT_LIMIT: "102400"`**：100K 模型的实际上下文窗口（100 × 1024 = 102400）
- **`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "47"`**：计算过程：
  ```
  安全窗口 = 102400 × 0.92 = 94208
  百分比 = 94208 ÷ 200000 × 100 = 47.104% → 47
  ```
- **`MAX_MCP_OUTPUT_TOKENS: "30000"`**：计算过程：
  ```
  102400 × 0.30 = 30720 → 四舍五入到千位 → 30000
  ```
- **`CLAUDE_CODE_MAX_OUTPUT_TOKENS: "7680"`**：模型单次输出上限
- **`MAX_THINKING_TOKENS: "4096"`**：计算过程：
  ```
  7680 × 0.50 = 3840 → 四舍五入到百位 → 3800（示例中为 4096，可能是手动调整）
  ```

#### 2. 模型与 API 配置
- **`ANTHROPIC_*` 系列参数**：配置 DeepSeek API 端点和模型名称
- **`ANTHROPIC_AUTH_TOKEN`**：API 认证 Token（必须替换为实际值）
- **`ANTHROPIC_BASE_URL`**：指向 DeepSeek 的 Anthropic 兼容接口

#### 3. 性能与网络参数
- **`API_TIMEOUT_MS: "600000"`**：API 调用超时时间（10分钟）
- **`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1"`**：禁用非必要网络流量

### 配置使用建议

1. **替换 Token**：将 `sk-******` 替换为你自己的 API Token
2. **适配模型**：此配置针对 100K 模型，其他模型需重新计算参数
3. **验证连接**：首次使用时测试 API 连接是否正常
4. **监控使用**：关注 Token 使用量和 API 响应时间

---

## 验证方法

### 1. 数学验证
- 所有参数应为正整数
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` 应在 1-500 之间
- `MAX_MCP_OUTPUT_TOKENS` 应小于 `CLAUDE_CODE_CONTEXT_LIMIT`

### 2. 运行验证
应用参数后启动 Claude Code，检查：
- 是否正常启动
- 工具调用是否正常
- 长对话是否稳定

### 3. 性能验证
监控一段时间：
- 压缩触发频率是否合理
- 是否频繁遇到令牌不足
- 工具输出是否被截断

---

## 更新记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0 | 2026-04-19 | 初始版本，基于用户提供的算法公式 |
| 1.1 | 2026-04-19 | 增加公式推导和特殊情况处理 |
| 1.2 | 2026-04-19 | 添加配置方式详解，包含 `~/.claude/settings.json` 的 `env` 字段配置 |

---

## 参考资料

1. [Claude Code 官方文档](https://docs.anthropic.com/claude/code)
2. [Claude 模型规格](https://www.anthropic.com/models)
3. [MCP 工具开发指南](https://modelcontextprotocol.io/docs)