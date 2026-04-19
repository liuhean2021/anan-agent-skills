#!/usr/bin/env node

/**
 * Claude Code 参数计算脚本
 *
 * 根据模型上下文窗口大小计算 Claude Code 优化参数
 *
 * 用法：
 *   node calculate.js <模型窗口> [选项]
 *
 * 示例：
 *   node calculate.js 200000
 *   node calculate.js 131072 --safety 0.85 --tool-ratio 0.25
 */

const fs = require('fs');
const path = require('path');

// 默认参数
const DEFAULTS = {
  safetyFactor: 0.92,
  toolRatio: 0.30,
  thinkingRatio: 0.50,
  baseContext: 200000, // Claude Code 基准值
  modelOutputLimit: 8192, // 默认模型输出上限
};

// 常见模型预设
// 格式：数字 = 仅上下文窗口, 对象 = { context, outputLimit }
const MODEL_PRESETS = {
  // Claude 模型
  'claude-sonnet-4.6': 200000,       // Claude Sonnet 4.6 (200K 上下文)
  // MiniMax 模型
  'minimax-m2.7': { context: 200000, outputLimit: 131072 }, // MiniMax M2.7 (200K 上下文, 128K 输出)
  // DeepSeek 模型
  'deepseek-chat': 102400,           // DeepSeek Chat (100K 上下文)
  'deep-seek-reasoner': 102400,      // DeepSeek Reasoner (100K 上下文)
};

/**
 * 计算所有参数
 */
function calculateParams(modelContext, options = {}) {
  const {
    safetyFactor = DEFAULTS.safetyFactor,
    toolRatio = DEFAULTS.toolRatio,
    thinkingRatio = DEFAULTS.thinkingRatio,
    baseContext = DEFAULTS.baseContext,
    modelOutputLimit = DEFAULTS.modelOutputLimit,
  } = options;

  // 验证输入
  if (modelContext <= 0) {
    throw new Error('模型上下文必须为正数');
  }
  if (safetyFactor <= 0 || safetyFactor > 1) {
    throw new Error('安全系数必须在 0-1 之间');
  }
  if (toolRatio <= 0 || toolRatio > 0.5) {
    throw new Error('工具占比必须在 0-0.5 之间');
  }
  if (thinkingRatio < 0 || thinkingRatio > 1) {
    throw new Error('思考比例必须在 0-1 之间');
  }

  // 1. CLAUDE_CODE_CONTEXT_LIMIT
  const contextLimit = Math.floor(modelContext);

  // 2. CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
  const safeContext = modelContext * safetyFactor;
  const autocompactPercent = Math.round((safeContext / baseContext) * 100);

  // 3. MAX_MCP_OUTPUT_TOKENS
  const mcpOutputTokens = Math.floor(modelContext * toolRatio / 1000) * 1000;

  // 4. CLAUDE_CODE_MAX_OUTPUT_TOKENS
  // 如果用户明确指定了 outputLimit（通过预设或命令行），直接使用；否则应用 50% 限制
  const userSpecifiedOutputLimit = options.userSpecifiedOutputLimit;
  const maxOutputTokens = userSpecifiedOutputLimit
    ? modelOutputLimit
    : Math.min(modelOutputLimit, modelContext * 0.5);

  // 5. MAX_THINKING_TOKENS
  const thinkingTokens = Math.floor(maxOutputTokens * thinkingRatio);

  return {
    CLAUDE_CODE_CONTEXT_LIMIT: contextLimit,
    CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: autocompactPercent,
    MAX_MCP_OUTPUT_TOKENS: mcpOutputTokens,
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: Math.floor(maxOutputTokens),
    MAX_THINKING_TOKENS: thinkingTokens,
    // 计算中间值用于验证
    _calculated: {
      safeContext,
      safeContextPercent: (safeContext / modelContext) * 100,
      toolRatioPercent: toolRatio * 100,
      thinkingRatioPercent: thinkingRatio * 100,
    },
  };
}

