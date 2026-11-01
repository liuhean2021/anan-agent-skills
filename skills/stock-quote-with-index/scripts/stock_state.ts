#!/usr/bin/env node
/**
 * 记住最近查询的股票，跨会话、跨 Agent 共享。
 *
 * 状态文件：技能目录下的 history.json（与 SKILL.md 同级，随源技能统一管理，已被 .gitignore 忽略）。
 * 环境变量 STOCK_QUOTE_STATE_DIR 可改目录（测试或隔离用）。
 * 运行：node scripts/stock_state.ts <get | set>（需要 Node.js >= 22.18，原生支持直接运行 .ts，无需编译）。
 *   get                            打印状态 JSON；没有记录时打印 {}
 *   set <code> <setcode> <name>    记录一次成功查询（置顶、去重、最多保留 10 条）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Stock {
  code: string;
  setcode: string;
  name: string;
}

interface State {
  last?: Stock;
  recent?: Stock[];
}

const MAX_RECENT = 10;
const skillDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = process.env.STOCK_QUOTE_STATE_DIR || skillDir;
const stateFile = join(stateDir, 'history.json');

function load(): State {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf-8')) as State;
  } catch {
    return {};
  }
}

const [command, code, setcode, name] = process.argv.slice(2);

if (command === 'get') {
  console.log(JSON.stringify(load()));
} else if (command === 'set' && code && setcode && name) {
  const item: Stock = { code, setcode, name };
  const rest = (load().recent ?? []).filter((s) => s.code !== code || s.setcode !== setcode);
  const recent = [item, ...rest].slice(0, MAX_RECENT);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify({ last: item, recent }, null, 2) + '\n', 'utf-8');
  console.log(JSON.stringify(item));
} else {
  console.error('用法：node scripts/stock_state.ts get | set <code> <setcode> <name>');
  process.exit(2);
}
