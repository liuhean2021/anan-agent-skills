#!/usr/bin/env node
/**
 * 前端构建产物浏览器兼容检查(通用,可复制到任意前端项目使用)
 * 所属技能:browser-compatibility(配套 SKILL.md 与 references/)
 *
 * 检查项:
 *   1. JS 语法级别:所有 .js/.mjs 必须能按 --ecma 指定的 ECMAScript 版本解析(否则老浏览器整包解析失败 → 白屏)
 *   2. 正则后行断言 (?<= / (?<!:语法属 ES2018,但 Safari < 16.4 不支持,--ecma 检查不出来,单独检测
 *   3. CSS 风险特性:统计产物中各特性出现次数;给出 --min 时,标出目标浏览器不支持的特性与受影响区间
 *   4. 影响评估查询:为每个问题生成 browserslist 查询(受影响区间 / 支持范围),用于估算受影响用户占比
 *
 * 用法:
 *   node scripts/check-browser-compat.mjs --dir <产物目录> --ecma <年份> [--min <浏览器=版本,...>]
 *   PC 例:--ecma 2018 --min chrome=64,safari=12,firefox=78
 *   H5 例:--ecma 2018 --min ios=12,android=64
 *   含 IE 11 的老栈(Vue 2 / React ≤ 17 + webpack):--ecma 5 --min ie=11,chrome=49,safari=10,firefox=52
 *   --exclude <目录名,...>  跳过产物中不经转译的原样拷贝目录(如 public/ 下的 tinymce、pdfjs),路径含该名即跳过
 *
 * --min 可用的浏览器名(别名按内核归并,版本号即该内核版本):
 *   chrome / edge / android / webview / and_chr → 按 Chromium 判断(Android WebView、微信 XWeb 等填其 Chromium 版本)
 *   safari / ios / ios_saf                      → 按 WebKit 判断(iOS 上所有浏览器与 App 内 WebView 均为 WebKit,版本 = iOS 系统版本)
 *   firefox                                     → 按 Gecko 判断
 *   ie                                          → 视为不支持全部 CSS 风险特性与后行断言(IE 停止演进,以 IE 11 为上限)
 *
 * 退出码:0 = 通过(CSS 风险只告警不失败);1 = JS 语法超标或命中不支持的正则后行断言;2 = 参数/环境错误
 * 依赖:acorn。从当前目录解析,找不到时经 ESLint 的 espree 间接获取(装了 ESLint 即可,无需额外安装);
 *       请在项目(含 node_modules 的)目录下运行。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createRequire } from 'node:module'

/** CSS 风险特性:最低支持版本(caniuse / MDN,核对于 2026-09;升级前以官方数据为准) */
const CSS_FEATURES = [
  { name: 'flex 布局 gap', re: /[{;]\s*gap\s*:/g, min: { chrome: 84, safari: 14.1, firefox: 63 }, fallback: '间距消失,元素挤在一起' },
  { name: ':is()', re: /:is\(/g, min: { chrome: 88, safari: 14, firefox: 78 }, fallback: '所在规则整条失效' },
  { name: ':where()', re: /:where\(/g, min: { chrome: 88, safari: 14, firefox: 78 }, fallback: '所在规则整条失效' },
  { name: ':has()', re: /:has\(/g, min: { chrome: 105, safari: 15.4, firefox: 121 }, fallback: '所在规则整条失效' },
  { name: ':focus-visible', re: /:focus-visible/g, min: { chrome: 86, safari: 15.4, firefox: 85 }, fallback: '所在规则整条失效(多为聚焦描边)' },
  { name: 'aspect-ratio', re: /aspect-ratio\s*:/g, min: { chrome: 88, safari: 15, firefox: 89 }, fallback: '宽高比失效' },
  { name: 'inset', re: /(?<![-\w])inset\s*:/g, min: { chrome: 87, safari: 14.1, firefox: 66 }, fallback: '定位失效' },
  { name: 'clamp()', re: /clamp\(/g, min: { chrome: 79, safari: 13.1, firefox: 75 }, fallback: '声明失效' },
  { name: 'color-mix()', re: /color-mix\(/g, min: { chrome: 111, safari: 16.2, firefox: 113 }, fallback: '颜色失效' },
  { name: '@container', re: /@container/g, min: { chrome: 105, safari: 16, firefox: 110 }, fallback: '容器查询规则失效' },
  { name: '@layer', re: /@layer/g, min: { chrome: 99, safari: 15.4, firefox: 97 }, fallback: '层内样式整体失效' },
  { name: 'CSS 嵌套 &', re: /\{[^{}]*&[\s.:#\[>+~]/g, min: { chrome: 112, safari: 16.5, firefox: 117 }, fallback: '嵌套规则失效' },
  { name: 'dvh/svh/lvh', re: /\d(dvh|svh|lvh)\b/g, min: { chrome: 108, safari: 15.4, firefox: 101 }, fallback: '尺寸声明失效(需保留 vh 回退)' }
]
/** 正则后行断言:Safari 16.4+ 才支持,其余主流浏览器 Chrome 62 / Firefox 78 起支持 */
const LOOKBEHIND = { re: /\(\?<[=!]/g, min: { chrome: 62, safari: 16.4, firefox: 78 } }

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (key.startsWith('--')) args[key.slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i]
  }
  return args
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

/** --min 的浏览器名 → 特性表使用的内核键 */
const ENGINE_ALIASES = {
  chrome: 'chrome',
  edge: 'chrome',
  android: 'chrome',
  webview: 'chrome',
  and_chr: 'chrome',
  safari: 'safari',
  ios: 'safari',
  ios_saf: 'safari',
  firefox: 'firefox',
  ie: 'ie'
}

/** --min 的浏览器名 → browserslist 浏览器名(用于生成影响评估查询) */
const BROWSERSLIST_NAMES = {
  chrome: 'chrome',
  edge: 'edge',
  android: 'and_chr',
  webview: 'and_chr',
  and_chr: 'and_chr',
  safari: 'safari',
  ios: 'ios_saf',
  ios_saf: 'ios_saf',
  firefox: 'firefox',
  ie: 'ie'
}

/** 内核键 → 特性最低版本;ie 不在特性表中 = 永不支持(Infinity) */
const minOf = (min, engine) => (engine === 'ie' ? min.ie ?? Infinity : min[engine])

/**
 * 影响评估:受影响区间 [基线, 特性最低版本) 与对应 browserslist 查询。
 * 用 `x >= 基线, not x >= 最低版本` 表达区间,避免小数版本(如 Safari 14.1)在区间写法下的边界误差。
 */
function affectedRanges(min, targets) {
  return targets
    .filter(([, engine, v]) => minOf(min, engine) !== undefined && v < minOf(min, engine))
    .map(([label, engine, v]) => {
      const m = minOf(min, engine)
      return m === Infinity
        ? { text: `${label} ${v}+(全部)`, query: `${BROWSERSLIST_NAMES[label]} >= ${v}` }
        : { text: `${label} ${v}~<${m}`, query: `${BROWSERSLIST_NAMES[label]} >= ${v}, not ${BROWSERSLIST_NAMES[label]} >= ${m}` }
    })
}

/** 返回目标中不满足 min 的项:[显示名, 版本] */
function unsupportedBy(min, targets) {
  return targets.filter(([, engine, v]) => minOf(min, engine) !== undefined && v < minOf(min, engine)).map(([label, , v]) => [label, v])
}

const args = parseArgs(process.argv.slice(2))
if (!args.dir || !args.ecma) {
  console.error('用法: node check-browser-compat.mjs --dir <产物目录> --ecma <年份,如 2018> [--min chrome=64,safari=12,firefox=78 | ios=12,android=64 | ie=11,chrome=49,...] [--exclude tinymce,pdfjs]')
  process.exit(2)
}
const ecma = Number(args.ecma)
/** [显示名, 内核键, 版本] */
const targets = String(args.min || '')
  .split(',')
  .filter(Boolean)
  .map((kv) => kv.split('=').map((s) => s.trim()))
  .map(([b, v]) => [b.toLowerCase(), ENGINE_ALIASES[b.toLowerCase()], Number(v)])
const invalid = targets.filter(([label, engine, v]) => !engine || Number.isNaN(v))
if (invalid.length) {
  console.error(`--min 含无法识别的项:${invalid.map(([l]) => l).join(', ')};可用:${Object.keys(ENGINE_ALIASES).join(' / ')}`)
  process.exit(2)
}

/**
 * 解析 acorn,依次尝试:① 项目直接依赖 acorn;② espree → acorn;③ eslint → espree → acorn。
 * espree 是 ESLint 的解析器、基于 acorn,凡装了 ESLint 的项目都能拿到;pnpm 严格隔离下
 * espree 不会被提升到项目根,所以要从 eslint 的位置再解析一次。多数项目无需额外安装。
 */
function loadAcorn() {
  const fromCwd = createRequire(join(process.cwd(), 'noop.js'))
  const chains = [
    () => fromCwd('acorn'),
    () => createRequire(fromCwd.resolve('espree'))('acorn'),
    () => createRequire(createRequire(fromCwd.resolve('eslint')).resolve('espree'))('acorn')
  ]
  for (const load of chains) {
    try {
      return load()
    } catch {
      // 尝试下一种解析方式
    }
  }
  return null
}
const acorn = loadAcorn()
if (!acorn) {
  console.error('未找到 acorn(也未找到 ESLint 的 espree),请在项目目录下运行,或安装:npm i -D acorn')
  process.exit(2)
}

const excludes = String(args.exclude || '').split(',').map((x) => x.trim()).filter(Boolean)
const files = walk(args.dir).filter((f) => !excludes.some((x) => f.includes(`/${x}/`)))
if (excludes.length) console.log(`已排除目录:${excludes.join(', ')}`)
const jsFiles = files.filter((f) => /\.(m?js)$/.test(f))
const cssFiles = files.filter((f) => f.endsWith('.css'))
let failed = false

console.log(`\n== 1. JS 语法级别(ES${ecma}),共 ${jsFiles.length} 个文件`)
for (const f of jsFiles) {
  const src = readFileSync(f, 'utf8')
  try {
    acorn.parse(src, { ecmaVersion: ecma, sourceType: 'module' })
  } catch (e) {
    failed = true
    const pos = e.pos ?? 0
    console.log(`  ✗ ${relative(process.cwd(), f)}: ${e.message}\n    …${src.slice(Math.max(0, pos - 40), pos + 40).replace(/\s+/g, ' ')}…`)
  }
}
if (!failed) console.log(`  ✓ 全部可按 ES${ecma} 解析`)

/**
 * 区分两种出现位置(文本搜索分不清,会误报):
 * - 正则字面量 /(?<=x)/ :不支持的浏览器整包解析失败 → 白屏,判失败
 * - 字符串里 new RegExp('(?<=x)'):只在执行到时抛错,且常为条件分支(如 async-validator 的
 *   includeBoundaries 默认不启用),只提示人工确认
 */
function scanLookbehind(src) {
  // 快速路径:文本里根本没有 (?<= / (?<! 时无需词法分析(对数十 MB 产物可省下大半耗时)
  const total = (src.match(LOOKBEHIND.re) || []).length
  if (!total) return { literals: 0, inStrings: 0 }
  let literals = 0
  try {
    for (const tok of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module' })) {
      if (tok.type.label === 'regexp' && LOOKBEHIND.re.test(tok.value.pattern)) literals++
      LOOKBEHIND.re.lastIndex = 0
    }
  } catch {
    // 词法分析失败时该文件已在第 1 项报错
  }
  return { literals, inStrings: Math.max(0, total - literals) }
}

/** 影响评估用:[问题名, 受影响区间列表] */
const impactQueries = []

console.log('\n== 2. 正则后行断言 (?<= / (?<!')
const lookbehindBlocked = unsupportedBy(LOOKBEHIND.min, targets)
const blockedText = lookbehindBlocked.map(([b, v]) => `${b} ${v}`).join('/')
let lookbehindFound = false
for (const f of jsFiles) {
  const { literals, inStrings } = scanLookbehind(readFileSync(f, 'utf8'))
  const name = relative(process.cwd(), f)
  if (literals) {
    lookbehindFound = true
    if (lookbehindBlocked.length) failed = true
    console.log(
      lookbehindBlocked.length
        ? `  ✗ ${name}: ${literals} 处正则字面量,目标 ${blockedText} 不支持 → 整包解析失败(白屏)`
        : `  ⚠ ${name}: ${literals} 处正则字面量(目标均支持;Safari 需 ≥ 16.4)`
    )
    if (lookbehindBlocked.length) impactQueries.push(['正则后行断言字面量', affectedRanges(LOOKBEHIND.min, targets)])
  }
  if (inStrings) {
    lookbehindFound = true
    console.log(
      `  ⚠ ${name}: ${inStrings} 处位于字符串(运行时 new RegExp 构造)${lookbehindBlocked.length ? `,在 ${blockedText} 上执行到时会抛错,需人工确认是否可达` : ''}`
    )
  }
}
if (!lookbehindFound) console.log('  ✓ 未发现')

console.log(`\n== 3. CSS 风险特性,共 ${cssFiles.length} 个文件${targets.length ? `,目标 ${args.min}` : '(未给 --min,仅统计)'}`)
const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n')
for (const feat of CSS_FEATURES) {
  const count = (css.match(feat.re) || []).length
  if (!count) continue
  const blocked = unsupportedBy(feat.min, targets)
  const minText = Object.entries(feat.min).map(([b, v]) => `${b} ${v}`).join(' / ')
  const mark = blocked.length ? '⚠' : '✓'
  const note = blocked.length ? ` → ${blocked.map(([b]) => b).join('/')} 上:${feat.fallback}` : ''
  console.log(`  ${mark} ${feat.name.padEnd(16)} ${String(count).padStart(4)} 处  (需 ${minText})${note}`)
  if (blocked.length) {
    const ranges = affectedRanges(feat.min, targets)
    console.log(`      受影响区间:${ranges.map((r) => r.text).join(' / ')}`)
    impactQueries.push([feat.name, ranges])
  }
}

if (impactQueries.length) {
  const supported = targets.map(([label, , v]) => `${BROWSERSLIST_NAMES[label]} >= ${v}`).join(', ')
  console.log('\n== 4. 影响评估查询(用户占比;有项目访问统计时以统计为准,见 references/review.md §4.1)')
  console.log(`  支持范围(分母): npx browserslist@latest --coverage "${supported}"`)
  for (const [name, ranges] of impactQueries) {
    console.log(`  ${name}: npx browserslist@latest --coverage "${ranges.map((r) => r.query).join(', ')}"`)
  }
  console.log('  中国区把 --coverage 换成 "--coverage=CN"(zsh 下须加引号)')
}

console.log(`\n结果:${failed ? '✗ 未通过(存在会导致白屏的 JS 问题)' : '✓ JS 通过'}${targets.length ? ';CSS ⚠ 项为样式退化风险,不影响退出码' : ''}\n`)
process.exit(failed ? 1 : 0)