/**
 * 格式化输出
 */
function formatOutput(params, modelContext, options) {
  const {
    safetyFactor = DEFAULTS.safetyFactor,
    toolRatio = DEFAULTS.toolRatio,
    thinkingRatio = DEFAULTS.thinkingRatio,
  } = options;

  const output = [];

  output.push('='.repeat(60));
  output.push('Claude Code 参数计算器');
  output.push('='.repeat(60));
  output.push('');
  output.push(`模型上下文: ${modelContext.toLocaleString()} tokens`);
  output.push(`安全系数: ${safetyFactor} (使用 ${Math.round(safetyFactor * 100)}% 的上下文)`);
  output.push(`工具占比: ${toolRatio} (MCP 输出不超过上下文的 ${Math.round(toolRatio * 100)}%)`);
  output.push(`思考比例: ${thinkingRatio} (思考令牌占输出的 ${Math.round(thinkingRatio * 100)}%)`);
  output.push('');
  output.push('推荐参数值:');
  output.push('');

  output.push(`CLAUDE_CODE_CONTEXT_LIMIT=${params.CLAUDE_CODE_CONTEXT_LIMIT}`);
  output.push(`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=${params.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE}`);
  output.push(`MAX_MCP_OUTPUT_TOKENS=${params.MAX_MCP_OUTPUT_TOKENS}`);
  output.push(`CLAUDE_CODE_MAX_OUTPUT_TOKENS=${params.CLAUDE_CODE_MAX_OUTPUT_TOKENS}`);
  output.push(`MAX_THINKING_TOKENS=${params.MAX_THINKING_TOKENS}`);
  output.push('');

  // 环境变量格式
  output.push('环境变量设置:');
  output.push('```bash');
  output.push(`export CLAUDE_CODE_CONTEXT_LIMIT=${params.CLAUDE_CODE_CONTEXT_LIMIT}`);
  output.push(`export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=${params.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE}`);
  output.push(`export MAX_MCP_OUTPUT_TOKENS=${params.MAX_MCP_OUTPUT_TOKENS}`);
  output.push(`export CLAUDE_CODE_MAX_OUTPUT_TOKENS=${params.CLAUDE_CODE_MAX_OUTPUT_TOKENS}`);
  output.push(`export MAX_THINKING_TOKENS=${params.MAX_THINKING_TOKENS}`);
  output.push('```');
  output.push('');

  // JSON 格式
  output.push('JSON 配置文件 (~/.claude/config.json):');
  output.push('```json');
  output.push(JSON.stringify({
    CLAUDE_CODE_CONTEXT_LIMIT: params.CLAUDE_CODE_CONTEXT_LIMIT,
    CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: params.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE,
    MAX_MCP_OUTPUT_TOKENS: params.MAX_MCP_OUTPUT_TOKENS,
    CLAUDE_CODE_MAX_OUTPUT_TOKENS: params.CLAUDE_CODE_MAX_OUTPUT_TOKENS,
    MAX_THINKING_TOKENS: params.MAX_THINKING_TOKENS,
  }, null, 2));
  output.push('```');
  output.push('');

  // 验证信息
  output.push('计算详情:');
  output.push(`- 安全上下文: ${params._calculated.safeContext.toLocaleString()} tokens (${params._calculated.safeContextPercent.toFixed(1)}% 的模型窗口)`);
  output.push(`- 自动压缩触发点: ${params.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE}% (基于 200,000 tokens 基准)`);
  output.push(`- MCP 工具输出限制: ${params.MAX_MCP_OUTPUT_TOKENS.toLocaleString()} tokens (${params._calculated.toolRatioPercent.toFixed(1)}% 的模型窗口)`);
  output.push(`- 模型输出限制: ${params.CLAUDE_CODE_MAX_OUTPUT_TOKENS} tokens`);
  output.push(`- 思考令牌限制: ${params.MAX_THINKING_TOKENS} tokens (${params._calculated.thinkingRatioPercent.toFixed(1)}% 的输出限制)`);
  output.push('');

  output.push('='.repeat(60));

  return output.join('\n');
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('错误: 需要指定模型上下文大小或模型名称');
    console.error('');
    console.error('用法:');
    console.error('  node calculate.js <模型窗口> [选项]');
    console.error('  node calculate.js <模型名称> [选项]');
    console.error('');
    console.error('示例:');
    console.error('  node calculate.js 200000');
    console.error('  node calculate.js claude-sonnet-4.6');
    console.error('  node calculate.js 131072 --safety 0.85 --tool-ratio 0.25');
    console.error('');
    console.error('选项:');
    console.error('  --safety <系数>     安全系数 (默认: 0.92)');
    console.error('  --tool-ratio <比例> 工具占比 (默认: 0.30)');
    console.error('  --thinking-ratio <比例> 思考比例 (默认: 0.50)');
    console.error('  --output-limit <令牌数> 模型输出上限 (默认: 8192)');
    console.error('  --list-presets      列出预设模型');
    process.exit(1);
  }

  // 列出预设
  if (args[0] === '--list-presets') {
    console.log('预设模型:');
    Object.entries(MODEL_PRESETS).forEach(([name, preset]) => {
      if (typeof preset === 'object') {
        console.log(`  ${name.padEnd(20)} ${preset.context.toLocaleString().padStart(10)} tokens (输出上限: ${preset.outputLimit?.toLocaleString()})`);
      } else {
        console.log(`  ${name.padEnd(20)} ${preset.toLocaleString().padStart(10)} tokens`);
      }
    });
    process.exit(0);
  }

  const options = { userSpecifiedOutputLimit: false };
  let modelInput = args[0];

  // 解析选项
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--safety':
        options.safetyFactor = parseFloat(args[++i]);
        break;
      case '--tool-ratio':
        options.toolRatio = parseFloat(args[++i]);
        break;
      case '--thinking-ratio':
        options.thinkingRatio = parseFloat(args[++i]);
        break;
      case '--output-limit':
        options.modelOutputLimit = parseInt(args[++i], 10);
        options.userSpecifiedOutputLimit = true;
        break;
      default:
        console.error(`错误: 未知选项 ${args[i]}`);
        process.exit(1);
    }
  }

  // 解析模型输入
  let modelContext;
  let preset = MODEL_PRESETS[modelInput.toLowerCase()];

  if (preset) {
    // 支持数字或对象格式
    if (typeof preset === 'object') {
      modelContext = preset.context;
      // 如果预设中有 outputLimit 且用户未指定，则使用预设值
      if (preset.outputLimit && !options.modelOutputLimit) {
        options.modelOutputLimit = preset.outputLimit;
        options.userSpecifiedOutputLimit = true;
      }
      console.log(`使用预设模型: ${modelInput} = ${modelContext.toLocaleString()} tokens (输出上限: ${options.modelOutputLimit || DEFAULTS.modelOutputLimit})`);
    } else {
      modelContext = preset;
      console.log(`使用预设模型: ${modelInput} = ${modelContext.toLocaleString()} tokens`);
    }
  } else {
    modelContext = parseInt(modelInput, 10);
    if (isNaN(modelContext) || modelContext <= 0) {
      console.error(`错误: 无效的模型上下文大小 "${modelInput}"`);
      console.error('使用 --list-presets 查看预设模型列表');
      process.exit(1);
    }
  }

  return { modelContext, options };
}

/**
 * 主函数
 */
function main() {
  try {
    const { modelContext, options } = parseArgs();

    const params = calculateParams(modelContext, options);
    const output = formatOutput(params, modelContext, options);

    console.log(output);

    // 可选：保存到文件
    const outputFile = path.join(process.cwd(), 'claude-code-params.txt');
    fs.writeFileSync(outputFile, output);
    console.log(`\n参数已保存到: ${outputFile}`);

  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { calculateParams, MODEL_PRESETS, DEFAULTS };